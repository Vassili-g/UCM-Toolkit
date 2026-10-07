/**
 * L'intégration facultative d'UCM Palettes : la recette rangée sous la clé
 * partagée, classée par le moteur de couleur, sans migration ni écriture.
 *
 * La recette ne dit pas quelle variable porte quel cran. Le designer associe
 * une variable de couleur à une palette, une intensité, un thème et un cran ;
 * l'association reste en mémoire. Aucune association ne se déduit d'une
 * teinte ou de l'égalité de deux couleurs.
 */
import { sensDuTheme, variablesDuCran, type VariableDuTheme } from '@ucm-kit/core/emplois';
import { classerRecette, type Classement, type Palette, type Recette } from 'ucm-couleur';

import type { Index } from '../indexation';

/** Le nom de la palette qui porte les variables propres au neutre. */
const PALETTE_NEUTRE = 'neutral';

export type Intensite = 'soft' | 'vivid';
export type Theme = 'light' | 'dark';

export interface AssociationDeCran {
  readonly palette: string;
  /** `null` pour une palette à une seule intensité. */
  readonly intensite: Intensite | null;
  readonly theme: Theme;
  readonly cran: number;
}

/** La recette lue, classée par le moteur de couleur. */
export function lireLaRecette(texte: string): Classement {
  return classerRecette(texte);
}

/** Les crans d'une palette : sa liste libre, ou celle de la recette. */
export function cransDeLaPalette(recette: Recette, palette: Palette): readonly number[] {
  return palette.crans ?? recette.crans;
}

/** Les intensités qu'une palette porte. */
export function intensitesDeLaPalette(palette: Palette): ReadonlyArray<Intensite | null> {
  return palette.intensites === 1 ? [null] : ['soft', 'vivid'];
}

export type RefusDAssociation = 'type' | 'palette' | 'intensite' | 'cran';

/** Valide une association avant de la garder : variable de couleur, palette, intensité et cran de la recette. */
export function validerAssociation(index: Index, recette: Recette, variable: string, association: AssociationDeCran): RefusDAssociation | null {
  if (index.variables.get(variable)?.type !== 'COLOR') return 'type';
  const palette = recette.palettes.find((candidate) => candidate.id === association.palette);
  if (!palette) return 'palette';
  if (!intensitesDeLaPalette(palette).includes(association.intensite)) return 'intensite';
  if (!cransDeLaPalette(recette, palette).includes(association.cran)) return 'cran';
  return null;
}

/** Les variables de `theme` que la table des dossiers confie au cran associé, dans le sens du thème associé ; le neutre ajoute les siennes. */
export function variablesDeLAssociation(recette: Recette, association: AssociationDeCran): VariableDuTheme[] {
  const palette = recette.palettes.find((candidate) => candidate.id === association.palette);
  if (!palette) return [];
  const crans = cransDeLaPalette(recette, palette);
  const rang = crans.indexOf(association.cran);
  if (rang < 0) return [];
  const sens = sensDuTheme(association.theme, recette.texteDesBoutons[association.theme]);
  return variablesDuCran(crans, rang, sens, (palette.nom ?? '').toLowerCase() === PALETTE_NEUTRE);
}
