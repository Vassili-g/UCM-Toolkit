/**
 * Les messages de l'analyse d'un composant. Une seule opération à la fois : une
 * demande reçue pendant une opération rend `occupe`. Après une écriture, un
 * Ctrl+Z ou la sélection d'un autre jeu de variants, le sandbox envoie
 * `perime` ; l'interface garde les constats et ne relance rien avant
 * Actualiser ou Analyser.
 */
import type { TraceDeMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';

import type { ReleveDeComposant } from '@ucm-kit/core/controles';

import type { Constat, IdentiteDAnalyse } from './commun';

export type StatutDAnalyse = 'complete' | 'partielle' | 'annulee' | 'arretee';
/** Ce qui a rendu l'analyse périmée : une écriture du plugin, un changement du document, une autre sélection. */
export type CauseDePeremption = 'ecriture' | 'document' | 'selection';

export type PhaseDAnalyse = 'sujet' | 'releve' | 'catalogue' | 'imbriques' | 'structure' | 'regles' | 'controles' | 'corrections' | 'projection';
export type ProgressionDAnalyse = { phase: PhaseDAnalyse; fraction: number; fait?: number; total?: number };
export type RenduDAnalyse = 'premier-affichage' | 'premiers-constats' | 'resultat-final';

export type DemandeDAnalyse =
  | { type: 'analyser'; demande?: number; mesurer?: boolean }
  | { type: 'annuler-analyse'; analyse?: IdentiteDAnalyse; demande?: number }
  | { type: 'analyse-rendue'; demande: number; analyse: IdentiteDAnalyse; rendu: RenduDAnalyse; depuisClicMs: number; receptionAuRenduMs: number };

export type MessageDAnalyse =
  | { type: 'analyse-commencee'; analyse: IdentiteDAnalyse; demande?: number; mesure?: true }
  | { type: 'analyse-en-cours'; analyse: IdentiteDAnalyse; variantsLus: number; variantsTotal: number; demande?: number; progression?: ProgressionDAnalyse }
  /**
   * Les premiers constats, publiés une fois par analyse avant la fin du calcul. Ce n'est pas un statut de `analyse` : il ne porte ni
   * `statut`, ni `sansTokens`, ni correction, et l'interface ne le prend jamais pour un résultat final.
   */
  | { type: 'analyse-provisoire'; analyse: IdentiteDAnalyse; demande?: number; constats: readonly Constat[]; ignores: readonly string[]; lecture: ReleveDeComposant['lecture']; variants: readonly { id: string; nom: string }[] }
  | { type: 'analyse'; analyse: IdentiteDAnalyse; statut: StatutDAnalyse; constats: readonly Constat[]; lecture: ReleveDeComposant['lecture'] | null; variants: readonly { id: string; nom: string }[];
      /** Vrai quand le relevé et le catalogue sont lus et que la collection `components` n'a aucune variable du jeu. */
      sansTokens: boolean; demande?: number; progression?: ProgressionDAnalyse; mesure?: TraceDeMesure }
  | { type: 'perime'; analyse: IdentiteDAnalyse; cause: CauseDePeremption }
  | { type: 'occupe'; analyse: IdentiteDAnalyse; demande?: number };
