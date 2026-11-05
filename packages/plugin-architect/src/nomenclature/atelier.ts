/**
 * L'atelier du Worker des noms : il garde l'état complet de chaque génération (lexique, résultat, questions, projection) et exécute les
 * travaux que le sandbox lui confie, sans rien lire ni écrire dans Figma. Le module est pur et n'importe ni `figma`, ni le journal, ni le
 * socle d'interface ; un test l'appelle sous Node comme le Worker l'appelle dans l'interface.
 *
 * L'atelier garde les deux dernières générations : celle que le sandbox sert et celle qu'un calcul en cours ou abandonné a créée. Un travail
 * qui demande une autre génération reçoit `perimee`, et le sandbox calcule alors lui-même.
 */
import type { ResultatDuTravail, TravailDesNoms } from '../messages/calculDesNoms';
import { calculerLEtatDirect, construireEtat, menerSansCeder, moteurDuKit, recalculer, type Etat, type Moteur } from './calcul';
import {
  ErreurDeProtocole, conclureLaSimulation, debuterLaSimulation, messageDeSimulation, preparerLeGeste, renommagesDeLaSelection, repondreALaLecture,
} from './gestes';

/** Les générations gardées : la courante et la précédente. */
export const GENERATIONS_GARDEES = 2;

export interface Atelier {
  /** Exécute `travail` pour `generation` : la génération créée par `calculer`, `recalculer`, ou celle sur laquelle les autres travaux portent. */
  executer(travail: TravailDesNoms, generation: number): ResultatDuTravail;
}

export function creerAtelier(moteur: Moteur = moteurDuKit): Atelier {
  const etats = new Map<number, Etat>();

  function garder(etat: Etat): Etat {
    etats.set(etat.generation, etat);
    const anciennes = [...etats.keys()].sort((a, b) => b - a).slice(GENERATIONS_GARDEES);
    for (const generation of anciennes) etats.delete(generation);
    return etat;
  }

  /** Rend le résultat d'un travail, ou l'erreur de protocole qu'il lève : le sandbox la rend à l'écran comme sa propre session le ferait. */
  function protege(travail: () => ResultatDuTravail): ResultatDuTravail {
    try {
      return travail();
    } catch (cause) {
      if (cause instanceof ErreurDeProtocole) return { sorte: 'erreur', code: cause.code };
      throw cause;
    }
  }

  return {
    executer(travail, generation) {
      switch (travail.sorte) {
        case 'calculer': {
          const etat = garder(calculerLEtatDirect({ ...travail.entree, generation }, moteur));
          return { sorte: 'bilan', bilan: etat.projection.bilan() };
        }
        case 'recalculer': {
          const base = etats.get(travail.base);
          if (!base) return { sorte: 'perimee' };
          const calcul = menerSansCeder(recalculer(moteur, base, travail.regles, true));
          // Les groupes déjà vus ne changent qu'à l'analyse : un geste garde la pastille « Nouveau » de la session.
          const etat = garder(construireEtat(generation, base.inventaire, { ...travail.regles, vus: base.regles.vus }, calcul));
          return { sorte: 'bilan', bilan: etat.projection.bilan() };
        }
        case 'adopter': {
          const courant = etats.get(generation);
          if (!courant) return { sorte: 'perimee' };
          const etat = garder(construireEtat(generation, courant.inventaire, travail.regles, courant));
          return { sorte: 'bilan', bilan: etat.projection.bilan() };
        }
        case 'lire': {
          const courant = etats.get(generation);
          return courant ? { sorte: 'message', message: repondreALaLecture(travail.lecture, courant) } : { sorte: 'perimee' };
        }
        case 'simuler': {
          const base = etats.get(generation);
          if (!base) return { sorte: 'perimee' };
          return protege(() => {
            const courant = new Map(travail.courant);
            const debut = debuterLaSimulation(moteur, base, travail.geste, courant);
            if (debut.sorte === 'repond') return { sorte: 'message', message: messageDeSimulation(travail.demande, base, debut.effet, debut.conflit) };
            const calcul = menerSansCeder(recalculer(moteur, base, debut.regles, false));
            return { sorte: 'message', message: messageDeSimulation(travail.demande, base, conclureLaSimulation(base, travail.geste, debut, calcul), null) };
          });
        }
        case 'preparer': {
          const base = etats.get(generation);
          if (!base) return { sorte: 'perimee' };
          return protege(() => {
            const preparation = preparerLeGeste(moteur, travail.preparation, base, new Map(travail.courant));
            return preparation.sorte === 'refus' ? { sorte: 'refus', conflits: preparation.conflits } : preparation;
          });
        }
        case 'renommages': {
          const base = etats.get(generation);
          return base ? { sorte: 'renommages', renommages: renommagesDeLaSelection(base, travail.selection) } : { sorte: 'perimee' };
        }
      }
    },
  };
}
