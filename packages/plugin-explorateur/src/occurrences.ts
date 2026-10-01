/**
 * Les occurrences d'une variable dans un résultat d'analyse des calques :
 * liée directement à une propriété, ou atteinte par la chaîne d'une variable
 * liée, résolue avec les modes effectifs du calque. Un calque sans mode
 * explicite pour une collection prend le contexte courant pour elle.
 */
import type { OccurrenceDeVariable } from './consommateurs';
import type { Index } from './indexation';
import { resoudre, type Contexte } from './resolution';

export interface OccurrencesDuToken {
  readonly directes: readonly OccurrenceDeVariable[];
  /** `via` est la variable liée dont la chaîne passe par le token. */
  readonly indirectes: ReadonlyArray<{ readonly occurrence: OccurrenceDeVariable; readonly via: string }>;
  /** Les calques et styles distincts, toutes occurrences confondues. */
  readonly consommateurs: number;
}

export function occurrencesDuToken(index: Index, occurrences: readonly OccurrenceDeVariable[], variable: string, contexte: Contexte): OccurrencesDuToken {
  const directes: OccurrenceDeVariable[] = [];
  const indirectes: Array<{ occurrence: OccurrenceDeVariable; via: string }> = [];
  for (const occurrence of occurrences) {
    if (occurrence.variable === variable) {
      directes.push(occurrence);
      continue;
    }
    if (!index.variables.has(occurrence.variable)) continue;
    const chaine = resoudre(index, occurrence.variable, contexte, { calque: occurrence.modes });
    if (chaine.etapes.some((etape) => etape.variable === variable)) indirectes.push({ occurrence, via: occurrence.variable });
  }
  const consommateurs = new Set([...directes, ...indirectes.map((entree) => entree.occurrence)].map((occurrence) => occurrence.consommateur)).size;
  return { directes, indirectes, consommateurs };
}

/** Le nombre de consommateurs distincts d'un résultat, différent du nombre de propriétés liées. */
export function consommateursDistincts(occurrences: readonly OccurrenceDeVariable[]): number {
  return new Set(occurrences.map((occurrence) => occurrence.consommateur)).size;
}
