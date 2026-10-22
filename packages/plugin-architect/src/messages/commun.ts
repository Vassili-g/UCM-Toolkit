/**
 * Les messages qui traversent la frontière sandbox et interface, et ceux qui
 * ne dépendent d'aucun domaine : préférences, taille de la fenêtre,
 * disposition, sélection et déclaration UCM du fichier.
 *
 * Chaque domaine range ses messages dans `messages/<domaine>.ts`, et
 * `messages/index.ts` les réunit en `UiRequest` et `PluginMessage`. Le type
 * contraint les deux sens : les envois du sandbox par `contexte.envoyer`,
 * ceux de l'interface par `versSandbox` dans `ui/pont.ts`.
 *
 * `demande` numérote chaque demande de l'interface, d'un seul compteur. Une
 * réponse porte le numéro de la demande qui l'a produite ; l'interface ignore
 * celle d'une demande remplacée depuis. Les domaines d'analyse portent à la
 * place `analyse` (`IdentiteDAnalyse`).
 */
import type { ArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { Disposition } from '../fenetre';
import type { Preferences } from '../preferences';

/**
 * Ce qu'une analyse de composant est : `sujet` est la clé du jeu de variants
 * (`key` du `COMPONENT_SET`, ou du `COMPONENT` seul), `generation` augmente à
 * chaque `analyser`. L'interface ignore un message dont l'identité diffère de
 * la sienne.
 */
export interface IdentiteDAnalyse {
  readonly sujet: string;
  readonly generation: number;
}

/**
 * Un constat de l'analyse. Le protocole ne lit que son identifiant ; le lot
 * qui construit les contrôles fixe le reste de la forme.
 */
export interface Constat {
  readonly id: string;
}

/** Une correction proposée ou appliquée. Même réserve que `Constat`. */
export interface Correction {
  readonly id: string;
}

/** Une préparation de tokens. Même réserve que `Constat`. */
export interface Preparation {
  readonly id: string;
}

/** Le composant que la sélection désigne, et le calque sélectionné dans ce composant. */
export interface SujetSelectionne {
  readonly id: string;
  readonly portee: string;
}

/** Qui a changé la sélection : le plugin, au clic sur un constat, ou le designer dans Figma. */
export type OrigineDeSelection = 'plugin' | 'figma';

/** Ce que l'interface demande au sandbox, hors domaine. */
export type DemandeDeCommun =
  | { type: 'lire-preferences' }
  | { type: 'ranger-preferences'; preferences: Preferences }
  /** Passe d'un mode à l'autre : le sandbox donne à la fenêtre la taille rangée pour cette disposition. */
  | { type: 'changer-disposition'; disposition: Disposition }
  | DemandeDeTaille;

/** Ce que le sandbox envoie à l'interface, hors domaine. */
export type MessageDeCommun =
  | { type: 'preferences'; preferences: Preferences }
  | { type: 'preferences-rangees'; reussie: boolean }
  /**
   * La sélection ou la page a changé. `sujet` vient du premier calque
   * sélectionné ; `ignores` compte les autres. `origine` vaut `'plugin'` pour
   * la sélection que `selectionner` vient de poser : elle ne rend pas le
   * panneau périmé.
   */
  | { type: 'selection'; sujet: SujetSelectionne | null; ignores: number; origine: OrigineDeSelection }
  /**
   * La disposition de la fenêtre : celle que le sandbox choisit à l'ouverture
   * (`'etroite'`, le mode Composant, quand la sélection a un sujet ; `'large'`,
   * le mode Tokens, sinon), puis celle que l'interface demande.
   */
  | { type: 'disposition'; disposition: Disposition }
  /** La déclaration UCM du fichier, à l'ouverture et à chaque changement. */
  | { type: 'declaration'; architecture: ArchitectureDuFichier }
  /** Une demande de ce domaine n'a pas encore de traitement : le sandbox n'a rien lu ni écrit. */
  | { type: 'non-construit'; domaine: string };
