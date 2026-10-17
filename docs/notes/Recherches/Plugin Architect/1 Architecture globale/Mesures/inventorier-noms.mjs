#!/usr/bin/env node
/**
 * Relève les termes qu'un `tokens.json` emploie dans ses noms, et les paires
 * de termes qui pourraient nommer le même concept.
 *
 * Le programme ne lit que le fichier. Il ne connaît aucune nomenclature : une
 * paire relevée est une candidate, que le mainteneur juge.
 *
 *   node inventorier-noms.mjs <tokens.json> [--json]
 *
 * Les six relevés :
 *   1. les feuilles par collection racine ;
 *   2. les termes de chaque collection, segment entier, avec leur nombre ;
 *   3. les mots, segments coupés au tiret (`padding-x` donne `padding`, `x`) ;
 *   4. les paires de mots candidates : flexion (`press`, `pressed`),
 *      abréviation (`bg`, `background`), distance d'édition de 1 ou 2, et
 *      paires de la table d'amorce `SYNONYMES` ;
 *   5. les mots rencontrés à plusieurs profondeurs dans une même collection ;
 *   6. les branches sœurs auxquelles manque un enfant que la majorité porte.
 *
 * Borne : l'export passe chaque nom par `normalizeName`, qui met en minuscules
 * et remplace les espaces par des tirets. Une casse mélangée dans Figma
 * (`fontSize`, `Font Size`) n'est donc pas visible ici.
 */
import { readFileSync } from "node:fs";

const [, , chemin, ...options] = process.argv;
if (chemin === undefined) {
  console.error("usage : node inventorier-noms.mjs <tokens.json> [--json]");
  process.exit(2);
}
const enJson = options.includes("--json");
const document = JSON.parse(readFileSync(chemin, "utf8"));

/**
 * Paires qu'aucune comparaison de chaînes ne rapproche. La table amorce la
 * discussion : elle ne vaut pas nomenclature.
 */
const SYNONYMES = [
  ["error", "danger"],
  ["big", "large"],
  ["contained", "filled"],
  ["text", "foreground"],
  ["col", "x"],
  ["rows", "y"],
  ["radius", "border-radius"],
  ["sizing", "dimensions"],
  ["base", "md"],
  ["base", "medium"],
];

/** Un cran d'échelle : nombre, nombre décimal à virgule, ou taille en `xs`. */
const estCran = (terme) => /^[0-9]+(,[0-9]+)?$/.test(terme) || /^[0-9]*x[sl]$/.test(terme);

/** Toutes les feuilles, chacune en liste de segments. */
function feuilles(noeud, segments = []) {
  if (noeud === null || typeof noeud !== "object") return [];
  if (Object.prototype.hasOwnProperty.call(noeud, "$value")) return [segments];
  return Object.keys(noeud)
    .filter((cle) => !cle.startsWith("$"))
    .flatMap((cle) => feuilles(noeud[cle], [...segments, cle]));
}

const chemins = feuilles(document);

function compter(cles) {
  const compte = new Map();
  for (const cle of cles) compte.set(cle, (compte.get(cle) ?? 0) + 1);
  return [...compte].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// 1. Feuilles par collection.
const parCollection = compter(chemins.map((segments) => segments[0]));

// 2. Termes par collection, crans regroupés.
const termes = {};
for (const [collection] of parCollection) {
  const segments = chemins
    .filter((s) => s[0] === collection)
    .flatMap((s) => s.slice(1))
    .map((terme) => (estCran(terme) ? "<cran>" : terme));
  termes[collection] = compter(segments);
}

// 3. Mots : chaque occurrence de segment compte une fois par mot.
const occurrences = chemins.flatMap((s) => s.slice(1)).filter((t) => !estCran(t));
const mots = compter(occurrences.flatMap((terme) => terme.split("-")).filter((m) => !/^[0-9]+$/.test(m)));
const motsConnus = new Set(mots.map(([m]) => m));
const segmentsConnus = new Set(occurrences);

// 4. Paires candidates.
function distance(a, b) {
  const ligne = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonale = ligne[0];
    ligne[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const haut = ligne[j];
      ligne[j] = Math.min(ligne[j] + 1, ligne[j - 1] + 1, diagonale + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonale = haut;
    }
  }
  return ligne[b.length];
}

/** `court` est une abréviation de `long` : même initiale, lettres dans l'ordre. */
function abrege(court, long) {
  if (court.length > 3 || long.length < court.length + 2 || court[0] !== long[0]) return false;
  let position = 0;
  for (const lettre of long) if (lettre === court[position]) position += 1;
  return position === court.length;
}

const FLEXIONS = ["s", "d", "ed", "ing"];
const paires = [];
const liste = [...motsConnus].filter((m) => /^[a-z]+$/.test(m));
for (let i = 0; i < liste.length; i += 1) {
  for (let j = i + 1; j < liste.length; j += 1) {
    const [a, b] = [liste[i], liste[j]].sort((x, y) => x.length - y.length || x.localeCompare(y));
    let raison = null;
    if (FLEXIONS.some((fin) => b === a + fin)) raison = "flexion";
    else if (abrege(a, b)) raison = "abréviation";
    else if (a.length >= 5 && distance(a, b) <= 2) raison = `distance ${distance(a, b)}`;
    if (raison) paires.push({ a, b, raison });
  }
}
for (const [a, b] of SYNONYMES) {
  const present = (terme) => motsConnus.has(terme) || segmentsConnus.has(terme);
  if (present(a) && present(b)) paires.push({ a, b, raison: "table d'amorce" });
}
const nombre = new Map(mots);
const segmentsComptes = new Map(compter(occurrences));
for (const paire of paires) {
  paire.nA = nombre.get(paire.a) ?? segmentsComptes.get(paire.a) ?? 0;
  paire.nB = nombre.get(paire.b) ?? segmentsComptes.get(paire.b) ?? 0;
}

// 5. Mots rencontrés à plusieurs profondeurs dans une même collection.
const profondeurs = new Map();
for (const segments of chemins) {
  segments.slice(1).forEach((terme, index) => {
    if (estCran(terme)) return;
    const cle = `${segments[0]} ${terme}`;
    if (!profondeurs.has(cle)) profondeurs.set(cle, new Set());
    profondeurs.get(cle).add(index + 1);
  });
}
const positionsMultiples = [...profondeurs]
  .filter(([, ensemble]) => ensemble.size > 1)
  .map(([cle, ensemble]) => ({ terme: cle, profondeurs: [...ensemble].sort((a, b) => a - b) }));

// 6. Branches sœurs : un parent dont les enfants sont tous des groupes, et un
// enfant auquel manque un petit-enfant que la majorité de ses sœurs portent.
function groupes(noeud) {
  return Object.keys(noeud).filter(
    (cle) => !cle.startsWith("$") && typeof noeud[cle] === "object" && !("$value" in noeud[cle]),
  );
}
const lacunes = [];
function parcourir(noeud, segments) {
  const enfants = groupes(noeud);
  const tousGroupes = enfants.length >= 2 && enfants.length === Object.keys(noeud).filter((c) => !c.startsWith("$")).length;
  if (tousGroupes) {
    const contenu = new Map(enfants.map((e) => [e, new Set(Object.keys(noeud[e]).filter((c) => !c.startsWith("$")))]));
    const frequence = compter(enfants.flatMap((e) => [...contenu.get(e)]));
    for (const enfant of enfants) {
      const manque = frequence
        .filter(([terme, n]) => n * 2 > enfants.length && !contenu.get(enfant).has(terme))
        .map(([terme]) => terme);
      if (manque.length > 0) lacunes.push({ branche: [...segments, enfant].join("/"), manque });
    }
  }
  for (const enfant of enfants) parcourir(noeud[enfant], [...segments, enfant]);
}
parcourir(document, []);

const resultat = { feuilles: chemins.length, parCollection, termes, mots, paires, positionsMultiples, lacunes };

if (enJson) {
  console.log(JSON.stringify(resultat, null, 2));
} else {
  console.log(`${chemins.length} feuilles\n\n1. Par collection`);
  for (const [collection, n] of parCollection) console.log(`  ${collection} ${n}`);
  console.log("\n2. Termes par collection (<cran> regroupe nombres et tailles en xs)");
  for (const [collection, liste] of Object.entries(termes)) {
    console.log(`  ${collection} : ${liste.map(([t, n]) => `${t} ${n}`).join(", ")}`);
  }
  console.log(`\n3. Mots (${mots.length})\n  ${mots.map(([m, n]) => `${m} ${n}`).join(", ")}`);
  console.log("\n4. Paires candidates");
  for (const { a, b, raison, nA, nB } of paires) console.log(`  ${a} (${nA}) / ${b} (${nB}) : ${raison}`);
  console.log("\n5. Termes à plusieurs profondeurs");
  for (const { terme, profondeurs: p } of positionsMultiples) console.log(`  ${terme} : ${p.join(", ")}`);
  console.log("\n6. Branches sœurs incomplètes");
  for (const { branche, manque } of lacunes) console.log(`  ${branche} : manque ${manque.join(", ")}`);
}
