#!/usr/bin/env node
/**
 * Mesure les signaux qui rapprochent deux termes de noms sans qu'ils se
 * ressemblent, et ceux qui relèvent une forme fautive, sur un `tokens.json`.
 *
 * Chaque relevé rend des candidats classés ; leur précision se juge à la main.
 *
 *   node rapprocher-termes.mjs <tokens.json> [--max N]
 *
 * Les six relevés :
 *   1. traduction par alias : au moins 90 % des alias partis d'un chemin qui
 *      porte `a` arrivent sur un chemin qui porte `b` (`error` vers `danger`) ;
 *   2. valeur commune : deux feuilles de même valeur portent deux termes qui
 *      ne sont jamais frères mais partagent un frère (`contained`, `filled`) ;
 *   3. mots soudés : un segment qui se découpe entièrement en mots que le
 *      fichier emploie ailleurs seuls (`surfacewhite`) ;
 *   4. fautes de frappe : deux mots d'au moins six lettres à une
 *      transposition, insertion, suppression ou substitution l'un de l'autre ;
 *   5. formes de séparateurs : `_`, `---`, `(`, `+`, `[` et la casse ;
 *   6. modes écrits dans les noms : segment ou suffixe égal à un mode déclaré
 *      dans `com.ucm.axes`.
 */
import { readFileSync } from "node:fs";

const [, , chemin, ...options] = process.argv;
if (chemin === undefined) {
  console.error("usage : node rapprocher-termes.mjs <tokens.json> [--max N]");
  process.exit(2);
}
const max = Number(options[options.indexOf("--max") + 1]) || 25;
const document = JSON.parse(readFileSync(chemin, "utf8"));
const axes = document.$extensions?.["com.ucm.axes"] ?? {};

const estCran = (terme) => /^-?[0-9]+(,[0-9]+)?$/.test(terme) || /^[0-9]*x*[sl]$/.test(terme);

/** Les feuilles : segments, et signature de la valeur dans tous les modes. */
function feuilles(noeud, segments = [], sortie = []) {
  if (noeud === null || typeof noeud !== "object") return sortie;
  if (Object.prototype.hasOwnProperty.call(noeud, "$value")) {
    const modes = noeud.$extensions?.["com.ucm.modes"];
    sortie.push({ segments, signature: JSON.stringify(modes ?? noeud.$value) });
    return sortie;
  }
  for (const cle of Object.keys(noeud)) if (!cle.startsWith("$")) feuilles(noeud[cle], [...segments, cle], sortie);
  return sortie;
}
const toutes = feuilles(document);

function ajouter(table, cle, n = 1) {
  table.set(cle, (table.get(cle) ?? 0) + n);
}
const trier = (table) => [...table].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const paire = (a, b) => (a < b ? `${a} / ${b}` : `${b} / ${a}`);

// Frères : deux termes rangés sous un même parent. Deux frères nomment deux
// concepts voisins (`error`, `warning`) ; un synonyme ne l'est jamais.
const parents = new Map();
for (const { segments } of toutes) {
  segments.forEach((terme, k) => {
    if (k === 0 || estCran(terme)) return;
    const parent = segments.slice(0, k).join("/");
    if (!parents.has(parent)) parents.set(parent, new Set());
    parents.get(parent).add(terme);
  });
}
const freresDe = new Map();
for (const enfants of parents.values()) {
  for (const a of enfants) {
    if (!freresDe.has(a)) freresDe.set(a, new Set());
    for (const b of enfants) if (a !== b) freresDe.get(a).add(b);
  }
}
const sontFreres = (a, b) => freresDe.get(a)?.has(b) ?? false;
const partagentUnFrere = (a, b) => [...(freresDe.get(a) ?? [])].some((f) => freresDe.get(b)?.has(f));

// 1. Traduction par alias : la part des alias partis d'un chemin qui porte
// `a` et arrivés sur un chemin qui porte `b`.
const departs = new Map();
const traductions = new Map();
const cibles = (signature) => [...signature.matchAll(/{([^}]+)}/g)].map((m) => m[1].split("."));
for (const { segments, signature } of toutes) {
  const source = new Set(segments.slice(1).filter((t) => !estCran(t)));
  for (const cible of new Set(cibles(signature).map((c) => c.join(".")))) {
    const arrivee = new Set(cible.split(".").slice(1).filter((t) => !estCran(t)));
    for (const a of source) {
      if (arrivee.has(a)) continue;
      ajouter(departs, a);
      for (const b of arrivee) if (!source.has(b)) ajouter(traductions, `${a}>${b}`);
    }
  }
}
const traduction = [];
for (const [cle, n] of traductions) {
  const [a, b] = cle.split(">");
  const part = n / departs.get(a);
  if (n >= 3 && part >= 0.9 && !sontFreres(a, b)) traduction.push({ cle: `${a} → ${b}`, part, n });
}
traduction.sort((x, y) => y.n - x.n);

// 2. Valeur commune : deux feuilles qui portent la même valeur, alias
// compris, dans tous les modes. Chaque terme propre à l'une, apparié à
// chaque terme propre à l'autre, est candidat s'ils ne sont jamais frères
// et partagent au moins un frère : ils occupent la même place dans deux
// branches différentes.
const parSignature = new Map();
for (const feuille of toutes) {
  if (!feuille.signature.includes("{")) continue;
  if (!parSignature.has(feuille.signature)) parSignature.set(feuille.signature, []);
  parSignature.get(feuille.signature).push(feuille.segments);
}
const valeurCommune = new Map();
for (const groupe of parSignature.values()) {
  const echantillon = groupe.slice(0, 80);
  for (let i = 0; i < echantillon.length; i += 1) {
    for (let j = i + 1; j < echantillon.length; j += 1) {
      const a = new Set(echantillon[i].filter((t) => !estCran(t)));
      const b = new Set(echantillon[j].filter((t) => !estCran(t)));
      for (const x of a) {
        if (b.has(x)) continue;
        for (const y of b) {
          if (a.has(y) || sontFreres(x, y) || !partagentUnFrere(x, y)) continue;
          ajouter(valeurCommune, paire(x, y));
        }
      }
    }
  }
}

// 3. Mots soudés : découpe gloutonne sur les mots d'au moins trois lettres
// que le fichier emploie seuls, segment entier ou partie entre tirets.
const motsSeuls = new Set(
  toutes.flatMap(({ segments }) => segments.flatMap((s) => s.split(/[-_]/))).filter((m) => /^[a-z]{3,}$/.test(m)),
);
function decouper(mot) {
  if (mot === "") return [];
  for (let fin = mot.length; fin >= 3; fin -= 1) {
    const tete = mot.slice(0, fin);
    if (!motsSeuls.has(tete) || tete === mot) continue;
    const reste = decouper(mot.slice(fin));
    if (reste) return [tete, ...reste];
  }
  return motsSeuls.has(mot) ? [mot] : null;
}
const soudes = new Map();
for (const { segments } of toutes) {
  for (const segment of segments) {
    for (const mot of segment.split(/[-_]/)) {
      if (!/^[a-z]{6,}$/.test(mot)) continue;
      const parties = decouper(mot);
      if (parties && parties.length >= 2) soudes.set(mot, parties.join("·"));
    }
  }
}

// 4. Fautes de frappe : distance de Damerau d'au plus 1.
function damerau1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  const [court, long] = a.length < b.length ? [a, b] : [b, a];
  return court.slice(i) === long.slice(i + 1);
}
const compteMots = new Map();
for (const { segments } of toutes) for (const s of segments) for (const m of s.split(/[-_]/)) if (/^[a-z]{6,}$/.test(m)) ajouter(compteMots, m);
const frappes = [];
const mots = [...compteMots.keys()];
for (let i = 0; i < mots.length; i += 1) {
  for (let j = i + 1; j < mots.length; j += 1) {
    const [a, b] = [mots[i], mots[j]];
    if (b === `${a}s` || a === `${b}s`) continue;
    if (damerau1(a, b)) frappes.push(`${a} (${compteMots.get(a)}) / ${b} (${compteMots.get(b)})`);
  }
}

// 5. Formes de séparateurs.
const formes = new Map();
for (const { segments } of toutes) {
  for (const s of segments) {
    if (s.includes("_")) ajouter(formes, `souligné : ${s}`);
    if (/-{2,}/.test(s)) ajouter(formes, `tirets multiples : ${s}`);
    if (/[()+[\]]/.test(s)) ajouter(formes, `ponctuation : ${s}`);
    if (/[A-Z]/.test(s)) ajouter(formes, `majuscule : ${s}`);
  }
}

// 6. Modes écrits dans les noms.
const modesDeclares = new Set(Object.values(axes).flatMap((axe) => axe.modes ?? []));
const modesDansLesNoms = new Map();
for (const { segments } of toutes) {
  for (const s of segments.slice(1)) {
    const suffixe = s.match(/\[([^\]]+)\]$/)?.[1];
    if (modesDeclares.has(s)) ajouter(modesDansLesNoms, `segment « ${s} »`);
    if (suffixe && modesDeclares.has(suffixe)) ajouter(modesDansLesNoms, `suffixe « [${suffixe}] »`);
  }
}

console.log(`${toutes.length} feuilles

1. Traduction par alias (part des départs, nombre)`);
for (const { cle, part, n } of traduction.slice(0, max)) console.log(`  ${cle} : ${(part * 100).toFixed(0)} %, ${n}`);
console.log(`  (${traduction.length} traductions en tout)`);
console.log(`
2. Valeur commune, termes jamais frères qui partagent un frère (paires de feuilles)`);
for (const [cle, n] of trier(valeurCommune).slice(0, max)) console.log(`  ${cle} : ${n}`);
console.log(`  (${valeurCommune.size} paires en tout)`);
console.log(`\n3. Mots soudés (${soudes.size})`);
console.log(`  ${[...soudes].map(([m, d]) => `${m} = ${d}`).join(", ")}`);
console.log(`\n4. Fautes de frappe possibles (${frappes.length})\n  ${frappes.join("\n  ")}`);
console.log(`\n5. Formes de séparateurs (${formes.size})`);
for (const [cle, n] of trier(formes).slice(0, max)) console.log(`  ${cle} : ${n}`);
console.log(`\n6. Modes écrits dans les noms`);
for (const [cle, n] of trier(modesDansLesNoms)) console.log(`  ${cle} : ${n}`);
