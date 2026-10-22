/** Point d'entrée de l'écran d'UCM Nomenclature : la coquille reçoit les messages du sandbox. */
import type { PluginMessage, UiMessage } from '../../nomenclature/messages';
import { monterAAppliquer } from './aAppliquer';
import { monterATrancher } from './aTrancher';
import { monterConfiguration } from './configuration';
import { creerCoquille } from './coquille';
import { monterFeuilles } from './feuilles';
import { monterPremierLancement } from './premierLancement';
import { monterRegles } from './regles';

const app = document.getElementById('app');
if (!app) throw new Error('Élément app absent');
const envoyer = (message: UiMessage) => parent.postMessage({ pluginMessage: message }, '*');
const coquille = creerCoquille(app, envoyer);
monterPremierLancement(coquille);
monterAAppliquer(coquille);
monterATrancher(coquille);
monterConfiguration(coquille);
monterFeuilles(coquille, monterRegles(coquille));

window.addEventListener('message', (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  const message = event.data?.pluginMessage;
  if (message) coquille.frontiere.recevoir(message);
});
