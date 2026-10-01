/**
 * Ce que la lecture des variables rend au modèle : les collections locales
 * et les variables de couleur, sous une forme sérialisable que le sandbox
 * envoie à l'interface. `src/lectureDesVariables.ts` le produit ; l'état et
 * la détection le lisent. Pur.
 */
import { ecrireHexa, lireHexa, p3VersRgb8, rgb8VersP3 } from 'ucm-couleur';

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

/** Le profil de couleur du document : dans un document `DISPLAY_P3`, les composantes d'une variable sont en P3. */
type Profil = 'SRGB' | 'DISPLAY_P3' | 'LEGACY';

/**
 * La couleur d'une variable, lue dans le profil du document, en hexa sRGB
 * majuscule. Dans un document `DISPLAY_P3`, ses composantes passent en sRGB
 * à 8 bits avant la comparaison ([MOT-26]).
 */
export function hexaLu(couleur: { readonly r: number; readonly g: number; readonly b: number; readonly a?: number }, profil: Profil): string {
  if (profil !== 'DISPLAY_P3') return hexaDeFigma(couleur);
  const [r, g, b] = p3VersRgb8([couleur.r, couleur.g, couleur.b]).couleur;
  return hexaDeFigma({ r: r / 255, g: g / 255, b: b / 255, a: couleur.a });
}

/**
 * Les composantes qu'une variable reçoit pour une couleur du plan : les
 * octets sRGB divisés par 255, ou leurs composantes Display P3 dans un
 * document `DISPLAY_P3`, comme la planche les peint (section 6.7).
 */
export function couleurPourFigma(hexa: string, profil: Profil): { r: number; g: number; b: number; a: number } {
  const couleur = lireHexa(hexa);
  if (!couleur) throw new Error(`Couleur illisible : ${hexa}.`);
  const [r, g, b] = profil === 'DISPLAY_P3' ? rgb8VersP3(couleur) : [couleur[0] / 255, couleur[1] / 255, couleur[2] / 255];
  return { r, g, b, a: 1 };
}
