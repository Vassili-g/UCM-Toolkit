/**
 * Première famille de requêtes pures du moteur : le modèle de propriétés d'un
 * jeu (`props`) et le modèle d'états (`stateModel`), avec leurs diagnostics.
 *
 * Une requête lit ses paramètres et rien d'autre : ni nœud Figma, ni global
 * `figma`, ni registre de localisation. Elle rend son résultat et les points à
 * signaler, dans l'ordre où l'ancien chemin les poussait. L'appelant les pousse
 * dans le canal de son choix avec `pousserLesPoints`. Ces points n'ont pas de
 * node : ils ne consultent donc ni `estUneRacineDeVariant` ni l'identité du
 * canal, et l'ordre de poussée est le seul état qui les relie.
 */
import { estUneValeurDesactivee, normalizeName } from '@ucm-kit/core/format';
import {
  REGISTRE_ETATS,
  SIZE_VALUES,
  STATE_AXIS_NAMES as AXES_ETAT,
  STATE_PRECEDENCE,
  STATE_SELECTORS,
  termeRetenu,
} from '@ucm-kit/core/referentiel';
import { pousserSansNode } from '../contract/localisation';
import type { Constat } from '../contract/localisation';
import type { ContractProp, StateDescriptor, StateModel } from '@ucm-kit/core/format';

/**
 * Ce que chaque requête lit. Les lots 9 et 10 invalident un résultat quand une
 * entrée change ; `referentiel` nomme les constantes du kit lues en plus, qui
 * ne changent qu'avec sa version.
 */
export const DEPENDANCES_DE_PROPRIETES_ET_ETATS = {
  modeleDeProprietes: {
    entrees: ['componentPropertyDefinitions'],
    referentiel: ['SIZE_VALUES', 'STATE_AXIS_NAMES'],
  },
  modeleDEtats: {
    entrees: ['axes de la matrice', 'valeurs de chaque variant de la matrice'],
    referentiel: ['REGISTRE_ETATS', 'STATE_AXIS_NAMES', 'STATE_PRECEDENCE', 'STATE_SELECTORS'],
  },
} as const;

/**
 * Les noms, une fois normalisés, d'un axe d'états : `State`, `States` ou
 * `Status` dans Figma. Unique liste : `isStateProperty` en retire l'axe des
 * props, `lireLeModeleDEtats` le publie, et les deux lectures ne peuvent pas
 * diverger.
 */
export const STATE_AXIS_NAMES: readonly string[] = AXES_ETAT;

/** Les définitions de propriétés d'un jeu ou d'un composant, copiées telles que Figma les donne. */
export type DefinitionsDeProprietes = ComponentPropertyDefinitions;

/** Un message sans node : le sujet qui ouvre son titre, et ses parties. */
export type PointSansNode = {
  readonly sujet: string;
  readonly constat: Constat;
};

/** Un point du modèle d'états : un avertissement, ou un terme toléré (`notices`). */
export type PointDEtat = PointSansNode & {
  readonly canal: 'avertissements' | 'notices';
};

/**
 * Normalise un nom de propriété Figma en clé camelCase.
 * Étapes : retirer l'identifiant interne (« #12:3 »), marquer les frontières
 * du camelCase existant pour ne pas l'aplatir (`iconLeft` reste `iconLeft`),
 * puis recomposer mot à mot.
 *
 * @example normalizePropKey('Icon Position#12:3') // → 'iconPosition'
 */
export function normalizePropKey(name: string): string {
  const withoutFigmaId = name.replace(/#.*$/, '');
  // Insère une frontière avant chaque majuscule interne ('iconLeft' → 'icon Left').
  const withCamelBoundaries = withoutFigmaId.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = normalizeName(withCamelBoundaries)
    .replace(/\./g, '-')
    .split('-')
    .filter(Boolean);

  return words
    .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
    .join('');
}

/** Normalise une valeur de variante (minuscules, espaces → tirets). */
export function normalizePropValue(value: string): string {
  return normalizeName(value).replace(/\./g, '-');
}

/**
 * Écrit une prop sans jamais atteindre le prototype d'`Object`.
 *
 * Les clés viennent de Figma (nom d'une component property, nom d'un calque
 * d'icône) et `props` est un objet littéral : `props[key] = prop` laisserait
 * une propriété nommée « __proto__ » fixer le prototype au lieu d'occuper une
 * clé. La prop quitterait le contrat sans un mot, et `propByName` continuerait
 * de répondre qu'elle n'existe pas. C'est la contrepartie exacte de
 * `propByName` en écriture, et la seule autorité : la précaution ne doit pas
 * dépendre de la vigilance de chaque appelant.
 */
export function definePropOn(
  props: Record<string, ContractProp>,
  key: string,
  prop: ContractProp,
): void {
  Object.defineProperty(props, key, {
    value: prop, enumerable: true, writable: true, configurable: true,
  });
}

/**
 * Un axe « état » (hover, focus, disabled…) est design-only : il décrit des
 * états d'interaction, pas des choix d'API. Il est exclu des props : seule
 * sa valeur Disable devient une prop booléenne `disabled`. Détecté par le
 * nom de l'axe, donc valable pour n'importe quel composant.
 *
 * La convention porte sur un axe, donc sur le seul type `VARIANT`. Une BOOLEAN
 * ou une TEXT nommée « State » est une propriété comme une autre : `stateModel`
 * ne la décrit pas, et l'exclure des props la ferait disparaître du contrat sans
 * qu'aucun message ne la nomme.
 */
export function isStateProperty(key: string): boolean {
  return STATE_AXIS_NAMES.includes(key);
}

/**
 * Nom sémantique d'un axe enum, ou null pour garder le nom brut.
 * Seule règle actuelle : toutes les valeurs sont des tailles → `size`.
 * La liste est faite pour grandir (emphasis, tone…) au fil des besoins.
 */
export function semanticEnumName(values: string[]): string | null {
  if (values.length >= 2 && values.every((value) => SIZE_VALUES.has(value))) {
    return 'size';
  }
  return null;
}

/** Le modèle d'un jeu : ses props publiques et les correspondances de clés. */
export type ContractPropertyModel = {
  props: Record<string, ContractProp>;
  /** Axe normalisé dans Figma → clé réellement publiée dans le contrat. */
  publicVariantKeyByRawKey: Map<string, string>;
  /** Nom technique Figma complet (`Label#12:3`) → prop publique. */
  publicPropertyKeyByFigmaName: Map<string, string>;
};

/**
 * Convertit les définitions de propriétés Figma en props publiques :
 * variant → enum, BOOLEAN → boolean, TEXT → string.
 * La couche sémantique renomme les axes reconnus (ex. axe de tailles →
 * `size`) en gardant le nom Figma d'origine dans `figmaName`.
 *
 * **Une clé publique, un propriétaire.** Les props du contrat vivent dans un
 * espace de noms plat, alors que deux propriétés Figma parfaitement légales
 * peuvent y prétendre : soit parce que la normalisation efface leur
 * différence d'écriture (`Icon Left`, `icon-left` et `iconLeft` donnent tous
 * `iconLeft`), soit parce que la couche sémantique fabrique une clé
 * (`size`) qu'une autre propriété porte déjà. Le premier arrivé est conservé
 * et le conflit est signalé : jamais d'écrasement en silence, conformément à
 * la règle appliquée partout ailleurs (variants, rôles, règles d'icônes).
 */
export function lireLeModeleDeProprietes(
  definitions: DefinitionsDeProprietes,
): { modele: ContractPropertyModel; points: readonly PointSansNode[] } {
  const points: PointSansNode[] = [];
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
      points.push({
        sujet: `Propriétés de composant « ${owner} » et « ${figmaName} »`,
        constat: {
          famille: 'proprietes',
          manque: `leurs noms donnent le même nom « ${key} » dans le contrat.`,
          impact: `Le contrat ne publie que la première : la seconde manquera au développeur.`,
          action: `Renommez l’une des deux, puis réexportez.`,
        },
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
        points.push({
          sujet: `Propriété de variante « ${rawFigmaName} »`,
          constat: {
            famille: 'proprietes',
            manque: `ses valeurs sont des tailles, mais une autre propriété de composant porte `
              + `déjà le nom « ${semantic} ».`,
            impact: `Elle reste exportée sous « ${key} ».`,
            action: `Renommez l'une des deux si vous voulez « ${semantic} », puis réexportez.`,
          },
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
        points.push({
          sujet: `Propriété de composant « ${rawFigmaName} »`,
          constat: {
            famille: 'proprietes',
            manque: `la propriété de variante « ${stateFigmaName} » a déjà la valeur `
              + `« ${disabledStateName} », que le contrat publie sous le nom « disabled ».`,
            impact: `Le contrat ne publie pas cette propriété booléenne : sa valeur par défaut `
              + `manquera au développeur.`,
            action: `Supprimez-la si elle pilote le même état, sinon renommez-la d’après le `
              + `calque qu’elle pilote, puis réexportez.`,
          },
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

  return {
    modele: { props, publicVariantKeyByRawKey, publicPropertyKeyByFigmaName },
    points,
  };
}

/**
 * Construit le modèle d'interaction d'un composant à partir de ses axes et
 * de ses variants. Les états inconnus restent visibles dans le contrat, mais
 * leur déclencheur est nul et un point demande une convention explicite. Le
 * canal `notices` d'un point distingue les termes tolérés des déclencheurs
 * inconnus.
 */
export function lireLeModeleDEtats(
  axes: readonly string[],
  variantValues: ReadonlyArray<Readonly<Record<string, string>>>,
): { modele: StateModel | null; points: readonly PointDEtat[] } {
  const axis = axes.find((candidate) => isStateProperty(candidate));
  if (!axis) return { modele: null, points: [] };

  const points: PointDEtat[] = [];
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
      points.push({
        canal: 'avertissements',
        sujet: `Propriété de variante « ${axis} »`,
        constat: {
          famille: 'proprietes',
          manque: `l'état « ${value} » n'est pas reconnu.`,
          impact: `Le développeur ne saura pas quand afficher ce variant.`,
          action: `Renommez cette valeur en default, hover, focus, pressed ou disabled, puis `
            + `réexportez.`,
        },
      });
    } else {
      const terme = termeRetenu(REGISTRE_ETATS, value);
      if (terme && terme.id !== value) {
        points.push({
          canal: 'notices',
          sujet: `Propriété de variante « ${axis} »`,
          constat: {
            famille: 'proprietes',
            manque: `l’état « ${value} » s’écrit « ${terme.id} » dans le vocabulaire UCM.`,
            impact: `Le développeur recevra « ${value} » au lieu de « ${terme.id} ».`,
            action: `Renommez la valeur en « ${terme.id} » dans Figma ou avec UCM Architect, puis réexportez.`,
          },
        });
      }
    }
  }

  const precedence = [
    ...STATE_PRECEDENCE.filter((value) => values.includes(value)),
    ...values.filter((value) => !(STATE_PRECEDENCE as readonly string[]).includes(value)),
  ];

  return { modele: { axis, states: Object.fromEntries(states), precedence }, points };
}

/** Pousse des points dans un canal, un à un et dans l'ordre reçu. */
export function pousserLesPoints(canal: string[], points: readonly PointSansNode[]): void {
  for (const point of points) pousserSansNode(canal, point.sujet, point.constat);
}

/**
 * Les remplaçantes que le banc de parité installe pour rejouer l'ancien chemin
 * (copié dans les tests) à la place de la requête, avec la même signature que
 * les points d'entrée de production.
 */
export type RequetesDuBanc = {
  modeleDeProprietes?: (definitions: DefinitionsDeProprietes, warnings: string[]) => ContractPropertyModel;
  modeleDEtats?: (
    axes: string[],
    variantValues: Array<Record<string, string>>,
    warnings: string[],
    notices: string[],
  ) => StateModel | null;
};

let remplacantes: RequetesDuBanc = {};

/** Installe les remplaçantes du banc ; `{}` rétablit la production. */
export function remplacerLesRequetesPourLeBanc(requetes: RequetesDuBanc): void {
  remplacantes = requetes;
}

/**
 * Point d'entrée de production du modèle de propriétés : appelle la requête,
 * pousse ses points dans `warnings`, rend le modèle. Les appelants qui n'ont
 * pas besoin des messages passent le canal par défaut, jeté.
 */
export function extractContractPropertyModel(
  definitions: DefinitionsDeProprietes,
  warnings: string[] = [],
): ContractPropertyModel {
  if (remplacantes.modeleDeProprietes) return remplacantes.modeleDeProprietes(definitions, warnings);
  const { modele, points } = lireLeModeleDeProprietes(definitions);
  pousserLesPoints(warnings, points);
  return modele;
}

/**
 * Point d'entrée de production du modèle d'états : les points du canal
 * `notices` vont dans `notices`, les autres dans `warnings`, dans l'ordre de
 * la requête. Sans canal `notices`, tout va dans `warnings`.
 */
export function buildStateModel(
  axes: string[],
  variantValues: Array<Record<string, string>>,
  warnings: string[],
  notices: string[] = warnings,
): StateModel | null {
  if (remplacantes.modeleDEtats) return remplacantes.modeleDEtats(axes, variantValues, warnings, notices);
  const { modele, points } = lireLeModeleDEtats(axes, variantValues);
  for (const point of points) {
    pousserSansNode(point.canal === 'notices' ? notices : warnings, point.sujet, point.constat);
  }
  return modele;
}
