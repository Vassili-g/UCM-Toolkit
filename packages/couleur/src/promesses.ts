/**
 * Les promesses du thème : les garanties G1 à G7 de `@ucm-kit/core/emplois`,
 * jugées par palette, par mode et par intensité présente ([VER-03] à
 * [VER-07], section 11.2 de la spécification). Chaque garantie se juge dans
 * la table du sens du thème (`sensDuTheme`), contre les fonds de la palette
 * et, hors de la palette, contre la page (le réglage « Fond » du thème) et la
 * carte, qui s'en déduit ([MOT-37]). Une garantie dont un cran manque à la
 * liste ne se juge pas.
 */
import { atteintLeSeuil, contraste } from '@ucm-kit/core/emplois';

import type { Rgb8 } from './conversions';
import { jugerLesRampes, type Promesse } from './jugement';
import { intensitesDe, rampesDe } from './palette';
import type { Palette, Recette, Seuils } from './recette';

export { cleDeLaPromesse, couleurDeLaCarte, jugerLesRampes, type Designation, type Lieu, type Promesse, type Verdict } from './jugement';

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
  return jugerLesRampes(recette, intensitesDe(palette), rampesDe(recette, palette));
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
