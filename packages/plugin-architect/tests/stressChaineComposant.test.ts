/** Vérifie sur la chaîne F3 le résultat provisoire dessiné (D3-5), la lecture partielle (D6-1) et la library à choisir (D6-4). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { casDeLaChaine, composantPropre } from '../scripts/stress/f3-composant/casDeLaChaine';
import { ecranDuProvisoire, lancerLaChaine } from '../scripts/stress/f3-composant/chaine';

for (const id of ['D6-1', 'D6-4']) {
  test(`F3 ${id} : la chaîne ne rend aucun écart P18`, async () => {
    const definition = casDeLaChaine().find((cas) => cas.id === id);
    assert.ok(definition);
    const resultat = await definition.executer();
    assert.ok(resultat.verifiees > 0);
    assert.deepEqual(resultat.ecran, []);
  });
}

test('F3 D3-5 : l’écran du provisoire se dessine comme après le dernier message, il n’est pas vide', async () => {
  const chaine = await lancerLaChaine(composantPropre());
  assert.notEqual(ecranDuProvisoire(chaine).texte(), '');
});
