/**
 * Les commandes que les documents citent existent dans `COMMANDES`, seule
 * source de l'aide : un document ne peut pas nommer une commande ou une option
 * que `ucm --help` ignore.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { init } from "../src/init.mjs";
import { COMMANDES, executer } from "../src/ucm.mjs";

const PAQUET = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RACINE = resolve(PAQUET, "../..");

const DOCUMENTS = [
  "packages/cli/README.md",
  "packages/cli/procedure.md",
  ...readdirSync(join(PAQUET, "aides")).map((nom) => `packages/cli/aides/${nom}`),
  ".agents/skills/consommer-contrat/SKILL.md",
  ".agents/skills/regler-le-linter/SKILL.md",
  "docs/guides/RECETTE.md",
  "packages/adapter-typescript/README.md",
];

const lire = (chemin) => readFileSync(resolve(RACINE, chemin), "utf8").replace(/\r\n/g, "\n");

/** Les extraits de code d'un texte markdown : chaque ligne d'un bloc, chaque segment entre accents graves. */
function extraitsDeCode(texte) {
  const extraits = [];
  let dansBloc = false;
  for (const ligne of texte.split("\n")) {
    if (/^\s*```/.test(ligne)) {
      dansBloc = !dansBloc;
      continue;
    }
    if (dansBloc) extraits.push(ligne);
    else for (const [, segment] of ligne.matchAll(/`([^`]+)`/g)) extraits.push(segment);
  }
  return extraits;
}

const NOMS = COMMANDES.map(({ nom }) => nom).sort((a, b) => b.length - a.length);

/**
 * Chaque `ucm <commande> … --option` d'un extrait, avec ce qu'il nomme.
 *
 * La commande s'écrit `ucm`, `npx ucm` ou `npx [--yes] @ucm-kit/cli[@version]`.
 * `enTete` dit qu'elle commence l'extrait ou suit `npx` : seule une invocation
 * en tête peut nommer une commande inconnue, une phrase de prose ou un
 * `npm install @ucm-kit/cli` n'en nomme aucune.
 */
function invocations(extrait) {
  const trouvees = [];
  for (const appel of extrait.matchAll(/(?<![\w@/.-])(npx\s+(?:-{1,2}[\w-]+\s+)*)?(?:ucm|@ucm-kit\/cli(?:@[\w.^~-]+)?)\s+([^`\n]*)/g)) {
    const [, npx, suite] = appel;
    const mots = suite.trim();
    const nom = NOMS.find((candidat) => mots === candidat || mots.startsWith(`${candidat} `));
    const premier = mots.split(/\s+/)[0];
    const options = [...mots.matchAll(/(?<![\w-])(--[a-z][a-z-]*)/g)].map(([, option]) => option);
    const enTete = npx !== undefined || extrait.slice(0, appel.index).trim() === "";
    trouvees.push({ nom, premier, options, enTete });
  }
  return trouvees;
}

function verifier(source, texte) {
  const fautes = [];
  for (const extrait of extraitsDeCode(texte)) {
    for (const { nom, premier, options, enTete } of invocations(extrait)) {
      if (!nom) {
        if (/^[a-z][a-z-]*$/.test(premier) && enTete) fautes.push(`${source} : commande inconnue « ucm ${premier} »`);
        continue;
      }
      const connues = COMMANDES.find((commande) => commande.nom === nom).options.map((option) => option.nom);
      for (const option of options) {
        if (option !== nom && !connues.includes(option)) fautes.push(`${source} : « ${option} » n'est pas une option de ucm ${nom}`);
      }
    }
  }
  return fautes;
}

test("M1 : chaque `ucm …` des documents relevés nomme une commande et des options de COMMANDES", () => {
  const fautes = DOCUMENTS.flatMap((chemin) => verifier(chemin, lire(chemin)));

  const racine = mkdtempSync(join(tmpdir(), "ucm-doc-"));
  try {
    const compte = init(racine, { chemins: {}, sansAgents: false });
    assert.ok(compte, "init rend son compte rendu");
    const ecrits = [];
    const parcourir = (dossier) => {
      for (const nom of readdirSync(dossier)) {
        if (nom === ".git" || nom === "node_modules") continue;
        const chemin = join(dossier, nom);
        if (statSync(chemin).isDirectory()) parcourir(chemin);
        else ecrits.push(chemin);
      }
    };
    parcourir(racine);
    assert.ok(ecrits.length > 0, "init écrit des fichiers");
    for (const chemin of ecrits) {
      fautes.push(...verifier(`init:${relative(racine, chemin)}`, readFileSync(chemin, "utf8").replace(/\r\n/g, "\n")));
    }
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }

  assert.deepEqual(fautes, []);
});

test("M2 : les aides, la procédure et packages/kit/src ne disent jamais `npx ucm`", () => {
  const fichiers = [
    "packages/cli/procedure.md",
    ...readdirSync(join(PAQUET, "aides")).map((nom) => `packages/cli/aides/${nom}`),
  ];
  const parcourir = (dossier) => readdirSync(join(RACINE, dossier), { withFileTypes: true }).flatMap((entree) => {
    const chemin = `${dossier}/${entree.name}`;
    return entree.isDirectory() ? parcourir(chemin) : [chemin];
  });
  fichiers.push(...parcourir("packages/kit/src"));
  const fautifs = fichiers.filter((chemin) => /\bnpx\s+ucm\b/.test(readFileSync(resolve(RACINE, chemin), "utf8")));
  assert.deepEqual(fautifs, []);
});

test("M3 : ucm tokens faute sort en 2 et nomme css et references", () => {
  const alertes = [];
  const code = executer(["tokens", "faute"], { racine: tmpdir(), ecrire: () => {}, alerter: (texte) => alertes.push(texte) });
  assert.equal(code, 2);
  const message = alertes.join("\n");
  assert.match(message, /faute/);
  assert.match(message, /css/);
  assert.match(message, /references/);
});

test("M4 : l'usage d'init vient de COMMANDES, et le README l'égale", () => {
  const { usage } = COMMANDES.find(({ nom }) => nom === "init");
  const alertes = [];
  assert.equal(executer(["init", "--faute"], { racine: tmpdir(), ecrire: () => {}, alerter: (texte) => alertes.push(texte) }), 2);
  assert.ok(alertes.join("\n").endsWith(usage));

  const section = lire("packages/cli/README.md").split("\n## `ucm init`\n")[1];
  assert.ok(section, "le README a une section ucm init");
  const bloc = section.match(/```sh\n([\s\S]*?)\n```/);
  assert.equal(bloc?.[1], usage);
});

test("M5 : le relevé voit une commande ou une option fautive écrite par npx, avec ou sans le nom du paquet", () => {
  const fautes = (extrait) => verifier("essai", `\`${extrait}\``);
  assert.equal(fautes("npx --yes @ucm-kit/cli@0.4.0 chek").length, 1, "commande inconnue par le paquet épinglé");
  assert.equal(fautes("npx @ucm-kit/cli check --rapport x").length, 1, "option inconnue par le paquet");
  assert.equal(fautes("npx ucm chek").length, 1, "commande inconnue par npx ucm");
  assert.deepEqual(fautes("npx --yes @ucm-kit/cli@0.4.0 check --report ci-report.md"), []);
  assert.deepEqual(fautes("npm install --save-dev @ucm-kit/cli@0.4.0"), [], "une installation n'est pas une invocation");
  assert.deepEqual(fautes("ucm"), []);
});
