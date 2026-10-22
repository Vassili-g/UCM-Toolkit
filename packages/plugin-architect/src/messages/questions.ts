/** Les messages des questions : la réponse du designer et la correction qu'elle tire. */
import type { Correction, IdentiteDAnalyse } from './commun';

export type DemandeDeQuestions =
  | { type: 'repondre'; analyse: IdentiteDAnalyse; question: string; reponse: string }
  | { type: 'annuler-reponse'; analyse: IdentiteDAnalyse; question: string };

export type MessageDeQuestions =
  | { type: 'question-repondue'; analyse: IdentiteDAnalyse; question: string; correction: Correction | null };
