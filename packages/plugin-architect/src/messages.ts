/** Les réponses numérotées appartiennent à une seule demande d'analyse. */
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { Analyse } from './analyse';
import type { AvancementLecture } from './lecture';
import type { ConventionsParCategorie } from '@ucm-kit/core/referentiel';
import { estConventions } from './conventions';
import type { ResultatApplication } from './ecriture';

export type DemandeArchitect =
  | { readonly type: 'analyser'; readonly demande: number }
  | { readonly type: 'recalculer'; readonly demande: number; readonly analyseId: number; readonly conventions: ConventionsParCategorie; readonly termesUcm: boolean }
  | { readonly type: 'appliquer'; readonly demande: number; readonly analyseId: number; readonly ids: readonly string[] };
export type UiMessage = DemandeArchitect | DemandeDeTaille;
export type PluginMessage =
  | { readonly type: 'initial' }
  | { readonly type: 'lecture'; readonly demande: number; readonly avancement: AvancementLecture }
  | { readonly type: 'pret'; readonly demande: number; readonly analyseId: number; readonly analyse: Analyse }
  | { readonly type: 'application'; readonly demande: number; readonly analyseId: number; readonly resultat: ResultatApplication }
  | { readonly type: 'erreur'; readonly demande: number; readonly message: string };

/** Refuse les demandes non numérotées et les coordonnées de fenêtre non finies. */
export function estUiMessage(brut: unknown): brut is UiMessage {
  if (!brut || typeof brut !== 'object') return false;
  if (!('type' in brut)) return false;
  if (brut.type === 'analyser' || brut.type === 'recalculer' || brut.type === 'appliquer') {
    if (!('demande' in brut) || typeof brut.demande !== 'number' || !Number.isSafeInteger(brut.demande) || brut.demande <= 0) return false;
    if (brut.type === 'analyser') return true;
    if (!('analyseId' in brut) || typeof brut.analyseId !== 'number' || !Number.isSafeInteger(brut.analyseId) || brut.analyseId <= 0) return false;
    if (brut.type === 'recalculer') return 'conventions' in brut && estConventions(brut.conventions) && 'termesUcm' in brut && typeof brut.termesUcm === 'boolean';
    return 'ids' in brut && Array.isArray(brut.ids) && brut.ids.every((id) => typeof id === 'string') && new Set(brut.ids).size === brut.ids.length;
  }
  return brut.type === 'resize' && 'largeur' in brut && typeof brut.largeur === 'number' && Number.isFinite(brut.largeur)
    && 'hauteur' in brut && typeof brut.hauteur === 'number' && Number.isFinite(brut.hauteur)
    && (!('fin' in brut) || typeof brut.fin === 'boolean');
}
