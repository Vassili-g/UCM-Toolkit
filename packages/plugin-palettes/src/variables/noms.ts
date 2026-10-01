/**
 * Le segment qu'une palette prend dans le chemin de ses variables
 * ([VAR-03]), tiré de son nom. La normalisation est celle du format,
 * `normalizeName`, lue par `packages/plugin-socle` : le chemin d'une
 * variable écrite ici s'exporte sans surprise par UCM Exporter. Pur.
 */
import type { Palette, Recette } from 'ucm-couleur';
import { prefixeDeCollection } from 'ucm-plugin-socle/src/cheminsDeTokens';

/**
 * Le segment d'un nom : normalisé, rendu citable, puis privé du `.` que la
 * normalisation pose à la place d'un `/` et que Figma refuse dans un nom de
 * variable. Vide quand le nom ne laisse aucun caractère.
 */
export function segmentDuNom(nom: string): string {
  return prefixeDeCollection(nom).replace(/\./g, '');
}

export interface SegmentDePalette {
  readonly segment: string;
  /** Vrai quand une palette placée avant porte le même segment : celui-ci a pris l'identifiant en suffixe. */
  readonly suffixe: boolean;
}

/**
 * Le segment de chaque palette de la recette, par identifiant. Une palette
 * sans nom, ou dont le nom ne laisse rien, prend son identifiant. Deux
 * palettes au même segment : la seconde, dans l'ordre de la recette, prend
 * son identifiant en suffixe.
 */
export function segmentsDesPalettes(recette: Pick<Recette, 'palettes'>): Map<string, SegmentDePalette> {
  const pris = new Set<string>();
  const segments = new Map<string, SegmentDePalette>();
  for (const palette of recette.palettes) {
    const propre = segmentDuNom(palette.nom ?? '') || palette.id;
    const suffixe = pris.has(propre);
    const segment = suffixe ? `${propre}-${palette.id}` : propre;
    pris.add(segment);
    segments.set(palette.id, { segment, suffixe });
  }
  return segments;
}

/** Le segment d'une palette de la recette ; une palette absente de la recette prend le segment de son seul nom. */
export function segmentDeLaPalette(recette: Pick<Recette, 'palettes'>, palette: Palette): SegmentDePalette {
  return segmentsDesPalettes(recette).get(palette.id) ?? { segment: segmentDuNom(palette.nom ?? '') || palette.id, suffixe: false };
}
