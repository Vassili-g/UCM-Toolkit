/**
 * Relations structurelles à l'intérieur d'un slot direct.
 *
 * Un slot peut envelopper un composant unifié ou porter une visibilité plus
 * profondément que son premier calque. Ces deux relations sont analysées ici
 * sans extraire de token ni connaître le nom du composant concerné.
 */
import { getAllNodes, nearestAncestorInParEtapes } from './exportableNodes';
import type { ComposedInstances } from './exportableNodes';
import { normalizePropKey } from './parsers';
import { champDuNoeud } from './porteeDAnalyse';
import type { ComposedDependency, VisibilityTarget } from '@ucm-kit/core/format';

/**
 * Dépendances directes d'un slot, que le slot soit lui-même l'instance ou
 * qu'il l'enveloppe. Les dépendances d'une dépendance sont exclues.
 */
export function composedSlotDependencies(
  child: SceneNode,
  composed: ComposedInstances,
): ComposedDependency[] {
  const calcul = composedSlotDependenciesParEtapes(child, composed);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Mêmes dépendances directes, interruptibles dans les ancêtres. */
export function* composedSlotDependenciesParEtapes(child: SceneNode, composed: ComposedInstances): Generator<void, ComposedDependency[]> {
  const direct = composed.get(child.id);
  if (direct) return [direct];
  if (composed.size === 0 || !('findAll' in child)) return [];
  const resultat: ComposedDependency[] = [];
  for (const node of child.findAll((node) => composed.has(node.id))) {
    yield;
    if (yield* nearestAncestorInParEtapes(node, child, composed)) continue;
    const dependency = composed.get(node.id);
    if (dependency) resultat.push(dependency);
  }
  return resultat;
}

/** Vrai si `node` appartient au sous-arbre de `ancestor`, racine comprise. */
function belongsTo(node: SceneNode, ancestor: SceneNode): boolean {
  let current: BaseNode | null | undefined = node;
  while (current) {
    if (current === ancestor) return true;
    current = champDuNoeud<BaseNode | null>(current, 'parent');
  }
  return false;
}

/**
 * Chemin de calques Figma relatif à une racine, cible comprise.
 *
 * Unique autorité : `visibilityTargets` s'en sert pour situer une visibilité
 * imbriquée, l'échantillon pour situer une surcharge dans une dépendance. Deux
 * constructions finiraient par différer d'un segment, et le consommateur
 * joindrait sur des chemins qui ne se correspondent plus.
 */
export function figmaPath(node: SceneNode, root: SceneNode): string[] {
  const path: string[] = [];
  let current: BaseNode | null | undefined = node;
  while (current && current !== root) {
    if ('name' in current) path.unshift(champDuNoeud<string>(current, 'name'));
    current = champDuNoeud<BaseNode | null>(current, 'parent');
  }
  return path;
}

/**
 * Décrit les visibilités imbriquées sans élargir leur portée.
 *
 * Une cible unique qui contrôle tout le contenu rend le slot optionnel. Dès
 * qu'un autre élément rendable subsiste, chaque cible garde son chemin propre.
 *
 * `slotIsOptional` dit que le slot porte déjà sa propre visibilité. Aucune
 * cible ne peut alors être promue : la prop du slot resterait prioritaire et la
 * promotion ne ferait que masquer la seconde. Les cibles sont malgré tout
 * décrites : un slot masquable qui contient une sous-partie masquable expose
 * bien deux props, et n'en taire aucune est la règle.
 *
 * `representedTargets` contient les nodes qu'un enfant publié décrit déjà. Ils
 * sont retirés de `visibilityTargets` (un même fait n'a jamais deux
 * propriétaires) mais pas du test de promotion : une cible unique qui
 * contrôle tout le contenu rend bien le slot entier optionnel, et l'oublier
 * ferait rendre un cadre vide autour d'un enfant masqué. C'est l'enfant qui se
 * tait alors, par le `parentVisibilityProp` que l'extraction lui passe.
 */
export function nestedSlotVisibility(
  child: SceneNode,
  composed: ComposedInstances,
  slotIsOptional = false,
  representedTargets: ReadonlySet<string> = new Set(),
): { visibilityProp?: string; visibilityTargets?: VisibilityTarget[] } {
  const nodes = getAllNodes(child, [], composed);
  const targets = nodes.filter(
    (node) =>
      node !== child
      && !composed.has(node.id)
      && Boolean(champDuNoeud<SceneNode['componentPropertyReferences']>(node, 'componentPropertyReferences')?.visible),
  );
  if (targets.length === 0) return {};

  if (targets.length === 1 && !slotIsOptional) {
    const target = targets[0];
    const controlsWholeSlot = nodes
      // Une instance composée reste un contenu visible du slot, même si son
      // propre sous-arbre est élagué. L'ignorer ferait croire qu'un autre
      // descendant contrôle à lui seul la visibilité du slot entier.
      .filter((node) => node !== child)
      .every((node) => belongsTo(node, target) || belongsTo(target, node));
    if (controlsWholeSlot) {
      return {
        visibilityProp: normalizePropKey(champDuNoeud<SceneNode['componentPropertyReferences']>(target, 'componentPropertyReferences')!.visible!),
      };
    }
  }

  // Les cibles qu'un enfant publié porte déjà à sa place exacte sortent d'ici.
  const restantes = targets.filter((target) => !representedTargets.has(target.id));
  if (restantes.length === 0) return {};
  return {
    visibilityTargets: restantes.map((target) => ({
      visibilityProp: normalizePropKey(champDuNoeud<SceneNode['componentPropertyReferences']>(target, 'componentPropertyReferences')!.visible!),
      figmaPath: figmaPath(target, child),
    })),
  };
}
