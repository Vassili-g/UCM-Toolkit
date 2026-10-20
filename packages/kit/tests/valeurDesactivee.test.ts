/**
 * La valeur d'axe d'états qui devient la prop publique `disabled` : une seule
 * orthographe, que le modèle des props, l'échantillon et le modèle des règles
 * consultent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { estUneValeurDesactivee } from '../src/format/index.js';

test('Disable, Disabled et leurs variantes de casse désignent la valeur désactivée', () => {
  for (const valeur of ['Disable', 'disable', 'DISABLED', ' disabled ']) {
    assert.equal(estUneValeurDesactivee(valeur), true, valeur);
  }
});

test('une autre valeur d’état n’est pas la valeur désactivée', () => {
  for (const valeur of ['Default', 'Hover', 'Disabling', 'not-disabled', '', null, undefined, 0]) {
    assert.equal(estUneValeurDesactivee(valeur), false, String(valeur));
  }
});
