/** Les messages de la structure et des scopes : les constats sur les variables et leur correction. */
import type { Constat, Correction } from './commun';

/**
 * Les demandes d'Ignorer répondent comme `lire-structure`, sous leur propre numéro : le sandbox range la clé, puis relit la
 * structure. `constat` est l'identifiant d'un constat du dernier `structure` envoyé ; `role` est un rôle du thème (`surface/subtle`).
 */
export type DemandeDeStructure =
  | { type: 'lire-structure'; demande: number }
  | { type: 'appliquer-structure'; demande: number; ids: readonly string[] }
  /** Fusionne les variables du constat `role-en-double` (E4.4) dans celle que `garder` désigne par sa clé ; la réponse est `structure-appliquee`. */
  | { type: 'fusionner-variables'; demande: number; constat: string; garder: string }
  | { type: 'ignorer-constat-de-structure'; demande: number; constat: string }
  | { type: 'retablir-constat-de-structure'; demande: number; constat: string }
  | { type: 'ignorer-role'; demande: number; role: string }
  | { type: 'retablir-role'; demande: number; role: string };

/** Ce que le fichier écarte : les constats ignorés pour leur palette, sans correction ni question, et les rôles ignorés dans tout le fichier. */
export interface IgnoresDeStructure {
  readonly constats: readonly Constat[];
  readonly roles: readonly string[];
}

/**
 * Pourquoi la lecture de la structure n'a pas abouti : le plugin n'a pas pu lire (`lecture-levee`), le catalogue d'un fichier UCM
 * manque (`catalogue-absent`), ou Figma a refusé la lecture des variables (`refus-de-figma`). Absent, la lecture est complète.
 */
export type EchecDeLecture = 'lecture-levee' | 'catalogue-absent' | 'refus-de-figma';

export type MessageDeStructure =
  | { type: 'structure'; demande: number; constats: readonly Constat[]; corrections: readonly Correction[]; ignores: IgnoresDeStructure;
    /** Absent quand la lecture est complète. Des listes vides avec `echec` ne disent pas « rien à régler » : rien n'a été lu. */
    echec?: EchecDeLecture }
  | { type: 'structure-appliquee'; demande: number; ecrites: number; sautees: readonly { id: string; motif: string }[];
    /** Les noms des variables créées que l'Historique ne pourra pas annuler ; vide sinon. */
    sansAnnulation: readonly string[] };
