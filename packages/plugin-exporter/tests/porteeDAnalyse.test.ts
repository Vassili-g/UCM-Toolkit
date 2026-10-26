/** Une ouverture refusée ne peut emprunter la mémoire ni l'annulation d'un autre export. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { abandonnerLaMesure, fermerLaMesure, ouvrirLaMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { textSlots } from 'ucm-plugin-socle/src/composant/contract/extractVariantTypography';
import {
  AnalyseAnnulee, BUDGET_DE_CALCUL_MS, creerContexteCooperatif, dansUnePorteeDAnalyse, descendantsBruts, maitreDe, respirerSiBesoin,
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

test('doitCeder annonce le budget écoulé ou le jeton levé, sans céder lui-même', async () => {
  let horloge = 0;
  let pauses = 0;
  const jeton = { leve: false };
  const contexte = creerContexteCooperatif({ horloge: () => horloge, respirer: async () => { pauses += 1; }, jeton, budgetDeCalculMs: 25 });
  assert.equal(contexte.doitCeder(), false);
  horloge = 24;
  assert.equal(contexte.doitCeder(), false);
  horloge = 25;
  assert.equal(contexte.doitCeder(), true);
  assert.equal(pauses, 0);
  await contexte.cederSiBesoin();
  assert.equal(pauses, 1);
  assert.equal(contexte.doitCeder(), false);
  jeton.leve = true;
  assert.equal(contexte.doitCeder(), true);
  assert.throws(() => contexte.verifier(), AnalyseAnnulee);
  const sansPause = creerContexteCooperatif({ horloge: () => horloge + 1000 });
  assert.equal(sansPause.doitCeder(), false);
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

/**
 * Une racine et une instance qui comptent leurs lectures natives : relevé des descendants (parcours brut et
 * chemins de texte, qui en dépend) et maître. `lire` appelle les trois mémoires, dans cet ordre.
 */
function banc() {
  const lectures = { parcours: 0, maitres: 0 };
  const texte = { id: 'texte', type: 'TEXT', name: 'Titre', visible: true, boundVariables: {} } as unknown as TextNode;
  const racine = {
    id: 'racine', type: 'COMPONENT', name: 'Racine', visible: true, boundVariables: {}, children: [texte],
    findAll: () => { lectures.parcours += 1; return [texte]; },
  } as unknown as ComponentNode;
  (texte as unknown as { parent: unknown }).parent = racine;
  const maitre = {} as ComponentNode;
  const instance = { id: 'instance', getMainComponentAsync: async () => { lectures.maitres += 1; return maitre; } } as InstanceNode;
  return {
    lectures,
    async lire() {
      descendantsBruts(racine);
      textSlots(racine);
      await maitreDe(instance);
    },
  };
}

/** Les reprises que la trace a comptées pendant `corps`, pour les trois mémoires. */
async function reprises(corps: () => Promise<void>) {
  ouvrirLaMesure();
  try {
    await corps();
    const { compteurs } = fermerLaMesure('')!;
    return {
      parcours: compteurs.parcoursReutilises ?? 0,
      chemins: compteurs.cheminsDeTexteReutilises ?? 0,
      maitres: compteurs.maitresReutilises ?? 0,
    };
  } finally { abandonnerLaMesure(); }
}

test('les reprises se comptent dans la portée seule, et pas hors portée ni dans une portée refusée', async () => {
  const { lire } = banc();
  const aucune = { parcours: 0, chemins: 0, maitres: 0 };
  assert.deepEqual(await reprises(async () => { await lire(); await lire(); }), aucune);
  assert.deepEqual(await reprises(async () => {
    await dansUnePorteeDAnalyse({}, async () => {
      await dansUnePorteeDAnalyse({}, async () => { await lire(); await lire(); });
    });
  }), aucune);
  const dedans = await reprises(() => dansUnePorteeDAnalyse({}, async () => { await lire(); await lire(); }));
  assert.ok(dedans.parcours >= 1 && dedans.chemins >= 1 && dedans.maitres >= 1, JSON.stringify(dedans));
});

test('hors portée, ni le parcours, ni les chemins de texte, ni les maîtres ne gardent rien', async () => {
  const { lectures, lire } = banc();
  await lire();
  const apres = { ...lectures };
  await lire();
  assert.ok(apres.parcours >= 1 && apres.maitres === 1);
  assert.ok(lectures.parcours >= 2 * apres.parcours, `${lectures.parcours} relevés après ${apres.parcours}`);
  assert.equal(lectures.maitres, 2);
});

test('une portée fermée vide les trois mémoires : la suivante relit tout', async () => {
  const { lectures, lire } = banc();
  await dansUnePorteeDAnalyse({}, async () => { await lire(); });
  const premiere = { ...lectures };
  await dansUnePorteeDAnalyse({}, async () => {
    await lire();
    const dedans = { ...lectures };
    await lire();
    assert.deepEqual(lectures, dedans, 'dans la portée, la répétition ne relit rien');
  });
  assert.equal(lectures.maitres, 2 * premiere.maitres);
  assert.equal(lectures.parcours, 2 * premiere.parcours);
  const fermee = { ...lectures };
  await lire();
  assert.equal(lectures.maitres, fermee.maitres + 1, 'la portée fermée ne prête plus rien');
  assert.ok(lectures.parcours > fermee.parcours);
});

test('une portée refusée ne lit ni n’écrit les trois mémoires de la portée ouverte', async () => {
  const { lectures, lire } = banc();
  await dansUnePorteeDAnalyse({}, async () => {
    await lire();
    const chaude = { ...lectures };
    // La mémoire de la portée ouverte est pleine : la portée refusée ne la lit pas.
    await dansUnePorteeDAnalyse({}, async () => {
      await lire();
      assert.equal(lectures.maitres, chaude.maitres + 1);
      assert.ok(lectures.parcours > chaude.parcours);
      const refusee = { ...lectures };
      await lire();
      assert.equal(lectures.maitres, refusee.maitres + 1, 'la portée refusée n’écrit rien non plus');
      assert.ok(lectures.parcours > refusee.parcours);
    });
    // Sortie de la portée refusée : la portée ouverte retrouve sa mémoire, intacte.
    const apresRefus = { ...lectures };
    await lire();
    assert.deepEqual(lectures, apresRefus);
  });
});

test('une portée refusée dans une portée vide n’écrit pas pour la portée ouverte', async () => {
  const { lectures, lire } = banc();
  await dansUnePorteeDAnalyse({}, async () => {
    await dansUnePorteeDAnalyse({}, async () => { await lire(); });
    const apresRefus = { ...lectures };
    await lire();
    assert.equal(lectures.maitres, apresRefus.maitres + 1, 'la portée ouverte lit ce que la refusée n’a pas gardé');
    assert.ok(lectures.parcours > apresRefus.parcours);
  });
});
