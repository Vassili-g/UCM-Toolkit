/**
 * G3, les messages de l'analyse du mode Tokens suivent les étapes réelles du calcul. Une analyse simulée joue les événements de l'actualisation
 * (relevé, structure) et ceux que le calcul des noms envoie vraiment : le compte des variables acquises, puis le lexique et les questions,
 * annoncés par la session du sandbox ou, avec un Worker, par le Worker lui-même (client, port distant et session réunis, sans `postMessage`).
 * Les deux voies donnent les mêmes messages dans le même ordre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { MessageDeCalculDesNoms, ReponseDuCalculDesNoms } from '../src/messages/calculDesNoms';
import type { EtapeDesNoms, MessageDeNomenclature } from '../src/messages/nomenclature';
import { creerPortDistant } from '../src/nomenclature/distant';
import { creerSession } from '../src/nomenclature/session';
import type { Lecture } from '../src/ui/etat';
import { creerCalculateurDeNoms, type TravailleurDeNoms } from '../src/ui/nomenclature/calculDesNoms';
import { servirLesCalculs, type ReponseDuTravailleur, type RequeteDuTravailleur } from '../src/ui/nomenclature/calculDesNomsWorker';
import { TEXTES } from '../src/ui/textes';
import { creerActualisation } from '../src/ui/tokens/actualisation';
import type { AttenteDeLAnalyse } from '../src/ui/tokens/panneau';
import { FIXTURES, portDeLecture, portDeRegles, stockageDeRegles } from './outils/fixturesDeNomenclature';

const sansEcriture = { ouvrir: async () => { throw new Error('pas d\'écriture'); } };

/** Un Worker relié à `servirLesCalculs` sans navigateur : les messages s'échangent en place, dans l'ordre où le Worker les envoie. */
function travailleurRelie(): TravailleurDeNoms {
  const portee = {
    postMessage: (message: ReponseDuTravailleur) => { travailleur.onmessage?.({ data: message }); },
    onmessage: null as null | ((evenement: { data: RequeteDuTravailleur }) => void),
  };
  let demarre = false;
  const travailleur: TravailleurDeNoms = {
    postMessage(message) {
      if (!demarre) {
        demarre = true;
        servirLesCalculs(portee);
      }
      portee.onmessage?.({ data: JSON.parse(JSON.stringify(message)) as RequeteDuTravailleur });
    },
    terminate() {},
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  };
  return travailleur;
}

type Voie = 'worker' | 'sandbox';

/**
 * Joue une analyse du mode Tokens sur la fixture et rend ce que le panneau a montré, un texte de tête et un texte de Noms à chaque changement.
 * La structure arrive avant ou après le calcul des noms.
 */
async function jouer(voie: Voie, structureAvantLesNoms: boolean) {
  const fixture = FIXTURES[1];
  const vus: string[] = [];
  const etapes: EtapeDesNoms[] = [];
  let lecture: Lecture = { statut: 'en-cours', demande: 1, phase: 'collections', fait: 0, total: 1 };
  const panneau = {
    poserLAttente(attente: AttenteDeLAnalyse | null) {
      if (attente === null) { vus.push('fin'); return; }
      const ligne = `${attente.texte} | ${attente.texteDesNoms ?? '-'}`;
      if (vus.at(-1) !== ligne) vus.push(ligne);
    },
    poserLeResume() {},
  };
  const actualisation = creerActualisation({ panneau, lecture: () => lecture, relancerLesNoms: () => true, horloge: () => 0, maintenant: () => 0 });
  const signaler = (etape: EtapeDesNoms): void => { etapes.push(etape); actualisation.etapeDesNoms(etape); };

  let calcul;
  if (voie === 'worker') {
    const port = creerPortDistant({ envoyer: (message: MessageDeCalculDesNoms) => { client.recevoir(message); }, revision: () => 'r' });
    const client = creerCalculateurDeNoms({ envoyer: (reponse: ReponseDuCalculDesNoms) => { port.recevoir(reponse); }, fabriquer: travailleurRelie, surEtape: (_demande, etape) => signaler(etape) });
    calcul = port;
  }
  const messages: MessageDeNomenclature[] = [];
  const session = creerSession({
    port: { lecture: portDeLecture(fixture), ecriture: sansEcriture, regles: portDeRegles(stockageDeRegles(fixture)) },
    envoyer: (message) => {
      messages.push(message);
      if (message.type === 'etape-des-noms') signaler(message.etape);
      if (message.type === 'lecture') actualisation.lectureDesNoms(message.lues, message.total);
    },
    tranches: { pause: async () => {} },
    heure: () => '2026-01-01T00:00:00.000Z',
    calcul,
  });

  actualisation.commencer();
  lecture = { statut: 'en-cours', demande: 1, phase: 'references', fait: 3, total: 9 };
  actualisation.rafraichir();
  if (structureAvantLesNoms) {
    actualisation.recevoir('releve');
    actualisation.recevoir('structure');
  }
  await session.recevoir({ type: 'noms-analyser', demande: 2 });
  if (!structureAvantLesNoms) {
    actualisation.recevoir('releve');
    actualisation.recevoir('structure');
  }
  actualisation.recevoir('noms');
  return { vus, etapes, messages };
}

for (const voie of ['sandbox', 'worker'] as const) {
  test(`G3 : ${voie}, le lexique puis les questions sont annoncés une fois chacun, avant le bilan`, async () => {
    const { etapes, messages } = await jouer(voie, false);
    assert.deepEqual(etapes, ['lexique', 'questions']);
    // Le sandbox annonce lui-même ses étapes ; avec le Worker, c'est le Worker, et la session n'en voit aucune.
    assert.deepEqual(messages.filter((message) => message.type === 'etape-des-noms').map((message) => (message as { etape: string }).etape), voie === 'sandbox' ? ['lexique', 'questions'] : []);
    const types = messages.map((message) => message.type);
    assert.equal(types.at(-1), 'bilan');
  });
}

test('G3 : les textes se suivent dans l’ordre des événements, pareils avec le Worker et sans lui', async () => {
  for (const structureAvant of [false, true]) {
    const sandbox = await jouer('sandbox', structureAvant);
    const worker = await jouer('worker', structureAvant);
    assert.deepEqual(worker.vus, sandbox.vus, `mêmes textes, structure ${structureAvant ? 'avant' : 'après'} les noms`);
  }
  const { vus } = await jouer('sandbox', false);
  const cibles = TEXTES.lectureDesCibles;
  const sansCompte = vus.filter((ligne) => !ligne.includes('Lecture des variables, ')).filter((ligne, i, liste) => ligne !== liste[i - 1]);
  assert.deepEqual(sansCompte, [
    `${TEXTES.lectureEnCours} | -`,
    `${cibles} | -`,
    `${cibles} | ${TEXTES.verificationDesNoms}`,
    `${cibles} | ${TEXTES.rechercheDesTermes}`,
    `${TEXTES.verificationDeLaStructure} | ${TEXTES.rechercheDesTermes}`,
    'fin',
  ]);
});

test('G3 : Noms montre le compte des variables, le perd à N sur N, puis dit l’étape ou « La vérification des noms continue. »', () => {
  const panneaux: (AttenteDeLAnalyse | null)[] = [];
  const actualisation = creerActualisation({
    panneau: { poserLAttente: (attente) => { panneaux.push(attente); }, poserLeResume() {} },
    lecture: () => ({ statut: 'attente' }), relancerLesNoms: () => true, horloge: () => 0, maintenant: () => 0,
  });
  actualisation.commencer();
  actualisation.lectureDesNoms(500, 2415);
  assert.equal(panneaux.at(-1)?.texteDesNoms, 'Lecture des variables, 500 sur 2 415');
  actualisation.lectureDesNoms(2415, 2415);
  assert.equal(panneaux.at(-1)?.texteDesNoms, null, 'N sur N : le compte disparaît, la structure manque encore');
  actualisation.recevoir('releve');
  actualisation.recevoir('structure');
  assert.equal(panneaux.at(-1)?.texteDesNoms, TEXTES.verificationDesNomsContinue);
  actualisation.etapeDesNoms('lexique');
  assert.equal(panneaux.at(-1)?.texteDesNoms, TEXTES.verificationDesNoms);
  actualisation.etapeDesNoms('questions');
  assert.equal(panneaux.at(-1)?.texteDesNoms, TEXTES.rechercheDesTermes);
});

test('G3 : la même phrase ne paraît pas deux fois pendant Actualiser tant que la structure manque', () => {
  const panneaux: (AttenteDeLAnalyse | null)[] = [];
  const actualisation = creerActualisation({
    panneau: { poserLAttente: (attente) => { panneaux.push(attente); }, poserLeResume() {} },
    lecture: () => ({ statut: 'en-cours', demande: 1, phase: 'variables', fait: 0, total: 1 }), relancerLesNoms: () => true, horloge: () => 0, maintenant: () => 0,
  });
  actualisation.commencer();
  actualisation.etapeDesNoms('lexique');
  for (const attente of panneaux) assert.notEqual(attente?.texte, attente?.texteDesNoms);
  assert.equal(panneaux.at(-1)?.texte, TEXTES.lectureEnCours);
  assert.equal(panneaux.at(-1)?.texteDesNoms, TEXTES.verificationDesNoms);
});

test('G3 : une étape ou un compte reçu sans analyse des noms attendue ne change rien', () => {
  const panneaux: (AttenteDeLAnalyse | null)[] = [];
  const actualisation = creerActualisation({
    panneau: { poserLAttente: (attente) => { panneaux.push(attente); }, poserLeResume() {} },
    lecture: () => ({ statut: 'attente' }), relancerLesNoms: () => false, horloge: () => 0, maintenant: () => 0,
  });
  actualisation.etapeDesNoms('lexique');
  assert.equal(panneaux.length, 0);
  actualisation.commencer();
  const avant = panneaux.length;
  actualisation.etapeDesNoms('questions');
  actualisation.lectureDesNoms(1, 2);
  assert.equal(panneaux.length, avant);
});
