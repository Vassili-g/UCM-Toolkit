/**
 * Le port par lequel la session confie le calcul des noms à l'interface (un Worker) : il envoie l'entrée, attend la réponse de la demande,
 * et rend le bilan ou la raison du repli. Une réponse qui ne porte pas la demande, la génération et la révision de la requête en attente
 * est ignorée ; sans réponse avant `delai`, la requête se replie et la session calcule dans le sandbox.
 *
 * Le module n'importe ni `figma`, ni le journal : le sandbox lui donne la révision de l'acquisition et la porte d'envoi.
 */
import type { Bilan } from '../messages/nomenclature';
import type { CauseDeRepli, MesureDuCalculDistant, MessageDeCalculDesNoms, ReponseDuCalculDesNoms } from '../messages/calculDesNoms';
import type { EntreeDuCalcul } from './calcul';

/** Le délai, en millisecondes, après lequel le sandbox renonce au Worker : un calcul de 2 415 variables y prend moins de 3 s. */
export const DELAI_DU_CALCUL_DISTANT = 120_000;

export type IssueDuCalculDistant =
  | { readonly type: 'calcule'; readonly bilan: Bilan; readonly mesure: MesureDuCalculDistant; readonly envoyeA: number; readonly recuA: number }
  | { readonly type: 'repli'; readonly cause: CauseDeRepli }
  | { readonly type: 'annule' };

export interface RequeteDistante {
  readonly issue: Promise<IssueDuCalculDistant>;
  /** Abandonne l'attente ; la réponse qui arriverait ensuite est ignorée. */
  annuler(): void;
}

export interface PortDeCalculDistant {
  calculer(requete: { readonly demande: number; readonly generation: number; readonly entree: EntreeDuCalcul }): RequeteDistante;
}

export interface OptionsDuPortDistant {
  readonly envoyer: (message: MessageDeCalculDesNoms) => void;
  /** Le repère des lectures de variables au moment de l'envoi : `reperDesLectures` du sandbox. */
  readonly revision: () => string;
  readonly delai?: number;
  readonly maintenant?: () => number;
  /** Rend la fonction qui annule le rappel. `setTimeout` par défaut. */
  readonly planifier?: (rappel: () => void, ms: number) => () => void;
}

export interface PortDistantDuSandbox extends PortDeCalculDistant {
  /** Range la réponse de l'interface auprès de la requête qu'elle attend ; toute autre est ignorée. */
  recevoir(reponse: ReponseDuCalculDesNoms): void;
}

interface EnAttente {
  readonly generation: number;
  readonly revision: string;
  readonly envoyeA: number;
  readonly fin: (issue: IssueDuCalculDistant) => void;
}

export function creerPortDistant(options: OptionsDuPortDistant): PortDistantDuSandbox {
  const delai = options.delai ?? DELAI_DU_CALCUL_DISTANT;
  const maintenant = options.maintenant ?? Date.now;
  const planifier = options.planifier ?? ((rappel, ms) => {
    const minuterie = setTimeout(rappel, ms);
    return () => clearTimeout(minuterie);
  });
  const attente = new Map<number, EnAttente>();

  return {
    calculer({ demande, generation, entree }) {
      const revision = options.revision();
      const envoyeA = maintenant();
      let fin: (issue: IssueDuCalculDistant) => void = () => {};
      const issue = new Promise<IssueDuCalculDistant>((resoudre) => { fin = resoudre; });
      let arreter: () => void = () => {};
      const conclure = (resultat: IssueDuCalculDistant): void => {
        if (attente.get(demande)?.fin !== conclure) return;
        attente.delete(demande);
        arreter();
        fin(resultat);
      };
      // Une demande de même numéro ne peut pas rester en attente : la nouvelle remplace l'ancienne.
      attente.get(demande)?.fin({ type: 'annule' });
      attente.set(demande, { generation, revision, envoyeA, fin: conclure });
      arreter = planifier(() => conclure({ type: 'repli', cause: 'delai' }), delai);
      try {
        options.envoyer({ type: 'calcul-des-noms', demande, generation, revision, envoyeA, entree });
      } catch {
        conclure({ type: 'repli', cause: 'indisponible' });
      }
      return { issue, annuler: () => conclure({ type: 'annule' }) };
    },
    recevoir(reponse) {
      const requete = attente.get(reponse.demande);
      if (!requete || requete.generation !== reponse.generation || requete.revision !== reponse.revision) return;
      if (reponse.type === 'noms-non-calcules') requete.fin({ type: 'repli', cause: reponse.cause });
      else requete.fin({ type: 'calcule', bilan: reponse.bilan, mesure: reponse.mesure, envoyeA: requete.envoyeA, recuA: maintenant() });
    },
  };
}
