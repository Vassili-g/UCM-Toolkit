/**
 * Le point d'entrée des opérateurs de stress test F5. Il liste les générateurs que `mesurer.ts` et les gardes parcourent. Les
 * opérateurs S et I de F6 s'ajoutent à `GENERATEURS` en une ligne, sans toucher au reste du harnais.
 */
import type { CasDeVariants } from './cas.js';
import { GRAINE_PAR_DEFAUT } from './composantDeBase.js';
import type { ComposantDeBase } from './portF3.js';
import { operateursAxes } from './operateursAxes.js';
import { operateursMatrice } from './operateursMatrice.js';
import { operateursOrphelins } from './operateursOrphelins.js';
import { operateursQuestions } from './operateursQuestions.js';
import { operateursValeurs } from './operateursValeurs.js';

export type GenerateurDOperateurs = (base: ComposantDeBase, graine: number) => CasDeVariants[];

export const GENERATEURS: readonly GenerateurDOperateurs[] = [operateursAxes, operateursValeurs, operateursQuestions, operateursMatrice, operateursOrphelins];

/** Tous les cas des opérateurs simples sur cette base, dans l'ordre des générateurs. */
export function tousLesCas(base: ComposantDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeVariants[] {
  return GENERATEURS.flatMap((generer) => generer(base, graine));
}
