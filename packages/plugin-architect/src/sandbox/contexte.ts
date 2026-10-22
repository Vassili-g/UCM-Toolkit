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
  /** Abonne le sandbox aux changements de la page courante ; l'abonnement attend la première analyse. */
  surveillerLeDocument(): void;
}

/** Le traitement d'un domaine : une demande de son type, un contexte. */
export type Traiter<Demande> = (demande: Demande, contexte: Contexte) => Promise<void>;
