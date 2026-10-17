/** L'écran d'UCM Architect : un titre et la poignée de redimensionnement, en attendant les onglets. */
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { PluginMessage, UiMessage } from '../messages';
import { TEXTES } from './textes';

const app = document.getElementById('app');
if (!app) throw new Error('Élément app absent');
const envoyer = (message: UiMessage) => parent.postMessage({ pluginMessage: message }, '*');

const titre = document.createElement('h1');
titre.textContent = TEXTES.marque;
app.append(titre, createResizeGrip(envoyer));
window.addEventListener('message', (_event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {});
