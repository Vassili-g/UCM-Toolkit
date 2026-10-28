/** Le panneau garde la péremption d'une identité. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TEXTES_ANALYSE } from '../src/ui/textes/analyse';
import { analyseApplicable, recevoirUneAnalyse, type MessageRecuDeLAnalyse } from '../src/ui/composant/analyse';
import type { Etat } from '../src/ui/etat';

const identite = { sujet: 'Alert', generation: 1 };
const message = (type: string, reste: object = {}): MessageRecuDeLAnalyse =>
  ({ type, analyse: identite, statut: 'complete', constats: [], variants: [], lecture: null, sansTokens: false, ...reste }) as unknown as MessageRecuDeLAnalyse;

test('le message final d’une analyse est refusé pour une identité déjà périmée, qui reste non applicable', () => {
  const etat = { analyse: null } as unknown as Etat;
  recevoirUneAnalyse(etat, message('analyse-commencee'));
  recevoirUneAnalyse(etat, message('perime', { cause: 'document' }));
  recevoirUneAnalyse(etat, message('analyse'));
  assert.equal(etat.analyse?.perimee, true);
  assert.equal(etat.analyse?.cause, 'document');
  assert.equal(etat.analyse?.statut, 'en-cours');
  assert.equal(analyseApplicable(etat.analyse), false);
});

test('une identité nouvelle part non périmée', () => {
  const etat = { analyse: null } as unknown as Etat;
  recevoirUneAnalyse(etat, message('analyse'));
  assert.equal(etat.analyse?.perimee, false);
  assert.equal(etat.analyse?.cause, null);
});

test('les phases de progression reprennent les textes de la maquette avec ou sans compte', () => {
  const textes = TEXTES_ANALYSE.panneauDesConstats;
  assert.equal(textes.compteDeLecture(textes.phases.releve, 5, 11), 'Lecture des variants : 5 sur 11');
  assert.equal(textes.phases.catalogue, 'Lecture de la library');
  assert.equal(textes.phases.imbriques, 'Lecture des composants imbriqués');
  assert.equal(textes.phases.structure, 'Lecture de la structure');
  for (const phase of ['regles', 'controles', 'corrections', 'projection'] as const) assert.equal(textes.phases[phase], 'Vérification des règles');
});
