/**
 * La validation d'une entrée de session avant sa réutilisation : les sorties que les lecteurs rendent à la demande
 * courante se comparent à celles que l'entrée a retenues. Les ressources sans événement démontré (liaisons de variables,
 * variables, collections, maîtres, libraries, inventaires : matrice de `couverture.ts`) ne se jugent que par cette
 * relecture.
 *
 * L'égalité est exacte et ne normalise rien : un ordre différent, de liste ou de clés, est un écart, parce que les
 * contrôles du kit parcourent leurs entrées dans l'ordre et rangent leurs constats dans cet ordre.
 *
 * Le module ne connaît aucun type Figma : l'appelant nomme ses sorties et décide de ce qui est relu.
 */

/**
 * Vrai quand `a` et `b` ont la même valeur, ordre compris :
 * - primitives par `Object.is` : `NaN` égale `NaN`, `0` et `-0` diffèrent ;
 * - listes de même longueur, élément par élément, une case vide différant de `undefined` ;
 * - `Map` et `Set` dans leur ordre d'insertion, clés et valeurs comparées de même ;
 * - objets simples (prototype `Object.prototype` ou `null`) par leurs clés propres énumérables, dans le même ordre ; une
 *   clé qui vaut `undefined` diffère d'une clé absente ;
 * - tout autre objet (nœud Figma, instance de classe, date) n'égale que lui-même.
 * Une paire déjà en cours de comparaison est tenue pour égale : un cycle ne boucle pas.
 */
export function egalesExactement(a: unknown, b: unknown): boolean {
  return comparer(a, b, new Map());
}

function comparer(a: unknown, b: unknown, enCours: Map<object, Set<object>>): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const prototype = Object.getPrototypeOf(a) as unknown;
  if (prototype !== Object.getPrototypeOf(b)) return false;
  const paires = enCours.get(a) ?? new Set<object>();
  if (paires.has(b)) return true;
  enCours.set(a, paires.add(b));
  if (Array.isArray(a)) return listesEgales(a, b as unknown[], enCours);
  if (a instanceof Map) return listesEgales([...a], [...(b as Map<unknown, unknown>)], enCours);
  if (a instanceof Set) return listesEgales([...a], [...(b as Set<unknown>)], enCours);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const objetA = a as Record<string, unknown>;
  const objetB = b as Record<string, unknown>;
  const clesDeA = Object.keys(objetA);
  const clesDeB = Object.keys(objetB);
  return clesDeA.length === clesDeB.length
    && clesDeA.every((cle, rang) => cle === clesDeB[rang] && comparer(objetA[cle], objetB[cle], enCours));
}

function listesEgales(a: readonly unknown[], b: readonly unknown[], enCours: Map<object, Set<object>>): boolean {
  if (a.length !== b.length) return false;
  for (let rang = 0; rang < a.length; rang += 1) {
    if ((rang in a) !== (rang in b) || !comparer(a[rang], b[rang], enCours)) return false;
  }
  return true;
}

/**
 * `egalesExactement` conduite par étapes, mêmes règles : jusqu'à `profondeur` niveaux sous la racine, l'étape est un
 * élément de liste, de `Map` ou de `Set`, ou une clé d'objet ; plus bas, la comparaison est d'un bloc. L'appelant cède
 * entre deux étapes (`calculerParEtapes` d'Architect) : une sortie de plusieurs centaines de Ko ne tient pas le fil d'un
 * seul bloc. Sur le relevé, quatre niveaux font d'un layer une étape. Un générateur par valeur ralentirait la comparaison
 * cinq fois sous Node : les niveaux profonds et les comparaisons courtes gardent `egalesExactement`.
 */
export function* egalesExactementParEtapes(a: unknown, b: unknown, profondeur = 4): Generator<void, boolean> {
  return yield* comparerParEtapes(a, b, new Map(), profondeur);
}

function* comparerParEtapes(a: unknown, b: unknown, enCours: Map<object, Set<object>>, profondeur: number): Generator<void, boolean> {
  if (profondeur <= 0) return comparer(a, b, enCours);
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const prototype = Object.getPrototypeOf(a) as unknown;
  if (prototype !== Object.getPrototypeOf(b)) return false;
  const paires = enCours.get(a) ?? new Set<object>();
  if (paires.has(b)) return true;
  enCours.set(a, paires.add(b));
  if (Array.isArray(a)) return yield* listesEgalesParEtapes(a, b as unknown[], enCours, profondeur);
  if (a instanceof Map) return yield* listesEgalesParEtapes([...a], [...(b as Map<unknown, unknown>)], enCours, profondeur);
  if (a instanceof Set) return yield* listesEgalesParEtapes([...a], [...(b as Set<unknown>)], enCours, profondeur);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const objetA = a as Record<string, unknown>;
  const objetB = b as Record<string, unknown>;
  const clesDeA = Object.keys(objetA);
  const clesDeB = Object.keys(objetB);
  if (clesDeA.length !== clesDeB.length) return false;
  for (let rang = 0; rang < clesDeA.length; rang += 1) {
    yield;
    const cle = clesDeA[rang];
    if (cle !== clesDeB[rang] || !(yield* comparerParEtapes(objetA[cle], objetB[cle], enCours, profondeur - 1))) return false;
  }
  return true;
}

function* listesEgalesParEtapes(a: readonly unknown[], b: readonly unknown[], enCours: Map<object, Set<object>>, profondeur: number): Generator<void, boolean> {
  if (a.length !== b.length) return false;
  for (let rang = 0; rang < a.length; rang += 1) {
    yield;
    if ((rang in a) !== (rang in b) || !(yield* comparerParEtapes(a[rang], b[rang], enCours, profondeur - 1))) return false;
  }
  return true;
}

/** Une sortie de lecteur : ce que l'entrée a retenu et ce que la demande courante vient de lire. */
export interface SortieRelue<Nom extends string> {
  readonly nom: Nom;
  readonly retenue: unknown;
  readonly relue: unknown;
}

/** Une sortie relue qui n'égale pas la sortie retenue. */
export type EcartDeSortie<Nom extends string> = `different:${Nom}`;

/** Les sorties relues qui diffèrent de leur version retenue (`egalesExactement`), dans l'ordre donné. */
export function ecartsDesSorties<Nom extends string>(sorties: readonly SortieRelue<Nom>[]): EcartDeSortie<Nom>[] {
  return sorties.filter(({ retenue, relue }) => !egalesExactement(retenue, relue)).map(({ nom }) => `different:${nom}` as const);
}
