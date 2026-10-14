/** Exploration : les crans des alertes dans chaque variante, contre Tailwind et Radix. */
import { readFileSync } from 'node:fs';
import { lireHexa, rgb8VersOklch } from '../../../../../../packages/couleur/src/conversions';
import type { Recette } from '../../../../../../packages/couleur/src/recette';
import { valider } from './variantes';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { enveloppe, partDuPlafond, rampesDuBanc, recetteAuxReglagesCommuns } from './prototype';

const lire = (chemin: string) => JSON.parse(readFileSync(new URL(chemin, import.meta.url), 'utf8'));
const reelle = valider(lire('./references/recette-mainteneur.json'));
const commune = valider(recetteAuxReglagesCommuns(reelle));
const NOMS = ['Poppy', 'Orange', 'Grass', 'Sky'];
const CRANS = reelle.crans;
const VUS = { light: [50, 100, 200, 700, 800], dark: [100, 200, 300, 800, 900] } as const;

const fmt = (hexa: string) => {
  const o = rgb8VersOklch(lireHexa(hexa)!);
  return `${hexa} ${o.L.toFixed(2).slice(1)}/${o.C.toFixed(3).slice(1)}`;
};
const afficher = (titre: string, rampes: (nom: string) => any) => {
  console.log(`\n=== ${titre}`);
  for (const nom of NOMS) for (const i of ['soft', 'vivid'] as const) for (const m of ['light', 'dark'] as const) {
    const r = rampes(nom)[i]?.[m];
    if (!r) continue;
    console.log(`${nom.padEnd(6)} ${i[0]}${m[0]}`, VUS[m].map((c) => `${c}:${fmt(r[CRANS.indexOf(c)].hexa)}`).join('  '));
  }
};
const palette = (recette: Recette, nom: string) => recette.palettes.find((p) => p.nom === nom)!;

afficher('Actuel, recette du mainteneur', (nom) => rampesDe(reelle, palette(reelle, nom)));
afficher('Actuel, réglages communs', (nom) => rampesDe(commune, palette(commune, nom)));
afficher('Banc, part du plafond (contrôle = réglages communs)', (nom) => rampesDuBanc(commune, palette(commune, nom), partDuPlafond));
const env = (i: string) => (i === 'soft' ? enveloppe(0.6, 0.38) : enveloppe(1.1, 0.48));
afficher('Enveloppe : Soft 0,85 · a 0,6 · b 0,38 ; Vivid 0,95 · a 1,1 · b 0,48', (nom) =>
  rampesDuBanc(commune, palette(commune, nom), (v) => env(v.intensite)(v), { parts: { soft: 0.85, vivid: 0.95 } }));

const tw = lire('./references/tailwind-3.4.17.json');
console.log('\n=== Tailwind 3.4.17 (Untitled UI)');
for (const n of ['red', 'amber', 'green', 'sky']) console.log(n.padEnd(8), [50, 100, 200, 700, 800].map((c) => `${c}:${fmt(tw[n][c])}`).join('  '));
const rx = lire('./references/radix-colors-3.0.0.json');
console.log('=== Radix 3.0.0 clair 2,3,6,11,12 · sombre 3,4,5,11,12');
for (const n of ['red', 'amber', 'grass', 'blue']) {
  console.log(`${n.padEnd(6)} l`, [2, 3, 6, 11, 12].map((s) => `${s}:${fmt(rx[`${n}Light`][s - 1].toUpperCase())}`).join('  '));
  console.log(`${n.padEnd(6)} d`, [3, 4, 5, 11, 12].map((s) => `${s}:${fmt(rx[`${n}Dark`][s - 1].toUpperCase())}`).join('  '));
}
