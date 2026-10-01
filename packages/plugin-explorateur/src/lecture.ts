/**
 * La lecture des variables Figma, sans aucune mutation du document.
 *
 * Le sandbox passe un port qui n'expose que des lectures asynchrones : les
 * tests le remplacent par un double qui lève à tout setter, création ou
 * import. Les variables locales se lisent d'un appel ; chaque cible d'alias
 * absente du lot local se lit par identifiant, au plus `CONCURRENCE` à la
 * fois, et une lecture déjà faite ne se refait pas pendant l'analyse.
 *
 * Une cible que Figma ne rend pas reste « introuvable », une lecture qui lève
 * reste « refusée » : ni l'une ni l'autre n'est déclarée supprimée. Aucune
 * variable distante n'est importée pour compléter le relevé.
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

/** Lit toutes les variables accessibles et les cibles de leurs alias. */
export async function lireLeReleve(port: PortDeLecture, fichier: string, revision: number, suivi: SuiviDeLecture, horloge: () => number): Promise<IssueDeLecture> {
  const collections = new Map<string, CollectionRelevee>();
  const variables = new Map<string, VariableRelevee>();
  const manquees = new Map<string, LectureManquee>();
  let collectionsEtendues = false;

  suivi.progression?.('collections', 0, 1);
  for (const collection of await port.getLocalVariableCollectionsAsync()) {
    const convertie = convertirCollection(collection);
    if (convertie.extension) collectionsEtendues = true;
    collections.set(convertie.id, convertie);
  }
  if (suivi.annulee()) return { statut: 'annule' };

  // Une variable d'un type que ce plugin ne connaît pas est écartée une fois, sans relecture.
  const ecartees = new Set<string>();
  suivi.progression?.('variables', 0, 1);
  for (const variable of await port.getLocalVariablesAsync()) {
    const convertie = convertirVariable(variable);
    if (convertie) variables.set(convertie.id, convertie);
    else ecartees.add(variable.id);
  }
  if (suivi.annulee()) return { statut: 'annule' };

  // Les identifiants à lire : membres de collection et cibles d'alias absents du lot local.
  const demandes = new Map<string, Promise<void>>();
  const origine = new Map<string, string>();
  const aLire = (): string[] => {
    const manquants = new Set<string>();
    for (const collection of collections.values()) for (const id of collection.variables) if (!variables.has(id) && !demandes.has(id) && !ecartees.has(id)) manquants.add(id);
    const cibles = (valeurs: Readonly<Record<string, ValeurSource>>, depuis: string) => {
      for (const valeur of Object.values(valeurs)) {
        if (valeur.nature !== 'alias' || variables.has(valeur.cible) || demandes.has(valeur.cible) || ecartees.has(valeur.cible)) continue;
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

  const lireVariable = async (id: string): Promise<void> => {
    const depuis = origine.get(id);
    try {
      const variable = await port.getVariableByIdAsync(id);
      const convertie = variable ? convertirVariable(variable) : null;
      if (variable && !convertie) {
        ecartees.add(id);
        return;
      }
      if (!convertie) {
        manquees.set(id, { id, genre: 'variable', issue: 'introuvable', message: '', ...(depuis ? { depuis } : {}) });
        return;
      }
      variables.set(id, convertie);
      if (!collections.has(convertie.collection)) await lireCollection(convertie.collection, id);
    } catch (erreur) {
      manquees.set(id, { id, genre: 'variable', issue: 'refusee', message: messageDErreur(erreur), ...(depuis ? { depuis } : {}) });
    }
  };

  let faites = 0;
  for (let vague = aLire(); vague.length > 0; vague = aLire()) {
    for (const id of vague) demandes.set(id, Promise.resolve());
    const total = faites + vague.length;
    const complete = await parLots(vague, CONCURRENCE, async (id) => {
      await lireVariable(id);
      faites += 1;
      suivi.progression?.('references', faites, total);
    }, suivi.annulee);
    if (!complete) return { statut: 'annule' };
  }

  // Une collection de base qu'une extension locale vise peut être distante.
  for (const collection of [...collections.values()]) {
    if (collection.extension) await lireCollection(collection.extension.parent, collection.id);
  }
  if (suivi.annulee()) return { statut: 'annule' };

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
