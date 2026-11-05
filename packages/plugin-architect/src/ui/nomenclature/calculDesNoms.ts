/**
 * Le client du Worker de calcul des noms. Le sandbox envoie l'entrée du calcul (`calcul-des-noms`) ; le client la passe au Worker et rend au
 * sandbox le bilan (`noms-calcules`), ou la raison pour laquelle il n'y en a pas (`noms-non-calcules`), après quoi le sandbox calcule lui-même.
 *
 * Le Worker naît de la source que le build embarque dans le bundle de l'écran (`__SOURCE_DU_WORKER_DE_NOMS__`), lancée depuis un `Blob` : le
 * plugin est un seul fichier HTML, sans second fichier à servir. Il naît à la première requête, une seule fois. S'il ne naît pas (source
 * absente, politique de contenu qui refuse le `Blob`), ne répond pas au démarrage, ou plante, le client le jette et répond `indisponible`,
 * `demarrage` ou `echec` ; il ne le relance pas dans la même session.
 *
 * Seule la dernière requête reçue est attendue : la réponse d'une requête remplacée, et toute réponse dont la demande, la génération ou la
 * révision diffère, sont ignorées.
 */
import { estCalculDesNoms, type MesureDuCalculDistant, type MessageDeCalculDesNoms, type ReponseDuCalculDesNoms } from '../../messages/calculDesNoms';
import type { Bilan } from '../../messages/nomenclature';
import type { ReponseDuTravailleur, RequeteDuTravailleur } from './calculDesNomsWorker';

export { estCalculDesNoms };

/** Remplacé à la construction par la source du Worker (`scripts/build-ui-js.cjs`) ; absent sous Node, dans les tests et dans la galerie sans build. */
declare const __SOURCE_DU_WORKER_DE_NOMS__: string | undefined;

/** Le temps, en millisecondes, que le Worker a pour dire `demarre`. */
export const DELAI_DE_DEMARRAGE = 5000;

/** Ce que le client emploie d'un Worker : l'objet du navigateur, ou un faux dans un test. */
export interface TravailleurDeNoms {
  postMessage(message: RequeteDuTravailleur): void;
  terminate(): void;
  onmessage: ((evenement: { readonly data: ReponseDuTravailleur }) => void) | null;
  onerror: ((evenement: unknown) => void) | null;
  onmessageerror: ((evenement: unknown) => void) | null;
}

export interface OptionsDuCalculateurDeNoms {
  /** Vers le sandbox (`versSandbox`). */
  readonly envoyer: (reponse: ReponseDuCalculDesNoms) => void;
  /** Crée le Worker ; lève ou rend `null` quand il est impossible. Par défaut, celui de la source embarquée. */
  readonly fabriquer?: () => TravailleurDeNoms | null;
  readonly maintenant?: () => number;
  readonly delaiDeDemarrage?: number;
  /** Rend la fonction qui annule le rappel. `setTimeout` par défaut. */
  readonly planifier?: (rappel: () => void, ms: number) => () => void;
}

export interface CalculateurDeNoms {
  /** Reçoit l'entrée du sandbox. */
  recevoir(message: MessageDeCalculDesNoms): void;
  /** Vrai tant que le Worker peut servir : il n'a pas été jeté. */
  disponible(): boolean;
}

/** Le Worker de la source embarquée, ou `null` quand le bundle n'en porte pas. */
function travailleurEmbarque(): TravailleurDeNoms | null {
  if (typeof __SOURCE_DU_WORKER_DE_NOMS__ !== 'string' || __SOURCE_DU_WORKER_DE_NOMS__ === '') return null;
  // L'adresse reste valide jusqu'à la fermeture de l'iframe, qui la crée une seule fois et ne paie qu'un `Blob`.
  return new Worker(URL.createObjectURL(new Blob([__SOURCE_DU_WORKER_DE_NOMS__], { type: 'text/javascript' }))) as unknown as TravailleurDeNoms;
}

interface Attendue {
  readonly demande: number;
  readonly generation: number;
  readonly revision: string;
  readonly recuA: number;
  readonly demarrage: boolean;
}

export function creerCalculateurDeNoms(options: OptionsDuCalculateurDeNoms): CalculateurDeNoms {
  const maintenant = options.maintenant ?? Date.now;
  const delaiDeDemarrage = options.delaiDeDemarrage ?? DELAI_DE_DEMARRAGE;
  const planifier = options.planifier ?? ((rappel, ms) => {
    const minuterie = setTimeout(rappel, ms);
    return () => clearTimeout(minuterie);
  });
  const fabriquer = options.fabriquer ?? travailleurEmbarque;

  let travailleur: TravailleurDeNoms | null = null;
  let jete = false;
  let demarre = false;
  let arreterLeDelai: () => void = () => {};
  /** La requête dont la réponse est attendue : la dernière reçue. */
  let attendue: Attendue | null = null;

  const identite = (requete: Attendue) => ({ demande: requete.demande, generation: requete.generation, revision: requete.revision });

  function jeter(cause: 'indisponible' | 'demarrage' | 'echec'): void {
    jete = true;
    arreterLeDelai();
    arreterLeDelai = () => {};
    const aRepondre = attendue;
    attendue = null;
    const courant = travailleur;
    travailleur = null;
    try { courant?.terminate(); } catch { /* un Worker déjà mort n'a rien à fermer */ }
    if (aRepondre) options.envoyer({ type: 'noms-non-calcules', ...identite(aRepondre), cause });
  }

  function creer(): TravailleurDeNoms | null {
    let neuf: TravailleurDeNoms | null;
    try { neuf = fabriquer(); } catch { neuf = null; }
    if (!neuf) return null;
    neuf.onmessage = ({ data }) => {
      if (travailleur !== neuf || !data) return;
      if (data.type === 'demarre') {
        demarre = true;
        arreterLeDelai();
        arreterLeDelai = () => {};
        return;
      }
      const requete = attendue;
      if (!requete || data.demande !== requete.demande || data.generation !== requete.generation || data.revision !== requete.revision) return;
      attendue = null;
      if (data.type === 'echec') {
        options.envoyer({ type: 'noms-non-calcules', ...identite(requete), cause: 'echec' });
        return;
      }
      const mesure: MesureDuCalculDistant = {
        recuA: requete.recuA, demarrage: requete.demarrage, travailleurRecuA: data.recuA, calculDebutA: data.calculDebutA, calculFinA: data.calculFinA,
      };
      options.envoyer({ type: 'noms-calcules', ...identite(requete), bilan: data.bilan as Bilan, mesure });
    };
    // Un script qui ne charge pas, une exception hors du calcul ou un message illisible : le Worker n'est plus fiable.
    neuf.onerror = () => { if (travailleur === neuf) jeter(demarre ? 'echec' : 'demarrage'); };
    neuf.onmessageerror = () => { if (travailleur === neuf) jeter('echec'); };
    travailleur = neuf;
    return neuf;
  }

  return {
    recevoir(message) {
      const recuA = maintenant();
      const requete: Attendue = { demande: message.demande, generation: message.generation, revision: message.revision, recuA, demarrage: false };
      if (jete) {
        options.envoyer({ type: 'noms-non-calcules', ...identite(requete), cause: 'indisponible' });
        return;
      }
      const cree = travailleur === null;
      const actif = travailleur ?? creer();
      if (!actif) {
        jete = true;
        options.envoyer({ type: 'noms-non-calcules', ...identite(requete), cause: 'indisponible' });
        return;
      }
      attendue = { ...requete, demarrage: cree };
      if (cree) arreterLeDelai = planifier(() => { if (!demarre) jeter('demarrage'); }, delaiDeDemarrage);
      try {
        actif.postMessage({ type: 'calculer', demande: message.demande, generation: message.generation, revision: message.revision, entree: message.entree });
      } catch {
        jeter('echec');
      }
    },
    disponible: () => !jete,
  };
}
