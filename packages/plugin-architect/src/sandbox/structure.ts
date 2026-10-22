/** Souche du domaine `structure` (la structure et les scopes) : toute demande reçoit `non-construit`. */
import type { DemandeDeStructure } from '../messages/structure';
import { souche } from './souche';

export const TYPES: readonly DemandeDeStructure['type'][] = ['lire-structure', 'appliquer-structure'];
export const traiter = souche<DemandeDeStructure>('structure');
