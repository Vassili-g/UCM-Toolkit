import type { AdaptateurDImplementation } from "@ucm-kit/core/lecteurs";

/** Chaîne relevée : `debut` et `fin` encadrent le littéral, guillemets compris ; un morceau de gabarit n'a que son texte. */
export interface ChaineDuCode {
  texte: string;
  debut: number;
  fin: number;
  /** Attribut JSX qui porte la chaîne, `null` hors d'un attribut. */
  attribut: string | null;
}

/**
 * Déclaration de style. `debut` et `fin` encadrent la valeur littérale, guillemets
 * compris, ou toute la propriété quand la valeur est une expression.
 */
export interface DeclarationDuCode {
  /** Nom CSS (`background-color`) ; `null` pour une décomposition ou une clé calculée. */
  propriete: string | null;
  /**
   * Valeur littérale ; `null` pour une expression. Un nombre reçoit `px` (sauf `0` et les propriétés
   * sans unité de React) dans un objet de style, et garde sa forme écrite dans un autre objet.
   */
  valeur: string | null;
  debut: number;
  fin: number;
  contexte: "style" | "objet";
  /** `true` quand la valeur est un nombre littéral, pour distinguer `32` de `"32"`. */
  nombre?: true;
  /** Dans un objet qui n'est pas un style, avec `nombre`, la valeur que l'adaptateur aurait rendue en contexte `style` (`15` donne `"15px"` pour `fontSize`, `"1.5"` pour `lineHeight`). */
  valeurEnStyle?: string;
}

export interface DirectiveDuCode {
  texte: string;
  debut: number;
  fin: number;
}

export interface LectureDuCode {
  complete: boolean;
  erreurs: number;
  /** Présente quand l'extension n'est pas lue. */
  extension?: string;
}

export interface UsagesDuCode {
  chaines: ChaineDuCode[];
  declarations: DeclarationDuCode[];
  /** Clés `--nom` des objets de style. */
  variables: string[];
  directives: DirectiveDuCode[];
  lecture: LectureDuCode;
}

export interface FichiersDuComposant {
  /** Chemins absolus : l'implémentation, puis ses imports relatifs triés. */
  fichiers: string[];
  lecture: LectureDuCode;
}

export interface LecteurDuCode {
  releverUsages(texte: string, nomDuFichier: string): UsagesDuCode;
  fichiersDuComposant(implementation: string): FichiersDuComposant;
  extensions: readonly string[];
}

export const adaptateurTypeScript: AdaptateurDImplementation & {
  readonly lecteurDuCode: LecteurDuCode;
};
export function nomInterfaceAttendue(fichierComposant: string): string;
export function lireApiPublique(
  fichiers: readonly string[],
  racine: string,
): Map<string, unknown>;
export function ecartsDeParite(
  contrat: unknown,
  releve: unknown,
  nomInterface: string,
  options?: { presente?: boolean; chemin?: string },
): {
  implementationAbsente: boolean;
  implementationNonLue: string | null;
  interfaceAbsente: string | null;
  fonctionAbsente: string | null;
  manquantes: string[];
  typesIncorrects: Array<{ prop: string; attendu: string; recu: string }>;
  /** Type que l'adaptateur n'a pas su résoudre : une limite, ni un écart ni une acceptation. */
  typesNonAnalyses: Array<{ prop: string; attendu: string; recu: string }>;
  valeursNonImplementees: Array<{ prop: string; valeurs: string[] }>;
  booleensNonUtilises: string[];
  enumsSansEffet: Array<{ prop: string; valeurs: string[] }>;
  compositionsIncorrectes: Array<{ component: string; attendu: number; rendu: number }>;
};
export function typesDuContrat(contrat: unknown): null | {
  composant: string;
  nombreUnions: number;
  contenu: string;
};
export function genererTypes(
  racine?: string,
  options?: { dossierSortie?: string },
): {
  generes: Array<{ composant: string; nombreUnions: number; contenu: string; chemin: string }>;
  omis: Array<{ chemin: string; raison: string }>;
  dossierSortie: string;
};
export function rendreGeneration(resultat: ReturnType<typeof genererTypes>): string;
