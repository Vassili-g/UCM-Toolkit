/** La comparaison de deux contextes, et les diagnostics génériques. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { comparer } from '../src/comparaison';
import { diagnostiquer, variablesConcernees } from '../src/diagnostics';
import { indexer } from '../src/indexation';
import { creerResolveur, resoudre } from '../src/resolution';
import { alias, cinqCollections, constructeur, nombre, projetLibre } from './fixtures';

test('deux densités d’une même valeur directe : même variable, autre mode, valeurs différentes', () => {
  const index = indexer(projetLibre());
  const ecart = comparer(resoudre(index, 'espace-carte', { mesures: 'mesures:Compact' }), resoudre(index, 'espace-carte', { mesures: 'mesures:Confort' }));
  assert.deepEqual(ecart, { nature: 'mode-different', rang: 0, valeursEgales: false });
});

test('deux marques : la première cible différente est nommée, même quand les valeurs terminales sont égales', () => {
  const index = indexer(cinqCollections());
  const alpha = resoudre(index, 'bouton-fond', { theme: 'theme:Dark', marque: 'marque:Alpha' });
  const beta = resoudre(index, 'bouton-fond', { theme: 'theme:Dark', marque: 'marque:Beta' });
  assert.deepEqual(comparer(alpha, beta), { nature: 'cible-differente', rang: 4, modeAuRang: 3, valeursEgales: false });
  // vert-400 et vert-500 portent la même couleur : chaînes différentes, même valeur.
  const betaClair = resoudre(index, 'bouton-fond', { theme: 'theme:Light', marque: 'marque:Beta' });
  assert.deepEqual(comparer(beta, betaClair), { nature: 'cible-differente', rang: 3, modeAuRang: 2, valeursEgales: true });
});

test('deux contextes identiques ne montrent aucun écart', () => {
  const index = indexer(cinqCollections());
  const contexte = { theme: 'theme:Light', marque: 'marque:Alpha' };
  assert.deepEqual(comparer(resoudre(index, 'bouton-fond', contexte), resoudre(index, 'bouton-fond', contexte)), { nature: 'identique' });
});

test('une résolution qui échoue d’un côté n’affirme aucune égalité', () => {
  const c = constructeur();
  c.collection('x', 'X', ['Un', 'Deux']);
  c.variable('a', 'x', 'a', 'FLOAT', { Un: alias('b'), Deux: alias('b') });
  c.variable('b', 'x', 'b', 'FLOAT', { Un: alias('a'), Deux: nombre(3) });
  const index = indexer(c.releve());
  const ecart = comparer(resoudre(index, 'a', { x: 'x:Un' }), resoudre(index, 'a', { x: 'x:Deux' }));
  assert.equal(ecart.nature, 'resolution-echouee');
});

test('un cycle produit un constat groupé, limité au mode où il est actif', () => {
  const c = constructeur();
  c.collection('x', 'X', ['Un', 'Deux']);
  c.variable('a', 'x', 'a', 'FLOAT', { Un: alias('b'), Deux: alias('b') });
  c.variable('b', 'x', 'b', 'FLOAT', { Un: alias('a'), Deux: nombre(3) });
  c.variable('c', 'x', 'c', 'FLOAT', { Un: alias('a'), Deux: alias('a') });
  const diagnostic = diagnostiquer(creerResolveur(indexer(c.releve())), {});
  assert.equal(diagnostic.constats.length, 1);
  const [cycle] = diagnostic.constats;
  assert.equal(cycle.nature, 'cycle');
  assert.deepEqual([...cycle.boucle].sort(), ['a', 'b']);
  assert.deepEqual(cycle.occurrences, [
    { depart: 'a', mode: 'x:Un' },
    { depart: 'b', mode: 'x:Un' },
    { depart: 'c', mode: 'x:Un' },
  ]);
  assert.equal(diagnostic.resolutions, 6);
});

test('le projet libre rend un cycle et une cible inaccessible, chacun relié à ses variables', () => {
  const diagnostic = diagnostiquer(creerResolveur(indexer(projetLibre())), {});
  assert.deepEqual(diagnostic.constats.map((constat) => [constat.nature, constat.enCause]), [
    ['cycle', 'essai-a'],
    ['inaccessible', 'distante-absente'],
  ]);
  assert.equal(diagnostic.partiel, true);
  assert.deepEqual([...variablesConcernees(diagnostic.constats)].sort(), ['distante-absente', 'essai-a', 'essai-b', 'legacy']);
});

test('aucun constat ne dépend d’un nom : un groupe `usage` sans UCM n’en produit pas', () => {
  const diagnostic = diagnostiquer(creerResolveur(indexer(projetLibre())), {}, ['usage', 'carte-fond']);
  assert.deepEqual(diagnostic.constats, []);
});
