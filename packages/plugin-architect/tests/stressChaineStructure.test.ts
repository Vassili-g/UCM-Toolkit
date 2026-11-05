/** Vérifie les échecs de lecture P13 (D1) et l’affichage P9 d’un constat de couche (D5-1) sur la chaîne F2 et son faux panneau de Constats. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { casDeLaChaine } from '../scripts/stress/f2-structure/casDeLaChaine';

for (const id of ['D1-1', 'D1-2', 'D1-4']) {
  test(`F2 ${id} : le harnais monte le panneau et vérifie l'alerte P13`, async () => {
    const definition = casDeLaChaine().find((cas) => cas.id === id);
    assert.ok(definition);
    const resultat = await definition.executer();
    assert.ok(resultat.verifiees > 0);
    assert.deepEqual(resultat.ecran, []);
  });
}

test('F2 D5-1 : P9 lit un constat de couche par la carte groupée et le tient pour affiché', async () => {
  const definition = casDeLaChaine().find((cas) => cas.id === 'D5-1');
  assert.ok(definition);
  const resultat = await definition.executer();
  assert.deepEqual(resultat.ecran.filter((ecart) => ecart.propriete === 'P9'), []);
});
