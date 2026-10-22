/** Souche du domaine `configuration` (la configuration) : toute demande reçoit `non-construit`. */
import type { DemandeDeConfiguration } from '../messages/configuration';
import { souche } from './souche';

export const TYPES: readonly DemandeDeConfiguration['type'][] = ['lire-configuration', 'ranger-library', 'ranger-niveau'];
export const traiter = souche<DemandeDeConfiguration>('configuration');
