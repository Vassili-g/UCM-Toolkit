/**
 * Les messages de l'analyse d'un composant. Une seule opération à la fois : une
 * demande reçue pendant une opération rend `occupe`. Après une écriture, un
 * Ctrl+Z ou la sélection d'un autre jeu de variants, le sandbox envoie
 * `perime` ; l'interface garde les constats et ne relance rien avant
 * Actualiser ou Analyser.
 */
import type { ReleveDeComposant } from '@ucm-kit/core/controles';

import type { Constat, IdentiteDAnalyse } from './commun';

export type StatutDAnalyse = 'complete' | 'partielle' | 'annulee' | 'arretee';
/** Ce qui a rendu l'analyse périmée : une écriture du plugin, un changement du document, une autre sélection. */
export type CauseDePeremption = 'ecriture' | 'document' | 'selection';

export type DemandeDAnalyse =
  | { type: 'analyser' }
  | { type: 'annuler-analyse'; analyse: IdentiteDAnalyse };

export type MessageDAnalyse =
  | { type: 'analyse-commencee'; analyse: IdentiteDAnalyse }
  | { type: 'analyse-en-cours'; analyse: IdentiteDAnalyse; variantsLus: number; variantsTotal: number }
  | { type: 'analyse'; analyse: IdentiteDAnalyse; statut: StatutDAnalyse; constats: readonly Constat[]; lecture: ReleveDeComposant['lecture'] | null; variants: readonly { id: string; nom: string }[];
      /** Vrai quand le relevé et le catalogue sont lus et que la collection `components` n'a aucune variable du jeu. */
      sansTokens: boolean }
  | { type: 'perime'; analyse: IdentiteDAnalyse; cause: CauseDePeremption }
  | { type: 'occupe'; analyse: IdentiteDAnalyse };
