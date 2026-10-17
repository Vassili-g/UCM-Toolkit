/** Point d'entrée de l'écran d'UCM Architect : la coquille reçoit les messages du sandbox. */
import type { PluginMessage, UiMessage } from '../messages';
import { creerCoquille } from './coquille';

const app = document.getElementById('app');
if (!app) throw new Error('Élément app absent');
const envoyer = (message: UiMessage) => parent.postMessage({ pluginMessage: message }, '*');
const coquille = creerCoquille(app, envoyer);

window.addEventListener('message', (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data?.pluginMessage;
  if (message) coquille.frontiere.recevoir(message);
});
