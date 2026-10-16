/**
 * Les valeurs par défaut des trois réglettes de la carte « Réglage global »
 * et ce qui les écarte d'elles ([UI-38]). Sans DOM : la carte, son résumé et
 * ses tests lisent les mêmes fonctions.
 *
 * Teinte et luminosité valent 0 par défaut. La saturation d'un profil vaut sa
 * part commune de la Configuration ; celle du profil qui porte la référence
 * (ou d'une palette à une intensité) vaut la saturation de la référence
 * rendue à son départ : c'est la valeur que « Par défaut » range.
 */
import {
  aUneIntensite,
  partDeLaReference,
  partsDesProfils,
  PROFILS,
  BORNES_DES_REGLAGES,
  type Palette,
  type Profil,
  type Recette,
} from 'ucm-couleur';

import { retablirLaSaturation, valeursDe } from './edition';

export type Grandeur = 'teinte' | 'saturation' | 'luminosite';

export const GRANDEURS: readonly Grandeur[] = ['teinte', 'saturation', 'luminosite'];

/** Les bornes, le pas au clavier et le pas avec Maj de chaque réglette (maquette Z10.4, question 2). */
export const CURSEURS: Record<Grandeur, { readonly min: number; readonly max: number; readonly pas: number; readonly grandPas: number }> = {
  teinte: { min: -BORNES_DES_REGLAGES.teinte, max: BORNES_DES_REGLAGES.teinte, pas: 1, grandPas: 5 },
  saturation: { min: 0, max: 1, pas: 0.01, grandPas: 0.05 },
  luminosite: { min: BORNES_DES_REGLAGES.clarte.bas, max: BORNES_DES_REGLAGES.clarte.haut, pas: 0.005, grandPas: 0.02 },
};

/** L'écart à la valeur par défaut, en points de la course d'une piste, au-delà duquel une valeur compte comme modifiée. */
export const ECART_DE_COURSE_MODIFIEE = 0.5;

export type ValeursDuProfil = Record<Grandeur, number>;

/** Un réglage modifié : sa grandeur, et son profil (`null` pour une palette à une intensité). */
export interface ReglageModifie {
  readonly grandeur: Grandeur;
  readonly profil: Profil | null;
}

/** La clé des réglages rangés : `vivid` pour une palette à une intensité, comme sa dérive. */
const cleDuProfil = (palette: Palette, profil: Profil): Profil => (aUneIntensite(palette) ? 'vivid' : profil);

/** Les valeurs que les trois réglettes montrent pour chaque profil. */
export function valeursDesProfils(recette: Recette, palette: Palette): Record<Profil, ValeursDuProfil> {
  const { teinte, clarte } = valeursDe(palette);
  const parts = aUneIntensite(palette) ? null : partsDesProfils(recette, palette);
  const unique = parts ? 0 : partDeLaReference(recette, palette);
  const de = (profil: Profil): ValeursDuProfil => {
    const cle = cleDuProfil(palette, profil);
    return { teinte: teinte[cle] ?? 0, saturation: parts ? parts[cle] : unique, luminosite: clarte[cle] ?? 0 };
  };
  return { soft: de('soft'), vivid: de('vivid') };
}

/** Les valeurs par défaut de chaque profil. */
export function valeursParDefaut(recette: Recette, palette: Palette): Record<Profil, ValeursDuProfil> {
  const communes = retablirLaSaturation(recette, palette, 'deux');
  const parts = aUneIntensite(palette) ? null : partsDesProfils(recette, communes);
  const unique = parts ? 0 : partDeLaReference(recette, communes);
  const de = (profil: Profil): ValeursDuProfil => ({ teinte: 0, saturation: parts ? parts[profil] : unique, luminosite: 0 });
  return { soft: de('soft'), vivid: de('vivid') };
}

/** La valeur s'écarte de son défaut de plus de 0,5 point de la course de sa piste. */
export function estModifiee(grandeur: Grandeur, valeur: number, defaut: number): boolean {
  const { min, max } = CURSEURS[grandeur];
  return (Math.abs(valeur - defaut) / (max - min)) * 100 > ECART_DE_COURSE_MODIFIEE;
}

/** Les réglages modifiés d'une palette, dans l'ordre teinte, saturation, luminosité, puis Soft avant Vivid. */
export function reglagesModifies(recette: Recette, palette: Palette): ReglageModifie[] {
  const valeurs = valeursDesProfils(recette, palette);
  const defauts = valeursParDefaut(recette, palette);
  const une = aUneIntensite(palette);
  const profils: readonly Profil[] = une ? ['vivid'] : PROFILS;
  return GRANDEURS.flatMap((grandeur) => profils
    .filter((profil) => estModifiee(grandeur, valeurs[profil][grandeur], defauts[profil][grandeur]))
    .map((profil) => ({ grandeur, profil: une ? null : profil })));
}
