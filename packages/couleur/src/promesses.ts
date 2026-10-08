/**
 * Les promesses du thème : les garanties G1 à G7 de `@ucm-kit/core/emplois`,
 * jugées par palette, par mode et par intensité présente ([VER-03] à
 * [VER-07], section 11.2 de la spécification). Chaque garantie se juge dans
 * la table du sens du thème (`sensDuTheme`), contre le seul fond de la page,
 * le réglage « Fond » du thème. Une garantie dont un cran manque à la liste
 * ne se juge pas.
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

import { lireHexa, type Rgb8 } from './conversions';
import { intensitesDe, rampesDe } from './palette';
import { MODES, rampeDe, type Intensite, type Mode, type Rampes } from './rampe';
import type { Palette, Recette, Seuils } from './recette';

/**
 * Ce qu'un membre désigne dans la rampe d'un profil et d'un mode : un cran,
 * le fond de la page, ou le blanc ou le noir purs du texte des boutons.
 */
export type Designation =
  | { readonly nature: 'cran'; readonly cran: number; readonly couleur: Rgb8 }
  | { readonly nature: 'fond'; readonly couleur: Rgb8 }
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

/** Tout ce qu'un jugement lit : la recette, les rampes et le fond de la page de chaque mode. */
interface Contexte {
  readonly recette: Recette;
  readonly rampes: Rampes;
  readonly fonds: { readonly [M in Mode]: Rgb8 };
}

/**
 * Un membre de garantie qui vise une variable de palette. `solid/foreground`
 * vaut le texte des boutons du mode, jamais un cran de la rampe. Le cran visé
 * est présent : `garantieJugeable` l'a vérifié avant le jugement.
 */
function designer(variable: VariableDePalette, mode: Mode, sens: SensDuTheme, profil: Intensite, contexte: Contexte): Designation {
  const cible = TABLE_DES_DOSSIERS[sens][variable];
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

function contexteDe(recette: Recette, palette: Palette): Contexte {
  const fond = (hexa: string): Rgb8 => {
    const couleur = lireHexa(hexa);
    if (!couleur) throw new Error(`Fond illisible : ${hexa}. La recette n'a pas été validée.`);
    return couleur;
  };
  return {
    recette,
    rampes: rampesDe(recette, palette),
    fonds: { light: fond(recette.fonds.light), dark: fond(recette.fonds.dark) },
  };
}

/** Les promesses d'une garantie dans un mode et une intensité, une par fond, dans l'ordre des fonds de la garantie. */
function promessesDe(garantie: Garantie, mode: Mode, sens: SensDuTheme, profil: Intensite, contexte: Contexte): Promesse[] {
  const premier = designer(garantie.premier.variable, mode, sens, profil, contexte);
  return garantie.fonds.flatMap((fond) => {
    const second: Designation = 'fondDeLaPage' in fond
      ? { nature: 'fond', couleur: contexte.fonds[mode] }
      : designer(fond.variable, mode, sens, profil, contexte);
    return [juger(garantie, premier, second, mode, profil, contexte)];
  });
}

/**
 * Les promesses d'une palette, rangées par mode, puis par intensité, puis
 * dans l'ordre des garanties G1 à G7 et de leurs fonds : seize par mode et
 * par intensité, soit soixante-quatre pour deux intensités et trente-deux
 * pour une, quand la liste porte tous les crans requis. Une garantie dont un
 * cran manque ne se juge pas.
 */
export function verifierPromesses(recette: Recette, palette: Palette): Promesse[] {
  // Une palette libre sort du modèle : elle n'a ni variables de thème ni promesses (W6).
  if (palette.crans !== undefined) return [];
  const contexte = contexteDe(recette, palette);
  return MODES.flatMap((mode) => {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    const garanties = GARANTIES.filter((garantie) => garantieJugeable(garantie, recette.crans, sens));
    return intensitesDe(palette).flatMap((profil) =>
      garanties.flatMap((garantie) => promessesDe(garantie, mode, sens, profil, contexte)));
  });
}

/** Le nombre de promesses manquées, qui fait le verdict de la palette ([VER-07]). */
export function compterManquees(promesses: readonly Promesse[]): number {
  return promesses.filter((promesse) => promesse.verdict === 'manquee').length;
}

/** Ce qu'un cran mesure : contraste contre le fond du mode, le blanc et le noir, et le seuil tenu ([VER-03]). */
export interface MesureDeCran {
  readonly fond: number;
  readonly blanc: number;
  readonly noir: number;
  /** Le seuil que le contraste contre le fond atteint, `null` sous `nonTexte`. */
  readonly seuilTenu: 'texte' | 'nonTexte' | null;
}

const BLANC: Rgb8 = [255, 255, 255];
const NOIR: Rgb8 = [0, 0, 0];

/**
 * Mesure un cran contre le fond de son mode. Un cran n'a pas de verdict : seule
 * une garantie du thème promet un contraste ([VER-04]).
 */
export function mesurerCran(couleur: Rgb8, fond: Rgb8, seuils: Seuils): MesureDeCran {
  const contreFond = contraste(couleur, fond);
  const seuilTenu = atteintLeSeuil(contreFond, seuils.texte)
    ? 'texte'
    : atteintLeSeuil(contreFond, seuils.nonTexte) ? 'nonTexte' : null;
  return { fond: contreFond, blanc: contraste(couleur, BLANC), noir: contraste(couleur, NOIR), seuilTenu };
}
