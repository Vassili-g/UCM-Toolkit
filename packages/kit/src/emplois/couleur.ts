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

/**
 * Le nombre de renvois d'alias qu'un juge du contraste suit : au-delà, la couleur n'est pas lue. C49, `ucm check`, le catalogue
 * d'Architect et l'aperçu de sa préparation s'arrêtent à la même profondeur. `@ucm-kit/core/controles` la republie.
 */
export const PROFONDEUR_D_ALIAS = 10;

/** Une couleur de Figma en composantes flottantes de 0 à 1, alpha comprise. */
export type Rgba = { r: number; g: number; b: number; a: number };

/** Au-dessus de ce seuil, une couche est opaque : la composer ne laisse rien voir du fond. */
export const OPAQUE = 1 - 1e-9;

/**
 * Une composante ou un alpha tient dans [0, 1] ; NaN n'y tient pas. Un juge du contraste refuse une couleur qui en sort au lieu de
 * la borner en silence : `versOctet` borne pour écrire une couleur, jamais pour la juger.
 */
export const composanteDansLeGamut = (composante: number): boolean => composante >= 0 && composante <= 1;

/** Les trois composantes et l'alpha (1 si absent) tiennent dans [0, 1]. */
export const couleurDansLeGamut = (couleur: { r: number; g: number; b: number; a?: number }): boolean =>
  composanteDansLeGamut(couleur.r) && composanteDansLeGamut(couleur.g) && composanteDansLeGamut(couleur.b) && composanteDansLeGamut(couleur.a ?? 1);

/** Compose des couches (de la plus haute à la plus basse) sur une base ; sans base, la dernière doit être opaque. */
export function composer(couches: Rgba[], base: Rgba | null): Rgba | null {
  let resultat = base;
  for (let i = couches.length - 1; i >= 0; i--) {
    const c = couches[i];
    if (!resultat) {
      if (c.a < OPAQUE) return null;
      resultat = { ...c, a: 1 };
      continue;
    }
    resultat = {
      r: c.r * c.a + resultat.r * (1 - c.a), g: c.g * c.a + resultat.g * (1 - c.a),
      b: c.b * c.a + resultat.b * (1 - c.a), a: 1,
    };
  }
  return resultat;
}
