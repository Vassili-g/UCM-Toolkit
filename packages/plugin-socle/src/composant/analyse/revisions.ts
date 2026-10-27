/**
 * La révision de travail : ce qu'une demande d'analyse prépare pour un sujet, hors de la session. La session ne change
 * qu'à la promotion ; une révision jetée la laisse telle quelle, avec l'entrée retenue avant elle.
 *
 * Le module ne juge rien : l'appelant dit si la promotion est valide (fin complète, identité encore courante, rien de
 * périmé au journal). Une révision ne se promeut ni ne se jette deux fois.
 */
import type { ContenuDeSession, EntreeDeSession, RequeteRetenue, SessionDAnalyse } from './session';

export interface RevisionDeTravail<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>> {
  readonly sujet: string;
  /** `ouverte` jusqu'à la promotion ou au rejet. */
  readonly etat: 'ouverte' | 'promue' | 'jetee';
  /** Range le contenu calculé dans la révision ; la session n'est pas touchée. */
  preparer(contenu: ContenuDeSession<Sorties, Requetes>): void;
  /**
   * Range le contenu dans la session quand `valide` est vrai et qu'un contenu a été préparé ; rend l'entrée retenue.
   * Sinon la révision est jetée et la session reste telle quelle : `null`.
   */
  promouvoir(valide: boolean): EntreeDeSession<Sorties, Requetes> | null;
  /** Abandonne la révision ; sans effet si elle n'est plus ouverte. */
  jeter(): void;
}

export function ouvrirUneRevision<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>>(
  session: SessionDAnalyse<Sorties, Requetes>,
  sujet: string,
): RevisionDeTravail<Sorties, Requetes> {
  let etat: 'ouverte' | 'promue' | 'jetee' = 'ouverte';
  let contenu: ContenuDeSession<Sorties, Requetes> | null = null;
  return {
    sujet,
    get etat() { return etat; },
    preparer(prepare) {
      if (etat === 'ouverte') contenu = prepare;
    },
    promouvoir(valide) {
      if (etat !== 'ouverte') return null;
      const aRetenir = contenu;
      contenu = null;
      if (!valide || aRetenir === null) {
        etat = 'jetee';
        return null;
      }
      etat = 'promue';
      return session.retenir(sujet, aRetenir);
    },
    jeter() {
      if (etat !== 'ouverte') return;
      etat = 'jetee';
      contenu = null;
    },
  };
}
