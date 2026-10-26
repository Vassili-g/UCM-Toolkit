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
