/**
 * L'actualisation du mode Tokens, du clic à la fin de l'analyse : le relevé des variables, les constats de structure et, quand le fichier
 * a déjà un bilan, les noms de Nomenclature. Le module tient la liste de ce qui manque et la donne au panneau (`poserLAttente`) à chaque
 * part reçue. Le panneau reste visible : les constats de structure paraissent dès leur réception, Noms reste en cours jusqu'au bilan,
 * et Appliquer comme les corrections de la révision précédente restent désactivés tant qu'une part manque. Dès que la dernière arrive,
 * l'onglet montre la durée de l'analyse, sous la forme du mode Composant (`TEXTES.panneau.analyseA`). Une lecture échouée ou annulée
 * abandonne le suivi : l'attente tombe, sans durée.
 *
 * Chaque message suit un événement du calcul, jamais une minuterie. Deux fils portent des textes distincts, pour qu'une même phrase ne paraisse
 * pas deux fois : la structure (en tête des constats) va de « Lecture des variables… » à « Vérification des variables et des alias… », et les noms
 * (dans la section Noms) vont du compte des variables acquises à « Recherche des termes à harmoniser… ». Une fois la structure affichée, Noms dit
 * « La vérification des noms continue. » tant qu'il n'a pas d'étape plus précise.
 *
 * Il ne parle pas au sandbox : `relancerLesNoms` est injecté, et rend faux quand le fichier n'a pas de bilan.
 *
 * Il tient aussi les repères du rapport (`Repere`) : l'heure, en millisecondes depuis 1970 comme les phases du sandbox, du départ de
 * l'actualisation, de la réception puis du rendu des constats de structure et des noms, et de la fin du rendu complet.
 */
import type { EtapeDesNoms } from '../../messages/nomenclature';
import type { Lecture } from '../etat';
import { TEXTES } from '../textes';
import { heureLisible } from '../textes/composant';
import type { PanneauDesTokens } from './panneau';

/** Ce qu'une actualisation attend : la lecture des variables, la structure, et les noms quand leur analyse est relancée. */
export type PartDeLActualisation = 'releve' | 'structure' | 'noms';

/** Le texte de la lecture du relevé : « Lecture des cibles des alias… » à la phase des références, sinon « Lecture des variables… », sans total. */
export function texteDeLaLecture(lecture: Lecture): string {
  return lecture.statut === 'en-cours' && lecture.phase === 'references' ? TEXTES.lectureDesCibles : TEXTES.lectureEnCours;
}

/** Les moments que l'interface note pour une actualisation. `affichage-complet` : la dernière part est rendue et le chargement se retire. */
export type NomDeRepere = 'depart' | 'releve-recu' | 'structure-recue' | 'structure-rendue' | 'noms-recus' | 'noms-rendus' | 'affichage-complet';

/** Un repère : son nom, son heure en millisecondes depuis 1970, et le numéro de l'actualisation qui l'a noté. */
export interface Repere { readonly repere: NomDeRepere; readonly a: number; readonly actualisation: number }

/** Les repères que le rapport garde : une actualisation en note six au plus. */
export const REPERES_RETENUS = 120;

export interface OptionsDActualisation {
  readonly panneau: Pick<PanneauDesTokens, 'poserLAttente' | 'poserLeResume'>;
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
   * l'ouverture) : le message de lecture ne paraît pas en tête des constats, mais la durée paraît à la fin.
   */
  commencer(avecChargement?: boolean): void;
  /** Une part est arrivée ; sans effet si elle n'est pas attendue. La dernière montre la durée. */
  recevoir(part: PartDeLActualisation): void;
  /** Un `bilan` neuf arrive d'une analyse des noms que l'écran avait lui-même demandée pendant l'actualisation : elle compte aussi. */
  attendreLesNoms(): void;
  /** Le calcul des noms entre dans une étape (sandbox ou Worker) ; sans effet si les noms ne sont pas attendus. */
  etapeDesNoms(etape: EtapeDesNoms): void;
  /** L'inventaire des noms compte `lues` variables acquises sur `total` ; le compte s'efface à N sur N. */
  lectureDesNoms(lues: number, total: number): void;
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
  /** Le relevé est reçu : la structure se vérifie, sans autre événement à suivre avant ses constats. */
  let structureEnVerification = false;
  /** Les variables acquises par l'analyse des noms ; `null` avant le premier compte. */
  let acquises: { readonly lues: number; readonly total: number } | null = null;
  let etapeDesNoms: EtapeDesNoms | null = null;
  const reperes: Repere[] = [];
  function noter(repere: NomDeRepere): void {
    reperes.push({ repere, a: maintenant(), actualisation: numero });
    if (reperes.length > REPERES_RETENUS) reperes.splice(0, reperes.length - REPERES_RETENUS);
  }

  const structureAttendue = (): boolean => attendues.has('releve') || attendues.has('structure');

  /** Le texte du fil des noms : l'étape la plus avancée, sinon le compte des variables, sinon la phrase de la structure affichée. */
  function texteDesNoms(): string | null {
    if (!attendues.has('noms')) return null;
    if (etapeDesNoms === 'questions') return TEXTES.rechercheDesTermes;
    if (etapeDesNoms === 'lexique') return TEXTES.verificationDesNoms;
    if (acquises !== null && acquises.total > 0 && acquises.lues < acquises.total) return TEXTES.lectureAvecCompte(acquises.lues, acquises.total);
    return structureAttendue() ? null : TEXTES.verificationDesNomsContinue;
  }

  function poser(): void {
    if (!suivie) {
      panneau.poserLAttente(null);
      return;
    }
    panneau.poserLAttente({
      structure: structureAttendue(),
      noms: attendues.has('noms'),
      texte: structureEnVerification ? TEXTES.verificationDeLaStructure : texteDeLaLecture(lecture()),
      texteDesNoms: texteDesNoms(),
      enTete: chargement,
    });
  }

  return {
    commencer(avecChargement = true) {
      chargement = avecChargement;
      numero += 1;
      noter('depart');
      attendues = new Set<PartDeLActualisation>(['releve', 'structure']);
      structureEnVerification = false;
      acquises = null;
      etapeDesNoms = null;
      debut = horloge();
      suivie = true;
      if (relancerLesNoms()) attendues.add('noms');
      panneau.poserLeResume(null);
      poser();
    },
    attendreLesNoms() {
      if (!suivie) return;
      attendues.add('noms');
      acquises = null;
      etapeDesNoms = null;
      poser();
    },
    etapeDesNoms(etape) {
      if (!suivie || !attendues.has('noms')) return;
      etapeDesNoms = etape;
      poser();
    },
    lectureDesNoms(lues, total) {
      if (!suivie || !attendues.has('noms')) return;
      acquises = { lues, total };
      poser();
    },
    recevoir(part) {
      if (!suivie || !attendues.delete(part)) return;
      if (part === 'releve') structureEnVerification = true;
      if (attendues.size > 0) {
        poser();
        return;
      }
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
