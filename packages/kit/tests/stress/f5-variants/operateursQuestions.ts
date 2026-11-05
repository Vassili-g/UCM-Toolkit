/**
 * L'opérateur Q de F5 : les cartes de question de nom (C12 et C13) quand plusieurs valeurs sont renommées. Un candidat est un token
 * que nul variant ne porte (P4), jamais une valeur que d'autres variants portent déjà ; il n'y a de C12 que pour un candidat unique.
 */
import { casDegrade, Numerotation, type CasDeVariants } from './cas.js';
import type { ComposantDeBase } from './portF3.js';

/** Q1 : deux valeurs renommées dans le même axe, trois axes. */
const DEUX_VALEURS: readonly (readonly [axe: string, premiere: readonly [string, string], seconde: readonly [string, string]])[] = [
  ['Color', ['primary', 'Brand'], ['secondary', 'Accent']],
  ['Size', ['Small', 'Compact'], ['Medium', 'Cozy']],
  ['State', ['default', 'Idle'], ['hover', 'Over']],
];

/** Q (5) : trois axes à deux valeurs renommées, deux axes renommés à la fois, un axe de taille qui apparaît dans deux familles. */
export function operateursQuestions(base: ComposantDeBase, _graine: number): CasDeVariants[] {
  const numero = new Numerotation();
  const q1 = DEUX_VALEURS.map(([axe, [ancienne1, neuve1], [ancienne2, neuve2]]) => casDegrade(base, {
    id: numero.prochain('Q1'), operateur: 'Q1', ...(axe === 'Size' ? { hypothese: 'H5' } : {}),
    description: `${axe} : ${ancienne1} devient ${neuve1} et ${ancienne2} devient ${neuve2}, les tokens gardent les anciens noms`,
    zones: [{ axe, valeur: ancienne1 }, { axe, valeur: ancienne2 }],
    degrader: (d) => { d.renommerLaValeur(axe, ancienne1, neuve1); d.renommerLaValeur(axe, ancienne2, neuve2); },
  }));
  // Q-F5-4 : deux axes ouverts donnent C7 sans question, parce que les autres axes ne concordent plus avec les tokens.
  const q2 = casDegrade(base, {
    id: numero.prochain('Q2'), operateur: 'Q2', hypothese: 'H5',
    description: 'Color : primary devient Brand, et Size : Small devient Compact, en même temps',
    zones: [{ axe: 'Color', valeur: 'primary' }, { axe: 'Size', valeur: 'Small' }],
    degrader: (d) => { d.renommerLaValeur('Color', 'primary', 'Brand'); d.renommerLaValeur('Size', 'Small', 'Compact'); },
  });
  const q3 = casDegrade(base, {
    id: numero.prochain('Q3'), operateur: 'Q3', hypothese: 'H5',
    description: 'Size : md devient Cozy ; l\'axe apparaît dans les tokens de couleur et dans ceux de taille, qui donnent le même candidat',
    zones: [{ axe: 'Size', valeur: 'Medium' }], degrader: (d) => d.renommerLaValeur('Size', 'Medium', 'Cozy'),
  });
  return [...q1, q2, q3];
}
