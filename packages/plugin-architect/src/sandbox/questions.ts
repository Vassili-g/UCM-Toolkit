/** Souche du domaine `questions` (les questions) : toute demande reçoit `non-construit`. */
import type { DemandeDeQuestions } from '../messages/questions';
import { souche } from './souche';

export const TYPES: readonly DemandeDeQuestions['type'][] = ['repondre', 'annuler-reponse'];
export const traiter = souche<DemandeDeQuestions>('questions');
