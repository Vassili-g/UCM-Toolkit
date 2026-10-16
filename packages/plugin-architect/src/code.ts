/** Le sandbox ouvre la fenêtre et ne route que l'analyse et sa taille. */
import { creerPortDeLecture } from './lectureFigma';
import { creerRoutage } from './routage';
import { BORNES, creerRedimensionnement, lireTaille } from './fenetre';
import { estUiMessage, type PluginMessage } from './messages';
declare const __html__: string;

figma.showUI(__html__, { width: BORNES.defaut.largeur, height: BORNES.defaut.hauteur, themeColors: true });
const redimensionnement = creerRedimensionnement(({ largeur, hauteur }) => figma.ui.resize(largeur, hauteur));
void lireTaille().then((taille) => redimensionnement.poser(taille)).catch(() => redimensionnement.poser(BORNES.defaut));
const envoyer = (message: PluginMessage) => figma.ui.postMessage(message);
const analyser = creerRoutage({ lecture: creerPortDeLecture(figma), pause: () => new Promise((resolve) => setTimeout(resolve, 0)), envoyer });
figma.ui.onmessage = (brut: unknown) => {
  if (!estUiMessage(brut)) return;
  if (brut.type === 'resize') void redimensionnement.demander(brut);
  else void analyser(brut.demande);
};
envoyer({ type: 'initial' });
