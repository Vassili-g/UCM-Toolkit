/**
 * La recette par défaut aux parts communes 0,45 et 0,95. Des tests décrivent le
 * classement des profils, les alertes de parts ou des couleurs mesurées avec
 * ces parts, d'avant la part Soft par défaut à 0,85 du format 11.
 */
import { recetteParDefaut, type Recette } from 'ucm-couleur';

export function recetteAuxPartsDe045(): Recette {
  const defaut = recetteParDefaut();
  return { ...defaut, profils: { soft: { ...defaut.profils.soft, part: 0.45 }, vivid: defaut.profils.vivid } };
}
