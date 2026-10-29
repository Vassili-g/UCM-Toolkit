/** Les membres et fonds attendus proviennent des sept garanties de contraste du thème. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { GARANTIES, garantieJugeable, type ModeDuTheme, type SensDuTheme } from '../src/emplois/index';

test('les sept garanties ont leurs membres, fonds et seuil', () => {
  assert.deepEqual(GARANTIES, [
    { numero: 1, premier: { variable: 'solid/foreground' }, fonds: [{ variable: 'solid/default' }, { variable: 'solid/hover' }, { variable: 'solid/pressed' }], seuil: 'texte' },
    { numero: 2, premier: { variable: 'solid/default' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 3, premier: { variable: 'surface/foreground' }, fonds: [{ variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, { fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'texte' },
    { numero: 4, premier: { variable: 'surface/border' }, fonds: [{ variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, { fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 5, premier: { variable: 'page/foreground' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'texte' },
    { numero: 6, premier: { variable: 'page/border' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
    { numero: 7, premier: { variable: 'ring' }, fonds: [{ fondDeLaPage: true }, { fondDeLaCarte: true }], seuil: 'nonTexte' },
  ]);
});

test('chaque membre numérique et chaque fond doit être présent dans le thème et le sens jugés', () => {
  const attendus: Record<ModeDuTheme, Record<SensDuTheme, number[][]>> = {
    light: {
      normal: [[700, 800, 900], [700], [100, 200, 300, 800], [100, 200, 300, 800], [700], [700], [600]],
      inverse: [[500, 600, 700], [700], [100, 200, 300, 900], [100, 200, 300, 900], [800], [800], [700]],
    },
    dark: {
      normal: [[700, 800, 900], [700], [300, 400, 500, 950], [300, 400, 500, 950], [700], [700], [600]],
      inverse: [[500, 600, 700], [700], [300, 400, 500, 950], [300, 400, 500, 950], [800], [800], [700]],
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
      assert.equal(garantieJugeable(g7, sens === 'normal' ? [600] : [700], mode, sens), true, `${mode} ${sens}`);
    }
  }
});

test('la carte rejoint la page comme fond de G2 à G7, et G1 ne juge que les boutons', () => {
  const avecCarte = GARANTIES.filter((garantie) => garantie.fonds.some((fond) => 'fondDeLaCarte' in fond)).map((garantie) => garantie.numero);
  assert.deepEqual(avecCarte, [2, 3, 4, 5, 6, 7]);
  for (const garantie of GARANTIES) {
    const page = garantie.fonds.some((fond) => 'fondDeLaPage' in fond);
    const carte = garantie.fonds.some((fond) => 'fondDeLaCarte' in fond);
    assert.equal(carte, page, `G${garantie.numero}`);
  }
});
