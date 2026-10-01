/** Les bornes et la clé de la fenêtre de l'explorateur. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLE_DE_LA_FENETRE, TAILLE_MINIMALE, TAILLE_PAR_DEFAUT, tailleValide } from '../src/fenetre';

test('la fenêtre s’ouvre à 1200 × 800 et ne descend pas sous 560 × 480', () => {
  assert.deepEqual(TAILLE_PAR_DEFAUT, { largeur: 1200, hauteur: 800 });
  assert.deepEqual(TAILLE_MINIMALE, { largeur: 560, hauteur: 480 });
  assert.deepEqual(tailleValide({ largeur: 100, hauteur: 100 }), TAILLE_MINIMALE);
  assert.deepEqual(tailleValide(undefined), TAILLE_PAR_DEFAUT);
  assert.deepEqual(tailleValide({ largeur: 900, hauteur: Number.NaN }), { largeur: 900, hauteur: 800 });
});

test('la taille se range sous une clé propre au plugin', () => {
  assert.notEqual(CLE_DE_LA_FENETRE, 'tailleFenetre');
  assert.match(CLE_DE_LA_FENETRE, /explorateur/);
});
