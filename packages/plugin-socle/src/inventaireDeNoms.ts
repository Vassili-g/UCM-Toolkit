/**
 * L'inventaire conserve les adresses Figma ; seuls les noms logiques atteignent le moteur. Il vit dans le socle
 * parce que UCM Nomenclature et UCM Palettes le construisent de la même façon.
 */
import type { CategorieDeNom, NomLu } from '@ucm-kit/core/referentiel';

export interface ObjetNomme {
  readonly id: string;
  readonly name: string;
  readonly remote: boolean;
}
export interface VariableLue extends ObjetNomme { readonly variableCollectionId: string }
/**
 * Une collection lue. Les champs facultatifs sont ceux de l'objet Figma ; un adaptateur qui ne les donne pas (UCM Palettes, un
 * test) n'expose aucun axe de modes, et le contrôle des axes ne le concerne pas.
 */
export interface CollectionLue extends ObjetNomme {
  readonly modes?: readonly unknown[];
  readonly isExtension?: boolean;
  /** Pour une collection étendue, l'identifiant de la collection racine de la chaîne d'extensions. */
  readonly rootVariableCollectionId?: string;
}

/** Le port lit les collections et les variables locales ; il ne touche à aucune page. */
export interface PortDeLecture {
  collections(): Promise<readonly CollectionLue[]>;
  variables(): Promise<readonly VariableLue[]>;
  /** Identifiant Figma visé par l'alias du premier mode de la variable, s'il y en a un. */
  cibleAlias(variable: VariableLue): string | undefined;
  /** Vrai quand la donnée partagée `palette` de la variable n'est pas vide. */
  protegee(variable: VariableLue): boolean;
  /** L'identifiant de palette que Palettes écrit dans la donnée partagée `palette` de la variable ; `undefined` quand elle est vide. */
  palette(variable: VariableLue): string | undefined;
  /** Vrai quand le fichier porte la marque par laquelle Palettes déclare qu'il y nomme ses variables selon les règles. Absent : faux. */
  palettesSuiventLesRegles?(): boolean;
}

export type CibleDeNom =
  | { readonly type: 'collection'; readonly collectionId: string }
  | { readonly type: 'variable'; readonly variableId: string; readonly collectionId: string };

export interface EntreeInventaire {
  readonly contexte?: { readonly collection?: string };
  readonly nom: NomLu;
  readonly cible: CibleDeNom;
  readonly renommable: boolean;
  /** Vrai pour une variable que la donnée partagée de Palettes protège. */
  readonly protegee: boolean;
  /** Collection seulement : le nombre de ses modes. Absent quand l'adaptateur ne lit pas les modes. */
  readonly nombreDeModes?: number;
  /** Collection seulement : vrai pour une collection étendue. Absent : faux. */
  readonly extension?: boolean;
  /** Collection étendue seulement : l'identifiant Figma de sa collection racine. */
  readonly racine?: string;
}
export interface Inventaire {
  readonly entrees: readonly EntreeInventaire[];
  /**
   * Vrai quand le fichier porte la marque de Palettes. Absent : faux. Avec des règles rangées, les variables de Palettes
   * se renomment alors comme les autres (`palettesLibres`).
   */
  readonly palettesSuiventLesRegles?: boolean;
}
/** Variables lues sur le total des variables locales. */
export interface AvancementLecture { readonly lues: number; readonly total: number }

/** Nombre de variables dont on lit l'alias et la protection avant de rendre la main. */
export const TAILLE_DU_LOT = 500;

function identite(...parties: readonly string[]): string { return JSON.stringify(parties); }

/**
 * Les segments d'un nom de variable qui précèdent son nom final sont ses
 * groupes : ils suivent l'écriture des groupes, le dernier celle des variables.
 */
function categoriesDesSegments(nom: string): (CategorieDeNom | null)[] | undefined {
  const segments = nom.split('/');
  return segments.length > 1 ? segments.map((_, rang) => (rang < segments.length - 1 ? 'groupes' : null)) : undefined;
}

/** Ce que la lecture d'une variable demande à Figma, sans attente : l'alias, la protection, la palette et la marque de Palettes. */
export type LecteurDeVariable = Pick<PortDeLecture, 'cibleAlias' | 'protegee' | 'palette' | 'palettesSuiventLesRegles'>;

function lesLocales(toutesLesCollections: readonly CollectionLue[], toutesLesVariables: readonly VariableLue[]) {
  const collections = new Map(toutesLesCollections.filter((collection) => !collection.remote).map((collection) => [collection.id, collection]));
  const variables = toutesLesVariables.filter((variable) => !variable.remote && collections.has(variable.variableCollectionId));
  return { collections, variables };
}

function entreeDeCollection(collection: CollectionLue): EntreeInventaire {
  return { nom: { id: identite('collection', collection.id), categorie: 'collections', portee: 'document', nom: collection.name },
    cible: { type: 'collection', collectionId: collection.id }, renommable: true, protegee: false,
    ...(Array.isArray(collection.modes) ? { nombreDeModes: collection.modes.length } : {}),
    ...(collection.isExtension === true ? { extension: true } : {}),
    ...(typeof collection.rootVariableCollectionId === 'string' ? { racine: collection.rootVariableCollectionId } : {}) };
}

/**
 * `cibleAlias` du nom lu est l'identifiant du nom de la variable visée, celui que le lexique indexe. Une cible qui n'est pas
 * une variable locale lue (distante, d'une collection distante ou absente) n'a pas de nom dans l'inventaire et reste sans cible.
 */
function entreeDeVariable(variable: VariableLue, collectionNom: string | undefined, lecteur: LecteurDeVariable, locales: ReadonlySet<string>): EntreeInventaire {
  const cibleFigma = lecteur.cibleAlias(variable);
  const cibleAlias = cibleFigma !== undefined && locales.has(cibleFigma) ? identite('variable', cibleFigma) : undefined;
  const palette = lecteur.palette(variable);
  const categories = categoriesDesSegments(variable.name);
  return {
    nom: { id: identite('variable', variable.id), categorie: 'variables', portee: identite('collection', variable.variableCollectionId), nom: variable.name,
      ...(categories ? { categoriesDesSegments: categories } : {}), ...(cibleAlias ? { cibleAlias } : {}), ...(palette ? { palette } : {}) },
    contexte: { collection: collectionNom },
    cible: { type: 'variable', variableId: variable.id, collectionId: variable.variableCollectionId },
    renommable: true, protegee: lecteur.protegee(variable),
  };
}

/** Lit les collections et les variables locales ; l'alias et la protection se lisent par lots, avec une pause entre deux. */
export async function lireInventaire(
  port: PortDeLecture,
  options: { readonly pause: () => Promise<void>; readonly avancement?: (etat: AvancementLecture) => void },
): Promise<Inventaire> {
  const [toutesLesCollections, toutesLesVariables] = await Promise.all([port.collections(), port.variables()]);
  const { collections, variables } = lesLocales(toutesLesCollections, toutesLesVariables);
  const locales = new Set(variables.map((variable) => variable.id));
  const entrees: EntreeInventaire[] = [...collections.values()].map(entreeDeCollection);
  options.avancement?.({ lues: 0, total: variables.length });
  for (let debut = 0; debut < variables.length; debut += TAILLE_DU_LOT) {
    if (debut > 0) await options.pause();
    for (const variable of variables.slice(debut, debut + TAILLE_DU_LOT)) {
      entrees.push(entreeDeVariable(variable, collections.get(variable.variableCollectionId)?.name, port, locales));
    }
    options.avancement?.({ lues: Math.min(debut + TAILLE_DU_LOT, variables.length), total: variables.length });
  }
  return { entrees, palettesSuiventLesRegles: port.palettesSuiventLesRegles?.() ?? false };
}

/** Construit l'inventaire de lectures déjà faites, sans attente : le même modèle que `lireInventaire`. */
export function inventaireDeLectures(
  toutesLesCollections: readonly CollectionLue[],
  toutesLesVariables: readonly VariableLue[],
  lecteur: LecteurDeVariable,
): Inventaire {
  const { collections, variables } = lesLocales(toutesLesCollections, toutesLesVariables);
  const locales = new Set(variables.map((variable) => variable.id));
  return {
    entrees: [
      ...[...collections.values()].map(entreeDeCollection),
      ...variables.map((variable) => entreeDeVariable(variable, collections.get(variable.variableCollectionId)?.name, lecteur, locales)),
    ],
    palettesSuiventLesRegles: lecteur.palettesSuiventLesRegles?.() ?? false,
  };
}

/** Le texte de la marque que Palettes range à la racine de `ESPACE_PARTAGE` : un JSON objet qui porte `version: 1`. */
export function marqueDeNommageLue(texte: string): boolean {
  if (!texte) return false;
  try {
    const brut: unknown = JSON.parse(texte);
    return typeof brut === 'object' && brut !== null && !Array.isArray(brut) && (brut as { version?: unknown }).version === 1;
  } catch { return false; }
}

export interface OptionsDeProtection {
  /** Les variables de Palettes se renomment comme les autres. Absent : faux, la protection reste. */
  readonly palettesLibres?: boolean;
}

/**
 * Les variables de Palettes sont libres quand le fichier porte la marque de Palettes et que l'écriture est rangée en v2
 * (`reglesRangees` : `lireReglesDeNommage` ne rend pas `null`). Sans l'un des deux, Palettes réécrirait ses noms bruts.
 */
export function palettesLibres(inventaire: Pick<Inventaire, 'palettesSuiventLesRegles'>, reglesRangees: boolean): boolean {
  return inventaire.palettesSuiventLesRegles === true && reglesRangees;
}

/** Le seul endroit où une entrée est dite protégée : `protegee` est le fait lu dans Figma, les options disent s'il compte. */
export function estProtegee(entree: Pick<EntreeInventaire, 'protegee'>, options: OptionsDeProtection = {}): boolean {
  return entree.protegee && options.palettesLibres !== true;
}

/** L'inventaire où `protegee` dit la protection effective ; le même objet quand rien ne change. */
export function inventaireSelonLaProtection(inventaire: Inventaire, options: OptionsDeProtection = {}): Inventaire {
  if (options.palettesLibres !== true || !inventaire.entrees.some((entree) => entree.protegee)) return inventaire;
  return { ...inventaire, entrees: inventaire.entrees.map((entree) => (entree.protegee ? { ...entree, protegee: false } : entree)) };
}

/**
 * Les identifiants de variables que Palettes suit dans la donnée partagée racine `variables`
 * (`palettes.*.variables.*.id`). Un texte illisible ou d'une autre forme ne donne aucun identifiant et ne lève pas.
 */
export function variablesSuiviesParPalettes(texte: string): ReadonlySet<string> {
  const ids = new Set<string>();
  if (!texte) return ids;
  try {
    const racine: unknown = JSON.parse(texte);
    const palettes = (racine as { palettes?: unknown } | null)?.palettes;
    if (typeof palettes !== 'object' || palettes === null) return ids;
    for (const palette of Object.values(palettes)) {
      const variables = (palette as { variables?: unknown } | null)?.variables;
      if (typeof variables !== 'object' || variables === null) continue;
      for (const suivie of Object.values(variables)) {
        const id = (suivie as { id?: unknown } | null)?.id;
        if (typeof id === 'string' && id !== '') ids.add(id);
      }
    }
  } catch { /* texte illisible : aucune protection ajoutée */ }
  return ids;
}
