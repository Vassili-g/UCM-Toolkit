/**
 * Les messages qui traversent la frontière sandbox et interface.
 *
 * Le type contraint les deux sens : les envois du sandbox par `versUi` dans
 * `code.ts`, ceux de l'interface par `versSandbox` dans `ui/pont.ts`.
 * `tests/galerie.test.ts` refuse un membre de `PluginMessage` sans état de
 * galerie où le regarder.
 *
 * `demande` numérote chaque demande de l'interface, d'un seul compteur. Une
 * réponse porte le numéro de la demande qui l'a produite ; l'interface ignore
 * celle d'une demande remplacée depuis.
 */
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';

import type { PerimetreDAnalyse, ResultatDesConsommateurs } from './consommateurs';
import type { PhaseDeLecture } from './lecture';
import type { Releve, ValeurSource } from './modele';
import type { Preferences } from './preferences';
import type { ModeDeCalque } from './resolution';

/** Un calque sélectionné, avec ses modes effectifs et ses liaisons directes. */
export interface CalqueSelectionne {
  readonly id: string;
  readonly nom: string;
  readonly type: string;
  readonly modes: Readonly<Record<string, ModeDeCalque>>;
  readonly liaisons: ReadonlyArray<{ readonly propriete: string; readonly variable: string }>;
}

/** La valeur que `resolveForConsumer` donne pour une variable sur un calque, ou l'erreur qu'il lève. */
export type ValeurDeFigma =
  | { readonly variable: string; readonly valeur: ValeurSource }
  | { readonly variable: string; readonly erreur: string };

/** Ce que l'interface demande au sandbox. */
export type UiRequest =
  | { type: 'lire-preferences' }
  | { type: 'ranger-preferences'; preferences: Preferences }
  | { type: 'lire-releve'; demande: number }
  /** Arrête la lecture ou l'analyse en cours ; aucun résultat partiel n'est publié. */
  | { type: 'annuler'; demande: number }
  | { type: 'chercher-consommateurs'; demande: number; perimetre: PerimetreDAnalyse }
  /** Sélectionne un calque existant et centre la vue, sans toucher au document. */
  | { type: 'afficher-calque'; demande: number; calque: string }
  /** Compare le résolveur à `resolveForConsumer`, sur un calque existant, sans consommateur temporaire. */
  | { type: 'verifier-sur-calque'; demande: number; calque: string; variables: string[] }
  /** Lit le texte de la recette d'UCM Palettes, sans le valider ni le migrer. */
  | { type: 'lire-recette-palettes'; demande: number }
  | DemandeDeTaille;

/** Ce que le sandbox envoie à l'interface. */
export type PluginMessage =
  | { type: 'preferences'; preferences: Preferences }
  | { type: 'preferences-rangees'; reussie: boolean }
  | { type: 'progression'; demande: number; phase: PhaseDeLecture | 'calques'; fait: number; total: number }
  | { type: 'releve'; demande: number; releve: Releve }
  /** La lecture a levé : l'interface garde le relevé précédent, signalé comme ancien. */
  | { type: 'lecture-echouee'; demande: number; message: string }
  | { type: 'annulation'; demande: number }
  | { type: 'consommateurs'; demande: number; resultat: ResultatDesConsommateurs }
  /** La sélection ou la page a changé : les calques sélectionnés, sans leurs descendants, et la page courante. */
  | { type: 'selection'; page: string; calques: CalqueSelectionne[] }
  | { type: 'calque-affiche'; demande: number; calque: string; issue: 'affiche' | 'introuvable' }
  | { type: 'valeurs-de-figma'; demande: number; calque: string; valeurs: ValeurDeFigma[] }
  /** Le texte rangé sous la clé partagée de la recette ; vide quand le fichier n'en porte pas. */
  | { type: 'recette-palettes'; demande: number; texte: string };
