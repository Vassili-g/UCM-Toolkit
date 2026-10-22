/** Les messages de la vue Composant : la lecture du composant sélectionné et son image. */
import type { LectureDeComposant } from '../composant';

export type DemandeDeComposant =
  /**
   * Lit le composant de la sélection quand `calque` est `null`. Un identifiant
   * lit le composant de ce calque sans changer la sélection : un ancêtre, un
   * composant imbriqué ou un variant.
   */
  | { type: 'lire-composant'; demande: number; calque: string | null };

export type MessageDeComposant =
  /** Le composant lu ; `null` quand le calque demandé n'est dans aucun composant. */
  | { type: 'composant'; demande: number; lecture: LectureDeComposant | null }
  /** L'image du sujet, envoyée après sa lecture. `largeur`, `hauteur` et `origine` situent la zone rendue dans la page. */
  | { type: 'apercu-du-composant'; demande: number; sujet: string; octets: Uint8Array; largeur: number; hauteur: number; origine: { x: number; y: number } };
