/**
 * Niveaux WCAG, distance Oklab et part de chroma, mesurés sur la couleur à
 * 8 bits ([MOT-22] à [MOT-24]), et leur écriture décimale à virgule. Le
 * contraste et sa comparaison à un seuil viennent de `@ucm-kit/core/emplois`.
 */
import { aDixDecimales, atteintLeSeuil } from '@ucm-kit/core/emplois';

import {
  CHROMA_SANS_TEINTE,
  lineaireVersOklab,
  rgb8VersLineaire,
  rgb8VersOklch,
  type Rgb8,
} from './conversions';
import { plafond, type Gamut } from './plafond';

/** Un niveau WCAG de contraste de texte, `null` quand le minimum AA n'est pas atteint. */
export type NiveauDeTexte = 'AAA' | 'AA' | null;

/** Les niveaux WCAG d'un contraste mesuré ([VER-13]). Aucun n'est enregistré : ils se déduisent de la mesure. */
export interface NiveauxWcag {
  /** Texte courant : AA à 4,5:1 (critère 1.4.3), AAA à 7:1 (critère 1.4.6). */
  readonly texte: NiveauDeTexte;
  /** Grand texte : AA à 3:1, AAA à 4,5:1. Un couple de couleurs ne dit pas la taille du texte. */
  readonly grandTexte: NiveauDeTexte;
  /** Éléments graphiques : le minimum 3:1 du critère 1.4.11, sans niveau AAA. */
  readonly graphique: boolean;
}

/**
 * Classe un contraste selon WCAG 2.2, par la même comparaison que le verdict
 * d'une promesse ([MOT-22]) : l'affichage et le niveau concordent.
 */
export function niveauxWcag(valeur: number): NiveauxWcag {
  const niveau = (aa: number, aaa: number): NiveauDeTexte =>
    (atteintLeSeuil(valeur, aaa) ? 'AAA' : atteintLeSeuil(valeur, aa) ? 'AA' : null);
  return { texte: niveau(4.5, 7), grandTexte: niveau(3, 4.5), graphique: atteintLeSeuil(valeur, 3) };
}

/** Remplace le point décimal par une virgule, sans `Intl` ni `toLocaleString`. */
function avecVirgule(ecriture: string): string {
  return ecriture.replace('.', ',');
}

/**
 * Tronque à `decimales` chiffres, sur l'écriture à dix décimales, et écrit la
 * virgule : 4,499 donne `4,49` ([MOT-22]).
 */
export function ecrireTronque(x: number, decimales: number): string {
  const [entier, fraction] = aDixDecimales(x).split('.');
  return decimales === 0 ? entier : avecVirgule(`${entier}.${fraction.slice(0, decimales)}`);
}

/** Un contraste tel que la planche et l'interface l'affichent : deux décimales tronquées. */
export function ecrireContraste(valeur: number): string {
  return ecrireTronque(valeur, 2);
}

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
