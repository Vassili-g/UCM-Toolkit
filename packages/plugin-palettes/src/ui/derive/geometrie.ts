/**
 * La géométrie du graphe du Color shift ([DER-01], [ARC-08]) : où se place un
 * cran, le pivot et une valeur, et la valeur qu'une ordonnée désigne. Pure,
 * sans DOM.
 *
 * L'abscisse est le rang du cran de la courbe claire : des positions
 * régulières, une par nuance, du bout clair à gauche au bout sombre à droite.
 * Le graphe et les rampes s'alignent sur ces colonnes. L'ordonnée est le
 * décalage de la grandeur choisie, dans son unité, sur une échelle que
 * `echelleDe` choisit parmi des paliers lisibles.
 */
import {
  BORNES_DU_COLOR_SHIFT,
  arrondir,
  decalageRange,
  ecartAngulaire,
  poidsA,
  teinteA,
  type Bouts,
  type Derive,
  type GrandeurDuColorShift,
  type Oklch,
} from 'ucm-couleur';

/** Le cadre du graphe, en pixels : sa taille et les marges des axes. */
export interface Cadre {
  readonly largeur: number;
  readonly hauteur: number;
  readonly gauche: number;
  readonly droite: number;
  readonly haut: number;
  readonly bas: number;
}

/**
 * Les paliers de l'échelle de chaque grandeur, de part et d'autre de 0
 * ([DER-01]) : ±30° à ±90°, ±25 % à ±100 %, ±0,05 à ±0,15.
 */
export const ECHELLES: { readonly [G in GrandeurDuColorShift]: readonly number[] } = {
  teinte: [30, 45, 60, BORNES_DU_COLOR_SHIFT.teinte],
  saturation: [0.25, 0.5, BORNES_DU_COLOR_SHIFT.saturation],
  clarte: [0.05, 0.1, BORNES_DU_COLOR_SHIFT.clarte],
};

/**
 * L'échelle qui montre ces valeurs : le plus petit palier qui les dépasse. Une
 * valeur posée au bord d'un palier l'élargit au suivant, pour qu'un glisser
 * suivant puisse aller plus loin. Au-delà, le dernier palier.
 */
export function echelleDe(grandeur: GrandeurDuColorShift, valeurs: readonly number[]): number {
  const paliers = ECHELLES[grandeur];
  const plusGrand = Math.max(0, ...valeurs.map(Math.abs));
  return paliers.find((echelle) => echelle > plusGrand + 1e-9) ?? paliers[paliers.length - 1];
}

/** L'écart entre deux repères de l'ordonnée : 15° pour la teinte, la moitié d'un palier de 0,05 ou de 25 %, sinon un quart ou un tiers. */
function pasDesReperes(grandeur: GrandeurDuColorShift, echelle: number): number {
  if (grandeur === 'teinte') return 15;
  if (grandeur === 'saturation') return echelle <= 0.25 ? 0.125 : 0.25;
  return echelle <= 0.05 ? 0.025 : 0.05;
}

/** Les repères de l'ordonnée dans l'échelle, et ceux qui portent une graduation ([DER-01]). */
export function reperes(grandeur: GrandeurDuColorShift, echelle: number): { readonly valeur: number; readonly gradue: boolean }[] {
  const pas = pasDesReperes(grandeur, echelle);
  const nombre = Math.round((2 * echelle) / pas) + 1;
  // Au-delà de sept repères, une graduation sur deux : ±90° se lit de 30° en 30°.
  const saut = nombre > 7 ? 2 : 1;
  return Array.from({ length: nombre }, (_, rang) => ({ valeur: arrondir(-echelle + rang * pas, 3) + 0, gradue: (rang - (nombre - 1) / 2) % saut === 0 }));
}

/** La largeur d'une colonne, pour `nombre` crans. */
export function largeurDeColonne(cadre: Cadre, nombre: number): number {
  return (cadre.largeur - cadre.gauche - cadre.droite) / nombre;
}

/** L'abscisse du centre d'un rang, fractionnaire pour le pivot. */
export function abscisse(rang: number, cadre: Cadre, nombre: number): number {
  return cadre.gauche + (rang + 0.5) * largeurDeColonne(cadre, nombre);
}

/** L'ordonnée d'une valeur, de +`echelle` en haut à -`echelle` en bas. */
export function ordonnee(valeur: number, cadre: Cadre, echelle: number): number {
  const utile = cadre.hauteur - cadre.haut - cadre.bas;
  return cadre.haut + ((echelle - valeur) / (2 * echelle)) * utile;
}

/** La valeur qu'une ordonnée désigne, bornée par `echelle`, l'inverse d'`ordonnee`. */
export function valeurDe(y: number, cadre: Cadre, echelle: number): number {
  const utile = cadre.hauteur - cadre.haut - cadre.bas;
  const valeur = echelle - ((y - cadre.haut) / utile) * 2 * echelle;
  return Math.max(-echelle, Math.min(echelle, valeur));
}

/**
 * La valeur d'un glisser ([DER-07]) : au pas, ou au grand pas avec Maj, bornée
 * par `echelle`, figée pendant le geste. Le `+ 0` écrit zéro sans signe, un
 * `-0` s'afficherait « −0 ».
 */
export function valeurDuGlisser(y: number, cadre: Cadre, pas: number, echelle: number): number {
  const decimales = Math.max(0, Math.ceil(-Math.log10(pas) - 1e-9));
  return arrondir(Math.round(valeurDe(y, cadre, echelle) / pas) * pas, decimales) + 0;
}

/**
 * Le rang, fractionnaire, où le pivot se place : entre les deux crans de la
 * courbe claire qui encadrent sa clarté, par interpolation linéaire ([DER-01]).
 * Une clarté hors de la courbe rend `null` : la référence est hors de la rampe
 * ([DER-14]).
 */
export function rangDuPivot(clarte: number, courbeClaire: readonly number[]): number | null {
  for (let rang = 0; rang < courbeClaire.length - 1; rang += 1) {
    const haut = courbeClaire[rang];
    const bas = courbeClaire[rang + 1];
    if (clarte <= haut && clarte >= bas) return rang + (haut - clarte) / (haut - bas);
  }
  return null;
}

/**
 * Le décalage qu'un cran de clarté `clarte` reçoit ([MOT-30]) : l'écart
 * signé entre sa teinte et celle du pivot, ou la fraction de la saturation et
 * de la luminosité du bout qu'il regarde.
 */
export function decalageDuCran(grandeur: GrandeurDuColorShift, clarte: number, reference: Oklch, derive: Derive, bouts: Bouts): number {
  if (grandeur === 'teinte') return ecartAngulaire(reference.H, teinteA(clarte, reference, derive, bouts));
  const { bout, poids } = poidsA(clarte, reference, bouts);
  return decalageRange(derive, grandeur)[bout] * poids;
}

/** Un sommet de la ligne brisée : un rang, fractionnaire au pivot, et une valeur. */
export interface Sommet {
  readonly rang: number;
  readonly valeur: number;
}

/**
 * La ligne brisée d'un profil : un sommet par cran de la courbe claire. Le
 * profil porteur passe `rangAncre`, le rang clair de sa référence exacte
 * ([MOT-17]) : ce cran est la référence, et son décalage vaut 0 ([DER-02]).
 * L'autre profil passe par le pivot à 0, entre deux crans, quand la
 * référence est dans la rampe.
 */
export function ligneBrisee(
  grandeur: GrandeurDuColorShift,
  courbeClaire: readonly number[],
  reference: Oklch,
  derive: Derive,
  bouts: Bouts,
  rangAncre: number | null = null,
): Sommet[] {
  const sommets: Sommet[] = courbeClaire.map((clarte, rang) => ({
    rang,
    valeur: rang === rangAncre ? 0 : decalageDuCran(grandeur, clarte, reference, derive, bouts),
  }));
  if (rangAncre !== null) return sommets;
  const pivot = rangDuPivot(reference.L, courbeClaire);
  if (pivot !== null) sommets.push({ rang: pivot, valeur: 0 });
  return sommets.sort((a, b) => a.rang - b.rang);
}
