#!/usr/bin/env node
/**
 * Mesures de la section « Daltonisme » de RECHERCHE-CONCURRENCE-PALETTES.md :
 *
 *   node --import tsx "docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/mesurer-vision-simulee.mjs"
 *
 * Trois jeux de quatre palettes utilitaires à deux intensités, créées par
 * `nouvellePalette` dans la recette par défaut : les 600 de Tailwind, puis
 * deux jeux aux teintes déplacées. Pour chaque paire, la distance de l'alerte
 * « Palettes proches » (ΔEok moyen sur les crans 500, 600 et 700, Vivid, thème
 * Light), en vision normale puis simulée. Pour chaque palette, le contraste de
 * `text` 700 sur le fond du thème Light, en vision normale puis simulée.
 *
 * La simulation reprend les matrices de libDaltonLens, en sRGB linéaire :
 * Viénot 1999 pour la protanopie et la deutéranopie, Brettel 1997 pour la
 * tritanopie. Ce sont des dichromacies complètes, le cas le plus sévère.
 */
import {
  contraste,
  distanceOk,
  lineaireVersRgb8,
  lireHexa,
  rampesDe,
  recetteParDefaut,
  rgb8VersLineaire,
} from '../../../../../packages/couleur/src/index.ts';
import { nouvellePalette } from '../../../../../packages/plugin-palettes/src/edition.ts';

const JEUX = {
  'Tailwind 600': { danger: '#DC2626', warning: '#D97706', success: '#16A34A', info: '#2563EB' },
  'rose et sarcelle': { danger: '#E11D48', warning: '#D97706', success: '#0D9488', info: '#2563EB' },
  'sarcelle et indigo': { danger: '#DC2626', warning: '#CA8A04', success: '#0D9488', info: '#4F46E5' },
};
const CRANS_DE_L_ALERTE = [500, 600, 700];

const PROTAN = [0.11238, 0.88762, 0.0, 0.11238, 0.88762, 0.0, 0.00401, -0.00401, 1.0];
const DEUTAN = [0.29275, 0.70725, 0.0, 0.29275, 0.70725, 0.0, -0.02234, 0.02234, 1.0];
const TRITAN_1 = [1.01277, 0.13548, -0.14826, -0.01243, 0.86812, 0.14431, 0.07589, 0.805, 0.11911];
const TRITAN_2 = [0.93678, 0.18979, -0.12657, 0.06154, 0.81526, 0.1232, -0.37562, 1.12767, 0.24796];
const TRITAN_PLAN = [0.0345, -0.02354, -0.01096];

const appliquer = (m, [r, g, b]) => [
  m[0] * r + m[1] * g + m[2] * b,
  m[3] * r + m[4] * g + m[5] * b,
  m[6] * r + m[7] * g + m[8] * b,
];
const borner = (t) => t.map((x) => Math.min(1, Math.max(0, x)));

const VISIONS = {
  normale: (rgb) => rgb,
  protanopie: (rgb) => lineaireVersRgb8(borner(appliquer(PROTAN, rgb8VersLineaire(rgb)))),
  deuteranopie: (rgb) => lineaireVersRgb8(borner(appliquer(DEUTAN, rgb8VersLineaire(rgb)))),
  tritanopie: (rgb) => {
    const lin = rgb8VersLineaire(rgb);
    const cote = lin[0] * TRITAN_PLAN[0] + lin[1] * TRITAN_PLAN[1] + lin[2] * TRITAN_PLAN[2];
    return lineaireVersRgb8(borner(appliquer(cote >= 0 ? TRITAN_1 : TRITAN_2, lin)));
  },
};

const RECETTE = recetteParDefaut();
const virgule = (x, n = 3) => x.toFixed(n).replace('.', ',');
const rang = (cran) => RECETTE.crans.indexOf(cran);

const fond = lireHexa(RECETTE.fonds.light);

/** Les deux tables d'un jeu : distances entre paires, puis contraste de `text` 700. */
function mesurer(titre, utilitaires) {
  const palettes = Object.entries(utilitaires).map(([nom, hexa], i) => {
    const palette = nouvellePalette(RECETTE, `p-0000000${i}`, hexa, 2);
    const recette = { ...RECETTE, palettes: [palette] };
    return { nom, rampe: rampesDe(recette, palette).vivid.light };
  });

  console.log(`# Jeu ${titre} : ${Object.values(utilitaires).join(', ')}\n`);
  console.log('## Distance de l’alerte « Palettes proches », par vision\n');
  console.log(`| Paire | ${Object.keys(VISIONS).join(' | ')} |`);
  console.log(`|---|${Object.keys(VISIONS).map(() => '---|').join('')}`);
  for (let a = 0; a < palettes.length; a += 1) for (let b = a + 1; b < palettes.length; b += 1) {
    const cellules = Object.values(VISIONS).map((voir) => {
      const somme = CRANS_DE_L_ALERTE.reduce((total, cran) => total
        + distanceOk(voir(palettes[a].rampe[rang(cran)].couleur), voir(palettes[b].rampe[rang(cran)].couleur)), 0);
      const moyenne = somme / CRANS_DE_L_ALERTE.length;
      return moyenne < RECETTE.seuils.palettesProches ? `**${virgule(moyenne)}**` : virgule(moyenne);
    });
    console.log(`| ${palettes[a].nom} et ${palettes[b].nom} | ${cellules.join(' | ')} |`);
  }

  console.log('\n## Contraste de `text` 700 sur le fond du thème Light, par vision\n');
  console.log(`| Palette | ${Object.keys(VISIONS).join(' | ')} |`);
  console.log(`|---|${Object.keys(VISIONS).map(() => '---|').join('')}`);
  for (const { nom, rampe } of palettes) {
    const cellules = Object.values(VISIONS).map((voir) => virgule(contraste(voir(rampe[rang(700)].couleur), voir(fond)), 2));
    console.log(`| ${nom} | ${cellules.join(' | ')} |`);
  }
  console.log('');
}

console.log(`Seuil « Palettes proches » de la recette par défaut : ${virgule(RECETTE.seuils.palettesProches)}\n`);
for (const [titre, utilitaires] of Object.entries(JEUX)) mesurer(titre, utilitaires);
