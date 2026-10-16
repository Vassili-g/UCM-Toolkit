/** Les réponses anciennes ne remplacent jamais le résultat de la demande active. */
import type { PluginMessage, UiMessage } from '../messages';

/** Une seule demande part jusqu'à sa réponse terminale. */
export function creerFrontiere(envoyer: (message: UiMessage) => void, afficher: (message: PluginMessage) => void) {
  let numero = 0;
  let enVol = false;
  return {
    analyser(): void {
      if (enVol) return;
      enVol = true;
      envoyer({ type: 'analyser', demande: ++numero });
    },
    recevoir(message: PluginMessage): void {
      if (message.type === 'initial') {
        if (numero === 0) afficher(message);
        return;
      }
      if (message.demande !== numero || !enVol) return;
      if (message.type === 'pret' || message.type === 'erreur') enVol = false;
      afficher(message);
    },
  };
}
