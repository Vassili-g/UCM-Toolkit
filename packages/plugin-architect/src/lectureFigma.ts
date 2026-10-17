/** L'adaptateur ne conserve aucun nœud dans l'inventaire envoyé à l'interface. */
import { CLES_PARTAGEES_DE_PALETTES, ESPACE_PARTAGE } from '@ucm-kit/core/referentiel';
import type { PortDeLecture } from './lecture';

/** Les variables lues restent en mémoire le temps du geste, pour que l'alias et la protection se lisent par lots. */
export function creerPortDeLecture(api: PluginAPI): PortDeLecture {
  const lues = new Map<string, Variable>();
  return {
    collections: () => api.variables.getLocalVariableCollectionsAsync(),
    variables: async () => {
      const variables = await api.variables.getLocalVariablesAsync();
      lues.clear();
      for (const variable of variables) lues.set(variable.id, variable);
      return variables;
    },
    cibleAlias: (variable) => {
      const premier = Object.values(lues.get(variable.id)?.valuesByMode ?? {})[0];
      return typeof premier === 'object' && premier !== null && 'type' in premier && premier.type === 'VARIABLE_ALIAS' ? premier.id : undefined;
    },
    protegee: (variable) => (lues.get(variable.id)?.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette) ?? '') !== '',
  };
}
