/**
 * Crée dans le fichier des tokens les variables d'une préparation. `creerUneVariableAliasee`, qu'elle partage avec la création
 * des variables de C82 (`structure.ts`), est le seul appel à `createVariable` d'Architect.
 *
 * Le fichier doit déclarer UCM (`hors-ucm` sinon) et porter une collection `theme` locale, que les variables visent
 * (`sans-cibles` sinon). La destination est la collection locale `components` : une seule, sinon l'appelant choisit
 * (`destination-ambigue`, avec `collections`) ; aucune, rien n'est créé (`sans-destination`). Aucun refus n'écrit quoi que ce soit.
 *
 * Une préparation nomme variables et cibles par leur chemin complet, collection en tête (`components/Button/color/background`,
 * `theme/primary/default/background`) ; Figma écrit le nom sans la collection. La variable créée porte donc le chemin moins son
 * premier segment (`nomDansFigma`), et une cible se retrouve par `cheminComplet` de chaque variable locale de sa collection.
 *
 * Chaque variable de la préparation reçoit un état d'après le fichier, jamais d'après un essai précédent : une variable déjà là
 * qui vise les mêmes cibles dans chaque mode est `existe-identique` ; si elle vise autre chose, elle est `existe-divergente` et
 * reste telle quelle tant que `reponses['existante:<nom>']` ne vaut pas `garder` (elle est comptée gardée) ou `remplacer` (ses alias
 * sont réécrits, état `creee`). Une variable absente est créée, alias compris, puis `creee`. Une création interrompue se reprend
 * donc sans doublon. Une variable dont la cible ou le mode manque, ou dont l'écriture lève, est `echec` ; les autres s'écrivent.
 *
 * Les variables créées et les alias réécrits entrent ensemble dans le journal de structure (`journal.ts`), après les écritures,
 * puis un seul point d'annulation se pose. `journal: false` dit que le fichier n'a pas pu garder le journal : les écritures
 * existent alors sans annulation possible.
 */
import { cheminComplet, nomDansFigma } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, collectionUcmReconnue, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { COUCHE_DES_COMPOSANTS, COUCHE_DES_COULEURS, COUCHE_DES_TAILLES, type EtatDeVariable, type PreparationRangee, type VariablePreparee } from '../preparations';
import {
  identifiantDeLot, journaliserLesCreations, nettoyerLeJournalDeStructure, rangerLeJournalDeStructure,
  type CreationJournal, type LigneDeStructure, type OptionsDuJournal, type PortDeRegles,
} from './journal';
import { creerPortDeRegles } from './noms';

export type MotifDeRefusDeCreation = 'hors-ucm' | 'sans-cibles' | 'sans-destination' | 'destination-ambigue' | 'destination-inconnue' | 'lecture';
export type MotifDEchecDeCreation = 'mode-sans-cible' | 'cible-introuvable' | 'type-incompatible' | 'valeur-non-alias' | 'erreur';

export interface CollectionDeDestination { readonly id: string; readonly nom: string }

export interface ResultatDeCreation {
  readonly refus: MotifDeRefusDeCreation | null;
  /** Les collections `components` locales, quand le choix est à faire. */
  readonly collections: readonly CollectionDeDestination[];
  /** L'état de chaque variable de la préparation, par nom ; vide quand l'écriture est refusée. */
  readonly etats: Readonly<Record<string, EtatDeVariable>>;
  readonly echecs: readonly { readonly nom: string; readonly motif: MotifDEchecDeCreation }[];
  /** Les variables existantes qui visent autre chose, sans réponse : `vise` est la cible que la préparation voulait. */
  readonly divergentes: readonly { readonly nom: string; readonly vise: string }[];
  readonly creees: number;
  readonly remplacees: number;
  /** Les variables déjà là : identiques, ou divergentes que la réponse a fait garder. */
  readonly gardees: number;
  /** Les variables que ce passage n'a pas réglées : échecs et divergentes sans réponse. */
  readonly sautees: number;
  readonly journal: boolean;
}

export interface CollectionEcrivable {
  readonly id: string;
  readonly name: string;
  readonly remote?: boolean;
  readonly modes: readonly { readonly modeId: string; readonly name: string }[];
}

/** Ce que `creerUneVariableAliasee` demande à une variable : celle d'une préparation et celle d'une correction de structure la portent. */
export interface VariableAliasable {
  readonly id: string;
  readonly name: string;
  scopes: string[];
  setValueForMode(mode: string, valeur: unknown): void;
  remove(): void;
}

export interface VariableCreable extends VariableAliasable {
  readonly resolvedType: string;
  readonly variableCollectionId: string;
  readonly remote?: boolean;
  readonly valuesByMode: Readonly<Record<string, unknown>>;
}

/** Ce que la création demande à Figma : les doubles des tests le remplacent. */
export interface ApiDeVariables {
  readonly root: { getSharedPluginData(espace: string, cle: string): string };
  readonly variables: {
    getLocalVariableCollectionsAsync(): Promise<readonly CollectionEcrivable[]>;
    getLocalVariablesAsync(): Promise<readonly VariableCreable[]>;
    createVariable(nom: string, collection: CollectionEcrivable, type: string): VariableCreable;
    createVariableAlias(variable: VariableCreable): unknown;
  };
  commitUndo(): void;
}

export interface OptionsDeCreation extends OptionsDuJournal {
  readonly api?: ApiDeVariables;
  readonly stockage?: PortDeRegles;
  /** L'identifiant de la collection `components` choisie, quand le fichier en porte plusieurs. */
  readonly collection?: string;
  /** Les réponses, par `existante:<nom>` : `garder` ou `remplacer`. */
  readonly reponses?: Readonly<Record<string, string>>;
}

const apiDeFigma = (): ApiDeVariables => figma as unknown as ApiDeVariables;
const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null;

/** L'identifiant visé par un alias exact ; `null` pour une autre valeur. */
function aliasVise(valeur: unknown): string | null {
  return estUnObjet(valeur) && valeur.type === 'VARIABLE_ALIAS' && typeof valeur.id === 'string' ? valeur.id : null;
}

const refus = (motif: MotifDeRefusDeCreation, collections: readonly CollectionDeDestination[] = []): ResultatDeCreation =>
  ({ refus: motif, collections, etats: {}, echecs: [], divergentes: [], creees: 0, remplacees: 0, gardees: 0, sautees: 0, journal: true });

/** La cible de chaque mode de la destination : celle du mode du même nom, sinon la cible unique de la préparation. */
function ciblesParMode(variable: VariablePreparee, destination: CollectionEcrivable): Map<string, string> | null {
  const distinctes = new Set(Object.values(variable.cibles));
  const parMode = new Map<string, string>();
  for (const mode of destination.modes) {
    const nom = variable.cibles[mode.name] ?? (distinctes.size === 1 ? [...distinctes][0] : undefined);
    if (nom === undefined) return null;
    parMode.set(mode.modeId, nom);
  }
  return parMode;
}

/**
 * Crée une couleur aliasée par mode et pose ses scopes ; rend la variable créée. Sans `scopes`, ceux que Figma donne restent.
 * `type` ne change que pour une préparation de tailles. Une écriture qui lève après la création retire la variable : une variable à moitié écrite ne reste pas.
 */
export function creerUneVariableAliasee<V extends VariableAliasable>(
  api: { readonly variables: { createVariable(nom: string, collection: CollectionEcrivable, type: string): V; createVariableAlias(variable: V): unknown } },
  collection: CollectionEcrivable, nom: string, alias: Readonly<Record<string, V>>, scopes?: readonly string[], type = 'COLOR',
): V {
  const creee = api.variables.createVariable(nom, collection, type);
  try {
    for (const [mode, cible] of Object.entries(alias)) creee.setValueForMode(mode, api.variables.createVariableAlias(cible));
    if (scopes) creee.scopes = [...scopes];
  } catch (erreur) {
    try { creee.remove(); } catch { /* retirée à la main */ }
    throw erreur;
  }
  return creee;
}

export async function creerLesVariables(preparation: PreparationRangee, options: OptionsDeCreation = {}): Promise<ResultatDeCreation> {
  const api = options.api ?? apiDeFigma();
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') return refus('hors-ucm');
  let collections: readonly CollectionEcrivable[];
  let locales: VariableCreable[];
  try {
    collections = (await api.variables.getLocalVariableCollectionsAsync()).filter((collection) => !collection.remote);
    locales = [...await api.variables.getLocalVariablesAsync()];
  } catch {
    return refus('lecture');
  }
  const roleDe = new Map(collections.map((collection) => [collection.id, collectionUcmReconnue(collection.name)] as const));
  if (!collections.some((collection) => roleDe.get(collection.id) === COUCHE_DES_COULEURS)) return refus('sans-cibles');
  const candidates = collections.filter((collection) => roleDe.get(collection.id) === COUCHE_DES_COMPOSANTS);
  if (candidates.length === 0) return refus('sans-destination');
  const choix = candidates.map(({ id, name }) => ({ id, nom: name }));
  let destination: CollectionEcrivable | undefined = candidates[0];
  if (options.collection !== undefined) {
    destination = candidates.find((collection) => collection.id === options.collection);
    if (!destination) return refus('destination-inconnue', choix);
  } else if (candidates.length > 1) {
    return refus('destination-ambigue', choix);
  }

  const collectionDe = new Map(collections.map((collection) => [collection.id, { nom: collection.name, role: roleDe.get(collection.id) ?? null }] as const));
  const cheminDe = (variable: VariableAliasable & { readonly variableCollectionId: string }): string =>
    cheminComplet(variable.name, collectionDe.get(variable.variableCollectionId) ?? { nom: '', role: null });
  const cibles = new Map<string, VariableCreable>();
  for (const variable of locales) {
    const role = roleDe.get(variable.variableCollectionId);
    if (role !== COUCHE_DES_COULEURS && role !== COUCHE_DES_TAILLES) continue;
    const chemin = cheminDe(variable);
    if (!cibles.has(chemin)) cibles.set(chemin, variable);
  }

  const etats: Record<string, EtatDeVariable> = {};
  const echecs: { nom: string; motif: MotifDEchecDeCreation }[] = [];
  const divergentes: { nom: string; vise: string }[] = [];
  const creations: CreationJournal[] = [];
  const remplacements: LigneDeStructure[] = [];
  let remplacees = 0;
  let gardees = 0;
  const echec = (nom: string, motif: MotifDEchecDeCreation): void => { etats[nom] = 'echec'; echecs.push({ nom, motif }); };

  for (const entree of preparation.variables) {
    const parMode = ciblesParMode(entree, destination);
    if (!parMode) { echec(entree.nom, 'mode-sans-cible'); continue; }
    const visees = new Map<string, VariableCreable>();
    let manquante = false;
    for (const [mode, nom] of parMode) {
      const cible = cibles.get(nom);
      if (!cible) { manquante = true; break; }
      visees.set(mode, cible);
    }
    if (manquante) { echec(entree.nom, 'cible-introuvable'); continue; }
    if ([...visees.values()].some((cible) => cible.resolvedType !== entree.type)) { echec(entree.nom, 'type-incompatible'); continue; }

    const existante = locales.find((variable) => variable.variableCollectionId === destination.id && cheminDe(variable) === entree.nom);
    if (existante) {
      const identique = existante.resolvedType === entree.type && [...visees].every(([mode, cible]) => aliasVise(existante.valuesByMode[mode]) === cible.id);
      if (identique) { etats[entree.nom] = 'existe-identique'; gardees += 1; continue; }
      const reponse = options.reponses?.[`existante:${entree.nom}`];
      if (reponse === 'garder') { etats[entree.nom] = 'existe-divergente'; gardees += 1; continue; }
      if (reponse !== 'remplacer') {
        etats[entree.nom] = 'existe-divergente';
        divergentes.push({ nom: entree.nom, vise: [...parMode.values()][0] });
        continue;
      }
      if (existante.resolvedType !== entree.type) { echec(entree.nom, 'type-incompatible'); continue; }
      const changements: { mode: string; avant: string; cible: VariableCreable }[] = [];
      let nonAlias = false;
      for (const [mode, cible] of visees) {
        const avant = aliasVise(existante.valuesByMode[mode]);
        if (avant === cible.id) continue;
        if (avant === null) nonAlias = true;
        else changements.push({ mode, avant, cible });
      }
      // L'annulation remet un alias d'avant : une valeur qui n'en est pas un ne se journalise pas.
      if (nonAlias || changements.length === 0) { echec(entree.nom, 'valeur-non-alias'); continue; }
      try {
        for (const { mode, avant, cible } of changements) {
          existante.setValueForMode(mode, api.variables.createVariableAlias(cible));
          remplacements.push({ sorte: 'alias-de-mode', variable: existante.id, nom: existante.name, mode, avant, apres: cible.id });
        }
        etats[entree.nom] = 'creee';
        remplacees += 1;
      } catch {
        echec(entree.nom, 'erreur');
      }
      continue;
    }

    try {
      const creee = creerUneVariableAliasee(api, destination, nomDansFigma(entree.nom), Object.fromEntries(visees), undefined, entree.type);
      locales.push(creee);
      creations.push({ variable: creee.id, nom: creee.name, collection: destination.id });
      etats[entree.nom] = 'creee';
    } catch {
      // Une variable à moitié écrite ne reste pas : la reprise la crée de nouveau.
      echec(entree.nom, 'erreur');
    }
  }

  let journal = true;
  if (creations.length > 0 || remplacements.length > 0) {
    const stockage = options.stockage ?? creerPortDeRegles(figma);
    if (remplacements.length === 0) {
      journal = journaliserLesCreations(stockage, creations, options);
    } else {
      const heure = (options.heure ?? ((): string => new Date().toISOString()))();
      const lignes: LigneDeStructure[] = [...creations.map(({ variable, nom, collection }): LigneDeStructure => ({ sorte: 'creation', variable, nom, collection })), ...remplacements];
      const lot = rangerLeJournalDeStructure(stockage, { heure, lignes }, (options.lot ?? identifiantDeLot)());
      journal = lot !== undefined;
      if (lot) nettoyerLeJournalDeStructure(stockage, lot.cles);
    }
    try {
      api.commitUndo();
    } catch {
      // Les écritures sont faites : un point d'annulation refusé ne les retire pas.
    }
  }
  return {
    refus: null, collections: [], etats, echecs, divergentes, creees: creations.length, remplacees, gardees,
    sautees: echecs.length + divergentes.length, journal,
  };
}
