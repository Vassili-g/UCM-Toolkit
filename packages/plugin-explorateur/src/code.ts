/**
 * Point d'entrée du sandbox de l'explorateur : ouvre l'interface et route ses
 * demandes. Aucune route n'écrit dans le document. Afficher un calque change
 * la page courante, la sélection et la vue ; `clientStorage` reçoit la taille
 * de la fenêtre et les préférences.
 *
 * Figma ne signale pas les changements de variables sans charger toutes les
 * pages (`documentchange`) : le relevé se relit au geste « Actualiser ».
 */
import { CLE_RECETTE, ESPACE_PARTAGE } from 'ucm-couleur';

import { chercherLesConsommateurs, liaisonsDuNoeud, modesDuNoeud, type NoeudLu, type PortDesCalques } from './consommateurs';
import { TAILLE_PAR_DEFAUT, creerRedimensionnement, lireTaille } from './fenetre';
import { lireLeReleve, type PortDeLecture } from './lecture';
import type { CalqueSelectionne, PluginMessage, UiRequest } from './messages';
import { afficherCalque, valeursDeFigma } from './navigation';
import { creerPreferences } from './preferences';

const preferences = creerPreferences(figma.clientStorage);

figma.showUI(__html__, { themeColors: false, width: TAILLE_PAR_DEFAUT.largeur, height: TAILLE_PAR_DEFAUT.hauteur });
const fenetre = creerRedimensionnement((taille) => figma.ui.resize(taille.largeur, taille.hauteur));
fenetre.poser(TAILLE_PAR_DEFAUT);
void lireTaille().then(fenetre.poser);

function versUi(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

const portDeLecture = figma.variables as unknown as PortDeLecture;

const portDesCalques: PortDesCalques = {
  pageCourante: () => figma.currentPage as unknown as ReturnType<PortDesCalques['pageCourante']>,
  pages: () => figma.root.children as unknown as ReturnType<PortDesCalques['pages']>,
  selection: () => figma.currentPage.selection as unknown as readonly NoeudLu[],
  stylesLocaux: async () => {
    const [peintures, textes, effets, grilles] = await Promise.all([
      figma.getLocalPaintStylesAsync(),
      figma.getLocalTextStylesAsync(),
      figma.getLocalEffectStylesAsync(),
      figma.getLocalGridStylesAsync(),
    ]);
    return [...peintures, ...textes, ...effets, ...grilles] as unknown as Awaited<ReturnType<PortDesCalques['stylesLocaux']>>;
  },
  pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
};

/** La demande en cours de lecture ou d'analyse, et celles que l'interface a annulées. */
const annulees = new Set<number>();
let revision = 0;

async function lireReleve(demande: number): Promise<void> {
  try {
    const issue = await lireLeReleve(portDeLecture, figma.root.name, revision + 1, {
      annulee: () => annulees.has(demande),
      progression: (phase, fait, total) => versUi({ type: 'progression', demande, phase, fait, total }),
    }, () => Date.now());
    if (issue.statut === 'annule') {
      versUi({ type: 'annulation', demande });
      return;
    }
    revision += 1;
    versUi({ type: 'releve', demande, releve: issue.releve });
  } catch (erreur) {
    versUi({ type: 'lecture-echouee', demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
  } finally {
    annulees.delete(demande);
  }
}

function envoyerSelection(): void {
  const calques: CalqueSelectionne[] = [];
  for (const noeud of figma.currentPage.selection as unknown as readonly NoeudLu[]) {
    try {
      calques.push({ id: noeud.id, nom: noeud.name, type: noeud.type, modes: modesDuNoeud(noeud), liaisons: liaisonsDuNoeud(noeud) });
    } catch {
      calques.push({ id: noeud.id, nom: noeud.name, type: noeud.type, modes: {}, liaisons: [] });
    }
  }
  versUi({ type: 'selection', page: figma.currentPage.id, calques });
}

async function traiterMessage(message: UiRequest): Promise<void> {
  switch (message.type) {
    case 'lire-preferences':
      versUi({ type: 'preferences', preferences: await preferences.lire() });
      envoyerSelection();
      return;
    case 'ranger-preferences':
      versUi({ type: 'preferences-rangees', reussie: await preferences.ranger(message.preferences) });
      return;
    case 'lire-releve':
      await lireReleve(message.demande);
      return;
    case 'annuler':
      annulees.add(message.demande);
      return;
    case 'chercher-consommateurs': {
      const demande = message.demande;
      const issue = await chercherLesConsommateurs(portDesCalques, message.perimetre, {
        annulee: () => annulees.has(demande),
        progression: (fait, total) => versUi({ type: 'progression', demande, phase: 'calques', fait, total }),
      });
      annulees.delete(demande);
      versUi(issue.statut === 'annule' ? { type: 'annulation', demande } : { type: 'consommateurs', demande, resultat: issue.resultat });
      return;
    }
    case 'afficher-calque': {
      const issue = await afficherCalque({
        getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) as never,
        montrer: async (page, calque) => {
          await figma.setCurrentPageAsync(page as unknown as PageNode);
          figma.currentPage.selection = [calque as unknown as SceneNode];
          figma.viewport.scrollAndZoomIntoView([calque as unknown as SceneNode]);
        },
      }, message.calque);
      versUi({ type: 'calque-affiche', demande: message.demande, calque: message.calque, issue });
      return;
    }
    case 'verifier-sur-calque':
      versUi({
        type: 'valeurs-de-figma',
        demande: message.demande,
        calque: message.calque,
        valeurs: await valeursDeFigma({ getVariableByIdAsync: (id) => figma.variables.getVariableByIdAsync(id) as never, getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) }, message.calque, message.variables),
      });
      return;
    case 'lire-recette-palettes':
      versUi({ type: 'recette-palettes', demande: message.demande, texte: figma.root.getSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE) });
      return;
    case 'resize':
      await fenetre.demander(message);
      return;
  }
}

figma.on('selectionchange', envoyerSelection);
figma.on('currentpagechange', envoyerSelection);

figma.ui.onmessage = async (message: UiRequest) => {
  if (!message || typeof message.type !== 'string') return;
  try {
    await traiterMessage(message);
  } catch (erreur) {
    if ('demande' in message && typeof message.demande === 'number') {
      versUi({ type: 'lecture-echouee', demande: message.demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  }
};
