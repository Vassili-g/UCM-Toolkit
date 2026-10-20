/**
 * Ce que la ligne au-dessus de la liste des renommages annonce, et comment une
 * réponse du sandbox la change. Le module ne touche pas au DOM.
 */
import type { CauseDeRefus, ResultatVue } from '../messages';

export type Annonce =
  | { readonly type: 'renomme'; readonly renommes: number; readonly sautes: number; readonly annulable: boolean; readonly bilanIllisible: boolean }
  | { readonly type: 'refuse'; readonly cause?: CauseDeRefus }
  | { readonly type: 'annulation-partielle'; readonly sautes: number }
  /** `exclues` noms gardés parce que leur collection est exclue de l'analyse ; `autres` noms sautés pour une autre raison. */
  | { readonly type: 'annulation-collection-exclue'; readonly retablis: number; readonly exclues: number; readonly autres: number }
  | { readonly type: 'annulation-refusee' };

/** Ce que le designer a demandé en dernier ; `recue` dit si l'`application` de cette demande est arrivée. */
export interface Attente {
  readonly sorte: 'application' | 'annulation';
  readonly demande: number;
  readonly recue?: boolean;
}

/** L'annonce d'une application : un refus garde sa cause, le reste dit combien de noms ont changé. */
export function annonceDUneApplication(resultat: ResultatVue): Annonce {
  if (resultat.statut === 'refuse') return resultat.cause ? { type: 'refuse', cause: resultat.cause } : { type: 'refuse' };
  return { type: 'renomme', renommes: resultat.renommes, sautes: resultat.statut === 'partiel' ? resultat.sautes : 0, annulable: resultat.annulable, bilanIllisible: false };
}

/**
 * L'annonce d'une annulation, `null` quand tous les noms sont rétablis. Dès qu'une ligne est gardée parce que sa collection est exclue, l'annonce
 * le dit, même si l'annulation est refusée : le geste est de recocher la collection, pas de relancer l'analyse. `exclues` est compté dans `sautes`.
 */
export function annonceDUneAnnulation(resultat: ResultatVue): Annonce | null {
  const exclues = resultat.exclues ?? 0;
  if (exclues > 0) return { type: 'annulation-collection-exclue', retablis: resultat.renommes, exclues, autres: Math.max(0, resultat.sautes - exclues) };
  if (resultat.statut === 'applique') return null;
  return resultat.statut === 'partiel' ? { type: 'annulation-partielle', sautes: resultat.sautes } : { type: 'annulation-refusee' };
}

/**
 * L'annonce après une `erreur` pour la demande attendue. Quand l'`application` de
 * cette demande est déjà arrivée, les noms ont changé : l'annonce est gardée et
 * dit que le fichier n'a pas pu être relu.
 */
export function annonceApresUneErreur(attente: Attente, annonce: Annonce | null): Annonce {
  if (attente.sorte === 'annulation') return { type: 'annulation-refusee' };
  if (attente.recue && annonce?.type === 'renomme') return { ...annonce, bilanIllisible: true };
  return { type: 'refuse' };
}
