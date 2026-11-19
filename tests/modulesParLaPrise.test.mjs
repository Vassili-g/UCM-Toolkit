/**
 * Un module n'appelle le kit que par sa prise.
 *
 * Un paquet du dépôt se déclare module par `"ucmModule": true` dans son
 * `package.json`. Le kit ne promet que `@ucm-kit/core/modules`
 * (`packages/kit/invariants/versionnage.md`) : les autres portes servent le
 * toolkit et changent sans préavis. Ce test refuse qu'un module importe une
 * autre porte, atteigne le code du kit par un chemin relatif, importe la prise
 * sans la déclarer, ou épingle autre chose que la version exacte du kit de la
 * CLI. Hors du dépôt, la règle ESLint `no-restricted-imports` du guide des
 * modules fait le même travail.
 *
 * Aucun paquet du dépôt n'est un module aujourd'hui : les cas fautifs sont
 * fabriqués ici, dans un dossier temporaire.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const racineDuDepot = join(dirname(fileURLToPath(import.meta.url)), "..");

const PRISE = "@ucm-kit/core/modules";
const NOYAU = "@ucm-kit/core";
const EXTENSIONS = /\.(?:[cm]?[jt]sx?)$/;
const IGNORES = new Set(["node_modules", "dist", "build", ".git"]);
const CHAMPS_DE_DEPENDANCES = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

const lireJson = (chemin) => JSON.parse(readFileSync(chemin, "utf8"));

/** Les fichiers de code d'un paquet, `node_modules` et sorties de build exclus. */
function fichiersDeCode(dossier) {
  const trouves = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (IGNORES.has(entree.name)) continue;
    const complet = join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDeCode(complet));
    else if (EXTENSIONS.test(entree.name)) trouves.push(complet);
  }
  return trouves;
}

/** Les paquets de `packages/` qui se déclarent module. */
function modulesDuDepot(racine) {
  const dossier = join(racine, "packages");
  return readdirSync(dossier, { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => join(dossier, entree.name))
    .filter((chemin) => {
      try {
        return lireJson(join(chemin, "package.json")).ucmModule === true;
      } catch {
        return false;
      }
    });
}

/** La version exacte du kit que la CLI du dépôt épingle, ou `null` si le dépôt n'a pas de CLI. */
function pinDeLaCli(racine) {
  try {
    return lireJson(join(racine, "packages", "cli", "package.json")).dependencies?.[NOYAU] ?? null;
  } catch {
    return null;
  }
}

/** Les fautes d'un module : ses imports, puis ses dépendances. */
function fautesDuModule(racine, dossier) {
  const fautes = [];
  const nom = relative(racine, dossier).split(sep).join("/");
  const kit = join(racine, "packages", "kit") + sep;
  let importePrise = false;

  for (const fichier of fichiersDeCode(dossier)) {
    const source = readFileSync(fichier, "utf8");
    for (const { fileName: porte } of ts.preProcessFile(source, true, true).importedFiles) {
      const ou = `${relative(racine, fichier).split(sep).join("/")} importe « ${porte} »`;
      if (porte === PRISE) importePrise = true;
      else if (porte === NOYAU || porte.startsWith(`${NOYAU}/`)) {
        fautes.push(`${ou} : un module n'importe que ${PRISE}, les autres portes servent le toolkit.`);
      } else if (porte.startsWith(".") && (resolve(dirname(fichier), porte) + sep).startsWith(kit)) {
        fautes.push(`${ou} : un chemin relatif ne contourne pas la prise.`);
      }
    }
  }

  const manifeste = lireJson(join(dossier, "package.json"));
  const pin = pinDeLaCli(racine);
  const declarees = CHAMPS_DE_DEPENDANCES.flatMap((champ) => (manifeste[champ]?.[NOYAU] === undefined ? [] : [manifeste[champ][NOYAU]]));
  if (importePrise && declarees.length === 0) fautes.push(`${nom} importe ${PRISE} sans déclarer ${NOYAU} : l'épingler à la version exacte du kit de la CLI.`);
  for (const version of declarees) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) fautes.push(`${nom} déclare ${NOYAU} en « ${version} » : un module épingle une version exacte, sans plage ni lien.`);
    else if (pin !== null && version !== pin) fautes.push(`${nom} épingle ${NOYAU} ${version}, et la CLI du dépôt ${pin} : un seul kit par repository.`);
  }
  return fautes;
}

const fautesDesModules = (racine) => modulesDuDepot(racine).flatMap((dossier) => fautesDuModule(racine, dossier));

/** Un dépôt fabriqué : chemin relatif vers contenu, un objet s'écrivant en JSON. */
function depot(fichiers, rappel) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-modules-"));
  try {
    for (const [chemin, contenu] of Object.entries({ "packages/cli/package.json": { name: "@ucm-kit/cli", dependencies: { [NOYAU]: "0.17.0" } }, ...fichiers })) {
      mkdirSync(dirname(join(racine, chemin)), { recursive: true });
      writeFileSync(join(racine, chemin), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
    }
    rappel(racine);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

const MODULE = { name: "mon-module", ucmModule: true, dependencies: { [NOYAU]: "0.17.0" } };

test("aucun module du dépôt n'importe une autre porte du kit que la prise", () => {
  assert.deepEqual(fautesDesModules(racineDuDepot), []);
});

test("un module qui n'importe que la prise, à la version de la CLI, ne pose aucune faute", () => {
  depot({
    "packages/mon-module/package.json": MODULE,
    "packages/mon-module/src/index.ts": `import { lireConfiguration } from "${PRISE}";\nimport type { Contract } from "${PRISE}";\nexport const a = lireConfiguration;\nexport type C = Contract;\n`,
  }, (racine) => assert.deepEqual(fautesDesModules(racine), []));
});

test("un module qui importe une autre porte du kit échoue, en import, en réexport, en import dynamique et en require", () => {
  depot({
    "packages/mon-module/package.json": MODULE,
    "packages/mon-module/src/a.ts": 'import { COLLECTIONS } from "@ucm-kit/core/referentiel";\nexport { COLLECTIONS };\n',
    "packages/mon-module/src/b.mjs": 'export { verdictDeVersion } from "@ucm-kit/core/lecteurs";\n',
    "packages/mon-module/src/c.mjs": 'export const charger = () => import("@ucm-kit/core/format");\n',
    "packages/mon-module/src/d.cjs": 'module.exports = require("@ucm-kit/core/controles");\n',
    "packages/mon-module/src/e.ts": 'import type { Contract } from "@ucm-kit/core";\nexport type C = Contract;\n',
  }, (racine) => {
    const fautes = fautesDesModules(racine).join("\n");
    for (const porte of ["referentiel", "lecteurs", "format", "controles"]) assert.match(fautes, new RegExp(`« @ucm-kit/core/${porte} »`), porte);
    assert.match(fautes, /« @ucm-kit\/core »/);
  });
});

test("un module qui atteint le code du kit par un chemin relatif échoue", () => {
  depot({
    "packages/kit/package.json": { name: "@ucm-kit/core" },
    "packages/mon-module/package.json": MODULE,
    "packages/mon-module/src/a.ts": 'import { COLLECTIONS } from "../../kit/src/referentiel/index.js";\nexport { COLLECTIONS };\n',
  }, (racine) => assert.match(fautesDesModules(racine).join("\n"), /un chemin relatif ne contourne pas la prise/));
});

test("un module épingle la version exacte du kit de la CLI, et la déclare", () => {
  const faute = (manifeste) => {
    let rendu = [];
    depot({ "packages/mon-module/package.json": manifeste, "packages/mon-module/src/a.ts": `import { tokenCssVariable } from "${PRISE}";\nexport const t = tokenCssVariable;\n` }, (racine) => {
      rendu = fautesDesModules(racine);
    });
    return rendu.join("\n");
  };
  assert.match(faute({ ...MODULE, dependencies: { [NOYAU]: "^0.17.0" } }), /version exacte, sans plage ni lien/);
  assert.match(faute({ ...MODULE, dependencies: { [NOYAU]: "0.16.0" } }), /0\.16\.0, et la CLI du dépôt 0\.17\.0 : un seul kit par repository/);
  assert.match(faute({ ...MODULE, dependencies: {} }), /sans déclarer @ucm-kit\/core/);
  assert.equal(faute({ ...MODULE, dependencies: {}, peerDependencies: { [NOYAU]: "0.17.0" } }), "");
});

test("un paquet qui ne se déclare pas module n'est pas jugé", () => {
  depot({
    "packages/outil/package.json": { name: "outil" },
    "packages/outil/src/a.ts": 'import { COLLECTIONS } from "@ucm-kit/core/referentiel";\nexport { COLLECTIONS };\n',
  }, (racine) => assert.deepEqual(fautesDesModules(racine), []));
});
