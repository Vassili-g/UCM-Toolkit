/**
 * Le point d'entrée des opérateurs de stress test F2. Il liste les générateurs que `mesurer.ts` et les gardes parcourent. Un
 * nouvel opérateur (L, S, Y et X, E, Q) s'ajoute ici en une ligne, sans toucher au reste du harnais.
 */
import type { CasDeStructure } from './cas.js';
import { operateursAlias } from './operateursAlias.js';
import { operateursCrans } from './operateursCrans.js';
import { operateursEchelle } from './operateursEchelle.js';
import { operateursModes } from './operateursModes.js';
import { operateursNoms } from './operateursNoms.js';
import { operateursRoles } from './operateursRoles.js';
import { operateursScopes } from './operateursScopes.js';
import { operateursStructure } from './operateursStructure.js';
import { GRAINE_PAR_DEFAUT, type ThemeDeBase } from './themeUcm.js';

export type GenerateurDOperateurs = (base: ThemeDeBase, graine: number) => CasDeStructure[];

export const GENERATEURS: readonly GenerateurDOperateurs[] = [
  operateursRoles, operateursCrans, operateursModes, operateursAlias, operateursScopes, operateursStructure, operateursEchelle, operateursNoms,
];

/** Tous les cas des opérateurs simples sur ce thème de base, dans l'ordre des générateurs. */
export function tousLesCas(base: ThemeDeBase, graine: number = GRAINE_PAR_DEFAUT): CasDeStructure[] {
  return GENERATEURS.flatMap((generer) => generer(base, graine));
}
