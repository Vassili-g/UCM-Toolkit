/**
 * Traduction des propriétés Figma en props publiques du contrat. Le modèle et
 * ses noms de clés vivent dans `analyse/proprietesEtEtats.ts`, que ce fichier
 * ré-exporte.
 */
import {
  extractContractPropertyModel,
  normalizePropKey,
} from '../analyse/proprietesEtEtats';
import type { ContractProp } from '@ucm-kit/core/format';

export {
  definePropOn,
  extractContractPropertyModel,
  isStateProperty,
  normalizePropKey,
  normalizePropValue,
} from '../analyse/proprietesEtEtats';
export type { ContractPropertyModel } from '../analyse/proprietesEtEtats';

/**
 * Lit une prop par son nom sans jamais atteindre le prototype d'`Object`.
 *
 * Les noms interrogés viennent de Figma ou du texte libre d'une règle, et
 * `props` est un objet littéral : demander « constructor » ou « toString » y
 * obtiendrait une fonction héritée pour réponse, donc une prop que le composant
 * n'expose pas. Unique autorité sur cette lecture, pour que la précaution ne
 * dépende pas de la vigilance de chaque appelant.
 */
export function propByName(
  props: Record<string, ContractProp>,
  name: string,
): ContractProp | undefined {
  return Object.prototype.hasOwnProperty.call(props, name) ? props[name] : undefined;
}

/**
 * Les deux component properties de type `VARIANT` dont les noms se confondent
 * une fois normalisés, ou `null` si chaque axe garde une clé publique à lui.
 *
 * Un axe ne se replie pas comme les autres propriétés. Ses valeurs sont les
 * coordonnées des variants, et deux axes réduits à une seule clé les
 * mélangeraient : `structure.variantAxes` citerait deux fois le même nom, et
 * chaque variant ne publierait qu'une des deux coordonnées.
 * `handleExportComponent` en fait une précondition d'export.
 */
export function collidingVariantAxes(
  definitions: ComponentPropertyDefinitions,
): [string, string] | null {
  const figmaNameByKey = new Map<string, string>();
  for (const [propertyName, definition] of Object.entries(definitions)) {
    if (definition.type !== 'VARIANT') continue;
    const key = normalizePropKey(propertyName);
    const rawFigmaName = propertyName.replace(/#.*$/, '');
    const first = figmaNameByKey.get(key);
    if (first !== undefined) return [first, rawFigmaName];
    figmaNameByKey.set(key, rawFigmaName);
  }
  return null;
}

/** Raccourci historique pour les appelants qui n'ont besoin que des props. */
export function extractContractProps(
  definitions: ComponentPropertyDefinitions,
  warnings: string[] = [],
): Record<string, ContractProp> {
  return extractContractPropertyModel(definitions, warnings).props;
}
