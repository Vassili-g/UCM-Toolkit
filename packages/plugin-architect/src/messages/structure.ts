/** Les messages de la structure et des scopes : les constats sur les variables et leur correction. */
import type { Constat, Correction } from './commun';

export type DemandeDeStructure =
  | { type: 'lire-structure'; demande: number }
  | { type: 'appliquer-structure'; demande: number; ids: readonly string[] };

export type MessageDeStructure =
  | { type: 'structure'; demande: number; constats: readonly Constat[]; corrections: readonly Correction[] }
  | { type: 'structure-appliquee'; demande: number; ecrites: number; sautees: readonly { id: string; motif: string }[] };
