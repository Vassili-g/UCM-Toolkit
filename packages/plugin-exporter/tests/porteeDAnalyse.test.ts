/** Une ouverture refusée ne peut emprunter la mémoire ni l'annulation d'un autre export. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AnalyseAnnulee, BUDGET_DE_CALCUL_MS, creerContexteCooperatif, dansUnePorteeDAnalyse, maitreDe, respirerSiBesoin,
} from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

function attente() {
  let terminer!: () => void;
  const promesse = new Promise<void>((resolve) => { terminer = resolve; });
  return { promesse, terminer };
}

test('le budget injectable traverse 90 unités et relit le jeton immédiatement après la pause', async () => {
  let horloge = 0;
  let terminees = 0;
  const cessions: number[] = [];
  const jeton = { leve: false };
  const cooperation = creerContexteCooperatif({
    horloge: () => horloge, budgetDeCalculMs: 25, jeton,
    respirer: async () => { cessions.push(terminees); jeton.leve = true; },
  });
  await assert.rejects(async () => {
    for (let rang = 0; rang < 90; rang += 1) {
      horloge += 1;
      await cooperation.cederSiBesoin();
      terminees += 1;
    }
  }, AnalyseAnnulee);
  assert.deepEqual(cessions, [24]);
  assert.equal(terminees, 24);
});

test('une pause remet le budget à son heure de fin et une portée fermée ne conserve aucun contexte', async () => {
  let horloge = 0;
  let pauses = 0;
  await dansUnePorteeDAnalyse({
    horloge: () => horloge, budgetDeCalculMs: 16,
    respirer: async () => { pauses += 1; horloge += 100; },
  }, async () => {
    horloge = 16;
    await respirerSiBesoin();
    await respirerSiBesoin();
    horloge += 16;
    await respirerSiBesoin();
  });
  assert.equal(pauses, 2);
  horloge += 1000;
  await respirerSiBesoin();
  assert.equal(pauses, 2);
});

test('une portée refusée ne respire pas avec l’annulation de la portée ouverte', async () => {
  const maintenant = Date.now;
  let horloge = 0;
  Date.now = () => horloge;
  try {
    await dansUnePorteeDAnalyse({ respirer: async () => { throw new Error('annulation étrangère'); } }, async () => {
      await dansUnePorteeDAnalyse({}, async () => {
        horloge += BUDGET_DE_CALCUL_MS + 1;
        await respirerSiBesoin();
      });
    });
  } finally { Date.now = maintenant; }
});

test('une portée refusée encore ouverte empêche une troisième de prêter sa mémoire', async () => {
  const premiere = attente();
  const deuxieme = attente();
  let lectures = 0;
  const maitre = {} as ComponentNode;
  const instance = { id: 'instance', getMainComponentAsync: async () => { lectures += 1; return maitre; } } as InstanceNode;
  const a = dansUnePorteeDAnalyse({}, () => premiere.promesse);
  const b = dansUnePorteeDAnalyse({}, () => deuxieme.promesse);
  premiere.terminer();
  await a;
  await dansUnePorteeDAnalyse({}, async () => {
    await maitreDe(instance);
    await maitreDe(instance);
  });
  deuxieme.terminer();
  await b;
  assert.equal(lectures, 2);
});
