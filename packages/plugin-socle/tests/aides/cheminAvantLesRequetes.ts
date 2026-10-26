/**
 * Les deux fonctions du moteur telles qu'elles étaient avant leur extraction en
 * requêtes pures (`analyse/proprietesEtEtats.ts`), recopiées sans changement de
 * corps. Le banc de parité les installe à la place des requêtes pour comparer
 * les deux chemins sur les mêmes entrées ; la case 7.8 retire l'ancien chemin
 * et ce fichier avec lui.
 */
import { estUneValeurDesactivee } from '@ucm-kit/core/format';
import {
  REGISTRE_ETATS,
  STATE_PRECEDENCE,
  STATE_SELECTORS,
  termeRetenu,
} from '@ucm-kit/core/referentiel';
import { pousserSansNode } from '../../src/composant/contract/localisation';
import {
  STATE_AXIS_NAMES,
  definePropOn,
  isStateProperty,
  normalizePropKey,
  normalizePropValue,
  semanticEnumName,
} from '../../src/composant/analyse/proprietesEtEtats';
import type { ContractProp, StateDescriptor, StateModel } from '@ucm-kit/core/format';
import type { ContractPropertyModel } from '../../src/composant/analyse/proprietesEtEtats';

export function modeleDeProprietesAvant(
  definitions: ComponentPropertyDefinitions,
  warnings: string[] = [],
): ContractPropertyModel {
  const props: Record<string, ContractProp> = {};
  const publicVariantKeyByRawKey = new Map<string, string>();
  const publicPropertyKeyByFigmaName = new Map<string, string>();
  /** Nom Figma qui détient chaque clé publique, pour nommer les deux camps d'un conflit. */
  const owners = new Map<string, string>();

  // Première passe : toutes les clés brutes revendiquées par le fichier Figma.
  // Sans elle, un renommage sémantique volerait la clé d'une propriété
  // simplement déclarée plus loin : le résultat dépendrait de l'ordre.
  const rawKeys = new Set(Object.keys(definitions).map((name) => normalizePropKey(name)));

  // La convention State/Status possède une priorité sémantique : son variant
  // Disable décrit l'état interactif du composant. Réserver cette prop avant
  // de parcourir les BOOLEAN rend la sortie indépendante de leur ordre Figma.
  const disabledState = Object.entries(definitions).find(([propertyName, definition]) =>
    isStateProperty(normalizePropKey(propertyName)) &&
    definition.type === 'VARIANT' &&
    (definition.variantOptions ?? []).some(estUneValeurDesactivee),
  );
  if (disabledState) {
    const [propertyName, definition] = disabledState;
    if (definition.type === 'VARIANT') {
      const rawFigmaName = propertyName.replace(/#.*$/, '');
      owners.set('disabled', rawFigmaName);
      definePropOn(props, 'disabled', {
        type: 'boolean',
        default: estUneValeurDesactivee(definition.defaultValue),
      });
    }
  }

  /** Attribue une clé publique, ou refuse et signale le conflit. */
  const claim = (key: string, figmaName: string, prop: ContractProp): boolean => {
    const owner = owners.get(key);
    if (owner !== undefined) {
      pousserSansNode(warnings, `Propriétés de composant « ${owner} » et « ${figmaName} »`, {
        famille: 'proprietes',
        manque: `leurs noms donnent le même nom « ${key} » dans le contrat.`,
        impact: `Le contrat ne publie que la première : la seconde manquera au développeur.`,
        action: `Renommez l’une des deux, puis réexportez.`,
      });
      return false;
    }
    owners.set(key, figmaName);
    definePropOn(props, key, prop);
    return true;
  };

  // Les axes réservent leur clé publique avant les autres propriétés. Sans cette
  // priorité, une BOOLEAN déclarée plus haut dans le fichier prendrait la clé de
  // l'axe : `structure.variantAxes` citerait un nom que `props` décrirait comme
  // un booléen, et les valeurs des variants n'auraient plus d'enum où se lire.
  const parPriorite = [
    ...Object.entries(definitions).filter(([, definition]) => definition.type === 'VARIANT'),
    ...Object.entries(definitions).filter(([, definition]) => definition.type !== 'VARIANT'),
  ];

  for (const [propertyName, definition] of parPriorite) {
    const key = normalizePropKey(propertyName);
    const rawFigmaName = propertyName.replace(/#.*$/, '');

    if (isStateProperty(key) && definition.type === 'VARIANT') {
      publicVariantKeyByRawKey.set(key, key);
      // L'axe d'états ne devient pas une prop, et il détient malgré tout sa clé
      // publique : une BOOLEAN homonyme qui la prendrait publierait sous ce nom
      // une prop que `stateModel` décrit déjà comme un axe.
      owners.set(key, rawFigmaName);
      continue;
    }

    if (definition.type === 'VARIANT') {
      const values = (definition.variantOptions ?? []).map((value) => normalizePropValue(value));
      const semantic = semanticEnumName(values);
      // Le nom sémantique ne s'applique que s'il n'entre en conflit avec
      // aucune clé brute du fichier, pas seulement avec celles déjà traitées.
      const taken = Boolean(semantic) && semantic !== key && rawKeys.has(semantic as string);
      if (taken) {
        pousserSansNode(warnings, `Propriété de variante « ${rawFigmaName} »`, {
          famille: 'proprietes',
          manque: `ses valeurs sont des tailles, mais une autre propriété de composant porte `
            + `déjà le nom « ${semantic} ».`,
          impact: `Elle reste exportée sous « ${key} ».`,
          action: `Renommez l'une des deux si vous voulez « ${semantic} », puis réexportez.`,
        });
      }
      const publicKey = semantic && !taken ? semantic : key;
      // Aucun `default` ici, et c'est la règle : le `defaultValue` d'une
      // variant property est le variant de première position du component set,
      // donc un effet de bord de la mise en page. Le défaut d'un axe se déclare
      // par une règle `@default`, et `mergeEnumDefaults` le pose ; son absence
      // signifie « aucun défaut publié », ce que l'élision sait déjà écrire.
      const claimed = claim(publicKey, rawFigmaName, {
        type: 'enum',
        values,
        // figmaName n'apparaît que si la clé publique diffère du nom Figma.
        ...(publicKey !== key ? { figmaName: rawFigmaName } : {}),
      });
      if (claimed) {
        publicVariantKeyByRawKey.set(key, publicKey);
        publicPropertyKeyByFigmaName.set(propertyName, publicKey);
      }
      continue;
    }

    if (definition.type === 'BOOLEAN') {
      if (key === 'disabled' && disabledState) {
        const [statePropertyName, stateDefinition] = disabledState;
        const stateFigmaName = statePropertyName.replace(/#.*$/, '');
        const disabledStateName = stateDefinition.type === 'VARIANT'
          ? (stateDefinition.variantOptions ?? []).find(estUneValeurDesactivee) ?? 'Disable'
          : 'Disable';
        pousserSansNode(warnings, `Propriété de composant « ${rawFigmaName} »`, {
          famille: 'proprietes',
          manque: `la propriété de variante « ${stateFigmaName} » a déjà la valeur `
            + `« ${disabledStateName} », que le contrat publie sous le nom « disabled ».`,
          impact: `Le contrat ne publie pas cette propriété booléenne : sa valeur par défaut `
            + `manquera au développeur.`,
          action: `Supprimez-la si elle pilote le même état, sinon renommez-la d’après le `
            + `calque qu’elle pilote, puis réexportez.`,
        });
        continue;
      }
      if (claim(key, rawFigmaName, { type: 'boolean', default: Boolean(definition.defaultValue) })) {
        publicPropertyKeyByFigmaName.set(propertyName, key);
      }
      continue;
    }

    if (definition.type === 'TEXT') {
      if (claim(key, rawFigmaName, {
        type: 'string',
        ...(typeof definition.defaultValue === 'string'
          ? { default: definition.defaultValue }
          : {}),
      })) publicPropertyKeyByFigmaName.set(propertyName, key);
      continue;
    }

    if (definition.type === 'INSTANCE_SWAP') {
      if (claim(key, rawFigmaName, {
        type: 'instance-swap',
        ...(typeof definition.defaultValue === 'string'
          ? { default: definition.defaultValue }
          : {}),
        preferredValues: [...(definition.preferredValues ?? [])],
      })) publicPropertyKeyByFigmaName.set(propertyName, key);
      continue;
    }

    if (definition.type === 'SLOT') {
      if (claim(key, rawFigmaName, {
        type: 'slot',
        ...(typeof definition.defaultValue === 'string'
          || typeof definition.defaultValue === 'boolean'
          ? { default: definition.defaultValue }
          : {}),
        preferredValues: [...(definition.preferredValues ?? [])],
        ...(definition.description ? { description: definition.description } : {}),
        ...(definition.slotSettings ? { settings: { ...definition.slotSettings } } : {}),
      })) publicPropertyKeyByFigmaName.set(propertyName, key);
    }
  }

  return { props, publicVariantKeyByRawKey, publicPropertyKeyByFigmaName };
}

export function modeleDEtatsAvant(
  axes: string[],
  variantValues: Array<Record<string, string>>,
  warnings: string[],
  notices: string[] = warnings,
): StateModel | null {
  const axis = axes.find((candidate) => STATE_AXIS_NAMES.includes(candidate));
  if (!axis) return null;

  const values = Array.from(
    new Set(variantValues.map((entry) => entry[axis]).filter((value): value is string => Boolean(value))),
  );
  // Les valeurs d'axe viennent de Figma. Une `Map` n'a aucune clé héritée, là
  // où un objet littéral laisserait un état « __proto__ » fixer son prototype
  // au lieu d'occuper une clé : `precedence`, construit depuis `values`,
  // citerait alors un état absent de `states` et le contrat se contredirait.
  const states = new Map<string, StateDescriptor>();

  for (const value of values) {
    // Une seule définition de « cet état est reconnu » : la table est un objet
    // littéral, donc `value in STATE_SELECTORS` répondrait vrai pour
    // « constructor » et supprimerait l'avertissement que la ligne suivante doit
    // produire.
    const known = Object.prototype.hasOwnProperty.call(STATE_SELECTORS, value);
    const selector = known ? STATE_SELECTORS[value] : '';
    states.set(value, selector ? { selector } : {});
    if (!known) {
      pousserSansNode(warnings, `Propriété de variante « ${axis} »`, {
        famille: 'proprietes',
        manque: `l'état « ${value} » n'est pas reconnu.`,
        impact: `Le développeur ne saura pas quand afficher ce variant.`,
        action: `Renommez cette valeur en default, hover, focus, pressed ou disabled, puis `
          + `réexportez.`,
      });
    } else {
      const terme = termeRetenu(REGISTRE_ETATS, value);
      if (terme && terme.id !== value) {
        pousserSansNode(notices, `Propriété de variante « ${axis} »`, {
          famille: 'proprietes',
          manque: `l’état « ${value} » s’écrit « ${terme.id} » dans le vocabulaire UCM.`,
          impact: `Le développeur recevra « ${value} » au lieu de « ${terme.id} ».`,
          action: `Renommez la valeur en « ${terme.id} » dans Figma ou avec UCM Architect, puis réexportez.`,
        });
      }
    }
  }

  const precedence = [
    ...STATE_PRECEDENCE.filter((value) => values.includes(value)),
    ...values.filter((value) => !(STATE_PRECEDENCE as readonly string[]).includes(value)),
  ];

  return { axis, states: Object.fromEntries(states), precedence };
}
