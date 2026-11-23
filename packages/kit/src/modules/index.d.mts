/**
 * Ce que la prise `@ucm-kit/core/modules` promet à un module TypeScript.
 *
 * Les signatures sont recopiées des déclarations de `lecteurs` et de `format`,
 * sauf `vueExacteDuVariant` dont le retour est précis. Les types du contrôle du
 * code (`ControleDuFichier`, `Constat`, `Limite`, le relevé du lecteur) sont
 * recopiés de la même façon, et ce fichier en fait autorité.
 * `tests/apiPublique.test.mjs` compile les deux séries l'une contre l'autre : un
 * écart entre elles échoue.
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

/** Chaîne relevée : `debut` et `fin` encadrent le littéral, guillemets compris ; un morceau de gabarit n'a que son texte. */
export interface ChaineDuCode {
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

/** Ce qu'un fichier écrit : chaînes, déclarations de style, variables `--nom` qu'il déclare et commentaires qui nomment une règle. */
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

/** La règle ESLint qui affiche un constat : une par valeur. */
export type RegleDuControle = "token-inconnu" | "valeur-en-dur";

/** Le code d'un constat du code d'un composant. */
export type CodeDeConstat =
  | "token-inconnu"
  | "repli-en-dur"
  | "nom-css-ambigu"
  | "valeur-en-dur"
  | "non-analyse"
  | "desactivation-interdite";

/** Le code d'une limite : ce que le contrôle ne peut pas juger. */
export type CodeDeLimite =
  | "configuration-absente"
  | "configuration-invalide"
  | "contrats-introuvables"
  | "fichier-sans-chemin"
  | "tokens-illisibles"
  | "tokens-format-inconnu"
  | "contrat-illisible"
  | "contrat-ancien"
  | "contrat-recent"
  | "contrats-multiples"
  | "fichier-partage"
  | "lecture-incomplete"
  | "derogations-illisibles"
  | "sans-adaptateur";

/** Ce que tout constat porte, quel que soit son code. */
interface ConstatCommun {
  regle: RegleDuControle;
  /** `ecart` bloque, `limite` et `non-analyse` informent. */
  niveau: "ecart" | "limite" | "non-analyse";
  composant: string;
  /** Décalage du premier caractère dans le texte jugé, sans BOM ; guillemets compris pour une chaîne. */
  debut: number;
  /** Décalage qui suit le dernier caractère. */
  fin: number;
  /** Le message complet ; il se termine par la commande de dérogation quand le constat est dérogeable et non couvert. */
  message: string;
  /** Les coordonnées de la dérogation, pour un code dérogeable. */
  coordonnees?: { fichier: string; reference?: string; valeur?: string };
  /** `npx ucm deroger …` complète, motif à remplir, pour un constat dérogeable non couvert. */
  commande?: string;
  /** Présent quand une dérogation valide couvre le constat : il ne s'affiche jamais en erreur. */
  deroge?: { motif: string; par: string };
}

/** Un constat ; `faits` a la forme de son `code`. */
export type Constat =
  | (ConstatCommun & { code: "token-inconnu"; faits: { reference: string } | { variable: string } })
  | (ConstatCommun & { code: "repli-en-dur"; faits: { variable: string; repli: string } })
  | (ConstatCommun & { code: "nom-css-ambigu"; faits: { variable: string; chemins: string[] } })
  | (ConstatCommun & {
    code: "valeur-en-dur";
    faits: { valeur: string; parties: string[]; propriete?: string; familles?: string[] };
  })
  | (ConstatCommun & {
    code: "non-analyse";
    faits: { forme: "gabarit" } | { forme: "decomposition" } | { forme: "expression"; propriete: string };
  })
  | (ConstatCommun & { code: "desactivation-interdite"; faits: { regle: RegleDuControle; directive: string } });

/** Ce que le contrôle n'a pas pu juger ; `faits` a la forme de son `code`. */
export type Limite =
  | { code: "configuration-absente" | "fichier-sans-chemin"; composant: null; message: string; faits: Record<string, never> }
  | { code: "configuration-invalide"; composant: null; message: string; faits: { erreur: string } }
  | { code: "contrats-introuvables"; composant: null; message: string; faits: { dossier: string } }
  | { code: "tokens-illisibles" | "tokens-format-inconnu"; composant: null; message: string; faits: { chemin: string } }
  | { code: "contrat-illisible"; composant: string; message: string; faits: { composant: string } }
  | { code: "contrat-ancien" | "contrat-recent"; composant: string; message: string; faits: { composant: string; version: string } }
  | { code: "contrats-multiples" | "fichier-partage"; composant: null; message: string; faits: { composants: string[] } }
  | { code: "lecture-incomplete"; composant: null; message: string; faits: { erreurs: number } }
  | { code: "derogations-illisibles"; composant: null; message: string; faits: { erreurs: string[] } }
  | { code: "sans-adaptateur"; composant: string; message: string; faits: { composant: string; extension: string } };

/** Le jugement d'un fichier. `composants` vide : aucun contrat n'inclut ce fichier, rien à afficher. */
export interface ControleDuFichier {
  /** La racine du repository, `null` sans `ucm.config.json`. */
  racine: string | null;
  /** Le fichier relatif à la racine, avec `/`, ou `null`. */
  fichier: string | null;
  composants: string[];
  limites: Limite[];
  /** Dans l'ordre du texte. */
  constats: Constat[];
}

/**
 * Juge le code d'un fichier : lit `ucm.config.json`, les contrats, `tokens.json`
 * et `.ucm/derogations.json` sur le disque à chaque appel, puis compare le
 * relevé du lecteur du code à ce que le contrat publie. Ne lève jamais : une
 * panne de lecture devient une limite.
 *
 * `texte` remplace le fichier du disque, pour juger un texte non enregistré.
 * `racine` évite de remonter jusqu'au premier `ucm.config.json`. Sans
 * `lecteur`, le fichier n'est pas lu (`sans-adaptateur`).
 */
export function preparerControle(
  fichier: string,
  options?: { texte?: string; lecteur?: LecteurDuCode; racine?: string },
): ControleDuFichier;

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
