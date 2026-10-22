/**
 * Ce que la ligne au-dessus de la liste des renommages annonce, et comment une
 * réponse du sandbox la change. Le module ne touche pas au DOM.
 */
import type { CauseDeRefus, ResultatVue } from '../../messages/nomenclature';
import { TEXTES } from './textes';

export type Annonce =
  /** `sautes` compte les noms sautés pour une autre raison que `nonVerifiees`, présent quand des variables de couleur n'ont pas pu être vérifiées. */
  | { readonly type: 'renomme'; readonly renommes: number; readonly sautes: number; readonly nonVerifiees?: number; readonly annulable: boolean; readonly bilanIllisible: boolean }
  | { readonly type: 'refuse'; readonly cause?: CauseDeRefus }
  /** Toutes les variables sautées sont non vérifiées : le geste est de relancer l'analyse. */
  | { readonly type: 'refuse-non-verifiee' }
  | { readonly type: 'annulation-partielle'; readonly sautes: number }
  /** `exclues` noms gardés parce que leur collection est exclue de l'analyse ; `autres` noms sautés pour une autre raison. */
  | { readonly type: 'annulation-collection-exclue'; readonly retablis: number; readonly exclues: number; readonly autres: number }
  | { readonly type: 'annulation-non-verifiee'; readonly retablis: number; readonly nonVerifiees: number; readonly exclues: number; readonly autres: number }
  | { readonly type: 'annulation-refusee'; readonly cause?: CauseDeRefus };

/** Ce que le designer a demandé en dernier ; `recue` dit si l'`application` de cette demande est arrivée. */
export interface Attente {
  readonly sorte: 'application' | 'annulation';
  readonly demande: number;
  readonly recue?: boolean;
}

/** L'annonce d'une application : un refus garde sa cause, le reste dit combien de noms ont changé. */
export function annonceDUneApplication(resultat: ResultatVue): Annonce {
  const nonVerifiees = resultat.nonVerifiees ?? 0;
  if (resultat.statut === 'refuse') {
    if (resultat.cause) return { type: 'refuse', cause: resultat.cause };
    return nonVerifiees > 0 && nonVerifiees === resultat.sautes ? { type: 'refuse-non-verifiee' } : { type: 'refuse' };
  }
  const partiel = resultat.statut === 'partiel';
  return {
    type: 'renomme', renommes: resultat.renommes, sautes: partiel ? resultat.sautes - nonVerifiees : 0,
    ...(partiel && nonVerifiees > 0 ? { nonVerifiees } : {}),
    annulable: resultat.annulable, bilanIllisible: false,
  };
}

/**
 * L'annonce d'une annulation, `null` quand tous les noms sont rétablis. Dès qu'une ligne est gardée parce que sa collection est exclue, l'annonce
 * le dit, même si l'annulation est refusée : le geste est de recocher la collection, pas de relancer l'analyse. `exclues` est compté dans `sautes`.
 */
export function annonceDUneAnnulation(resultat: ResultatVue): Annonce | null {
  const exclues = resultat.exclues ?? 0;
  const nonVerifiees = resultat.nonVerifiees ?? 0;
  if (nonVerifiees > 0) return {
    type: 'annulation-non-verifiee', retablis: resultat.renommes, nonVerifiees, exclues,
    autres: Math.max(0, resultat.sautes - exclues - nonVerifiees),
  };
  if (exclues > 0) return { type: 'annulation-collection-exclue', retablis: resultat.renommes, exclues, autres: Math.max(0, resultat.sautes - exclues) };
  if (resultat.statut === 'applique') return null;
  if (resultat.statut === 'partiel') return { type: 'annulation-partielle', sautes: resultat.sautes };
  return resultat.cause ? { type: 'annulation-refusee', cause: resultat.cause } : { type: 'annulation-refusee' };
}

/** Le texte d'une annulation refusée : la cause `regles-futures` dit le geste, les autres refus gardent le texte de la vue. */
export function texteDUneAnnulationRefusee(cause: CauseDeRefus | undefined, parDefaut: string): string {
  return cause === 'regles-futures' ? TEXTES.annulationRefuseeReglesFutures : parDefaut;
}

/** Les deux vues donnent le même constat pour une restitution non vérifiée ; seul l'accès aux collections exclues dépend de la vue. */
export function lignesDUneAnnulationNonVerifiee(
  annonce: Extract<Annonce, { type: 'annulation-non-verifiee' }>, depuis: 'configuration' | 'renommages',
): string[] {
  return [
    ...(annonce.exclues > 0 ? [TEXTES.annulationDansUneCollectionExclue(annonce.retablis, annonce.exclues, depuis)]
      : annonce.retablis > 0 ? [`${TEXTES.nomsRetablis(annonce.retablis)}.`] : []),
    TEXTES.annulationNonVerifiee(annonce.nonVerifiees),
    ...(annonce.autres > 0 ? [TEXTES.annulationAutresNomsNonRetablis(annonce.autres)] : []),
  ];
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
