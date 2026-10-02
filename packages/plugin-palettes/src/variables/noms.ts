/**
 * Le segment qu'une palette prend dans le chemin de ses variables
 * ([VAR-03]), tiré de son nom. La normalisation est celle du format,
 * `normalizeName`, lue par `packages/plugin-socle` : le chemin d'une
 * variable écrite ici s'exporte sans surprise par UCM Exporter. Pur.
 */
import type { Palette, Recette } from 'ucm-couleur';
import { cheminCitable } from 'ucm-plugin-socle/src/cheminsDeTokens';

/**
 * Le segment d'un nom : espaces en tirets, rendu citable, puis privé du `.`
 * que Figma refuse dans un nom de variable. Il garde la casse du nom : « Grass »
 * s'écrit `Grass`. L'export, lui, passe en minuscules (`normalizeName`), si bien
 * que le chemin du token ne change pas. Vide quand le nom ne laisse aucun
 * caractère.
 */
export function segmentDuNom(nom: string): string {
  const garde = nom.split('/').map((partie) => partie.trim().replace(/\s+/g, '-')).filter(Boolean).join('.');
  return cheminCitable(garde).replace(/\./g, '');
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
    // Deux noms qui ne diffèrent que par la casse se rejoignent à l'export : ils comptent pour le même segment.
    const suffixe = pris.has(propre.toLowerCase());
    const segment = suffixe ? `${propre}-${palette.id}` : propre;
    pris.add(segment.toLowerCase());
    segments.set(palette.id, { segment, suffixe });
  }
  return segments;
}

/** Le segment d'une palette de la recette ; une palette absente de la recette prend le segment de son seul nom. */
export function segmentDeLaPalette(recette: Pick<Recette, 'palettes'>, palette: Palette): SegmentDePalette {
  return segmentsDesPalettes(recette).get(palette.id) ?? { segment: segmentDuNom(palette.nom ?? '') || palette.id, suffixe: false };
}
