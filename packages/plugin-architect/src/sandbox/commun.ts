/**
 * Le domaine `commun` : ce qui ne dépend d'aucun autre domaine. Les
 * préférences, la fenêtre et son mode (Tokens ou Composant), la sélection et
 * la déclaration UCM du fichier.
 *
 * Le sandbox s'ouvre en mode Composant quand la sélection a un sujet, en mode
 * Tokens sinon. `clientStorage` reçoit la taille de chaque mode et les
 * préférences, jamais le document.
 */
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, lireLArchitectureDuFichier, type ArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { creerRedimensionnement, lireTaille, tailleValide, type Disposition } from '../fenetre';
import { sujetDeLaSelection } from '../lectureDuComposant';
import type { DemandeDeCommun, SujetSelectionne } from '../messages/commun';
import { creerPreferences } from '../preferences';
import type { Contexte, Traiter } from './contexte';
import { selectionLue } from './lectureDeFigma';

export const TYPES: readonly DemandeDeCommun['type'][] = ['lire-preferences', 'ranger-preferences', 'changer-disposition', 'resize'];

/** Le mode d'ouverture : Composant quand la sélection a un sujet, Tokens sinon. */
export function dispositionDeLOuverture(sujet: SujetSelectionne | null): Disposition {
  return sujet === null ? 'large' : 'etroite';
}

let disposition: Disposition = 'large';
let fenetre: ReturnType<typeof creerRedimensionnement> | null = null;
let ouverture: Promise<Disposition> = Promise.resolve('large');

/** Le sujet de la sélection courante ; `null` quand elle n'en a pas ou que ses ancêtres ne se lisent pas. */
export function sujetDeLaSelectionCourante(figma: PluginAPI): { sujet: SujetSelectionne | null; ignores: number } {
  try {
    return sujetDeLaSelection(selectionLue(figma));
  } catch {
    return { sujet: null, ignores: 0 };
  }
}

async function poserLaTaille(): Promise<void> {
  try {
    fenetre?.poser(await lireTaille(disposition));
  } catch {
    fenetre?.poser(tailleValide(undefined, disposition));
  }
}

/**
 * Choisit le mode d'ouverture, donne à la fenêtre sa taille, puis l'affiche.
 * `code.ts` l'appelle une fois, après `showUI` en `visible: false`.
 */
export function ouvrirLaFenetre({ figma }: Contexte): Promise<Disposition> {
  fenetre = creerRedimensionnement((taille) => figma.ui.resize(taille.largeur, taille.hauteur), () => disposition);
  ouverture = (async () => {
    disposition = dispositionDeLOuverture(sujetDeLaSelectionCourante(figma).sujet);
    await poserLaTaille();
    figma.ui.show();
    return disposition;
  })();
  return ouverture;
}

/**
 * Les nœuds que le plugin vient de sélectionner. Le `selectionchange` qui suit
 * porte `origine: 'plugin'` ; tout autre changement porte `'figma'`.
 */
let selectionDuPlugin: readonly string[] | null = null;

export function retenirLaSelectionDuPlugin(ids: readonly string[]): void {
  selectionDuPlugin = [...ids];
}

/** Qui a posé la sélection `ids` : le plugin si elle est celle qu'il vient de poser, une seule fois. */
export function origineDeLaSelection(ids: readonly string[]): 'plugin' | 'figma' {
  const retenue = selectionDuPlugin;
  selectionDuPlugin = null;
  if (retenue === null || retenue.length !== ids.length) return 'figma';
  const posee = new Set(retenue);
  return ids.every((id) => posee.has(id)) ? 'plugin' : 'figma';
}

/** Envoie la sélection à l'interface et rend ce qu'elle désigne, pour les règles de péremption. */
export function envoyerLaSelection(contexte: Contexte): { sujetId: string | null; origine: 'plugin' | 'figma' } {
  const { figma } = contexte;
  const trouve = sujetDeLaSelectionCourante(figma);
  let ids: string[] = [];
  try {
    ids = selectionLue(figma).map((noeud) => noeud.id);
  } catch {
    // Une sélection illisible ne se compare à rien : elle vient de Figma.
  }
  const origine = origineDeLaSelection(ids);
  contexte.envoyer({ type: 'selection', ...trouve, origine });
  return { sujetId: trouve.sujet?.id ?? null, origine };
}

let derniereDeclaration: ArchitectureDuFichier | null = null;

/** La déclaration UCM du fichier, relue à chaque appel. */
export function lireLaDeclaration(figma: PluginAPI): ArchitectureDuFichier {
  return lireLArchitectureDuFichier(figma.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER));
}

/** Envoie la déclaration quand elle a changé depuis le dernier envoi ; `forcer` l'envoie toujours (ouverture). */
export function declarer(contexte: Contexte, forcer = false): void {
  const architecture = lireLaDeclaration(contexte.figma);
  if (!forcer && architecture === derniereDeclaration) return;
  derniereDeclaration = architecture;
  contexte.envoyer({ type: 'declaration', architecture });
}

const preferences = (figma: PluginAPI) => creerPreferences(figma.clientStorage);

export const traiter: Traiter<DemandeDeCommun> = async (demande, contexte) => {
  switch (demande.type) {
    case 'lire-preferences':
      contexte.envoyer({ type: 'preferences', preferences: await preferences(contexte.figma).lire() });
      contexte.envoyer({ type: 'disposition', disposition: await ouverture });
      envoyerLaSelection(contexte);
      declarer(contexte, true);
      return;
    case 'ranger-preferences':
      contexte.envoyer({ type: 'preferences-rangees', reussie: await preferences(contexte.figma).ranger(demande.preferences) });
      return;
    case 'changer-disposition':
      await ouverture;
      disposition = demande.disposition;
      await poserLaTaille();
      contexte.envoyer({ type: 'disposition', disposition });
      return;
    case 'resize':
      await fenetre?.demander(demande);
      return;
  }
};
