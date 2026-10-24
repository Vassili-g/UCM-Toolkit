/**
 * Ce que `code.ts` donne à chaque domaine du sandbox : l'API Figma, l'envoi
 * vers l'interface et l'abonnement tardif aux changements de la page.
 * Un domaine range son état dans son propre module.
 */
import type { PluginMessage } from '../messages';

export interface Contexte {
  readonly figma: PluginAPI;
  /** Le seul chemin d'envoi vers l'interface. */
  envoyer(message: PluginMessage): void;
  /**
   * Abonne le sandbox aux changements de la page courante et, quand elle diffère,
   * de `page`, celle du sujet de l'analyse ; l'abonnement attend la première analyse.
   */
  surveillerLeDocument(page?: PageNode): void;
}

/** Ce que le suivi demande à une page : `PageNode` en production, un double en test. */
export interface PageSuivable<E = NodeChangeEvent> {
  on(type: 'nodechange', rappel: (evenement: E) => void): void;
  off(type: 'nodechange', rappel: (evenement: E) => void): void;
}

export interface SuiviDesPages<P> {
  /** Première analyse ou nouvelle analyse : la page courante et `page` (celle du sujet, si elle diffère). */
  surveiller(page?: P): void;
  /** La page courante a changé : on la suit, et on quitte celle qui n'est plus ni courante ni celle du sujet. */
  recalculer(): void;
}

/**
 * Une écoute `nodechange` par page, sur la page courante et sur la page du
 * sujet de l'analyse. `page.on` lève sur une page non chargée (accès dynamique) ;
 * la loi d'écriture interdit `loadAsync` hors de `ecriture/` : une telle page
 * n'est pas suivie, et un changement de son maître n'atteint pas l'analyse.
 */
export function creerLeSuivi<P extends PageSuivable>(courante: () => P, rappel: (evenement: NodeChangeEvent) => void): SuiviDesPages<P> {
  let actif = false;
  let sujet: P | undefined;
  const ecoutees = new Set<P>();

  function recalculer(): void {
    if (!actif) return;
    const voulues = new Set<P>([courante()]);
    if (sujet !== undefined) voulues.add(sujet);
    for (const page of [...ecoutees]) {
      if (voulues.has(page)) continue;
      ecoutees.delete(page);
      try { page.off('nodechange', rappel); } catch { /* page déchargée ou supprimée */ }
    }
    for (const page of voulues) {
      if (ecoutees.has(page)) continue;
      try {
        page.on('nodechange', rappel);
        ecoutees.add(page);
      } catch { /* page non chargée : voir la limite ci-dessus */ }
    }
  }

  return {
    surveiller(page) {
      actif = true;
      sujet = page;
      recalculer();
    },
    recalculer,
  };
}

/** Le traitement d'un domaine : une demande de son type, un contexte. */
export type Traiter<Demande> = (demande: Demande, contexte: Contexte) => Promise<void>;
