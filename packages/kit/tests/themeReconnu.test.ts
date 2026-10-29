/** Le thème se reconnaît quelle que soit l'écriture de ses noms et de ses modes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES, VARIABLES_DU_THEME,
  type ModeDuTheme,
} from '../src/emplois/index.js';
import {
  CONVENTIONS, MODES, indexerVocabulaire, modeDuThemeReconnu, normaliserLesNoms, variableDuThemeReconnue, type VocabulaireDuFichier,
} from '../src/referentiel/index.js';

function ecritSelon(convention: (typeof CONVENTIONS)[number]['convention'], nom: string): string {
  const { propositions } = normaliserLesNoms([{ id: 'a', nom, portee: 'p', categorie: 'variables' }], { variables: convention });
  return propositions[0]?.nouveauNom ?? nom;
}

test('la liste des variables du thème reprend les variables de palette, du neutre, globales et les élévations', () => {
  assert.deepEqual(VARIABLES_DU_THEME, [
    ...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE, ...VARIABLES_GLOBALES,
    ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau) => `elevation/${niveau}`),
  ]);
  assert.deepEqual([...VARIABLES_DU_THEME].sort(), Object.keys(SUPPORT_DES_VARIABLES).sort());
});

test('aucune variable du thème n’est la fin d’une autre', () => {
  for (const courte of VARIABLES_DU_THEME) for (const longue of VARIABLES_DU_THEME) {
    if (courte === longue) continue;
    assert.ok(!longue.endsWith(`/${courte}`), `${courte} est la fin de ${longue} : la plus longue passe d’abord dans VARIABLES_DU_THEME`);
  }
});

test('ModeDuTheme vaut les modes du référentiel', () => {
  const modes: readonly ModeDuTheme[] = MODES;
  const retour: (typeof MODES)[number] = 'light' as ModeDuTheme;
  assert.deepEqual(modes, ['light', 'dark']);
  assert.equal(retour, 'light');
});

test('une variable du thème se reconnaît par la fin de son nom, quelle que soit l’écriture', () => {
  assert.equal(variableDuThemeReconnue('Primary/Solid/default'), 'solid/default');
  assert.equal(variableDuThemeReconnue('primary/solid/default'), 'solid/default');
  assert.equal(variableDuThemeReconnue('PRIMARY/SOLID/DEFAULT'), 'solid/default');
  assert.equal(variableDuThemeReconnue('success/vivid/Ring'), 'ring');
  assert.equal(variableDuThemeReconnue('Neutral/Page/ForegroundMain'), 'page/foreground-main');
  assert.equal(variableDuThemeReconnue('neutral/scale/0'), 'scale/0');
  assert.equal(variableDuThemeReconnue('Elevation/Raised'), 'elevation/raised');
  assert.equal(variableDuThemeReconnue('primary/identity'), undefined);
  assert.equal(variableDuThemeReconnue('Primary/Identity'), undefined);
  assert.equal(variableDuThemeReconnue('primary/solid/inconnu'), undefined);
  assert.equal(variableDuThemeReconnue(''), undefined);
});

test('chaque variable du thème se reconnaît sous chaque convention d’écriture', () => {
  for (const choix of CONVENTIONS) for (const variable of VARIABLES_DU_THEME) {
    const nom = ecritSelon(choix.convention, `primary/${variable}`);
    assert.equal(variableDuThemeReconnue(nom), variable, `${choix.id} : ${nom}`);
  }
});

test('un mode du thème se reconnaît quelle que soit l’écriture', () => {
  for (const ecrit of ['light', 'Light', 'LIGHT']) assert.equal(modeDuThemeReconnu(ecrit), 'light', ecrit);
  for (const ecrit of ['dark', 'Dark', 'DARK']) assert.equal(modeDuThemeReconnu(ecrit), 'dark', ecrit);
  assert.equal(modeDuThemeReconnu('Jour'), undefined);
  assert.equal(modeDuThemeReconnu(''), undefined);
});

const SANS_REGLE: VocabulaireDuFichier = { personnalises: [], ecartsUcm: [] };
const JOUR_EST_LIGHT: VocabulaireDuFichier = { personnalises: [{ terme: ['light'], remplace: [['jour']] }], ecartsUcm: [] };

test('un terme personnalisé fait reconnaître un mode qui porte un autre nom', () => {
  const avec = indexerVocabulaire(JOUR_EST_LIGHT).index;
  assert.equal(modeDuThemeReconnu('Jour', avec), 'light');
  assert.equal(modeDuThemeReconnu('JOUR', avec), 'light');
  assert.equal(modeDuThemeReconnu('Nuit', avec), undefined);
  assert.equal(modeDuThemeReconnu('Jour', indexerVocabulaire(SANS_REGLE).index), undefined);
  assert.equal(modeDuThemeReconnu('Dark', avec), 'dark');
});

test('un terme personnalisé s’applique aussi aux segments d’un nom de variable', () => {
  const index = indexerVocabulaire({ personnalises: [{ terme: ['solid'], remplace: [['plein']] }], ecartsUcm: [] }).index;
  assert.equal(variableDuThemeReconnue('Primary/Plein/default', index), 'solid/default');
  assert.equal(variableDuThemeReconnue('Primary/Plein/default'), undefined);
});

test('le thème se reconnaît par la fin du nom, et refuse un nom qui n’en porte aucune', () => {
  assert.equal(variableDuThemeReconnue('Elevation/Raised'), 'elevation/raised');
  assert.equal(variableDuThemeReconnue('Primary/Surface/foreground'), 'surface/foreground');
  assert.equal(variableDuThemeReconnue('Disabled/border'), 'disabled/border');
  assert.equal(variableDuThemeReconnue('Elevation/pages'), undefined);
  assert.equal(variableDuThemeReconnue('Primary/Identity'), undefined);
});
