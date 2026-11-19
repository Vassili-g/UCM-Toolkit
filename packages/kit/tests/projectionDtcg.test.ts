/**
 * La projection d'un `tokens.json` en catalogue : collections et modes, types portés et sautés, alias résolus ou non, valeurs sans
 * forme portable. Le rejeu des fichiers réels et `ucm check` lisent la même projection.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogueDepuisTokens } from '../src/controles/index.js';

const srgb = (r: number, g = 0.2, b = 0.3) => ({ colorSpace: 'srgb', components: [r, g, b], alpha: 1 });

test('une racine sans `$` est une collection, et ses modes viennent de l\'axe de même nom, sinon `base`', () => {
  const { catalogue, bilan } = catalogueDepuisTokens({
    $extensions: { 'com.ucm.axes': { theme: { modes: ['light', 'dark'], default: 'light' } } },
    primitives: { red: { 500: { $type: 'color', $value: srgb(0.9) } } },
    theme: { page: { bg: { $type: 'color', $value: '{primitives.red.500}' } } },
  });
  assert.deepEqual(catalogue.collections.map((c) => [c.cle, c.role, c.modes.map((m) => m.nom)]), [['primitives', 'primitives', ['base']], ['theme', 'theme', ['light', 'dark']]]);
  assert.deepEqual(catalogue.variables.map((v) => v.cle), ['primitives|red/500', 'theme|page/bg']);
  assert.equal(bilan.collections, 2);
  assert.equal(bilan.collectionsAvecAxes, 1);
});

test('une collection sans axe de son nom prend l\'unique axe que ses feuilles nomment', () => {
  const { catalogue } = catalogueDepuisTokens({
    $extensions: { 'com.ucm.axes': { brand: { modes: ['acme', 'zen'], default: 'acme' } } },
    marques: { texte: { $type: 'color', $value: '#112233', $extensions: { 'com.ucm.axis': 'brand', 'com.ucm.modes': { acme: '#112233', zen: '#445566' } } } },
  });
  assert.deepEqual(catalogue.collections[0].modes.map((m) => m.nom), ['acme', 'zen']);
  assert.deepEqual(catalogue.variables[0].valeurs?.zen, { valeur: { r: 0x44 / 255, g: 0x55 / 255, b: 0x66 / 255, a: 1 } });
});

test('le type d\'un groupe se transmet à ses feuilles, et un type composé est sauté et compté', () => {
  const { catalogue, bilan } = catalogueDepuisTokens({
    layouts: {
      sizing: { $type: 'dimension', 1: { $value: { value: 4, unit: 'px' } }, 2: { $value: '8px' } },
      ombre: { $type: 'shadow', $value: { offsetX: 0 } },
      libre: { $value: 3 },
    },
  });
  assert.deepEqual(catalogue.variables.map((v) => [v.nom, v.type, v.valeurs?.base]), [
    ['sizing/1', 'FLOAT', { valeur: 4 }],
    ['sizing/2', 'FLOAT', { valeur: 8 }],
  ]);
  assert.deepEqual([bilan.variables, bilan.jetonsSautes, bilan.jetonsSautesParType], [2, 2, { shadow: 1, '(sans type)': 1 }]);
});

test('un alias résolu vise la clé de sa cible, un alias absent garde la clé que son chemin donnerait, et le bilan les sépare', () => {
  const { catalogue, bilan } = catalogueDepuisTokens({
    primitives: { red: { 500: { $type: 'color', $value: srgb(0.9) } } },
    typo: { h1: { $type: 'typography', $value: { fontSize: 12 } } },
    theme: {
      a: { $type: 'color', $value: '{primitives.red.500}' },
      b: { $type: 'color', $value: '{primitives.absente.500}' },
      c: { $type: 'color', $value: '{typo.h1}' },
    },
  });
  const valeur = (nom: string) => catalogue.variables.find((v) => v.nom === nom)!.valeurs?.base;
  assert.deepEqual(valeur('a'), { alias: 'primitives|red/500' });
  assert.deepEqual(valeur('b'), { alias: 'primitives|absente/500' });
  assert.deepEqual(valeur('c'), { alias: 'typo|h1' });
  assert.deepEqual([bilan.aliasTotal, bilan.aliasResolus, bilan.aliasNonResolus, bilan.aliasVersJetonSaute], [3, 1, 2, 1]);
});

test('une valeur sans forme portable devient `null`, et un mode hors de l\'axe est compté', () => {
  const { catalogue, bilan } = catalogueDepuisTokens({
    $extensions: { 'com.ucm.axes': { theme: { modes: ['light'], default: 'light' } } },
    theme: { fond: { $type: 'color', $value: { colorSpace: 'display-p3', components: [1, 0, 0] }, $extensions: { 'com.ucm.modes': { dark: '#000000' } } } },
  });
  assert.deepEqual(catalogue.variables[0].valeurs, { light: { valeur: null } });
  assert.equal(bilan.valeursSautees, 1);
  assert.equal(bilan.modesHorsAxe, 1);
});

test('les scopes de Figma passent au catalogue', () => {
  const { catalogue } = catalogueDepuisTokens({ theme: { fond: { $type: 'color', $value: '#ffffff', $extensions: { 'com.figma.scopes': ['ALL_FILLS', 7] } } } });
  assert.deepEqual(catalogue.variables[0].scopes, ['ALL_FILLS']);
});

test('une architecture libre ne reconnaît aucun rôle, et un fichier qui n\'est pas un objet est refusé', () => {
  const tokens = { theme: { fond: { $type: 'color', $value: '#ffffff' } } };
  assert.equal(catalogueDepuisTokens(tokens, 'libre').catalogue.collections[0].role, null);
  assert.equal(catalogueDepuisTokens(tokens).catalogue.collections[0].role, 'theme');
  assert.throws(() => catalogueDepuisTokens([]), /n'est pas un objet/);
});
