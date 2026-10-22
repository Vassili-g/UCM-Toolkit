/** Les variables de référence et leur état de lecture, indépendamment de Figma. */
import { collectionUcmReconnue } from '../referentiel/normalisation.js';
import type { Collection } from '../referentiel/architecture.js';

export interface CollectionDuCatalogue {
  cle: string;
  nom: string;
  role: Collection | null;
  modes: { id: string; nom: string }[];
  etat: 'lue' | 'inaccessible';
}

export interface VariableDuCatalogue {
  cle: string;
  nom: string;
  collection: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  etat: 'presente' | 'non-chargee' | 'inaccessible';
  scopes?: string[];
  valeurs?: Record<string, { alias: string } | { valeur: unknown }>;
}

export interface CatalogueDeReference {
  version: 1;
  library: { nom: string; cle: string } | null;
  collections: CollectionDuCatalogue[];
  variables: VariableDuCatalogue[];
}

/** Déduit le rôle des collections du nom seulement si le fichier est déclaré UCM. */
export function collectionsDeReference(
  collections: readonly Omit<CollectionDuCatalogue, 'role'>[],
  architecture: 'ucm' | 'libre',
): CollectionDuCatalogue[] {
  return collections.map((collection) => ({
    ...collection,
    role: architecture === 'ucm' ? collectionUcmReconnue(collection.nom) ?? null : null,
  }));
}

/** Une clé désigne toujours une variable ; un nom se cherche dans sa collection si elle est précisée. */
export function variableDuCatalogue(
  catalogue: CatalogueDeReference,
  cleOuNom: string,
  collection?: string,
): VariableDuCatalogue | 'absente' {
  const parCle = catalogue.variables.find((variable) => variable.cle === cleOuNom);
  if (parCle) return parCle;
  return catalogue.variables.find((variable) => variable.nom === cleOuNom && (collection === undefined || variable.collection === collection)) ?? 'absente';
}

export function collectionDuCatalogue(catalogue: CatalogueDeReference, cleOuNom: string): CollectionDuCatalogue | 'absente' {
  return catalogue.collections.find((collection) => collection.cle === cleOuNom || collection.nom === cleOuNom) ?? 'absente';
}
