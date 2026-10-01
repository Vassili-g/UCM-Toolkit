/**
 * La porte `@ucm-kit/core/lecteurs/navigateur` s'embarque dans un plugin Figma
 * ou une page web. Elle ne doit atteindre ni `node:` ni `ajv`, à aucune
 * profondeur d'import, et elle doit republier chaque lecteur pur de la porte
 * Node, les mêmes fonctions sous les mêmes noms.
 *
 * Un lecteur est pur quand aucun module de sa fermeture d'imports ne lit un
 * module Node : le test le calcule depuis les sources, sans liste à tenir.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as navigateur from "@ucm-kit/core/lecteurs/navigateur";
import * as porte from "@ucm-kit/core/lecteurs";

const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lecteurs");

/** Les spécificateurs qu'un module importe ou republie. */
function importsDe(fichier) {
  const source = readFileSync(join(dossier, fichier), "utf8");
  return [...source.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+"([^"]+)"/g)].map((trouve) => trouve[1]);
}

/** Les spécificateurs externes de la fermeture d'imports d'un module. */
function externesDe(fichier, vus = new Set()) {
  if (vus.has(fichier)) return new Set();
  vus.add(fichier);
  const externes = new Set();
  for (const cible of importsDe(fichier)) {
    if (cible.startsWith("./")) for (const externe of externesDe(cible.slice(2), vus)) externes.add(externe);
    else externes.add(cible);
  }
  return externes;
}

/** Un module est pur quand sa fermeture n'atteint que les sous-chemins du kit sans dépendance. */
const estPur = (fichier) => [...externesDe(fichier)].every((cible) => cible === "@ucm-kit/core/format" || cible === "@ucm-kit/core/emplois");

test("la porte navigateur n'atteint ni node: ni ajv, à aucune profondeur", () => {
  assert.deepEqual([...externesDe("navigateur.mjs")].filter((cible) => cible.startsWith("node:") || cible === "ajv"), []);
  assert.equal(estPur("navigateur.mjs"), true);
});

test("chaque lecteur pur de la porte Node est republié, sous le même nom et la même fonction", () => {
  const manquants = [];
  for (const [module, noms] of [...readFileSync(join(dossier, "index.mjs"), "utf8").matchAll(/export\s*\{([^}]*)\}\s*from\s*"\.\/([\w-]+\.mjs)"/g)].map((trouve) => [trouve[2], trouve[1]])) {
    if (!estPur(module)) continue;
    for (const nom of noms.split(",").map((brut) => brut.trim()).filter(Boolean)) {
      if (navigateur[nom] !== porte[nom]) manquants.push(`${module} → ${nom}`);
    }
  }
  assert.deepEqual(manquants, []);
});

test("la porte navigateur ne publie rien que la porte Node ne publie pas", () => {
  assert.deepEqual(Object.keys(navigateur).filter((nom) => !(nom in porte)), []);
  assert.ok(Object.keys(navigateur).length > 20, "la porte navigateur a perdu ses lecteurs");
});

test("les lecteurs qui lisent le disque restent hors de la porte navigateur", () => {
  for (const nom of ["trouverContrats", "lireConfiguration", "lireLeSchema", "valideurDeSchema", "controlerRepository", "implementationPresente"]) {
    assert.equal(nom in navigateur, false, nom);
  }
});

test("la porte navigateur juge un contrat comme la porte Node", () => {
  assert.equal(navigateur.verdictDeVersion("2.0"), "ancien");
  assert.deepEqual([...navigateur.collecterReferences(navigateur.sansEchantillon({ a: "{x.y}", samples: { b: "{z.w}" } }))], ["{x.y}"]);
  assert.deepEqual(navigateur.champsInvalidesDuContrat(null), porte.champsInvalidesDuContrat(null));
});
