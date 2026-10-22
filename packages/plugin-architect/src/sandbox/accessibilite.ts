/** Le domaine `accessibilite` n'échange aucun message avec le sandbox. */
import type { DemandeDAccessibilite } from '../messages/accessibilite';
import { souche } from './souche';

export const TYPES: readonly DemandeDAccessibilite['type'][] = [];
export const traiter = souche<DemandeDAccessibilite>('accessibilite');
