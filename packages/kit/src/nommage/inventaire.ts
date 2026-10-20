/**
 * L'inventaire des noms d'un fichier, tel que le calcul de renommage le lit, et la protection des variables d'UCM Palettes.
 * L'inventaire conserve les adresses Figma ; seuls les noms logiques atteignent le moteur. Le module ne touche pas Figma :
 * l'acquisition de l'inventaire (`lireInventaire`, `inventaireDeLectures`) reste dans le socle des plugins.
 *
 * Après une modification : relancer `npm test`, relancer les tests des plugins qui lisent l'inventaire, et changer la version du kit.
 */
import type { NomLu } from '../referentiel/harmonisation.js';
import type { EtatDeLaMarque } from '../protocoles/palettes.js';

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
  /**
   * Variable seulement. Posé quand la protection ne se décide pas parce qu'une lecture de Palettes a été refusée : la variable
   * peut être de Palettes. Jamais posé avec `protegee: true`.
   */
  readonly indecidable?: true;
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
   * L'état de la marque de Palettes. Absent : `absente`. Avec la marque `courante` et des règles rangées, les variables de Palettes
   * se renomment comme les autres (`palettesLibres`).
   */
  readonly marque?: EtatDeLaMarque;
}

export interface OptionsDeProtection {
  /** Les variables de Palettes se renomment comme les autres. Absent : faux, la protection reste. */
  readonly palettesLibres?: boolean;
}

/**
 * Les variables de Palettes sont libres quand le fichier porte la marque `courante` de Palettes et que l'écriture est rangée en v2
 * (`reglesRangees` : `lireReglesDeNommage` ne rend pas `null`). Sans l'un des deux, Palettes réécrirait ses noms bruts.
 */
export function palettesLibres(inventaire: Pick<Inventaire, 'marque'>, reglesRangees: boolean): boolean {
  return inventaire.marque === 'courante' && reglesRangees;
}

/**
 * Le seul endroit où une entrée est dite protégée : `protegee` et `indecidable` sont les faits lus dans Figma, les options disent s'ils
 * comptent. Une variable indécidable suit les règles quand Palettes est libre : Palettes ne réécrit alors plus ses noms.
 */
export function estProtegee(entree: Pick<EntreeInventaire, 'protegee' | 'indecidable'>, options: OptionsDeProtection = {}): boolean {
  return (entree.protegee || entree.indecidable === true) && options.palettesLibres !== true;
}

/** L'inventaire où `protegee` et `indecidable` disent la protection effective ; le même objet quand rien ne change. */
export function inventaireSelonLaProtection(inventaire: Inventaire, options: OptionsDeProtection = {}): Inventaire {
  if (options.palettesLibres !== true || !inventaire.entrees.some((entree) => entree.protegee || entree.indecidable === true)) return inventaire;
  return { ...inventaire, entrees: inventaire.entrees.map((entree) => {
    if (!entree.protegee && entree.indecidable !== true) return entree;
    const { indecidable: _, ...libre } = entree;
    return { ...libre, protegee: false };
  }) };
}

/** Les causes qui empêchent de renommer une variable, dans l'ordre où l'écran les range. Les quatre premières sont des protections lues ; `lecture-refusee` est une protection non vérifiée. */
export const CAUSES_DE_PROTECTION = ['marque-absente', 'marque-illisible', 'marque-future', 'sans-regles', 'lecture-refusee'] as const;
export type CauseDeProtection = (typeof CAUSES_DE_PROTECTION)[number];

/**
 * Ce qui empêche de renommer l'entrée ; `undefined` quand rien ne l'empêche. Le seul endroit où la cause se calcule : elle est définie
 * pour que `estProtegee` avec `palettesLibres(inventaire, reglesRangees)` soit vrai si et seulement si la cause existe.
 */
export function causeDeProtection(
  entree: Pick<EntreeInventaire, 'protegee' | 'indecidable'>, inventaire: Pick<Inventaire, 'marque'>, reglesRangees: boolean,
): CauseDeProtection | undefined {
  if (!entree.protegee && entree.indecidable !== true) return undefined;
  const marque = inventaire.marque ?? 'absente';
  if (marque === 'courante' && reglesRangees) return undefined;
  if (entree.indecidable === true) return 'lecture-refusee';
  switch (marque) {
    case 'refusee': return 'lecture-refusee';
    case 'absente': return 'marque-absente';
    case 'illisible': return 'marque-illisible';
    case 'future': return 'marque-future';
    case 'courante': return 'sans-regles';
  }
}
