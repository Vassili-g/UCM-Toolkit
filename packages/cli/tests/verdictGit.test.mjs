/** Les verdicts de la CLI sur des dépôts Git temporaires, avec le vrai adaptateur TypeScript. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { adaptateurTypeScript } from "@ucm-kit/adapter-typescript";
import { check } from "../src/check.mjs";
import { executer } from "../src/ucm.mjs";
import { mesurerLesRangs } from "../src/rangs.mjs";
import { chargerAdaptateur, etatDeLAdaptateur } from "../src/adaptateur.mjs";

const CHEMIN_CONTRAT = "components/Widget/Widget.contract.json";
const CHEMIN_CODE = "components/Widget/Widget.tsx";
const CONFIGURATION = { components: "components", tokens: "tokens.json", implementation: "{dir}/{id}.tsx" };
const TOKENS = { couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } } };

function contrat(valeurs = ["normal"]) {
  return {
    name: "Widget",
    meta: { contractVersion: "14.0", exportedAt: "2026-01-01T00:00:00.000Z", figma: { fileName: "f", nodeId: "1:1" }, coverage: { portable: "complete" } },
    props: { variant: { type: "enum", values: valeurs, default: "normal" } },
    viewStructures: { st1: { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" }, children: [{ slot: "label", tokens: { color: "{couleurs.texte.principal}" } }] } },
    variantViews: { v1: { structure: "st1" } },
    variants: valeurs.map((variant, rang) => ({ nodeId: `1:${rang + 2}`, figmaName: variant, values: { variant }, tokens: {}, view: "v1" })),
    structure: { view: "st1", variantAxes: ["variant"] }, rendering: { roles: {} },
  };
}
const source = (valeurs = '"normal"') => `export interface WidgetProps { variant: ${valeurs} }\nexport function Widget({ variant }: WidgetProps) { return variant; }\n`;

function depot() {
  const racine = mkdtempSync(join(tmpdir(), "ucm-verdict-git-"));
  const git = (...arguments_) => execFileSync("git", arguments_, { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const ecrire = (chemin, contenu) => { mkdirSync(dirname(join(racine, chemin)), { recursive: true }); writeFileSync(join(racine, chemin), typeof contenu === "string" ? contenu : JSON.stringify(contenu)); };
  let rang = 0;
  const commiter = () => { git("add", "-A"); git("-c", "core.hooksPath=", "commit", "-qm", `étape ${rang++}`); return git("rev-parse", "HEAD"); };
  git("init", "-q"); git("config", "user.name", "Essai"); git("config", "user.email", "essai@example.invalid");
  ecrire("ucm.config.json", CONFIGURATION); ecrire("tsconfig.json", { compilerOptions: { strict: true, jsx: "preserve" }, include: ["components/**/*"] }); ecrire("tokens.json", TOKENS); ecrire(CHEMIN_CONTRAT, contrat());
  commiter();
  ecrire(CHEMIN_CODE, source()); commiter();
  return { racine, git, ecrire, commiter, fermer: () => rmSync(racine, { recursive: true, force: true }) };
}
function lancer(d, arguments_ = [], options = {}) {
  const lignes = [];
  const flux = (texte) => lignes.push(texte);
  const code = check(arguments_, { racine: d.racine, adaptateur: adaptateurTypeScript, maintenant: new Date("2026-11-19T12:00:00Z"), ecrire: flux, avertir: flux, alerter: flux, ...options });
  return { code, texte: lignes.join("\n") };
}

test('V-05 puis V-18 : un export plus récent met le code en retard sur la demande puis sur main', () => {
  const d = depot();
  try {
    const base = d.git("rev-parse", "HEAD");
    d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); d.commiter();
    for (const arguments_ of [["--base", base], []]) {
      const resultat = lancer(d, arguments_);
      assert.equal(resultat.code, 0, resultat.texte);
      assert.match(resultat.texte, /en retard sur son contrat/);
    }
    const mesure = mesurerLesRangs(d.racine, CONFIGURATION, [join(d.racine, CHEMIN_CONTRAT)]);
    assert.equal(mesure.rangs.composants.Widget.contrat, 1);
    assert.equal(mesure.rangs.composants.Widget.code, 2);
    assert.ok(Date.parse(mesure.rangs.composants.Widget.depuis));
  } finally { d.fermer(); }
});

test('V-10 : le code et le contrat modifiés ensemble avec un écart bloquent', () => {
  const d = depot();
  try {
    const base = d.git("rev-parse", "HEAD");
    d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"]));
    d.ecrire(CHEMIN_CODE, `${source()}// correction de code\n`); d.commiter();
    assert.equal(lancer(d, ["--base", base]).code, 1);
  } finally { d.fermer(); }
});

test('V-11 et V-20 : toucher le code en retard bloque, enregistré, indexé ou non enregistré', () => {
  const d = depot();
  try {
    d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); const base = d.commiter();
    d.ecrire(CHEMIN_CODE, `${source()}// correction de code\n`);
    assert.equal(lancer(d).code, 1);
    d.git("add", CHEMIN_CODE);
    assert.equal(lancer(d).code, 1);
    d.commiter();
    assert.equal(lancer(d, ["--base", base]).code, 1);
  } finally { d.fermer(); }
});

test('V-12 : un type partagé crée un écart sans toucher le fichier du composant', () => {
  const d = depot();
  try {
    d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); d.commiter();
    d.ecrire("components/Widget/types.ts", 'export type Variant = "normal" | "danger";\n');
    d.ecrire(CHEMIN_CODE, 'import type { Variant } from "./types";\nexport interface WidgetProps { variant: Variant }\nexport function Widget({ variant }: WidgetProps) { return variant; }\n');
    const base = d.commiter();
    d.ecrire("components/Widget/types.ts", 'export type Variant = "normal";\n'); d.commiter();
    const resultat = lancer(d, ["--base", base, "--report", "rapport.md"]);
    assert.equal(resultat.code, 1, resultat.texte);
    assert.match(readFileSync(join(d.racine, "rapport.md"), "utf8"), /Widget/);
  } finally { d.fermer(); }
});

test('V-02 : les tokens retirés passent et rendent les contrats en retard sur les tokens', () => {
  const d = depot();
  try {
    const base = d.git("rev-parse", "HEAD"); d.ecrire("tokens.json", {}); d.commiter();
    const resultat = lancer(d, ["--base", base, "--report", "rapport.md"]);
    assert.equal(resultat.code, 0, resultat.texte);
    assert.match(readFileSync(join(d.racine, "rapport.md"), "utf8"), /contrats citent des tokens retirés/);
    const mesure = mesurerLesRangs(d.racine, CONFIGURATION, [join(d.racine, CHEMIN_CONTRAT)]);
    assert.ok(mesure.rangs.tokens < mesure.rangs.composants.Widget.contrat);
  } finally { d.fermer(); }
});

test('V-16 et V-04 : un adaptateur absent bloque le code, sans bloquer la demande du designer', () => {
  const d = depot();
  try {
    assert.equal(lancer(d, [], { adaptateur: undefined }).code, 1);
    const base = d.git("rev-parse", "HEAD"); d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); d.commiter();
    assert.equal(lancer(d, ["--base", base], { adaptateur: undefined }).code, 0);
  } finally { d.fermer(); }
});

test('V-16 : un adaptateur cassé reste un constat dans le rapport et la demande du designer passe', async () => {
  const d = depot();
  try {
    d.ecrire("node_modules/@ucm-kit/adapter-typescript/package.json", { main: "index.cjs" });
    d.ecrire("node_modules/@ucm-kit/adapter-typescript/index.cjs", "module.exports = {};\n");
    d.ecrire(".gitignore", "node_modules\nrapport.md\n"); const base = d.commiter();
    const lignes = []; const flux = (texte) => lignes.push(texte);
    const options = { racine: d.racine, env: {}, ecrire: flux, avertir: flux, alerter: flux };
    assert.equal(await executer(["check", "--report", "rapport.md"], options), 1);
    assert.match(readFileSync(join(d.racine, "rapport.md"), "utf8"), /adaptateur.*(?:cassé|charg)/i);
    d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); d.commiter();
    assert.equal(await executer(["check", "--base", base], options), 0, lignes.join("\n"));
  } finally { d.fermer(); }
});

test('V-19 : un clone superficiel sort en 2 avec le geste de récupération de l’historique', () => {
  const d = depot(); const clone = mkdtempSync(join(tmpdir(), "ucm-superficiel-"));
  try {
    execFileSync("git", ["clone", "--quiet", "--depth", "1", pathToFileURL(d.racine).href, clone], { stdio: "pipe" });
    const resultat = lancer({ racine: clone });
    assert.equal(resultat.code, 2, resultat.texte);
    assert.match(resultat.texte, /git fetch --unshallow/);
  } finally { d.fermer(); rmSync(clone, { recursive: true, force: true }); }
});

test('un adaptateur chargé dont le tsconfig manque bloque le code en 1, jamais la demande du designer', async () => {
  const d = depot();
  try {
    d.ecrire("node_modules/@ucm-kit/adapter-typescript/package.json", { main: "index.mjs", type: "module" });
    d.ecrire("node_modules/@ucm-kit/adapter-typescript/index.mjs", `export { adaptateurTypeScript } from ${JSON.stringify(new URL("../../adapter-typescript/src/index.mjs", import.meta.url).href)};\n`);
    d.ecrire(".gitignore", "node_modules\nrapport.md\n");
    rmSync(join(d.racine, "tsconfig.json")); const base = d.commiter();
    const lignes = []; const flux = (texte) => lignes.push(texte);
    const options = { racine: d.racine, env: {}, ecrire: flux, avertir: flux, alerter: flux };
    assert.equal(await executer(["check"], options), 1, lignes.join("\n"));
    d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); d.commiter();
    assert.equal(await executer(["check", "--base", base], options), 0, lignes.join("\n"));
  } finally { d.fermer(); }
});

test('l’extension du motif décide si un adaptateur officiel est attendu', () => {
  assert.equal(etatDeLAdaptateur("{dir}/{id}.tsx"), "absent");
  assert.equal(etatDeLAdaptateur("{dir}/{id}.ts", { erreurAdaptateur: new Error("cassé") }), "casse");
  assert.equal(etatDeLAdaptateur("{dir}/{id}.ts", { adaptateur: adaptateurTypeScript }), "present");
  assert.equal(etatDeLAdaptateur("{dir}/{id}.swift"), "sans-adaptateur");
});

test('le rang d’un export fusionné se lit sur le premier parent, au commit de fusion', () => {
  const d = depot();
  try {
    const branche = d.git("branch", "--show-current");
    d.git("checkout", "-qb", "export"); d.ecrire(CHEMIN_CONTRAT, contrat(["normal", "danger"])); d.commiter();
    d.git("checkout", "-q", branche); d.ecrire("note.txt", "travail indépendant"); d.commiter();
    d.git("merge", "--no-ff", "-qm", "fusion de l’export", "export");
    const mesure = mesurerLesRangs(d.racine, CONFIGURATION, [join(d.racine, CHEMIN_CONTRAT)]);
    assert.equal(mesure.rangs.composants.Widget.contrat, 1);
    assert.equal(mesure.rangs.composants.Widget.code, 3);
    assert.equal(lancer(d).code, 0);
  } finally { d.fermer(); }
});

test('un nouveau code non suivi a le rang 0, même avec un espace dans son chemin', () => {
  const d = depot();
  try {
    const contrat = "components/A B/A B.contract.json";
    d.ecrire(contrat, {}); d.commiter();
    d.ecrire("components/A B/A B.tsx", "export const valeur = 1;\n");
    const mesure = mesurerLesRangs(d.racine, CONFIGURATION, [join(d.racine, contrat)]);
    assert.equal(mesure.rangs.composants["A B"].code, 0);
    assert.equal(mesure.rangs.composants["A B"].contrat, 1);
  } finally { d.fermer(); }
});

test('un exécutable Git absent reste une erreur de mesure, jamais un historique absent', () => {
  const executer = () => { throw Object.assign(new Error("git absent"), { code: "ENOENT" }); };
  assert.throws(() => mesurerLesRangs("r", CONFIGURATION, [], { executer }), /git absent/);
});

test('un paquet adaptateur installé dont le point d’entrée manque est cassé, pas absent', async () => {
  const d = depot();
  try {
    d.ecrire("node_modules/@ucm-kit/adapter-typescript/package.json", { main: "absent.cjs" });
    await assert.rejects(() => chargerAdaptateur(d.racine), /absent.cjs/);
  } finally { d.fermer(); }
});

test("RG1 : un fichier importé modifié donne le rang 0 au code du composant, même si son implémentation ne l'est pas", () => {
  const d = depot();
  try {
    d.ecrire(CHEMIN_CODE, 'import { couleur } from "./Widget.variants";\nexport function Widget() { return couleur; }\n');
    d.ecrire("components/Widget/Widget.variants.ts", 'export const couleur = "a";\n');
    d.commiter();
    d.ecrire("components/Widget/Widget.variants.ts", 'export const couleur = "b";\n');
    const contrats = [join(d.racine, CHEMIN_CONTRAT)];
    const options = { fichiersDuComposant: adaptateurTypeScript.lecteurDuCode.fichiersDuComposant };
    assert.equal(mesurerLesRangs(d.racine, CONFIGURATION, contrats, options).rangs.composants.Widget.code, 0);
    assert.equal(mesurerLesRangs(d.racine, CONFIGURATION, contrats).rangs.composants.Widget.code, 1);
  } finally { d.fermer(); }
});

test("RG2 : un fichier hors de l'historique est ignoré, et aucun fichier connu rend null", () => {
  const d = depot();
  try {
    const contrats = [join(d.racine, CHEMIN_CONTRAT)];
    const fantome = join(d.racine, "components/Widget/fantome.ts");
    const mesure = (fichiers) => mesurerLesRangs(d.racine, CONFIGURATION, contrats, { fichiersDuComposant: () => ({ fichiers }) }).rangs.composants.Widget.code;
    assert.equal(mesure([join(d.racine, CHEMIN_CODE), fantome]), 1);
    assert.equal(mesure([fantome]), null);
    assert.equal(mesure([]), null);
  } finally { d.fermer(); }
});

test("N13 : un @ucm-kit/core installé à une autre version donne une ligne d'avertissement, sans changer le code de sortie", () => {
  const d = depot();
  try {
    const sans = lancer(d);
    d.ecrire("node_modules/@ucm-kit/core/package.json", { name: "@ucm-kit/core", version: "0.0.1" });
    const avec = lancer(d);
    assert.equal(avec.code, sans.code);
    const lignes = avec.texte.split("\n").filter((ligne) => /@ucm-kit\/core installé/.test(ligne));
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /0\.0\.1/);
    assert.doesNotMatch(sans.texte, /@ucm-kit\/core installé/);
  } finally { d.fermer(); }
});
