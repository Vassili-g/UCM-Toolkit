/** Le domaine `composant` : la lecture du composant sélectionné et son aperçu. */
import { exporterLApercu } from '../apercu';
import type { NoeudLu, StyleLu } from '../consommateurs';
import { lireLeComposant, type PortDuComposant } from '../lectureDuComposant';
import type { DemandeDeComposant } from '../messages/composant';
import { annulees } from './arbre';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture, selectionLue } from './lectureDeFigma';

export const TYPES: readonly DemandeDeComposant['type'][] = ['lire-composant'];

function portDuComposant({ figma }: Contexte): PortDuComposant {
  return {
    selection: () => selectionLue(figma),
    getNodeByIdAsync: (id) => figma.getNodeByIdAsync(id) as unknown as Promise<NoeudLu | null>,
    getStyleByIdAsync: (id) => figma.getStyleByIdAsync(id) as unknown as Promise<StyleLu | null>,
    variables: portDeLecture(figma),
    pause: () => new Promise((resolve) => setTimeout(resolve, 0)),
  };
}

/**
 * Lit le composant de la sélection, ou celui du calque demandé, puis envoie
 * son image. L'image part après la liste : la vue affiche les tokens sans
 * l'attendre.
 */
export const traiter: Traiter<DemandeDeComposant> = async (demande, contexte) => {
  const port = portDuComposant(contexte);
  const annulee = (): boolean => annulees.has(demande.demande);
  try {
    const depart = demande.calque === null ? port.selection()[0] ?? null : await port.getNodeByIdAsync(demande.calque);
    const issue = depart ? await lireLeComposant(port, depart, { annulee }, () => Date.now()) : ({ statut: 'sans-sujet' } as const);
    if (issue.statut === 'annule') {
      contexte.envoyer({ type: 'annulation', demande: demande.demande });
      return;
    }
    if (issue.statut === 'sans-sujet') {
      contexte.envoyer({ type: 'composant', demande: demande.demande, lecture: null });
      return;
    }
    contexte.envoyer({ type: 'composant', demande: demande.demande, lecture: issue.lecture });
    const apercu = await exporterLApercu({ getNodeByIdAsync: (id) => contexte.figma.getNodeByIdAsync(id) as never }, issue.lecture.calques[0].id);
    if (apercu && !annulee()) contexte.envoyer({ type: 'apercu-du-composant', demande: demande.demande, sujet: issue.lecture.sujet.id, ...apercu });
  } catch (erreur) {
    contexte.envoyer({ type: 'lecture-echouee', demande: demande.demande, message: erreur instanceof Error ? erreur.message : String(erreur) });
  } finally {
    annulees.delete(demande.demande);
  }
};
