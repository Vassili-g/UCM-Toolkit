/** Cette vue de lecture expose l'avancement et le bilan du fichier. */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import { createResizeGrip } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { PluginMessage, UiMessage } from '../messages';
import { creerFrontiere } from './frontiere';

const app = document.getElementById('app');
if (!app) throw new Error('Élément app absent');
const marque = document.createElement('p');
marque.textContent = 'UCM Architect';
const titre = document.createElement('h1');
titre.textContent = 'Harmoniser les noms';
const bilan = document.createElement('p');
bilan.setAttribute('role', 'status');
const progression = document.createElement('progress');
progression.hidden = true;
const envoyer = (message: UiMessage) => parent.postMessage({ pluginMessage: message }, '*');
const bouton = createButton({ label: 'Analyser le fichier', onClick: () => {
  bouton.disabled = true;
  bilan.textContent = 'Lecture du fichier…';
  progression.hidden = false;
  progression.removeAttribute('value');
  frontiere.analyser();
} });
bouton.id = 'analyser';
const frontiere = creerFrontiere(envoyer, (message) => {
  app.dataset.etat = message.type;
  if (message.type === 'initial') return;
  if (message.type === 'lecture') {
    bouton.disabled = true;
    progression.hidden = false;
    progression.max = Math.max(1, message.avancement.totalPages);
    progression.value = message.avancement.pagesLues;
    bilan.textContent = message.avancement.phase === 'variables' ? 'Lecture des variables…' : `Lecture des pages : ${message.avancement.pagesLues} / ${message.avancement.totalPages}`;
    return;
  }
  progression.hidden = true;
  bouton.disabled = false;
  if (message.type === 'erreur') bilan.textContent = message.message;
  else if (message.type === 'application') bilan.textContent = message.resultat.statut === 'applique'
    ? `${message.resultat.renommages.length} noms modifiés`
    : 'Certains noms n’ont pas pu être modifiés. Vérifiez le résultat, puis relancez l’analyse.';
  else bilan.textContent = `${message.analyse.inventaire.entrees.length} noms analysés · ${message.analyse.normalisation.propositions.length} propositions · ${message.analyse.normalisation.collisions.length} collisions`;
});
app.dataset.etat = 'initial';
app.append(marque, titre, bouton, progression, bilan, createResizeGrip(envoyer));
window.addEventListener('message', (event: MessageEvent<{ pluginMessage?: PluginMessage }>) => {
  if (event.data?.pluginMessage) frontiere.recevoir(event.data.pluginMessage);
});
