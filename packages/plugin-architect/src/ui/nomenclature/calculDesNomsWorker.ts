/**
 * Le Worker des noms : il reçoit les travaux du sandbox (passés par l'écran), les confie à l'atelier qui garde l'état de chaque génération,
 * et rend le résultat avec les heures de son travail. Il ne lit ni n'écrit rien dans Figma ; le build en fait un second bundle, que
 * `calculDesNoms.ts` lance depuis une chaîne.
 *
 * Pendant un calcul de bilan il envoie une réponse `etape` à chaque étape (lexique, questions) : le navigateur les remet à l'écran sans attendre la fin.
 *
 * Il répond `demarre` dès que son script est évalué, pour que l'écran sache que le Worker vit, puis une réponse par requête, de la
 * même demande, génération et révision que la requête.
 */
import type { TravailDesNoms } from '../../messages/calculDesNoms';
import type { EtapeDesNoms } from '../../messages/nomenclature';
import { creerAtelier } from '../../nomenclature/atelier';

/** Le message que l'écran passe au Worker. */
export interface RequeteDuTravailleur {
  readonly type: 'travailler';
  readonly demande: number;
  readonly generation: number;
  readonly revision: string;
  readonly travail: TravailDesNoms;
}

export type ReponseDuTravailleur =
  | { readonly type: 'demarre' }
  /** Le calcul d'un bilan entre dans une étape ; l'écran la montre pendant que le Worker travaille encore. */
  | { readonly type: 'etape'; readonly demande: number; readonly generation: number; readonly revision: string; readonly etape: EtapeDesNoms }
  | { readonly type: 'resultat'; readonly demande: number; readonly generation: number; readonly revision: string; readonly resultat: unknown; readonly recuA: number; readonly calculDebutA: number; readonly calculFinA: number }
  | { readonly type: 'echec'; readonly demande: number; readonly generation: number; readonly revision: string };

/** La portée d'un Worker, réduite à ce que ce fichier emploie. */
interface Portee {
  postMessage(message: ReponseDuTravailleur): void;
  onmessage: ((evenement: { readonly data: RequeteDuTravailleur }) => void) | null;
}

export function servirLesCalculs(portee: Portee): void {
  const atelier = creerAtelier();
  portee.onmessage = ({ data }) => {
    if (!data || data.type !== 'travailler') return;
    const { demande, generation, revision, travail } = data;
    const recuA = Date.now();
    try {
      const resultat = atelier.executer(travail, generation, (etape) => portee.postMessage({ type: 'etape', demande, generation, revision, etape }));
      portee.postMessage({ type: 'resultat', demande, generation, revision, resultat, recuA, calculDebutA: recuA, calculFinA: Date.now() });
    } catch {
      portee.postMessage({ type: 'echec', demande, generation, revision });
    }
  };
  portee.postMessage({ type: 'demarre' });
}

// Le bundle du Worker l'exécute dans sa propre portée ; importé par un test ou par l'écran, le module ne fait rien.
if (typeof (globalThis as { importScripts?: unknown }).importScripts === 'function') servirLesCalculs(globalThis as unknown as Portee);
