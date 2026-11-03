/**
 * Le point d'entrée des opérateurs du stress test F8 et F9. Il liste les générateurs que `mesurer.ts` et la garde parcourent. Un
 * nouvel opérateur de F9 (lectures, budget, cycle, états) s'ajoute à `GENERATEURS.F9` en une ligne, sans toucher au reste du harnais.
 */
import type { CasF8 } from './cas';
import { fauxPositifs } from './fauxPositifs';
import { interactions } from './interactions';
import { operateursEcriture } from './operateursEcriture';
import { operateursMoteur } from './operateursMoteur';
import { operateursRegles } from './operateursRegles';

export type Famille = 'F8' | 'F9';
export type Section = 'A' | 'B' | 'C';

export const GRAINE_PAR_DEFAUT = 7108;

/** Les opérateurs simples (section B) de chaque famille. */
export const GENERATEURS: Readonly<Record<Famille, ReadonlyArray<() => CasF8[]>>> = {
  F8: [operateursRegles, operateursEcriture, operateursMoteur],
  F9: [],
};

export const FAUX_POSITIFS: Readonly<Record<Famille, () => CasF8[]>> = { F8: fauxPositifs, F9: () => [] };
export const INTERACTIONS: Readonly<Record<Famille, () => CasF8[]>> = { F8: interactions, F9: () => [] };

/** Tous les cas des opérateurs simples d'une famille, dans l'ordre des générateurs. */
export const tousLesCas = (famille: Famille = 'F8'): CasF8[] => GENERATEURS[famille].flatMap((generer) => generer());
