/** Actualiser sur un relevé déjà lu montre l'écran de chargement : l'accueil ne se cache pas pendant une lecture. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { accueilVisible } from '../src/ui/etat';

test('l’accueil se montre pendant une lecture même quand un index existe', () => {
  assert.equal(accueilVisible({ statut: 'en-cours', demande: 1, phase: 'collections', fait: 0, total: 1 }, true), true);
});

test('l’accueil reste caché sur un index lu hors lecture, visible sans index ou après un échec', () => {
  assert.equal(accueilVisible({ statut: 'attente' }, true), false);
  assert.equal(accueilVisible({ statut: 'annulee' }, true), false);
  assert.equal(accueilVisible({ statut: 'attente' }, false), true);
  assert.equal(accueilVisible({ statut: 'echouee', message: 'x' }, true), true);
});
