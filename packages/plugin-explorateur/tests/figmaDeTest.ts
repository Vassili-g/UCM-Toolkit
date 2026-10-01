/**
 * Les doubles de Figma des tests : des objets en lecture seule. Toute
 * affectation lève, tout appel hors de la liste des lectures permises lève.
 * Un test qui passe par ces doubles prouve qu'aucun setter, aucune création,
 * aucun import ni aucune écriture de données n'a été appelé.
 */
import type { CollectionFigma, PortDeLecture, VariableFigma } from '../src/lecture';

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
  const figer = <T extends object>(objet: T): T => enLectureSeule({ ...objet, ...MUTATIONS } as T);
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
  };
  return {
    port: enLectureSeule(port, ['getLocalVariableCollectionsAsync', 'getLocalVariablesAsync', 'getVariableByIdAsync', 'getVariableCollectionByIdAsync']),
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
