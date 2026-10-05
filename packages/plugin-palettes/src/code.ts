/**
 * Point d'entrée du sandbox d'UCM Palettes : ouvre l'interface, lit l'état du
 * fichier et route les demandes de l'interface.
 *
 * Le routage n'a qu'une porte par geste d'écriture ([ARC-14]) : « ranger la
 * recette », « dessiner », « retirer un cadre », « choisir la page »,
 * « écrire les variables », « ranger la destination », « retirer les
 * variables », « reprendre une palette » et « copier une palette ».
 */
import { choisirLaPage, dessinerLaRecetteRangee, retirerLeCadre } from './ecriture/planche';
import { rangerRecette } from './ecriture/recette';
import { copierLaPalette, ecrireLesVariables, rangerLaDestination, reprendreLaPalette, retirerLesVariables } from './ecriture/variables';
import { TAILLE_PAR_DEFAUT, creerRedimensionnement, lireTaille } from './fenetre';
import { lireEtat, lireLaPlanche } from './lecture';
import { lireLesBibliotheques, lireLesVariablesDuFichier } from './lectureDesVariables';
import type { PluginMessage, UiRequest } from './messages';
import { voirSurLaPlanche } from './navigation';
import { creerPreferences } from './preferences';
import { creerFileDuDocument } from './fileDuDocument';
import type { Bibliotheques } from './variables/bibliotheques';

const preferences = creerPreferences(figma.clientStorage);
const dansLeDocument = creerFileDuDocument();

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

/**
 * Les collections des bibliothèques activées ([VAR-14]). Figma les rend par
 * une lecture par collection : elles se lisent au premier état, puis à
 * « Synchroniser », et le sandbox les garde entre deux.
 */
let bibliotheques: Bibliotheques | null = null;

async function envoyerEtat(demande: number, toutesLesPages: boolean): Promise<void> {
  if (bibliotheques === null || toutesLesPages) bibliotheques = await lireLesBibliotheques(figma);
  versUi({ type: 'etat', demande, ...lireEtat(figma.root), planche: await lireLaPlanche(figma, toutesLesPages), variables: await lireLesVariablesDuFichier(figma, bibliotheques) });
}

async function traiterMessage(message: UiRequest): Promise<void> {
  if (message.type === 'lire-langue') {
    versUi({ type: 'langue', langue: await preferences.lire(), sections: await preferences.lireLesSections() });
    return;
  }
  if (message.type === 'ranger-langue') {
    versUi({ type: 'langue-rangee', selection: message.selection, reussie: await preferences.ranger(message.langue) });
    return;
  }
  if (message.type === 'ranger-sections') {
    await preferences.rangerLesSections(message.sections);
    return;
  }
  if (message.type === 'lire-etat') {
    try {
      await envoyerEtat(message.demande, message.recherche === 'fichier');
    } catch (erreur) {
      versUi({ type: 'etat-refuse', demande: message.demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
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

  if (message.type === 'choisir-page') {
    versUi({ type: 'page-choisie', demande: message.demande, issue: await choisirLaPage(figma, message) });
    return;
  }

  if (message.type === 'ecrire-variables') {
    versUi({ type: 'variables-ecrites', demande: message.demande, resultat: await ecrireLesVariables(figma, message) });
    return;
  }

  if (message.type === 'ranger-destination') {
    versUi({ type: 'destination-rangee', demande: message.demande, issue: await rangerLaDestination(figma, message.destination) });
    return;
  }

  if (message.type === 'retirer-variables') {
    versUi({ type: 'variables-retirees', demande: message.demande, issue: await retirerLesVariables(figma, message) });
    return;
  }

  if (message.type === 'reprendre-palette') {
    versUi({ type: 'reprise', demande: message.demande, issue: await reprendreLaPalette(figma, message) });
    return;
  }

  if (message.type === 'copier-palette') {
    versUi({ type: 'copie', demande: message.demande, issue: await copierLaPalette(figma, message) });
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
  if ('demande' in message) await dansLeDocument(() => traiterMessage(message));
  else await traiterMessage(message);
};
