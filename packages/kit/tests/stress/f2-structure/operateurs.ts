/**
 * Le point d'entrée des opérateurs de stress test F2. Il liste les générateurs que `mesurer.ts` et les gardes parcourent. Un
 * nouvel opérateur (L, S, Y, E, Q, X, faux positifs) s'ajoute ici en une ligne, sans toucher au reste du harnais.
 */
import type { CasDeStructure } from './cas.js';
import { operateursCrans } from './operateursCrans.js';
import { operateursModes } from './operateursModes.js';
import { operateursRoles } from './operateursRoles.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

export type GenerateurDOperateurs = (base: ThemeDeBase, graine: number) => CasDeStructure[];

export const GENERATEURS: readonly GenerateurDOperateurs[] = [operateursRoles, operateursCrans, operateursModes];

/** Tous les cas des opérateurs simples sur ce thème de base, dans l'ordre des générateurs. */
export function tousLesCas(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  return GENERATEURS.flatMap((generer) => generer(base, graine));
}
