/**
 * Le journal du mode Tokens par phase : chaque passage porte son début, sa fin et le numéro de la demande, et le rapport rend toutes les
 * phases que la mesure de l'attente compare. Côté interface : les repères de réception et de rendu, joints au rapport.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASES_ENGLOBANTES, chronometrerUnAppel, compterLesAppelsDuPort, mesurerUnePhaseDeTokens, oublierLesPassagesDuModeTokens, passagesDuModeTokens, poserLaDemandeDeTokens,
  type PhaseDeTokens,
} from '../src/lecture';
import type { PortDeRegles } from '../src/ecriture/noms';
import type { PortDeLecture } from '../src/nomenclature/lecture';
import type { MessageDeNomenclature } from '../src/messages/nomenclature';
import type { MessageDeRapport } from '../src/messages/rapport';
import { creerSession } from '../src/nomenclature/session';
import { mener } from '../src/nomenclature/tranches';
import { mesuresDuModeTokens } from '../src/sandbox/capture';
import type { Contexte } from '../src/sandbox/contexte';
import { traiter } from '../src/sandbox/rapport';
import { creerActualisation, joindreLesReperes } from '../src/ui/tokens/actualisation';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const PHASES: readonly PhaseDeTokens[] = [
  'appels-locaux', 'cibles-et-imports', 'inventaire', 'lexique', 'renommages', 'questions', 'bilan', 'controler-le-catalogue', 'controler-l-integrite',
  'calcul-des-noms', 'rafraichir', 'lire-structure',
];

const NOMS: readonly (readonly [string, string])[] = [['v1', 'tile/quux/fill'], ['v2', 'tile/quux/fg'], ['v3', 'tile/quuxed/text'], ['v4', 'tile/quuxed/line']];

/** Une analyse de Nomenclature de bout en bout, avec des tranches de 0 ms pour que chaque pas cède. */
async function analyserLesNoms(demande: number): Promise<void> {
  const lecture: PortDeLecture = {
    collections: async () => [{ id: 'c', name: 'Components', remote: false }],
    variables: async () => NOMS.map(([id, name]) => ({ id, name, variableCollectionId: 'c', remote: false })),
    cibleAlias: () => undefined, protegee: () => false, palette: () => undefined,
  };
  const stock = new Map<string, string>();
  const regles: PortDeRegles = { cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '', ecrire: (cle, texte) => { stock.set(cle, texte); }, effacer: (cle) => { stock.delete(cle); } };
  const messages: MessageDeNomenclature[] = [];
  const session = creerSession({
    port: { lecture, ecriture: { ouvrir: async () => { throw new Error('pas d’écriture'); } }, regles },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {}, duree: 0 },
  });
  await session.recevoir({ type: 'noms-analyser', demande });
  assert.ok(messages.some((message) => message.type === 'bilan'));
}

function contexteDeRapport(envoyes: unknown[]): Contexte {
  return { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
}

test('le rapport du mode Tokens porte chaque phase avec son début, sa fin et le numéro de sa demande', async () => {
  oublierLesPassagesDuModeTokens();
  await analyserLesNoms(7);
  // Les lectures de la structure, avec le compteur du port : cibles, contrôles, sous la demande que `code.ts` a posée.
  poserLaDemandeDeTokens(9);
  const { port } = portDeTest([collectionFigma('c', 'Couleurs', ['Jour'], ['a'], false, 'Jour')], [variableFigma('a', 'c', 'surface', 'COLOR', { 'c:Jour': { r: 0, g: 0, b: 0, a: 1 } })]);
  await mesurerUnePhaseDeTokens('lire-structure', async (appels) => {
    const compte = compterLesAppelsDuPort(port, appels);
    await compte.getLocalVariablesAsync();
    await compte.getVariableByIdAsync('a');
    mesurerUnePhaseDeTokens('controler-le-catalogue', () => 0);
    mesurerUnePhaseDeTokens('controler-l-integrite', () => 0);
  });

  const envoyes: unknown[] = [];
  await traiter({ type: 'preparer-le-rapport-de-tokens', demande: 1 }, contexteDeRapport(envoyes));
  const message = envoyes[0] as Extract<MessageDeRapport, { type: 'rapport-de-tokens-pret' }>;
  const mesures = JSON.parse(message.mesures) as { version: number; passages: Array<{ phase: string; debut: number; fin: number; ms: number; demande: number | null; englobante: boolean }> };
  assert.equal(mesures.version, 2);
  for (const phase of PHASES) {
    const passages = mesures.passages.filter((passage) => passage.phase === phase);
    assert.ok(passages.length > 0, `la phase ${phase} manque au rapport`);
    for (const passage of passages) {
      assert.equal(typeof passage.debut, 'number', `${phase} : début`);
      assert.equal(typeof passage.fin, 'number', `${phase} : fin`);
      assert.ok(passage.fin >= passage.debut, `${phase} : la fin suit le début`);
      assert.equal(passage.ms, passage.fin - passage.debut);
      assert.equal(passage.englobante, PHASES_ENGLOBANTES.has(phase));
    }
  }
  const sousLaDemande = (phases: readonly string[], demande: number) => mesures.passages.filter((passage) => phases.includes(passage.phase)).every((passage) => passage.demande === demande);
  assert.ok(sousLaDemande(['rafraichir', 'inventaire', 'calcul-des-noms', 'lexique', 'renommages', 'questions', 'bilan'], 7));
  assert.ok(sousLaDemande(['lire-structure', 'cibles-et-imports', 'controler-le-catalogue', 'controler-l-integrite'], 9), 'les sous-phases prennent la demande de la structure');
  oublierLesPassagesDuModeTokens();
});

test('un calcul de noms note ses cessions, son attente et son plus long pas synchrone ; ses étapes tiennent dans son intervalle', async () => {
  oublierLesPassagesDuModeTokens();
  await analyserLesNoms(3);
  const calcul = passagesDuModeTokens().filter((passage) => passage.phase === 'calcul-des-noms');
  assert.equal(calcul.length, 1);
  // Quatre noms tiennent dans un pas du lexique : le calcul ne cède pas, mais il note le compte.
  assert.equal(typeof calcul[0].cessions, 'number');
  assert.equal(typeof calcul[0].attenteMs, 'number');
  assert.equal(typeof calcul[0].pasMaxMs, 'number');
  for (const phase of ['lexique', 'renommages', 'questions'] as const) {
    const [passage] = passagesDuModeTokens().filter((candidat) => candidat.phase === phase);
    assert.ok(passage, phase);
    assert.ok(passage.debut >= calcul[0].debut && passage.fin <= calcul[0].fin, `${phase} tient dans calcul-des-noms`);
    assert.equal(passage.englobante, false);
    assert.equal(typeof passage.actifMs, 'number');
  }
  assert.equal(calcul[0].englobante, true);
  oublierLesPassagesDuModeTokens();
});

test('mener compte ses cessions, l’attente des pauses et sa tranche la plus longue', async () => {
  let horloge = 0;
  const mesure = { cessions: 0, attenteMs: 0, pasMaxMs: 0 };
  function* pas(): Generator<void, string> { for (let i = 0; i < 6; i++) { horloge += 5; yield; } return 'fini'; }
  const resultat = await mener(pas(), () => false, { maintenant: () => horloge, pause: async () => { horloge += 20; }, mesure });
  assert.deepEqual(resultat, { abandonne: false, valeur: 'fini' });
  // Deux pas de 5 ms atteignent 10 ms, au-delà des 8 : une cession tous les deux pas, soit trois, la dernière tranche finissant le calcul.
  assert.equal(mesure.cessions, 3);
  assert.equal(mesure.attenteMs, 60);
  assert.equal(mesure.pasMaxMs, 10);
});

test('chronométrer un appel hors d’une phase mesurée le laisse passer tel quel, et en erreur il note quand même sa fin', async () => {
  oublierLesPassagesDuModeTokens();
  assert.equal(await chronometrerUnAppel({}, 'appels-locaux', async () => 5), 5);
  assert.deepEqual(passagesDuModeTokens(), []);
  let maintenant = 10;
  await mesurerUnePhaseDeTokens('lire-releve', async (appels) => {
    await assert.rejects(chronometrerUnAppel(appels, 'cibles-et-imports', async () => { maintenant += 4; throw new Error('refus'); }), /refus/u);
  }, () => maintenant, 5);
  const cibles = passagesDuModeTokens().find((passage) => passage.phase === 'cibles-et-imports');
  assert.deepEqual(cibles && [cibles.debut, cibles.fin, cibles.demande, cibles.appels], [10, 14, 5, { appels: 1 }]);
  oublierLesPassagesDuModeTokens();
});

test('l’actualisation note le départ, la réception et le rendu de la structure et des noms, puis la fin du rendu complet', () => {
  let heure = 1000;
  const actualisation = creerActualisation({
    panneau: { poserLAttente() {}, poserLeResume() {} },
    lecture: () => ({ statut: 'attente' }),
    relancerLesNoms: () => true,
    maintenant: () => heure,
    horloge: () => heure,
  });
  actualisation.commencer();
  heure = 1100; actualisation.noter('releve-recu'); actualisation.recevoir('releve');
  heure = 1200; actualisation.noter('structure-recue');
  heure = 1210; actualisation.noter('structure-rendue'); actualisation.recevoir('structure');
  heure = 1300; actualisation.noter('noms-recus');
  heure = 1310; actualisation.noter('noms-rendus'); actualisation.recevoir('noms');
  assert.deepEqual(actualisation.reperes().map(({ repere, a, actualisation: numero }) => [repere, a, numero]), [
    ['depart', 1000, 1], ['releve-recu', 1100, 1], ['structure-recue', 1200, 1], ['structure-rendue', 1210, 1],
    ['noms-recus', 1300, 1], ['noms-rendus', 1310, 1], ['affichage-complet', 1310, 1],
  ]);
  const joint = JSON.parse(joindreLesReperes(JSON.stringify({ version: 2, passages: [] }), actualisation.reperes())) as { passages: unknown[]; reperes: unknown[] };
  assert.deepEqual(joint.passages, []);
  assert.equal(joint.reperes.length, 7);
  assert.equal(joindreLesReperes('pas du JSON', actualisation.reperes()), 'pas du JSON');
});

test('le journal des phases se rend sans nom de variable, même quand le fichier en porte', async () => {
  oublierLesPassagesDuModeTokens();
  await analyserLesNoms(2);
  assert.doesNotMatch(JSON.stringify(mesuresDuModeTokens()), /quux|tile|Components/u);
  oublierLesPassagesDuModeTokens();
});
