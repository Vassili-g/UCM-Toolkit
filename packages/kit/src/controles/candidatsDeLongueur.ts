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

/** Une variable dont la valeur commune n'est pas celle cherchée, avec sa valeur et son écart absolu en pixels. */
export interface CandidatProche {
  variable: VariableDuCatalogue;
  valeur: number;
  ecart: number;
}

export interface CandidatsDeLongueur {
  /** Les variables dont tous les modes valent la valeur cherchée, dans l'ordre du catalogue. */
  exacts: readonly VariableDuCatalogue[];
  /** Sans exact seulement : au plus la variable la plus proche en dessous et la plus proche au-dessus, la plus basse d'abord. */
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

/** Un token proche change le rendu : l'écart doit rester petit, en pixels et relativement à la valeur lue. */
const ECART_MAX_EN_PIXELS = 2;
const ECART_MAX_RELATIF = 0.1;
/** Absorbe l'erreur des flottants sur une valeur à la borne. */
const TOLERANCE = 1e-9;

function procheLe(candidats: readonly CandidatDeLongueur[], valeur: number, cote: 'dessous' | 'dessus'): CandidatProche | undefined {
  const borne = Math.min(ECART_MAX_EN_PIXELS, ECART_MAX_RELATIF * Math.max(Math.abs(valeur), 1)) + TOLERANCE;
  return candidats
    .flatMap(({ variable, exacte }) => {
      if (exacte === undefined || exacte === valeur || (cote === 'dessous') !== (exacte < valeur)) return [];
      const ecart = Math.abs(exacte - valeur);
      return ecart <= borne ? [{ variable, valeur: exacte, ecart }] : [];
    })
    .sort((a, b) => a.ecart - b.ecart || (a.variable.nom < b.variable.nom ? -1 : a.variable.nom > b.variable.nom ? 1 : 0))[0];
}

/**
 * Les candidats de `layout` pour une valeur en pixels, dans une famille. Sans exact, les proches : les variables dont la valeur
 * commune à tous les modes est écartée d'au plus `min(2, 0,1 × max(|v|, 1))` px, jamais pour une valeur nulle.
 */
export function candidatsDeLongueur(catalogue: CatalogueDeReference, famille: string, valeur: number): CandidatsDeLongueur {
  const candidats = indexDeLongueurs(catalogue).get(famille) ?? [];
  const exacts = candidats.filter((candidat) => candidat.exacte === valeur).map((candidat) => candidat.variable);
  if (exacts.length > 0 || valeur === 0) return { exacts, proches: [] };
  const proches = [procheLe(candidats, valeur, 'dessous'), procheLe(candidats, valeur, 'dessus')].filter((candidat): candidat is CandidatProche => candidat !== undefined);
  return { exacts, proches };
}
