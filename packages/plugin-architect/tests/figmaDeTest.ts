/**
 * Les doubles de Figma des tests : des objets en lecture seule. Toute
 * affectation lève, tout appel hors de la liste des lectures permises lève.
 * Un test qui passe par ces doubles prouve qu'aucun setter, aucune création
 * ni aucune écriture de données n'a été appelé. Le port de lecture permet un
 * seul import, celui d'une variable par sa clé. `atelierDEcriture`, en fin de
 * fichier, est l'exception : il écrit, et son journal ordonné prouve quoi et dans
 * quel ordre.
 */
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { NoeudLu, StyleLu } from '../src/consommateurs';
import type { CollectionFigma, PortDeLecture, VariableFigma } from '../src/lecture';
import type { PortDuComposant } from '../src/lectureDuComposant';

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
      return collections.map(figer);
    },
    async getLocalVariablesAsync() {
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
const LECTURES_DE_CALQUE = ['getStyledTextSegments', 'getMainComponentAsync', 'exportAsync', 'findAll'];

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
 * lectures quand le code lu n'a rien écrit.
 */
export function atelierDeCalques() {
  const journal: string[] = [];
  const noeuds = new Map<string, NoeudLu>();
  const styles = new Map<string, StyleLu>();
  const bruts = new WeakMap<object, { parent: NoeudLu | null }>();
  const lectures = new Map<string, number>();
  let pauses = 0;
  return {
    journal,
    lectures,
    pauses: () => pauses,
    /** Un calque ; ses enfants reçoivent ce calque pour parent. Son nom est `Calque <id>` sauf `name` dans `champs`. */
    calque(id: string, type: string, champs: Record<string, unknown> = {}, enfants: readonly NoeudLu[] = []): NoeudLu {
      // Les descripteurs sont copiés tels quels : un accesseur qui lève ne lève qu'à la lecture du code testé.
      const brut = Object.defineProperties({ id, name: `Calque ${id}`, type, parent: null as NoeudLu | null, ...MUTATIONS_DE_CALQUE, children: enfants }, Object.getOwnPropertyDescriptors(champs));
      const fige = enLectureSeule(brut, LECTURES_DE_CALQUE, journal) as unknown as NoeudLu;
      bruts.set(fige, brut);
      noeuds.set(id, fige);
      for (const enfant of enfants) {
        const brutDeLEnfant = bruts.get(enfant);
        if (brutDeLEnfant) brutDeLEnfant.parent = fige;
      }
      return fige;
    },
    /** Un style de texte et les variables qu'il lie, par champ. */
    styleDeTexte(id: string, name: string, boundVariables: Record<string, unknown>): StyleLu {
      const fige = enLectureSeule({ id, name, type: 'TEXT', boundVariables, ...MUTATIONS_DE_CALQUE }, [], journal) as StyleLu;
      styles.set(id, fige);
      return fige;
    },
    /** Le port de la lecture d'un composant, sur les calques et les styles de l'atelier. */
    port(variables: PortDeLecture, selection: readonly NoeudLu[] = []): PortDuComposant {
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
      }, ['selection', 'getNodeByIdAsync', 'getStyleByIdAsync', 'pause'], journal);
    },
  };
}

/** Une variable pour l'atelier d'écriture : son identifiant lie, sa clé s'importe. */
export interface VariableDEcriture {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

export interface OptionsDeLEcriture {
  /** Le texte que `getSharedPluginData` rend pour la déclaration du fichier ; celle d'un fichier UCM par défaut. */
  readonly declaration?: string;
  /** Les variables locales du fichier. */
  readonly locales?: readonly VariableDEcriture[];
  /** Les variables qu'`importVariableByKeyAsync` rend ; toute autre clé lève. */
  readonly importables?: readonly VariableDEcriture[];
  /** Les variables que `getVariableByIdAsync` rend ; celles des listes précédentes s'y ajoutent. */
  readonly lisibles?: readonly VariableDEcriture[];
  /** Les identifiants dont l'écriture lève. */
  readonly refusees?: ReadonlySet<string>;
}

/**
 * Un atelier d'écriture : des layers que l'on peut lier, la sélection de la
 * page, et un journal ordonné de chaque écriture, import et point d'annulation.
 * Tout ce qui s'écrit passe par `journal`, pour que les tests prouvent l'ordre.
 */
export function atelierDEcriture(options: OptionsDeLEcriture = {}) {
  const journal: string[] = [];
  const layers = new Map<string, Record<string, unknown>>();
  const donnees = new Map<string, string>();
  const variables = new Map<string, VariableDEcriture>();
  for (const variable of [...(options.lisibles ?? []), ...(options.locales ?? []), ...(options.importables ?? [])]) variables.set(variable.id, variable);
  let selection: unknown[] = [];
  const page: Record<string, unknown> = { id: '0:1', type: 'PAGE', parent: null };
  Object.defineProperty(page, 'selection', {
    enumerable: true,
    get: () => selection,
    set: (valeur: unknown[]) => {
      journal.push(`selection:${valeur.map((layer) => (layer as { id: string }).id).join(',')}`);
      selection = valeur;
    },
  });
  const api = {
    root: {
      getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? (options.declaration ?? texteDeLArchitectureDuFichier(true)) : donnees.get(`${espace}/${cle}`) ?? ''),
      setSharedPluginData(espace: string, cle: string, valeur: string) {
        if (options.refusees?.has('racine')) throw new Error('Figma refuse');
        journal.push(`donnee:${espace}/${cle}`);
        donnees.set(`${espace}/${cle}`, valeur);
      },
    },
    currentPage: page,
    async getNodeByIdAsync(id: string) {
      return layers.get(id) ?? null;
    },
    variables: {
      async getVariableByIdAsync(id: string) {
        return variables.get(id) ?? null;
      },
      async getLocalVariablesAsync() {
        journal.push('locales');
        return options.locales ?? [];
      },
      async importVariableByKeyAsync(cle: string) {
        journal.push(`import:${cle}`);
        const trouvee = options.importables?.find((variable) => variable.key === cle);
        if (!trouvee) throw new Error('Clé absente de la bibliothèque');
        return trouvee;
      },
      setBoundVariableForPaint(peinture: Record<string, unknown>, _champ: 'color', variable: VariableDEcriture) {
        journal.push(`peinture:${variable.key}`);
        return { ...peinture, boundVariables: { ...(peinture.boundVariables as object), color: { type: 'VARIABLE_ALIAS', id: variable.id } } };
      },
    },
    commitUndo() {
      journal.push('commitUndo');
    },
  };
  return {
    api,
    page,
    journal,
    /** Les données partagées de la racine, par `espace/clé`. */
    donnees,
    selection: () => selection,
    /** Un jeu de variants dont chaque variant porte l'un des noms ; renommer un variant entre dans `journal`. */
    jeuDeVariants(id: string, noms: readonly string[]): Record<string, unknown> {
      const jeu: Record<string, unknown> = { id, type: 'COMPONENT_SET', name: `Jeu ${id}`, parent: page, boundVariables: {} };
      jeu.children = noms.map((nom, rang) => {
        let valeur = nom;
        const variant: Record<string, unknown> = { id: `${id}-v${rang}`, type: 'COMPONENT', parent: jeu };
        Object.defineProperty(variant, 'name', {
          enumerable: true,
          get: () => valeur,
          set: (suivante: string) => {
            if (options.refusees?.has(`${id}-v${rang}`)) throw new Error('Figma refuse');
            journal.push(`nom:${id}-v${rang}:${suivante}`);
            valeur = suivante;
          },
        });
        return variant;
      });
      layers.set(id, jeu);
      return jeu;
    },
    /** Un layer écrivable ; `parent` est la page par défaut. Chaque écriture entre dans `journal`. */
    layer(id: string, type: string, champs: Record<string, unknown> = {}, parent: Record<string, unknown> = page): Record<string, unknown> {
      const brut: Record<string, unknown> = { id, type, name: `Layer ${id}`, parent, boundVariables: {}, ...champs };
      for (const champ of ['fills', 'strokes']) {
        let valeur = brut[champ];
        delete brut[champ];
        Object.defineProperty(brut, champ, {
          enumerable: true,
          get: () => valeur,
          set: (suivante: unknown) => {
            if (options.refusees?.has(id)) throw new Error('Figma refuse');
            journal.push(`${champ}:${id}`);
            valeur = suivante;
          },
        });
      }
      brut.setBoundVariable = (champ: string, variable: VariableDEcriture) => {
        if (options.refusees?.has(id)) throw new Error('Figma refuse');
        journal.push(`lier:${id}.${champ}:${variable.key}`);
        brut.boundVariables = { ...(brut.boundVariables as object), [champ]: { type: 'VARIABLE_ALIAS', id: variable.id } };
      };
      if (type === 'TEXT') {
        brut.segments ??= [{ start: 0, end: 5, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] }];
        brut.getStyledTextSegments = () => brut.segments;
        brut.setRangeFills = (debut: number, fin: number, peintures: unknown[]) => {
          if (options.refusees?.has(id)) throw new Error('Figma refuse');
          journal.push(`plage:${id}[${debut}-${fin}]`);
          brut.segments = (brut.segments as Array<{ start: number; end: number; fills: unknown }>).map((segment) => (segment.start === debut && segment.end === fin ? { ...segment, fills: peintures } : segment));
        };
      }
      layers.set(id, brut);
      return brut;
    },
  };
}
