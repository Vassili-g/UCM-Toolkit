/**
 * Ce que la prise `@ucm-kit/core/modules` promet à un module TypeScript.
 *
 * Les signatures sont recopiées des déclarations de `lecteurs` et de `format`,
 * sauf `vueExacteDuVariant` dont le retour est précis. `tests/apiPublique.test.mjs`
 * compile les deux séries l'une contre l'autre : un écart entre elles échoue.
 * Un nom retiré porte d'abord `@deprecated` avec son remplaçant, une version
 * publiée avant son retrait.
 */

import type {
  ComposedDependency,
  EffectStyleUse,
  TextStyleUse,
  VariantIconPlacement,
  VariantPaintPlacements,
  VariantStructure,
} from "@ucm-kit/core/format";

export type { Contract } from "@ucm-kit/core/format";

/** Vrai si cette valeur est une référence de token, et rien d'autre. */
export function isTokenReference(value: unknown): value is string;

/** Le nom de la variable CSS que ce chemin de token donne. */
export function tokenCssVariable(path: string): string;

/** Lit la configuration d'un repository ; rend toujours une configuration complète. */
export function lireConfiguration(racine: string): {
  configuration: {
    components: string;
    tokens: string;
    implementation: string;
    modes?: Record<string, string>;
    css?: { fontFamilyFallback?: string };
  };
  chemin: string | null;
  erreur: string | null;
};

/** Les chemins des `*.contract.json` d'un dossier, `node_modules` exclu. */
export function trouverContrats(dossier: string): string[];

/**
 * Le SENS d'un écart de version, jamais un simple booléen.
 *
 * `ancien` : le contrat précède des champs dont le code dépend ; le designer
 * le réexporte depuis Figma. `recent` : le contrat vient d'un plugin en avance ;
 * c'est le repository qui doit monter de version.
 */
export function verdictDeVersion(
  version: unknown,
  bornes?: { minimum?: string; maximum?: string },
): "ok" | "ancien" | "recent";

/**
 * Résout les cinq renvois d'un variant et rend sa vue exacte, d'un contrat que
 * `verdictDeVersion` juge `ok` : six parties toujours présentes, `structure`
 * exceptée. `undefined` quand le variant ne renvoie à aucune vue. Le contrat ne
 * publie que des renvois : sans cette résolution, lire un variant demande de
 * connaître les catalogues, et chaque consommateur les relirait à sa façon.
 */
export function vueExacteDuVariant(
  contrat: unknown,
  variant: unknown,
): {
  structure: VariantStructure | undefined;
  typography: TextStyleUse[];
  composes: ComposedDependency[];
  icons: Record<string, VariantIconPlacement>;
  paintPlacements: VariantPaintPlacements;
  effects: EffectStyleUse[];
} | undefined;

/**
 * Indexe les feuilles d'un arbre DTCG par leur chemin pointé. Une feuille est
 * un nœud portant `$value` ; le `$type` rendu est le sien, ou celui du groupe
 * ancêtre le plus proche.
 */
export function indexerTokensDtcg(
  tokens: unknown,
  chemin?: string[],
  index?: Map<string, unknown>,
  typeHerite?: string,
): Map<string, unknown>;
