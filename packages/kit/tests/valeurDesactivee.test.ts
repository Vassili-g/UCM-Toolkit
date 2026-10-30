/**
 * La valeur d'axe d'états qui devient la prop publique `disabled` : une seule
 * orthographe, que le modèle des props, l'échantillon et le modèle des règles
 * consultent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { estUneValeurDesactivee } from '../src/format/index.js';
import { REGISTRE_ETATS } from '../src/referentiel/vocabulaire.js';

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

test('la valeur désactivée est celle du registre des états : son identifiant et chacune de ses formes tolérées', () => {
  const desactive = REGISTRE_ETATS.termes.find((terme) => terme.id === 'disabled');
  assert.ok(desactive);
  const ecrites = new Set([desactive.id, ...(desactive.toleres ?? [])]);
  for (const ecriture of ecrites) assert.equal(estUneValeurDesactivee(ecriture), true, ecriture);

  const autres = REGISTRE_ETATS.termes.filter((terme) => terme.id !== 'disabled').flatMap((terme) => [terme.id, ...(terme.toleres ?? [])]);
  for (const ecriture of autres) assert.equal(estUneValeurDesactivee(ecriture), false, ecriture);
});

test('la valeur désactivée se lit comme les autres états : un séparateur de tête ou de queue ne la masque pas', () => {
  for (const valeur of ['_Disabled', 'Disabled-', 'DISABLE']) assert.equal(estUneValeurDesactivee(valeur), true, valeur);
});
