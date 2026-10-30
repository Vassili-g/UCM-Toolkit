/**
 * Niveaux WCAG, distance Oklab et part de chroma, mesurés sur la couleur à
 * 8 bits ([MOT-22] à [MOT-24]), et leur écriture décimale à virgule. Le
 * contraste, sa comparaison à un seuil et son écriture (`ecrireContraste`)
 * viennent de `@ucm-kit/core/emplois`.
 */
import { contrasteTronque } from '@ucm-kit/core/emplois';

import {
  CHROMA_SANS_TEINTE,
  lineaireVersOklab,
  rgb8VersLineaire,
  rgb8VersOklch,
  type Rgb8,
} from './conversions';
import { plafond, type Gamut } from './plafond';

export { niveauxWcag, type NiveauDeTexte, type NiveauxWcag } from '@ucm-kit/core/referentiel';

/** Remplace le point décimal par une virgule, sans `Intl` ni `toLocaleString`. */
function avecVirgule(ecriture: string): string {
  return ecriture.replace('.', ',');
}

/**
 * Tronque à `decimales` chiffres, sur l'écriture à dix décimales du kit, et
 * écrit la virgule : 4,499 donne `4,49` ([MOT-22]).
 */
export function ecrireTronque(x: number, decimales: number): string {
  return avecVirgule(contrasteTronque(x, decimales).toFixed(decimales));
}

/** Le contraste affiché, deux décimales tronquées : le nom que le moteur garde pour `ecrireContraste` du kit. */
export { ecrireContraste } from '@ucm-kit/core/emplois';

/** Arrondit à `decimales` chiffres et écrit la virgule : une clarté, une chroma, une teinte. */
export function ecrireArrondi(x: number, decimales: number): string {
  return avecVirgule(x.toFixed(decimales));
}

/** La distance euclidienne en Oklab entre deux couleurs à 8 bits, notée ΔEok ([MOT-23]). */
export function distanceOk(a: Rgb8, b: Rgb8): number {
  const [La, aa, ba] = lineaireVersOklab(rgb8VersLineaire(a));
  const [Lb, ab, bb] = lineaireVersOklab(rgb8VersLineaire(b));
  return Math.hypot(La - Lb, aa - ab, ba - bb);
}

/**
 * La part de chroma d'une couleur : sa chroma rapportée au plafond du gamut à
 * sa clarté et sa teinte, bornée à `[0, 1]` ([MOT-24]). Une couleur sans teinte
 * ([MOT-04]) a une part nulle : le blanc relu porte une chroma de 4e-8 contre
 * un plafond de 2e-7, et le rapport ne dirait rien.
 */
export function partDeChroma(couleur: Rgb8, gamut: Gamut = 'srgb'): number {
  const lu = rgb8VersOklch(couleur);
  if (lu.C < CHROMA_SANS_TEINTE) return 0;
  const maximum = plafond(lu.L, lu.H, gamut);
  if (maximum <= 0) return 1;
  return Math.min(1, Math.max(0, lu.C / maximum));
}
