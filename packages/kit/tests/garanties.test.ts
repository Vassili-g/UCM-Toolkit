/** Les membres et fonds attendus proviennent des sept garanties de contraste du thème. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { GARANTIES, garantieJugeable, type SensDuTheme } from '../src/emplois/index';

test('les sept garanties ont leurs membres, fonds et seuil', () => {
  assert.deepEqual(GARANTIES, [
    { numero: 1, premier: { variable: 'solid/foreground' }, fonds: [{ variable: 'solid/default' }, { variable: 'solid/hover' }, { variable: 'solid/pressed' }], seuil: 'texte' },
    { numero: 2, premier: { variable: 'solid/default' }, fonds: [{ fondDeLaPage: true }], seuil: 'nonTexte' },
    { numero: 3, premier: { variable: 'surface/foreground' }, fonds: [{ variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, { fondDeLaPage: true }], seuil: 'texte' },
    { numero: 4, premier: { variable: 'surface/border' }, fonds: [{ variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, { fondDeLaPage: true }], seuil: 'nonTexte' },
    { numero: 5, premier: { variable: 'page/foreground' }, fonds: [{ fondDeLaPage: true }], seuil: 'texte' },
    { numero: 6, premier: { variable: 'page/border' }, fonds: [{ fondDeLaPage: true }], seuil: 'nonTexte' },
    { numero: 7, premier: { variable: 'page/focus' }, fonds: [{ fondDeLaPage: true }, { variable: 'surface/default' }], seuil: 'nonTexte' },
  ]);
});

test('chaque membre numérique et chaque fond doit être présent dans le sens jugé', () => {
  const attendus: Record<SensDuTheme, number[][]> = {
    normal: [[700, 800, 900], [700], [100, 200, 300, 800], [100, 200, 300, 800], [700], [700], [100, 600]],
    inverse: [[500, 600, 700], [700], [100, 200, 300, 900], [100, 200, 300, 900], [800], [800], [100, 700]],
  };
  for (const sens of ['normal', 'inverse'] as const) {
    GARANTIES.forEach((garantie, rang) => {
      const crans = attendus[sens][rang];
      assert.equal(garantieJugeable(garantie, crans, sens), true, `${sens} G${rang + 1}`);
      assert.equal(garantieJugeable(garantie, [], sens), false);
      for (const cran of crans) {
        assert.equal(garantieJugeable(garantie, crans.filter((autre) => autre !== cran), sens), false, `${sens} G${rang + 1} sans ${cran}`);
      }
    });
  }
});

test('G1 exige 700 et G2 reste jugeable sans 400 dans les deux sens', () => {
  for (const sens of ['normal', 'inverse'] as const) {
    assert.equal(garantieJugeable(GARANTIES[0], [100, 200, 300, 500, 600, 800, 900], sens), false);
    assert.equal(garantieJugeable(GARANTIES[1], [700], sens), true);
  }
});
