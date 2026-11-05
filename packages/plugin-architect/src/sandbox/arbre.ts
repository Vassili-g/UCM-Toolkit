/** Le domaine `arbre` : la lecture du relevé des variables et son annulation. */
import { espaceDuProfil } from '@ucm-kit/core/format';

import { compterLesAppelsDuPort, lireLeReleveAcquis, lireLeVocabulaire, mesurerUnePhaseDeTokens } from '../lecture';
import type { DemandeDArbre } from '../messages/arbre';
import { commencerUneAcquisition } from './acquisition';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture } from './lectureDeFigma';

export const TYPES: readonly DemandeDArbre['type'][] = ['lire-releve', 'annuler'];

/** Les demandes que l'interface a annulées, lectures du relevé et du composant confondues. */
export const annulees = new Set<number>();
let revision = 0;

async function lireReleve(demande: number, { figma, envoyer }: Contexte): Promise<void> {
  // L'acquisition s'ouvre avant la première lecture : une demande de Nomenclature qui arrive pendant le relevé reprend ses locales.
  const acquisition = commencerUneAcquisition();
  try {
    const issue = await mesurerUnePhaseDeTokens('lire-releve', (appels) => lireLeReleveAcquis(compterLesAppelsDuPort(portDeLecture(figma), appels), figma.root.name, revision + 1, {
      annulee: () => annulees.has(demande),
      progression: (phase, fait, total) => envoyer({ type: 'progression', demande, phase, fait, total }),
    }, () => Date.now(), espaceDuProfil(figma.root.documentColorProfile), (locales) => acquisition.offrirLesLocales(locales)), Date.now, demande);
    if (issue.statut === 'annule') {
      acquisition.annuler();
      envoyer({ type: 'annulation', demande });
      return;
    }
    revision += 1;
    const vocabulaire = lireLeVocabulaire(figma.root);
    acquisition.conclure({ revision, luA: issue.releve.luA, lues: issue.lues, idsLocaux: issue.idsLocaux });
    envoyer({ type: 'releve', demande, releve: vocabulaire ? { ...issue.releve, vocabulaire } : issue.releve });
  } catch (erreur) {
    acquisition.echouer();
    envoyer({ type: 'lecture-echouee', demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
  } finally {
    annulees.delete(demande);
  }
}

export const traiter: Traiter<DemandeDArbre> = async (demande, contexte) => {
  switch (demande.type) {
    case 'lire-releve':
      await lireReleve(demande.demande, contexte);
      return;
    case 'annuler':
      annulees.add(demande.demande);
      return;
  }
};
