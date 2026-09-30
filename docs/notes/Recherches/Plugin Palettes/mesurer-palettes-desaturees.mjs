#!/usr/bin/env node
/**
 * Mesures C2 à C5 de PLAN-PALETTES-DESATUREES.md, faites par le moteur tel
 * qu'il est dans l'arbre :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/mesurer-palettes-desaturees.mjs"
 *
 * Chaque palette se crée par `nouvellePalette`, le chemin de l'onglet
 * Création : parts, dérive Tailwind et alertes sont celles que le designer
 * obtient. La section « Rampes complètes » écrit les quatre rampes de chaque
 * référence ; comparer sa sortie avant et après un changement du moteur
 * montre quelles couleurs bougent. Les trois références colorées doivent y
 * rester identiques.
 */
import {
  alertesDePalette,
  ancrageDe,
  distanceOk,
  etendueDe,
  fabriquerCran,
  lireHexa,
  partDeChroma,
  partDeLaReference,
  partsDe,
  plafond,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
} from '../../../../packages/couleur/src/index.ts';
import { nouvellePalette } from '../../../../packages/plugin-palettes/src/edition.ts';

const DESATUREES = ['#897288', '#7C717B', '#6B7280', '#78716C', '#A0B599', '#7F7F80', '#060605', '#FAFAF5'];
const COLOREES = ['#1E6FD9', '#16A34A', '#DC2626'];
const MONTRES = [100, 300, 500, 600, 700, 900];

const RECETTE = recetteParDefaut();
const virgule = (x, n = 3) => x.toFixed(n).replace('.', ',');

/** La palette à deux intensités que l'onglet Création fait de `hexa`, seule dans la recette par défaut. */
function creer(hexa) {
  const palette = nouvellePalette(RECETTE, 'p-0000000a', hexa, 2);
  const recette = { ...RECETTE, palettes: [palette] };
  return { recette, palette, rampes: rampesDe(recette, palette), ancrage: ancrageDe(recette, palette) };
}

/* C2 : la fiabilité de la teinte selon la chroma */

/** Écart de teinte entre une couleur de chroma `C` et ses six voisines à une unité RGB, sur 24 teintes et 4 clartés. */
function incertitude(C) {
  const ecarts = [];
  for (let H = 0; H < 360; H += 15) for (const L of [0.3, 0.5, 0.7, 0.9]) {
    const base = fabriquerCran(L, H, C / plafond(L, H), 'srgb');
    if (base.C < 1e-3) continue;
    let pire = 0;
    for (let k = 0; k < 3; k += 1) for (const d of [-1, 1]) {
      const voisin = [...base.couleur];
      voisin[k] = Math.min(255, Math.max(0, voisin[k] + d));
      const lu = rgb8VersOklch(voisin);
      pire = Math.max(pire, Math.abs(((lu.H - base.H + 540) % 360) - 180));
    }
    ecarts.push(pire);
  }
  ecarts.sort((a, b) => a - b);
  return { mediane: ecarts[ecarts.length >> 1], pire: ecarts[ecarts.length - 1] };
}

console.log('## C2. Écart de teinte à une unité RGB\n');
console.log('| Chroma | Écart médian | Écart maximal |\n|---|---|---|');
for (const C of [0.003, 0.005, 0.008, 0.01, 0.02, 0.03]) {
  const { mediane, pire } = incertitude(C);
  console.log(`| ${virgule(C)} | ${Math.round(mediane)}° | ${Math.round(pire)}° |`);
}

/* C3 et C4 : parts, porteur, rampes et écart des profils */

const rang = (numero) => RECETTE.crans.indexOf(numero);
console.log('\n## C3 et C4. Parts, porteur et rampes Light\n');
console.log('| Référence | Part brute | Part de la référence | Porteur | Soft ; Vivid | Dérive | Soft 100 à 900 | Vivid 100 à 900 | ΔEok 600 | Alertes |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const hexa of [...DESATUREES, ...COLOREES]) {
  const { recette, palette, rampes, ancrage } = creer(hexa);
  const parts = partsDe(recette, palette);
  const nuances = (profil) => MONTRES.map((numero) => `\`${rampes[profil].light[rang(numero)].hexa}\``).join(' ');
  const ecart = distanceOk(rampes.soft.light[rang(600)].couleur, rampes.vivid.light[rang(600)].couleur);
  const derive = palette.derive.vivid;
  const alertes = alertesDePalette(recette, palette).map((alerte) => alerte.code).join(', ') || 'aucune';
  console.log(`| \`${hexa}\` | ${virgule(partDeChroma(lireHexa(hexa)))} | ${virgule(partDeLaReference(recette, palette))} | ${ancrage.profil} | ${virgule(parts.soft)} ; ${virgule(parts.vivid)} | ${derive.clair}° ; ${derive.sombre}° | ${nuances('soft')} | ${nuances('vivid')} | ${virgule(ecart)} | ${alertes} |`);
}

/* C5 : la part aux clartés extrêmes */

const etendue = etendueDe(RECETTE);
console.log(`\n## C5. Part à la clarté bornée (étendue ${virgule(etendue.sombre)} à ${virgule(etendue.clair)})\n`);
console.log('| Référence | Clarté | Chroma | Part brute | Part de la référence | Soft 100 | Chroma du Soft 100 |\n|---|---|---|---|---|---|---|');
for (const hexa of ['#060605', '#FAFAF5', '#020617', '#F8FAFC', '#F9FAFB', '#0C0A09']) {
  const { recette, palette, rampes } = creer(hexa);
  const lu = rgb8VersOklch(lireHexa(hexa));
  const cent = rampes.soft.light[rang(100)];
  console.log(`| \`${hexa}\` | ${virgule(lu.L)} | ${virgule(lu.C)} | ${virgule(partDeChroma(lireHexa(hexa)))} | ${virgule(partDeLaReference(recette, palette))} | \`${cent.hexa}\` | ${virgule(cent.C)} |`);
}

/* Les rampes complètes, pour comparer deux états du moteur */

console.log('\n## Rampes complètes\n');
for (const hexa of [...DESATUREES, ...COLOREES]) {
  const { rampes } = creer(hexa);
  for (const [intensite, rampe] of Object.entries(rampes)) {
    for (const mode of ['light', 'dark']) console.log(`${hexa} ${intensite} ${mode} ${rampe[mode].map((cran) => cran.hexa).join(' ')}`);
  }
}
