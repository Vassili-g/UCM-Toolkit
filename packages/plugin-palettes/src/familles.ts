/**
 * Les familles de teinte qui nomment les bouts de la piste de teinte ([UI-38]) :
 * huit centres OKLCH, en degrés. Sans DOM ni texte : le catalogue donne le nom
 * de chaque famille.
 */

export const FAMILLES_DE_TEINTE = [
  { famille: 'rose', centre: 0 },
  { famille: 'rouge', centre: 29 },
  { famille: 'orange', centre: 62 },
  { famille: 'jaune', centre: 100 },
  { famille: 'vert', centre: 145 },
  { famille: 'turquoise', centre: 195 },
  { famille: 'bleu', centre: 255 },
  { famille: 'violet', centre: 300 },
] as const;

export type FamilleDeTeinte = (typeof FAMILLES_DE_TEINTE)[number]['famille'];

/** Un centre à cet écart de la teinte de départ ou moins appartient à la famille de départ, pas à sa voisine. */
export const ECART_DE_LA_FAMILLE_DE_DEPART = 10;

/**
 * La famille voisine de `teinte` dans un sens : le centre le plus proche, dans
 * ce sens, à plus de 10° de la teinte. `sens` vaut 1 vers les degrés croissants
 * et -1 vers les décroissants.
 */
export function familleVoisine(teinte: number, sens: 1 | -1): FamilleDeTeinte {
  let voisine: FamilleDeTeinte = FAMILLES_DE_TEINTE[0].famille;
  let distance = Infinity;
  for (const { famille, centre } of FAMILLES_DE_TEINTE) {
    const ecart = (((sens * (centre - teinte)) % 360) + 360) % 360;
    if (ecart > ECART_DE_LA_FAMILLE_DE_DEPART && ecart < distance) {
      distance = ecart;
      voisine = famille;
    }
  }
  return voisine;
}
