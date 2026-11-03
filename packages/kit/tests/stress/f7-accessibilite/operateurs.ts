/**
 * Le point d'entrée des opérateurs de stress test F7. `GENERATEURS` liste les générateurs du lot 1 (S, G, O, F, M, Y) sur P0 ; le
 * lot suivant y ajoute I, R, Z, X, Q, T, L et les opérateurs d'espace sans changer les appelants.
 */
import type { CasAccessibilite } from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { GRAINE_F7 } from './composantDeContraste.js';
import { operateurF } from './operateursFonds.js';
import { operateurY } from './operateursGaranties.js';
import { operateurM } from './operateursModes.js';
import { operateurO } from './operateursOpacites.js';
import { operateurS, operateurG } from './operateursSeuils.js';

export type GenerateurDOperateurs = (base: ComposantDeContraste, graine: number) => CasAccessibilite[];

export const GENERATEURS: readonly GenerateurDOperateurs[] = [operateurS, operateurG, operateurO, operateurF, operateurM, operateurY];

/** Tous les cas des opérateurs simples sur cette base, dans l'ordre des générateurs. */
export function tousLesCas(base: ComposantDeContraste, graine: number = GRAINE_F7): CasAccessibilite[] {
  return GENERATEURS.flatMap((generer) => generer(base, graine));
}
