/**
 * Le point d'entrée des opérateurs de stress test F7. `GENERATEURS` liste les générateurs du lot 1 (S, G, O, F, M, Y) sur P0 ;
 * `GENERATEURS_DU_LOT_2` ajoute I, R, Z, X, Q, T et L. Les opérateurs d'espace (E) sont retirés avec Display P3.
 */
import type { CasAccessibilite } from './cas.js';
import type { ComposantDeContraste } from './composantDeContraste.js';
import { GRAINE_F7 } from './composantDeContraste.js';
import { operateurQ } from './operateursBorne.js';
import { operateurZ, operateurX } from './operateursCibles.js';
import { operateurR } from './operateursContours.js';
import { operateurF } from './operateursFonds.js';
import { operateurY } from './operateursGaranties.js';
import { operateurI } from './operateursIcones.js';
import { operateurM } from './operateursModes.js';
import { operateurO } from './operateursOpacites.js';
import { operateurS, operateurG } from './operateursSeuils.js';
import { operateurT, operateurL } from './operateursTexteEtEntrees.js';

export type GenerateurDOperateurs = (base: ComposantDeContraste, graine: number) => CasAccessibilite[];

export const GENERATEURS: readonly GenerateurDOperateurs[] = [operateurS, operateurG, operateurO, operateurF, operateurM, operateurY];

/** Les opérateurs du lot 2, dans l'ordre du plan : I (41), R (65), Z (34), X (30), Q (19), T (10), L (26). */
export const GENERATEURS_DU_LOT_2: readonly GenerateurDOperateurs[] = [operateurI, operateurR, operateurZ, operateurX, operateurQ, operateurT, operateurL];

/** Tous les cas des opérateurs du lot 1 sur cette base, dans l'ordre des générateurs. */
export function tousLesCas(base: ComposantDeContraste, graine: number = GRAINE_F7): CasAccessibilite[] {
  return GENERATEURS.flatMap((generer) => generer(base, graine));
}

/** Les 225 cas du lot 2. */
export function tousLesCasDuLot2(base: ComposantDeContraste, graine: number = GRAINE_F7): CasAccessibilite[] {
  return GENERATEURS_DU_LOT_2.flatMap((generer) => generer(base, graine));
}

/** Les 519 cas des opérateurs : ceux du lot 1, puis ceux du lot 2. */
export const tousLesCasDesOperateurs = (base: ComposantDeContraste, graine: number = GRAINE_F7): CasAccessibilite[] => [...tousLesCas(base, graine), ...tousLesCasDuLot2(base, graine)];
