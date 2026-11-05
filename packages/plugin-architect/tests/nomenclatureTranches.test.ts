/** Distingue le travail du générateur, l'attente des minuteries et la réception d'une nouvelle demande. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { mener, type MesureDeTranches } from '../src/nomenclature/tranches';

for (const retard of [38, 459]) {
  test(`111 minuteries retardées de ${retard} ms suffisent à reproduire l'attente sans autre travail`, async (t) => {
    let horloge = 0;
    const rappels: (() => void)[] = [];
    const delais: number[] = [];
    t.mock.method(globalThis, 'setTimeout', (rappel: () => void, delai: number) => {
      delais.push(delai);
      rappels.push(rappel);
      return 0;
    });
    const mesure: MesureDeTranches = { cessions: 0, attenteMs: 0, pasMaxMs: 0 };
    function* calcul(): Generator<void, number> {
      for (let i = 0; i < 111; i++) { horloge += 8; yield; }
      return 111;
    }
    let fini = false;
    const resultat = mener(calcul(), () => false, { maintenant: () => horloge, mesure });
    void resultat.then(() => { fini = true; });
    for (let i = 0; i < 111; i++) {
      assert.equal(rappels.length, 1, 'une seule minuterie attend');
      horloge += retard;
      rappels.shift()!();
      await Promise.resolve();
    }
    assert.deepEqual(await resultat, { abandonne: false, valeur: 111 });
    assert.equal(fini, true);
    assert.deepEqual(delais, Array(111).fill(0));
    assert.deepEqual(mesure, { cessions: 111, attenteMs: 111 * retard, pasMaxMs: 8 });
  });
}

test('le journal compte aussi le travail concurrent pendant une pause', async () => {
  let horloge = 0;
  const mesure: MesureDeTranches = { cessions: 0, attenteMs: 0, pasMaxMs: 0 };
  function* calcul(): Generator<void, void> { horloge += 8; yield; }
  await mener(calcul(), () => false, {
    maintenant: () => horloge, mesure,
    pause: async () => { horloge += 459; },
  });
  assert.deepEqual(mesure, { cessions: 1, attenteMs: 459, pasMaxMs: 8 });
});

test('une promesse résolue ne reçoit pas la demande placée dans une tâche', async (t) => {
  const taches: (() => void)[] = [];
  t.mock.method(globalThis, 'setTimeout', (rappel: () => void) => { taches.push(rappel); return 0; });
  let abandonne = false;
  setTimeout(() => { abandonne = true; }, 0);
  function* calcul(): Generator<void, number> { for (let i = 0; i < 100; i++) yield; return 100; }
  const resultat = await mener(calcul(), () => abandonne, { duree: 0, pause: () => Promise.resolve() });
  assert.deepEqual(resultat, { abandonne: false, valeur: 100 });
  assert.equal(abandonne, false);
  taches.shift()!();
  assert.equal(abandonne, true);
});

test('le budget ne peut interrompre un appel de next qui dépasse huit millisecondes', async () => {
  let horloge = 0;
  const mesure: MesureDeTranches = { cessions: 0, attenteMs: 0, pasMaxMs: 0 };
  function* calcul(): Generator<void, void> { horloge += 1331; yield; }
  await mener(calcul(), () => false, { maintenant: () => horloge, pause: async () => {}, mesure });
  assert.deepEqual(mesure, { cessions: 1, attenteMs: 0, pasMaxMs: 1331 });
});
