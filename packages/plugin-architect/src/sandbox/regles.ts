/** Le domaine `regles` n'échange aucun message avec le sandbox. */
import type { DemandeDeRegles } from '../messages/regles';
import { souche } from './souche';

export const TYPES: readonly DemandeDeRegles['type'][] = [];
export const traiter = souche<DemandeDeRegles>('regles');
