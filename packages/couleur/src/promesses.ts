/**
 * Les promesses des emplois : les dix-neuf paires de `@ucm-kit/core/emplois`,
 * jugées par palette, par mode et par intensité présente ([VER-03] à
 * [VER-07], section 11.2 de la spécification). Les paires d'un emploi
 * facultatif ne se jugent que dans une liste qui porte son cran.
 */
import {
  PAIRES,
  TABLE_DES_EMPLOIS,
  atteintLeSeuil,
  contraste,
  paireJugeable,
  type MembrePaire,
  type Paire,
} from '@ucm-kit/core/emplois';

import { lireHexa, type Rgb8 } from './conversions';
import { intensitesDe, rampesDe } from './palette';
import { MODES, rampeDe, type Intensite, type Mode, type Rampes } from './rampe';
import type { Palette, Recette, Seuils } from './recette';

/** Ce qu'un membre désigne dans la rampe d'un profil et d'un mode. */
export type Designation =
  | { readonly nature: 'cran'; readonly cran: number; readonly couleur: Rgb8 }
  | { readonly nature: 'fond'; readonly couleur: Rgb8 };

export type Verdict = 'tenue' | 'manquee';

export interface Promesse {
  readonly paire: Paire;
  readonly mode: Mode;
  /** L'intensité jugée : `soft`, `vivid` ou `unique` ([ENT-14]). */
  readonly profil: Intensite;
  readonly premier: Designation;
  readonly second: Designation;
  readonly seuil: number;
  readonly contraste: number;
  readonly verdict: Verdict;
}

/** Tout ce qu'un jugement lit : la recette, les rampes et les fonds. */
interface Contexte {
  readonly recette: Recette;
  readonly rampes: Rampes;
  readonly fonds: { readonly [M in Mode]: Rgb8 };
}

/**
 * Un cran avancé reste dans la rampe : `[REC-05]` exige chaque cran de
 * `CRANS_DES_EMPLOIS`, qui compte trois crans après 700.
 */
function designer(membre: MembrePaire, mode: Mode, profil: Intensite, contexte: Contexte): Designation {
  if ('fond' in membre) return { nature: 'fond', couleur: contexte.fonds[mode] };
  const cible = TABLE_DES_EMPLOIS[membre.emploi];
  if (cible === 'fond') return { nature: 'fond', couleur: contexte.fonds[mode] };
  const crans = contexte.recette.crans;
  const depart = crans.indexOf(cible);
  const rang = depart + membre.decalage;
  if (depart < 0 || rang >= crans.length) {
    throw new Error(`Cran ${cible} absent ou sans cran suivant. La recette n'a pas été validée.`);
  }
  return { nature: 'cran', cran: crans[rang], couleur: rampeDe(contexte.rampes, profil)[mode][rang].couleur };
}

const valeurDuSeuil = (paire: Paire, seuils: Seuils): number => seuils[paire.seuil];

function juger(paire: Paire, mode: Mode, profil: Intensite, contexte: Contexte): Promesse {
  const premier = designer(paire.premier, mode, profil, contexte);
  const second = designer(paire.second, mode, profil, contexte);
  const seuil = valeurDuSeuil(paire, contexte.recette.seuils);
  const valeur = contraste(premier.couleur, second.couleur);
  return {
    paire,
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

/**
 * Les promesses d'une palette : dix-neuf par mode et par intensité,
 * dix-sept dans une liste sans 50, soit soixante-seize pour deux intensités
 * et trente-huit pour une, rangées par mode, puis par intensité, puis dans
 * l'ordre des paires.
 */
export function verifierPromesses(recette: Recette, palette: Palette): Promesse[] {
  // Une palette libre sort du modèle : elle n'a ni emplois ni promesses (W6).
  if (palette.crans !== undefined) return [];
  const contexte = contexteDe(recette, palette);
  const paires = PAIRES.filter((paire) => paireJugeable(paire, recette.crans));
  return MODES.flatMap((mode) =>
    intensitesDe(palette).flatMap((profil) => paires.map((paire) => juger(paire, mode, profil, contexte))));
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
 * une paire de la table des emplois promet un contraste ([VER-04]).
 */
export function mesurerCran(couleur: Rgb8, fond: Rgb8, seuils: Seuils): MesureDeCran {
  const contreFond = contraste(couleur, fond);
  const seuilTenu = atteintLeSeuil(contreFond, seuils.texte)
    ? 'texte'
    : atteintLeSeuil(contreFond, seuils.nonTexte) ? 'nonTexte' : null;
  return { fond: contreFond, blanc: contraste(couleur, BLANC), noir: contraste(couleur, NOIR), seuilTenu };
}
