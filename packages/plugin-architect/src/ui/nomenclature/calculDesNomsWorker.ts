/**
 * Le Worker du calcul des noms : il reçoit l'entrée du sandbox (`EntreeDuCalcul`, passée par l'écran), rend le bilan et les heures de son
 * calcul. Il ne lit ni n'écrit rien dans Figma ; le build en fait un second bundle, que `calculDesNoms.ts` lance depuis une chaîne.
 *
 * Il répond `demarre` dès que son script est évalué, pour que l'écran sache que le Worker vit, puis une réponse par requête, de la
 * même demande, génération et révision que la requête.
 */
import { calculerLeBilanDirect, type EntreeDuCalcul } from '../../nomenclature/calcul';

/** Le message que l'écran passe au Worker. */
export interface RequeteDuTravailleur {
  readonly type: 'calculer';
  readonly demande: number;
  readonly generation: number;
  readonly revision: string;
  readonly entree: EntreeDuCalcul;
}

export type ReponseDuTravailleur =
  | { readonly type: 'demarre' }
  | { readonly type: 'bilan'; readonly demande: number; readonly generation: number; readonly revision: string; readonly bilan: unknown; readonly recuA: number; readonly calculDebutA: number; readonly calculFinA: number }
  | { readonly type: 'echec'; readonly demande: number; readonly generation: number; readonly revision: string };

/** La portée d'un Worker, réduite à ce que ce fichier emploie. */
interface Portee {
  postMessage(message: ReponseDuTravailleur): void;
  onmessage: ((evenement: { readonly data: RequeteDuTravailleur }) => void) | null;
}

export function servirLesCalculs(portee: Portee): void {
  portee.onmessage = ({ data }) => {
    if (!data || data.type !== 'calculer') return;
    const { demande, generation, revision, entree } = data;
    const recuA = Date.now();
    try {
      const bilan = calculerLeBilanDirect(entree);
      portee.postMessage({ type: 'bilan', demande, generation, revision, bilan, recuA, calculDebutA: recuA, calculFinA: Date.now() });
    } catch {
      portee.postMessage({ type: 'echec', demande, generation, revision });
    }
  };
  portee.postMessage({ type: 'demarre' });
}

// Le bundle du Worker l'exécute dans sa propre portée ; importé par un test ou par l'écran, le module ne fait rien.
if (typeof (globalThis as { importScripts?: unknown }).importScripts === 'function') servirLesCalculs(globalThis as unknown as Portee);
