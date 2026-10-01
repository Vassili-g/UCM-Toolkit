/**
 * Où la recette d'UCM Palettes se range dans un document Figma. UCM Palettes
 * y écrit ; l'explorateur de tokens y lit seulement. Les deux plugins
 * importent ces constantes d'ici, sans qu'aucun lise les sources de l'autre.
 */

/** L'espace de noms partagé : il survit à un changement d'identifiant du plugin ([REC-01]). */
export const ESPACE_PARTAGE = 'ucm_palettes';

/** La clé de la recette dans l'espace partagé. */
export const CLE_RECETTE = 'recette';
