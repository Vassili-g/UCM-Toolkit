/**
 * G1.3 à G1.6, le calcul des noms hors du sandbox, vu du sandbox. Le bilan que la session reçoit d'un Worker égale celui qu'elle calcule
 * elle-même, sur les fixtures et sur le rejeu ; la session se replie sur son propre calcul quand le Worker n'est pas là, échoue ou se tait ;
 * une réponse périmée est ignorée ; une lecture ou un geste après le bilan du Worker rend ce que la session aurait rendu seule.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { catalogueDepuisTokens } from '../../kit/tests/stress/rejeu-fichiers/dtcg';
import { oublierLesPassagesDuModeTokens, passagesDuModeTokens } from '../src/lecture';
import type { CauseDeRepli, MesureDuCalculDistant, ReponseDuCalculDesNoms } from '../src/messages/calculDesNoms';
import type { Bilan, DemandeDeNomenclature, MessageDeNomenclature } from '../src/messages/nomenclature';
import { calculerLeBilanDirect, moteurDuKit, type EntreeDuCalcul, type Moteur } from '../src/nomenclature/calcul';
import { creerPortDistant, type IssueDuCalculDistant, type PortDeCalculDistant, type RequeteDistante } from '../src/nomenclature/distant';
import { lireInventaire } from '../src/nomenclature/lecture';
import { lireLesRegles, lireLeStockage } from '../src/nomenclature/regles';
import { creerSession } from '../src/nomenclature/session';
import { FIXTURES, entreeDeFixture, portDeLecture, portDeRegles, stockageDeRegles, type FixtureDeNomenclature } from './outils/fixturesDeNomenclature';

const racine = join(__dirname, '..', '..', '..');
const sansEcriture = { ouvrir: async () => { throw new Error('pas d\'écriture'); } };

/** Ce que le pont de Figma fait d'un message : une copie JSON, sans Map ni fonction. */
const parLePont = <T>(valeur: T): T => JSON.parse(JSON.stringify(valeur)) as T;

const MESURE: MesureDuCalculDistant = { recuA: 11, demarrage: true, travailleurRecuA: 14, calculDebutA: 14, calculFinA: 20 };

/** Un port qui calcule comme le Worker : sur la copie de l'entrée que le pont lui rend, et rend la copie du bilan. */
function portDuTravailleur(reponse: (entree: EntreeDuCalcul) => IssueDuCalculDistant | Promise<IssueDuCalculDistant> = (entree) => ({
  type: 'calcule', bilan: parLePont(calculerLeBilanDirect(parLePont(entree))), mesure: MESURE, envoyeA: 10, recuA: 21,
})): PortDeCalculDistant & { readonly requetes: { demande: number; generation: number; octets: number }[]; annulees: number } {
  const port = {
    requetes: [] as { demande: number; generation: number; octets: number }[],
    annulees: 0,
    calculer({ demande, generation, entree }: { demande: number; generation: number; entree: EntreeDuCalcul }): RequeteDistante {
      port.requetes.push({ demande, generation, octets: JSON.stringify(entree).length });
      return { issue: Promise.resolve(reponse(entree)), annuler: () => { port.annulees += 1; } };
    },
  };
  return port;
}

interface Banc { readonly messages: MessageDeNomenclature[]; readonly session: ReturnType<typeof creerSession>; readonly moteurs: { lexiques: number } }

/** Une session sur la fixture, avec ou sans Worker ; un moteur qui compte les calculs de lexique que le sandbox mène. */
function banc(fixture: FixtureDeNomenclature, calcul?: PortDeCalculDistant): Banc {
  const messages: MessageDeNomenclature[] = [];
  const moteurs = { lexiques: 0 };
  const moteur: Moteur = { ...moteurDuKit, commencerLexique: (options) => { moteurs.lexiques += 1; return moteurDuKit.commencerLexique(options); } };
  const session = creerSession({
    port: { lecture: portDeLecture(fixture), ecriture: sansEcriture, regles: portDeRegles(stockageDeRegles(fixture)) },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
    moteur,
    calcul,
  });
  return { messages, session, moteurs };
}

const bilanDe = (messages: readonly MessageDeNomenclature[]): Bilan => {
  const message = messages.find((candidat) => candidat.type === 'bilan');
  assert.ok(message && message.type === 'bilan', `un bilan était attendu, reçu : ${messages.map((candidat) => candidat.type).join(',')}`);
  return message.bilan;
};
const texte = (valeur: unknown): string => JSON.stringify(valeur);

for (const fixture of FIXTURES) {
  test(`le bilan du Worker égale celui du sandbox : ${fixture.nom}`, async () => {
    const seul = banc(fixture);
    await seul.session.recevoir({ type: 'noms-analyser', demande: 1 });
    const avecWorker = banc(fixture, portDuTravailleur());
    await avecWorker.session.recevoir({ type: 'noms-analyser', demande: 1 });
    assert.equal(texte(bilanDe(avecWorker.messages)), texte(bilanDe(seul.messages)), 'le bilan, dans son ordre complet');
    assert.deepEqual(avecWorker.messages.map((message) => message.type), seul.messages.map((message) => message.type), 'les mêmes messages, dans le même ordre');
    assert.equal(avecWorker.moteurs.lexiques, 0, 'le sandbox ne calcule pas le lexique quand le Worker rend le bilan');
    assert.ok(seul.moteurs.lexiques > 0);
  });
}

// Les fichiers du rejeu

const SOURCES = [
  { nom: 'premier fichier', chemin: join(racine, 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json') },
  { nom: 'second fichier', chemin: join(racine, '..', 'intencial-library/src/tokens/tokens.json') },
];

function fixtureDeRejeu(chemin: string, avecRegle: boolean): FixtureDeNomenclature {
  const { catalogue } = catalogueDepuisTokens(JSON.parse(readFileSync(chemin, 'utf8')));
  return {
    nom: 'rejeu',
    collections: catalogue.collections.map((collection) => ({ id: collection.cle, name: collection.nom, modes: collection.modes })),
    variables: catalogue.variables.map((variable) => [variable.cle, variable.nom, variable.collection] as const),
    regles: avecRegle ? [{ type: 'ecriture', ecriture: { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } } }] : [],
  };
}

for (const source of SOURCES) {
  test(`le bilan du Worker égale celui du sandbox sur le rejeu : ${source.nom}`, { skip: !existsSync(source.chemin) }, async () => {
    for (const avecRegle of [true, false]) {
      const fixture = fixtureDeRejeu(source.chemin, avecRegle);
      const seul = banc(fixture);
      await seul.session.recevoir({ type: 'noms-analyser', demande: 1 });
      const travailleur = portDuTravailleur();
      const avecWorker = banc(fixture, travailleur);
      await avecWorker.session.recevoir({ type: 'noms-analyser', demande: 1 });
      assert.equal(texte(bilanDe(avecWorker.messages)), texte(bilanDe(seul.messages)));
      // L'inventaire passe en un seul message : sa taille JSON est celle de ce que le pont de Figma porte.
      assert.equal(travailleur.requetes.length, 1, 'un seul message porte l\'inventaire');
      console.log(`${source.nom} (${avecRegle ? 'écriture choisie' : 'sans règle'}) : ${fixture.variables.length} variables, entrée de ${travailleur.requetes[0].octets} octets, ${bilanDe(avecWorker.messages).groupes.length} groupes, bilan de ${texte(bilanDe(avecWorker.messages)).length} octets`);
      assert.ok(travailleur.requetes[0].octets < 20_000_000, 'l\'entrée tient en un message');
    }
  });
}

test('le journal note la voie du Worker et ses quatre phases ; le sandbox ne note ni lexique, ni renommages, ni questions', async () => {
  oublierLesPassagesDuModeTokens();
  const { session } = banc(FIXTURES[1], portDuTravailleur());
  await session.recevoir({ type: 'noms-analyser', demande: 5 });
  const passages = passagesDuModeTokens();
  const de = (phase: string) => passages.filter((passage) => passage.phase === phase);
  assert.deepEqual(de('worker-transfert').map((passage) => [passage.debut, passage.fin]), [[10, 11]], 'le transfert s\'arrête à l\'interface quand elle crée le Worker');
  assert.deepEqual(de('worker-demarrage').map((passage) => [passage.debut, passage.fin]), [[11, 14]]);
  assert.deepEqual(de('worker-calcul').map((passage) => [passage.debut, passage.fin]), [[14, 20]]);
  assert.deepEqual(de('worker-retour').map((passage) => [passage.debut, passage.fin]), [[20, 21]]);
  assert.deepEqual(de('calcul-des-noms').map((passage) => [passage.voie, passage.demande, passage.englobante]), [['worker', 5, true]]);
  for (const phase of ['worker-transfert', 'worker-demarrage', 'worker-calcul', 'worker-retour']) assert.equal(de(phase)[0].demande, 5);
  for (const phase of ['lexique', 'renommages', 'questions', 'bilan']) assert.deepEqual(de(phase), [], `le sandbox ne mène pas ${phase}`);
  oublierLesPassagesDuModeTokens();
});

test('sans Worker ou quand le Worker se replie, le sandbox calcule et le journal dit la voie et la cause', async () => {
  const causes: readonly (CauseDeRepli | null)[] = [null, 'indisponible', 'demarrage', 'echec', 'delai'];
  const seul = banc(FIXTURES[2]);
  await seul.session.recevoir({ type: 'noms-analyser', demande: 1 });
  for (const cause of causes) {
    oublierLesPassagesDuModeTokens();
    const port = cause === null ? undefined : portDuTravailleur(() => ({ type: 'repli', cause }));
    const replie = banc(FIXTURES[2], port);
    await replie.session.recevoir({ type: 'noms-analyser', demande: 2 });
    assert.equal(texte(bilanDe(replie.messages)), texte(bilanDe(seul.messages)), `bilan identique, repli ${cause}`);
    assert.ok(replie.moteurs.lexiques > 0, `le sandbox calcule, repli ${cause}`);
    const [calcul] = passagesDuModeTokens().filter((passage) => passage.phase === 'calcul-des-noms');
    assert.equal(calcul.voie, 'sandbox');
    assert.equal(calcul.repli, cause ?? undefined);
    assert.deepEqual(passagesDuModeTokens().filter((passage) => passage.phase.startsWith('worker-')), []);
  }
  oublierLesPassagesDuModeTokens();
});

test('un port qui lève, ou un bilan d\'une autre génération, replie la session sur son propre calcul', async () => {
  const seul = banc(FIXTURES[1]);
  await seul.session.recevoir({ type: 'noms-analyser', demande: 1 });
  const leve: PortDeCalculDistant = { calculer() { throw new Error('refus'); } };
  const autreGeneration = portDuTravailleur((entree) => ({
    type: 'calcule', bilan: parLePont(calculerLeBilanDirect({ ...entree, generation: entree.generation + 7 })), mesure: MESURE, envoyeA: 1, recuA: 2,
  }));
  for (const port of [leve, autreGeneration]) {
    const replie = banc(FIXTURES[1], port);
    await replie.session.recevoir({ type: 'noms-analyser', demande: 1 });
    assert.equal(texte(bilanDe(replie.messages)), texte(bilanDe(seul.messages)));
    assert.ok(replie.moteurs.lexiques > 0);
  }
});

test('après le bilan du Worker, une lecture et un geste rendent ce que la session aurait rendu seule', async () => {
  const fixture = FIXTURES[2];
  const seul = banc(fixture);
  const distant = banc(fixture, portDuTravailleur());
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'noms-analyser', demande: 1 });
  const generation = bilanDe(seul.messages).generation;
  assert.equal(bilanDe(distant.messages).generation, generation);
  assert.equal(distant.moteurs.lexiques, 0, 'rien n\'est calculé avant la première lecture');
  const groupe = bilanDe(seul.messages).groupes[0].cle;
  const lectures: readonly DemandeDeNomenclature[] = [
    { type: 'lignes', demande: 2, generation, groupe, debut: 0 },
    { type: 'fiche', demande: 3, generation, terme: 'quux' },
    { type: 'noms-selection', demande: 4, generation, exclus: [], inclus: [] },
    { type: 'diagnostic', demande: 5, generation },
    { type: 'simuler', demande: 6, generation, geste: { type: 'ecart-ucm', terme: 'disabled', actif: false } },
  ];
  for (const lecture of lectures) {
    for (const { session } of [seul, distant]) await session.recevoir(lecture);
  }
  const reponses = (messages: readonly MessageDeNomenclature[]) => messages.filter((message) => message.type !== 'bilan' && message.type !== 'initial');
  assert.equal(texte(reponses(distant.messages)), texte(reponses(seul.messages)), 'mêmes réponses de lecture');
  assert.equal(distant.moteurs.lexiques, 1, 'la première lecture refait le calcul complet, une seule fois pour toutes les lectures');
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'regle', demande: 7, geste: { type: 'supprimer', terme: 'quux' } });
  assert.equal(texte(bilanDe(distant.messages.slice(-1))), texte(bilanDe(seul.messages.slice(-1))), 'le bilan du geste est le même');
  assert.equal(bilanDe(distant.messages.slice(-1)).generation, generation + 1);
});

test('une lecture d\'une génération périmée après le bilan du Worker reçoit l\'erreur d\'une session seule', async () => {
  const distant = banc(FIXTURES[1], portDuTravailleur());
  await distant.session.recevoir({ type: 'noms-analyser', demande: 1 });
  const generation = bilanDe(distant.messages).generation;
  await distant.session.recevoir({ type: 'lignes', demande: 2, generation: generation + 1, groupe: 'x', debut: 0 });
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 2, code: 'generation-perimee' });
  await distant.session.recevoir({ type: 'appliquer', demande: 3, generation: generation + 1, selection: { groupes: [], exclus: [], inclus: [] } });
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 3, code: 'generation-perimee' });
});

// Le port : les réponses périmées

function portDeLaSession(delai = 1000) {
  const envoyes: { demande: number; generation: number; revision: string }[] = [];
  const rappels: (() => void)[] = [];
  const port = creerPortDistant({
    envoyer: (message) => { envoyes.push({ demande: message.demande, generation: message.generation, revision: message.revision }); },
    revision: () => 'r1',
    delai,
    planifier: (rappel) => { rappels.push(rappel); return () => { rappels.splice(rappels.indexOf(rappel), 1); }; },
  });
  return { port, envoyes, rappels };
}

const ENTREE = { generation: 4, inventaire: { entrees: [], collections: [] }, regles: {} } as unknown as EntreeDuCalcul;
const BILAN = { generation: 4, groupes: [], questions: [] } as unknown as Bilan;
const calcule = (demande: number, generation: number, revision: string): ReponseDuCalculDesNoms => ({ type: 'noms-calcules', demande, generation, revision, bilan: BILAN, mesure: MESURE });

test('le port ignore une réponse dont la demande, la génération ou la révision diffère, et attend la bonne', async () => {
  const { port, envoyes } = portDeLaSession();
  const requete = port.calculer({ demande: 7, generation: 4, entree: ENTREE });
  assert.deepEqual(envoyes, [{ demande: 7, generation: 4, revision: 'r1' }]);
  let rendue: IssueDuCalculDistant | null = null;
  void requete.issue.then((issue) => { rendue = issue; });
  for (const perimee of [calcule(6, 4, 'r1'), calcule(7, 3, 'r1'), calcule(7, 4, 'r0'), { type: 'noms-non-calcules', demande: 7, generation: 3, revision: 'r1', cause: 'echec' } as const]) {
    port.recevoir(perimee);
    await Promise.resolve();
    assert.equal(rendue, null, 'une réponse périmée ne conclut rien');
  }
  port.recevoir(calcule(7, 4, 'r1'));
  const issue = await requete.issue;
  assert.equal(issue.type, 'calcule');
  // Une réponse tardive pour la même demande ne rouvre rien.
  port.recevoir({ type: 'noms-non-calcules', demande: 7, generation: 4, revision: 'r1', cause: 'echec' });
});

test('le port se replie après le délai, sur l\'échec du Worker ou quand l\'envoi lève, et abandonne sur demande', async () => {
  const delai = portDeLaSession();
  const attente = delai.port.calculer({ demande: 1, generation: 1, entree: ENTREE });
  delai.rappels[0]();
  assert.deepEqual(await attente.issue, { type: 'repli', cause: 'delai' });
  assert.deepEqual(delai.rappels, [], 'le rappel du délai est annulé quand la requête conclut');

  const echec = portDeLaSession();
  const requete = echec.port.calculer({ demande: 2, generation: 1, entree: ENTREE });
  echec.port.recevoir({ type: 'noms-non-calcules', demande: 2, generation: 1, revision: 'r1', cause: 'demarrage' });
  assert.deepEqual(await requete.issue, { type: 'repli', cause: 'demarrage' });

  const leve = creerPortDistant({ envoyer: () => { throw new Error('plus d\'interface'); }, revision: () => 'r' });
  assert.deepEqual(await leve.calculer({ demande: 3, generation: 1, entree: ENTREE }).issue, { type: 'repli', cause: 'indisponible' });

  const abandon = portDeLaSession();
  const abandonnee = abandon.port.calculer({ demande: 4, generation: 1, entree: ENTREE });
  abandonnee.annuler();
  assert.deepEqual(await abandonnee.issue, { type: 'annule' });
  abandon.port.recevoir(calcule(4, 1, 'r1'));
});

test('une analyse plus récente abandonne l\'attente du Worker : la réponse de l\'ancienne est ignorée et seule la nouvelle donne un bilan', async () => {
  const { port, envoyes } = portDeLaSession();
  const messages: MessageDeNomenclature[] = [];
  const fixture = FIXTURES[1];
  const session = creerSession({
    port: { lecture: portDeLecture(fixture), ecriture: sansEcriture, regles: portDeRegles(stockageDeRegles(fixture)) },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
    calcul: port,
  });
  const premiere = session.recevoir({ type: 'noms-analyser', demande: 1 });
  while (envoyes.length < 1) await new Promise((resoudre) => setImmediate(resoudre));
  const seconde = session.recevoir({ type: 'noms-analyser', demande: 2 });
  await premiere;
  while (envoyes.length < 2) await new Promise((resoudre) => setImmediate(resoudre));
  assert.deepEqual(envoyes.map((envoi) => envoi.demande), [1, 2]);
  const entree = { generation: envoyes[1].generation, inventaire: await lireInventaire(portDeLecture(fixture), { pause: async () => {} }), regles: lireLesRegles(lireLeStockage(portDeRegles(stockageDeRegles(fixture)))) };
  // L'ancienne réponse arrive après l'abandon : elle ne rend rien.
  port.recevoir({ type: 'noms-calcules', demande: 1, generation: envoyes[0].generation, revision: 'r1', bilan: parLePont(calculerLeBilanDirect(entree)), mesure: MESURE });
  assert.deepEqual(messages.filter((message) => message.type === 'bilan'), []);
  port.recevoir({ type: 'noms-calcules', demande: 2, generation: envoyes[1].generation, revision: 'r1', bilan: parLePont(calculerLeBilanDirect(entree)), mesure: MESURE });
  await seconde;
  assert.deepEqual(messages.filter((message) => message.type === 'bilan').map((message) => message.demande), [2]);
});
