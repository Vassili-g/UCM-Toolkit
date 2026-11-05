/**
 * L'actualisation du mode Tokens, du clic à la fin de l'analyse : le relevé des variables, les constats de structure et, quand le fichier
 * a déjà un bilan, les noms de Nomenclature. Le module tient la liste de ce qui manque. Tant qu'une part manque, l'onglet Constats montre le
 * message de lecture à la place des constats ; dès que la dernière arrive, il montre la durée de l'analyse, sous la forme du mode Composant
 * (`TEXTES.panneau.analyseA`). Une lecture échouée ou annulée abandonne le suivi : les constats reviennent, sans durée.
 *
 * Il ne parle pas au sandbox : `relancerLesNoms` est injecté, et rend faux quand le fichier n'a pas de bilan.
 *
 * Il tient aussi les repères du rapport (`Repere`) : l'heure, en millisecondes depuis 1970 comme les phases du sandbox, du départ de
 * l'actualisation, de la réception puis du rendu des constats de structure et des noms, et de la fin du rendu complet.
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

/** Les moments que l'interface note pour une actualisation. `affichage-complet` : la dernière part est rendue et le chargement se retire. */
export type NomDeRepere = 'depart' | 'releve-recu' | 'structure-recue' | 'structure-rendue' | 'noms-recus' | 'noms-rendus' | 'affichage-complet';

/** Un repère : son nom, son heure en millisecondes depuis 1970, et le numéro de l'actualisation qui l'a noté. */
export interface Repere { readonly repere: NomDeRepere; readonly a: number; readonly actualisation: number }

/** Les repères que le rapport garde : une actualisation en note six au plus. */
export const REPERES_RETENUS = 120;

export interface OptionsDActualisation {
  readonly panneau: Pick<PanneauDesTokens, 'poserLeChargement' | 'poserLeResume'>;
  /** La lecture en cours de l'application, relue à chaque `rafraichir` pour le texte de progression. */
  readonly lecture: () => Lecture;
  /** Relance l'analyse des noms ; rend vrai quand elle part. */
  readonly relancerLesNoms: () => boolean;
  /** L'horloge de la durée, en millisecondes. */
  readonly horloge?: () => number;
  /** L'heure affichée et celle des repères, en millisecondes depuis 1970. */
  readonly maintenant?: () => number;
}

export interface Actualisation {
  /**
   * Une lecture part : le suivi recommence, et les noms sont relancés si le fichier en a un bilan. `avecChargement` faux (la lecture de
   * l'ouverture) : le message de lecture ne prend pas la place des constats, mais la durée paraît à la fin.
   */
  commencer(avecChargement?: boolean): void;
  /** Une part est arrivée ; sans effet si elle n'est pas attendue. La dernière montre la durée. */
  recevoir(part: PartDeLActualisation): void;
  /** Un `bilan` neuf arrive d'une analyse des noms que l'écran avait lui-même demandée pendant l'actualisation : elle compte aussi. */
  attendreLesNoms(): void;
  /** La lecture a échoué ou été annulée. */
  abandonner(): void;
  /** Redessine le message : le texte de progression a pu changer. */
  rafraichir(): void;
  enCours(): boolean;
  /** Note un repère à l'heure courante, sous l'actualisation en cours ou la dernière commencée. */
  noter(repere: NomDeRepere): void;
  /** Les repères notés, du plus ancien au plus récent. */
  reperes(): readonly Repere[];
}

export function creerActualisation({ panneau, lecture, relancerLesNoms, horloge = () => globalThis.performance?.now() ?? Date.now(), maintenant = Date.now }: OptionsDActualisation): Actualisation {
  let attendues = new Set<PartDeLActualisation>();
  let debut = 0;
  let suivie = false;
  let chargement = true;
  let numero = 0;
  const reperes: Repere[] = [];
  function noter(repere: NomDeRepere): void {
    reperes.push({ repere, a: maintenant(), actualisation: numero });
    if (reperes.length > REPERES_RETENUS) reperes.splice(0, reperes.length - REPERES_RETENUS);
  }

  function poser(): void {
    panneau.poserLeChargement(suivie && chargement ? texteDeLaLecture(lecture()) : null);
  }

  return {
    commencer(avecChargement = true) {
      chargement = avecChargement;
      numero += 1;
      noter('depart');
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
      noter('affichage-complet');
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
    noter,
    reperes: () => reperes.slice(),
  };
}

/**
 * Ajoute les repères de l'interface aux mesures du sandbox (le JSON de `rapport-de-tokens-pret`) ; un JSON illisible reste tel quel.
 * Le rapport garde ainsi sur une même ligne de temps les phases du sandbox et ce que l'écran a reçu et rendu.
 */
export function joindreLesReperes(mesures: string, reperes: readonly Repere[]): string {
  try {
    const base = JSON.parse(mesures) as unknown;
    if (typeof base !== 'object' || base === null || Array.isArray(base)) return mesures;
    return JSON.stringify({ ...base, reperes });
  } catch {
    return mesures;
  }
}
