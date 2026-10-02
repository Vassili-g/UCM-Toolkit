/** Les bornes et les clés des deux dispositions de la fenêtre de l'explorateur. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLE_DE_LA_FENETRE, CLE_DE_LA_FENETRE_ETROITE, TAILLE_ETROITE, TAILLE_MINIMALE, TAILLE_MINIMALE_ETROITE, TAILLE_PAR_DEFAUT, tailleValide } from '../src/fenetre';

test('la fenêtre s’ouvre à 1200 × 800 et ne descend pas sous 560 × 480', () => {
  assert.deepEqual(TAILLE_PAR_DEFAUT, { largeur: 1200, hauteur: 800 });
  assert.deepEqual(TAILLE_MINIMALE, { largeur: 560, hauteur: 480 });
  assert.deepEqual(tailleValide({ largeur: 100, hauteur: 100 }), TAILLE_MINIMALE);
  assert.deepEqual(tailleValide(undefined), TAILLE_PAR_DEFAUT);
  assert.deepEqual(tailleValide({ largeur: 900, hauteur: Number.NaN }), { largeur: 900, hauteur: 800 });
});

test('la fenêtre étroite s’ouvre à 364 × 680 et ne descend pas sous 320 × 420', () => {
  assert.deepEqual(TAILLE_ETROITE, { largeur: 364, hauteur: 680 });
  assert.deepEqual(TAILLE_MINIMALE_ETROITE, { largeur: 320, hauteur: 420 });
  assert.deepEqual(tailleValide({ largeur: 100, hauteur: 100 }, 'etroite'), TAILLE_MINIMALE_ETROITE);
  assert.deepEqual(tailleValide(undefined, 'etroite'), TAILLE_ETROITE);
  assert.deepEqual(tailleValide({ largeur: 480, hauteur: Number.NaN }, 'etroite'), { largeur: 480, hauteur: 680 });
  assert.deepEqual(tailleValide({ largeur: 400, hauteur: 440 }, 'large'), { largeur: 560, hauteur: 480 });
});

test('chaque disposition range sa taille sous une clé propre au plugin', () => {
  assert.notEqual(CLE_DE_LA_FENETRE, 'tailleFenetre');
  assert.match(CLE_DE_LA_FENETRE, /explorateur/);
  assert.equal(CLE_DE_LA_FENETRE_ETROITE, 'ucm-explorateur/tailleFenetreEtroite');
  assert.notEqual(CLE_DE_LA_FENETRE_ETROITE, CLE_DE_LA_FENETRE);
});
