/**
 * Lecture de la structure d'un Component Set : ses axes de variantes, ses
 * variants, et la détection du « wrapper de dimensions » imbriqué.
 *
 * Tout est dynamique : aucun nom d'axe ni de composant n'est codé en dur.
 */
import { normalizePropKey, normalizePropValue } from './parsers';
import type { FigmaVariantLabels } from '@ucm-kit/core/format';
import { sorteDeLImbrique } from '@ucm-kit/core/referentiel';
import type { FaitsDImbrique } from '@ucm-kit/core/referentiel';
import { getAllNodes } from './exportableNodes';
import { maitreDe } from './porteeDAnalyse';
import { pousserSansNode } from './localisation';
import type { ComposedInstances } from './exportableNodes';
import { DIMENSIONS_DE_LAYOUT, hasCompleteBinding } from './nodeBindings';

function epuiser<T>(calcul: Generator<void, T>): T {
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Un variant du set : ses valeurs indexées par clés publiques + le node Figma. */
export type VariantEntry = {
  /** Ex. { color: 'primary', variant: 'contained', state: 'default' }. */
  values: Record<string, string>;
  component: ComponentNode;
};

/** La matrice complète des variants d'un Component Set. */
export type VariantMatrix = {
  /** Les clés publiques des axes, dans l'ordre de déclaration Figma. */
  axes: string[];
  variants: VariantEntry[];
};

/** Diagnostic compact d'un Component Set dont certains mélanges n'existent pas. */
export type MissingVariantSummary = {
  axes: Array<{ name: string; values: string[] }>;
  expected: number;
  found: number;
  missing: number;
  /** Cinq variants réellement présents au plus, écrits comme dans Figma. */
  presentExamples: string[];
  /** Cinq exemples au plus, écrits avec les noms et valeurs visibles dans Figma. */
  examples: string[];
};

/** Le wrapper de dimensions trouvé dans un variant : l'instance + son set maître. */
export type WrapperReference = {
  instance: InstanceNode;
  componentSet: ComponentSetNode | null;
};

/**
 * Décode le nom d'un variant Figma (« Color=Primary, State=Hover ») en
 * paires clé/valeur normalisées.
 */
function* parseVariantName(name: string): Generator<void, Record<string, string>> {
  const variants: Record<string, string> = {};
  for (const entry of name.split(',')) {
    yield;
    const separator = entry.indexOf('=');
    if (separator === -1) continue;
    const key = normalizePropKey(entry.slice(0, separator));
    Object.defineProperty(variants, key, {
      value: normalizePropValue(entry.slice(separator + 1)),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return variants;
}

/**
 * Valeurs d'axes d'un variant. On lit d'abord le nom (toujours présent),
 * puis `variantProperties` (plus fiable) écrase en cas de différence.
 */
export function getVariantValues(component: ComponentNode): Record<string, string> {
  return epuiser(getVariantValuesParEtapes(component));
}

function* getVariantValuesParEtapes(component: ComponentNode): Generator<void, Record<string, string>> {
  const source = component.variantProperties ?? {};
  const variants = yield* parseVariantName(component.name);

  for (const propertyName of Object.keys(source)) {
    yield;
    const value = source[propertyName];
    const key = normalizePropKey(propertyName);
    Object.defineProperty(variants, key, {
      value: normalizePropValue(value),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }

  return variants;
}

/** Les axes variant du set (clés normalisées), dans l'ordre de déclaration. */
export function getVariantAxes(componentSet: ComponentSetNode): string[] {
  return epuiser(getVariantAxesParEtapes(componentSet));
}

function* getVariantAxesParEtapes(componentSet: ComponentSetNode): Generator<void, string[]> {
  const axes: string[] = [];
  const definitions = componentSet.componentPropertyDefinitions;
  for (const name of Object.keys(definitions)) {
    yield;
    if (definitions[name].type === 'VARIANT') axes.push(normalizePropKey(name));
  }
  return axes;
}

/** Remplace les clés Figma par les clés publiques décidées lors de l'extraction des props. */
function* remapVariantValues(
  values: Record<string, string>,
  publicKeyByRawKey: ReadonlyMap<string, string>,
): Generator<void, Record<string, string>> {
  const remapped: Record<string, string> = {};
  for (const rawKey of Object.keys(values)) {
    yield;
    const value = values[rawKey];
    Object.defineProperty(remapped, publicKeyByRawKey.get(rawKey) ?? rawKey, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return remapped;
}

/**
 * Construit la matrice complète : chaque variant du set avec ses valeurs
 * d'axes. La table optionnelle applique les mêmes renommages sémantiques que
 * les props. Aucune hypothèse sur les noms d'axes : un Button a
 * Color/Variant/State, un autre composant aura les siens.
 */
export function groupComponentsByVariant(componentSet: ComponentSetNode): {
  matrix: VariantMatrix;
  warnings: string[];
};
export function groupComponentsByVariant(
  componentSet: ComponentSetNode,
  publicKeyByRawKey: ReadonlyMap<string, string>,
): {
  matrix: VariantMatrix;
  warnings: string[];
};
export function groupComponentsByVariant(
  componentSet: ComponentSetNode,
  publicKeyByRawKey: ReadonlyMap<string, string> = new Map(),
): {
  matrix: VariantMatrix;
  warnings: string[];
} {
  return epuiser(groupComponentsByVariantParEtapes(componentSet, publicKeyByRawKey));
}

function* groupComponentsByVariantParEtapes(componentSet: ComponentSetNode, publicKeyByRawKey: ReadonlyMap<string, string>): Generator<void, { matrix: VariantMatrix; warnings: string[] }> {
  const warnings: string[] = [];
  const components: ComponentNode[] = [];
  for (const node of componentSet.children) {
    yield;
    if (node.type === 'COMPONENT') components.push(node);
  }
  const rawAxes = yield* getVariantAxesParEtapes(componentSet);
  const axes: string[] = [];
  for (const rawKey of rawAxes) {
    yield;
    axes.push(publicKeyByRawKey.get(rawKey) ?? rawKey);
  }
  const variants: VariantEntry[] = [];
  for (const component of components) {
    yield;
    const values = yield* getVariantValuesParEtapes(component);
    variants.push({ values: yield* remapVariantValues(values, publicKeyByRawKey), component });
  }

  // Cas limite : si le set n'expose pas ses axes, on les découvre sur les
  // variants eux-mêmes pour ne jamais perdre d'information.
  if (axes.length === 0 && variants.length > 0) {
    const discovered = new Set<string>();
    for (const entry of variants) {
      yield;
      for (const key of Object.keys(entry.values)) { yield; discovered.add(key); }
    }
    for (const key of discovered) { yield; axes.push(key); }
  }

  if (components.length === 0) {
    pousserSansNode(warnings, 'Component Set sélectionné', {
      famille: 'proprietes',
      manque: 'il ne contient aucun variant.',
      impact: 'Le contrat ne décrira ni ses propriétés de variante, ni ses variants.',
      action: 'Ajoutez au moins un variant dans Figma, puis réexportez.',
    });
  }

  return { matrix: { axes, variants }, warnings };
}

/**
 * Matrice d'un export, qu'il parte d'un Component Set ou d'un Component seul.
 * Un composant simple possède une combinaison exacte sans axe ; les arbres de
 * variantes utilisent ensuite leur clé de repli historique, tandis que
 * `Contract.variants` conserve correctement `values: {}`.
 */
export function buildVariantMatrix(
  component: ComponentNode | ComponentSetNode,
  publicKeyByRawKey: ReadonlyMap<string, string> = new Map(),
): { matrix: VariantMatrix; warnings: string[] } {
  return epuiser(buildVariantMatrixParEtapes(component, publicKeyByRawKey));
}

/** Même matrice ordonnée, interruptible dans les variants et les valeurs d'axes. */
export function* buildVariantMatrixParEtapes(component: ComponentNode | ComponentSetNode, publicKeyByRawKey: ReadonlyMap<string, string> = new Map()): Generator<void, { matrix: VariantMatrix; warnings: string[] }> {
  if (component.type === 'COMPONENT_SET') {
    return yield* groupComponentsByVariantParEtapes(component, publicKeyByRawKey);
  }
  return {
    matrix: { axes: [], variants: [{ values: {}, component }] },
    warnings: [],
  };
}

/**
 * Vérifie que les valeurs des axes sont combinables comme des props
 * indépendantes. Le nombre manquant se calcule sans parcourir tout le produit ;
 * la recherche s'arrête dès que cinq exemples ont été trouvés. Le coût reste
 * donc proportionnel au nombre de variants réellement présents.
 */
export function findMissingVariantCombinations(
  componentSet: ComponentSetNode,
  exampleLimit = 5,
): MissingVariantSummary | null {
  return epuiser(findMissingVariantCombinationsParEtapes(componentSet, exampleLimit));
}

/** Même compte et mêmes exemples, interruptibles pendant la lecture et le produit. */
export function* findMissingVariantCombinationsParEtapes(componentSet: ComponentSetNode, exampleLimit = 5): Generator<void, MissingVariantSummary | null> {
  const rawVariants: Record<string, string>[] = [];
  for (const component of componentSet.children) {
    yield;
    if (component.type === 'COMPONENT') rawVariants.push(yield* getVariantValuesParEtapes(component));
  }
  const axes: Array<{ key: string; name: string; valuesByKey: Map<string, string> }> = [];
  const definitions = componentSet.componentPropertyDefinitions;
  for (const figmaName of Object.keys(definitions)) {
    yield;
    const definition = definitions[figmaName];
    if (definition.type !== 'VARIANT') continue;
    const key = normalizePropKey(figmaName);
    const valuesByKey = new Map<string, string>();
    for (const value of definition.variantOptions ?? []) {
      yield;
      const normalized = normalizePropValue(value);
      if (!valuesByKey.has(normalized)) valuesByKey.set(normalized, value.trim());
    }
    for (const variant of rawVariants) {
      yield;
      const normalized = variant[key];
      if (normalized && !valuesByKey.has(normalized)) valuesByKey.set(normalized, normalized);
    }
    axes.push({ key, name: figmaName.replace(/#.*$/, '').trim(), valuesByKey });
  }

  if (axes.length < 2 || axes.some((axis) => axis.valuesByKey.size === 0)) return null;

  const signature = (values: readonly string[]) => values.join('\u0000');
  const existing = new Set<string>();
  const presentExamples: string[] = [];
  for (const variant of rawVariants) {
    yield;
    const values: string[] = [];
    for (const axis of axes) { yield; values.push(variant[axis.key]); }
    if (values.every((value, index) => axes[index].valuesByKey.has(value))) {
      const key = signature(values);
      if (!existing.has(key) && presentExamples.length < exampleLimit) {
        presentExamples.push(
          axes
            .map((axis, index) => `${axis.name}=${axis.valuesByKey.get(values[index])}`)
            .join(', '),
        );
      }
      existing.add(key);
    }
  }

  const expected = axes.reduce((total, axis) => total * axis.valuesByKey.size, 1);
  const found = existing.size;
  const missing = expected - found;
  if (missing <= 0) return null;

  const examples: string[] = [];
  const current: string[] = [];
  const visit = function* (axisIndex: number): Generator<void, boolean> {
    yield;
    if (axisIndex === axes.length) {
      if (!existing.has(signature(current))) {
        examples.push(
          axes
            .map((axis, index) => `${axis.name}=${axis.valuesByKey.get(current[index])}`)
            .join(', '),
        );
      }
      return examples.length >= exampleLimit;
    }
    for (const value of axes[axisIndex].valuesByKey.keys()) {
      yield;
      current[axisIndex] = value;
      if (yield* visit(axisIndex + 1)) return true;
    }
    return false;
  };
  yield* visit(0);

  return {
    axes: axes.map((axis) => ({ name: axis.name, values: [...axis.valuesByKey.values()] })),
    expected,
    found,
    missing,
    presentExamples,
    examples,
  };
}

/** Compte les liaisons de dimensions dans tout le sous-arbre rendable d'une instance. */
function countLayoutBindings(
  root: InstanceNode,
  warnings: string[],
  composed: ComposedInstances,
): number {
  let count = 0;
  for (const node of getAllNodes(root, warnings, composed)) {
    for (const alternatives of DIMENSIONS_DE_LAYOUT) {
      if (hasCompleteBinding(node, alternatives)) count += 1;
    }
  }
  return count;
}

/**
 * `componentProperties` peut lever une exception sur une instance orpheline ;
 * un node cassé ne doit pas faire échouer tout l'export.
 */
function hasComponentProperties(instance: InstanceNode): boolean {
  try {
    return Object.keys(instance.componentProperties).length > 0;
  } catch {
    return false;
  }
}

/** Les faits d'une instance imbriquée, avec ce que leur relevé a lu en chemin. */
export type ReleveDeFaits = {
  faits: FaitsDImbrique;
  /** Composant principal de l'instance ; null s'il est illisible, ou si l'instance est une dépendance. */
  maitre: ComponentNode | null;
  /** Component Set du maître, quand il en a un. */
  componentSet: ComponentSetNode | null;
};

/**
 * Relève les faits qui classent une instance imbriquée : le nom de son
 * composant, la présence de règles et le nombre de dimensions liées. La sorte
 * se décide ensuite par `sorteDeLImbrique`, jamais ici.
 *
 * Les règles se lisent dans `composed`, le relevé de `scanComposedInstances` :
 * une instance qu'il contient a trouvé son `.componentRules`. Son sous-arbre
 * appartient alors à son propre contrat, donc ses dimensions ne sont pas
 * comptées et son maître n'est pas relu ; `nom` y garde le nom du calque.
 *
 * Les avertissements sont ceux du parcours des calques de l'instance.
 */
export async function releverLesFaitsDUnImbrique(
  instance: InstanceNode,
  warnings: string[],
  composed: ComposedInstances,
): Promise<ReleveDeFaits> {
  if (composed.has(instance.id)) {
    return {
      faits: { nom: instance.name, reglesTrouvees: true, dimensionsLiees: 0 },
      maitre: null,
      componentSet: null,
    };
  }
  const maitre = await maitreDe(instance);
  const parent = maitre?.parent;
  const componentSet = parent?.type === 'COMPONENT_SET' ? parent : null;
  return {
    faits: {
      nom: componentSet?.name ?? maitre?.name ?? instance.name,
      reglesTrouvees: false,
      dimensionsLiees: countLayoutBindings(instance, warnings, composed),
    },
    maitre,
    componentSet,
  };
}

/**
 * Note une instance candidate au rôle de wrapper de dimensions.
 * Est candidate une instance que `sorteDeLImbrique` range parmi les wrappers de
 * dimensions ; le critère principal de l'élection est alors le nombre de
 * tokens de layout qu'elle porte, le nom n'est qu'un léger bonus.
 * Score nul si elle n'est pas candidate.
 *
 * Score nul, aussi, si son composant maître est illisible. Un wrapper n'est
 * élu qu'une fois, sur la référence, et les autres variants retrouvent leur
 * instance du même maître par son id : une instance orpheline n'est appariable
 * nulle part, et l'élire ferait décrire à la référence un arbre que plus aucun
 * variant ne décrit. Un candidat qu'on ne saura pas suivre n'est pas un
 * candidat.
 */
async function scoreWrapper(
  instance: InstanceNode,
  warnings: string[],
  composed: ComposedInstances,
): Promise<{
  score: number;
  componentSet: ComponentSetNode | null;
}> {
  const { faits, maitre, componentSet } = await releverLesFaitsDUnImbrique(instance, warnings, composed);
  if (sorteDeLImbrique(faits) !== 'wrapper-de-dimensions' || maitre === null) return { score: 0, componentSet };

  const searchableName = `${instance.name} ${maitre.name} ${componentSet?.name ?? ''}`.toLowerCase();
  let score = faits.dimensionsLiees * 10;
  if (searchableName.includes('wrapper')) score += 5;
  if (componentSet && hasComponentProperties(instance)) score += 3;
  return { score, componentSet };
}

/**
 * Cherche le wrapper de dimensions imbriqué dans un variant. Optionnel :
 * un composant « plat » (sans instance de layout imbriquée) renvoie null
 * et ses dimensions seront lues directement sur lui.
 *
 * Un composant unifié imbriqué n'est jamais candidat, quel que soit son score :
 * un wrapper est une coquille de mise en page interne, alors qu'une dépendance
 * est un composant à part entière. Les confondre revient à décrire les
 * dimensions du voisin, et, par ricochet, ses slots et ses props.
 */
export async function findWrapperReference(
  root: ComponentNode,
  warnings: string[] = [],
  composed: ComposedInstances = new Map(),
): Promise<WrapperReference | null> {
  const instances = getAllNodes(root, warnings, composed)
    .filter((node): node is InstanceNode => node.type === 'INSTANCE');
  const scored = await Promise.all(
    instances.map(async (instance) => ({
      instance,
      ...(await scoreWrapper(instance, warnings, composed)),
    })),
  );
  const candidates = scored.filter((candidate) => candidate.score > 0);
  candidates.sort((left, right) => right.score - left.score);

  const best = candidates[0];
  return best ? { instance: best.instance, componentSet: best.componentSet } : null;
}


/**
 * Étiquettes Figma des axes et de leurs valeurs, lues à la source.
 *
 * Le nom Figma d'un variant (« Color=Primary, State=Hover ») redit ses
 * `values` avec les majuscules de Figma, autant de fois qu'il y a de
 * combinaisons ; une table par axe et par valeur le dit une fois.
 *
 * Les deux moitiés viennent de l'API, pas d'une relecture du nom publié :
 * `componentPropertyDefinitions` donne le nom d'un axe, `variantProperties`
 * donne la valeur brute. Une table déduite du nom lui-même ne prouverait rien,
 * l'appariement axe ↔ étiquette pouvant être permuté sans qu'aucun nom
 * reconstruit ne change.
 *
 * Rend `null` (et chaque variant garde alors son `figmaName`) dès qu'une
 * seule chose ne se vérifie pas : aucun axe, une valeur normalisée qui
 * correspondrait à deux valeurs Figma, ou un seul nom qui ne se reconstruit pas
 * à l'identique. Tout ou rien : une table partielle obligerait le consommateur
 * à savoir laquelle des deux sources fait foi.
 */
export function buildFigmaVariantLabels(
  componentSet: ComponentSetNode | ComponentNode,
  matrix: VariantMatrix,
  publicVariantKeyByRawKey: ReadonlyMap<string, string>,
): FigmaVariantLabels | null {
  if (matrix.axes.length === 0) return null;

  const axes: Record<string, string> = {};
  for (const [figmaName, definition] of Object.entries(componentSet.componentPropertyDefinitions)) {
    if (definition.type !== 'VARIANT') continue;
    const rawKey = normalizePropKey(figmaName);
    const publicKey = publicVariantKeyByRawKey.get(rawKey) ?? rawKey;
    Object.defineProperty(axes, publicKey, {
      value: figmaName, enumerable: true, writable: true, configurable: true,
    });
  }
  if (matrix.axes.some((axis) => axes[axis] === undefined)) return null;

  const values: Record<string, Record<string, string>> = {};
  for (const axis of matrix.axes) {
    Object.defineProperty(values, axis, {
      value: {}, enumerable: true, writable: true, configurable: true,
    });
  }
  for (const entry of matrix.variants) {
    for (const [figmaName, rawValue] of Object.entries(entry.component.variantProperties ?? {})) {
      const rawKey = normalizePropKey(figmaName);
      const publicKey = publicVariantKeyByRawKey.get(rawKey) ?? rawKey;
      const table = values[publicKey];
      if (!table) return null;
      const normalized = normalizePropValue(rawValue);
      const known = table[normalized];
      // Deux valeurs Figma pour une même valeur normalisée : la table ne peut
      // plus répondre, et choisir la première serait choisir au hasard.
      if (known !== undefined && known !== rawValue) return null;
      Object.defineProperty(table, normalized, {
        value: rawValue, enumerable: true, writable: true, configurable: true,
      });
    }
  }

  // Dernier contrôle, celui qui porte : la table doit rendre chaque nom Figma
  // à l'identique, sur tous les variants.
  for (const entry of matrix.variants) {
    const rebuilt = matrix.axes
      .map((axis) => `${axes[axis]}=${values[axis]?.[entry.values[axis]]}`)
      .join(', ');
    if (rebuilt !== entry.component.name) return null;
  }

  return { axes, values };
}
