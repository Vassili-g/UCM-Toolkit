/**
 * Les variables et les collections qu'une demande d'analyse lit par identifiant, une fois chacune.
 *
 * `creerMemoireDeRessources` rend une mémoire que le lecteur crée au début de sa demande et oublie à la fin : une
 * ressource refusée n'y survit pas, la demande suivante la relit et la trouve lisible si Figma la sert alors. La
 * mémoire garde la promesse de chaque identifiant, donc deux demandes simultanées pour une même variable ne font
 * qu'un appel natif, refus compris.
 *
 * Elle copie en `FaitDeRessource` les seuls champs que le lecteur nomme, plus `remote` pour l'origine. Elle ne lit
 * ni `valuesByMode` ni aucun alias : suivre un alias est l'affaire du lecteur, par un autre identifiant. Chaque
 * lecteur tire de ces faits son traitement du refus.
 */
import { lireUnChamp } from './acquisition';
import {
  MIXTE,
  acquis,
  refuse,
  type ChampsDeCollection,
  type ChampsDeVariable,
  type EtatEcrit,
  type FaitDeRessource,
  type ModeDeCollectionLu,
  type Origine,
  type TableDesChamps,
} from './faits';
import type { ContexteCooperatif } from '../contract/porteeDAnalyse';

export type ChampDeVariableCopie = 'key' | 'name' | 'variableCollectionId';
export type ChampDeCollectionCopie = 'name' | 'modes';

export type FaitDeVariable = FaitDeRessource<TableDesChamps<ChampsDeVariable>>;
export type FaitDeCollection = FaitDeRessource<TableDesChamps<ChampsDeCollection>>;

/** Les deux lectures natives que la mémoire appelle. Un nœud de test sans l'une d'elles lève à l'appel : refus `leve`. */
export interface LecturesDeRessources {
  getVariableByIdAsync(id: string): Promise<object | null>;
  getVariableCollectionByIdAsync(id: string): Promise<object | null>;
}

export interface OptionsDeLaMemoire {
  /** Les lectures, résolues à chaque appel : un lecteur qui lit `figma.variables` ne le fige pas à la création. */
  readonly lectures: () => LecturesDeRessources;
  /** Défaut : `key`, `name`, `variableCollectionId`. */
  readonly champsDeVariable?: readonly ChampDeVariableCopie[];
  /** Défaut : `name`, `modes`. */
  readonly champsDeCollection?: readonly ChampDeCollectionCopie[];
  /** Cède entre deux modes d'une collection : la copie d'une longue liste ne retient pas le sandbox. */
  readonly cooperation?: ContexteCooperatif;
  /** Vrai pour une erreur que la mémoire ne range pas en refus et laisse remonter, comme l'annulation d'une analyse. */
  readonly propager?: (erreur: unknown) => boolean;
}

export interface MemoireDeRessources {
  variable(id: string): Promise<FaitDeVariable>;
  collection(id: string): Promise<FaitDeCollection>;
}

/** La table pendant sa copie, avant qu'elle ne soit rendue en lecture seule. */
type Ecrivable<C> = { -readonly [K in keyof C]?: EtatEcrit<C[K]> };

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** Une chaîne (défaut) ou un booléen ; toute autre forme est mixte. Un champ de ressource n'a pas de mixte de Figma : c'est une forme inattendue. */
function lireUnTexte(objet: object, champ: string): EtatEcrit<string>;
function lireUnTexte(objet: object, champ: string, forme: 'boolean'): EtatEcrit<boolean>;
function lireUnTexte(objet: object, champ: string, forme: 'string' | 'boolean' = 'string'): EtatEcrit<string> | EtatEcrit<boolean> {
  const lu = lireUnChamp(objet, champ);
  if (lu.etat !== 'acquis') return lu;
  return typeof lu.valeur === forme ? (lu as EtatEcrit<string> | EtatEcrit<boolean>) : MIXTE;
}

async function copierLesModes(collection: object, cooperation: ContexteCooperatif | undefined): Promise<EtatEcrit<readonly ModeDeCollectionLu[]>> {
  let liste: unknown;
  try {
    liste = (collection as { modes?: unknown }).modes;
  } catch (erreur) {
    return refuse('leve', messageDErreur(erreur));
  }
  if (liste === undefined) return refuse('absent');
  if (!Array.isArray(liste)) return MIXTE;
  const modes: ModeDeCollectionLu[] = [];
  for (const mode of liste) {
    await cooperation?.cederSiBesoin();
    if (typeof mode !== 'object' || mode === null) return MIXTE;
    const { modeId, name, parentModeId } = mode as { modeId?: unknown; name?: unknown; parentModeId?: unknown };
    if (typeof modeId !== 'string' || typeof name !== 'string') return MIXTE;
    modes.push(typeof parentModeId === 'string' ? { modeId, name, parentModeId } : { modeId, name });
  }
  return acquis(modes);
}

function origineDe(table: { readonly remote?: EtatEcrit<boolean> }): Origine {
  const remote = table.remote;
  if (remote?.etat !== 'acquis') return 'inconnue';
  return remote.valeur ? 'distante' : 'locale';
}

export function creerMemoireDeRessources(options: OptionsDeLaMemoire): MemoireDeRessources {
  const variables = new Map<string, Promise<FaitDeVariable>>();
  const collections = new Map<string, Promise<FaitDeCollection>>();
  const champsDeVariable = options.champsDeVariable ?? (['key', 'name', 'variableCollectionId'] as const);
  const champsDeCollection = options.champsDeCollection ?? (['name', 'modes'] as const);

  async function lire<T extends object>(
    id: string,
    appel: 'getVariableByIdAsync' | 'getVariableCollectionByIdAsync',
    copier: (ressource: object) => Promise<{ table: T; origine: Origine }>,
  ): Promise<FaitDeRessource<T>> {
    const provenance = (origine: Origine) => ({ appel: { appel, id }, origine }) as const;
    let ressource: object | null;
    try {
      ressource = await options.lectures()[appel](id);
    } catch (erreur) {
      if (options.propager?.(erreur)) throw erreur;
      return { id, provenance: provenance('inconnue'), etat: refuse('leve', messageDErreur(erreur)) };
    }
    if (!ressource) return { id, provenance: provenance('inconnue'), etat: refuse('introuvable') };
    const { table, origine } = await copier(ressource);
    return { id, provenance: provenance(origine), etat: acquis(table) };
  }

  const memoriser = <F>(memoire: Map<string, Promise<F>>, id: string, lecture: () => Promise<F>): Promise<F> => {
    let promesse = memoire.get(id);
    if (!promesse) {
      promesse = lecture();
      memoire.set(id, promesse);
    }
    return promesse;
  };

  return {
    variable: (id) => memoriser(variables, id, () => lire(id, 'getVariableByIdAsync', async (variable) => {
      const table: Ecrivable<ChampsDeVariable> = {};
      for (const champ of champsDeVariable) table[champ] = lireUnTexte(variable, champ);
      table.remote = lireUnTexte(variable, 'remote', 'boolean');
      return { table, origine: origineDe(table) };
    })),
    collection: (id) => memoriser(collections, id, () => lire(id, 'getVariableCollectionByIdAsync', async (collection) => {
      const table: Ecrivable<ChampsDeCollection> = {};
      for (const champ of champsDeCollection) {
        if (champ === 'modes') table.modes = await copierLesModes(collection, options.cooperation);
        else table[champ] = lireUnTexte(collection, champ);
      }
      table.remote = lireUnTexte(collection, 'remote', 'boolean');
      return { table, origine: origineDe(table) };
    })),
  };
}
