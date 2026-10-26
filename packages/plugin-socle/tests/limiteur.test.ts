/** Le limiteur des requêtes indépendantes : huit en vol au plus, résultats à leur rang, arrêt et erreur. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { AnalyseAnnulee } from '../src/composant/contract/porteeDAnalyse';
import { REQUETES_EN_VOL, executerAuPlus } from '../src/composant/analyse/limiteur';

const attendre = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Une tâche qui compte ses démarrages et le plus grand nombre de tâches en vol. */
function suivi() {
  const etat = { enVol: 0, maximum: 0, demarrees: [] as number[] };
  const tache = (delai: (rang: number) => number) => async (element: number): Promise<number> => {
    etat.demarrees.push(element);
    etat.enVol += 1;
    etat.maximum = Math.max(etat.maximum, etat.enVol);
    await attendre(delai(element));
    etat.enVol -= 1;
    return element * 10;
  };
  return { etat, tache };
}

test('au plus huit tâches sont en vol, et les résultats gardent le rang des éléments', async () => {
  const { etat, tache } = suivi();
  const elements = Array.from({ length: 40 }, (_, rang) => rang);
  // Les premiers éléments répondent le plus tard : l'ordre d'arrivée n'est pas celui des rangs.
  const issue = await executerAuPlus(elements, tache((rang) => 20 - (rang % 20)));
  assert.equal(REQUETES_EN_VOL, 8);
  assert.equal(etat.maximum, 8);
  assert.equal(issue.complet, true);
  assert.deepEqual(issue.resultats, elements.map((rang) => rang * 10));
  assert.deepEqual([...etat.demarrees].sort((a, b) => a - b), elements);
});

test('les huit premières tâches partent ensemble, dans l’ordre des éléments', async () => {
  const { etat, tache } = suivi();
  await executerAuPlus(Array.from({ length: 12 }, (_, rang) => rang), tache(() => 5));
  assert.deepEqual(etat.demarrees.slice(0, 8), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('la limite se règle, et une liste plus courte que la limite ne démarre que ses éléments', async () => {
  const { etat, tache } = suivi();
  await executerAuPlus(Array.from({ length: 10 }, (_, rang) => rang), tache(() => 2), { limite: 3 });
  assert.equal(etat.maximum, 3);
  const court = suivi();
  const issue = await executerAuPlus([1, 2], court.tache(() => 1));
  assert.equal(court.etat.maximum, 2);
  assert.deepEqual(issue.resultats, [10, 20]);
});

test('une liste vide rend une issue complète sans rien démarrer', async () => {
  let appels = 0;
  const issue = await executerAuPlus([], async () => { appels += 1; });
  assert.deepEqual(issue, { resultats: [], complet: true });
  assert.equal(appels, 0);
});

test('une tâche qui rend son échec en valeur n’empêche pas les autres', async () => {
  const issue = await executerAuPlus(Array.from({ length: 20 }, (_, rang) => rang), async (rang) => {
    try {
      await attendre(1);
      if (rang === 5) throw new Error('refusé');
      return 'lu';
    } catch (erreur) {
      return (erreur as Error).message;
    }
  });
  assert.equal(issue.complet, true);
  assert.equal(issue.resultats[5], 'refusé');
  assert.equal(issue.resultats.filter((resultat) => resultat === 'lu').length, 19);
});

test('avant rend faux : plus aucune tâche ne démarre, l’issue est incomplète et les tâches en vol finissent', async () => {
  const { etat, tache } = suivi();
  let verdicts = 0;
  const issue = await executerAuPlus(Array.from({ length: 30 }, (_, rang) => rang), tache(() => 3), { avant: () => { verdicts += 1; return verdicts <= 12; } });
  assert.equal(issue.complet, false);
  assert.equal(etat.demarrees.length, 12);
  assert.equal(etat.enVol, 0);
  assert.equal(issue.resultats.filter((resultat) => resultat !== undefined).length, 12);
});

test('avant peut être asynchrone, et son attente ne fait pas démarrer plus de tâches que les éléments', async () => {
  const { etat, tache } = suivi();
  const issue = await executerAuPlus([0, 1, 2], tache(() => 1), { avant: async () => { await attendre(2); } });
  assert.equal(issue.complet, true);
  assert.deepEqual([...etat.demarrees].sort(), [0, 1, 2]);
  assert.deepEqual(issue.resultats, [0, 10, 20]);
});

test('une annulation levée par avant abandonne l’exécution : aucune tâche ne démarre ensuite', async () => {
  const { etat, tache } = suivi();
  let verdicts = 0;
  await assert.rejects(
    executerAuPlus(Array.from({ length: 30 }, (_, rang) => rang), tache(() => 3), { avant: () => { verdicts += 1; if (verdicts > 10) throw new AnalyseAnnulee(); } }),
    AnalyseAnnulee,
  );
  await attendre(30);
  assert.equal(etat.demarrees.length, 10);
});

test('une tâche qui rejette abandonne l’exécution et l’erreur remonte', async () => {
  const demarrees: number[] = [];
  await assert.rejects(
    executerAuPlus(Array.from({ length: 30 }, (_, rang) => rang), async (rang) => {
      demarrees.push(rang);
      await attendre(2);
      if (rang === 2) throw new Error('lecture impossible');
    }),
    /lecture impossible/,
  );
  await attendre(30);
  assert.ok(demarrees.length <= 8 + 7, `${demarrees.length} tâches démarrées`);
});
