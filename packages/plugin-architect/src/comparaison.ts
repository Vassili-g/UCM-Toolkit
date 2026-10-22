/**
 * La comparaison d'une même variable résolue dans deux contextes : où les
 * chaînes se séparent, et si leurs valeurs terminales diffèrent. Rien n'est
 * modifié, ni les valeurs, ni le mode d'un calque.
 */
import { valeursEgales } from './modele';
import type { Resultat } from './resolution';

export type Ecart =
  /** Les deux chaînes et leurs valeurs sont identiques. */
  | { readonly nature: 'identique' }
  /**
   * La chaîne pointe une autre variable à l'étape `rang`. `modeAuRang` nomme
   * l'étape antérieure dont le mode a changé, cause de l'embranchement.
   */
  | { readonly nature: 'cible-differente'; readonly rang: number; readonly modeAuRang: number | null; readonly valeursEgales: boolean | null }
  /** Mêmes variables, mais un autre mode à l'étape `rang`. */
  | { readonly nature: 'mode-different'; readonly rang: number; readonly valeursEgales: boolean | null }
  /** Mêmes variables et mêmes modes, valeurs terminales différentes : une surcharge ou une erreur de lecture les sépare. */
  | { readonly nature: 'valeur-differente'; readonly rang: number }
  /** L'un des deux contextes, ou les deux, n'aboutit pas. */
  | { readonly nature: 'resolution-echouee'; readonly rang: number | null };

/**
 * Compare deux résultats de la même variable. `valeursEgales` vaut `null`
 * quand l'un des deux n'est pas résolu : aucune égalité n'est alors affirmée.
 */
export function comparer(a: Resultat, b: Resultat): Ecart {
  const longueur = Math.max(a.etapes.length, b.etapes.length);
  let premiereCible = -1;
  let premierMode = -1;
  for (let rang = 0; rang < longueur; rang += 1) {
    const gauche = a.etapes[rang];
    const droite = b.etapes[rang];
    if (!gauche || !droite || gauche.variable !== droite.variable) {
      premiereCible = rang;
      break;
    }
    if (premierMode === -1 && gauche.mode !== droite.mode) premierMode = rang;
  }
  const deuxResolus = a.statut === 'resolu' && b.statut === 'resolu';
  const egales = deuxResolus ? valeursEgales(a.valeur, b.valeur) : null;
  if (!deuxResolus && a.statut !== b.statut) return { nature: 'resolution-echouee', rang: premiereCible === -1 ? null : premiereCible };
  if (premiereCible !== -1) {
    if (!deuxResolus) return { nature: 'resolution-echouee', rang: premiereCible };
    return { nature: 'cible-differente', rang: premiereCible, modeAuRang: premierMode === -1 ? null : premierMode, valeursEgales: egales };
  }
  if (premierMode !== -1) return deuxResolus ? { nature: 'mode-different', rang: premierMode, valeursEgales: egales } : { nature: 'resolution-echouee', rang: premierMode };
  if (!deuxResolus) return { nature: 'resolution-echouee', rang: null };
  return egales ? { nature: 'identique' } : { nature: 'valeur-differente', rang: a.etapes.length - 1 };
}
