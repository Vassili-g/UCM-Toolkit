/**
 * Le point d'entrée des opérateurs de stress test F5 et F6. `GENERATEURS` liste les générateurs de F5 (A, V, Q, M, O) sur P0, et
 * `GENERATEURS_F6` ceux de F6 (S, I) sur la base de 12 variants. Ils restent séparés : `tousLesCas` garde les 270 cas de F5, et
 * `tousLesCasDeLaSectionB` rend les 371 cas des deux familles, dans l'ordre F5 puis F6.
 */
import type { CasDeVariants } from './cas.js';
import { GRAINE_PAR_DEFAUT } from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';
import { operateursAxes } from './operateursAxes.js';
import { operateursMatrice } from './operateursMatrice.js';
import { operateursOrphelins } from './operateursOrphelins.js';
import { operateursQuestions } from './operateursQuestions.js';
import { operateursValeurs } from './operateursValeurs.js';
import { operateursIcones } from './typo/operateursIcones.js';
import { operateursTexte } from './typo/operateursTexte.js';

export type GenerateurDOperateurs = (base: ComposantDeBase, graine: number) => CasDeVariants[];

export const GENERATEURS: readonly GenerateurDOperateurs[] = [operateursAxes, operateursValeurs, operateursQuestions, operateursMatrice, operateursOrphelins];

/** Les opérateurs de F6 construisent leur propre base de 12 variants : le composant qu'on leur passe est ignoré. */
export const GENERATEURS_F6: readonly GenerateurDOperateurs[] = [operateursTexte, operateursIcones];

/** Tous les cas des opérateurs simples de F5 sur cette base, dans l'ordre des générateurs. */
export function tousLesCas(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeVariants[] {
  return GENERATEURS.flatMap((generer) => generer(base, graine));
}

/** Les 101 cas de F6. */
export function tousLesCasDeF6(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeVariants[] {
  return GENERATEURS_F6.flatMap((generer) => generer(base, graine));
}

/** La section B : les 270 cas de F5 puis les 101 cas de F6. */
export function tousLesCasDeLaSectionB(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeVariants[] {
  return [...tousLesCas(base, graine), ...tousLesCasDeF6(base, graine)];
}
