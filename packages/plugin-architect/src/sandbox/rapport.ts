/**
 * Le domaine `rapport` : la description du composant que le designer joint à un signalement.
 *
 * `preparer-le-rapport` lit le nœud du sujet et sa page, puis rend sa capture (`capturerLeComposant`) en JSON, sans les
 * imports de library que l'analyse a faits. Lecture seule : rien ne s'écrit dans le document. Un nœud absent ou dont la lecture
 * lève rend `rapport-echoue`. La capture porte des données du document : elle part
 * vers l'interface, qui la propose en téléchargement, et nulle part ailleurs.
 */
import type { DemandeDeRapport } from '../messages/rapport';
import { pageDuNoeud } from './analyse';
import { capturerLeComposant } from './capture';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDeRapport['type'][] = ['preparer-le-rapport'];

async function preparer(demande: number, sujet: string, { figma, envoyer }: Contexte): Promise<void> {
  try {
    const noeud = await figma.getNodeByIdAsync(sujet);
    if (noeud === null) {
      envoyer({ type: 'rapport-echoue', demande });
      return;
    }
    // Un variant se capture avec son jeu, comme l'analyse le lit.
    const jeu = noeud.type === 'COMPONENT' && noeud.parent?.type === 'COMPONENT_SET' ? noeud.parent : noeud;
    const page = pageDuNoeud<PageNode>(jeu, figma.currentPage);
    const capture = await capturerLeComposant(figma, { jeu, page, imports: null });
    envoyer({ type: 'rapport-pret', demande, capture: JSON.stringify(capture) });
  } catch {
    envoyer({ type: 'rapport-echoue', demande });
  }
}

export const traiter: Traiter<DemandeDeRapport> = async (demande, contexte) => {
  await preparer(demande.demande, demande.sujet, contexte);
};
