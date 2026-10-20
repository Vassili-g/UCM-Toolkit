/**
 * Ce que le designer a coché dans À appliquer. Le module est pur : il tient la
 * `Selection` du contrat sous une forme qui se met à jour sans parcourir le DOM,
 * et chaque fonction rend un nouveau modèle, ou le même quand rien ne change.
 *
 * Un nom est coché si son groupe principal l'est et qu'il n'est pas exclu, ou
 * s'il est inclus. Un groupe coché ne porte donc que des exclus, un groupe décoché
 * que des inclus : cocher ou décocher un groupe efface les uns et les autres.
 */
import type { GroupeVue, LigneVue, Selection } from '../messages';

export type EtatDeCase = 'coche' | 'partiel' | 'vide';

interface TailleDeGroupe { readonly variables: number; readonly collections: number }

export interface ModeleDeSelection {
  /** Les clés des groupes du dernier bilan, dans l'ordre des groupes : celui des règles. */
  readonly ordre: readonly string[];
  readonly tailles: ReadonlyMap<string, TailleDeGroupe>;
  readonly coches: ReadonlySet<string>;
  /** Un identifiant vers la clé de son groupe principal. */
  readonly exclus: ReadonlyMap<string, string>;
  readonly inclus: ReadonlyMap<string, string>;
}

const VIDE: ModeleDeSelection = { ordre: [], tailles: new Map(), coches: new Set(), exclus: new Map(), inclus: new Map() };

const totalDe = (taille: TailleDeGroupe | undefined): number => (taille ? taille.variables + taille.collections : 0);

/** Combien d'entrées du dictionnaire appartiennent à chaque groupe. */
function compterParGroupe(entrees: ReadonlyMap<string, string>): Map<string, number> {
  const comptes = new Map<string, number>();
  for (const cle of entrees.values()) comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
  return comptes;
}

function compterDans(entrees: ReadonlyMap<string, string>, cle: string): number {
  let nombre = 0;
  for (const proprietaire of entrees.values()) if (proprietaire === cle) nombre += 1;
  return nombre;
}

function sansLesEntreesDe(entrees: ReadonlyMap<string, string>, cle: string): ReadonlyMap<string, string> {
  const gardees = new Map([...entrees].filter(([, proprietaire]) => proprietaire !== cle));
  return gardees.size === entrees.size ? entrees : gardees;
}

function tailleDesGroupes(groupes: readonly GroupeVue[]): Map<string, TailleDeGroupe> {
  return new Map(groupes.map((groupe) => [groupe.cle, { variables: groupe.variables, collections: groupe.collections }]));
}

/** Tous les groupes du bilan sont cochés, aucun nom n'est exclu ni inclus. */
export function creerSelection(groupes: readonly GroupeVue[]): ModeleDeSelection {
  return reconcilier(VIDE, groupes);
}

/**
 * Reporte le modèle sur un nouveau bilan. Un groupe disparu sort, avec les
 * identifiants qu'il portait ; un groupe qui n'était pas au bilan précédent
 * arrive coché ; les autres gardent leur case.
 */
export function reconcilier(modele: ModeleDeSelection, groupes: readonly GroupeVue[]): ModeleDeSelection {
  const connus = new Set(modele.ordre);
  const presents = new Set(groupes.map((groupe) => groupe.cle));
  const coches = new Set(groupes.filter((groupe) => !connus.has(groupe.cle) || modele.coches.has(groupe.cle)).map((groupe) => groupe.cle));
  const garder = (entrees: ReadonlyMap<string, string>): ReadonlyMap<string, string> => new Map([...entrees].filter(([, cle]) => presents.has(cle)));
  return { ordre: groupes.map((groupe) => groupe.cle), tailles: tailleDesGroupes(groupes), coches, exclus: garder(modele.exclus), inclus: garder(modele.inclus) };
}

/** Coche ou décoche un groupe entier : ses exclus et ses inclus sont oubliés. */
export function cocherGroupe(modele: ModeleDeSelection, cle: string, coche: boolean): ModeleDeSelection {
  if (!modele.tailles.has(cle)) return modele;
  const coches = new Set(modele.coches);
  if (coche) coches.add(cle);
  else coches.delete(cle);
  return { ...modele, coches, exclus: sansLesEntreesDe(modele.exclus, cle), inclus: sansLesEntreesDe(modele.inclus, cle) };
}

/**
 * Le groupe principal d'un nom affiché sous `cleAffichee` : celui de sa première
 * règle, soit le premier des groupes où il apparaît dans l'ordre du bilan.
 */
export function principalDe(modele: ModeleDeSelection, ligne: Pick<LigneVue, 'aussi'>, cleAffichee: string): string {
  let principal = cleAffichee;
  let rang = modele.ordre.indexOf(cleAffichee);
  for (const cle of ligne.aussi) {
    const autre = modele.ordre.indexOf(cle);
    if (autre >= 0 && (rang < 0 || autre < rang)) {
      principal = cle;
      rang = autre;
    }
  }
  return principal;
}

/** Un nom est coché partout où il apparaît : seul son groupe principal en décide. */
export function ligneCochee(modele: ModeleDeSelection, ligne: Pick<LigneVue, 'id' | 'aussi'>, cleAffichee: string): boolean {
  if (modele.inclus.has(ligne.id)) return true;
  if (modele.exclus.has(ligne.id)) return false;
  return modele.coches.has(principalDe(modele, ligne, cleAffichee));
}

/**
 * Un groupe dont tous les noms sont exclus se décoche, un groupe dont tous les
 * noms sont inclus se coche : les cases suivent l'état réel plutôt qu'une liste.
 */
function normaliser(modele: ModeleDeSelection, cle: string): ModeleDeSelection {
  const total = totalDe(modele.tailles.get(cle));
  if (total === 0) return modele;
  if (modele.coches.has(cle)) return compterDans(modele.exclus, cle) >= total ? cocherGroupe(modele, cle, false) : modele;
  return compterDans(modele.inclus, cle) >= total ? cocherGroupe(modele, cle, true) : modele;
}

/** Coche ou décoche un nom, partout où il apparaît. */
export function cocherLigne(modele: ModeleDeSelection, ligne: Pick<LigneVue, 'id' | 'aussi'>, cleAffichee: string, coche: boolean): ModeleDeSelection {
  if (ligneCochee(modele, ligne, cleAffichee) === coche) return modele;
  const principal = principalDe(modele, ligne, cleAffichee);
  const exclus = new Map(modele.exclus);
  const inclus = new Map(modele.inclus);
  if (modele.coches.has(principal)) {
    if (coche) exclus.delete(ligne.id);
    else exclus.set(ligne.id, principal);
  } else if (coche) {
    inclus.set(ligne.id, principal);
  } else {
    inclus.delete(ligne.id);
  }
  return normaliser({ ...modele, exclus, inclus }, principal);
}

/** Un groupe coché auquel manquent des exclus, ou décoché qui porte des inclus, est partiel. */
export function etatDuGroupe(modele: ModeleDeSelection, cle: string): EtatDeCase {
  const total = totalDe(modele.tailles.get(cle));
  if (modele.coches.has(cle)) {
    const exclus = compterDans(modele.exclus, cle);
    if (exclus === 0) return 'coche';
    return exclus >= total ? 'vide' : 'partiel';
  }
  const inclus = compterDans(modele.inclus, cle);
  if (inclus === 0) return 'vide';
  return inclus >= total ? 'coche' : 'partiel';
}

function nomsDuGroupe(taille: TailleDeGroupe, coche: boolean, exclusOuInclus: number): TailleDeGroupe {
  const ecart = Math.min(exclusOuInclus, taille.variables + taille.collections);
  if (coche) {
    const retiresAuxVariables = Math.min(ecart, taille.variables);
    return { variables: taille.variables - retiresAuxVariables, collections: taille.collections - (ecart - retiresAuxVariables) };
  }
  const variables = Math.min(ecart, taille.variables);
  return { variables, collections: ecart - variables };
}

/** Le nombre de noms cochés dans un groupe, sans parcourir autre chose que ses exclus ou ses inclus. */
export function nombreCocheDuGroupe(modele: ModeleDeSelection, cle: string): number {
  const taille = modele.tailles.get(cle);
  if (!taille) return 0;
  const coche = modele.coches.has(cle);
  const noms = nomsDuGroupe(taille, coche, compterDans(coche ? modele.exclus : modele.inclus, cle));
  return noms.variables + noms.collections;
}

/**
 * Les noms cochés, séparés en variables et en collections. Une ligne est une
 * variable : les exclus et les inclus se comptent d'abord sur les variables du
 * groupe, puis sur ses collections.
 */
export function compterLesNomsCochesParSorte(modele: ModeleDeSelection): { readonly variables: number; readonly collections: number } {
  const exclus = compterParGroupe(modele.exclus);
  const inclus = compterParGroupe(modele.inclus);
  let variables = 0;
  let collections = 0;
  for (const [cle, taille] of modele.tailles) {
    const coche = modele.coches.has(cle);
    const noms = nomsDuGroupe(taille, coche, (coche ? exclus : inclus).get(cle) ?? 0);
    variables += noms.variables;
    collections += noms.collections;
  }
  return { variables, collections };
}

/** Les noms cochés, calculés depuis les totaux des groupes. */
export function compterLesNomsCoches(modele: ModeleDeSelection): number {
  const { variables, collections } = compterLesNomsCochesParSorte(modele);
  return variables + collections;
}

/** Après une application, les noms inclus ont été renommés ou sautés : leur case ne dit plus rien. */
export function oublierLesInclus(modele: ModeleDeSelection): ModeleDeSelection {
  return modele.inclus.size === 0 ? modele : { ...modele, inclus: new Map() };
}

/** Les identifiants que l'écran a envoyés à la lecture `selection`. */
export interface IdentifiantsInterroges { readonly exclus: readonly string[]; readonly inclus: readonly string[] }

const memesEntrees = (a: ReadonlyMap<string, string>, b: ReadonlyMap<string, string>): boolean =>
  a.size === b.size && [...a].every(([id, cle]) => b.get(id) === cle);

/**
 * Reporte la réponse de la lecture `selection` : un identifiant interrogé dont la réponse ne donne plus de groupe n'est plus à renommer,
 * et sort ; un identifiant passé dans un autre groupe y est rattaché. Une exclusion dont le nouveau groupe est décoché, une inclusion
 * dont il est coché, n'ont plus d'objet et sortent aussi. Les entrées que le designer a posées depuis la demande ne sont pas touchées.
 */
export function restreindre(modele: ModeleDeSelection, interroges: IdentifiantsInterroges, principaux: readonly (readonly [string, string])[]): ModeleDeSelection {
  const rendus = new Map(principaux);
  const interroge = new Set([...interroges.exclus, ...interroges.inclus]);
  const reporter = (entrees: ReadonlyMap<string, string>, utile: (cle: string) => boolean): ReadonlyMap<string, string> => {
    const suite = new Map<string, string>();
    for (const [id, cle] of entrees) {
      if (!interroge.has(id)) {
        suite.set(id, cle);
        continue;
      }
      const principal = rendus.get(id);
      if (principal !== undefined && modele.tailles.has(principal) && utile(principal)) suite.set(id, principal);
    }
    return memesEntrees(entrees, suite) ? entrees : suite;
  };
  const exclus = reporter(modele.exclus, (cle) => modele.coches.has(cle));
  const inclus = reporter(modele.inclus, (cle) => !modele.coches.has(cle));
  if (exclus === modele.exclus && inclus === modele.inclus) return modele;
  let restreint: ModeleDeSelection = { ...modele, exclus, inclus };
  for (const cle of new Set([...exclus.values(), ...inclus.values()])) restreint = normaliser(restreint, cle);
  return restreint;
}

/** La `Selection` que `appliquer` envoie. */
export function versSelection(modele: ModeleDeSelection): Selection {
  return {
    groupes: modele.ordre.filter((cle) => modele.coches.has(cle)),
    exclus: [...modele.exclus.keys()],
    inclus: [...modele.inclus.keys()],
  };
}
