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
  /** Vrai pour une variable de library : une écriture locale ne la trouve pas. */
  distante?: true;
  scopes?: string[];
  valeurs?: Record<string, { alias: string } | { valeur: unknown }>;
}

/** Une couleur résolue, composantes de 0 à 1 ; `a` vaut 1 quand il manque. */
export interface CouleurResolue { r: number; g: number; b: number; a?: number }

export interface CatalogueDeReference {
  version: 1;
  library: { nom: string; cle: string } | null;
  collections: CollectionDuCatalogue[];
  variables: VariableDuCatalogue[];
  /**
   * Les fonds d'élévation du thème (`elevation/page`, `elevation/raised`), par identifiant de mode de la collection `theme`.
   * Sans lui, ou sans entrée pour le mode mesuré, un layer sans fond opaque se mesure sur `fondDeLaPageFigma`.
   */
  fondsDElevation?: Record<string, { page: CouleurResolue; carte: CouleurResolue }>;
  /** Le fond de la page Figma (`figma.currentPage.backgrounds`) : une seule valeur, sans mode ; repli sans thème UCM. */
  fondDeLaPageFigma?: CouleurResolue;
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

interface IndexDesCollections {
  readonly collections: readonly CollectionDuCatalogue[];
  readonly nombre: number;
  readonly parCle: Map<string, CollectionDuCatalogue>;
  readonly parCleOuNom: Map<string, CollectionDuCatalogue>;
}

const indexDesCollectionsMemorises = new WeakMap<object, IndexDesCollections>();

/**
 * Même règle de validité que l'index des variables. Une collection entre dans `parCleOuNom` sous sa clé et sous son nom, sans
 * remplacer une entrée déjà là : la première collection de la liste dont la clé ou le nom égale la requête l'emporte.
 */
function indexDesCollections(catalogue: Pick<CatalogueDeReference, 'collections'>): IndexDesCollections {
  const { collections } = catalogue;
  const connu = indexDesCollectionsMemorises.get(catalogue);
  if (connu && connu.collections === collections && connu.nombre === collections.length) return connu;
  const parCle = new Map<string, CollectionDuCatalogue>();
  const parCleOuNom = new Map<string, CollectionDuCatalogue>();
  for (const collection of collections) {
    const { cle, nom } = collection;
    if (!parCle.has(cle)) parCle.set(cle, collection);
    if (!parCleOuNom.has(cle)) parCleOuNom.set(cle, collection);
    if (!parCleOuNom.has(nom)) parCleOuNom.set(nom, collection);
  }
  const index = { collections, nombre: collections.length, parCle, parCleOuNom };
  indexDesCollectionsMemorises.set(catalogue, index);
  return index;
}

/** La première collection de cette clé, sans repli sur le nom. */
export function collectionParCle(catalogue: Pick<CatalogueDeReference, 'collections'>, cle: string): CollectionDuCatalogue | undefined {
  return indexDesCollections(catalogue).parCle.get(cle);
}

export function collectionDuCatalogue(catalogue: CatalogueDeReference, cleOuNom: string): CollectionDuCatalogue | 'absente' {
  return indexDesCollections(catalogue).parCleOuNom.get(cleOuNom) ?? 'absente';
}

/**
 * Les segments d'une variable dans sa collection. Figma nomme une variable sans sa collection (`radius/md` dans `layout`) ; un
 * premier segment qui redit la collection (`layout/radius/md`, `layouts/radius/md`) est retiré, pour lire les deux écritures.
 */
export function cheminDansLaCollection(variable: Pick<VariableDuCatalogue, 'nom' | 'collection'>, catalogue: Pick<CatalogueDeReference, 'collections'>): string[] {
  const segments = variable.nom.split('/');
  if (segments.length < 2) return segments;
  const collection = collectionParCle(catalogue, variable.collection);
  const redit = collection !== undefined && collectionUcmReconnue(segments[0]) !== undefined
    && (collectionUcmReconnue(segments[0]) === (collection.role ?? collectionUcmReconnue(collection.nom)));
  return redit ? segments.slice(1) : segments;
}
