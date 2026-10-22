/** Souche du domaine `ignores` (les constats ignorés) : toute demande reçoit `non-construit`. */
import type { DemandeDIgnores } from '../messages/ignores';
import { souche } from './souche';

export const TYPES: readonly DemandeDIgnores['type'][] = ['ignorer', 'ne-plus-ignorer'];
export const traiter = souche<DemandeDIgnores>('ignores');
