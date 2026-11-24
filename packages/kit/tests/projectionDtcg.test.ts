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
    marques: { texte: { $type: 'color', $value: srgb(0.1), $extensions: { 'com.ucm.axis': 'brand', 'com.ucm.modes': { acme: srgb(0.1), zen: srgb(0.4, 0.5, 0.6) } } } },
  });
  assert.deepEqual(catalogue.collections[0].modes.map((m) => m.nom), ['acme', 'zen']);
  assert.deepEqual(catalogue.variables[0].valeurs?.zen, { valeur: { r: 0.4, g: 0.5, b: 0.6, a: 1 } });
});

test('le type d\'un groupe se transmet à ses feuilles, et un type composé est sauté et compté', () => {
  const { catalogue, bilan } = catalogueDepuisTokens({
    layouts: {
      sizing: { $type: 'dimension', 1: { $value: { value: 4, unit: 'px' } }, 2: { $value: { value: 8, unit: 'px' } } },
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

test('T2 : seule la forme de FORMAT.md se lit, toute autre forme de couleur ou de dimension est comptée dans valeursSautees', () => {
  const feuilles = (type: string, valeurs: unknown[]) => Object.fromEntries(valeurs.map((valeur, rang) => [`v${rang}`, { $type: type, $value: valeur }]));
  const { catalogue, bilan } = catalogueDepuisTokens({
    theme: {
      dimensions: feuilles('dimension', ['16px', '1rem', 16, { value: 1, unit: 'rem' }, { value: 16, unit: 'px' }]),
      couleurs: feuilles('color', [{ colorSpace: 'srgb', components: [1, 0, 0] }, '#ff0000', '#f00', srgb(1, 0, 0)]),
    },
  });
  const lues = catalogue.variables.map((v) => v.valeurs?.base);
  assert.deepEqual(lues, [
    { valeur: null }, { valeur: null }, { valeur: null }, { valeur: null }, { valeur: 16 },
    { valeur: null }, { valeur: null }, { valeur: null }, { valeur: { r: 1, g: 0, b: 0, a: 1 } },
  ]);
  assert.equal(bilan.valeursSautees, 7);
});

test('T1 : un alias entier se lit comme l’index du kit, et une chaîne mal formée n’est pas un alias', () => {
  const chaines = ['{a b.c}', '{a.b }', '{$a.b}', '{a.`b}', '{a.b$}', '{marque}', '{a.b}'];
  const { bilan } = catalogueDepuisTokens({
    theme: Object.fromEntries(chaines.map((chaine, rang) => [`v${rang}`, { $type: 'color', $value: chaine }])),
  });
  // Les deux premières ne sont pas des références : leur couleur est sautée. Les cinq autres sont des alias.
  assert.deepEqual([bilan.aliasTotal, bilan.valeursSautees], [5, 2]);
});

test('les scopes de Figma passent au catalogue', () => {
  const { catalogue } = catalogueDepuisTokens({ theme: { fond: { $type: 'color', $value: srgb(1, 1, 1), $extensions: { 'com.figma.scopes': ['ALL_FILLS', 7] } } } });
  assert.deepEqual(catalogue.variables[0].scopes, ['ALL_FILLS']);
});

test('une architecture libre ne reconnaît aucun rôle, et un fichier qui n\'est pas un objet est refusé', () => {
  const tokens = { theme: { fond: { $type: 'color', $value: '#ffffff' } } };
  assert.equal(catalogueDepuisTokens(tokens, 'libre').catalogue.collections[0].role, null);
  assert.equal(catalogueDepuisTokens(tokens).catalogue.collections[0].role, 'theme');
  assert.throws(() => catalogueDepuisTokens([]), /n'est pas un objet/);
});
