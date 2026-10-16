/** Les réponses numérotées appartiennent à une seule demande d'analyse. */
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import type { Analyse } from './analyse';
import type { AvancementLecture } from './lecture';

export type UiMessage = { readonly type: 'analyser'; readonly demande: number } | DemandeDeTaille;
export type PluginMessage =
  | { readonly type: 'initial' }
  | { readonly type: 'lecture'; readonly demande: number; readonly avancement: AvancementLecture }
  | { readonly type: 'pret'; readonly demande: number; readonly analyse: Analyse }
  | { readonly type: 'erreur'; readonly demande: number; readonly message: string };

/** Refuse les demandes non numérotées et les coordonnées de fenêtre non finies. */
export function estUiMessage(brut: unknown): brut is UiMessage {
  if (!brut || typeof brut !== 'object') return false;
  if (!('type' in brut)) return false;
  if (brut.type === 'analyser') return 'demande' in brut && typeof brut.demande === 'number' && Number.isSafeInteger(brut.demande) && brut.demande > 0;
  return brut.type === 'resize' && 'largeur' in brut && typeof brut.largeur === 'number' && Number.isFinite(brut.largeur)
    && 'hauteur' in brut && typeof brut.hauteur === 'number' && Number.isFinite(brut.hauteur)
    && (!('fin' in brut) || typeof brut.fin === 'boolean');
}
