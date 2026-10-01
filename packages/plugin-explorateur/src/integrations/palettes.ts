/**
 * L'intégration facultative d'UCM Palettes : la recette rangée sous la clé
 * partagée, classée par le moteur de couleur, sans migration ni écriture.
 *
 * La recette ne dit pas quelle variable porte quel cran. Le designer associe
 * une variable de couleur à une palette, une intensité, un thème et un cran ;
 * l'association reste en mémoire. Aucune association ne se déduit d'une
 * teinte ou de l'égalité de deux couleurs.
 */
import { PALETTE_NEUTRE, RANGS, USAGES_DU_NEUTRE, classerRecette, emploisDuCran, type Classement, type Emploi, type Palette, type Recette } from 'ucm-couleur';

import type { Index } from '../indexation';

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

/** Un emploi que la table confie au cran, avec son rang, ou un usage propre au neutre. */
export interface EmploiAffiche {
  readonly emploi: Emploi | keyof typeof USAGES_DU_NEUTRE;
  readonly rang: (typeof RANGS)[number] | null;
}

/** Les emplois de la table qui visent le cran associé ; le neutre ajoute ses usages propres. */
export function emploisDeLAssociation(recette: Recette, association: AssociationDeCran): EmploiAffiche[] {
  const palette = recette.palettes.find((candidate) => candidate.id === association.palette);
  if (!palette) return [];
  const crans = cransDeLaPalette(recette, palette);
  const rang = crans.indexOf(association.cran);
  if (rang < 0) return [];
  const emplois: EmploiAffiche[] = emploisDuCran(crans, rang).map((trouve) => ({ emploi: trouve.emploi, rang: RANGS[trouve.decalage] }));
  if ((palette.nom ?? '').toLowerCase() === PALETTE_NEUTRE) {
    for (const [usage, cran] of Object.entries(USAGES_DU_NEUTRE)) {
      if (cran === association.cran) emplois.push({ emploi: usage as keyof typeof USAGES_DU_NEUTRE, rang: null });
    }
  }
  return emplois;
}
