/** Les crans, états et supports attendus sont indépendants des tables du module. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COULEUR_DU_TEXTE_DES_BOUTONS, DOSSIERS, ETATS, ETAT_DU_FOND,
  NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, TABLE_DES_DOSSIERS,
  TEXTE_DES_BOUTONS_PAR_DEFAUT, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES,
  cranDeLaVariable, cransRequis, rangDuCranLeger, sensDuTheme, variablePresente, variablesDuCran,
  type ModeDuTheme, type SensDuTheme, type VariableDePalette, type VariableDuTheme,
} from '../src/emplois/index';

type Cran = number | 'texteDesBoutons';
/** Une ligne par variable ; les colonnes sont Light normal, Light inversé, Dark normal, Dark inversé. */
const ATTENDUS: [VariableDePalette, Cran, Cran, Cran, Cran][] = [
  ['solid/default', 700, 700, 700, 700], ['solid/hover', 800, 600, 800, 600], ['solid/pressed', 900, 500, 900, 500],
  ['solid/foreground', 'texteDesBoutons', 'texteDesBoutons', 'texteDesBoutons', 'texteDesBoutons'],
  ['surface/default', 100, 100, 300, 300], ['surface/hover', 200, 200, 400, 400], ['surface/pressed', 300, 300, 500, 500],
  ['surface/foreground', 800, 900, 950, 950], ['surface/border', 800, 900, 950, 950],
  ['page/foreground', 700, 800, 700, 800], ['page/border', 700, 800, 700, 800], ['page/divider', 300, 300, 300, 300], ['ring', 600, 700, 600, 700],
];
const COLONNES = [['light', 'normal', 1], ['light', 'inverse', 2], ['dark', 'normal', 3], ['dark', 'inverse', 4]] as const;
const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

test('les quatre combinaisons du thème et du texte des boutons', () => {
  assert.deepEqual(COULEUR_DU_TEXTE_DES_BOUTONS, { blanc: '#FFFFFF', noir: '#000000' });
  assert.deepEqual(TEXTE_DES_BOUTONS_PAR_DEFAUT, { light: 'blanc', dark: 'noir' });
  assert.equal(sensDuTheme('light', 'blanc'), 'normal');
  assert.equal(sensDuTheme('light', 'noir'), 'inverse');
  assert.equal(sensDuTheme('dark', 'noir'), 'normal');
  assert.equal(sensDuTheme('dark', 'blanc'), 'inverse');
});

test('les treize variables suivent la table de chaque thème et de chaque sens', () => {
  assert.deepEqual(DOSSIERS, ['solid', 'surface', 'page']);
  assert.deepEqual(VARIABLES_DE_PALETTE, ATTENDUS.map(([variable]) => variable));
  for (const [mode, sens, colonne] of COLONNES) {
    assert.deepEqual(TABLE_DES_DOSSIERS[mode][sens], Object.fromEntries(ATTENDUS.map((ligne) => [ligne[0], ligne[colonne]])), `${mode} ${sens}`);
    for (const ligne of ATTENDUS) assert.equal(cranDeLaVariable(ligne[0], mode, sens), ligne[colonne], `${mode} ${sens} ${ligne[0]}`);
  }
});

test('le Dark monte les surfaces aux crans 300 à 500 et leur texte au 950, le reste suit le Light', () => {
  for (const sens of ['normal', 'inverse'] as const) {
    const light = TABLE_DES_DOSSIERS.light[sens];
    const dark = TABLE_DES_DOSSIERS.dark[sens];
    const changees = VARIABLES_DE_PALETTE.filter((variable) => light[variable] !== dark[variable]);
    assert.deepEqual(changees, ['surface/default', 'surface/hover', 'surface/pressed', 'surface/foreground', 'surface/border']);
  }
});

test('les crans requis ne comprennent ni 50 ni 400 en Light ; 500 dépend du sens ; le Dark déduit les siens de sa table', () => {
  assert.deepEqual(cransRequis('light', 'normal'), [100, 200, 300, 600, 700, 800, 900]);
  assert.deepEqual(cransRequis('light', 'inverse'), [100, 200, 300, 500, 600, 700, 800, 900]);
  assert.deepEqual(cransRequis('dark', 'normal'), [300, 400, 500, 600, 700, 800, 900, 950]);
  assert.deepEqual(cransRequis('dark', 'inverse'), [300, 400, 500, 600, 700, 800, 950]);
});

test('chaque variable numérique exige son cran, les couleurs pures et les élévations restent présentes', () => {
  for (const [mode, sens, colonne] of COLONNES) {
    for (const ligne of ATTENDUS) {
      const [variable] = ligne;
      const cran = ligne[colonne];
      assert.equal(variablePresente(variable, CRANS, mode, sens), true);
      assert.equal(variablePresente(variable, [], mode, sens), cran === 'texteDesBoutons');
      if (typeof cran === 'number') assert.equal(variablePresente(variable, CRANS.filter((c) => c !== cran), mode, sens), false, `${mode} ${sens} ${variable}`);
    }
    for (const variable of ['page/foreground-main', 'scale/0', 'scale/1000', 'elevation/page', 'elevation/raised'] as const) {
      assert.equal(cranDeLaVariable(variable, mode, sens), undefined);
      assert.equal(variablePresente(variable, [], mode, sens), true);
    }
  }
});

test('le neutre et les variables globales ajoutent leurs crans sans remplacer une variable de palette', () => {
  assert.deepEqual(VARIABLES_DU_NEUTRE, ['page/foreground-main', 'page/foreground-subtle', 'scale/0', 'scale/1000']);
  assert.deepEqual(VARIABLES_GLOBALES, ['disabled/background', 'disabled/foreground', 'disabled/border']);
  assert.deepEqual(NIVEAUX_D_ELEVATION_DU_THEME, ['page', 'raised']);
  for (const [mode, sens] of COLONNES) {
    assert.equal(cranDeLaVariable('page/foreground-subtle', mode, sens), sens === 'normal' ? 700 : 800);
    for (const [variable, cran] of [['disabled/background', 200], ['disabled/foreground', 500], ['disabled/border', 500]] as const) {
      assert.equal(cranDeLaVariable(variable, mode, sens), cran);
      assert.equal(variablePresente(variable, [], mode, sens), false);
    }
  }
});

test('les variables du cran respectent les indices, le thème, le sens et le supplément du neutre', () => {
  const variables = (cran: number, mode: ModeDuTheme, sens: SensDuTheme, neutre = false) => variablesDuCran(CRANS, CRANS.indexOf(cran), mode, sens, neutre);
  assert.deepEqual(variables(700, 'light', 'normal'), ['solid/default', 'page/foreground', 'page/border']);
  assert.deepEqual(variables(600, 'light', 'inverse'), ['solid/hover']);
  assert.deepEqual(variables(700, 'light', 'normal', true), ['solid/default', 'page/foreground', 'page/border', 'page/foreground-subtle']);
  assert.deepEqual(variables(500, 'light', 'normal', true), ['disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(500, 'light', 'inverse', true), ['solid/pressed', 'disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(200, 'light', 'inverse', true), ['surface/hover', 'disabled/background']);
  assert.deepEqual(variables(800, 'light', 'inverse', true), ['page/foreground', 'page/border', 'page/foreground-subtle']);
  assert.deepEqual(variables(300, 'dark', 'normal'), ['surface/default', 'page/divider']);
  assert.deepEqual(variables(400, 'dark', 'normal'), ['surface/hover']);
  assert.deepEqual(variables(500, 'dark', 'inverse', true), ['solid/pressed', 'surface/pressed', 'disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(950, 'dark', 'normal'), ['surface/foreground', 'surface/border']);
  assert.deepEqual(variables(950, 'light', 'normal'), []);
  for (const rang of [-1, CRANS.length, 0.5, NaN]) assert.deepEqual(variablesDuCran(CRANS, rang, 'light', 'normal', true), []);
  assert.deepEqual(variablesDuCran([], 0, 'dark', 'normal', true), []);
});

test('repos, survol, appui, focus et désactivation ; la sélection ne reçoit pas de cible', () => {
  assert.deepEqual(ETATS, ['default', 'hover', 'pressed']);
  assert.deepEqual(ETAT_DU_FOND, {
    repos: { etat: 'default' }, survol: { etat: 'hover' }, appui: { etat: 'pressed' },
    focus: { etat: 'default', anneau: 'ring' },
    desactive: { variables: ['disabled/background', 'disabled/foreground', 'disabled/border'] },
  });
});

test('chaque variable porte le support et les portées Figma prescrits', () => {
  const groupes: [VariableDuTheme[], string[], string[]][] = [
    [['solid/default', 'solid/hover', 'solid/pressed'], ['background', 'border'], ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR']],
    [['surface/default', 'surface/hover', 'surface/pressed', 'disabled/background', 'elevation/page', 'elevation/raised'], ['background'], ['FRAME_FILL', 'SHAPE_FILL']],
    [['solid/foreground', 'surface/foreground', 'page/foreground', 'page/foreground-main', 'page/foreground-subtle', 'disabled/foreground'], ['foreground', 'icon'], ['TEXT_FILL', 'SHAPE_FILL']],
    [['surface/border', 'page/border', 'page/divider', 'disabled/border'], ['border'], ['STROKE_COLOR']],
    [['ring'], ['ring'], ['STROKE_COLOR']],
    [['scale/0', 'scale/1000'], [], []],
  ];
  assert.deepEqual(Object.keys(SUPPORT_DES_VARIABLES).sort(), groupes.flatMap(([variables]) => variables).sort());
  for (const [variables, peint, portees] of groupes) {
    for (const variable of variables) assert.deepEqual(SUPPORT_DES_VARIABLES[variable], { peint, portees });
  }
});

test('le rang du cran léger est l’indice du plus petit numéro de la liste', () => {
  assert.equal(rangDuCranLeger([50, 100, 200, 300]), 0);
  assert.equal(rangDuCranLeger([100, 200, 300]), 0);
  assert.equal(rangDuCranLeger([300, 100, 200, 50, 400]), 3);
  assert.equal(rangDuCranLeger([300, 100, 200]), 1);
});
