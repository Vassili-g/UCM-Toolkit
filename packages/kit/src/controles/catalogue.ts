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

interface IndexDesVariables {
  readonly variables: readonly VariableDuCatalogue[];
  readonly nombre: number;
  readonly parCle: Map<string, VariableDuCatalogue>;
  readonly parNom: Map<string, VariableDuCatalogue[]>;
}

const indexMemorises = new WeakMap<CatalogueDeReference, IndexDesVariables>();

/**
 * Construit une fois par catalogue, comme la mémoire de `tokensDuComposant` : la clé de validité est le tableau `variables` et sa
 * longueur. Une variable modifiée en place sans changer le tableau n'est pas vue. Chaque liste garde l'ordre du catalogue, donc le
 * premier doublon gagne.
 */
function indexDesVariables(catalogue: CatalogueDeReference): IndexDesVariables {
  const { variables } = catalogue;
  const connu = indexMemorises.get(catalogue);
  if (connu && connu.variables === variables && connu.nombre === variables.length) return connu;
  const parCle = new Map<string, VariableDuCatalogue>();
  const parNom = new Map<string, VariableDuCatalogue[]>();
  for (const variable of variables) {
    const { cle, nom } = variable;
    if (!parCle.has(cle)) parCle.set(cle, variable);
    const memes = parNom.get(nom);
    if (memes) memes.push(variable); else parNom.set(nom, [variable]);
  }
  const index = { variables, nombre: variables.length, parCle, parNom };
  indexMemorises.set(catalogue, index);
  return index;
}

/** La première variable de cette clé, sans repli sur le nom. */
export function variableParCle(catalogue: CatalogueDeReference, cle: string): VariableDuCatalogue | undefined {
  return indexDesVariables(catalogue).parCle.get(cle);
}

/** Une clé désigne toujours une variable ; un nom se cherche dans sa collection si elle est précisée. */
export function variableDuCatalogue(
  catalogue: CatalogueDeReference,
  cleOuNom: string,
  collection?: string,
): VariableDuCatalogue | 'absente' {
  const index = indexDesVariables(catalogue);
  const parCle = index.parCle.get(cleOuNom);
  if (parCle) return parCle;
  const memes = index.parNom.get(cleOuNom);
  if (!memes) return 'absente';
  return (collection === undefined ? memes[0] : memes.find((variable) => variable.collection === collection)) ?? 'absente';
}

export function collectionDuCatalogue(catalogue: CatalogueDeReference, cleOuNom: string): CollectionDuCatalogue | 'absente' {
  return catalogue.collections.find((collection) => collection.cle === cleOuNom || collection.nom === cleOuNom) ?? 'absente';
}

/**
 * Les segments d'une variable dans sa collection. Figma nomme une variable sans sa collection (`radius/md` dans `layout`) ; un
 * premier segment qui redit la collection (`layout/radius/md`, `layouts/radius/md`) est retiré, pour lire les deux écritures.
 */
export function cheminDansLaCollection(variable: Pick<VariableDuCatalogue, 'nom' | 'collection'>, catalogue: Pick<CatalogueDeReference, 'collections'>): string[] {
  const segments = variable.nom.split('/');
  if (segments.length < 2) return segments;
  const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
  const redit = collection !== undefined && collectionUcmReconnue(segments[0]) !== undefined
    && (collectionUcmReconnue(segments[0]) === (collection.role ?? collectionUcmReconnue(collection.nom)));
  return redit ? segments.slice(1) : segments;
}
