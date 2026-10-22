/** Le domaine `recherche` n'échange aucun message avec le sandbox. */
import type { DemandeDeRecherche } from '../messages/recherche';
import { souche } from './souche';

export const TYPES: readonly DemandeDeRecherche['type'][] = [];
export const traiter = souche<DemandeDeRecherche>('recherche');
