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
  ['surface/subtle', 50, 50, 200, 200], ['surface/foreground', 700, 900, 950, 950], ['surface/border', 700, 900, 950, 950],
  ['surface/divider', 300, 300, 500, 500],
  ['page/foreground', 700, 800, 700, 800], ['page/border', 700, 800, 700, 800], ['page/divider', 300, 300, 300, 300], ['ring', 600, 700, 600, 800],
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

test('les quinze variables suivent la table de chaque thème et de chaque sens', () => {
  assert.deepEqual(DOSSIERS, ['solid', 'surface', 'page']);
  assert.deepEqual(VARIABLES_DE_PALETTE, ATTENDUS.map(([variable]) => variable));
  for (const [mode, sens, colonne] of COLONNES) {
    assert.deepEqual(TABLE_DES_DOSSIERS[mode][sens], Object.fromEntries(ATTENDUS.map((ligne) => [ligne[0], ligne[colonne]])), `${mode} ${sens}`);
    for (const ligne of ATTENDUS) assert.equal(cranDeLaVariable(ligne[0], mode, sens), ligne[colonne], `${mode} ${sens} ${ligne[0]}`);
  }
});

test('le Dark monte les surfaces et leur texte, et l’anneau du sens inversé ; le reste suit le Light', () => {
  const surfaces = ['surface/default', 'surface/hover', 'surface/pressed', 'surface/subtle', 'surface/foreground', 'surface/border', 'surface/divider'];
  for (const sens of ['normal', 'inverse'] as const) {
    const light = TABLE_DES_DOSSIERS.light[sens];
    const dark = TABLE_DES_DOSSIERS.dark[sens];
    const changees = VARIABLES_DE_PALETTE.filter((variable) => light[variable] !== dark[variable]);
    assert.deepEqual(changees, sens === 'normal' ? surfaces : [...surfaces, 'ring']);
  }
});

test('le texte et le contour de surface sont au 700 en Light normal, au 900 en Light inversé', () => {
  for (const variable of ['surface/foreground', 'surface/border'] as const) {
    assert.equal(TABLE_DES_DOSSIERS.light.normal[variable], 700);
    assert.equal(TABLE_DES_DOSSIERS.light.inverse[variable], 900);
  }
});

test('surface/subtle vaut 50 en Light et 200 en Dark, surface/divider 300 en Light et 500 en Dark, dans les deux sens', () => {
  for (const sens of ['normal', 'inverse'] as const) {
    assert.equal(cranDeLaVariable('surface/subtle', 'light', sens), 50);
    assert.equal(cranDeLaVariable('surface/subtle', 'dark', sens), 200);
    assert.equal(cranDeLaVariable('surface/divider', 'light', sens), 300);
    assert.equal(cranDeLaVariable('surface/divider', 'dark', sens), 500);
  }
});

test('l’anneau du Dark inversé est au 800, celui du Dark normal reste au 600', () => {
  assert.equal(TABLE_DES_DOSSIERS.dark.inverse.ring, 800);
  assert.equal(TABLE_DES_DOSSIERS.dark.normal.ring, 600);
});

test('les crans requis réunissent ceux de la table : le 50 en Light, le 200 en Dark, jamais le 400 en Light ; 500 dépend du sens', () => {
  assert.deepEqual(cransRequis('light', 'normal'), [50, 100, 200, 300, 600, 700, 800, 900]);
  assert.deepEqual(cransRequis('light', 'inverse'), [50, 100, 200, 300, 500, 600, 700, 800, 900]);
  assert.deepEqual(cransRequis('dark', 'normal'), [200, 300, 400, 500, 600, 700, 800, 900, 950]);
  assert.deepEqual(cransRequis('dark', 'inverse'), [200, 300, 400, 500, 600, 700, 800, 950]);
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
  assert.deepEqual(variables(700, 'light', 'normal'), ['solid/default', 'surface/foreground', 'surface/border', 'page/foreground', 'page/border']);
  assert.deepEqual(variables(50, 'light', 'normal'), ['surface/subtle']);
  assert.deepEqual(variables(300, 'light', 'normal'), ['surface/pressed', 'surface/divider', 'page/divider']);
  assert.deepEqual(variables(200, 'dark', 'normal'), ['surface/subtle']);
  assert.deepEqual(variables(600, 'light', 'inverse'), ['solid/hover']);
  assert.deepEqual(variables(700, 'light', 'normal', true), ['solid/default', 'surface/foreground', 'surface/border', 'page/foreground', 'page/border', 'page/foreground-subtle']);
  assert.deepEqual(variables(500, 'light', 'normal', true), ['disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(500, 'light', 'inverse', true), ['solid/pressed', 'disabled/foreground', 'disabled/border']);
  assert.deepEqual(variables(200, 'light', 'inverse', true), ['surface/hover', 'disabled/background']);
  assert.deepEqual(variables(800, 'light', 'inverse', true), ['page/foreground', 'page/border', 'page/foreground-subtle']);
  assert.deepEqual(variables(300, 'dark', 'normal'), ['surface/default', 'page/divider']);
  assert.deepEqual(variables(400, 'dark', 'normal'), ['surface/hover']);
  assert.deepEqual(variables(500, 'dark', 'inverse', true), ['solid/pressed', 'surface/pressed', 'surface/divider', 'disabled/foreground', 'disabled/border']);
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
    [['solid/default', 'solid/hover', 'solid/pressed', 'surface/default', 'surface/hover', 'surface/pressed', 'surface/subtle', 'disabled/background', 'elevation/page', 'elevation/raised'], ['background'], ['FRAME_FILL', 'SHAPE_FILL']],
    [['solid/foreground', 'surface/foreground', 'page/foreground', 'page/foreground-main', 'page/foreground-subtle', 'disabled/foreground'], ['foreground', 'icon'], ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']],
    [['page/divider', 'surface/divider'], ['border'], ['STROKE_COLOR', 'FRAME_FILL', 'SHAPE_FILL']],
    [['surface/border', 'page/border', 'disabled/border'], ['border'], ['STROKE_COLOR']],
    [['ring'], ['ring'], ['STROKE_COLOR']],
    [['scale/0', 'scale/1000'], [], []],
  ];
  assert.deepEqual(Object.keys(SUPPORT_DES_VARIABLES).sort(), groupes.flatMap(([variables]) => variables).sort());
  for (const [variables, peint, portees] of groupes) {
    for (const variable of variables) assert.deepEqual(SUPPORT_DES_VARIABLES[variable], { peint, portees });
  }
});

test('les fonds du bouton plein sont des fonds : ni contour ni STROKE_COLOR', () => {
  for (const variable of ['solid/default', 'solid/hover', 'solid/pressed'] as const) {
    assert.deepEqual(SUPPORT_DES_VARIABLES[variable], { peint: ['background'], portees: ['FRAME_FILL', 'SHAPE_FILL'] }, variable);
  }
});

test('toutes les variables foreground lisent STROKE_COLOR, le neutre et les couleurs désactivées compris', () => {
  const foregrounds = (Object.keys(SUPPORT_DES_VARIABLES) as VariableDuTheme[]).filter((variable) => /foreground(-main|-subtle)?$/.test(variable));
  assert.equal(foregrounds.length, 6);
  for (const variable of foregrounds) assert.ok(SUPPORT_DES_VARIABLES[variable].portees.includes('STROKE_COLOR'), variable);
});

test('le rang du cran léger est l’indice du plus petit numéro de la liste', () => {
  assert.equal(rangDuCranLeger([50, 100, 200, 300]), 0);
  assert.equal(rangDuCranLeger([100, 200, 300]), 0);
  assert.equal(rangDuCranLeger([300, 100, 200, 50, 400]), 3);
  assert.equal(rangDuCranLeger([300, 100, 200]), 1);
});
