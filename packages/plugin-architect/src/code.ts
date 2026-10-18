/** Le sandbox ouvre la fenêtre, route sa taille et confie les demandes de l'écran à la session. */
import { creerPortDeRegles, creerPortEcriture } from './ecriture';
import { BORNES, creerRedimensionnement, lireTaille } from './fenetre';
import { creerPortDeLecture } from './lectureFigma';
import { estUiMessage, type PluginMessage } from './messages';
import { creerSession, fichierDejaAnalyse } from './session';
declare const __html__: string;

figma.showUI(__html__, { width: BORNES.defaut.largeur, height: BORNES.defaut.hauteur, themeColors: true });
const redimensionnement = creerRedimensionnement(({ largeur, hauteur }) => figma.ui.resize(largeur, hauteur));
void lireTaille().then((taille) => redimensionnement.poser(taille)).catch(() => redimensionnement.poser(BORNES.defaut));
const envoyer = (message: PluginMessage) => figma.ui.postMessage(message);
const regles = creerPortDeRegles(figma);
const session = creerSession({
  port: { lecture: creerPortDeLecture(figma), ecriture: creerPortEcriture(figma), regles },
  envoyer,
});
figma.ui.onmessage = (brut: unknown) => {
  if (!estUiMessage(brut)) return;
  if (brut.type === 'resize') void redimensionnement.demander(brut);
  else void session.recevoir(brut);
};
envoyer({ type: 'initial', dejaAnalyse: fichierDejaAnalyse(regles) });
