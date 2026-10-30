/** Les messages de la structure et des scopes : les constats sur les variables et leur correction. */
import type { Constat, Correction } from './commun';

/**
 * Les demandes d'Ignorer répondent comme `lire-structure`, sous leur propre numéro : le sandbox range la clé, puis relit la
 * structure. `constat` est l'identifiant d'un constat du dernier `structure` envoyé ; `role` est un rôle du thème (`surface/subtle`).
 */
export type DemandeDeStructure =
  | { type: 'lire-structure'; demande: number }
  | { type: 'appliquer-structure'; demande: number; ids: readonly string[] }
  | { type: 'ignorer-constat-de-structure'; demande: number; constat: string }
  | { type: 'retablir-constat-de-structure'; demande: number; constat: string }
  | { type: 'ignorer-role'; demande: number; role: string }
  | { type: 'retablir-role'; demande: number; role: string };

/** Ce que le fichier écarte : les constats ignorés pour leur palette, sans correction ni question, et les rôles ignorés dans tout le fichier. */
export interface IgnoresDeStructure {
  readonly constats: readonly Constat[];
  readonly roles: readonly string[];
}

export type MessageDeStructure =
  | { type: 'structure'; demande: number; constats: readonly Constat[]; corrections: readonly Correction[]; ignores: IgnoresDeStructure }
  | { type: 'structure-appliquee'; demande: number; ecrites: number; sautees: readonly { id: string; motif: string }[] };
