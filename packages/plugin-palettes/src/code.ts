/**
 * Point d'entrée du sandbox d'UCM Palettes : ouvre l'interface, lit l'état du
 * fichier et route les demandes de l'interface.
 *
 * Le routage n'a qu'une porte par geste d'écriture ([ARC-14]) : « ranger la
 * recette », « dessiner » et « retirer un cadre ».
 */
import { dessinerLaRecetteRangee, retirerLeCadre } from './ecriture/planche';
import { rangerRecette } from './ecriture/recette';
import { TAILLE_PAR_DEFAUT, creerRedimensionnement, lireTaille } from './fenetre';
import { lireEtat, lireLaPlanche } from './lecture';
import type { PluginMessage, UiRequest } from './messages';
import { voirSurLaPlanche } from './navigation';
import { creerPreferences } from './preferences';

const preferences = creerPreferences(figma.clientStorage);

/*
 * `showUI` part tout de suite à la taille par défaut, puis la fenêtre reprend
 * la taille rangée : `clientStorage` est asynchrone.
 */
figma.showUI(__html__, {
  themeColors: true,
  width: TAILLE_PAR_DEFAUT.largeur,
  height: TAILLE_PAR_DEFAUT.hauteur,
});
const fenetre = creerRedimensionnement((taille) => figma.ui.resize(taille.largeur, taille.hauteur));
fenetre.poser(TAILLE_PAR_DEFAUT);
void lireTaille().then(fenetre.poser);

/** Porte typée unique vers l'interface. */
function versUi(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

async function envoyerEtat(demande: number, toutesLesPages: boolean): Promise<void> {
  versUi({ type: 'etat', demande, ...lireEtat(figma.root), planche: await lireLaPlanche(figma, toutesLesPages) });
}

async function traiterMessage(message: UiRequest): Promise<void> {
  if (message.type === 'lire-langue') {
    versUi({ type: 'langue', langue: await preferences.lire() });
    return;
  }
  if (message.type === 'ranger-langue') {
    versUi({ type: 'langue-rangee', selection: message.selection, reussie: await preferences.ranger(message.langue) });
    return;
  }
  if (message.type === 'lire-etat') {
    await envoyerEtat(message.demande, message.recherche === 'fichier');
    return;
  }

  if (message.type === 'ranger-recette') {
    versUi({ type: 'rangement', demande: message.demande, issue: rangerRecette(figma, message.recette, message.empreinteLue) });
    return;
  }

  if (message.type === 'dessiner') {
    const resultat = await dessinerLaRecetteRangee(figma, message, (fait, total, nom) =>
      versUi({ type: 'progression', demande: message.demande, fait, total, nom }));
    versUi({ type: 'dessin', demande: message.demande, resultat });
    return;
  }

  if (message.type === 'retirer-cadre') {
    versUi({ type: 'retrait', demande: message.demande, issue: await retirerLeCadre(figma, message) });
    return;
  }

  if (message.type === 'voir-sur-la-planche') {
    await voirSurLaPlanche(figma, message.page, message.cadres);
    return;
  }

  if (message.type === 'resize') await fenetre.demander(message);
}

figma.ui.onmessage = async (message: UiRequest) => {
  if (!message || typeof message.type !== 'string') return;
  await traiterMessage(message);
};
