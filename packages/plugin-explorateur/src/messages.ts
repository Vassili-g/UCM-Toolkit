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

import type { LectureDeComposant } from './composant';
import type { Disposition } from './fenetre';
import type { PhaseDeLecture } from './lecture';
import type { Releve } from './modele';
import type { Preferences } from './preferences';

/** Le composant que la sélection désigne, et le calque sélectionné dans ce composant. */
export interface SujetSelectionne {
  readonly id: string;
  readonly portee: string;
}

/** Ce que l'interface demande au sandbox. */
export type UiRequest =
  | { type: 'lire-preferences' }
  | { type: 'ranger-preferences'; preferences: Preferences }
  | { type: 'lire-releve'; demande: number }
  /** Arrête la lecture en cours ; aucun résultat partiel n'est publié. */
  | { type: 'annuler'; demande: number }
  /** Lit le texte de la recette d'UCM Palettes, sans le valider ni le migrer. */
  | { type: 'lire-recette-palettes'; demande: number }
  /**
   * Lit le composant de la sélection quand `calque` est `null`. Un identifiant
   * lit le composant de ce calque sans changer la sélection : un ancêtre, un
   * composant imbriqué ou un variant.
   */
  | { type: 'lire-composant'; demande: number; calque: string | null }
  /** Passe d'un mode à l'autre : le sandbox donne à la fenêtre la taille rangée pour cette disposition. */
  | { type: 'changer-disposition'; disposition: Disposition }
  | DemandeDeTaille;

/** Ce que le sandbox envoie à l'interface. */
export type PluginMessage =
  | { type: 'preferences'; preferences: Preferences }
  | { type: 'preferences-rangees'; reussie: boolean }
  | { type: 'progression'; demande: number; phase: PhaseDeLecture; fait: number; total: number }
  | { type: 'releve'; demande: number; releve: Releve }
  /** La lecture a levé : l'interface garde le relevé précédent, signalé comme ancien. */
  | { type: 'lecture-echouee'; demande: number; message: string }
  | { type: 'annulation'; demande: number }
  /**
   * La sélection ou la page a changé. `sujet` vient du premier calque
   * sélectionné ; `ignores` compte les autres.
   */
  | { type: 'selection'; sujet: SujetSelectionne | null; ignores: number }
  /** Le texte rangé sous la clé partagée de la recette ; vide quand le fichier n'en porte pas. */
  | { type: 'recette-palettes'; demande: number; texte: string }
  /** Le composant lu ; `null` quand le calque demandé n'est dans aucun composant. */
  | { type: 'composant'; demande: number; lecture: LectureDeComposant | null }
  /** L'image du sujet, envoyée après sa lecture. `largeur`, `hauteur` et `origine` situent la zone rendue dans la page. */
  | { type: 'apercu-du-composant'; demande: number; sujet: string; octets: Uint8Array; largeur: number; hauteur: number; origine: { x: number; y: number } }
  /**
   * La disposition de la fenêtre : celle que le sandbox choisit à l'ouverture,
   * étroite dans un fichier sans variable locale, puis celle que l'interface
   * demande.
   */
  | { type: 'disposition'; disposition: Disposition };
