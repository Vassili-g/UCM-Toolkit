/** L'adaptateur ne conserve aucun nœud dans l'inventaire envoyé à l'interface. */
import { CLES_PARTAGEES_DE_PALETTES, CLE_NOMMAGE_DE_PALETTES, ESPACE_PARTAGE } from '@ucm-kit/core/referentiel';
import { lireLaMarqueDeNommage, marqueurDePaletteLu } from '@ucm-kit/core/protocoles';
import { lireLeSuiviDePalettes, type LecteurDeVariable, type PortDeLecture } from './lecture';

/**
 * Lit alias, protection et palette sur des variables déjà rendues par Figma, sans attente. Une variable est protégée quand sa donnée
 * partagée `palette` n'est pas vide (variable créée par Palettes) ou quand le suivi racine `variables` de Palettes la liste
 * (variable reprise). La donnée racine se lit une fois, à la création du lecteur ; la donnée de chaque variable se lit une fois aussi.
 * La marque `nommage` de Palettes (racine de `ESPACE_PARTAGE`) se lit une fois aussi.
 *
 * Une lecture refusée n'est pas une absence. Quand le suivi racine ou la donnée `palette` d'une variable ne se lit pas, une variable
 * de couleur sans marqueur peut être reprise par Palettes : elle est `indecidable`. Palettes ne crée, ne relève et ne reprend que des
 * variables `COLOR` ; un `resolvedType` absent compte pour une couleur possible.
 */
export function lecteurDeVariablesFigma(api: PluginAPI, variables: readonly Variable[]): LecteurDeVariable {
  const lues = new Map(variables.map((variable) => [variable.id, variable]));
  const suivi = lireLeSuiviDePalettes(() => api.root.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables));
  const marque = lireLaMarqueDeNommage(() => api.root.getSharedPluginData(ESPACE_PARTAGE, CLE_NOMMAGE_DE_PALETTES));
  /** `null` : la lecture de la donnée `palette` de la variable a été refusée. */
  const palettes = new Map<string, string | null>();
  const palette = (variable: { readonly id: string }): string | null => {
    let lue = palettes.get(variable.id);
    if (lue === undefined) {
      try { lue = lues.get(variable.id)?.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette) ?? ''; } catch { lue = null; }
      palettes.set(variable.id, lue);
    }
    return lue;
  };
  const protegee = (variable: { readonly id: string }): boolean => (suivi.etat === 'lu' && suivi.ids.has(variable.id)) || marqueurDePaletteLu(palette(variable) ?? '') !== null;
  const peutEtreUneCouleur = (variable: { readonly id: string }): boolean => {
    const type = lues.get(variable.id)?.resolvedType;
    return type === undefined || type === 'COLOR';
  };
  return {
    cibleAlias: (variable) => {
      const premier = Object.values(lues.get(variable.id)?.valuesByMode ?? {})[0];
      return typeof premier === 'object' && premier !== null && 'type' in premier && premier.type === 'VARIABLE_ALIAS' ? premier.id : undefined;
    },
    protegee,
    palette: (variable) => marqueurDePaletteLu(palette(variable) ?? '') ?? undefined,
    indecidable: (variable) => peutEtreUneCouleur(variable) && !protegee(variable) && (suivi.etat === 'refuse' || palette(variable) === null),
    marqueDePalettes: () => marque,
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
    indecidable: (variable) => lecteur?.indecidable?.(variable) ?? false,
    marqueDePalettes: () => lecteur?.marqueDePalettes?.() ?? 'absente',
  };
}
