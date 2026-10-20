/**
 * Les couleurs d'un document Display P3 ramenées en sRGB, pour le contraste et
 * la copie hexadécimale. La conversion est celle d'UCM Palettes (`p3VersRgb8`
 * de `ucm-couleur`) : elle arrondit à 8 bits et borne ce qui sort du gamut sRGB.
 *
 * Hors du noyau, qui n'importe pas `ucm-couleur` : `copie.ts` reçoit la
 * fonction `versSrgb` par ses options.
 */
import { p3VersRgb8, rgb8VersP3 } from 'ucm-couleur';

import type { Couleur, EspaceDuReleve } from './modele';

/** Une couleur en sRGB à 8 bits, et si la conversion a modifié ce que la couleur d'origine disait. */
export interface CouleurEnSrgb {
  readonly couleur: Couleur;
  readonly arrondi: boolean;
}

/** L'écart sous lequel deux canaux Display P3 se lisent comme égaux au retour de la conversion. */
const TOLERANCE_DU_RETOUR = 1e-9;

/**
 * La couleur en sRGB à 8 bits. En sRGB, elle reste telle quelle. En Display P3,
 * les canaux passent par `p3VersRgb8` ; `arrondi` vaut vrai quand la couleur
 * sortait du gamut sRGB, ou que sa conversion en P3 ne rend pas les canaux
 * d'origine. L'alpha est recopié.
 */
export function versSrgb(couleur: Couleur, espace: EspaceDuReleve): CouleurEnSrgb {
  if (espace !== 'display-p3') return { couleur, arrondi: false };
  const lue = p3VersRgb8([couleur.r, couleur.g, couleur.b]);
  const retour = rgb8VersP3(lue.couleur);
  const exact = [couleur.r, couleur.g, couleur.b].every((canal, rang) => Math.abs(canal - retour[rang]) <= TOLERANCE_DU_RETOUR);
  return {
    couleur: { r: lue.couleur[0] / 255, g: lue.couleur[1] / 255, b: lue.couleur[2] / 255, a: couleur.a },
    arrondi: lue.ramenee || !exact,
  };
}
