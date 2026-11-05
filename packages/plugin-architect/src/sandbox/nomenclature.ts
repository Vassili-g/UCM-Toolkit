/**
 * Le domaine `nomenclature` : le sandbox confie les demandes de l'écran des
 * noms à la session. Il ne s'ouvre ni ne se redimensionne : la fenêtre est celle
 * d'Architect (`commun`).
 */
import { creerPortDeRegles, creerPortEcriture } from '../ecriture/noms';
import { estUiMessage, type DemandeDeNomenclature } from '../messages/nomenclature';
import { creerPortDistant, type PortDistantDuSandbox } from '../nomenclature/distant';
import { creerPortDeLecture } from '../nomenclature/lectureFigma';
import { creerSession, fichierDejaAnalyse, type Session } from '../nomenclature/session';
import { attendreLesLocalesEnCours, reperDesLectures } from './acquisition';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDeNomenclature['type'][] = [
  'noms-analyser', 'lignes', 'termes', 'fiche', 'noms-selection', 'diagnostic', 'simuler', 'noms-repondre',
  'regle', 'appliquer', 'annuler-dernier', 'exporter', 'importer', 'configurer',
  'noms-calcules', 'noms-non-calcules',
];

let session: Session | null = null;
let calculDistant: PortDistantDuSandbox | null = null;

/** Le port du calcul hors du sandbox : l'entrée part à l'interface, dont le Worker rend le bilan. La révision est le repère des lectures de variables. */
function leCalculDistant({ envoyer }: Contexte): PortDistantDuSandbox {
  calculDistant ??= creerPortDistant({ envoyer, revision: reperDesLectures });
  return calculDistant;
}

/**
 * Le port que les contrôles de structure partagent avec Nomenclature (`nomenclature/controlesDistants.ts`) : l'écran renvoie toutes les
 * réponses du Worker sous les mêmes types, que `traiter` range auprès de ce seul port.
 */
export const portDuCalculDistant = leCalculDistant;

function laSession(contexte: Contexte): Session {
  const { figma, envoyer } = contexte;
  session ??= creerSession({
    port: { lecture: creerPortDeLecture(figma, attendreLesLocalesEnCours), ecriture: creerPortEcriture(figma), regles: creerPortDeRegles(figma) },
    envoyer,
    calcul: leCalculDistant(contexte),
  });
  return session;
}

/** Dit à l'écran des noms si le fichier a déjà reçu une écriture : il s'ouvre alors sur le travail. */
export function annoncerLOuverture(contexte: Contexte): void {
  contexte.envoyer({ type: 'initial', dejaAnalyse: fichierDejaAnalyse(creerPortDeRegles(contexte.figma)) });
}

export const traiter: Traiter<DemandeDeNomenclature> = async (demande, contexte) => {
  if (!estUiMessage(demande)) return;
  // La réponse du Worker n'entre pas dans la file de la session : celle-ci attend justement cette réponse.
  if (demande.type === 'noms-calcules' || demande.type === 'noms-non-calcules') {
    leCalculDistant(contexte).recevoir(demande);
    return;
  }
  await laSession(contexte).recevoir(demande);
};
