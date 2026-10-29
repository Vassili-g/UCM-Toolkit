/**
 * Le jugement des promesses du thème sur des rampes données : les garanties
 * G1 à G9 de `@ucm-kit/core/emplois`, par mode et par intensité ([VER-03] à
 * [VER-07], section 11.2 de la spécification). Le module ne calcule aucune
 * rampe : `promesses.ts` lui passe celles de `rampesDe`, et `palette.ts`, qui
 * ne peut pas lire `promesses.ts`, celles d'une chaîne candidate.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  GARANTIES,
  TABLE_DES_DOSSIERS,
  atteintLeSeuil,
  contraste,
  garantieJugeable,
  sensDuTheme,
  type Garantie,
  type SensDuTheme,
  type VariableDePalette,
} from '@ucm-kit/core/emplois';

import { lireHexa, lineaireVersRgb8, oklchVersLineaire, rgb8VersOklch, type Rgb8 } from './conversions';
import { plafond } from './plafond';
import { MODES, rampeDe, type Intensite, type Mode, type Rampes } from './rampe';
import type { Recette, Seuils } from './recette';

/**
 * Ce qu'un membre désigne dans la rampe d'un profil et d'un mode : un cran,
 * un fond extérieur à la palette (la page ou la carte), ou le blanc ou le noir
 * purs du texte des boutons.
 */
export type Designation =
  | { readonly nature: 'cran'; readonly cran: number; readonly couleur: Rgb8 }
  | { readonly nature: 'fond'; readonly fond: 'page' | 'carte'; readonly couleur: Rgb8 }
  | { readonly nature: 'texteDesBoutons'; readonly couleur: Rgb8 };

export type Verdict = 'tenue' | 'manquee';

export interface Promesse {
  readonly garantie: Garantie;
  readonly mode: Mode;
  /** L'intensité jugée : `soft`, `vivid` ou `unique` ([ENT-14]). */
  readonly profil: Intensite;
  readonly premier: Designation;
  readonly second: Designation;
  readonly seuil: number;
  readonly contraste: number;
  readonly verdict: Verdict;
}

/** Tout ce qu'un jugement lit : la recette, les rampes, et le fond de la page et la carte de chaque mode. */
interface Contexte {
  readonly recette: Recette;
  readonly rampes: Rampes;
  readonly fonds: { readonly [M in Mode]: Rgb8 };
  readonly cartes: { readonly [M in Mode]: Rgb8 };
}

/**
 * La couleur de la carte, le fond qu'une surface élevée pose sur la page
 * ([MOT-37]). Aucun réglage ne la porte : elle se déduit du fond de la page.
 * Light : le blanc. Dark : la teinte et la chroma du fond, à la clarté du rang
 * qui suit, sur la courbe Dark, celui dont la clarté est la plus proche de la
 * sienne ; le dernier rang n'a pas de suivant et se garde. La chroma se réduit
 * jusqu'à entrer dans le gamut, puis la couleur s'arrondit à 8 bits.
 */
export function couleurDeLaCarte(recette: Recette, mode: Mode): Rgb8 {
  if (mode === 'light') return [255, 255, 255];
  const page = lireHexa(recette.fonds.dark);
  if (!page) throw new Error(`Fond illisible : ${recette.fonds.dark}. La recette n'a pas été validée.`);
  const fond = rgb8VersOklch(page);
  const courbe = recette.courbes.dark;
  let proche = 0;
  courbe.forEach((clarte, rang) => {
    if (Math.abs(clarte - fond.L) < Math.abs(courbe[proche] - fond.L)) proche = rang;
  });
  const L = courbe[Math.min(proche + 1, courbe.length - 1)];
  const C = Math.min(fond.C, plafond(L, fond.H, recette.gamut));
  return lineaireVersRgb8(oklchVersLineaire({ L, C, H: fond.H }));
}

/**
 * Un membre de garantie qui vise une variable de palette. `solid/foreground`
 * vaut le texte des boutons du mode, jamais un cran de la rampe. Le cran visé
 * est présent : `garantieJugeable` l'a vérifié avant le jugement.
 */
function designer(variable: VariableDePalette, mode: Mode, sens: SensDuTheme, profil: Intensite, contexte: Contexte): Designation {
  const cible = TABLE_DES_DOSSIERS[mode][sens][variable];
  if (cible === 'texteDesBoutons') {
    return { nature: 'texteDesBoutons', couleur: lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[contexte.recette.texteDesBoutons[mode]])! };
  }
  const rang = contexte.recette.crans.indexOf(cible);
  if (rang < 0) throw new Error(`Cran ${cible} absent de la liste. La recette n'a pas été validée.`);
  return { nature: 'cran', cran: cible, couleur: rampeDe(contexte.rampes, profil)[mode][rang].couleur };
}

const valeurDuSeuil = (garantie: Garantie, seuils: Seuils): number => seuils[garantie.seuil];

function juger(
  garantie: Garantie,
  premier: Designation,
  second: Designation,
  mode: Mode,
  profil: Intensite,
  contexte: Contexte,
): Promesse {
  const seuil = valeurDuSeuil(garantie, contexte.recette.seuils);
  const valeur = contraste(premier.couleur, second.couleur);
  return {
    garantie,
    mode,
    profil,
    premier,
    second,
    seuil,
    contraste: valeur,
    verdict: atteintLeSeuil(valeur, seuil) ? 'tenue' : 'manquee',
  };
}

function contexteDe(recette: Recette, rampes: Rampes): Contexte {
  const fond = (hexa: string): Rgb8 => {
    const couleur = lireHexa(hexa);
    if (!couleur) throw new Error(`Fond illisible : ${hexa}. La recette n'a pas été validée.`);
    return couleur;
  };
  return {
    recette,
    rampes,
    fonds: { light: fond(recette.fonds.light), dark: fond(recette.fonds.dark) },
    cartes: { light: couleurDeLaCarte(recette, 'light'), dark: couleurDeLaCarte(recette, 'dark') },
  };
}

/** Les promesses d'une garantie dans un mode et une intensité, une par fond, dans l'ordre des fonds de la garantie. */
function promessesDe(garantie: Garantie, mode: Mode, sens: SensDuTheme, profil: Intensite, contexte: Contexte): Promesse[] {
  const premier = designer(garantie.premier.variable, mode, sens, profil, contexte);
  return garantie.fonds.flatMap((fond) => {
    const second: Designation = 'fondDeLaPage' in fond
      ? { nature: 'fond', fond: 'page', couleur: contexte.fonds[mode] }
      : 'fondDeLaCarte' in fond
        ? { nature: 'fond', fond: 'carte', couleur: contexte.cartes[mode] }
        : designer(fond.variable, mode, sens, profil, contexte);
    return [juger(garantie, premier, second, mode, profil, contexte)];
  });
}

/** Le mode et l'intensité à juger seuls ; absent, tout se juge. */
export interface Lieu {
  readonly mode: Mode;
  readonly intensite: Intensite;
}

/**
 * Les promesses de rampes données, rangées par mode, puis par intensité, puis
 * dans l'ordre des garanties G1 à G9 et de leurs fonds. Une garantie dont un
 * cran manque à la liste ne se juge pas. `seulement` ne juge que ce mode et
 * cette intensité, dont les rampes suffisent alors.
 */
export function jugerLesRampes(recette: Recette, intensites: readonly Intensite[], rampes: Rampes, seulement?: Lieu): Promesse[] {
  const contexte = contexteDe(recette, rampes);
  return MODES.flatMap((mode) => {
    if (seulement && seulement.mode !== mode) return [];
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    const garanties = GARANTIES.filter((garantie) => garantieJugeable(garantie, recette.crans, mode, sens));
    return intensites.flatMap((profil) => (seulement && seulement.intensite !== profil
      ? []
      : garanties.flatMap((garantie) => promessesDe(garantie, mode, sens, profil, contexte))));
  });
}

/**
 * La clé d'une promesse, qui la retrouve d'une palette candidate à l'autre : une
 * garantie compte une promesse par fond, et la page n'est pas la carte ([VER-21]).
 */
export function cleDeLaPromesse(promesse: Promesse): string {
  const { second } = promesse;
  const fond = second.nature === 'cran' ? second.cran : second.nature === 'fond' ? second.fond : second.nature;
  return `${promesse.mode}/${promesse.profil}/${promesse.garantie.numero}/${fond}`;
}
