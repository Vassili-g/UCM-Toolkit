/**
 * Les messages de la palette ouverte. L'onglet Création en lit deux parts :
 * les points à vérifier et les informations de la liste, et les alertes qui
 * comparent les intensités, près du réglage d'intensité ([VER-10],
 * [VER-11]). L'onglet Vérification et le pied de Création lisent la liste
 * entière, promesses manquées comprises ([VER-18]).
 */
import { ORDRE_DES_SEVERITES, severiteDeLAlerte, type Palette } from 'ucm-couleur';

import type { AnalyseDePalette } from '../analyse';
import { ciblesDeLAlerte, ciblesDeLaPromesse, groupesManques, placeDeLAlerte } from '../presentation';
import type { Message } from './constats';
import { memoriserVues, type Localisation } from './localisation';
import { type ContexteDAlerte } from './textes';

export interface MessagesDeLaPalette {
  /** Points à vérifier, puis informations. */
  readonly liste: readonly Message[];
  /** Les alertes qui se lisent près du réglage d'intensité. */
  readonly intensite: readonly Message[];
}

function construireVues(i18n: Localisation) {
  const { constatDAlerte, constatDeGroupe, nomDeLaPalette } = i18n.messages;

  function messagesDeLaPalette(
    analyse: AnalyseDePalette,
    palette: Palette,
    contexte: ContexteDAlerte,
  ): MessagesDeLaPalette {
    const alertes = analyse.alertes.map((alerte) => ({
      place: placeDeLAlerte(alerte),
      message: {
        severite: severiteDeLAlerte(alerte),
        constat: constatDAlerte(alerte, contexte),
        cibles: ciblesDeLAlerte(alerte),
        compte: 1,
      } satisfies Message,
    }));
    const liste = alertes.filter(({ place }) => place === 'liste').map(({ message }) => message);
    return {
      liste: [...liste.filter((message) => message.severite === 'alerte'), ...liste.filter((message) => message.severite === 'notice')],
      intensite: alertes.filter(({ place }) => place === 'intensite').map(({ message }) => message),
    };
  }

  /**
   * Tous les messages de la palette, dans l'ordre des sévérités : chaque
   * groupe de promesses manquées, puis les alertes, puis les informations
   * ([VER-14]).
   */
  function tousLesMessages(analyse: AnalyseDePalette, palette: Palette, contexte: ContexteDAlerte): Message[] {
    const nom = nomDeLaPalette(palette);
    const promesses: Message[] = groupesManques(analyse.promesses).map((groupe) => ({
      severite: 'promesse',
      constat: constatDeGroupe(groupe, nom),
      cibles: ciblesDeLaPromesse(),
      compte: groupe.manquees,
    }));
    const { liste, intensite } = messagesDeLaPalette(analyse, palette, contexte);
    const rang = (message: Message) => ORDRE_DES_SEVERITES.indexOf(message.severite);
    return [...promesses, ...liste, ...intensite].sort((a, b) => rang(a) - rang(b));
  }

  return { messagesDeLaPalette, tousLesMessages };
}

export const creerVuesMessagesDePalette = memoriserVues(construireVues);
