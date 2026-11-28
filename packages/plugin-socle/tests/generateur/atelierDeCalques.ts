/**
 * Les doubles de Figma neutres du banc : des objets en lecture seule, que le générateur commun et les tests des plugins partagent.
 * Toute affectation lève, tout appel hors de la liste des lectures permises lève. Le port de lecture permet un seul import, celui
 * d'une variable par sa clé. Les types de ports sont ceux de la lecture de Figma, sans rien emprunter à un plugin : un plugin
 * précise les siens par les paramètres de type d'`atelierDeCalques`.
 */

/** Un calque tel que l'atelier le rend ; un plugin le précise par son propre type. */
export interface NoeudDeFigma {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly parent: NoeudDeFigma | null;
  readonly children?: readonly NoeudDeFigma[];
}

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
  resolveForConsumer?(consommateur: never): { value: unknown };
}

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

export interface StyleDeFigma {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly boundVariables?: unknown;
}

/** Le port de lecture d'un composant : calques, styles et variables, sur les données de l'atelier. */
export interface PortDuCalque<N, S> {
  selection(): readonly N[];
  getNodeByIdAsync(id: string): Promise<N | null>;
  getStyleByIdAsync(id: string): Promise<S | null>;
  readonly variables: PortDeLecture;
  /** Rend la main au moteur de Figma entre deux lots. */
  pause(): Promise<void>;
}

export interface PortDeLecture {
  getLocalVariableCollectionsAsync(): Promise<readonly CollectionFigma[]>;
  getLocalVariablesAsync(): Promise<readonly VariableFigma[]>;
  getVariableByIdAsync(id: string): Promise<VariableFigma | null>;
  getVariableCollectionByIdAsync(id: string): Promise<CollectionFigma | null>;
  importVariableByKeyAsync(cle: string): Promise<VariableFigma>;
}

export class MutationInterdite extends Error {}

/** Enveloppe un objet : lire est permis, affecter ou appeler une méthode hors de `permises` lève. */
export function enLectureSeule<T extends object>(objet: T, permises: readonly string[] = [], journal: string[] = []): T {
  return new Proxy(objet, {
    set(_cible, cle) {
      throw new MutationInterdite(`affectation de ${String(cle)}`);
    },
    defineProperty(_cible, cle) {
      throw new MutationInterdite(`définition de ${String(cle)}`);
    },
    deleteProperty(_cible, cle) {
      throw new MutationInterdite(`suppression de ${String(cle)}`);
    },
    get(cible, cle, receveur) {
      const valeur = Reflect.get(cible, cle, receveur);
      if (typeof valeur !== 'function') return valeur;
      if (!permises.includes(String(cle))) {
        return () => {
          throw new MutationInterdite(`appel de ${String(cle)}`);
        };
      }
      return (...arguments_: unknown[]) => {
        journal.push(String(cle));
        return (valeur as (...a: unknown[]) => unknown).apply(cible, arguments_);
      };
    },
  });
}

/** Les méthodes de mutation qu'un objet Figma porte, présentes pour que leur appel lève. */
const MUTATIONS = {
  setValueForMode() {},
  remove() {},
  setPluginData() {},
  setSharedPluginData() {},
  setVariableCodeSyntax() {},
  addMode() {},
  renameMode() {},
  removeMode() {},
  extend() {},
};

export interface OptionsDuPort {
  /** Délai de chaque lecture par identifiant, en millisecondes. */
  readonly delai?: number;
  /** Les identifiants dont la lecture lève. */
  readonly refusees?: ReadonlySet<string>;
  /** Les variables que la lecture par identifiant ne rend pas, et que l'import par clé rend. */
  readonly importables?: readonly VariableFigma[];
}

/** Un port de lecture sur des données fixes, qui compte ses appels et les lectures en vol. */
export function portDeTest(collections: CollectionFigma[], locales: VariableFigma[], distantes: VariableFigma[] = [], collectionsDistantes: CollectionFigma[] = [], options: OptionsDuPort = {}) {
  const appels = new Map<string, number>();
  let enVol = 0;
  let maximum = 0;
  const compter = (id: string) => appels.set(id, (appels.get(id) ?? 0) + 1);
  const attendre = async () => {
    enVol += 1;
    maximum = Math.max(maximum, enVol);
    await new Promise((resolve) => setTimeout(resolve, options.delai ?? 0));
    enVol -= 1;
  };
  // `resolveForConsumer` rend la valeur de Figma sur un calque : la seule méthode permise d'une variable.
  const figer = <T extends object>(objet: T): T => enLectureSeule({ ...objet, ...MUTATIONS } as T, ['resolveForConsumer']);
  const port: PortDeLecture = {
    async getLocalVariableCollectionsAsync() {
      compter('local:collections');
      return collections.map(figer);
    },
    async getLocalVariablesAsync() {
      compter('local:variables');
      return locales.map(figer);
    },
    async getVariableByIdAsync(id) {
      compter(id);
      await attendre();
      if (options.refusees?.has(id)) throw new Error('Accès refusé à la bibliothèque');
      const trouvee = [...locales, ...distantes].find((variable) => variable.id === id);
      return trouvee ? figer(trouvee) : null;
    },
    async getVariableCollectionByIdAsync(id) {
      compter(`collection:${id}`);
      await attendre();
      const trouvee = [...collections, ...collectionsDistantes].find((collection) => collection.id === id);
      return trouvee ? figer(trouvee) : null;
    },
    async importVariableByKeyAsync(cle) {
      compter(`import:${cle}`);
      await attendre();
      const trouvee = options.importables?.find((variable) => variable.key === cle);
      if (!trouvee) throw new Error('Clé absente de la bibliothèque');
      return figer(trouvee);
    },
  };
  return {
    port: enLectureSeule(port, ['getLocalVariableCollectionsAsync', 'getLocalVariablesAsync', 'getVariableByIdAsync', 'getVariableCollectionByIdAsync', 'importVariableByKeyAsync']),
    appels,
    maximumEnVol: () => maximum,
  };
}

/** Une variable Figma minimale. */
export function variableFigma(id: string, collection: string, name: string, resolvedType: string, valuesByMode: Record<string, unknown>, remote = false): VariableFigma {
  return { id, name, description: '', key: `cle-${id}`, remote, hiddenFromPublishing: false, variableCollectionId: collection, resolvedType, scopes: ['ALL_SCOPES'], codeSyntax: {}, valuesByMode };
}

/** Une collection Figma minimale ; ses modes s'identifient `${id}:${nom}`. */
export function collectionFigma(id: string, name: string, modes: string[], variableIds: string[], remote = false, defaut = modes[0]): CollectionFigma {
  return { id, name, key: `cle-${id}`, remote, hiddenFromPublishing: false, isExtension: false, modes: modes.map((mode) => ({ modeId: `${id}:${mode}`, name: mode })), defaultModeId: `${id}:${defaut}`, variableIds };
}

/** Les lectures qu'un calque permet. `exportAsync` produit des octets en mémoire. */
const LECTURES_DE_CALQUE = ['getStyledTextSegments', 'getMainComponentAsync', 'exportAsync', 'findAll', 'findOne', 'findChildren', 'findAllWithCriteria'];

/** Les types de calque qui portent des enfants et donc les méthodes de recherche : un texte, un tracé ou une forme n'ont pas `findAll`. */
const TYPES_A_ENFANTS: ReadonlySet<string> = new Set(['DOCUMENT', 'PAGE', 'COMPONENT_SET', 'COMPONENT', 'INSTANCE', 'FRAME', 'GROUP', 'SECTION', 'BOOLEAN_OPERATION']);

/**
 * Les recherches de Figma sur un calque à enfants, dans l'ordre du document : `findAll` et `findAllWithCriteria` parcourent tous les
 * descendants, `findOne` rend le premier ou `null`, `findChildren` ne lit que les enfants. Le moteur les détecte par `'findAll' in noeud`.
 * L'atelier ne les pose que sur demande (`recherches`) : un test qui ne les écrit pas garde un moteur qui ne voit que la racine des
 * variants, et plusieurs tests (`chasseComposants.test.ts`) comptent sur cette vue.
 */
function recherchesDeCalque<N extends NoeudDeFigma>(enfantsDe: () => readonly N[]) {
  const descendants = (enfants: readonly N[]): N[] => enfants.flatMap((enfant) => [enfant, ...descendants((enfant.children ?? []) as readonly N[])]);
  return {
    findAll: (filtre: (noeud: N) => boolean = () => true) => descendants(enfantsDe()).filter(filtre),
    findOne: (filtre: (noeud: N) => boolean) => descendants(enfantsDe()).find(filtre) ?? null,
    findChildren: (filtre: (noeud: N) => boolean = () => true) => [...enfantsDe()].filter(filtre),
    findAllWithCriteria: ({ types }: { types: readonly string[] }) => descendants(enfantsDe()).filter((noeud) => types.includes(noeud.type)),
  };
}

/** Les méthodes d'écriture qu'un calque ou un style porte, présentes pour que leur appel lève. */
const MUTATIONS_DE_CALQUE = {
  remove() {},
  resize() {},
  appendChild() {},
  insertChild() {},
  setBoundVariable() {},
  setExplicitVariableModeForCollection() {},
  setPluginData() {},
  setSharedPluginData() {},
  setTextStyleIdAsync() {},
  swapComponent() {},
  removeOverrides() {},
};

/**
 * Un atelier de calques, de styles de texte et de leur port, tous en lecture
 * seule. `journal` relève chaque méthode appelée : il ne contient que des
 * lectures quand le code lu n'a rien écrit. Avec `recherches`, chaque calque à enfants porte `findAll`, `findOne`, `findChildren` et
 * `findAllWithCriteria`, et répond vrai à `'findAll' in calque`. `permises` ajoute des méthodes de lecture que l'atelier laisse appeler
 * (`getSharedPluginData`, `loadAsync`).
 */
export function atelierDeCalques<N extends NoeudDeFigma = NoeudDeFigma, StyleLu = StyleDeFigma, PortDuComposant = PortDuCalque<N, StyleLu>>(options: { readonly recherches?: boolean; readonly permises?: readonly string[] } = {}) {
  const lecturesPermises = [...LECTURES_DE_CALQUE, ...(options.permises ?? [])];
  const journal: string[] = [];
  const noeuds = new Map<string, N>();
  const styles = new Map<string, StyleLu>();
  const bruts = new WeakMap<object, { parent: N | null }>();
  const lectures = new Map<string, number>();
  let pauses = 0;
  return {
    journal,
    lectures,
    pauses: () => pauses,
    /** Un calque ; ses enfants reçoivent ce calque pour parent. Son nom est `Calque <id>` sauf `name` dans `champs`. */
    calque(id: string, type: string, champs: Record<string, unknown> = {}, enfants: readonly N[] = []): N {
      // Les descripteurs sont copiés tels quels : un accesseur qui lève ne lève qu'à la lecture du code testé.
      const recherches: Partial<ReturnType<typeof recherchesDeCalque<N>>> = options.recherches && TYPES_A_ENFANTS.has(type) ? recherchesDeCalque((): readonly N[] => enfants) : {};
      const brut = Object.defineProperties({ id, name: `Calque ${id}`, type, parent: null as N | null, ...MUTATIONS_DE_CALQUE, ...recherches, children: enfants }, Object.getOwnPropertyDescriptors(champs));
      const fige = enLectureSeule(brut, lecturesPermises, journal) as unknown as N;
      bruts.set(fige, brut);
      noeuds.set(id, fige);
      for (const enfant of enfants) {
        const brutDeLEnfant = bruts.get(enfant);
        if (brutDeLEnfant) brutDeLEnfant.parent = fige;
      }
      return fige;
    },
    /** Un style de texte et les variables qu'il lie, par champ. `champs` ajoute ce que le style porte d'autre (`paints` d'un style de remplissage, avec `type: 'PAINT'`). */
    styleDeTexte(id: string, name: string, boundVariables: Record<string, unknown>, champs: Record<string, unknown> = {}): StyleLu {
      const fige = enLectureSeule({ id, name, type: 'TEXT', boundVariables, ...champs, ...MUTATIONS_DE_CALQUE }, [], journal) as unknown as StyleLu;
      styles.set(id, fige);
      return fige;
    },
    /** Le port de la lecture d'un composant, sur les calques et les styles de l'atelier. */
    port(variables: PortDeLecture, selection: readonly N[] = []): PortDuComposant {
      const compter = (cle: string) => lectures.set(cle, (lectures.get(cle) ?? 0) + 1);
      return enLectureSeule({
        selection: () => selection,
        async getNodeByIdAsync(id: string) {
          compter(`calque:${id}`);
          return noeuds.get(id) ?? null;
        },
        async getStyleByIdAsync(id: string) {
          compter(`style:${id}`);
          return styles.get(id) ?? null;
        },
        variables,
        async pause() {
          pauses += 1;
        },
      }, ['selection', 'getNodeByIdAsync', 'getStyleByIdAsync', 'pause'], journal) as unknown as PortDuComposant;
    },
  };
}
