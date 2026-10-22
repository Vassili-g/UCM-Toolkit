/** Les messages de la préparation des tokens : la lecture d'un texte, le plan et la création des variables. */
import type { IdentiteDAnalyse, Preparation } from './commun';

export type DemandeDePreparation =
  | { type: 'preparer'; analyse: IdentiteDAnalyse; reponses: Readonly<Record<string, string>> }
  | { type: 'lire-preparations' }
  | { type: 'lire-texte'; texte: string }
  | { type: 'creer-variables'; preparation: string }
  | { type: 'abandonner-preparation'; preparation: string }
  | { type: 'copier-preparation'; preparation: string };

export type MessageDePreparation =
  | { type: 'preparations'; preparations: readonly Preparation[] }
  | { type: 'preparation-texte'; texte: string }
  | { type: 'texte-refuse'; motif: string }
  | { type: 'variables-creees'; preparation: string; creees: number; gardees: number; sautees: number };
