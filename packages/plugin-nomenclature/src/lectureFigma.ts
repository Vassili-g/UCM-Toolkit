/** L'adaptateur ne conserve aucun nœud dans l'inventaire envoyé à l'interface. */
import { CLES_PARTAGEES_DE_PALETTES, ESPACE_PARTAGE } from '@ucm-kit/core/referentiel';
import { variablesSuiviesParPalettes, type LecteurDeVariable, type PortDeLecture } from './lecture';

/**
 * Lit alias, protection et palette sur des variables déjà rendues par Figma, sans attente. Une variable est protégée quand sa donnée
 * partagée `palette` n'est pas vide (variable créée par Palettes) ou quand le suivi racine `variables` de Palettes la liste
 * (variable reprise). La donnée racine se lit une fois, à la création du lecteur ; la donnée de chaque variable se lit une fois aussi.
 */
export function lecteurDeVariablesFigma(api: PluginAPI, variables: readonly Variable[]): LecteurDeVariable {
  const lues = new Map(variables.map((variable) => [variable.id, variable]));
  let suivies: ReadonlySet<string>;
  try { suivies = variablesSuiviesParPalettes(api.root.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables)); } catch { suivies = new Set(); }
  const palettes = new Map<string, string>();
  const palette = (variable: { readonly id: string }): string => {
    let lue = palettes.get(variable.id);
    if (lue === undefined) {
      lue = lues.get(variable.id)?.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette) ?? '';
      palettes.set(variable.id, lue);
    }
    return lue;
  };
  return {
    cibleAlias: (variable) => {
      const premier = Object.values(lues.get(variable.id)?.valuesByMode ?? {})[0];
      return typeof premier === 'object' && premier !== null && 'type' in premier && premier.type === 'VARIABLE_ALIAS' ? premier.id : undefined;
    },
    protegee: (variable) => suivies.has(variable.id) || palette(variable) !== '',
    palette: (variable) => palette(variable) || undefined,
  };
}

/** Les variables lues restent en mémoire le temps du geste, pour que l'alias et la protection se lisent par lots. */
export function creerPortDeLecture(api: PluginAPI): PortDeLecture {
  let lecteur: LecteurDeVariable | undefined;
  return {
    collections: () => api.variables.getLocalVariableCollectionsAsync(),
    variables: async () => {
      const variables = await api.variables.getLocalVariablesAsync();
      lecteur = lecteurDeVariablesFigma(api, variables);
      return variables;
    },
    cibleAlias: (variable) => lecteur?.cibleAlias(variable),
    protegee: (variable) => lecteur?.protegee(variable) ?? false,
    palette: (variable) => lecteur?.palette(variable),
  };
}
