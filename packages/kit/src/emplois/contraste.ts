/**
 * Le contraste WCAG 2 d'une couleur à 8 bits, et la comparaison à un seuil
 * sur son écriture à dix décimales ([MOT-21], [MOT-22] de la spécification
 * d'UCM Palettes). UCM Palettes et `ucm check` jugent avec ces fonctions : un
 * même couple de couleurs rend le même verdict dans les deux outils.
 */

/** Trois canaux entiers de 0 à 255. */
export type Rgb8 = readonly [number, number, number];

/** Trois composantes réelles, sans borne : un vecteur linéaire. */
export type Triplet = readonly [number, number, number];

/** Fonction de transfert sRGB, de l'encodé vers le linéaire ([MOT-02]). */
export function decoder(encode: number): number {
  return encode <= 0.04045 ? encode / 12.92 : ((encode + 0.055) / 1.055) ** 2.4;
}

/** Les trois canaux d'une couleur à 8 bits, en sRGB linéaire. */
export function rgb8VersLineaire(couleur: Rgb8): Triplet {
  return [decoder(couleur[0] / 255), decoder(couleur[1] / 255), decoder(couleur[2] / 255)];
}

/** La luminance relative de WCAG 2, sur des composantes sRGB linéaires. */
export function luminanceLineaire(lineaire: Triplet): number {
  return 0.2126 * lineaire[0] + 0.7152 * lineaire[1] + 0.0722 * lineaire[2];
}

/** La luminance relative de WCAG 2 d'une couleur à 8 bits ([MOT-21]). */
export function luminanceRelative(couleur: Rgb8): number {
  return luminanceLineaire(rgb8VersLineaire(couleur));
}

/** Le rapport de contraste de deux luminances relatives, le plus clair en haut. */
export function rapportDeLuminances(ya: number, yb: number): number {
  return (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);
}

/** Le contraste WCAG 2 de deux couleurs, dans un ordre quelconque ([MOT-21]). */
export function contraste(a: Rgb8, b: Rgb8): number {
  return rapportDeLuminances(luminanceRelative(a), luminanceRelative(b));
}

/**
 * Le contraste écrit à dix décimales, que lisent le verdict et l'affichage.
 * `4.35` vaut `4.3499999999999996` en binaire, et une troncature sur cette
 * valeur afficherait 4,34.
 */
export function aDixDecimales(x: number): string {
  return x.toFixed(10);
}

/**
 * Vrai quand un contraste atteint un seuil ([MOT-22]). La comparaison lit la
 * valeur à dix décimales que l'affichage tronque : un contraste affiché 4,50
 * tient 4,5, et 4,499 échoue.
 */
export function atteintLeSeuil(valeur: number, seuil: number): boolean {
  return Number(aDixDecimales(valeur)) >= seuil;
}
