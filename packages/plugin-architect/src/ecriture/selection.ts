/**
 * Le seul changement de sélection du plugin : sélectionner les layers d'un
 * constat. Les layers qui n'existent plus ou qui ne sont pas sur la page
 * courante sont laissés de côté ; sans layer restant, la sélection ne change pas.
 *
 * `retenir` reçoit les identifiants posés, pour que le `selectionchange` qui suit
 * porte `origine: 'plugin'` et ne périme pas l'analyse.
 */

export interface LayerSelectionnable {
  readonly id: string;
  readonly type: string;
  readonly parent: LayerSelectionnable | null;
  readonly removed?: boolean;
}

/** Ce que la sélection demande à Figma : les doubles des tests le remplacent. */
export interface ApiDeSelection {
  readonly currentPage: { readonly id: string; selection: readonly LayerSelectionnable[] };
  getNodeByIdAsync(id: string): Promise<LayerSelectionnable | null>;
}

function surLaPageCourante(layer: LayerSelectionnable, api: ApiDeSelection): boolean {
  let courant: LayerSelectionnable | null = layer;
  while (courant && courant.type !== 'PAGE') courant = courant.parent;
  return courant !== null && courant.id === api.currentPage.id;
}

/** Sélectionne les layers qui existent encore sur la page courante et rend leurs identifiants. */
export async function selectionnerLesLayers(
  ids: readonly string[],
  retenir: (ids: readonly string[]) => void,
  api: ApiDeSelection = figma as unknown as ApiDeSelection,
): Promise<string[]> {
  const layers: LayerSelectionnable[] = [];
  for (const id of new Set(ids)) {
    try {
      const layer = await api.getNodeByIdAsync(id);
      if (layer && !layer.removed && surLaPageCourante(layer, api)) layers.push(layer);
    } catch {
      // Un layer illisible n'est pas sélectionné.
    }
  }
  if (layers.length === 0) return [];
  try {
    api.currentPage.selection = layers;
  } catch {
    return [];
  }
  const posees = layers.map((layer) => layer.id);
  retenir(posees);
  return posees;
}
