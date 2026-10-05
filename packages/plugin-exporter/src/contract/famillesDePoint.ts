/**
 * Les familles de points à corriger : le geste que le designer fait dans Figma.
 *
 * Le module ne touche à aucune API Figma, si bien que le moteur et l'interface
 * l'importent tous deux. L'ordre du tableau est celui des sections du compte
 * rendu.
 */

/** Le type de geste qu'un point demande, de la disposition au fichier exporté. */
export type FamilleDePoint =
  | 'disposition'
  | 'proprietes'
  | 'imbriques'
  | 'variables'
  | 'styles'
  | 'regles'
  | 'non-exportes'
  | 'fichier';

/** Les familles dans l'ordre d'affichage des sections. */
export const FAMILLES_DE_POINT: readonly FamilleDePoint[] = [
  'disposition',
  'proprietes',
  'imbriques',
  'variables',
  'styles',
  'regles',
  'non-exportes',
  'fichier',
];
