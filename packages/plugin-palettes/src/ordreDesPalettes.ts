/**
 * L'ordre dans lequel les onglets montrent les palettes : par teinte dans
 * Création et Harmonisation, par nom dans Gestion. La recette garde son
 * ordre, celui des cadres de la planche ([PLA-05]) ; seul l'affichage change.
 */
import { CHROMA_DES_PALETTES_COLOREES, referenceDe, rgb8VersOklch, type Palette, type Recette } from 'ucm-couleur';

import { FAMILLES_DE_TEINTE } from './familles';

/** Le cercle des teintes s'ouvre à mi-chemin des familles rose et rouge : l'ordre va du rouge au rose. */
const OUVERTURE_DU_CERCLE = (FAMILLES_DE_TEINTE[0].centre + FAMILLES_DE_TEINTE[1].centre) / 2;

/**
 * Les identifiants de la recette par teinte OKLCH de leur référence, du rouge
 * au rose (`OUVERTURE_DU_CERCLE`). Deux teintes égales gardent l'ordre de la
 * recette ; les palettes sans teinte (chroma de la référence au plus
 * `CHROMA_DES_PALETTES_COLOREES`) suivent, dans l'ordre de la recette.
 */
export function ordreParTeinte(recette: Recette): readonly string[] {
  const lues = recette.palettes.map((palette) => {
    const { C, H } = rgb8VersOklch(referenceDe(palette));
    return { id: palette.id, teinte: C > CHROMA_DES_PALETTES_COLOREES ? (((H - OUVERTURE_DU_CERCLE) % 360) + 360) % 360 : null };
  });
  const colorees = lues.filter((lue): lue is { id: string; teinte: number } => lue.teinte !== null).sort((a, b) => a.teinte - b.teinte);
  return [...colorees, ...lues.filter(({ teinte }) => teinte === null)].map(({ id }) => id);
}

/**
 * Les identifiants de la recette par nom affiché, sans tenir compte de la
 * casse ni des accents, les nombres à leur valeur (« Bleu 2 » avant
 * « Bleu 10 »). Deux noms égaux gardent l'ordre de la recette.
 */
export function ordreAlphabetique(recette: Recette, nom: (palette: Palette) => string, langue?: string): readonly string[] {
  const comparer = new Intl.Collator(langue, { sensitivity: 'base', numeric: true }).compare;
  return [...recette.palettes].sort((a, b) => comparer(nom(a), nom(b))).map(({ id }) => id);
}

/** Les éléments dans l'ordre donné, chacun repéré par `cle` ; un élément hors de l'ordre suit, à son rang. */
export function rangerSelon<T>(elements: readonly T[], ordre: readonly string[], cle: (element: T) => string): T[] {
  const rangs = new Map(ordre.map((id, rang) => [id, rang]));
  const rang = (element: T): number => rangs.get(cle(element)) ?? ordre.length;
  return [...elements].sort((a, b) => rang(a) - rang(b));
}

/** Les palettes de la recette par teinte, comme Création les montre. */
export function palettesParTeinte(recette: Recette): Palette[] {
  return rangerSelon(recette.palettes, ordreParTeinte(recette), ({ id }) => id);
}
