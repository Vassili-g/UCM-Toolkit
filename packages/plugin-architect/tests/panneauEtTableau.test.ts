/** Le panneau garde la péremption d'une identité ; la cellule du tableau compte les constats par identifiant ou par nom. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TEXTES_ANALYSE } from '../src/ui/textes/analyse';
import type { Constat } from '../src/messages/commun';
import { analyseApplicable, recevoirUneAnalyse, type MessageRecuDeLAnalyse } from '../src/ui/composant/analyse';
import { constatsDuVariant } from '../src/ui/composant/variants';
import type { Etat } from '../src/ui/etat';

const identite = { sujet: 'Alert', generation: 1 };
const constat = (id: string, variants: string[]): Constat => ({ id, variants } as unknown as Constat);
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

test('la cellule compte les constats par identifiant ou par nom, chacun une fois', () => {
  const variant = { id: 'v1', nom: 'Severity=info' } as never;
  const constats = [constat('a', ['v1']), constat('b', ['Severity=info']), constat('c', ['v1', 'Severity=info']), constat('d', ['v2'])];
  assert.deepEqual(constatsDuVariant(variant, constats).map(({ id }) => id), ['a', 'b', 'c']);
});

test('les phases de progression reprennent les textes de la maquette avec ou sans compte', () => {
  const textes = TEXTES_ANALYSE.panneauDesConstats;
  assert.equal(textes.compteDeLecture(textes.phases.releve, 5, 11), 'Lecture des variants : 5 sur 11');
  assert.equal(textes.phases.catalogue, 'Lecture de la library');
  assert.equal(textes.phases.imbriques, 'Lecture des composants imbriqués');
  assert.equal(textes.phases.structure, 'Lecture de la structure');
  for (const phase of ['regles', 'controles', 'corrections', 'projection'] as const) assert.equal(textes.phases[phase], 'Vérification des règles');
});
