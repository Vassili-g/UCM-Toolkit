/** Les messages des corrections : l'écriture d'un lot sur le composant et la sélection des calques d'un constat. */
import type { IdentiteDAnalyse } from './commun';

export type DemandeDeCorrections =
  | { type: 'appliquer-corrections'; analyse: IdentiteDAnalyse; ids: readonly string[] }
  /** Sélectionne les calques d'un constat : seul geste du plugin qui change la sélection. */
  | { type: 'selectionner'; analyse: IdentiteDAnalyse; layers: readonly string[] };

export type MessageDeCorrections =
  /** `resume` est la ligne de réussite : elle compte les corrections sautées et dit pourquoi. */
  | { type: 'corrections-appliquees'; analyse: IdentiteDAnalyse; ecrites: number; sautees: readonly { id: string; motif: string }[]; resume: string };
