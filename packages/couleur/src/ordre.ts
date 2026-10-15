/**
 * L'ordre des nuances ([DER-19]) jugé sur des clartés données. Le module ne
 * lit aucune palette : `palette.ts` s'en sert pour garder la clarté selon la
 * teinte sans importer `limites.ts`.
 */
import type { Intensite, Mode } from './rampe';

/** L'écart de clarté minimal entre deux nuances voisines, pour que l'ordre de la rampe tienne ([DER-19]). */
export const ECART_MINIMAL_DES_CLARTES = 0.01;

/** Une liste de clartés par thème. */
export type ClartesParMode = { readonly [M in Mode]: readonly number[] };

/** Vrai quand chaque liste de clartés garde `ECART_MINIMAL_DES_CLARTES` entre voisines. */
export function ordreDesClartesTenu(clartes: { readonly [I in Intensite]?: ClartesParMode }): boolean {
  return Object.values(clartes).every((parMode) => Object.values(parMode).every((liste) => {
    const sens = Math.sign(liste[0] - liste[liste.length - 1]);
    // Le millionième absorbe l'erreur d'arrondi d'un écart posé exactement à 0,01.
    return liste.every((clarte, rang) => rang === 0 || sens * (liste[rang - 1] - clarte) >= ECART_MINIMAL_DES_CLARTES - 1e-6);
  }));
}
