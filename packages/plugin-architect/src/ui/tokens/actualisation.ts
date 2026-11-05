/**
 * L'actualisation du mode Tokens, du clic à la fin de l'analyse : le relevé des variables, les constats de structure et, quand le fichier
 * a déjà un bilan, les noms de Nomenclature. Le module tient la liste de ce qui manque. Tant qu'une part manque, l'onglet Constats montre le
 * message de lecture à la place des constats ; dès que la dernière arrive, il montre la durée de l'analyse, sous la forme du mode Composant
 * (`TEXTES.panneau.analyseA`). Une lecture échouée ou annulée abandonne le suivi : les constats reviennent, sans durée.
 *
 * Il ne parle pas au sandbox : `relancerLesNoms` est injecté, et rend faux quand le fichier n'a pas de bilan.
 */
import type { Lecture } from '../etat';
import { TEXTES } from '../textes';
import { heureLisible } from '../textes/composant';
import type { PanneauDesTokens } from './panneau';

/** Ce qu'une actualisation attend : la lecture des variables, la structure, et les noms quand leur analyse est relancée. */
export type PartDeLActualisation = 'releve' | 'structure' | 'noms';

/** Le texte de lecture du mode Tokens : la phase et son compte quand le sandbox les a donnés, sinon « Lecture des variables… ». */
export function texteDeLaLecture(lecture: Lecture): string {
  if (lecture.statut === 'en-cours' && (lecture.total > 1 || lecture.fait > 0)) return TEXTES.progression(TEXTES.phase[lecture.phase] ?? lecture.phase, lecture.fait, lecture.total);
  return TEXTES.lectureEnCours;
}

export interface OptionsDActualisation {
  readonly panneau: Pick<PanneauDesTokens, 'poserLeChargement' | 'poserLeResume'>;
  /** La lecture en cours de l'application, relue à chaque `rafraichir` pour le texte de progression. */
  readonly lecture: () => Lecture;
  /** Relance l'analyse des noms ; rend vrai quand elle part. */
  readonly relancerLesNoms: () => boolean;
  /** L'horloge de la durée, en millisecondes. */
  readonly horloge?: () => number;
  /** L'heure affichée, en millisecondes depuis 1970. */
  readonly maintenant?: () => number;
}

export interface Actualisation {
  /** Un Actualiser part : le suivi recommence, et les noms sont relancés si le fichier en a un bilan. */
  commencer(): void;
  /** Une part est arrivée ; sans effet si elle n'est pas attendue. La dernière montre la durée. */
  recevoir(part: PartDeLActualisation): void;
  /** Un `bilan` neuf arrive d'une analyse des noms que l'écran avait lui-même demandée pendant l'actualisation : elle compte aussi. */
  attendreLesNoms(): void;
  /** La lecture a échoué ou été annulée. */
  abandonner(): void;
  /** Redessine le message : le texte de progression a pu changer. */
  rafraichir(): void;
  enCours(): boolean;
}

export function creerActualisation({ panneau, lecture, relancerLesNoms, horloge = () => globalThis.performance?.now() ?? Date.now(), maintenant = Date.now }: OptionsDActualisation): Actualisation {
  let attendues = new Set<PartDeLActualisation>();
  let debut = 0;
  let suivie = false;

  function poser(): void {
    panneau.poserLeChargement(suivie ? texteDeLaLecture(lecture()) : null);
  }

  return {
    commencer() {
      attendues = new Set<PartDeLActualisation>(['releve', 'structure']);
      debut = horloge();
      suivie = true;
      if (relancerLesNoms()) attendues.add('noms');
      panneau.poserLeResume(null);
      poser();
    },
    attendreLesNoms() {
      if (suivie) attendues.add('noms');
    },
    recevoir(part) {
      if (!suivie || !attendues.delete(part) || attendues.size > 0) return;
      suivie = false;
      panneau.poserLeResume(TEXTES.panneau.analyseA(heureLisible(maintenant()), Math.max(0, horloge() - debut)));
      poser();
    },
    abandonner() {
      if (!suivie) return;
      suivie = false;
      attendues.clear();
      poser();
    },
    rafraichir() {
      if (suivie) poser();
    },
    enCours: () => suivie,
  };
}
