/**
 * Couche sémantique du contrat : conventions de nommage et correspondances
 * vers le vocabulaire partagé décrit dans CONCEPT.md.
 *
 * Les noms Figma accidentels (axe « Button-Construc-Type », calque
 * « Suivant »…) sont traduits vers un vocabulaire partagé, lisible par un
 * humain ou un agent IA sans interprétation externe. L'appelant conserve
 * toujours le nom Figma d'origine (figmaName / figmaLayer) : zéro perte.
 *
 * Règle d'or : le mapping se décide sur les valeurs ou le rôle, jamais sur
 * le nom d'un composant, aucun cas particulier codé en dur.
 */
import {
  kindDeNature,
  natureDuRole,
  roleDeRendu,
  tableDesRolesDeRendu,
} from '@ucm-kit/core/format';
import type { RenderingRole, RenderingSemantics } from '@ucm-kit/core/format';

export { STATE_AXIS_NAMES, buildStateModel, semanticEnumName } from '../analyse/proprietesEtEtats';

/**
 * Rôle sémantique d'un calque. Un calque texte est toujours le `label`, peu
 * importe son nom Figma (souvent le texte d'exemple, ex. « Suivant »). Un
 * calque graphique désigné par une règle `@icons` est toujours l'`icon`.
 *
 * Nommer l'icône par son rôle est ce qui rend son slot stable sur toute la
 * matrice. Un composant dont l'icône change avec le variant (une Alert :
 * `circle-info` en info, `circle-check` en success) garde ainsi un seul slot,
 * là où le nom du calque en aurait inventé un par variant, et le contrat
 * n'aurait décrit que celui du variant de référence. Le déclencheur est la
 * règle du designer, jamais la position ni le nom du calque.
 */
export function semanticSlotName(isText: boolean, isIconTarget = false): string | null {
  if (isText) return 'label';
  return isIconTarget ? 'icon' : null;
}

/**
 * Nom d'un slot homonyme : le premier garde le nom de base, les suivants sont
 * numérotés à partir de 2. Règle unique, partagée par la déduplication des
 * slots et par le rapprochement des icônes : deux formulations du même
 * suffixe finiraient par diverger.
 *
 * @example indexedSlotName('icon', 0) // → 'icon'
 * @example indexedSlotName('icon', 1) // → 'icon-2'
 */
export function indexedSlotName(base: string, index: number): string {
  return index === 0 ? base : `${base}-${index + 1}`;
}

/**
 * Le rôle relevé de chaque clé de couleur, un côté par arbre publié.
 *
 * `extractVariantTokens` le remplit, `renderingSemanticsFor` le publie. Les
 * deux côtés ne se mélangent jamais : une clé n'est unique que dans son arbre.
 */
export type DiscoveredRoles = {
  fills: ReadonlyMap<string, string>;
  strokes: ReadonlyMap<string, string>;
};

/**
 * Retourne le vocabulaire de rendu partagé par tous les contrats. Il est exporté
 * dans chaque contrat afin qu'un agent n'ait pas à deviner le CSS d'un rôle.
 */
export function defaultRenderingSemantics(): RenderingSemantics {
  return { roles: tableDesRolesDeRendu() };
}

/**
 * Vrai si cette clé nomme un des rôles que `rendering.roles` publie pour tous
 * les composants. Une seule fonction répond à cette question : l'extraction et
 * la publication la posent toutes les deux, et deux tests équivalents en
 * apparence finiraient par diverger au premier rôle ajouté.
 */
export function isRenderableRole(key: string): boolean {
  return roleDeRendu(key) !== null;
}

/**
 * La nature d'un rôle partagé (`paint` ou `stroke`), ou `null` si ce nom n'en
 * désigne aucun.
 */
export function roleKind(role: string): RenderingRole['kind'] | null {
  const nature = natureDuRole(role);
  return nature === null ? null : kindDeNature(nature);
}

/**
 * Rôle de rendu déduit du site d'application, c'est-à-dire de ce que Figma
 * peint réellement : jamais du nom du token.
 *
 * C'est la contrepartie de la règle d'or en haut de ce fichier : un token
 * nommé `…/scale-1` ne dit rien de ce qu'il peint, mais le calque qui le porte
 * le dit entièrement.
 *
 * Même ordre que `semanticSlotName` (le texte d'abord, l'icône ensuite) pour
 * que les deux se lisent comme une seule règle. Le défaut est la surface :
 * seuls deux signaux explicites (être un texte, être désigné par une règle
 * `@icons`) en font de l'encre. Le type du node ne tranche pas, un `RECTANGLE`
 * étant une surface ou un tracé d'icône selon l'usage, et le promouvoir en
 * signal remplacerait une convention de nommage visible par une convention de
 * typage invisible.
 *
 * Pour un contour, `border` couvre le rendu, et c'est `align`, déjà publié sur
 * chaque feuille de `variantStrokes`, qui dit de quel côté de la boîte le
 * dessiner : une donnée structurelle observée, jamais un `ring` deviné.
 *
 * C'est cette fonction qui décide de la nature du rendu, et elle seule. Le nom
 * du token ne peut que préciser le rôle à l'intérieur de cette nature, jamais
 * la contredire.
 */
export function paintSiteRole(site: {
  isStroke: boolean;
  isText: boolean;
  isIconTarget: boolean;
}): string {
  if (site.isStroke) return 'border';
  if (site.isText) return 'foreground';
  return site.isIconTarget ? 'icon' : 'background';
}

/**
 * Produit le vocabulaire partagé et la correspondance propre au contrat.
 * `roles` garde une signification identique partout ; `keyRoles` relie une clé
 * opaque au rôle déduit de son calque, séparément pour fills et strokes. Une clé
 * déjà homonyme de son rôle est omise. Les entrées sont triées pour stabiliser le JSON.
 */
export function renderingSemanticsFor(
  discovered: DiscoveredRoles,
): RenderingSemantics {
  const semantics = defaultRenderingSemantics();
  const table = (roles: ReadonlyMap<string, string>): Record<string, string> => {
    const publiees: Record<string, string> = {};
    for (const key of Array.from(roles.keys()).sort()) {
      const role = roles.get(key);
      // Un rôle inconnu n'existe pas : `paintSiteRole` et `colorRole` n'en
      // rendent que des partagés. La garde vaut pour le lecteur.
      if (!role || !isRenderableRole(role) || key === role) continue;
      // Les clés viennent de Figma. `publiees[key] = …` laisserait un token
      // nommé « __proto__ » écrire dans le prototype : l'entrée disparaîtrait
      // du JSON sans un mot, et le contrat citerait un rendu qu'il ne publie
      // pas.
      Object.defineProperty(publiees, key, {
        value: role, enumerable: true, writable: true, configurable: true,
      });
    }
    return publiees;
  };

  const fills = table(discovered.fills);
  const strokes = table(discovered.strokes);
  const keyRoles = {
    ...(Object.keys(fills).length > 0 ? { fills } : {}),
    ...(Object.keys(strokes).length > 0 ? { strokes } : {}),
  };
  return Object.keys(keyRoles).length > 0 ? { ...semantics, keyRoles } : semantics;
}
