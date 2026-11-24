/** P27, lot 5.3 : le contrôle des chemins publiés refuse les renommages que `ucm tokens css` refuserait (cas C1 et C3). */
import assert from 'node:assert/strict';
import test from 'node:test';
import { joinTokenPath } from '../src/format/chemins-de-tokens.js';
import { cheminsEnConflit, pairesDejaEnConflit, type InventairePublie } from '../src/nommage/index.js';
import { nomsCssDesTokens } from '@ucm-kit/core/lecteurs';

const collection = { id: 'c', nom: 'components' };
const document = (...variables: readonly (readonly [id: string, nom: string])[]): InventairePublie => ({
  collections: [collection],
  variables: variables.map(([id, nom]) => ({ id, nom, collection: 'c' })),
});

/** Les chemins de l'export après les renommages, rangés comme l'index de `tokens.json`. */
function indexApres(inventaire: InventairePublie, renommages: ReadonlyMap<string, string>): Map<string, unknown> {
  return new Map(inventaire.variables.map((variable) => [joinTokenPath(collection.nom, renommages.get(variable.id) ?? variable.nom), {}]));
}
const collisionsDeLaFeuille = (index: Map<string, unknown>): string[][] => [...nomsCssDesTokens(index).values()].filter((chemins) => chemins.length > 1);

for (const [cas, existant, avant, apres] of [
  ['C1 : un espace et une barre', 'button/bg/hover', 'button/background hover', 'button/bg hover'],
  ['C1 : un tiret bas et une barre', 'button/gap/2', 'button/spacing', 'button/gap_2'],
  ['C1 : une virgule décimale et un point', 'card/radius/0.5', 'card/rounding', 'card/radius 0,5'],
] as const) {
  test(`${cas} : le renommage est refusé avec le motif meme-nom-css`, () => {
    const doc = document(['v1', existant], ['v2', avant]);
    const renommages = new Map([['v2', apres]]);
    const causes = cheminsEnConflit(doc, renommages);
    assert.deepEqual(causes.map(({ id, motif }) => [id, motif]), [['v2', 'meme-nom-css']]);
    assert.equal(causes[0]!.autre, `components/${existant}`);
    // La preuve que le motif dit vrai : la feuille refuse ce que le contrôle refuse.
    assert.equal(collisionsDeLaFeuille(indexApres(doc, renommages)).length, 1);
  });
}

test('C1 : deux renommages qui se rejoignent sur un même nom CSS sont refusés ensemble', () => {
  const doc = document(['v1', 'button/a'], ['v2', 'button/b']);
  const causes = cheminsEnConflit(doc, new Map([['v1', 'button/bg hover'], ['v2', 'button/bg/hover']]));
  assert.deepEqual(causes.map(({ id, motif }) => [id, motif]), [['v1', 'meme-nom-css'], ['v2', 'meme-nom-css']]);
});

test('C1 : un nom CSS déjà partagé avant le renommage ne le bloque pas', () => {
  const doc = document(['v1', 'button/bg/hover'], ['v2', 'button/bg hover'], ['v3', 'button/gap']);
  assert.deepEqual(cheminsEnConflit(doc, new Map([['v2', 'button/Bg Hover'], ['v3', 'button/space']])), []);
  const dejaLa = pairesDejaEnConflit(doc, new Set(['v2']));
  assert.deepEqual(dejaLa, [['v1', 'v2']]);
  assert.deepEqual(cheminsEnConflit(doc, new Map([['v2', 'button/bg  hover']]), dejaLa), []);
});

test('C3 : un renommage sans conflit donne un index que nomsCssDesTokens accepte sans collision', () => {
  const doc = document(['v1', 'button/bg/hover'], ['v2', 'button/background hover'], ['v3', 'card/radius/0.5']);
  const renommages = new Map([['v2', 'button/bg/pressed'], ['v3', 'card/radius/1']]);
  assert.deepEqual(cheminsEnConflit(doc, renommages), []);
  assert.deepEqual(collisionsDeLaFeuille(indexApres(doc, renommages)), []);
});
