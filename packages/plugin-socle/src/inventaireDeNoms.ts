/**
 * L'acquisition de l'inventaire depuis Figma : les ports de lecture, la lecture par lots et la lecture du suivi de Palettes.
 * Elle vit dans le socle parce que UCM Architect et UCM Palettes construisent l'inventaire de la même façon. La forme de
 * l'inventaire, la protection et le calcul de renommage sont dans `@ucm-kit/core/nommage`.
 */
import type { CategorieDeNom } from '@ucm-kit/core/referentiel';
import { identifiantsDuSuivi, type EtatDeLaMarque } from '@ucm-kit/core/protocoles';
import type { EntreeInventaire, Inventaire } from '@ucm-kit/core/nommage';


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
  /** Vrai quand on ne sait pas si Palettes suit cette variable (voir `indecidable` de `EntreeInventaire`). Absent : faux. */
  indecidable?(variable: VariableLue): boolean;
  /** L'état de la marque par laquelle Palettes déclare qu'il nomme ses variables selon les règles. Absent : `absente`. */
  marqueDePalettes?(): EtatDeLaMarque;
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
export type LecteurDeVariable = Pick<PortDeLecture, 'cibleAlias' | 'protegee' | 'palette' | 'indecidable' | 'marqueDePalettes'>;

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
  const protegee = lecteur.protegee(variable);
  return {
    nom: { id: identite('variable', variable.id), categorie: 'variables', portee: identite('collection', variable.variableCollectionId), nom: variable.name,
      ...(categories ? { categoriesDesSegments: categories } : {}), ...(cibleAlias ? { cibleAlias } : {}), ...(palette ? { palette } : {}) },
    contexte: { collection: collectionNom },
    cible: { type: 'variable', variableId: variable.id, collectionId: variable.variableCollectionId },
    renommable: true, protegee,
    ...(!protegee && lecteur.indecidable?.(variable) === true ? { indecidable: true as const } : {}),
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
  return { entrees, marque: port.marqueDePalettes?.() ?? 'absente' };
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
    marque: lecteur.marqueDePalettes?.() ?? 'absente',
  };
}

/** Ce que rend la lecture du suivi racine `variables` de Palettes. */
export type LectureDuSuivi =
  | { readonly etat: 'absent' }
  | { readonly etat: 'lu'; readonly ids: ReadonlySet<string> }
  | { readonly etat: 'refuse' };

/**
 * Lit le suivi par `lire`, qui appelle Figma. La clé vide donne `absent` ; un texte illisible donne `lu` sans identifiant, comme
 * pour Palettes, qui le lit comme un suivi vide ; une exception donne `refuse`, jamais un ensemble vide.
 */
export function lireLeSuiviDePalettes(lire: () => string): LectureDuSuivi {
  let texte: string;
  try { texte = lire(); } catch { return { etat: 'refuse' }; }
  return texte ? { etat: 'lu', ids: identifiantsDuSuivi(texte) } : { etat: 'absent' };
}
