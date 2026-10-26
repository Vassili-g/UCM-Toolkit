/**
 * Le domaine `ignores` : écarter un constat (Ignorer) ou sa proposition (Ne plus
 * proposer), et le rendre (Ne plus ignorer).
 *
 * Une identité qui n'est pas celle de l'analyse courante est ignorée. Le
 * rangement passe par `ecriture/ignores.ts`, une opération à la fois. Une
 * demande refusée (constat `limite`, hors UCM, proposition absente) n'écrit
 * rien et rend la liste telle qu'elle était. Le sandbox retire du lot
 * « Appliquer » la correction d'un constat écarté et la y remet avec lui ; la
 * réponse `ignores` ne liste que les constats ignorés, pas les propositions
 * retirées. Écarter ne périme pas l'analyse.
 */
import type { Constat } from '@ucm-kit/core/controles';

import { constatsIgnores, ignorerUnConstat, nePlusIgnorer, type PortDIgnores, type ResultatDIgnorer } from '../ecriture/ignores';
import type { DemandeDIgnores } from '../messages/ignores';
import { analyseCourante, analyseFinalisee, constatDeLAnalyse, fixerUneCorrection, prendreLaPlaceDUneEcriture } from './analyse';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDIgnores['type'][] = ['ignorer', 'ne-plus-ignorer'];

/** Le rangement du domaine : le sandbox donne celui de Figma, les tests des doubles. */
export interface Rangement {
  ignorer(constat: Constat, portee: 'constat' | 'proposition'): ResultatDIgnorer;
  nePlusIgnorer(id: string): ResultatDIgnorer;
}

export const rangementDeFigma = (api: PortDIgnores): Rangement => ({
  ignorer: (constat, portee) => ignorerUnConstat(api, constat, portee),
  nePlusIgnorer: (id) => nePlusIgnorer(api, id),
});

export function traiterAvec(rangement: (contexte: Contexte) => Rangement): Traiter<DemandeDIgnores> {
  return async (demande, contexte) => {
    const courante = analyseCourante();
    if (!courante || courante.sujet !== demande.analyse.sujet || courante.generation !== demande.analyse.generation) return;
    if (!analyseFinalisee(demande.analyse)) return;
    const place = prendreLaPlaceDUneEcriture(demande.analyse);
    if ('occupe' in place) {
      contexte.envoyer({ type: 'occupe', analyse: await place.occupe });
      return;
    }
    try {
      const constat = constatDeLAnalyse(demande.analyse, demande.constat);
      if (!constat) return;
      const rangeur = rangement(contexte);
      const resultat = demande.type === 'ignorer' ? rangeur.ignorer(constat, demande.portee) : rangeur.nePlusIgnorer(constat.id);
      if (resultat.ecrit && constat.correction) {
        // Un constat ou une proposition écartés quittent le lot Appliquer ; Ne plus ignorer les y remet.
        fixerUneCorrection(demande.analyse, constat.correction.id, demande.type === 'ignorer' ? null : constat.correction);
      }
      contexte.envoyer({ type: 'ignores', analyse: demande.analyse, constats: constatsIgnores(resultat.cles) });
    } finally {
      place.liberer();
    }
  };
}

export const traiter = traiterAvec(({ figma }) => rangementDeFigma(figma as unknown as PortDIgnores));
