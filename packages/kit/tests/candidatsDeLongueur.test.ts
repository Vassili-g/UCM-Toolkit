import assert from 'node:assert/strict';
import test from 'node:test';
import { candidatsDeLongueur, indexDeLongueurs } from '../src/controles/candidatsDeLongueur.js';
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

test('l’index se construit une fois par catalogue, et les proches restent vides', () => {
  const cat = catalogue([variable('a', 'sizing/8', { l: { valeur: 8 } })]);
  const premier = indexDeLongueurs(cat);
  candidatsDeLongueur(cat, 'sizing', 8);
  candidatsDeLongueur(cat, 'radius', 4);
  assert.equal(indexDeLongueurs(cat), premier);
  assert.notEqual(indexDeLongueurs(catalogue([variable('a', 'sizing/8', { l: { valeur: 8 } })])), premier);
  assert.deepEqual(candidatsDeLongueur(cat, 'sizing', 9).proches, []);
});
