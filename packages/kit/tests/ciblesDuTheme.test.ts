/** Ce que vise chaque variable du thème, et le sens qu'on en déduit pour une palette. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CIBLES_ABSOLUES_DU_NEUTRE, VARIABLES_DU_THEME, cibleDeLaVariable, sensDeLaPalette, sensDuTheme, texteDesBoutonsDuSens,
  type ModeDuTheme, type SensDuTheme,
} from '../src/emplois/index';
import { REGISTRE_COULEURS_ABSOLUES } from '../src/referentiel/architecture';

const MODES: ModeDuTheme[] = ['light', 'dark'];
const SENS: SensDuTheme[] = ['normal', 'inverse'];

test('le texte des boutons d\'un sens est l\'inverse de sensDuTheme', () => {
  assert.equal(texteDesBoutonsDuSens('light', 'normal'), 'blanc');
  assert.equal(texteDesBoutonsDuSens('dark', 'normal'), 'noir');
  assert.equal(texteDesBoutonsDuSens('light', 'inverse'), 'noir');
  assert.equal(texteDesBoutonsDuSens('dark', 'inverse'), 'blanc');
  for (const mode of MODES) for (const sens of SENS) assert.equal(sensDuTheme(mode, texteDesBoutonsDuSens(mode, sens)), sens);
});

test('chaque variable du thème vise quelque chose, sauf les élévations', () => {
  for (const variable of VARIABLES_DU_THEME) for (const mode of MODES) for (const sens of SENS) {
    const cible = cibleDeLaVariable(variable, mode, sens);
    if (variable.startsWith('elevation/')) assert.equal(cible, undefined, variable);
    else assert.notEqual(cible, undefined, `${variable} ${mode} ${sens}`);
  }
  assert.deepEqual(cibleDeLaVariable('solid/foreground', 'light', 'normal'), { absolue: 'white' });
  assert.deepEqual(cibleDeLaVariable('solid/foreground', 'light', 'inverse'), { absolue: 'black' });
  assert.deepEqual(cibleDeLaVariable('solid/hover', 'dark', 'inverse'), { cran: 600 });
  assert.deepEqual(cibleDeLaVariable('scale/0', 'dark', 'normal'), { absolue: 'black' });
});

test('les couleurs absolues visées sont celles du registre', () => {
  const valeurs = new Set(Object.values(CIBLES_ABSOLUES_DU_NEUTRE).flatMap((parMode) => Object.values(parMode)));
  assert.deepEqual([...valeurs].sort(), REGISTRE_COULEURS_ABSOLUES.termes.map((terme) => terme.id).sort());
});

test('le sens d\'une palette se déduit des variables qui le départagent', () => {
  assert.equal(sensDeLaPalette('light', {
    'solid/hover': { cran: 800 }, 'page/foreground': { cran: 700 }, 'ring': { cran: 600 }, 'solid/foreground': { absolue: 'white' },
  }), 'normal');
  assert.equal(sensDeLaPalette('dark', {
    'solid/hover': { cran: 600 }, 'page/foreground': { cran: 800 }, 'ring': { cran: 700 }, 'solid/foreground': { absolue: 'white' },
  }), 'inverse');
  assert.equal(sensDeLaPalette('light', { 'solid/hover': { cran: 800 }, 'page/foreground': { cran: 800 } }), 'ambigu');
  assert.equal(sensDeLaPalette('light', { 'surface/default': { cran: 100 }, 'surface/subtle': { cran: 50 } }), 'inconnu');
  assert.equal(sensDeLaPalette('dark', { 'ring': { cran: 700 } }), 'inconnu');
});
