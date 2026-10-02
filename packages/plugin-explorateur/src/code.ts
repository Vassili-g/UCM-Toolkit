/**
 * Point d'entrée du sandbox de l'explorateur : ouvre l'interface et route ses
 * demandes. Aucune route n'écrit dans le document. `clientStorage` reçoit la
 * taille de la fenêtre et les préférences. L'aperçu d'un composant s'exporte
 * en mémoire.
 *
 * Figma ne signale pas les changements de variables sans charger toutes les
 * pages (`documentchange`) : le relevé se relit au geste « Actualiser ».
 */
import { CLE_RECETTE, ESPACE_PARTAGE } from 'ucm-couleur';

import { exporterLApercu } from './apercu';
import type { NoeudLu, StyleLu } from './consommateurs';
import { TAILLE_PAR_DEFAUT, creerRedimensionnement, lireTaille, tailleValide, type Disposition } from './fenetre';
import { lireLeReleve, type PortDeLecture } from './lecture';
import { lireLeComposant, sujetDeLaSelection, type PortDuComposant } from './lectureDuComposant';
import type { PluginMessage, UiRequest } from './messages';
import { creerPreferences } from './preferences';

const preferences = creerPreferences(figma.clientStorage);

let disposition: Disposition = 'large';
figma.showUI(__html__, { themeColors: false, visible: false, width: TAILLE_PAR_DEFAUT.largeur, height: TAILLE_PAR_DEFAUT.hauteur });
const fenetre = creerRedimensionnement((taille) => figma.ui.resize(taille.largeur, taille.hauteur), () => disposition);

/**
 * La disposition se choisit avant d'afficher la fenêtre : étroite dans un
 * fichier sans variable locale, où l'arbre et la table seraient vides. Une
 * lecture qui lève garde la disposition large.
 */
const ouverture: Promise<Disposition> = (async () => {
  try {
    disposition = (await figma.variables.getLocalVariablesAsync()).length === 0 ? 'etroite' : 'large';
  } catch {
    disposition = 'large';
  }
  try {
    fenetre.poser(await lireTaille(disposition));
  } catch {
    fenetre.poser(tailleValide(undefined, disposition));
  }
  figma.ui.show();
  return disposition;
})();

function versUi(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

const portDeLecture = figma.variables as unknown as PortDeLecture;
const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const selection = (): readonly NoeudLu[] => figma.currentPage.selection as unknown as readonly NoeudLu[];

const portDuComposant: PortDuComposant = {
  selection,
  getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) as unknown as Promise<NoeudLu | null>,
  getStyleByIdAsync: (id) => figma.getStyleByIdAsync(id) as unknown as Promise<StyleLu | null>,
  variables: portDeLecture,
  pause,
};

/** Les demandes que l'interface a annulées. */
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

/**
 * Lit le composant de la sélection, ou celui du calque demandé, puis envoie
 * son image. L'image part après la liste : la vue affiche les tokens sans
 * l'attendre.
 */
async function lireComposant(demande: number, calque: string | null): Promise<void> {
  const annulee = (): boolean => annulees.has(demande);
  try {
    const depart = calque === null ? selection()[0] ?? null : await portDuComposant.getNodeByIdAsync(calque);
    const issue = depart ? await lireLeComposant(portDuComposant, depart, { annulee }, () => Date.now()) : ({ statut: 'sans-sujet' } as const);
    if (issue.statut === 'annule') {
      versUi({ type: 'annulation', demande });
      return;
    }
    if (issue.statut === 'sans-sujet') {
      versUi({ type: 'composant', demande, lecture: null });
      return;
    }
    versUi({ type: 'composant', demande, lecture: issue.lecture });
    const apercu = await exporterLApercu({ getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) as never }, issue.lecture.calques[0].id);
    if (apercu && !annulee()) versUi({ type: 'apercu-du-composant', demande, sujet: issue.lecture.sujet.id, ...apercu });
  } catch (erreur) {
    versUi({ type: 'lecture-echouee', demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
  } finally {
    annulees.delete(demande);
  }
}

function envoyerSelection(): void {
  let sujet: ReturnType<typeof sujetDeLaSelection> = { sujet: null, ignores: 0 };
  try {
    sujet = sujetDeLaSelection(selection());
  } catch {
    // Un calque dont les ancêtres ne se lisent pas ne désigne aucun composant.
  }
  versUi({ type: 'selection', ...sujet });
}

/** Donne à la fenêtre la taille rangée pour la disposition demandée, puis l'annonce à l'interface. */
async function changerDeDisposition(demandee: Disposition): Promise<void> {
  disposition = demandee;
  try {
    fenetre.poser(await lireTaille(disposition));
  } catch {
    fenetre.poser(tailleValide(undefined, disposition));
  }
  versUi({ type: 'disposition', disposition });
}

async function traiterMessage(message: UiRequest): Promise<void> {
  switch (message.type) {
    case 'lire-preferences':
      versUi({ type: 'preferences', preferences: await preferences.lire() });
      versUi({ type: 'disposition', disposition: await ouverture });
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
    case 'lire-recette-palettes':
      versUi({ type: 'recette-palettes', demande: message.demande, texte: figma.root.getSharedPluginData(ESPACE_PARTAGE, CLE_RECETTE) });
      return;
    case 'lire-composant':
      await lireComposant(message.demande, message.calque);
      return;
    case 'changer-disposition':
      await ouverture;
      await changerDeDisposition(message.disposition);
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
