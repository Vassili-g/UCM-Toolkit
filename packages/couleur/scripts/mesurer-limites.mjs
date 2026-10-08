#!/usr/bin/env node
/**
 * Mesure les limites dynamiques du Color shift ([DER-19]) sur les six
 * références de l'étude, dans Node : la plage permise de chaque grandeur à
 * chaque bout, sa cause, puis les limites croisées, et la durée d'une limite.
 *
 *   npx tsx packages/couleur/scripts/mesurer-limites.mjs
 *
 * Recette par défaut, deux intensités synchronisées, teinte Tailwind,
 * saturation et luminosité à zéro. Aucun test ne porte ces nombres : ils
 * entrent dans la section 5.2 de l'étude du Color shift.
 */
import { performance } from 'node:perf_hooks';

import {
  BORNES_DU_COLOR_SHIFT,
  PAS_DU_COLOR_SHIFT,
  TABLE_DES_DOSSIERS,
  boutsDe,
  lireHexa,
  limiteDynamique,
  prereglageTailwind,
  recetteParDefaut,
  rgb8VersOklch,
  sensDuTheme,
} from '../src/index.ts';

const REFERENCES = [
  ['Bleu', '#1E6FD9'],
  ['Vert', '#16A34A'],
  ['Rouge', '#DC2626'],
  ['Jaune', '#EAB308'],
  ['Sauge', '#A0B599'],
  ['Gris', '#6B7280'],
];
const GRANDEURS = ['teinte', 'saturation', 'clarte'];
const BOUTS = ['clair', 'sombre'];
const RECETTE = recetteParDefaut();

const ecrire = (texte) => process.stdout.write(`${texte}\n`);
const virgule = (x, n) => x.toFixed(n).replace('.', ',').replace(/^-/, '−');

function paletteDe(hexa) {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(hexa)), boutsDe(RECETTE));
  const palette = { id: 'p-00000001', reference: hexa, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
  return { recette: { ...RECETTE, palettes: [palette] }, palette };
}

/** La palette dont les deux profils prennent `valeur` pour `grandeur` au `bout`. */
function avec(palette, grandeur, bout, valeur) {
  const regler = (derive) => (grandeur === 'teinte'
    ? { ...derive, [bout]: valeur, origine: 'libre' }
    : { ...derive, [grandeur]: { ...(derive[grandeur] ?? { clair: 0, sombre: 0 }), [bout]: valeur } });
  return { ...palette, derive: { ...palette.derive, soft: regler(palette.derive.soft), vivid: regler(palette.derive.vivid) } };
}

const valeurDe = (palette, grandeur, bout) => (grandeur === 'teinte' ? palette.derive.vivid[bout] : palette.derive.vivid[grandeur]?.[bout] ?? 0);

let duree = 0;
let durees = [];
function limite(recette, palette, grandeur, bout) {
  const borne = BORNES_DU_COLOR_SHIFT[grandeur];
  const debut = performance.now();
  const resultat = limiteDynamique({
    recette,
    palette,
    candidate: (valeur) => avec(palette, grandeur, bout, valeur),
    valeur: valeurDe(palette, grandeur, bout),
    bornes: { bas: -borne, haut: borne },
    pas: PAS_DU_COLOR_SHIFT[grandeur],
    ordre: grandeur === 'clarte',
  });
  const ecoule = performance.now() - debut;
  duree += ecoule;
  durees.push(ecoule);
  return resultat;
}

/** Un membre de promesse : la variable de la table et son cran, le fond de la page ou le texte des boutons. */
function membre(recette, designation, mode, variable) {
  if (designation.nature === 'fond') return 'fond';
  if (designation.nature === 'texteDesBoutons') return `${variable} ${recette.texteDesBoutons[mode]}`;
  return `${variable} ${designation.cran}`;
}

/** La variable de la table que vise le fond d'une promesse : le premier fond de la garantie qui porte ce cran. */
function variableDuSecond(p) {
  const sens = sensDuTheme(p.mode, RECETTE.texteDesBoutons[p.mode]);
  if (p.second.nature !== 'cran') return null;
  const fond = p.garantie.fonds.find((f) => 'variable' in f && TABLE_DES_DOSSIERS[sens][f.variable] === p.second.cran);
  return fond ? fond.variable : null;
}

function ecrireBorne(recette, grandeur, { valeur, cause }) {
  const texte = grandeur === 'teinte' ? `${virgule(valeur, 0)}°` : grandeur === 'saturation' ? `${virgule(valeur * 100, 0)} %` : virgule(valeur, 3);
  if (!cause) return texte;
  if (cause.nature === 'ordre') return `${texte} (ordre des nuances)`;
  const p = cause.promesse;
  return `${texte} (G${p.garantie.numero} ${membre(recette, p.premier, p.mode, p.garantie.premier.variable)} / ${membre(recette, p.second, p.mode, variableDuSecond(p))}, ${p.profil}, ${p.mode}, ${virgule(Math.floor(p.contraste * 100) / 100, 2)} < ${virgule(p.seuil, 1)})`;
}
const ecrireLimite = (recette, grandeur, { bas, haut }) => `[${ecrireBorne(recette, grandeur, bas)} ; ${ecrireBorne(recette, grandeur, haut)}]`;

// Une première limite charge le module et compile ses fonctions.
{
  const { recette, palette } = paletteDe('#1E6FD9');
  limite(recette, palette, 'clarte', 'clair');
  duree = 0;
  durees = [];
}

ecrire('Limites dynamiques, sept garanties, deux intensités synchronisées, teinte Tailwind, saturation et luminosité à zéro');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  ecrire(`\n${nom} ${hexa} · Tailwind ${virgule(palette.derive.vivid.clair, 1)}° / ${virgule(palette.derive.vivid.sombre, 1)}°`);
  for (const grandeur of GRANDEURS) {
    for (const bout of BOUTS) ecrire(`  ${grandeur.padEnd(10)} ${bout.padEnd(6)} ${ecrireLimite(recette, grandeur, limite(recette, palette, grandeur, bout))}`);
  }
}

ecrire('\nLimites croisées : luminosité posée à sa borne haute, puis teinte et saturation du même bout');
for (const [nom, hexa] of REFERENCES) {
  const { recette, palette } = paletteDe(hexa);
  for (const bout of BOUTS) {
    const haut = limite(recette, palette, 'clarte', bout).haut.valeur;
    const posee = avec(palette, 'clarte', bout, haut);
    const teinte = limite(recette, posee, 'teinte', bout);
    const saturation = limite(recette, posee, 'saturation', bout);
    ecrire(`  ${nom.padEnd(6)} ${bout.padEnd(6)} L ${virgule(haut, 3)} · teinte ${ecrireLimite(recette, 'teinte', teinte)} · saturation ${ecrireLimite(recette, 'saturation', saturation)}`);
  }
}

const triees = [...durees].sort((a, b) => a - b);
ecrire(`\n${durees.length} limites, deux bornes chacune : ${virgule(duree / durees.length, 1)} ms en moyenne, médiane ${virgule(triees[Math.floor(triees.length / 2)], 1)} ms, la plus longue ${virgule(triees[triees.length - 1], 1)} ms.`);
