/** Les messages de l'arbre et du tableau des tokens : la lecture du relevé. */
import type { PhaseDeLecture } from '../lecture';
import type { Releve } from '../modele';

export type DemandeDArbre =
  | { type: 'lire-releve'; demande: number }
  /** Arrête la lecture en cours ; aucun résultat partiel n'est publié. */
  | { type: 'annuler'; demande: number };

export type MessageDArbre =
  | { type: 'progression'; demande: number; phase: PhaseDeLecture; fait: number; total: number }
  | { type: 'releve'; demande: number; releve: Releve }
  /** La lecture a levé : l'interface garde le relevé précédent, signalé comme ancien. */
  | { type: 'lecture-echouee'; demande: number; message: string }
  | { type: 'annulation'; demande: number };
