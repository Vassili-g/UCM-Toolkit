/** Souche du domaine `preparation` (la préparation des tokens) : toute demande reçoit `non-construit`. */
import type { DemandeDePreparation } from '../messages/preparation';
import { souche } from './souche';

export const TYPES: readonly DemandeDePreparation['type'][] = ['preparer', 'lire-preparations', 'lire-texte', 'creer-variables', 'abandonner-preparation', 'copier-preparation'];
export const traiter = souche<DemandeDePreparation>('preparation');
