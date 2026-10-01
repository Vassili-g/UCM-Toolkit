/**
 * L'index d'un relevé : chaque variable et collection par identifiant, la
 * collection qui déclare chaque mode, et les références inverses par mode.
 *
 * Une famille réunit une collection et ses extensions. Un contexte choisit un
 * mode par famille : le mode d'une extension remplace celui de sa base pour
 * toutes les variables de la famille.
 */
import type { CollectionRelevee, LectureManquee, Mode, Releve, VariableRelevee } from './modele';

/** Une référence entrante : `source` pointe la cible dans le mode `mode` de sa collection. */
export interface ReferenceEntrante {
  readonly source: string;
  readonly mode: string;
  /** La collection étendue qui porte la surcharge, quand l'alias en vient. */
  readonly surcharge?: string;
}

export interface Index {
  readonly releve: Releve;
  readonly variables: ReadonlyMap<string, VariableRelevee>;
  readonly collections: ReadonlyMap<string, CollectionRelevee>;
  /** La collection qui déclare chaque mode. */
  readonly collectionDuMode: ReadonlyMap<string, string>;
  /** Les membres de chaque collection, variables héritées d'une base comprises. */
  readonly membres: ReadonlyMap<string, ReadonlySet<string>>;
  readonly manquees: ReadonlyMap<string, LectureManquee>;
  /** Par cible, toutes les références entrantes, dans tous les modes chargés. */
  readonly entrantes: ReadonlyMap<string, readonly ReferenceEntrante[]>;
}

export function indexer(releve: Releve): Index {
  const variables = new Map(releve.variables.map((variable) => [variable.id, variable]));
  const collections = new Map(releve.collections.map((collection) => [collection.id, collection]));
  const collectionDuMode = new Map<string, string>();
  const membres = new Map<string, Set<string>>();
  for (const collection of releve.collections) {
    for (const mode of collection.modes) collectionDuMode.set(mode.id, collection.id);
    membres.set(collection.id, new Set(collection.variables));
  }
  const entrantes = new Map<string, ReferenceEntrante[]>();
  const ajouter = (cible: string, reference: ReferenceEntrante): void => {
    const liste = entrantes.get(cible);
    if (liste) liste.push(reference);
    else entrantes.set(cible, [reference]);
  };
  for (const variable of releve.variables) {
    for (const [mode, valeur] of Object.entries(variable.valeurs)) {
      if (valeur.nature === 'alias') ajouter(valeur.cible, { source: variable.id, mode });
    }
  }
  for (const collection of releve.collections) {
    if (!collection.extension) continue;
    for (const [source, parMode] of Object.entries(collection.extension.surcharges)) {
      for (const [mode, valeur] of Object.entries(parMode)) {
        if (valeur.nature === 'alias') ajouter(valeur.cible, { source, mode, surcharge: collection.id });
      }
    }
  }
  const manquees = new Map(releve.manquees.map((manquee) => [manquee.id, manquee]));
  return { releve, variables, collections, collectionDuMode, membres, manquees, entrantes };
}

/** La famille d'une collection : la racine de sa chaîne d'extensions, ou elle-même. */
export function familleDe(index: Index, collection: string): string {
  return index.collections.get(collection)?.extension?.racine ?? collection;
}

/** Les familles, dans l'ordre du relevé. */
export function familles(index: Index): CollectionRelevee[] {
  return index.releve.collections.filter((collection) => !collection.extension);
}

/** Un mode proposé pour une famille, avec la collection qui le déclare. */
export interface ModeDeFamille {
  readonly collection: CollectionRelevee;
  readonly mode: Mode;
}

/** Les modes qu'un contexte peut choisir pour une famille : ceux de la base, puis de chaque extension. */
export function modesDeFamille(index: Index, famille: string): ModeDeFamille[] {
  return index.releve.collections
    .filter((collection) => collection.id === famille || collection.extension?.racine === famille)
    .flatMap((collection) => collection.modes.map((mode) => ({ collection, mode })));
}

/** Vrai quand `collection` est `ancetre` ou l'une de ses extensions, à toute profondeur. */
export function descendDe(index: Index, collection: string, ancetre: string): boolean {
  let courante: string | undefined = collection;
  const vues = new Set<string>();
  while (courante && !vues.has(courante)) {
    if (courante === ancetre) return true;
    vues.add(courante);
    courante = index.collections.get(courante)?.extension?.parent;
  }
  return false;
}

/**
 * Les variables qui pointent directement la cible. `modes`, quand il est
 * donné, retient les seules références faites dans ces modes.
 */
export function dependantsDirects(index: Index, cible: string, modes?: ReadonlySet<string>): string[] {
  const references = index.entrantes.get(cible) ?? [];
  const retenues = modes ? references.filter((reference) => modes.has(reference.mode)) : references;
  return [...new Set(retenues.map((reference) => reference.source))];
}

/**
 * Les dépendants transitifs, en largeur, chacun avec sa distance à la cible.
 * Un graphe cyclique se parcourt une seule fois par variable.
 */
export function dependantsTransitifs(index: Index, cible: string, modes?: ReadonlySet<string>): Array<{ id: string; distance: number }> {
  const vus = new Map<string, number>([[cible, 0]]);
  const file = [cible];
  for (let rang = 0; rang < file.length; rang += 1) {
    const courant = file[rang];
    for (const source of dependantsDirects(index, courant, modes)) {
      if (vus.has(source)) continue;
      vus.set(source, (vus.get(courant) as number) + 1);
      file.push(source);
    }
  }
  vus.delete(cible);
  return [...vus].map(([id, distance]) => ({ id, distance }));
}
