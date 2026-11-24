/** `ucm rapport-github` contre une API GitHub simulée, et l'adresse des forges écrite une seule fois. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { MARQUEUR_RAPPORT, MARQUEUR_SANS_OBJET } from "@ucm-kit/core/lecteurs";

import { rapportGithub } from "../src/rapport-github.mjs";
import { executer } from "../src/ucm.mjs";

const JETON = "ghs_secret-de-test";
const ARGUMENTS = ["--depot", "acme/ds", "--demande", "12", "--fichier", "ci-report.md"];
const UTILISATEUR = "https://api.github.com/user";
const COMMENTAIRES = "https://api.github.com/repos/acme/ds/issues/12/comments";

/** Une API GitHub simulée : un compte, des commentaires paginés, le relevé de chaque appel. */
function githubSimule({ compte = "ucm-bot", commentaires = [], statuts = {}, parPage = 100 } = {}) {
  const appels = [];
  const fetch = async (url, init = {}) => {
    const methode = init.method ?? "GET";
    appels.push({ url, methode, headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : undefined });
    const statut = Object.entries(statuts).find(([motif]) => `${methode} ${new URL(url).pathname}`.includes(motif))?.[1];
    if (statut) return new Response(JSON.stringify({ message: String(statut) }), { status: statut });
    if (url === UTILISATEUR) return Response.json({ login: compte });
    if (methode === "GET") {
      const page = Number(new URL(url).searchParams.get("page"));
      return Response.json(commentaires.slice((page - 1) * parPage, page * parPage));
    }
    return Response.json({ id: 999 }, { status: methode === "POST" ? 201 : 200 });
  };
  return { fetch, appels };
}

const commentaire = (id, login, body) => ({ id, user: { login }, body });

function avecRapport(contenu, travail) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-github-"));
  writeFileSync(join(racine, "ci-report.md"), contenu);
  return Promise.resolve(travail(racine)).finally(() => rmSync(racine, { recursive: true, force: true }));
}

const UTILE = `${MARQUEUR_RAPPORT}\n## ✅ Tout est conforme\n`;
const SANS_OBJET = `${MARQUEUR_RAPPORT}\n${MARQUEUR_SANS_OBJET}\n## Rien à signaler\n`;

async function lancer(racine, api, { env = { GITHUB_TOKEN: JETON }, arguments_ = ARGUMENTS } = {}) {
  const sorties = [];
  const code = await rapportGithub(arguments_, {
    racine, env, fetch: api.fetch, ecrire: (texte) => sorties.push(texte), alerter: (texte) => sorties.push(texte),
  });
  return { code, sortie: sorties.join("\n") };
}

const ecritures = (api) => api.appels.filter(({ methode }) => methode !== "GET");

for (const page of [null, {}, "texte", [null]]) {
  test(`une page de commentaires de forme ${JSON.stringify(page)} sort en 1 sans écriture`, () => avecRapport(UTILE, async (racine) => {
    const api = githubSimule();
    const fetch = api.fetch;
    api.fetch = async (url, init) => {
      const reponse = await fetch(url, init);
      return url.startsWith(COMMENTAIRES) ? Response.json(page) : reponse;
    };
    const { code, sortie } = await lancer(racine, api);
    assert.equal(code, 1);
    assert.match(sortie, /réponse illisible/);
    assert.equal(sortie.includes(JETON), false);
    assert.deepEqual(ecritures(api), []);
  }));
}

test("R3 : un rapport existant du compte est remplacé par PATCH, sortie 0", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule({
    commentaires: [
      commentaire(1, "humain", `${MARQUEUR_RAPPORT}\nrecopié par un humain`),
      commentaire(2, "ucm-bot", `${MARQUEUR_RAPPORT}\n## ❌ 1 contrat invalide`),
    ],
  });
  const { code } = await lancer(racine, api);

  assert.equal(code, 0);
  assert.deepEqual(ecritures(api).map(({ methode, url }) => `${methode} ${url}`), [
    "PATCH https://api.github.com/repos/acme/ds/issues/comments/2",
  ]);
  assert.equal(ecritures(api)[0].body.body, UTILE);
  assert.equal(ecritures(api)[0].headers.Authorization, `Bearer ${JETON}`);
}));

test("R4 : sans rapport existant, un rapport utile est créé par POST", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule({ commentaires: [commentaire(1, "humain", "une discussion")] });
  const { code } = await lancer(racine, api);

  assert.equal(code, 0);
  assert.deepEqual(ecritures(api).map(({ methode, url }) => `${methode} ${url}`), [`POST ${COMMENTAIRES}`]);
  assert.equal(ecritures(api)[0].body.body, UTILE);
}));

test("R4 : un fichier sans marqueur reçoit le marqueur avant d'être publié", () => avecRapport("## ✅ Tout est conforme\n", async (racine) => {
  const api = githubSimule();
  await lancer(racine, api);
  assert.equal(ecritures(api)[0].body.body, `${MARQUEUR_RAPPORT}\n## ✅ Tout est conforme\n`);
}));

test("R5 : sans rapport existant, un rapport sans objet n'écrit rien et le dit, sortie 0", () => avecRapport(SANS_OBJET, async (racine) => {
  const api = githubSimule();
  const { code, sortie } = await lancer(racine, api);

  assert.equal(code, 0);
  assert.equal(ecritures(api).length, 0);
  assert.match(sortie, /Cette demande de fusion ne touche aucun fichier suivi par UCM : aucun commentaire n'est créé\./);
}));

test("R5 : un rapport sans objet remplace le commentaire dont le verdict est périmé", () => avecRapport(SANS_OBJET, async (racine) => {
  const api = githubSimule({ commentaires: [commentaire(5, "ucm-bot", `${MARQUEUR_RAPPORT}\n## ❌ 1 contrat invalide`)] });
  await lancer(racine, api);
  assert.deepEqual(ecritures(api).map(({ methode, url }) => `${methode} ${url}`), [
    "PATCH https://api.github.com/repos/acme/ds/issues/comments/5",
  ]);
}));

test("R6 : un 403 sur GET /user donne le compte github-actions[bot], et ses commentaires sont remplacés", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule({
    statuts: { "GET /user": 403 },
    commentaires: [
      commentaire(1, "ucm-bot", `${MARQUEUR_RAPPORT}\nd'un autre compte`),
      commentaire(2, "github-actions[bot]", `${MARQUEUR_RAPPORT}\nancien rapport`),
    ],
  });
  const { code } = await lancer(racine, api);

  assert.equal(code, 0);
  assert.deepEqual(ecritures(api).map(({ methode, url }) => `${methode} ${url}`), [
    "PATCH https://api.github.com/repos/acme/ds/issues/comments/2",
  ]);
}));

test("R6 : tout autre refus de GET /user arrête la commande plutôt que de deviner le compte", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule({ statuts: { "GET /user": 500 } });
  const { code, sortie } = await lancer(racine, api);
  assert.equal(code, 1);
  assert.equal(ecritures(api).length, 0);
  assert.match(sortie, /GitHub a répondu 500/);
}));

test("R7 : le rapport de la seconde page de commentaires est trouvé", () => avecRapport(UTILE, async (racine) => {
  const commentaires = Array.from({ length: 100 }, (_, rang) => commentaire(rang + 1, "humain", "discussion"));
  commentaires.push(commentaire(101, "ucm-bot", `${MARQUEUR_RAPPORT}\nancien`));
  const api = githubSimule({ commentaires });
  await lancer(racine, api);

  const pages = api.appels.filter(({ url }) => url.includes("/comments?")).map(({ url }) => new URL(url).searchParams.get("page"));
  assert.deepEqual(pages, ["1", "2"]);
  assert.deepEqual(ecritures(api).map(({ methode, url }) => `${methode} ${url}`), [
    "PATCH https://api.github.com/repos/acme/ds/issues/comments/101",
  ]);
}));

test("sans jeton, la commande nomme la variable et sort en 0 sans appel", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule();
  const { code, sortie } = await lancer(racine, api, { env: {} });
  assert.equal(code, 0);
  assert.match(sortie, /GITHUB_TOKEN est absente/);
  assert.equal(api.appels.length, 0);
}));

for (const [statut, geste] of [[401, /refuse le jeton de GITHUB_TOKEN \(401\)/], [403, /n'a pas le droit de .* \(403\).*pull-requests: write/]]) {
  test(`un ${statut} à l'écriture sort en 1 avec son geste, sans jamais afficher le jeton`, () => avecRapport(UTILE, async (racine) => {
    const api = githubSimule({ statuts: { "POST /repos/acme/ds/issues/12/comments": statut } });
    const { code, sortie } = await lancer(racine, api);
    assert.equal(code, 1);
    assert.match(sortie, geste);
    assert.equal(sortie.includes(JETON), false);
  }));
}

test("une invocation fautive sort en 2, un rapport illisible en 1", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule();
  const incomplete = await lancer(racine, api, { arguments_: ["--depot", "acme/ds"] });
  assert.equal(incomplete.code, 2);
  assert.match(incomplete.sortie, /--demande est obligatoire/);
  assert.equal(incomplete.sortie.includes(JETON), false);

  const mauvaisDepot = await lancer(racine, api, { arguments_: ["--depot", "acme", "--demande", "12", "--fichier", "ci-report.md"] });
  assert.equal(mauvaisDepot.code, 2);

  const absent = await lancer(racine, api, { arguments_: ["--depot", "acme/ds", "--demande", "12", "--fichier", "absent.md"] });
  assert.equal(absent.code, 1);
  assert.equal(api.appels.length, 0);
}));

test("--api est respecté", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule();
  await lancer(racine, api, { arguments_: [...ARGUMENTS, "--api", "https://ghe.example.com/api/v3/"] });
  assert.ok(api.appels.every(({ url }) => url.startsWith("https://ghe.example.com/api/v3/")));
}));

test("l'aiguillage mène à rapport-github", () => avecRapport(UTILE, async (racine) => {
  const api = githubSimule();
  const sorties = [];
  const code = await executer(["rapport-github", ...ARGUMENTS], {
    racine, env: { GITHUB_TOKEN: JETON }, fetch: api.fetch, ecrire: (texte) => sorties.push(texte), alerter: (texte) => sorties.push(texte),
  });
  assert.equal(code, 0);
  assert.match(sorties.join("\n"), /Rapport publié en commentaire de la pull request #12/);
}));

/**
 * Une adresse écrite en dur à deux endroits finit par diverger : l'exporteur
 * publierait vers un hôte que le plugin n'a pas le droit d'ouvrir, ou la CLI
 * commenterait ailleurs que l'exporteur n'écrit.
 */
test("R10 : l'exporteur et la CLI tirent les adresses des forges de protocoles/forges.ts", () => {
  const paquets = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const fichiers = [
    "plugin-exporter/src/forges/github.ts",
    "plugin-exporter/src/forges/gitlab.ts",
    "cli/src/rapport-github.mjs",
    "cli/src/rapport-gitlab.mjs",
  ];
  for (const fichier of fichiers) {
    const source = readFileSync(join(paquets, fichier), "utf8");
    assert.doesNotMatch(source, /https:\/\/api\.github\.com|https:\/\/gitlab\.com\/api\/v4/, `${fichier} écrit une adresse de forge`);
    assert.match(source, /@ucm-kit\/core\/protocoles/, `${fichier} n'importe pas protocoles/forges.ts`);
  }
  const forges = readFileSync(join(paquets, "kit/src/protocoles/forges.ts"), "utf8");
  assert.match(forges, /API_GITHUB = 'https:\/\/api\.github\.com'/);
  assert.match(forges, /API_GITLAB = 'https:\/\/gitlab\.com\/api\/v4'/);
});

test("un rapport sans objet précédé d'un BOM n'écrit rien, et un rapport utile avec BOM garde son marqueur en tête", () => avecRapport(`﻿${SANS_OBJET}`, async (racine) => {
  const sansObjet = githubSimule();
  await lancer(racine, sansObjet);
  assert.equal(ecritures(sansObjet).length, 0, "le BOM ne repousse pas le marqueur sans objet en troisième ligne");

  writeFileSync(join(racine, "ci-report.md"), `﻿${UTILE}`);
  const utile = githubSimule();
  await lancer(racine, utile);
  assert.equal(ecritures(utile)[0].body.body, UTILE);
}));
