/**
 * Ce que la porte `@ucm-kit/adapter-typescript/usages` promet à un module : un
 * seul nom, `lecteurDuCode`, qui relève ce que le code d'un composant écrit.
 *
 * Le lecteur lit la syntaxe et ne juge rien, donc cette déclaration n'importe
 * pas le kit. Ses types sont les mêmes que `LecteurDuCode` et le relevé de
 * `@ucm-kit/core/modules` : un module passe `lecteurDuCode` à `preparerControle`.
 * `tests/usagesPromis.test.mjs` compile cet accord, compare la porte à sa version
 * précédente et exige l'entrée de `CHANGELOG.md`.
 */

/** Chaîne relevée : `debut` et `fin` encadrent le littéral, guillemets compris ; un morceau de gabarit n'a que son texte. */
interface ChaineDuCode {
  texte: string;
  debut: number;
  fin: number;
  /** Attribut JSX qui porte la chaîne, `null` hors d'un attribut. */
  attribut: string | null;
}

/**
 * Déclaration de style. `debut` et `fin` encadrent la valeur littérale,
 * guillemets compris, ou toute la propriété quand la valeur est une expression.
 */
interface DeclarationDuCode {
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

interface DirectiveDuCode {
  texte: string;
  debut: number;
  fin: number;
}

interface LectureDuCode {
  complete: boolean;
  erreurs: number;
  /** Présente quand l'extension n'est pas lue. */
  extension?: string;
}

/** Ce qu'un fichier écrit : chaînes, déclarations de style, variables `--nom` qu'il déclare et commentaires qui nomment une règle. */
interface UsagesDuCode {
  chaines: ChaineDuCode[];
  declarations: DeclarationDuCode[];
  /** Clés `--nom` des objets de style. */
  variables: string[];
  directives: DirectiveDuCode[];
  lecture: LectureDuCode;
}

interface FichiersDuComposant {
  /** Chemins absolus : l'implémentation, puis ses imports relatifs triés. */
  fichiers: string[];
  lecture: LectureDuCode;
}

interface LecteurDuCode {
  releverUsages(texte: string, nomDuFichier: string): UsagesDuCode;
  fichiersDuComposant(implementation: string): FichiersDuComposant;
  extensions: readonly string[];
}

/** Le lecteur du code d'un composant (`.ts` et `.tsx`), à passer à `preparerControle`. */
export const lecteurDuCode: LecteurDuCode;

export {};
