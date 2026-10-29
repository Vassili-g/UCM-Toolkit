/** Les membres et fonds attendus proviennent des neuf garanties de contraste du thème. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { GARANTIES, garantieJugeable, type ModeDuTheme, type SensDuTheme } from '../src/emplois/index';

test('les neuf garanties ont leurs membres, fonds et seuil', () => {
  assert.deepEqual(GARANTIES, [
    { numero: 1, premier: { variable: 'solid/foreground' }, fonds: [{ variable: 'solid/default' }, { variable: 'solid/hover' }, { variable: 'solid/pressed' }], seuil: 'texte' },
    { numero: 2, premier: { variable: 'solid/default' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 3, premier: { variable: 'surface/foreground' }, fonds: [{ variable: 'surface/subtle' }, { variable: 'surface/default' }, { variable: 'surface/hover' }, { fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'texte' },
    { numero: 4, premier: { variable: 'surface/border' }, fonds: [{ variable: 'surface/subtle' }, { variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, { fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 5, premier: { variable: 'page/foreground' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'texte' },
    { numero: 6, premier: { variable: 'page/border' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 7, premier: { variable: 'ring' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 8, premier: { variable: 'surface/foreground' }, fonds: [{ variable: 'surface/pressed' }], seuil: 'nonTexte' },
    { numero: 9, premier: { variable: 'page/foreground' }, fonds: [{ variable: 'surface/default' }], seuil: 'texte' },
  ]);
});

test('chaque membre numérique et chaque fond doit être présent dans le thème et le sens jugés', () => {
  const attendus: Record<ModeDuTheme, Record<SensDuTheme, number[][]>> = {
    light: {
      normal: [[700, 800, 900], [700], [50, 100, 200, 700], [50, 100, 200, 300, 700], [700], [700], [600], [300, 700], [100, 700]],
      inverse: [[500, 600, 700], [700], [50, 100, 200, 900], [50, 100, 200, 300, 900], [800], [800], [700], [300, 900], [100, 800]],
    },
    dark: {
      normal: [[700, 800, 900], [700], [200, 300, 400, 950], [200, 300, 400, 500, 950], [700], [700], [600], [500, 950], [300, 700]],
      inverse: [[500, 600, 700], [700], [200, 300, 400, 950], [200, 300, 400, 500, 950], [800], [800], [800], [500, 950], [300, 800]],
    },
  };
  for (const mode of ['light', 'dark'] as const) {
    for (const sens of ['normal', 'inverse'] as const) {
      GARANTIES.forEach((garantie, rang) => {
        const crans = attendus[mode][sens][rang];
        const nom = `${mode} ${sens} G${rang + 1}`;
        assert.equal(garantieJugeable(garantie, crans, mode, sens), true, nom);
        assert.equal(garantieJugeable(garantie, [], mode, sens), false);
        for (const cran of crans) {
          assert.equal(garantieJugeable(garantie, crans.filter((autre) => autre !== cran), mode, sens), false, `${nom} sans ${cran}`);
        }
      });
    }
  }
});

test('G1 exige 700 et G2 reste jugeable sans 400 dans les quatre tables', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const sens of ['normal', 'inverse'] as const) {
      assert.equal(garantieJugeable(GARANTIES[0], [100, 200, 300, 500, 600, 800, 900], mode, sens), false);
      assert.equal(garantieJugeable(GARANTIES[1], [700], mode, sens), true);
    }
  }
});

test('G7 juge l’anneau contre deux fonds extérieurs à la palette, la page puis la carte, et ne vise aucune surface', () => {
  const g7 = GARANTIES[6];
  assert.deepEqual(g7.fonds, [{ fondDeLaPage: true }, { fondDeLaCarte: true }]);
  for (const mode of ['light', 'dark'] as const) {
    for (const sens of ['normal', 'inverse'] as const) {
      const cran = { light: { normal: 600, inverse: 700 }, dark: { normal: 600, inverse: 800 } }[mode][sens];
      assert.equal(garantieJugeable(g7, [cran], mode, sens), true, `${mode} ${sens}`);
    }
  }
});

test('la carte rejoint la page comme fond de G2 à G7, et G1, G8 et G9 ne jugent que des fonds de la palette', () => {
  const avecCarte = GARANTIES.filter((garantie) => garantie.fonds.some((fond) => 'fondDeLaCarte' in fond)).map((garantie) => garantie.numero);
  assert.deepEqual(avecCarte, [2, 3, 4, 5, 6, 7]);
  for (const garantie of GARANTIES) {
    const page = garantie.fonds.some((fond) => 'fondDeLaPage' in fond);
    const carte = garantie.fonds.some((fond) => 'fondDeLaCarte' in fond);
    assert.equal(carte, page, `G${garantie.numero}`);
  }
});

test('G3 juge le texte de surface sur le fond léger, le repos, le survol, la page et la carte, et plus sur l’appui', () => {
  const g3 = GARANTIES[2];
  assert.deepEqual(g3.fonds, [{ variable: 'surface/subtle' }, { variable: 'surface/default' }, { variable: 'surface/hover' }, { fondDeLaPage: true }, { fondDeLaCarte: true }]);
  assert.ok(!g3.fonds.some((fond) => 'variable' in fond && fond.variable === 'surface/pressed'));
});

test('G4 garde l’appui et ajoute le fond léger à ses fonds', () => {
  const variables = GARANTIES[3].fonds.filter((fond) => 'variable' in fond).map((fond) => ('variable' in fond ? fond.variable : ''));
  assert.deepEqual(variables, ['surface/subtle', 'surface/default', 'surface/hover', 'surface/pressed']);
});

test('G8 juge le texte de surface sur l’appui au seuil non textuel, G9 le texte coloré sur le repos au seuil textuel', () => {
  const g8 = GARANTIES.find((garantie) => garantie.numero === 8)!;
  assert.deepEqual([g8.premier, g8.fonds, g8.seuil], [{ variable: 'surface/foreground' }, [{ variable: 'surface/pressed' }], 'nonTexte']);
  const g9 = GARANTIES.find((garantie) => garantie.numero === 9)!;
  assert.deepEqual([g9.premier, g9.fonds, g9.seuil], [{ variable: 'page/foreground' }, [{ variable: 'surface/default' }], 'texte']);
});

test('surface/divider n’entre dans aucune garantie', () => {
  for (const garantie of GARANTIES) {
    assert.notEqual(garantie.premier.variable, 'surface/divider');
    assert.ok(!garantie.fonds.some((fond) => 'variable' in fond && fond.variable === 'surface/divider'), `G${garantie.numero}`);
  }
});

test('garantieJugeable traite surface/subtle : G3 attend le 50 en Light et le 200 en Dark', () => {
  const g3 = GARANTIES[2];
  assert.equal(garantieJugeable(g3, [100, 200, 700], 'light', 'normal'), false);
  assert.equal(garantieJugeable(g3, [50, 100, 200, 700], 'light', 'normal'), true);
  assert.equal(garantieJugeable(g3, [300, 400, 950], 'dark', 'normal'), false);
  assert.equal(garantieJugeable(g3, [200, 300, 400, 950], 'dark', 'normal'), true);
});
