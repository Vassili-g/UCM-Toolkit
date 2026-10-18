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

/** Lit les collections et les variables locales ; l'alias et la protection se lisent par lots, avec une pause entre deux. */
export async function lireInventaire(
  port: PortDeLecture,
  options: { readonly pause: () => Promise<void>; readonly avancement?: (etat: AvancementLecture) => void },
): Promise<Inventaire> {
  const [toutesLesCollections, toutesLesVariables] = await Promise.all([port.collections(), port.variables()]);
  const collections = new Map(toutesLesCollections.filter((collection) => !collection.remote).map((collection) => [collection.id, collection]));
  const variables = toutesLesVariables.filter((variable) => !variable.remote && collections.has(variable.variableCollectionId));
  const entrees: EntreeInventaire[] = [];
  for (const collection of collections.values()) {
    entrees.push({ nom: { id: identite('collection', collection.id), categorie: 'collections', portee: 'document', nom: collection.name },
      cible: { type: 'collection', collectionId: collection.id }, renommable: true, protegee: false });
  }
  options.avancement?.({ lues: 0, total: variables.length });
  for (let debut = 0; debut < variables.length; debut += TAILLE_DU_LOT) {
    if (debut > 0) await options.pause();
    for (const variable of variables.slice(debut, debut + TAILLE_DU_LOT)) {
      const cibleAlias = port.cibleAlias(variable);
      const categories = categoriesDesSegments(variable.name);
      entrees.push({
        nom: { id: identite('variable', variable.id), categorie: 'variables', portee: identite('collection', variable.variableCollectionId), nom: variable.name,
          ...(categories ? { categoriesDesSegments: categories } : {}), ...(cibleAlias ? { cibleAlias } : {}) },
        contexte: { collection: collections.get(variable.variableCollectionId)?.name },
        cible: { type: 'variable', variableId: variable.id, collectionId: variable.variableCollectionId },
        renommable: true, protegee: port.protegee(variable),
      });
    }
    options.avancement?.({ lues: Math.min(debut + TAILLE_DU_LOT, variables.length), total: variables.length });
  }
  return { entrees };
}

/** Relit les seules variables et collections, sans pause, juste avant d'écrire. */
export function relireInventaireAvantEcriture(port: PortDeLecture): Promise<Inventaire> {
  return lireInventaire(port, { pause: async () => {} });
}
