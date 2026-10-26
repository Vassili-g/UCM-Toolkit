import assert from 'node:assert/strict';
import test from 'node:test';
import { candidatsDeLongueur, indexDeLongueurs, candidatDeLongueur, candidatDeLongueurParEtapes, classerLesCandidats, classerLesCandidatsParEtapes } from '../src/controles/candidatsDeLongueur.js';
import type { CatalogueDeReference, VariableDuCatalogue } from '../src/controles/index.js';

type Valeurs = NonNullable<VariableDuCatalogue['valeurs']>;
const variable = (cle: string, nom: string, valeurs: Valeurs | undefined, over: Partial<VariableDuCatalogue> = {}): VariableDuCatalogue =>
  ({ cle, nom, collection: 'layout', type: 'FLOAT', etat: 'presente', ...(valeurs ? { valeurs } : {}), ...over });
const catalogue = (variables: VariableDuCatalogue[]): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [
    { cle: 'layout', nom: 'layout', role: 'layout', modes: [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }], etat: 'lue' },
    { cle: 'primitives', nom: 'primitives', role: 'primitives', modes: [], etat: 'lue' },
  ],
  variables,
});
const cles = (cat: CatalogueDeReference, famille: string, valeur: number) => candidatsDeLongueur(cat, famille, valeur).exacts.map(({ cle }) => cle);

function epuiser<T>(calcul: Generator<void, T>): T {
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

test('la résolution par étapes garde les modes et la priorité de la clé sur le nom', () => {
  const nom = variable('nom', 'primitive', { m: { valeur: 22 } });
  const cle = variable('primitive', 'spacing/8', { m: { valeur: 8 } });
  const alias = variable('alias', 'radius/md', { l: { alias: 'primitive' }, d: { alias: 'spacing/8' } });
  const cat = catalogue([nom, cle, alias]);
  const attendu = { variable: alias, parMode: { l: 8, d: 8 }, exacte: 8 };
  assert.deepEqual(epuiser(candidatDeLongueurParEtapes(cat, alias)), attendu);
  assert.deepEqual(candidatDeLongueur(cat, alias), attendu);
});

test('le classement par étapes garde l’ordre exact et les égalités de proximité', () => {
  const z = variable('z', 'z', undefined);
  const a = variable('a', 'a', undefined);
  const egal = variable('egal', 'a', undefined);
  const haut = variable('haut', 'haut', undefined);
  const candidats = [z, a, egal, haut].map((v) => ({ variable: v, parMode: { m: v === haut ? 14 : 12 }, exacte: v === haut ? 14 : 12 }));
  for (const valeur of [0, 12, 13, 14, 20]) {
    assert.deepEqual(epuiser(classerLesCandidatsParEtapes(candidats, valeur)), classerLesCandidats(candidats, valeur));
  }
  assert.deepEqual(epuiser(classerLesCandidatsParEtapes(candidats, 12)), { exacts: [z, a, egal], proches: [] });
  assert.deepEqual(epuiser(classerLesCandidatsParEtapes(candidats, 13)), {
    exacts: [], proches: [{ variable: a, valeur: 12, ecart: 1 }, { variable: haut, valeur: 14, ecart: 1 }],
  });
});

test('la résolution répartit 2 000 modes entre ses étapes', () => {
  let lectures = 0;
  const v = variable('v', 'sizing/10', Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [
    `m${i}`, { get valeur() { lectures += 1; return 10; } },
  ])));
  const calcul = candidatDeLongueurParEtapes(catalogue([v]), v);
  let etape;
  do {
    const avant = lectures;
    etape = calcul.next();
    assert.ok(lectures - avant <= 2);
  } while (!etape.done);
  assert.equal(lectures, 4000);
  assert.equal(etape.value.exacte, 10);
  assert.equal(Object.keys(etape.value.parMode).length, 2000);
});

test('le classement répartit 2 000 candidats entre ses étapes', () => {
  let lectures = 0;
  const variables = Array.from({ length: 2000 }, (_, i) => variable(`v${i}`, `sizing/${i}`, undefined));
  const candidats = variables.map((v) => ({ variable: v, parMode: { m: 10 }, get exacte() { lectures += 1; return 10; } }));
  const calcul = classerLesCandidatsParEtapes(candidats, 10);
  let etape;
  do {
    const avant = lectures;
    etape = calcul.next();
    assert.ok(lectures - avant <= 1);
  } while (!etape.done);
  assert.equal(lectures, 2000);
  assert.deepEqual(etape.value, { exacts: variables, proches: [] });
});

test('une variable qui vaut la valeur en direct est un candidat exact', () => {
  const cat = catalogue([variable('a', 'sizing/8', { l: { valeur: 8 }, d: { valeur: 8 } }), variable('b', 'sizing/12', { l: { valeur: 12 } })]);
  assert.deepEqual(cles(cat, 'sizing', 8), ['a']);
  assert.deepEqual(cles(cat, 'sizing', 9), []);
});

test('une variable qui vise une primitive de la même valeur est un candidat exact', () => {
  const cat = catalogue([
    variable('p8', 'spacing/8', { v: { valeur: 8 } }, { collection: 'primitives' }),
    variable('md', 'radius/md', { l: { alias: 'p8' }, d: { alias: 'p8' } }),
  ]);
  assert.deepEqual(cles(cat, 'radius', 8), ['md']);
});

test('une chaîne d’alias est suivie, bornée à cinq renvois', () => {
  const chaine = (longueur: number) => catalogue([
    variable('c0', 'primitive/base', { v: { valeur: 8 } }, { collection: 'primitives' }),
    ...Array.from({ length: longueur }, (_, i) => variable(`c${i + 1}`, `primitive/n${i + 1}`, { v: { alias: `c${i}` } }, { collection: 'primitives' })),
    variable('visee', 'radius/md', { l: { alias: `c${longueur}` } }),
  ]);
  assert.deepEqual(cles(chaine(4), 'radius', 8), ['visee']);
  assert.deepEqual(cles(chaine(8), 'radius', 8), []);
});

test('des modes qui divergent écartent la variable', () => {
  const cat = catalogue([variable('a', 'sizing/8', { l: { valeur: 8 }, d: { valeur: 12 } })]);
  assert.deepEqual(cles(cat, 'sizing', 8), []);
  assert.deepEqual(cles(cat, 'sizing', 12), []);
});

test('un alias en cycle écarte la variable sans boucler', () => {
  const cat = catalogue([
    variable('x', 'sizing/x', { l: { alias: 'y' } }),
    variable('y', 'sizing/y', { l: { alias: 'x' } }),
    variable('soi', 'sizing/soi', { l: { alias: 'soi' } }),
  ]);
  assert.deepEqual(cles(cat, 'sizing', 8), []);
  assert.equal(indexDeLongueurs(cat).get('sizing')?.every((candidat) => candidat.exacte === undefined), true);
});

test('un mode illisible écarte la variable : alias absent, valeur non numérique, aucune valeur', () => {
  const cat = catalogue([
    variable('a', 'sizing/a', { l: { valeur: 8 }, d: { alias: 'inconnue' } }),
    variable('b', 'sizing/b', { l: { valeur: 8 }, d: { valeur: '8px' } }),
    variable('c', 'sizing/c', undefined),
    variable('d', 'sizing/d', {}),
  ]);
  assert.deepEqual(cles(cat, 'sizing', 8), []);
});

test('la famille est respectée, avec la collection et l’état de la variable', () => {
  const cat = catalogue([
    variable('s', 'sizing/8', { l: { valeur: 8 } }),
    variable('r', 'radius/8', { l: { valeur: 8 } }),
    variable('S', 'layout/Sizing/8b', { l: { valeur: 8 } }),
    variable('hors', 'sizing/8c', { l: { valeur: 8 } }, { collection: 'primitives' }),
    variable('absente', 'sizing/8d', undefined, { etat: 'non-chargee' }),
    variable('texte', 'sizing/8e', { l: { valeur: 8 } }, { type: 'STRING' }),
  ]);
  assert.deepEqual(cles(cat, 'sizing', 8), ['s', 'S']);
  assert.deepEqual(cles(cat, 'radius', 8), ['r']);
  assert.deepEqual(cles(cat, 'stroke', 8), []);
});

test('l’index se construit une fois par catalogue', () => {
  const cat = catalogue([variable('a', 'sizing/8', { l: { valeur: 8 } })]);
  const premier = indexDeLongueurs(cat);
  candidatsDeLongueur(cat, 'sizing', 8);
  candidatsDeLongueur(cat, 'radius', 4);
  assert.equal(indexDeLongueurs(cat), premier);
  assert.notEqual(indexDeLongueurs(catalogue([variable('a', 'sizing/8', { l: { valeur: 8 } })])), premier);
});

const proches = (cat: CatalogueDeReference, famille: string, valeur: number) =>
  candidatsDeLongueur(cat, famille, valeur).proches.map(({ variable: { cle }, valeur: v, ecart }) => [cle, v, ecart]);
const fixe = (cle: string, famille: string, valeur: number, over: Partial<VariableDuCatalogue> = {}) =>
  variable(cle, `${famille}/${cle}`, { l: { valeur }, d: { valeur } }, over);

test('sans exact, un token à 1 px de la valeur est proche, avec sa valeur et son écart', () => {
  const cat = catalogue([fixe('r14', 'radius', 14)]);
  assert.deepEqual(proches(cat, 'radius', 13), [['r14', 14, 1]]);
  assert.deepEqual(candidatsDeLongueur(cat, 'radius', 13).exacts, []);
});

test('un exact écarte les proches', () => {
  const cat = catalogue([fixe('r13', 'radius', 13), fixe('r14', 'radius', 14)]);
  assert.deepEqual(candidatsDeLongueur(cat, 'radius', 13).proches, []);
});

test('un token qui diffère selon le mode n’est jamais proche', () => {
  const cat = catalogue([variable('r', 'radius/r', { l: { valeur: 14 }, d: { valeur: 18 } })]);
  assert.deepEqual(proches(cat, 'radius', 13), []);
});

test('l’écart est borné à 2 px et à un dixième de la valeur lue', () => {
  const cat = catalogue([fixe('r16', 'radius', 16), fixe('s8', 'sizing', 8), fixe('s30', 'sizing', 30), fixe('p22', 'sizing', 22)]);
  assert.deepEqual(proches(cat, 'radius', 13), [], '3 px, au-delà de 1,3');
  assert.deepEqual(proches(cat, 'sizing', 9), [], '1 px dépasse un dixième de 9');
  assert.deepEqual(proches(cat, 'sizing', 20), [['p22', 22, 2]], '2 px à la borne de 2 px');
  assert.deepEqual(proches(cat, 'sizing', 27), [], '3 px dépasse 2 px');
});

test('au plus le plus proche en dessous et le plus proche au-dessus, le plus bas d’abord', () => {
  const cat = catalogue([fixe('r14', 'radius', 14), fixe('r142', 'radius', 14.2), fixe('r12', 'radius', 12), fixe('r125', 'radius', 12.5)]);
  assert.deepEqual(proches(cat, 'radius', 13), [['r125', 12.5, 0.5], ['r14', 14, 1]]);
  assert.deepEqual(proches(catalogue([fixe('a', 'radius', 12), fixe('b', 'radius', 14)]), 'radius', 13), [['a', 12, 1], ['b', 14, 1]]);
  assert.deepEqual(proches(catalogue([fixe('a', 'radius', 12), fixe('b', 'radius', 12.5)]), 'radius', 13), [['b', 12.5, 0.5]]);
});

test('à écart égal du même côté, l’ordre des noms départage', () => {
  const cat = catalogue([fixe('z', 'radius', 14), fixe('a', 'radius', 14)]);
  assert.deepEqual(proches(cat, 'radius', 13).map(([cle]) => cle), ['a']);
});

test('une valeur nulle n’a jamais de proche', () => {
  assert.deepEqual(proches(catalogue([fixe('r1', 'radius', 1)]), 'radius', 0), []);
});
