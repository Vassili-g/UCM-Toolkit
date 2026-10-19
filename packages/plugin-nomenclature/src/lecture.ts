/** L'inventaire conserve les adresses Figma ; seuls les noms logiques atteignent le moteur. */
import type { CategorieDeNom, NomLu } from '@ucm-kit/core/referentiel';

export interface ObjetNomme {
  readonly id: string;
  readonly name: string;
  readonly remote: boolean;
}
export interface VariableLue extends ObjetNomme { readonly variableCollectionId: string }

/** Le port lit les collections et les variables locales ; il ne touche à aucune page. */
export interface PortDeLecture {
  collections(): Promise<readonly ObjetNomme[]>;
  variables(): Promise<readonly VariableLue[]>;
  /** Identifiant visé par l'alias du premier mode de la variable, s'il y en a un. */
  cibleAlias(variable: VariableLue): string | undefined;
  /** Vrai quand la donnée partagée `palette` de la variable n'est pas vide. */
  protegee(variable: VariableLue): boolean;
  /** L'identifiant de palette que Palettes écrit dans la donnée partagée `palette` de la variable ; `undefined` quand elle est vide. */
  palette(variable: VariableLue): string | undefined;
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
}
export interface Inventaire {
  readonly entrees: readonly EntreeInventaire[];
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

/** Ce que la lecture d'une variable demande à Figma, sans attente : l'alias, la protection et la palette. */
export type LecteurDeVariable = Pick<PortDeLecture, 'cibleAlias' | 'protegee' | 'palette'>;

function lesLocales(toutesLesCollections: readonly ObjetNomme[], toutesLesVariables: readonly VariableLue[]) {
  const collections = new Map(toutesLesCollections.filter((collection) => !collection.remote).map((collection) => [collection.id, collection]));
  const variables = toutesLesVariables.filter((variable) => !variable.remote && collections.has(variable.variableCollectionId));
  return { collections, variables };
}

function entreeDeCollection(collection: ObjetNomme): EntreeInventaire {
  return { nom: { id: identite('collection', collection.id), categorie: 'collections', portee: 'document', nom: collection.name },
    cible: { type: 'collection', collectionId: collection.id }, renommable: true, protegee: false };
}

function entreeDeVariable(variable: VariableLue, collectionNom: string | undefined, lecteur: LecteurDeVariable): EntreeInventaire {
  const cibleAlias = lecteur.cibleAlias(variable);
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
  const entrees: EntreeInventaire[] = [...collections.values()].map(entreeDeCollection);
  options.avancement?.({ lues: 0, total: variables.length });
  for (let debut = 0; debut < variables.length; debut += TAILLE_DU_LOT) {
    if (debut > 0) await options.pause();
    for (const variable of variables.slice(debut, debut + TAILLE_DU_LOT)) {
      entrees.push(entreeDeVariable(variable, collections.get(variable.variableCollectionId)?.name, port));
    }
    options.avancement?.({ lues: Math.min(debut + TAILLE_DU_LOT, variables.length), total: variables.length });
  }
  return { entrees };
}

/** Construit l'inventaire de lectures déjà faites, sans attente : le même modèle que `lireInventaire`. */
export function inventaireDeLectures(
  toutesLesCollections: readonly ObjetNomme[],
  toutesLesVariables: readonly VariableLue[],
  lecteur: LecteurDeVariable,
): Inventaire {
  const { collections, variables } = lesLocales(toutesLesCollections, toutesLesVariables);
  return { entrees: [
    ...[...collections.values()].map(entreeDeCollection),
    ...variables.map((variable) => entreeDeVariable(variable, collections.get(variable.variableCollectionId)?.name, lecteur)),
  ] };
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
