/**
 * Ce que les deux scripts de la recherche partagent : la lecture d'une
 * recette exportée du plugin, le groupe de palettes comparé, et la lecture
 * des nuances du thème en dossiers, référence comprise.
 */
import { readFileSync } from 'node:fs';

import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  MODES,
  PROFILS,
  TABLE_DES_DOSSIERS,
  ancrageDe,
  contraste,
  lireHexa,
  plafond,
  rampesDe,
  sensDuTheme,
  verifierPromesses,
  ordreTenu,
} from '../../../../../packages/couleur/src/index.ts';

export { MODES, PROFILS };

/** Les variables de palette comparées, dans l'ordre où le thème les range. */
export const VARIABLES = [
  'surface/default', 'surface/hover', 'surface/pressed', 'surface/foreground', 'surface/border',
  'page/foreground', 'page/border', 'page/divider', 'page/focus',
  'solid/default', 'solid/hover', 'solid/pressed',
];

/** Les palettes de statut par défaut : danger, warning, success, info. */
export const GROUPE_PAR_DEFAUT = ['Poppy', 'Orange', 'Grass', 'Sky'];

/** Les arguments : `<recette.json> [--groupe A,B,C] [--modele A] [--json sortie.json]`. */
export function lireArguments(argv) {
  const [chemin, ...reste] = argv;
  if (!chemin) throw new Error('Donner le chemin d\'une recette exportée du plugin (format 10).');
  const options = {};
  for (let i = 0; i < reste.length; i += 2) options[reste[i].replace(/^--/, '')] = reste[i + 1];
  return {
    recette: JSON.parse(readFileSync(chemin, 'utf8')),
    noms: options.groupe ? options.groupe.split(',') : GROUPE_PAR_DEFAUT,
    modele: options.modele,
    json: options.json,
  };
}

export function paletteNommee(recette, nom) {
  const palette = recette.palettes.find((candidate) => candidate.nom === nom);
  if (!palette) throw new Error(`Aucune palette « ${nom} » dans la recette.`);
  return palette;
}

/** Le cran de chaque variable dans le sens du thème de `mode`, avec le texte des boutons. */
export function tableDuMode(recette, mode) {
  return TABLE_DES_DOSSIERS[sensDuTheme(mode, recette.texteDesBoutons[mode])];
}

/**
 * Les nuances d'une palette sur les variables du thème : hexa, L, C, part du
 * plafond sRGB, et vrai quand la nuance porte la référence exacte.
 */
export function nuancesDe(recette, palette, profil, mode) {
  const rampe = rampesDe(recette, palette)[profil]?.[mode];
  if (!rampe) return null;
  const ancrage = ancrageDe(recette, palette);
  const table = tableDuMode(recette, mode);
  const lues = {};
  for (const variable of VARIABLES) {
    const rang = recette.crans.indexOf(table[variable]);
    if (rang < 0) continue;
    const cran = rampe[rang];
    const maximum = plafond(cran.L, cran.H, recette.gamut);
    lues[variable] = {
      cran: table[variable],
      hexa: cran.hexa,
      L: cran.L,
      C: cran.C,
      part: maximum > 0 ? Math.min(1, cran.C / maximum) : 0,
      reference: ancrage.profil === profil && ancrage.rangs[mode] === rang,
    };
  }
  return lues;
}

/** Les deux contrastes des emplois qui se lisent dans un composant : texte sur fond teinté, texte des boutons sur plein. */
export function contrastesDe(recette, nuances, mode) {
  const texte = lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[recette.texteDesBoutons[mode]]);
  return {
    surface: contraste(lireHexa(nuances['surface/foreground'].hexa), lireHexa(nuances['surface/default'].hexa)),
    solid: contraste(texte, lireHexa(nuances['solid/default'].hexa)),
  };
}

/** Les promesses manquées d'une palette, par clé lisible, et l'ordre de ses nuances. */
export function etatDe(recette, palette) {
  const nom = (designation) => (designation.nature === 'cran' ? designation.cran : designation.nature);
  const manquees = verifierPromesses(recette, palette)
    .filter((promesse) => promesse.verdict === 'manquee')
    .map((promesse) => `${promesse.mode}/${promesse.profil} ${nom(promesse.premier)} sur ${nom(promesse.second)} ${promesse.contraste.toFixed(2)}:1`);
  return { manquees: manquees.map((texte) => texte.replace(/ [\d.]+:1$/, '')), details: manquees, ordre: ordreTenu(recette, palette) };
}

/**
 * L'étendue min-max d'une grandeur sur le groupe, avec et sans les nuances
 * qui portent une référence, et le nombre de valeurs de chacune.
 */
export function etendue(valeurs) {
  const toutes = valeurs.map(({ v }) => v);
  const libres = valeurs.filter(({ reference }) => !reference).map(({ v }) => v);
  const ecart = (liste) => (liste.length < 2 ? null : Math.max(...liste) - Math.min(...liste));
  return { toutes: ecart(toutes), libres: ecart(libres), n: libres.length };
}

export const f3 = (x) => (x === null ? '  —  ' : x.toFixed(3));
