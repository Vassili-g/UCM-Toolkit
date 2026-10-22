/**
 * Ce que l'écran dit des variables que `causeDeProtection` empêche de renommer : une ligne par cause, avec son nombre, son
 * explication et sa pastille. « À appliquer » et la Configuration lisent le même tableau, `Bilan.protections`. Le module ne
 * touche pas au DOM.
 */
import type { CauseDeProtection, ProtectionVue } from '../../messages/nomenclature';
import { TEXTES } from './textes';

export interface LigneDeProtection {
  readonly cause: CauseDeProtection;
  readonly nombre: string;
  readonly explication: string;
  readonly pastille: 'protege' | 'non-verifie';
  /** Vrai quand le geste est de relancer l'analyse : la lecture a été refusée. */
  readonly relancer: boolean;
}

export function lignesDeProtection(protections: readonly ProtectionVue[]): LigneDeProtection[] {
  return protections.map(({ cause, nombre }) => {
    const nonVerifiee = cause === 'lecture-refusee';
    return {
      cause,
      nombre: nonVerifiee ? TEXTES.variablesNonVerifiees(nombre) : TEXTES.nomsProteges(nombre),
      explication: TEXTES.explicationDeProtection[cause],
      pastille: nonVerifiee ? 'non-verifie' : 'protege',
      relancer: nonVerifiee,
    };
  });
}

/** Les deux comptes du titre « Non renommés » : les protégés des quatre premières causes, les non vérifiés de la cinquième. */
export function totauxDeProtection(protections: readonly ProtectionVue[]): { readonly proteges: number; readonly nonVerifiees: number } {
  let nonVerifiees = 0;
  let proteges = 0;
  for (const { cause, nombre } of protections) {
    if (cause === 'lecture-refusee') nonVerifiees += nombre;
    else proteges += nombre;
  }
  return { proteges, nonVerifiees };
}
