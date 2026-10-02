/**
 * La lecture des variables Figma. Aucune variable ni collection locale n'est
 * créée ni modifiée.
 *
 * Le sandbox passe un port qui n'expose que des lectures asynchrones et
 * l'import d'une variable par sa clé : les tests le remplacent par un double
 * qui lève à tout setter et à toute création. Les variables locales se lisent
 * d'un appel ; chaque cible d'alias absente du lot local se lit par
 * identifiant, au plus `CONCURRENCE` à la fois, et une lecture déjà faite ne
 * se refait pas pendant l'analyse.
 *
 * Figma ne rend pas toujours par son identifiant une variable de bibliothèque
 * qu'un alias vise. Cet identifiant porte la clé publiée de la variable :
 * quand la lecture échoue, la variable s'importe par cette clé. L'import
 * abonne le fichier à la variable de la bibliothèque, sans créer de variable
 * locale. C'est le seul import du plugin, et il ne vise que la cible d'un
 * alias : celui d'une variable du fichier, ou d'une variable liée à un calque
 * du composant lu.
 *
 * Une cible que ni la lecture ni l'import ne rendent reste « introuvable »,
 * ou « refusée » quand la lecture a levé : elle n'est pas déclarée supprimée.
 */
import {
  FORMAT_DU_RELEVE,
  TYPES_DE_VARIABLE,
  type CollectionRelevee,
  type LectureManquee,
  type Mode,
  type Releve,
  type TypeDeVariable,
  type ValeurSource,
  type VariableRelevee,
} from './modele';
import type { ModeDeCalque } from './resolution';

/** Le nombre de lectures par identifiant en vol au même moment. */
export const CONCURRENCE = 8;

/** Ce que la lecture lit d'une variable Figma. */
export interface VariableFigma {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly key: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly variableCollectionId: string;
  readonly resolvedType: string;
  readonly scopes: readonly string[];
  readonly codeSyntax: Readonly<Record<string, string>>;
  readonly valuesByMode: Readonly<Record<string, unknown>>;
  /** La valeur que Figma rend sur un calque ; la vue composant la compare à sa chaîne. */
  resolveForConsumer?(consommateur: never): { value: unknown };
}

/** Ce que la lecture lit d'une collection Figma, étendue ou non. */
export interface CollectionFigma {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly isExtension?: boolean;
  readonly modes: ReadonlyArray<{ readonly modeId: string; readonly name: string; readonly parentModeId?: string }>;
  readonly defaultModeId: string;
  readonly variableIds: readonly string[];
  readonly parentVariableCollectionId?: string;
  readonly rootVariableCollectionId?: string;
  readonly variableOverrides?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

/** Le port de lecture : les seules méthodes de `figma.variables` que l'explorateur appelle. */
export interface PortDeLecture {
  getLocalVariableCollectionsAsync(): Promise<readonly CollectionFigma[]>;
  getLocalVariablesAsync(): Promise<readonly VariableFigma[]>;
  getVariableByIdAsync(id: string): Promise<VariableFigma | null>;
  getVariableCollectionByIdAsync(id: string): Promise<CollectionFigma | null>;
  /** Lève quand la bibliothèque ne publie plus la clé, ou que le designer n'y a pas accès. */
  importVariableByKeyAsync(cle: string): Promise<VariableFigma>;
}

/**
 * La clé publiée que porte l'identifiant d'une variable de bibliothèque,
 * `VariableID:<clé>/<node>`. Un identifiant local, `VariableID:<node>`, n'en
 * porte pas.
 */
export function cleDeBibliotheque(id: string): string | null {
  return /^VariableID:([^/:]+)\//.exec(id)?.[1] ?? null;
}

export type PhaseDeLecture = 'collections' | 'variables' | 'references';

export interface SuiviDeLecture {
  /** Appelée entre deux lots : vrai arrête la lecture sans publier de résultat. */
  readonly annulee: () => boolean;
  readonly progression?: (phase: PhaseDeLecture, fait: number, total: number) => void;
}

export type IssueDeLecture = { readonly statut: 'lu'; readonly releve: Releve } | { readonly statut: 'annule' };

/**
 * Convertit une valeur rangée par Figma. Une forme inconnue garde son JSON,
 * sans coercition vers un type voisin.
 */
export function convertirValeur(brute: unknown): ValeurSource {
  if (typeof brute === 'boolean') return { nature: 'booleen', booleen: brute };
  if (typeof brute === 'number') return Number.isFinite(brute) ? { nature: 'nombre', nombre: brute } : { nature: 'non-prise-en-charge', brut: String(brute) };
  if (typeof brute === 'string') return { nature: 'texte', texte: brute };
  if (brute && typeof brute === 'object') {
    const objet = brute as Record<string, unknown>;
    if (objet.type === 'VARIABLE_ALIAS' && typeof objet.id === 'string' && Object.keys(objet).every((cle) => cle === 'type' || cle === 'id')) {
      return { nature: 'alias', cible: objet.id };
    }
    // Un alias de couleur avec opacité : Figma range la cible sous `color` et l'opacité à côté.
    const cible = objet.color as Record<string, unknown> | null | undefined;
    if (
      cible && typeof cible === 'object' && cible.type === 'VARIABLE_ALIAS' && typeof cible.id === 'string' &&
      Object.keys(cible).every((cle) => cle === 'type' || cle === 'id') &&
      typeof objet.opacity === 'number' && objet.opacity >= 0 && objet.opacity <= 1 &&
      Object.keys(objet).every((cle) => cle === 'color' || cle === 'opacity')
    ) {
      return { nature: 'alias', cible: cible.id, opacite: objet.opacity };
    }
    const composantes = ['r', 'g', 'b'].map((cle) => objet[cle]);
    if (composantes.every((composante) => typeof composante === 'number') && (objet.a === undefined || typeof objet.a === 'number')) {
      const [r, g, b] = composantes as number[];
      return { nature: 'couleur', couleur: { r, g, b, a: (objet.a as number | undefined) ?? 1 } };
    }
    if (typeof objet.type === 'string' && /^(EASE|LINEAR|CUSTOM)/.test(objet.type)) return { nature: 'courbe', courbe: JSON.stringify(brute) };
  }
  let brut: string;
  try {
    brut = JSON.stringify(brute) ?? String(brute);
  } catch {
    brut = String(brute);
  }
  return { nature: 'non-prise-en-charge', brut };
}

function typeDeVariable(brut: string): TypeDeVariable | null {
  return (TYPES_DE_VARIABLE as readonly string[]).includes(brut) ? (brut as TypeDeVariable) : null;
}

function convertirValeurs(valeurs: Readonly<Record<string, unknown>>): Record<string, ValeurSource> {
  return Object.fromEntries(Object.entries(valeurs).map(([mode, valeur]) => [mode, convertirValeur(valeur)]));
}

export function convertirVariable(variable: VariableFigma): VariableRelevee | null {
  const type = typeDeVariable(variable.resolvedType);
  if (!type) return null;
  return {
    id: variable.id,
    nom: variable.name,
    description: variable.description ?? '',
    cle: variable.key || null,
    distante: variable.remote,
    masqueeALaPublication: variable.hiddenFromPublishing,
    collection: variable.variableCollectionId,
    type,
    portees: [...(variable.scopes ?? [])],
    syntaxe: { ...(variable.codeSyntax ?? {}) },
    valeurs: convertirValeurs(variable.valuesByMode ?? {}),
  };
}

export function convertirCollection(collection: CollectionFigma): CollectionRelevee {
  const modes: Mode[] = collection.modes.map((mode) => ({ id: mode.modeId, nom: mode.name, ...(mode.parentModeId ? { parent: mode.parentModeId } : {}) }));
  const etendue = collection.isExtension === true && typeof collection.parentVariableCollectionId === 'string';
  return {
    id: collection.id,
    nom: collection.name,
    cle: collection.key || null,
    distante: collection.remote,
    masqueeALaPublication: collection.hiddenFromPublishing,
    modes,
    modeParDefaut: collection.defaultModeId,
    variables: [...collection.variableIds],
    extension: etendue
      ? {
          parent: collection.parentVariableCollectionId as string,
          racine: collection.rootVariableCollectionId ?? (collection.parentVariableCollectionId as string),
          surcharges: Object.fromEntries(Object.entries(collection.variableOverrides ?? {}).map(([variable, valeurs]) => [variable, convertirValeurs(valeurs)])),
        }
      : null,
  };
}

/** Par collection, l'identifiant que `separerLesModes` a donné à chaque mode renommé. */
export type TableDesModes = ReadonlyMap<string, ReadonlyMap<string, string>>;

/**
 * Les modes d'un calque, par collection, avec les identifiants du relevé. Un
 * mode que la table ne renomme pas garde le sien.
 */
export function traduireLesModes(table: TableDesModes, modes: Readonly<Record<string, ModeDeCalque>>): Record<string, ModeDeCalque> {
  return Object.fromEntries(Object.entries(modes).map(([collection, mode]) => [collection, { ...mode, mode: table.get(collection)?.get(mode.mode) ?? mode.mode }]));
}

/**
 * Rend unique l'identifiant de chaque mode du relevé.
 *
 * Figma numérote les modes par fichier : le mode d'une bibliothèque peut
 * porter l'identifiant d'un mode local, ou celui d'une autre bibliothèque. Le
 * relevé désigne un mode par ce seul identifiant. Quand plusieurs collections
 * déclarent le même, la collection locale le garde, et chaque collection
 * distante le reçoit préfixé de son propre identifiant, dans ses modes, son
 * défaut, ses surcharges et les valeurs de ses variables.
 *
 * La table rendue donne, par collection, le nouvel identifiant de chaque mode
 * renommé. Les modes qu'un calque porte se lisent avec les identifiants de
 * Figma : `traduireLesModes` leur applique cette table avant toute résolution.
 */
export function separerLesModes(collections: Map<string, CollectionRelevee>, variables: Map<string, VariableRelevee>): TableDesModes {
  const declarantes = new Map<string, string[]>();
  for (const collection of collections.values()) {
    for (const mode of collection.modes) declarantes.set(mode.id, [...(declarantes.get(mode.id) ?? []), collection.id]);
  }
  const renommes = new Map<string, Map<string, string>>();
  for (const [mode, ids] of declarantes) {
    if (ids.length < 2) continue;
    for (const id of ids) {
      if (!collections.get(id)?.distante) continue;
      const table = renommes.get(id) ?? new Map<string, string>();
      table.set(mode, `${id}/${mode}`);
      renommes.set(id, table);
    }
  }
  if (renommes.size === 0) return renommes;

  const renommer = <V>(parMode: Readonly<Record<string, V>>, table: ReadonlyMap<string, string>): Record<string, V> =>
    Object.fromEntries(Object.entries(parMode).map(([mode, valeur]) => [table.get(mode) ?? mode, valeur]));

  for (const collection of [...collections.values()]) {
    const propres = renommes.get(collection.id);
    const duParent = collection.extension ? renommes.get(collection.extension.parent) : undefined;
    if (!propres && !duParent) continue;
    collections.set(collection.id, {
      ...collection,
      modes: collection.modes.map((mode) => ({
        id: propres?.get(mode.id) ?? mode.id,
        nom: mode.nom,
        ...(mode.parent === undefined ? {} : { parent: duParent?.get(mode.parent) ?? mode.parent }),
      })),
      modeParDefaut: propres?.get(collection.modeParDefaut) ?? collection.modeParDefaut,
      extension:
        collection.extension && propres
          ? { ...collection.extension, surcharges: Object.fromEntries(Object.entries(collection.extension.surcharges).map(([variable, parMode]) => [variable, renommer(parMode, propres)])) }
          : collection.extension,
    });
  }
  for (const variable of [...variables.values()]) {
    const table = renommes.get(variable.collection);
    if (table) variables.set(variable.id, { ...variable, valeurs: renommer(variable.valeurs, table) });
  }
  return renommes;
}

/** Exécute `taches` au plus `limite` à la fois, en vérifiant l'annulation entre chaque tâche. */
async function parLots<T>(elements: readonly T[], limite: number, tache: (element: T) => Promise<void>, annulee: () => boolean): Promise<boolean> {
  let suivant = 0;
  let arrete = false;
  const ouvrier = async (): Promise<void> => {
    while (suivant < elements.length) {
      if (annulee()) {
        arrete = true;
        return;
      }
      const element = elements[suivant];
      suivant += 1;
      await tache(element);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, elements.length) }, ouvrier));
  return !arrete && !annulee();
}

/** Le message d'une lecture qui lève, sans pile ni détail interne. */
function messageDErreur(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}

/** Ce qu'une lecture accumule, par identifiant. */
export interface VariablesLues {
  readonly collections: Map<string, CollectionRelevee>;
  readonly variables: Map<string, VariableRelevee>;
  readonly manquees: Map<string, LectureManquee>;
  /** Les variables d'un type que ce plugin ne connaît pas : écartées une fois, sans relecture. */
  readonly ecartees: Set<string>;
}

export interface OptionsDeLecture {
  /** Ce qu'une lecture précédente a déjà rangé, et que celle-ci complète. */
  readonly lues?: VariablesLues;
  /** Vrai pour lire aussi les membres de chaque collection absents du lot, et non les seules cibles d'alias. */
  readonly membres?: boolean;
  /** Reçoit chaque variable de départ telle que Figma la rend, avant sa conversion. */
  readonly auDepart?: (id: string, variable: VariableFigma) => void;
}

/**
 * Lit les variables de `departs`, puis, par vagues, les cibles de leurs alias
 * et leurs collections. Un départ se lit par `getVariableByIdAsync` seul :
 * une variable liée à un calque ne s'importe jamais. Une cible d'alias que
 * cette lecture ne rend pas s'importe par la clé de son identifiant.
 *
 * Rend `null` quand la lecture est annulée.
 */
export async function lireLesVariables(port: PortDeLecture, departs: readonly string[], suivi: SuiviDeLecture, options: OptionsDeLecture = {}): Promise<VariablesLues | null> {
  const lues: VariablesLues = options.lues ?? { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set() };
  const { collections, variables, manquees, ecartees } = lues;

  // Les identifiants à lire : cibles d'alias absentes du lot, et membres de collection quand ils sont demandés.
  const demandes = new Set<string>();
  const origine = new Map<string, string>();
  const connue = (id: string): boolean => variables.has(id) || demandes.has(id) || ecartees.has(id);
  const aLire = (): string[] => {
    const manquants = new Set<string>();
    if (options.membres) for (const collection of collections.values()) for (const id of collection.variables) if (!connue(id)) manquants.add(id);
    const cibles = (valeurs: Readonly<Record<string, ValeurSource>>, depuis: string) => {
      for (const valeur of Object.values(valeurs)) {
        if (valeur.nature !== 'alias' || connue(valeur.cible)) continue;
        manquants.add(valeur.cible);
        if (!origine.has(valeur.cible)) origine.set(valeur.cible, depuis);
      }
    };
    for (const variable of variables.values()) cibles(variable.valeurs, variable.id);
    for (const collection of collections.values()) for (const [id, valeurs] of Object.entries(collection.extension?.surcharges ?? {})) cibles(valeurs, id);
    return [...manquants];
  };

  const lireCollection = async (id: string, depuis: string): Promise<void> => {
    if (collections.has(id) || manquees.has(id)) return;
    try {
      const collection = await port.getVariableCollectionByIdAsync(id);
      if (collection) collections.set(id, convertirCollection(collection));
      else manquees.set(id, { id, genre: 'collection', issue: 'introuvable', message: '', depuis });
    } catch (erreur) {
      manquees.set(id, { id, genre: 'collection', issue: 'refusee', message: messageDErreur(erreur), depuis });
    }
  };

  /** La variable importée par la clé de son identifiant, ou `null` sans clé ou quand l'import lève. */
  const importer = async (id: string): Promise<VariableFigma | null> => {
    const cle = cleDeBibliotheque(id);
    if (cle === null) return null;
    try {
      return await port.importVariableByKeyAsync(cle);
    } catch {
      return null;
    }
  };

  const lireVariable = async (id: string, importable: boolean): Promise<void> => {
    const depuis = origine.get(id);
    let variable: VariableFigma | null = null;
    let refus: string | null = null;
    try {
      variable = await port.getVariableByIdAsync(id);
    } catch (erreur) {
      refus = messageDErreur(erreur);
    }
    if (importable) variable ??= await importer(id);
    else if (variable) options.auDepart?.(id, variable);
    if (!variable) {
      manquees.set(id, { id, genre: 'variable', issue: refus === null ? 'introuvable' : 'refusee', message: refus ?? '', ...(depuis ? { depuis } : {}) });
      return;
    }
    const convertie = convertirVariable(variable);
    if (!convertie) {
      ecartees.add(id);
      return;
    }
    // L'alias vise `id` : la variable se range sous cet identifiant, même si l'import en rend un autre.
    variables.set(id, { ...convertie, id });
    if (!collections.has(convertie.collection)) await lireCollection(convertie.collection, id);
  };

  let faites = 0;
  const lireLaVague = async (vague: readonly string[], importable: boolean): Promise<boolean> => {
    for (const id of vague) demandes.add(id);
    const total = faites + vague.length;
    return parLots(vague, CONCURRENCE, async (id) => {
      await lireVariable(id, importable);
      faites += 1;
      suivi.progression?.('references', faites, total);
    }, suivi.annulee);
  };

  const premiers = [...new Set(departs)].filter((id) => !connue(id));
  if (premiers.length > 0 && !(await lireLaVague(premiers, false))) return null;
  for (let vague = aLire(); vague.length > 0; vague = aLire()) {
    if (!(await lireLaVague(vague, true))) return null;
  }
  return lues;
}

/** Lit la collection de base d'une extension quand elle manque au lot : elle peut être distante. */
async function lireLesBasesDesExtensions(port: PortDeLecture, { collections, manquees }: VariablesLues): Promise<void> {
  for (const collection of [...collections.values()]) {
    const parent = collection.extension?.parent;
    if (parent === undefined || collections.has(parent) || manquees.has(parent)) continue;
    try {
      const lue = await port.getVariableCollectionByIdAsync(parent);
      if (lue) collections.set(parent, convertirCollection(lue));
      else manquees.set(parent, { id: parent, genre: 'collection', issue: 'introuvable', message: '', depuis: collection.id });
    } catch (erreur) {
      manquees.set(parent, { id: parent, genre: 'collection', issue: 'refusee', message: messageDErreur(erreur), depuis: collection.id });
    }
  }
}

/** Lit toutes les variables accessibles et les cibles de leurs alias. */
export async function lireLeReleve(port: PortDeLecture, fichier: string, revision: number, suivi: SuiviDeLecture, horloge: () => number): Promise<IssueDeLecture> {
  const lues: VariablesLues = { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set() };
  const { collections, variables, manquees, ecartees } = lues;
  let collectionsEtendues = false;

  suivi.progression?.('collections', 0, 1);
  for (const collection of await port.getLocalVariableCollectionsAsync()) {
    const convertie = convertirCollection(collection);
    if (convertie.extension) collectionsEtendues = true;
    collections.set(convertie.id, convertie);
  }
  if (suivi.annulee()) return { statut: 'annule' };

  suivi.progression?.('variables', 0, 1);
  for (const variable of await port.getLocalVariablesAsync()) {
    const convertie = convertirVariable(variable);
    if (convertie) variables.set(convertie.id, convertie);
    else ecartees.add(variable.id);
  }
  if (suivi.annulee()) return { statut: 'annule' };

  if (!(await lireLesVariables(port, [], suivi, { lues, membres: true }))) return { statut: 'annule' };
  await lireLesBasesDesExtensions(port, lues);
  if (suivi.annulee()) return { statut: 'annule' };

  separerLesModes(collections, variables);

  const releve: Releve = {
    format: FORMAT_DU_RELEVE,
    revision,
    fichier,
    luA: horloge(),
    collections: [...collections.values()],
    variables: [...variables.values()],
    manquees: [...manquees.values()],
    capacites: { collectionsEtendues, variablesDistantes: [...variables.values()].some((variable) => variable.distante) },
  };
  return { statut: 'lu', releve };
}
