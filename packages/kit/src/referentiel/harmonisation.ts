/**
 * Types du moteur d'harmonisation : lexique, vocabulaire du fichier, renommages et questions, et la clé de règle d'un terme.
 *
 * Après une modification : relancer `npm test` et changer la version du kit ; aucune vue ni planche n'en tire de données.
 */
import type { CategorieDeNom, ConventionsParCategorie, NomANormaliser } from './conventions.js';
import type { NatureDeSegment } from './natures.js';
import type { ConventionDetectee } from './normalisation.js';
import type { Collection } from './architecture.js';

/** Un terme est une suite de mots : `extra-small` vaut `['extra', 'small']`. */
export type Mots = readonly string[];

/**
 * Un nom lu ; pour une variable, l'identifiant visé par l'alias de son premier mode
 * et l'identifiant de palette qu'UCM Palettes écrit dans sa donnée partagée `palette`.
 */
export interface NomLu extends NomANormaliser { readonly cibleAlias?: string; readonly palette?: string }
export interface Occurrence { readonly nomId: string; readonly rangSegment: number; readonly rangMot: number }
/** Plage `[début, fin[` des mots d'un segment qui forment un terme. */
export type PlageDeTerme = readonly [number, number];
/** Un terme dans un segment : `rangMot` est son premier mot, `longueur` le nombre de ses mots. */
export type OccurrenceDeTerme = Occurrence & { readonly longueur: number };

export interface Lexique {
  readonly noms: ReadonlyMap<string, NomLu>;
  /** Texte d'un segment vers ses mots, découpés une seule fois. */
  readonly mots: ReadonlyMap<string, Mots>;
  /** Mot en minuscules vers ses occurrences. */
  readonly occurrences: ReadonlyMap<string, readonly Occurrence[]>;
  /** Identifiant d'un nom vers la nature de chacun de ses segments, alignée sur `nom.split('/')`. */
  readonly natures: ReadonlyMap<string, readonly (NatureDeSegment | null)[]>;
  /** Identifiant d'un nom vers, pour chaque segment, les plages de mots de ses termes. */
  readonly termes: ReadonlyMap<string, readonly (readonly PlageDeTerme[])[]>;
  /** Terme en minuscules, mots joints par `-` (`stress-test`, `line-height`), vers ses occurrences ; les collections n'en ont pas. */
  readonly occurrencesDesTermes: ReadonlyMap<string, readonly OccurrenceDeTerme[]>;
  /** Portée vers les identifiants de ses noms, occupants inchangés compris. */
  readonly portees: ReadonlyMap<string, readonly string[]>;
  /** Calculée une fois par lexique ; un changement de règle ne la refait pas. */
  readonly detection: Readonly<Record<CategorieDeNom, ConventionDetectee>>;
}
/** Le plugin ajoute les noms par lots, puis avance `terminer` entre deux pauses. */
export interface PreparationDuLexique { ajouter(noms: readonly NomLu[]): void; terminer(): Generator<void, Lexique> }

export interface TermePersonnalise { readonly terme: Mots; readonly remplace: readonly Mots[]; readonly definition?: string }
export interface VocabulaireDuFichier {
  readonly personnalises: readonly TermePersonnalise[];
  /** Termes UCM, par leur identifiant, que le fichier n'applique pas. */
  readonly ecartsUcm: readonly string[];
}
export type OrigineDuTerme = 'ucm' | 'personnalise';
export interface Remplacement { readonly debut: number; readonly fin: number; readonly par: Mots; readonly origine: OrigineDuTerme; readonly cle: string }
export interface IndexDuVocabulaire {
  /**
   * Les remplacements d'une suite de mots, le plus long terme d'abord, sans chevauchement.
   * Avec `frontieres` (indices de mot où un terme commence, plus le nombre de mots), un remplacement
   * qui ne commence pas et ne finit pas sur une frontière est écarté.
   */
  remplacements(mots: Mots, categorie: CategorieDeNom, frontieres?: ReadonlySet<number>): readonly Remplacement[];}
export type ConflitDeVocabulaire =
  | { readonly type: 'contredit-ucm'; readonly terme: Mots; readonly remplace: Mots; readonly termeUcm: Mots }
  | { readonly type: 'deja-remplace'; readonly remplace: Mots; readonly par: Mots }
  | { readonly type: 'cycle'; readonly termes: readonly Mots[] };

export type CleDeRegle = `ecriture:${CategorieDeNom}` | `terme:${string}` | `collection:${string}`;

/**
 * La règle de l'analyse d'un terme : `terme:` puis ses mots en minuscules joints par `-` (`terme:font-size`). Elle ne vit qu'en
 * mémoire. Ce n'est pas la clé que Nomenclature range dans Figma, `cleTerme` de `@ucm-kit/core/protocoles` : celle-ci joint les
 * mots par une espace et garde leur casse (`terme:font size`).
 */
export const cleDeRegleDuTerme = (mots: Mots): CleDeRegle => `terme:${mots.join('-').toLowerCase()}`;
export interface ChangementDeTerme { readonly avant: Mots; readonly apres: Mots; readonly origine: OrigineDuTerme }
export interface Renommage {
  readonly id: string; readonly categorie: CategorieDeNom; readonly portee: string;
  readonly ancienNom: string; readonly nouveauNom: string;
  /** Rangées par priorité : terme UCM, terme personnalisé, collection, écriture. */
  readonly regles: readonly CleDeRegle[];
  readonly termes: readonly ChangementDeTerme[];
}
export interface Collision { readonly categorie: CategorieDeNom; readonly portee: string; readonly nom: string; readonly ids: readonly string[] }
export interface ResultatDuLexique { readonly renommages: readonly Renommage[]; readonly collisions: readonly Collision[] }

/** `exemples` : des identifiants de noms, deux au plus. */
export interface TermeEnQuestion { readonly mot: string; readonly nombre: number; readonly exemples: readonly string[]; readonly ucm: boolean }
export type IndiceDePaire = 'terminaison' | 'pluriel' | 'abreviation' | 'synonymes' | 'branches-paralleles';
export type Question =
  | { readonly type: 'paire'; readonly cle: string; readonly indice: IndiceDePaire; readonly termes: readonly [TermeEnQuestion, TermeEnQuestion]; readonly propose: 0 | 1; readonly score: number; readonly cibleAlias?: string }
  | { readonly type: 'ecriture-du-terme'; readonly cle: string; readonly indice: 'faute' | 'mots-colles'; readonly terme: TermeEnQuestion; readonly proposition: Mots; readonly reference?: { readonly mot: string; readonly nombre: number }; readonly score: number }
  | { readonly type: 'collection'; readonly cle: string; readonly collectionId: string; readonly nom: string; readonly nombre: number; readonly proposee?: Collection; readonly score: number };
export interface DejaJuge {
  readonly distincts: readonly (readonly [string, string])[];
  readonly plusTard: readonly string[];
  readonly voulus: readonly string[];
  readonly collectionsGardees: readonly string[];
}
export interface ResultatDesQuestions { readonly questions: readonly Question[]; readonly autres: readonly Question[] }
