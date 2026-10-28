/**
 * Les sortes de composant imbriqué, et la façon de les reconnaître.
 *
 * Le kit définit les sortes ; l'exporteur et le relevé d'Architect relèvent les mêmes faits dans Figma, puis appellent `sorteDeLImbrique`.
 * Le préfixe `.` ou `_` est la convention UCM de la pièce interne : un composant sans collection ni contrat, qui ne sert jamais seul.
 * Une pièce interne peut servir un seul composant ou plusieurs ; une seule sorte les couvre (R-29).
 */

export const SORTES_D_IMBRIQUE = ['dependance', 'wrapper-de-dimensions', 'piece-interne', 'detail'] as const;

export type SorteDImbrique = (typeof SORTES_D_IMBRIQUE)[number];

/** Les préfixes qui déclarent une pièce interne. */
export const PREFIXES_DE_PIECE_INTERNE = ['.', '_'] as const;

/** Faits sérialisables d'un composant imbriqué, relevés dans Figma. */
export interface FaitsDImbrique {
  /** Nom du composant imbriqué (set ou composant), tel que Figma le porte. */
  nom: string;
  /** Une instance de `.componentRules` nomme ce composant sur la page de son composant principal. */
  reglesTrouvees: boolean;
  /** Nombre de dimensions de layout liées à des variables que l'instance porte ; le socle les compte par `countLayoutBindings`. */
  dimensionsLiees: number;
}

/**
 * Sorte d'un composant imbriqué, testée dans cet ordre : dépendance, wrapper de dimensions, pièce interne, détail.
 * Le wrapper passe avant la pièce interne : `.sizeWrapperButton` est un wrapper, préfixé ou non.
 *
 * @example sorteDeLImbrique({ nom: '.Ring', reglesTrouvees: false, dimensionsLiees: 0 }) // 'piece-interne'
 */
export function sorteDeLImbrique(faits: FaitsDImbrique): SorteDImbrique {
  if (faits.reglesTrouvees) return 'dependance';
  if (faits.dimensionsLiees > 0) return 'wrapper-de-dimensions';
  if (PREFIXES_DE_PIECE_INTERNE.some((prefixe) => faits.nom.startsWith(prefixe))) return 'piece-interne';
  return 'detail';
}
