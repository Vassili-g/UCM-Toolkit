/** Actualiser sur un relevé déjà lu montre son chargement dans l'onglet Constats (`actualisationDuModeTokens.test.ts`) : l'accueil de la table ne décale pas la table. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { accueilVisible } from '../src/ui/etat';

test('l’accueil ne se montre pas pendant une lecture quand un index existe, et se montre pendant la première', () => {
  assert.equal(accueilVisible({ statut: 'en-cours', demande: 1, phase: 'collections', fait: 0, total: 1 }, true), false);
  assert.equal(accueilVisible({ statut: 'en-cours', demande: 1, phase: 'collections', fait: 0, total: 1 }, false), true);
});

test('l’accueil reste caché sur un index lu hors lecture, visible sans index ou après un échec', () => {
  assert.equal(accueilVisible({ statut: 'attente' }, true), false);
  assert.equal(accueilVisible({ statut: 'annulee' }, true), false);
  assert.equal(accueilVisible({ statut: 'attente' }, false), true);
  assert.equal(accueilVisible({ statut: 'echouee', message: 'x' }, true), true);
});
