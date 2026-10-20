/**
 * Le chemin d'un token suit le nom de la collection Figma, pas le référentiel.
 * Les couches `brands`, `utility` et `layout` donnent leurs préfixes ; une
 * collection encore nommée `color-brands` garde le sien.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenCssVariable } from '@ucm-kit/core/format';

import { collection, exporterLeFichier, rgba, variable } from './fichierDeVariables';

const blanc = rgba(1, 1, 1, 1);
const noir = rgba(0, 0, 0, 1);

async function exporter(collections: VariableCollection[], variables: Variable[]) {
  const exporte = await exporterLeFichier({ fichier: { collections, variables, textStyles: [] } });
  return JSON.parse(exporte.content);
}

test('des collections Brands, Utility et Layout donnent les chemins brands, utility et layout', async () => {
  const marques = collection('marques', 'Brands', ['Mode 1']);
  const utilitaires = collection('utilitaires', 'Utility', ['Mode 1']);
  const mise = collection('mise', 'Layout', ['Mode 1']);
  const tokens = await exporter([marques, utilitaires, mise], [
    variable(marques, 'm1', 'primary/solid', 'COLOR', [blanc]),
    variable(utilitaires, 'u1', 'danger/solid', 'COLOR', [noir]),
    variable(mise, 'l1', 'spacing/base', 'FLOAT', [8]),
  ]);

  assert.deepEqual(tokens.brands.primary.solid.$value, { colorSpace: 'srgb', components: [1, 1, 1], alpha: 1 });
  assert.deepEqual(tokens.utility.danger.solid.$value, { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1 });
  assert.equal(tokens.layout.spacing.base.$type, 'dimension');
  assert.equal(tokenCssVariable('utility.danger.solid'), '--utility-danger-solid');
});

test('une collection Brands à plusieurs modes donne l’axe brands', async () => {
  const marques = collection('marques', 'Brands', ['A', 'B']);
  const tokens = await exporter([marques], [variable(marques, 'm1', 'primary', 'COLOR', [blanc, noir])]);

  assert.deepEqual(Object.keys(tokens.$extensions['com.ucm.axes']), ['brands']);
  assert.equal(tokens.brands.primary.$extensions['com.ucm.axis'], 'brands');
});

test('une collection encore nommée color-brands garde le chemin color-brands', async () => {
  const marques = collection('marques', 'color-brands', ['Mode 1']);
  const tokens = await exporter([marques], [variable(marques, 'm1', 'primary/solid', 'COLOR', [blanc])]);

  assert.ok(tokens['color-brands'].primary.solid);
  assert.equal(tokens.brands, undefined);
});
