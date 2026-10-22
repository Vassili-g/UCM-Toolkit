/** Les messages de l'arbre et du tableau des tokens : la lecture du relevé et la recette d'UCM Palettes. */
import type { PhaseDeLecture } from '../lecture';
import type { Releve } from '../modele';

export type DemandeDArbre =
  | { type: 'lire-releve'; demande: number }
  /** Arrête la lecture en cours ; aucun résultat partiel n'est publié. */
  | { type: 'annuler'; demande: number }
  /** Lit le texte de la recette d'UCM Palettes, sans le valider ni le migrer. */
  | { type: 'lire-recette-palettes'; demande: number };

export type MessageDArbre =
  | { type: 'progression'; demande: number; phase: PhaseDeLecture; fait: number; total: number }
  | { type: 'releve'; demande: number; releve: Releve }
  /** La lecture a levé : l'interface garde le relevé précédent, signalé comme ancien. */
  | { type: 'lecture-echouee'; demande: number; message: string }
  | { type: 'annulation'; demande: number }
  /** Le texte rangé sous la clé partagée de la recette ; vide quand le fichier n'en porte pas. */
  | { type: 'recette-palettes'; demande: number; texte: string };
