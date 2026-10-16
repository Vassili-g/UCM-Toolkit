/** L'adaptateur ne conserve aucun nœud dans l'inventaire envoyé à l'interface. */
import type { ComposantLu, PortDeLecture } from './lecture';

/** Les pages présentes au début du geste sont chargées successivement. */
export function creerPortDeLecture(api: PluginAPI): PortDeLecture {
  return {
    collections: () => api.variables.getLocalVariableCollectionsAsync(),
    variables: () => api.variables.getLocalVariablesAsync(),
    pages: () => api.root.children.map((page) => ({
      id: page.id, name: page.name,
      charger: () => page.loadAsync(),
      composants: (): ComposantLu[] => page.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] }).map((node) => ({
        id: node.id, name: node.name, remote: node.remote, type: node.type,
        parentId: node.parent?.id ?? null,
        componentPropertyDefinitions: node.componentPropertyDefinitions,
        variantProperties: node.type === 'COMPONENT' ? node.variantProperties : null,
      })),
    })),
  };
}
