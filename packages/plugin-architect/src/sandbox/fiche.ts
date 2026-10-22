/** Le domaine `fiche` n'échange aucun message avec le sandbox. */
import type { DemandeDeFiche } from '../messages/fiche';
import { souche } from './souche';

export const TYPES: readonly DemandeDeFiche['type'][] = [];
export const traiter = souche<DemandeDeFiche>('fiche');
