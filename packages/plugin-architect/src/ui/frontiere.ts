/** Les réponses anciennes ne remplacent jamais le résultat de la demande active. */
import type { PluginMessage, UiMessage } from '../messages';
import type { ConventionsParCategorie } from '@ucm-kit/core/referentiel';

/** Une seule demande part jusqu'à sa réponse terminale. */
export function creerFrontiere(envoyer: (message: UiMessage) => void, afficher: (message: PluginMessage) => void) {
  let numero = 0;
  let enVol = false;
  let analyseId: number | undefined;
  return {
    analyser(): void {
      if (enVol) return;
      enVol = true;
      envoyer({ type: 'analyser', demande: ++numero });
    },
    recalculer(conventions: ConventionsParCategorie, termesUcm: boolean): void {
      if (enVol || analyseId === undefined) return;
      enVol = true;
      envoyer({ type: 'recalculer', demande: ++numero, analyseId, conventions, termesUcm });
    },
    appliquer(ids: readonly string[]): void {
      if (enVol || analyseId === undefined) return;
      enVol = true;
      envoyer({ type: 'appliquer', demande: ++numero, analyseId, ids: [...ids] });
    },
    recevoir(message: PluginMessage): void {
      if (message.type === 'initial') {
        if (numero === 0) afficher(message);
        return;
      }
      if (message.demande !== numero || !enVol) return;
      if (message.type === 'pret') analyseId = message.analyseId;
      if (message.type === 'application' || message.type === 'erreur') analyseId = undefined;
      if (message.type === 'pret' || message.type === 'erreur' || message.type === 'application') enVol = false;
      afficher(message);
    },
  };
}
