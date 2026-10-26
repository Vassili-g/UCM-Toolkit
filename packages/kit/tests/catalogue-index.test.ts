/** `variableDuCatalogue` s'appuie sur un index par catalogue : même réponse que la recherche linéaire, en une lecture du catalogue. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from '../src/controles/index.js';
import { variableParCle } from '../src/controles/catalogue.js';

function variable(cle: string, nom: string, collection: string): VariableDuCatalogue {
  return { cle, nom, collection, type: 'FLOAT', etat: 'presente' };
}

function catalogue(variables: VariableDuCatalogue[]): CatalogueDeReference {
  return { version: 1, library: null, collections: [], variables };
}

/** La recherche d'avant l'index : l'oracle. */
function reference(c: CatalogueDeReference, cleOuNom: string, collection?: string): VariableDuCatalogue | 'absente' {
  const parCle = c.variables.find((v) => v.cle === cleOuNom);
  if (parCle) return parCle;
  return c.variables.find((v) => v.nom === cleOuNom && (collection === undefined || v.collection === collection)) ?? 'absente';
}

test('collisions de clés et de noms : priorité clé puis nom, premier doublon', () => {
  const c = catalogue([
    variable('a', 'b', 'c1'),
    variable('b', 'x', 'c1'),
    variable('b', 'x2', 'c2'),
    variable('k1', 'dup', 'c1'),
    variable('k2', 'dup', 'c2'),
    variable('k3', 'dup', 'c2'),
    variable('k1', 'autre', 'c2'),
  ]);
  const requetes: [string, string?][] = [
    ['a'], ['b'], ['b', 'c2'], ['dup'], ['dup', 'c2'], ['dup', 'c1'], ['dup', 'c3'], ['k1'], ['x'], ['x2', 'c1'], ['x2', 'c2'], ['absent'], ['', 'c1'],
  ];
  for (const [cleOuNom, collection] of requetes) {
    assert.equal(variableDuCatalogue(c, cleOuNom, collection), reference(c, cleOuNom, collection), `${cleOuNom} ${collection}`);
  }
  assert.equal(variableDuCatalogue(c, 'b'), c.variables[1], 'la clé l\'emporte sur le nom');
  assert.equal(variableDuCatalogue(c, 'dup'), c.variables[3]);
  assert.equal(variableParCle(c, 'k1'), c.variables[3]);
  assert.equal(variableParCle(c, 'dup'), undefined, 'aucun repli sur le nom');
});

test('une variable ajoutée ou un tableau remplacé écarte l\'index', () => {
  const c = catalogue([variable('a', 'n', 'c')]);
  assert.equal(variableDuCatalogue(c, 'z'), 'absente');
  c.variables.push(variable('z', 'm', 'c'));
  assert.equal(variableDuCatalogue(c, 'z'), c.variables[1]);
  c.variables = [variable('y', 'z', 'c')];
  assert.equal(variableDuCatalogue(c, 'z'), c.variables[0]);
  assert.equal(variableParCle(c, 'a'), undefined);
});

test('1 000 recherches lisent chaque variable une fois, pas 1 000 fois', () => {
  const lectures = { cle: 0, nom: 0 };
  const variables = Array.from({ length: 1000 }, (_, i) => {
    const v = variable(`k${i}`, `n${i}`, 'c');
    Object.defineProperty(v, 'cle', { get: () => { lectures.cle++; return `k${i}`; }, enumerable: true });
    Object.defineProperty(v, 'nom', { get: () => { lectures.nom++; return `n${i}`; }, enumerable: true });
    return v;
  });
  const c = catalogue(variables);
  for (let i = 0; i < 1000; i++) variableDuCatalogue(c, `k${i}`);
  for (let i = 0; i < 1000; i++) variableDuCatalogue(c, `n${i}`, 'c');
  assert.equal(lectures.cle, 1000);
  assert.equal(lectures.nom, 1000);
});

import { collectionDuCatalogue, cheminDansLaCollection, type CollectionDuCatalogue } from '../src/controles/index.js';
import { collectionParCle } from '../src/controles/catalogue.js';

function collectionDe(cle: string, nom: string, role: CollectionDuCatalogue['role'] = null): CollectionDuCatalogue {
  return { cle, nom, role, modes: [], etat: 'lue' };
}

test('collections : première occurrence clé ou nom, parité avec la recherche linéaire', () => {
  const collections = [collectionDe('a', 'x'), collectionDe('x', 'b'), collectionDe('c', 'x'), collectionDe('a', 'b'), collectionDe('', '')];
  const c: CatalogueDeReference = { version: 1, library: null, collections, variables: [] };
  for (const requete of ['a', 'x', 'b', 'c', 'inconnue', '']) {
    const attendu = collections.find((e) => e.cle === requete || e.nom === requete) ?? 'absente';
    assert.equal(collectionDuCatalogue(c, requete), attendu, `cleOuNom ${requete}`);
    assert.equal(collectionParCle(c, requete), collections.find((e) => e.cle === requete), `cle ${requete}`);
  }
  assert.equal(collectionDuCatalogue(c, 'x'), collections[0], 'le nom d\'une collection précédente l\'emporte sur la clé d\'une suivante');
  collections.push(collectionDe('z', 'z'));
  assert.equal(collectionDuCatalogue(c, 'z'), collections[5]);
});

test('1 000 recherches de collection lisent chaque collection une fois', () => {
  let lectures = 0;
  const collections = Array.from({ length: 200 }, (_, i) => {
    const e = collectionDe(`k${i}`, `n${i}`);
    Object.defineProperty(e, 'cle', { get: () => { lectures++; return `k${i}`; }, enumerable: true });
    return e;
  });
  const c: CatalogueDeReference = { version: 1, library: null, collections, variables: [] };
  for (let i = 0; i < 1000; i++) {
    assert.equal(collectionParCle(c, `k${i % 200}`), collections[i % 200]);
    assert.equal(collectionDuCatalogue(c, `n${i % 200}`), collections[i % 200]);
  }
  assert.equal(lectures, 200);
});

test('cheminDansLaCollection garde sa sortie avec l\'index', () => {
  const c: CatalogueDeReference = { version: 1, library: null, collections: [collectionDe('l', 'layout', 'layout')], variables: [] };
  assert.deepEqual(cheminDansLaCollection(variable('1', 'layout/radius/md', 'l'), c), ['radius', 'md']);
  assert.deepEqual(cheminDansLaCollection(variable('2', 'radius/md', 'l'), c), ['radius', 'md']);
  assert.deepEqual(cheminDansLaCollection(variable('3', 'layout/radius/md', 'autre'), c), ['layout', 'radius', 'md']);
});
