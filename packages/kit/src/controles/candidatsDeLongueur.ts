/**
 * Les variables de `layout` qui valent une longueur : le classement que C29 et la préparation des tokens partagent. L'index se
 * construit une fois par catalogue et suppose le catalogue figé après sa lecture.
 */
import { formeReconnue } from '../referentiel/reconnaissance.js';
import { cheminDansLaCollection, variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';

/** Au-delà, une chaîne d'alias est lue comme sans valeur. */
const PROFONDEUR_MAX = 5;

export interface CandidatDeLongueur {
  variable: VariableDuCatalogue;
  /** La valeur en pixels de chaque mode, `undefined` si le mode ne se résout pas. */
  parMode: Readonly<Record<string, number | undefined>>;
  /** La valeur commune à tous les modes ; absente si un mode ne se résout pas ou si les modes divergent. */
  exacte: number | undefined;
}

/** Un candidat dont la valeur n'est pas celle cherchée, avec son écart en pixels. Rempli par la recherche des proches. */
export interface CandidatProche {
  variable: VariableDuCatalogue;
  ecart: number;
}

export interface CandidatsDeLongueur {
  /** Les variables dont tous les modes valent la valeur cherchée, dans l'ordre du catalogue. */
  exacts: readonly VariableDuCatalogue[];
  /** Toujours vide : aucun calcul de proximité n'existe encore. */
  proches: readonly CandidatProche[];
}

export type IndexDeLongueurs = ReadonlyMap<string, readonly CandidatDeLongueur[]>;

const indexParCatalogue = new WeakMap<CatalogueDeReference, IndexDeLongueurs>();

function valeursParMode(
  variable: VariableDuCatalogue, catalogue: CatalogueDeReference, profondeur: number, vus: ReadonlySet<string>,
): Record<string, number | undefined> | undefined {
  if (profondeur > PROFONDEUR_MAX || vus.has(variable.cle)) return undefined;
  const suivis = new Set(vus).add(variable.cle);
  const resultat: Record<string, number | undefined> = {};
  for (const [mode, entree] of Object.entries(variable.valeurs ?? {})) {
    if ('valeur' in entree) { resultat[mode] = typeof entree.valeur === 'number' ? entree.valeur : undefined; continue; }
    const cible = variableDuCatalogue(catalogue, entree.alias);
    resultat[mode] = cible === 'absente' ? undefined : valeurCommune(valeursParMode(cible, catalogue, profondeur + 1, suivis));
  }
  return resultat;
}

function valeurCommune(parMode: Record<string, number | undefined> | undefined): number | undefined {
  const valeurs = Object.values(parMode ?? {});
  if (valeurs.length === 0) return undefined;
  return valeurs.every((valeur) => valeur !== undefined && valeur === valeurs[0]) ? valeurs[0] : undefined;
}

/**
 * Par famille (`sizing`, `radius`, `stroke`, `icon`…), les variables `FLOAT` présentes des collections de rôle `layout`.
 * La famille est le premier segment du chemin dans la collection, lu par `formeReconnue`.
 */
export function indexDeLongueurs(catalogue: CatalogueDeReference): IndexDeLongueurs {
  const connu = indexParCatalogue.get(catalogue);
  if (connu) return connu;
  const cles = new Set(catalogue.collections.filter((collection) => collection.role === 'layout').map((collection) => collection.cle));
  const index = new Map<string, CandidatDeLongueur[]>();
  for (const variable of catalogue.variables) {
    if (variable.etat !== 'presente' || variable.type !== 'FLOAT' || !cles.has(variable.collection)) continue;
    const famille = formeReconnue(cheminDansLaCollection(variable, catalogue)[0] ?? '');
    const parMode = valeursParMode(variable, catalogue, 0, new Set()) ?? {};
    const entree: CandidatDeLongueur = { variable, parMode, exacte: valeurCommune(parMode) };
    index.set(famille, [...(index.get(famille) ?? []), entree]);
  }
  indexParCatalogue.set(catalogue, index);
  return index;
}

/** Les candidats de `layout` pour une valeur en pixels, dans une famille. */
export function candidatsDeLongueur(catalogue: CatalogueDeReference, famille: string, valeur: number): CandidatsDeLongueur {
  const exacts = (indexDeLongueurs(catalogue).get(famille) ?? []).filter((candidat) => candidat.exacte === valeur).map((candidat) => candidat.variable);
  return { exacts, proches: [] };
}
