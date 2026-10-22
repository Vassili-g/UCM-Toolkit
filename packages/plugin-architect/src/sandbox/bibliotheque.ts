/** Souche du domaine `bibliotheque` (la Library) : toute demande reçoit `non-construit`. */
import type { DemandeDeBibliotheque } from '../messages/bibliotheque';
import { souche } from './souche';

export const TYPES: readonly DemandeDeBibliotheque['type'][] = ['lire-bibliotheque', 'lire-valeurs'];
export const traiter = souche<DemandeDeBibliotheque>('bibliotheque');
