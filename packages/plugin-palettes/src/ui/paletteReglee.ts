/** La palette figée posée sur les réglages que la reprise a trouvés. */
import type { Palette, Recette } from 'ucm-couleur';

/**
 * Les couleurs figées partent, le reste de l'identité demeure. La reprise cherche une palette
 * commune quand la liste de nuances est celle de la recette (mêmes numéros,
 * même ordre) : la palette perd alors `crans`, car une palette libre n'a ni la
 * clarté selon la teinte ni la garde de la bosse, et ses rampes différeraient.
 * Une autre liste reste sur la palette.
 */
export function paletteReglee(recette: Recette, figee: Palette, reglages: Partial<Palette>): Palette {
  const { figees: _figees, ...sansFigees } = figee;
  const reglee: Palette = { ...sansFigees, ...reglages };
  const { crans, ...sansCrans } = reglee;
  const communes = crans !== undefined && crans.length === recette.crans.length && crans.every((cran, rang) => cran === recette.crans[rang]);
  return communes ? sansCrans : reglee;
}
