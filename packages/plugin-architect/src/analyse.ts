/** Les catégories sans preuve de convention gardent leur écriture actuelle. */
import { CATEGORIES_DE_NOM, detecterLesConventions, normaliserLesNoms, type Convention, type ConventionsParCategorie, type ResultatDeNormalisation } from '@ucm-kit/core/referentiel';
import type { Inventaire } from './lecture';

export interface Analyse {
  readonly termesUcm: boolean;
  readonly inventaire: Inventaire;
  readonly conventions: ConventionsParCategorie;
  readonly detection: ReturnType<typeof detecterLesConventions>;
  readonly normalisation: ResultatDeNormalisation;
}

/** Une convention fournie prévaut sur la détection ; les cibles gelées occupent leur nom actuel. */
export function analyserInventaire(inventaire: Inventaire, preferences: ConventionsParCategorie = {}, termesUcm = false): Analyse {
  const noms = inventaire.entrees.map((entree) => entree.nom);
  const detection = detecterLesConventions(noms);
  const inchangee: Convention = { casse: 'inchangee', separateur: 'inchange' };
  const conventions = Object.fromEntries(CATEGORIES_DE_NOM.map((categorie) => [categorie, preferences[categorie] ?? detection[categorie].dominante ?? inchangee]));
  return { inventaire, detection, conventions, termesUcm, normalisation: normaliserLesNoms(noms, conventions, {
    termesUcm,
    nonRenommables: inventaire.entrees.filter((entree) => !entree.renommable).map((entree) => entree.nom.id),
  }) };
}
