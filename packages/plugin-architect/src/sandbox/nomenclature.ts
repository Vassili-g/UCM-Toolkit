/**
 * Le domaine `nomenclature` : le sandbox confie les demandes de l'écran des
 * noms à la session. Il ne s'ouvre ni ne se redimensionne : la fenêtre est celle
 * d'Architect (`commun`).
 */
import { creerPortDeRegles, creerPortEcriture } from '../ecriture/noms';
import { estUiMessage, type DemandeDeNomenclature } from '../messages/nomenclature';
import { creerPortDeLecture } from '../nomenclature/lectureFigma';
import { creerSession, fichierDejaAnalyse, type Session } from '../nomenclature/session';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDeNomenclature['type'][] = [
  'noms-analyser', 'lignes', 'termes', 'fiche', 'noms-selection', 'diagnostic', 'simuler', 'noms-repondre',
  'regle', 'appliquer', 'annuler-dernier', 'exporter', 'importer', 'configurer',
];

let session: Session | null = null;

function laSession({ figma, envoyer }: Contexte): Session {
  session ??= creerSession({
    port: { lecture: creerPortDeLecture(figma), ecriture: creerPortEcriture(figma), regles: creerPortDeRegles(figma) },
    envoyer,
  });
  return session;
}

/** Dit à l'écran des noms si le fichier a déjà reçu une écriture : il s'ouvre alors sur le travail. */
export function annoncerLOuverture(contexte: Contexte): void {
  contexte.envoyer({ type: 'initial', dejaAnalyse: fichierDejaAnalyse(creerPortDeRegles(contexte.figma)) });
}

export const traiter: Traiter<DemandeDeNomenclature> = async (demande, contexte) => {
  if (!estUiMessage(demande)) return;
  await laSession(contexte).recevoir(demande);
};
