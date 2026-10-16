#!/usr/bin/env node
/**
 * Relève, sur un `tokens.json`, la place de chaque terme dans les chemins
 * (sujet R3 du plan de recherche) :
 *
 *   node mesurer-positions.mjs <tokens.json> [--max N] [--type color] [--json]
 *
 *   1. vocabulaire par position : pour chaque collection et chaque
 *      profondeur, le nombre de termes distincts et les plus fréquents ;
 *   2. termes à plusieurs profondeurs d'une même collection : un écart de
 *      grammaire, ou un homonyme ;
 *   3. synonymes à la même place : deux termes d'une même collection, à la
 *      même profondeur, jamais frères, dont deux feuilles visent la même cible
 *      avec le même segment avant le terme ou le même suffixe après lui.
 *
 * `--type` restreint le relevé 3 aux feuilles d'un type DTCG : deux mesures
 * partagent souvent la même primitive sans nommer le même concept.
 *
 * Un cran (`700`, `xl`, `2xs`) n'est pas un terme. Les candidats se jugent à
 * la main.
 */
import { readFileSync } from "node:fs";

const [, , chemin, ...options] = process.argv;
if (chemin === undefined) {
  console.error("usage : node mesurer-positions.mjs <tokens.json> [--max N] [--json]");
  process.exit(2);
}
const max = Number(options[options.indexOf("--max") + 1]) || 20;
const enJson = options.includes("--json");
const typeVise = options.includes("--type") ? options[options.indexOf("--type") + 1] : null;
const racine = JSON.parse(readFileSync(chemin, "utf8"));

const estCran = (terme) => /^-?[0-9]+([,.][0-9]+)?$/.test(terme) || /^[0-9]*x*[sl]$/.test(terme) || /^[0-9]+x[sl]?$/.test(terme);

function feuilles(noeud, segments = [], sortie = [], typeHerite = undefined) {
  if (noeud === null || typeof noeud !== "object") return sortie;
  const type = noeud.$type ?? typeHerite;
  if (Object.prototype.hasOwnProperty.call(noeud, "$value")) {
    const modes = noeud.$extensions?.["com.ucm.modes"];
    sortie.push({ segments, type, signature: JSON.stringify(modes ?? noeud.$value) });
    return sortie;
  }
  for (const cle of Object.keys(noeud)) if (!cle.startsWith("$")) feuilles(noeud[cle], [...segments, cle], sortie, type);
  return sortie;
}
const toutes = feuilles(racine);

const ajouter = (table, cle, n = 1) => table.set(cle, (table.get(cle) ?? 0) + n);
const trier = (table) => [...table].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));

// 1 et 2. Vocabulaire par collection et par profondeur.
const parPosition = new Map(); // collection -> profondeur -> Map(terme, n)
const profondeursDuTerme = new Map(); // collection|terme -> Set(profondeur)
for (const { segments } of toutes) {
  const [collection] = segments;
  segments.forEach((terme, profondeur) => {
    if (profondeur === 0 || estCran(terme)) return;
    if (!parPosition.has(collection)) parPosition.set(collection, new Map());
    const profondeurs = parPosition.get(collection);
    if (!profondeurs.has(profondeur)) profondeurs.set(profondeur, new Map());
    ajouter(profondeurs.get(profondeur), terme);
    const cle = `${collection}|${terme}`;
    if (!profondeursDuTerme.has(cle)) profondeursDuTerme.set(cle, new Set());
    profondeursDuTerme.get(cle).add(profondeur);
  });
}

const vocabulaire = [];
for (const [collection, profondeurs] of parPosition) {
  for (const [profondeur, termes] of [...profondeurs].sort((a, b) => a[0] - b[0])) {
    vocabulaire.push({ collection, profondeur, distincts: termes.size, tete: trier(termes).slice(0, 8).map(([t, n]) => `${t} ${n}`) });
  }
}

const plusieursProfondeurs = [...profondeursDuTerme]
  .filter(([, p]) => p.size > 1)
  .map(([cle, p]) => {
    const [collection, terme] = cle.split("|");
    return { collection, terme, profondeurs: [...p].sort((a, b) => a - b) };
  });

// 3. Synonymes à la même place.
const parents = new Map();
for (const { segments } of toutes) {
  segments.forEach((terme, k) => {
    if (k === 0) return;
    const parent = segments.slice(0, k).join("/");
    if (!parents.has(parent)) parents.set(parent, new Set());
    parents.get(parent).add(terme);
  });
}
const freres = new Set();
for (const enfants of parents.values()) for (const a of enfants) for (const b of enfants) if (a !== b) freres.add(`${a}|${b}`);

const parCible = new Map();
for (const feuille of toutes) {
  if (!feuille.signature.includes("{")) continue;
  if (typeVise && feuille.type !== typeVise) continue;
  if (!parCible.has(feuille.signature)) parCible.set(feuille.signature, []);
  parCible.get(feuille.signature).push(feuille.segments);
}
const synonymes = new Map();
const exemples = new Map();
for (const groupe of parCible.values()) {
  for (let i = 0; i < groupe.length; i += 1) {
    for (let j = i + 1; j < groupe.length; j += 1) {
      const a = groupe[i];
      const b = groupe[j];
      if (a[0] !== b[0] || a.length !== b.length) continue;
      for (let k = 1; k < a.length; k += 1) {
        const x = a[k];
        const y = b[k];
        if (x === y || estCran(x) || estCran(y) || freres.has(`${x}|${y}`)) continue;
        const memeAvant = a[k - 1] === b[k - 1] && k > 1;
        const memeApres = a.slice(k + 1).join("/") === b.slice(k + 1).join("/") && k < a.length - 1;
        if (!memeAvant && !memeApres) continue;
        const cle = `${a[0]} · ${x < y ? `${x} / ${y}` : `${y} / ${x}`}`;
        ajouter(synonymes, cle);
        if (!exemples.has(cle)) exemples.set(cle, `${a.join("/")}  ~  ${b.join("/")}`);
      }
    }
  }
}
const candidats = trier(synonymes).map(([cle, n]) => ({ cle, n, exemple: exemples.get(cle) }));

if (enJson) {
  console.log(JSON.stringify({ feuilles: toutes.length, vocabulaire, plusieursProfondeurs, candidats }, null, 2));
  process.exit(0);
}

console.log(`${toutes.length} feuilles\n`);
console.log("1. Vocabulaire par position (collection, profondeur : termes distincts ; tête)");
for (const v of vocabulaire) console.log(`  ${v.collection} ${v.profondeur} : ${v.distincts} ; ${v.tete.join(", ")}`);
console.log(`\n2. Termes à plusieurs profondeurs d'une même collection (${plusieursProfondeurs.length})`);
for (const p of plusieursProfondeurs.slice(0, max * 2)) console.log(`  ${p.collection} · ${p.terme} : ${p.profondeurs.join(", ")}`);
console.log(`\n3. Synonymes à la même place (${candidats.length} paires ; paires de feuilles)`);
for (const c of candidats.slice(0, max)) console.log(`  ${c.cle} : ${c.n}\n      ${c.exemple}`);
