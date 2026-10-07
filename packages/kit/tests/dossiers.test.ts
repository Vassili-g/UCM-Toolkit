/** Les crans, états et supports attendus sont indépendants des tables du module. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COULEUR_DU_TEXTE_DES_BOUTONS, DOSSIERS, ETATS, ETAT_DU_FOND,
  NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, TABLE_DES_DOSSIERS,
  TEXTE_DES_BOUTONS_PAR_DEFAUT, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES,
  cranDeLaVariable, cransRequis, sensDuTheme, variablePresente, variablesDuCran,
  type SensDuTheme, type VariableDePalette, type VariableDuTheme,
} from '../src/emplois/index';

const ATTENDUS: [VariableDePalette, number | 'texteDesBoutons', number | 'texteDesBoutons'][] = [
  ['solid/default', 700, 700], ['solid/hover', 800, 600], ['solid/pressed', 900, 500],
  ['solid/foreground', 'texteDesBoutons', 'texteDesBoutons'],
  ['surface/default', 100, 100], ['surface/hover', 200, 200], ['surface/pressed', 300, 300],
  ['surface/foreground', 800, 900], ['surface/border', 800, 900],
  ['page/foreground', 700, 800], ['page/border', 700, 800], ['page/divider', 300, 300], ['page/focus', 600, 700],
];
const CRANS = [100, 200, 300, 500, 600, 700, 800, 900];

test('les quatre combinaisons du thème et du texte des boutons', () => {
  assert.deepEqual(COULEUR_DU_TEXTE_DES_BOUTONS, { blanc: '#FFFFFF', noir: '#000000' });
  assert.deepEqual(TEXTE_DES_BOUTONS_PAR_DEFAUT, { light: 'blanc', dark: 'noir' });
  assert.equal(sensDuTheme('light', 'blanc'), 'normal');
  assert.equal(sensDuTheme('light', 'noir'), 'inverse');
  assert.equal(sensDuTheme('dark', 'noir'), 'normal');
  assert.equal(sensDuTheme('dark', 'blanc'), 'inverse');
});

test('les treize variables suivent la table dans les deux sens', () => {
  assert.deepEqual(DOSSIERS, ['solid', 'surface', 'page']);
  assert.deepEqual(VARIABLES_DE_PALETTE, ATTENDUS.map(([variable]) => variable));
  for (const [sens, colonne] of [['normal', 1], ['inverse', 2]] as const) {
    assert.deepEqual(TABLE_DES_DOSSIERS[sens], Object.fromEntries(ATTENDUS.map((ligne) => [ligne[0], ligne[colonne]])));
    for (const ligne of ATTENDUS) assert.equal(cranDeLaVariable(ligne[0], sens), ligne[colonne]);
  }
});

test('les crans requis ne comprennent ni 50, ni 400, ni 950 ; 500 dépend du sens', () => {
  assert.deepEqual(cransRequis('normal'), [100, 200, 300, 600, 700, 800, 900]);
  assert.deepEqual(cransRequis('inverse'), [100, 200, 300, 500, 600, 700, 800, 900]);
});

test('chaque variable numérique exige son cran, les couleurs pures et les élévations restent présentes', () => {
  for (const sens of ['normal', 'inverse'] as const) {
    for (const [variable, normal, inverse] of ATTENDUS) {
      const cran = sens === 'normal' ? normal : inverse;
      assert.equal(variablePresente(variable, CRANS, sens), true);
      assert.equal(variablePresente(variable, [], sens), cran === 'texteDesBoutons');
      if (typeof cran === 'number') assert.equal(variablePresente(variable, CRANS.filter((c) => c !== cran), sens), false);
    }
    for (const variable of ['page/foreground-main', 'scale/0', 'scale/1000', 'elevation/page', 'elevation/raised'] as const) {
      assert.equal(cranDeLaVariable(variable, sens), undefined);
      assert.equal(variablePresente(variable, [], sens), true);
    }
  }
});

test('le neutre et les variables globales ajoutent leurs crans sans remplacer une variable de palette', () => {
  assert.deepEqual(VARIABLES_DU_NEUTRE, ['page/foreground-main', 'page/foreground-subtle', 'scale/0', 'scale/1000']);
  assert.deepEqual(VARIABLES_GLOBALES, ['disabled/background', 'disabled/foreground', 'disabled/border']);
  assert.deepEqual(NIVEAUX_D_ELEVATION_DU_THEME, ['page', 'raised']);
  for (const sens of ['normal', 'inverse'] as const) {
    assert.equal(cranDeLaVariable('page/foreground-subtle', sens), sens === 'normal' ? 700 : 800);
    for (const [variable, cran] of [['disabled/background', 200], ['disabled/foreground', 500], ['disabled/border', 500]] as const) {
      assert.equal(cranDeLaVariable(variable, sens), cran);
      assert.equal(variablePresente(variable, [], sens), false);
    }
  }
});

test('les variables du cran respectent les indices, le sens et le supplément du neutre', () => {
  const variables = (cran: number, sens: SensDuTheme, neutre = false) => variablesDuCran(CRANS, CRANS.indexOf(cran), sens, neutre);
  assert.deepEqual(variables(700, 'normal'), ['solid/default', 'page/foreground', 'page/border']);
  assert.deepEqual(variables(600, 'inverse'), ['solid/hover']);
  assert.deepEqual(variables(700, 'normal', true), ['solid/default', 'page/foreground', 'page/border', 'page/foreground-subtle']);
  assert.deepEqual(variables(500, 'normal', true), ['disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(500, 'inverse', true), ['solid/pressed', 'disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(200, 'inverse', true), ['surface/hover', 'disabled/background']);
  assert.deepEqual(variables(800, 'inverse', true), ['page/foreground', 'page/border', 'page/foreground-subtle']);
  for (const rang of [-1, CRANS.length, 0.5, NaN]) assert.deepEqual(variablesDuCran(CRANS, rang, 'normal', true), []);
  assert.deepEqual(variablesDuCran([], 0, 'normal', true), []);
});

test('repos, survol, appui, focus et désactivation ; la sélection ne reçoit pas de cible', () => {
  assert.deepEqual(ETATS, ['default', 'hover', 'pressed']);
  assert.deepEqual(ETAT_DU_FOND, {
    repos: { etat: 'default' }, survol: { etat: 'hover' }, appui: { etat: 'pressed' },
    focus: { etat: 'default', anneau: 'page/focus' },
    desactive: { variables: ['disabled/background', 'disabled/foreground', 'disabled/border'] },
  });
});

test('chaque variable porte le support et les portées Figma prescrits', () => {
  const groupes: [VariableDuTheme[], string[], string[]][] = [
    [['solid/default', 'solid/hover', 'solid/pressed'], ['background', 'border'], ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR']],
    [['surface/default', 'surface/hover', 'surface/pressed', 'disabled/background', 'elevation/page', 'elevation/raised'], ['background'], ['FRAME_FILL', 'SHAPE_FILL']],
    [['solid/foreground', 'surface/foreground', 'page/foreground', 'page/foreground-main', 'page/foreground-subtle', 'disabled/foreground'], ['foreground', 'icon'], ['TEXT_FILL', 'SHAPE_FILL']],
    [['surface/border', 'page/border', 'page/divider', 'disabled/border'], ['border'], ['STROKE_COLOR']],
    [['page/focus'], ['ring'], ['STROKE_COLOR']],
    [['scale/0', 'scale/1000'], [], []],
  ];
  assert.deepEqual(Object.keys(SUPPORT_DES_VARIABLES).sort(), groupes.flatMap(([variables]) => variables).sort());
  for (const [variables, peint, portees] of groupes) {
    for (const variable of variables) assert.deepEqual(SUPPORT_DES_VARIABLES[variable], { peint, portees });
  }
});
