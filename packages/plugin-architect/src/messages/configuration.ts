/** Les messages de la configuration : la Library choisie, le niveau d'accessibilité et l'annulation de la structure. L'Historique de Nomenclature garde ses messages dans `nomenclature.ts`. */
import type { LigneDAnnulationSautee } from '../ecriture/structure';

export type NiveauDAccessibilite = 'AA' | 'AAA';

export interface LibraryConfiguree {
  readonly cle: string;
  readonly nom: string;
  readonly liaisons: number;
}

export type DemandeDeConfiguration =
  | { type: 'lire-configuration' }
  | { type: 'ranger-library'; cle: string }
  | { type: 'ranger-niveau'; niveau: NiveauDAccessibilite }
  /** Défait le dernier lot du journal de structure : scopes, alias de mode et variables créées. */
  | { type: 'annuler-structure'; demande: number };

export type MessageDeConfiguration =
  | { type: 'configuration'; library: LibraryConfiguree | null; candidates: readonly LibraryConfiguree[]; niveau: NiveauDAccessibilite }
  /**
   * Ce que l'annulation a fait. `refus` : une autre opération court (`occupe`) ou le fichier ne déclare plus UCM (`hors-ucm`), rien n'est
   * touché. `journal` : `absent` sans journal, `illisible` quand il existe sans se lire (laissé tel quel). `sautees` reste au journal ;
   * `limiteDesUsages` vaut vrai quand le lot porte une création, dont les usages dans d'autres fichiers échappent au plugin.
   */
  | {
    type: 'structure-annulee'; demande: number; refus: 'occupe' | 'hors-ucm' | null; journal: 'lu' | 'absent' | 'illisible';
    defaites: number; sautees: readonly LigneDAnnulationSautee[]; restantes: number; limiteDesUsages: boolean;
  };
