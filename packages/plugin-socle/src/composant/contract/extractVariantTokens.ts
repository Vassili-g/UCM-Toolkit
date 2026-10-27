/**
 * Extraction des tokens de couleur/contour de chaque variant du composant.
 *
 * Résultat : les couleurs et les contours de chaque variant, rangés par clé
 * (`tokensByComponent`, `strokesByComponent`).
 *
 * Les clés se décident ici, une seule fois, sur toute la matrice
 * (`colorKeys.ts`) : lues variant par variant, elles changeraient d'un état à
 * l'autre et plus rien ne serait indexable.
 */
import { resolveColorKeys } from './colorKeys';
import type { VariantEntry, VariantMatrix } from './componentTree';
import type { ComposedInstances } from './exportableNodes';
import { getSlotTokens } from './extractSlotTokens';
import type { TokenResolver, VariantColor, VariantStrokeColor } from './extractSlotTokens';
import { toRef } from '@ucm-kit/core/format';
import type { SlotStrokes, SlotTokens } from '@ucm-kit/core/format';
import {
  declarerLesRacinesDeVariants,
  estUneRacineDeVariant,
  pousserLocalise,
  pousserSansNode,
  reporterLocalisations,
} from './localisation';
export { getSlotTokens } from './extractSlotTokens';
export type { VariantTokenLeaves } from './extractSlotTokens';

/** Feuille de peintures : une référence de token par clé. */
function paintLeaf(colors: readonly VariantColor[], keys: ReadonlyMap<string, string>): SlotTokens {
  return Object.fromEntries(colors.map((color) => [keys.get(color.token), toRef(color.token)]));
}

/** Feuille de contours : la couleur et la géométrie que le contrat publie. */
function strokeLeaf(
  colors: readonly VariantStrokeColor[],
  keys: ReadonlyMap<string, string>,
): SlotStrokes {
  return Object.fromEntries(colors.map((color) => [
    keys.get(color.token),
    { color: toRef(color.token), width: color.width, align: color.align },
  ]));
}

/** Cibles Figma internes, converties ensuite en chemins par l'arbre déjà extrait. */
export type VariantPaintNodeIds = {
  fills: Record<string, string[]>;
  strokes: Record<string, string[]>;
};

function placementNodeIds(
  leaf: { paints: readonly VariantColor[]; strokes: readonly VariantStrokeColor[] },
  keys: ReadonlyMap<string, string>,
): VariantPaintNodeIds {
  return {
    fills: Object.fromEntries(leaf.paints.map((color) => [
      keys.get(color.token) ?? color.token,
      color.nodeIds ?? [],
    ])),
    strokes: Object.fromEntries(leaf.strokes.map((color) => [
      keys.get(color.token) ?? color.token,
      color.nodeIds ?? [],
    ])),
  };
}

/**
 * Point d'entrée : relève les tokens de toutes les variantes (tous les axes,
 * toutes les couleurs).
 */
export async function extractVariantTokens(
  matrix: VariantMatrix,
  resolver: TokenResolver,
  warnings: string[],
  composed: ComposedInstances = new Map(),
  iconNames: ReadonlySet<string> = new Set(),
  notices: string[] = warnings,
): Promise<{
  /** Feuille exacte de chaque node, y compris lorsque ses coordonnées sont dupliquées. */
  tokensByComponent: Map<ComponentNode, SlotTokens>;
  /** Strokes exacts de chaque node, avec la même garantie que `tokensByComponent`. */
  strokesByComponent: Map<ComponentNode, SlotStrokes>;
  /** Cibles internes de chaque clé, converties en chemins de slots par `extractStructure`. */
  paintNodeIdsByComponent: Map<ComponentNode, VariantPaintNodeIds>;
  /** Rôle de rendu relevé pour chaque clé, un côté par arbre, sur toute la matrice. */
  discoveredRoles: { fills: Map<string, string>; strokes: Map<string, string> };
}> {
  const tokensByComponent = new Map<ComponentNode, SlotTokens>();
  const strokesByComponent = new Map<ComponentNode, SlotStrokes>();
  const paintNodeIdsByComponent = new Map<ComponentNode, VariantPaintNodeIds>();
  // Un côté par arbre publié. `colorKeys` décide sur des feuilles séparées : la
  // clé courte `background` peut désigner deux tokens différents, l'un en
  // peinture, l'autre en contour. Une table unique en perdrait un, et le
  // consommateur peindrait le mauvais côté sans un mot.
  const discoveredRoles = { fills: new Map<string, string>(), strokes: new Map<string, string>() };
  const reportedRoleConflicts = new Set<string>();

  // Les appels à l'API Figma restent parallèles, mais rien n'est écrit ici :
  // chaque variant collecte même ses propres avertissements. L'ordre où les
  // promesses se règlent ne doit décider ni de l'ordre des clés, ni de quel
  // variant gagne un conflit : sinon deux exports d'un design inchangé
  // donneraient des JSON différents, donc une pull request pour rien.
  // Chaque canal de variant reprend les racines que `warnings` a déclarées :
  // une seconde règle de déclaration pourrait regrouper ce que la première
  // laisse au nom de son calque.
  const racines = matrix.variants
    .map(({ component }) => component)
    .filter((component) => estUneRacineDeVariant(warnings, component));
  const collected = await Promise.all(
    matrix.variants.map(async (entry: VariantEntry) => {
      const variantWarnings: string[] = [];
      declarerLesRacinesDeVariants(variantWarnings, racines);
      const leaf = await getSlotTokens(
        entry.component,
        resolver,
        variantWarnings,
        composed,
        iconNames,
      );
      return { entry, leaf, variantWarnings };
    }),
  );

  // Première passe, séquentielle : c'est la matrice qui fixe l'ordre des clés,
  // celui des avertissements et le sens de « premier conservé » dans les seuls
  // arbres historiques. Aucun variant réel n'est écarté de la vue exacte.
  const exact: Array<{
    entry: VariantEntry;
    leaf: (typeof collected)[number]['leaf'];
  }> = [];
  for (const { entry, leaf, variantWarnings } of collected) {
    warnings.push(...variantWarnings);
    reporterLocalisations(variantWarnings, warnings);
    if (leaf.paints.length === 0 && leaf.strokes.length === 0) {
      pousserLocalise(notices, 'Variant', entry.component, {
        famille: 'variables',
        manque: 'aucun fill ni stroke n’est relié à une variable.',
        impact: 'Aucune couleur n’est exportée pour lui.',
        action: 'Reliez ses fills et ses strokes à des variables Figma, puis réexportez.',
      });
    }
    exact.push({ entry, leaf });
  }

  // Deuxième passe : les clés se décident sur toutes les feuilles exactes. Un
  // doublon de coordonnées reste un variant publié ; ses couleurs doivent donc
  // participer à la clé stable de toute la matrice.
  const keys = resolveColorKeys(
    exact.flatMap(({ leaf }) => [
      leaf.paints.map((color) => color.token),
      leaf.strokes.map((color) => color.token),
    ]),
  );

  // Troisième passe : les feuilles exactes et les rôles, toujours dans l'ordre
  // de la matrice. Les maps sont internes à l'orchestrateur et ne sont jamais
  // sérialisées telles quelles.
  for (const { entry, leaf } of exact) {
    tokensByComponent.set(entry.component, paintLeaf(leaf.paints, keys));
    strokesByComponent.set(entry.component, strokeLeaf(leaf.strokes, keys));
    paintNodeIdsByComponent.set(entry.component, placementNodeIds(leaf, keys));
    // Le rôle d'une clé est relevé sur toute la matrice, de son côté. Une clé
    // dont le rôle porte déjà le nom n'a rien à publier : le consommateur la
    // résout dans le vocabulaire partagé.
    //
    // Le conflit se juge à l'intérieur d'un côté, et là seulement : un fill et
    // un stroke ne se contredisent pas, ils vivent dans deux arbres et dans
    // deux tables. Le même token posé sur des calques de natures différentes
    // dans le même arbre (une surface ici, un texte là) ne peut recevoir
    // qu'un rendu : on garde le premier et on le dit, plutôt que de laisser
    // l'ordre des promesses trancher en silence.
    const relever = (colors: readonly { token: string; role: string }[], cote: 'fills' | 'strokes') => {
      for (const color of colors) {
        const key = keys.get(color.token) ?? color.token;
        if (key === color.role) continue;
        const table = discoveredRoles[cote];
        const known = table.get(key);
        if (!known) {
          table.set(key, color.role);
          continue;
        }
        // Un seul message par clé : le même calque revient dans chaque variant,
        // et un Button en a 30.
        const conflit = `${cote}.${key}`;
        if (known === color.role || reportedRoleConflicts.has(conflit)) continue;
        reportedRoleConflicts.add(conflit);
        pousserSansNode(warnings, `Token ${toRef(color.token)}`, {
          famille: 'variables',
          manque: `il peint un « ${known} » dans un variant et un « ${color.role} » dans `
            + `un autre.`,
          impact: `Le développeur l'utilisera partout comme un « ${known} ».`,
          action: `Utilisez une variable différente pour chaque usage, puis réexportez.`,
        });
      }
    };
    relever(leaf.paints, 'fills');
    relever(leaf.strokes, 'strokes');
  }

  return {
    tokensByComponent,
    strokesByComponent,
    paintNodeIdsByComponent,
    discoveredRoles,
  };
}
