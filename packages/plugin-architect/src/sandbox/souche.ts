/**
 * La souche d'un domaine pas encore construit : chaque demande reçoit
 * `non-construit`, sans lecture ni écriture. Le lot qui construit le domaine
 * remplace la souche par son traitement.
 */
import type { Contexte, Traiter } from './contexte';

export function souche<Demande>(domaine: string): Traiter<Demande> {
  return async (_demande: Demande, contexte: Contexte) => {
    contexte.envoyer({ type: 'non-construit', domaine });
  };
}
