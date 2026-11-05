/**
 * Banc de croissance des deux contrôles du mode Tokens (D0.3) : `controlerLeCatalogue` et `controlerLIntegriteUcm` sur des catalogues
 * fabriqués de taille croissante (`tests/aides/cataloguesDeCroissance.ts`). Pour chaque taille, le nombre de lectures de `cle`, `nom`
 * et `collection` sur les variables (un compteur qui ne dépend pas de la charge de la machine), puis la médiane en ms de
 * `PASSES` passes après une passe d'échauffement. Le kit est celui de `@ucm-kit/core` tel que construit dans `packages/kit/dist`.
 *
 * Lancer : `npx tsx packages/plugin-architect/scripts/mesure/croissanceDuKit.ts`. Rien n'est écrit sur disque.
 */
import { performance } from 'node:perf_hooks';

import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type Constat } from '@ucm-kit/core/controles';

import { compterLesLectures, fabriquerUnCatalogue } from '../../tests/aides/cataloguesDeCroissance';

const PASSES = 11;
const PALETTES = 6;
const CRANS = [25, 50, 100, 200, 400, 800];
const OPTIONS = { ecriture: null, rolesIgnores: [] };

const controles: readonly { nom: string; lancer: (catalogue: CatalogueDeReference) => Constat[] }[] = [
  { nom: 'controlerLeCatalogue', lancer: (catalogue) => controlerLeCatalogue(catalogue) },
  { nom: 'controlerLIntegriteUcm', lancer: (catalogue) => controlerLIntegriteUcm(catalogue, OPTIONS) },
];

const mediane = (valeurs: readonly number[]): number => [...valeurs].sort((a, b) => a - b)[Math.floor(valeurs.length / 2)] ?? 0;

for (const taille of CRANS) {
  const catalogue = fabriquerUnCatalogue(7, { palettes: PALETTES, crans: taille, partManquante: 0.3 });
  const lignes: string[] = [];
  for (const controle of controles) {
    const suivi = compterLesLectures(catalogue);
    const constats = controle.lancer(suivi.catalogue).length;
    const lectures = suivi.lectures();
    controle.lancer(catalogue);
    const durees: number[] = [];
    for (let passe = 0; passe < PASSES; passe++) {
      const t0 = performance.now();
      controle.lancer(catalogue);
      durees.push(performance.now() - t0);
    }
    lignes.push(`${controle.nom} : ${constats} constats, ${lectures} lectures, ${mediane(durees).toFixed(1)} ms`);
  }
  console.log(`${catalogue.variables.length} variables | ${lignes.join(' | ')}`);
}
console.log(`médiane de ${PASSES} passes après une passe d'échauffement ; durées prises sous charge de la machine`);
