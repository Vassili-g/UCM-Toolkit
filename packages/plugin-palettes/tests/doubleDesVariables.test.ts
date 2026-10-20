/** Les injections du double portent sur les gestes Figma que l'écriture restaure. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { FauxFigma } from './figmaDeTest';

test('le double refuse les homonymes par défaut et les admet sur option', () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Couleurs');
  figma.variables.createVariable('bleu', collection, 'COLOR');
  assert.throws(() => figma.variables.createVariable('bleu', collection, 'COLOR'), /duplicate/);
  const autre = figma.variables.createVariable('autre', collection, 'COLOR');
  assert.throws(() => { autre.name = 'bleu'; }, /duplicate/);
  figma.accepterLesDoublons = true;
  figma.variables.createVariable('bleu', collection, 'COLOR');
  autre.name = 'bleu';
  assert.equal(figma.variablesDe(collection).filter((variable) => variable.name === 'bleu').length, 3);
});

test('les injections de création, valeur et marqueur refusent une seule opération au rang choisi', () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Couleurs');
  figma.echouerALaCreation = 1;
  const variable = figma.variables.createVariable('bleu', collection, 'COLOR');
  assert.throws(() => figma.variables.createVariable('rouge', collection, 'COLOR'), /création/);
  figma.variables.createVariable('rouge', collection, 'COLOR');
  const valeur = { r: 0, g: 0, b: 0, a: 1 };
  figma.echouerALaValeur = 1;
  variable.setValueForMode(collection.defaultModeId, valeur);
  assert.throws(() => variable.setValueForMode(collection.defaultModeId, valeur), /valeur/);
  variable.setValueForMode(collection.defaultModeId, valeur);
  figma.echouerAuMarqueur = 1;
  variable.setSharedPluginData('ucm_palettes', 'palette', 'p');
  assert.throws(() => variable.setSharedPluginData('ucm_palettes', 'cle', 'c'), /marqueur/);
  variable.setSharedPluginData('ucm_palettes', 'cle', 'c');
});

test('le retrait de modes et de collections nettoie les variables et se journalise', () => {
  const figma = new FauxFigma();
  const collection = figma.variables.createVariableCollection('Couleurs');
  const mode = collection.addMode('Dark');
  const variable = figma.variables.createVariable('bleu', collection, 'COLOR');
  figma.retraitsRefuses = true;
  assert.throws(() => variable.remove(), /retrait/);
  assert.throws(() => collection.removeMode(mode), /retrait/);
  assert.throws(() => collection.remove(), /retrait/);
  figma.retraitsRefuses = false;
  collection.removeMode(mode);
  assert.equal(variable.valuesByMode[mode], undefined);
  assert.ok(figma.journal.includes('retirer mode Dark'));
  collection.remove();
  assert.equal(figma.collections.size, 0);
  assert.equal(figma.locales.size, 0);
  assert.ok(figma.journal.includes('retirer collection Couleurs'));
});

test('le refus de rangement à la racine ne touche pas les autres clés', () => {
  const figma = new FauxFigma();
  figma.rangementsRefuses.add('ucm_palettes/variables');
  assert.throws(() => figma.root.setSharedPluginData('ucm_palettes', 'variables', '{}'), /rangement/);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', '{}');
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'variables'), '');
  assert.equal(figma.root.getSharedPluginData('ucm_palettes', 'recette'), '{}');
});
