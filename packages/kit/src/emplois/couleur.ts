/**
 * Une couleur que Figma range en composantes flottantes de 0 à 1, ramenée à
 * ses octets et à son hexadécimal. Figma lit une composante au-delà de 1 comme
 * saturée : 1,002 vaut `FF`, et jamais `100`. Plugins, lecteurs et contrôles
 * écrivent une couleur de Figma par ces fonctions seules.
 */
import type { Rgb8 } from './contraste.js';

/** Une composante de Figma en octet : arrondie, bornée à 0..255. */
export function versOctet(composante: number): number {
  return Math.min(255, Math.max(0, Math.round(composante * 255)));
}

/** Les trois canaux d'une couleur de Figma, en octets de 0 à 255. L'alpha n'y entre pas. */
export function versRgb8(couleur: { readonly r: number; readonly g: number; readonly b: number }): Rgb8 {
  return [versOctet(couleur.r), versOctet(couleur.g), versOctet(couleur.b)];
}

const deuxChiffres = (octet: number): string => octet.toString(16).padStart(2, '0').toUpperCase();

/**
 * La couleur en `#RRGGBB`, majuscules. Avec `alpha`, une couleur qui n'est pas
 * opaque porte son alpha en deux chiffres de plus (`#RRGGBBAA`) ; une alpha
 * absente vaut 1. Sans `alpha`, l'alpha est ignoré.
 */
export function hexaDeFigma(
  couleur: { readonly r: number; readonly g: number; readonly b: number; readonly a?: number },
  options: { readonly alpha?: boolean } = {},
): string {
  const [rouge, vert, bleu] = versRgb8(couleur);
  const hexa = `#${deuxChiffres(rouge)}${deuxChiffres(vert)}${deuxChiffres(bleu)}`;
  if (!options.alpha) return hexa;
  const alpha = versOctet(couleur.a ?? 1);
  return alpha === 255 ? hexa : `${hexa}${deuxChiffres(alpha)}`;
}
