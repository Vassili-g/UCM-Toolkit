/**
 * Les variables qui valent une longueur : le classement que C29 et la préparation des tokens partagent. C29 classe les tokens
 * de `components` du composant (`candidatDeLongueur`, `classerLesCandidats`) ; la préparation cherche dans `layout` par
 * l'index, qui se construit une fois par catalogue et suppose le catalogue figé après sa lecture.
 */
import { formeReconnue } from '../referentiel/reconnaissance.js';
import { cheminDansLaCollection, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';

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

function* valeursParMode(
  variable: VariableDuCatalogue, catalogue: CatalogueDeReference, profondeur: number, vus: ReadonlySet<string>,
): Generator<void, Record<string, number | undefined> | undefined> {
  if (profondeur > PROFONDEUR_MAX || vus.has(variable.cle)) return undefined;
  const suivis = new Set(vus).add(variable.cle);
  const resultat: Record<string, number | undefined> = {};
  for (const [mode, entree] of Object.entries(variable.valeurs ?? {})) {
    yield;
    if ('valeur' in entree) { resultat[mode] = typeof entree.valeur === 'number' ? entree.valeur : undefined; continue; }
    const cible = yield* variableDeLAlias(catalogue, entree.alias);
    const valeursCibles = cible === undefined ? undefined : yield* valeursParMode(cible, catalogue, profondeur + 1, suivis);
    resultat[mode] = yield* valeurCommune(valeursCibles);
  }
  return resultat;
}

function* valeurCommune(parMode: Record<string, number | undefined> | undefined): Generator<void, number | undefined> {
  const valeurs = Object.values(parMode ?? {});
  if (valeurs.length === 0) return undefined;
  for (const valeur of valeurs) {
    yield;
    if (valeur === undefined || valeur !== valeurs[0]) return undefined;
  }
  return valeurs[0];
}

function* variableDeLAlias(catalogue: CatalogueDeReference, cleOuNom: string): Generator<void, VariableDuCatalogue | undefined> {
  for (const variable of catalogue.variables) {
    yield;
    if (variable.cle === cleOuNom) return variable;
  }
  for (const variable of catalogue.variables) {
    yield;
    if (variable.nom === cleOuNom) return variable;
  }
  return undefined;
}

/** Les valeurs d'une variable dans chaque mode, alias suivis ; la valeur commune seulement si tous les modes la partagent. */
export function candidatDeLongueur(catalogue: CatalogueDeReference, variable: VariableDuCatalogue): CandidatDeLongueur {
  const calcul = candidatDeLongueurParEtapes(catalogue, variable);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède entre les modes et les recherches d'alias ; la borne de profondeur reste la même. */
export function* candidatDeLongueurParEtapes(catalogue: CatalogueDeReference, variable: VariableDuCatalogue): Generator<void, CandidatDeLongueur> {
  const parMode = (yield* valeursParMode(variable, catalogue, 0, new Set())) ?? {};
  const exacte = yield* valeurCommune(parMode);
  return { variable, parMode, exacte };
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
    index.set(famille, [...(index.get(famille) ?? []), candidatDeLongueur(catalogue, variable)]);
  }
  indexParCatalogue.set(catalogue, index);
  return index;
}

/** Un token proche change le rendu : l'écart doit rester petit, en pixels et relativement à la valeur lue. */
const ECART_MAX_EN_PIXELS = 2;
const ECART_MAX_RELATIF = 0.1;
/** Absorbe l'erreur des flottants sur une valeur à la borne. */
const TOLERANCE = 1e-9;

function* procheLe(candidats: readonly CandidatDeLongueur[], valeur: number, cote: 'dessous' | 'dessus'): Generator<void, CandidatProche | undefined> {
  const borne = Math.min(ECART_MAX_EN_PIXELS, ECART_MAX_RELATIF * Math.max(Math.abs(valeur), 1)) + TOLERANCE;
  let retenu: CandidatProche | undefined;
  for (const { variable, exacte } of candidats) {
    yield;
    if (exacte === undefined || exacte === valeur || (cote === 'dessous') !== (exacte < valeur)) continue;
    const ecart = Math.abs(exacte - valeur);
    if (!(ecart <= borne)) continue;
    if (!retenu || (ecart - retenu.ecart || (variable.nom < retenu.variable.nom ? -1 : variable.nom > retenu.variable.nom ? 1 : 0)) < 0) {
      retenu = { variable, valeur: exacte, ecart };
    }
  }
  return retenu;
}

/**
 * Les candidats de `layout` pour une valeur en pixels, dans une famille. Sans exact, les proches : les variables dont la valeur
 * commune à tous les modes est écartée d'au plus `min(2, 0,1 × max(|v|, 1))` px, jamais pour une valeur nulle.
 */
export function candidatsDeLongueur(catalogue: CatalogueDeReference, famille: string, valeur: number): CandidatsDeLongueur {
  return classerLesCandidats(indexDeLongueurs(catalogue).get(famille) ?? [], valeur);
}

/** Le classement exact ou proche de `candidatsDeLongueur`, pour des candidats que l'appelant a déjà choisis. */
export function classerLesCandidats(candidats: readonly CandidatDeLongueur[], valeur: number): CandidatsDeLongueur {
  const calcul = classerLesCandidatsParEtapes(candidats, valeur);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède entre candidats ; les exacts gardent leur ordre et chaque côté garde son premier meilleur proche. */
export function* classerLesCandidatsParEtapes(candidats: readonly CandidatDeLongueur[], valeur: number): Generator<void, CandidatsDeLongueur> {
  const exacts: VariableDuCatalogue[] = [];
  for (const candidat of candidats) {
    yield;
    if (candidat.exacte === valeur) exacts.push(candidat.variable);
  }
  if (exacts.length > 0 || valeur === 0) return { exacts, proches: [] };
  const dessous = yield* procheLe(candidats, valeur, 'dessous');
  const dessus = yield* procheLe(candidats, valeur, 'dessus');
  const proches = [dessous, dessus].filter((candidat): candidat is CandidatProche => candidat !== undefined);
  return { exacts, proches };
}
