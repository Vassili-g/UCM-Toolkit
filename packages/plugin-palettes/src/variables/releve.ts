/**
 * Ce que la lecture des variables rend au modèle : les collections locales
 * et les variables de couleur, sous une forme sérialisable que le sandbox
 * envoie à l'interface. `src/lectureDesVariables.ts` le produit ; l'état et
 * la détection le lisent. Pur.
 */
import { ecrireHexa } from 'ucm-couleur';

export interface ModeLu {
  readonly id: string;
  readonly nom: string;
}

export interface CollectionLue {
  readonly id: string;
  readonly nom: string;
  /** Les modes de la collection, dans son ordre : le premier est son mode par défaut. */
  readonly modes: readonly ModeLu[];
  /** Le nombre de variables de la collection, tous types confondus. */
  readonly variables: number;
}

export interface VariableLue {
  readonly id: string;
  readonly nom: string;
  /** L'identifiant de sa collection. */
  readonly collection: string;
  /**
   * La couleur de chaque mode, en hexa majuscule : six chiffres, ou huit
   * quand la couleur n'est pas opaque. `null` pour un alias, que la lecture
   * ne suit pas ([VAR-12]).
   */
  readonly valeurs: { readonly [mode: string]: string | null };
}

/** Le relevé d'un fichier : ses collections locales et ses variables de couleur. */
export interface ReleveDesVariables {
  readonly collections: readonly CollectionLue[];
  readonly variables: readonly VariableLue[];
}

export const RELEVE_VIDE: ReleveDesVariables = { collections: [], variables: [] };

const octet = (composante: number): number => Math.min(255, Math.max(0, Math.round(composante * 255)));

/**
 * La couleur d'une variable de Figma en hexa majuscule : ses composantes
 * flottantes arrondies à l'octet, comme l'égalité de `[VAR-05]` le demande.
 * Une couleur qui n'est pas opaque porte son alpha en deux chiffres de
 * plus : elle ne vaut alors aucune couleur que le plugin écrit.
 */
export function hexaDeFigma(couleur: { readonly r: number; readonly g: number; readonly b: number; readonly a?: number }): string {
  const hexa = ecrireHexa([octet(couleur.r), octet(couleur.g), octet(couleur.b)]).toUpperCase();
  const alpha = octet(couleur.a ?? 1);
  return alpha === 255 ? hexa : `${hexa}${alpha.toString(16).padStart(2, '0').toUpperCase()}`;
}
