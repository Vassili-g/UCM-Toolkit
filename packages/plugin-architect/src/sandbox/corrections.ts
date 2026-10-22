/** Souche du domaine `corrections` (les corrections) : toute demande reçoit `non-construit`. */
import type { DemandeDeCorrections } from '../messages/corrections';
import { souche } from './souche';

export const TYPES: readonly DemandeDeCorrections['type'][] = ['appliquer-corrections', 'selectionner'];
export const traiter = souche<DemandeDeCorrections>('corrections');
