/**
 * G1.3 à G1.7, le travail des noms hors du sandbox, vu du sandbox. Le Worker garde l'état complet de chaque génération : le bilan, la réponse à
 * une question, une simulation, une page de lignes, une fiche et les renommages à écrire qu'il rend égalent ceux que la session calcule seule ;
 * le sandbox ne calcule aucun lexique tant que le Worker répond. La session se replie sur son propre calcul quand le Worker n'est pas là, échoue
 * ou se tait ; une réponse périmée est ignorée.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';

import { catalogueDepuisTokens } from '../../kit/tests/stress/rejeu-fichiers/dtcg';
import { oublierLesPassagesDuModeTokens, passagesDuModeTokens } from '../src/lecture';
import type { CauseDeRepli, MesureDuCalculDistant, ReponseDuCalculDesNoms, TravailDesNoms } from '../src/messages/calculDesNoms';
import type { Bilan, DemandeDeNomenclature, MessageDeNomenclature } from '../src/messages/nomenclature';
import { creerAtelier } from '../src/nomenclature/atelier';
import { calculerLeBilanDirect, moteurDuKit, type EntreeDuCalcul, type Moteur } from '../src/nomenclature/calcul';
import { creerPortDistant, type IssueDuCalculDistant, type PortDeCalculDistant, type RequeteDistante } from '../src/nomenclature/distant';
import { inventaireDeLectures, lireInventaire, type PortDeLecture } from '../src/nomenclature/lecture';
import { lireLesRegles, lireLeStockage } from '../src/nomenclature/regles';
import { creerSession } from '../src/nomenclature/session';
import type { ObjetModifiable, PortEcriture, SessionEcriture, VariableModifiable } from '../src/ecriture/noms';
import { FIXTURES, entreeDeFixture, portDeLecture, portDeRegles, stockageDeRegles, type FixtureDeNomenclature } from './outils/fixturesDeNomenclature';

const racine = join(__dirname, '..', '..', '..');
const sansEcriture = { ouvrir: async () => { throw new Error('pas d\'écriture'); } };

/** Ce que le pont de Figma fait d'un message : une copie JSON, sans Map ni fonction. */
const parLePont = <T>(valeur: T): T => JSON.parse(JSON.stringify(valeur)) as T;

const MESURE: MesureDuCalculDistant = { recuA: 11, demarrage: true, travailleurRecuA: 14, calculDebutA: 14, calculFinA: 20 };

/** Remplace la réponse du Worker à un travail ; `undefined` laisse l'atelier répondre. */
type Surcharge = (travail: TravailDesNoms, generation: number) => IssueDuCalculDistant | Promise<IssueDuCalculDistant> | undefined;
interface PortDeTest extends PortDeCalculDistant { readonly requetes: { demande: number; generation: number; sorte: string; octets: number }[]; annulees: number }

/** Un port qui travaille comme le Worker : un atelier à lui, sur la copie du travail que le pont lui rend, et rend la copie du résultat. */
function portDuTravailleur(surcharge?: Surcharge): PortDeTest {
  const atelier = creerAtelier();
  const port: PortDeTest = {
    requetes: [],
    annulees: 0,
    calculer({ demande, generation, travail }): RequeteDistante {
      port.requetes.push({ demande, generation, sorte: travail.sorte, octets: JSON.stringify(travail).length });
      const imposee = surcharge?.(travail, generation);
      let issue: IssueDuCalculDistant | Promise<IssueDuCalculDistant>;
      if (imposee) issue = imposee;
      else {
        try {
          issue = { type: 'calcule', resultat: parLePont(atelier.executer(parLePont(travail), generation)), mesure: MESURE, envoyeA: 10, recuA: 21 };
        } catch {
          issue = { type: 'repli', cause: 'echec' };
        }
      }
      return { issue: Promise.resolve(issue), annuler: () => { port.annulees += 1; } };
    },
  };
  return port;
}

const repli = (cause: CauseDeRepli): IssueDuCalculDistant => ({ type: 'repli', cause });
const sauf = (sorte: TravailDesNoms['sorte'], issue: IssueDuCalculDistant): Surcharge => (travail) => (travail.sorte === sorte ? issue : undefined);

/** Des objets de Figma en mémoire : les noms écrits y restent, et l'inventaire que `ouvrir` rend les relit. */
function ecritureEnMemoire(fixture: FixtureDeNomenclature) {
  const noms = new Map<string, string>([...fixture.collections.map((c) => [c.id, c.name] as const), ...fixture.variables.map(([id, name]) => [id, name] as const)]);
  const objet = <T extends object>(id: string, extra: T) => ({ id, remote: false, ...extra, get name() { return noms.get(id)!; }, set name(valeur: string) { noms.set(id, valeur); } });
  const collections = new Map<string, ObjetModifiable>(fixture.collections.map((c) => [c.id, objet(c.id, {})]));
  const variables = new Map<string, VariableModifiable>(fixture.variables.map(([id, , collection]) => [id, objet(id, { variableCollectionId: collection })]));
  const collectionsLues = () => fixture.collections.map((c) => ({ id: c.id, name: noms.get(c.id)!, remote: false, ...(c.modes ? { modes: c.modes } : {}) }));
  const variablesLues = () => fixture.variables.map(([id, , collection]) => ({ id, name: noms.get(id)!, variableCollectionId: collection, remote: false }));
  const lecture: PortDeLecture = { ...portDeLecture(fixture), collections: async () => collectionsLues(), variables: async () => variablesLues() };
  const session = (): SessionEcriture => ({
    inventaire: inventaireDeLectures(collectionsLues(), variablesLues(), lecture),
    collection: (id) => collections.get(id) ?? null,
    variable: (id) => variables.get(id) ?? null,
    commitUndo: () => {},
  });
  const ecriture: PortEcriture = { ouvrir: async () => session() };
  return { noms, lecture, ecriture };
}

interface Banc {
  readonly messages: MessageDeNomenclature[];
  /** Les étapes que le sandbox annonce quand il calcule lui-même : elles ne font pas partie du bilan ni de la suite des réponses. */
  readonly etapes: string[];
  readonly session: ReturnType<typeof creerSession>;
  readonly moteurs: { lexiques: number };
  readonly stock: Map<string, string>;
  readonly noms: Map<string, string>;
}

/** Une session sur la fixture, avec ou sans Worker ; un moteur qui compte les calculs de lexique que le sandbox mène. */
function banc(fixture: FixtureDeNomenclature, calcul?: PortDeCalculDistant, avecEcriture = false): Banc {
  const messages: MessageDeNomenclature[] = [];
  const etapes: string[] = [];
  const moteurs = { lexiques: 0 };
  const moteur: Moteur = { ...moteurDuKit, commencerLexique: (options) => { moteurs.lexiques += 1; return moteurDuKit.commencerLexique(options); } };
  const stock = stockageDeRegles(fixture);
  const memoire = ecritureEnMemoire(fixture);
  const session = creerSession({
    port: { lecture: avecEcriture ? memoire.lecture : portDeLecture(fixture), ecriture: avecEcriture ? memoire.ecriture : sansEcriture, regles: portDeRegles(stock) },
    envoyer: (message) => { if (message.type === 'etape-des-noms') etapes.push(message.etape); else messages.push(message); },
    tranches: { pause: async () => {} },
    heure: () => '2026-01-01T00:00:00.000Z',
    moteur,
    calcul,
  });
  return { messages, etapes, session, moteurs, stock, noms: memoire.noms };
}

const bilanDe = (messages: readonly MessageDeNomenclature[]): Bilan => {
  const message = messages.find((candidat) => candidat.type === 'bilan');
  assert.ok(message && message.type === 'bilan', `un bilan était attendu, reçu : ${messages.map((candidat) => candidat.type).join(',')}`);
  return message.bilan;
};
const dernierBilan = (messages: readonly MessageDeNomenclature[]): Bilan => bilanDe(messages.filter((message) => message.type === 'bilan').slice(-1));
const texte = (valeur: unknown): string => JSON.stringify(valeur);
const reponses = (messages: readonly MessageDeNomenclature[]) => messages.filter((message) => !['bilan', 'initial', 'lecture'].includes(message.type));

// Le bilan d'une analyse

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

// Le journal et le repli de l'analyse

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
    const port = cause === null ? undefined : portDuTravailleur(() => repli(cause));
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
  const autreGeneration = portDuTravailleur((travail) => (travail.sorte === 'calculer' ? {
    type: 'calcule', resultat: { sorte: 'bilan', bilan: parLePont(calculerLeBilanDirect({ ...travail.entree, generation: travail.entree.generation + 7 })) }, mesure: MESURE, envoyeA: 1, recuA: 2,
  } : undefined));
  for (const port of [leve, autreGeneration]) {
    const replie = banc(FIXTURES[1], port);
    await replie.session.recevoir({ type: 'noms-analyser', demande: 1 });
    assert.equal(texte(bilanDe(replie.messages)), texte(bilanDe(seul.messages)));
    assert.ok(replie.moteurs.lexiques > 0);
  }
});

// Les lectures, les simulations et les gestes : le Worker garde l'état

const GENERATION_DE_LA_FIXTURE = 1;

/** Deux sessions sur la fixture, l'une seule et l'autre avec Worker, après leur analyse. */
async function deuxSessions(fixture: FixtureDeNomenclature, surcharge?: Surcharge, avecEcriture = false) {
  const seul = banc(fixture, undefined, avecEcriture);
  const travailleur = portDuTravailleur(surcharge);
  const distant = banc(fixture, travailleur, avecEcriture);
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'noms-analyser', demande: 1 });
  const generation = bilanDe(seul.messages).generation;
  assert.equal(generation, GENERATION_DE_LA_FIXTURE);
  assert.equal(bilanDe(distant.messages).generation, generation);
  assert.equal(distant.moteurs.lexiques, 0, 'rien n\'est calculé dans le sandbox après le bilan du Worker');
  return { seul, distant, travailleur, generation };
}

test('G1.7 : une page de lignes, les termes, une fiche, la sélection, le diagnostic et une simulation viennent du Worker, sans calcul dans le sandbox', async () => {
  const { seul, distant, travailleur, generation } = await deuxSessions(FIXTURES[2]);
  const groupe = bilanDe(seul.messages).groupes[0].cle;
  const lectures: readonly DemandeDeNomenclature[] = [
    { type: 'lignes', demande: 2, generation, groupe, debut: 0 },
    { type: 'termes', demande: 3, generation, recherche: '', types: [], origines: [], places: [], tri: 'alpha', section: null, place: null, debut: 0 },
    { type: 'fiche', demande: 4, generation, terme: 'quux' },
    { type: 'noms-selection', demande: 5, generation, exclus: [], inclus: [] },
    { type: 'diagnostic', demande: 6, generation },
    { type: 'simuler', demande: 7, generation, geste: { type: 'ecart-ucm', terme: 'disabled', actif: false } },
    { type: 'simuler', demande: 8, generation, geste: { type: 'ecriture', ecriture: { groupes: { casse: 'PascalCase', separateur: 'espace' }, variables: { casse: 'minuscules', separateur: 'tiret' } } } },
    { type: 'simuler', demande: 9, generation, geste: { type: 'remplacer-par', terme: 'quux', par: 'quuxed' } },
    { type: 'simuler', demande: 10, generation, geste: { type: 'remplacer-par', terme: 'fg', par: 'foreground' } },
    { type: 'simuler', demande: 11, generation, geste: { type: 'supprimer', terme: 'quux' } },
  ];
  for (const lecture of lectures) for (const { session } of [seul, distant]) await session.recevoir(lecture);
  assert.equal(texte(reponses(distant.messages)), texte(reponses(seul.messages)), 'mêmes réponses de lecture et de simulation');
  assert.equal(reponses(seul.messages).length, lectures.length);
  assert.equal(distant.moteurs.lexiques, 0, 'le sandbox ne calcule rien pour ces demandes');
  assert.deepEqual(travailleur.requetes.slice(1).map((requete) => requete.sorte), ['lire', 'lire', 'lire', 'lire', 'lire', 'simuler', 'simuler', 'simuler', 'simuler', 'simuler']);
  const simulation = (demande: number) => reponses(distant.messages).flatMap((message) => (message.type === 'simulation' && message.demande === demande ? [message] : []))[0];
  assert.notEqual(simulation(9).conflit, null, 'la simulation d\'un cycle rend un conflit');
  assert.notEqual(simulation(7).effet, null);
});

test('G1.7 : une simulation d\'un mot refusé rend la même erreur que la session seule', async () => {
  const { seul, distant } = await deuxSessions(FIXTURES[2]);
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'simuler', demande: 2, generation: GENERATION_DE_LA_FIXTURE, geste: { type: 'remplacer-par', terme: 'quux', par: '' } });
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 2, code: 'mot-refuse' });
  assert.deepEqual(distant.messages.at(-1), seul.messages.at(-1));
});

test('G1.7 : une réponse à une question recalcule dans le Worker et rend le bilan, les règles et la génération de la session seule', async () => {
  const { seul, distant, travailleur, generation } = await deuxSessions(FIXTURES[1]);
  // Le fichier refuse `fg` pour `foreground` (terme UCM) : ces paires-là rendent un refus, pas un recalcul.
  const paires = bilanDe(seul.messages).questions.filter((question) => question.type === 'paire' && !question.cle.includes('fg'));
  assert.ok(paires.length > 1);
  const reponsesAuxQuestions = [
    { question: paires[0].cle, reponse: { type: 'garder', rang: 0 } as const },
    { question: paires[1].cle, reponse: { type: 'distincts' } as const },
    { question: paires[2].cle, reponse: { type: 'plus-tard' } as const },
  ];
  for (const [rang, { question, reponse }] of reponsesAuxQuestions.entries()) {
    for (const { session } of [seul, distant]) await session.recevoir({ type: 'noms-repondre', demande: 2 + rang, question, reponse });
    assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)), `bilan après la réponse ${rang + 1}`);
    assert.equal(dernierBilan(distant.messages).generation, generation + rang + 1);
  }
  assert.equal(texte([...distant.stock]), texte([...seul.stock]), 'les mêmes règles sont rangées');
  assert.equal(distant.moteurs.lexiques, 0, 'le sandbox ne calcule ni lexique ni recalcul');
  assert.deepEqual(travailleur.requetes.slice(1).map((requete) => requete.sorte), ['preparer', 'recalculer', 'preparer', 'recalculer', 'preparer', 'recalculer']);
  // Les lectures de la dernière génération viennent encore du Worker, qui a gardé l'état recalculé.
  const generationFinale = generation + reponsesAuxQuestions.length;
  const groupe = dernierBilan(seul.messages).groupes[0].cle;
  const lecture: DemandeDeNomenclature = { type: 'lignes', demande: 9, generation: generationFinale, groupe, debut: 0 };
  for (const { session } of [seul, distant]) await session.recevoir(lecture);
  assert.equal(texte(distant.messages.at(-1)), texte(seul.messages.at(-1)));
  assert.equal(distant.moteurs.lexiques, 0);
  assert.equal(travailleur.requetes.at(-1)!.sorte, 'lire');
});

test('G1.7 : un geste sur les règles, un refus et une exclusion de collection recalculent dans le Worker comme dans le sandbox', async () => {
  const { seul, distant, generation } = await deuxSessions(FIXTURES[2]);
  const demandes: readonly DemandeDeNomenclature[] = [
    { type: 'regle', demande: 2, geste: { type: 'remplacer-par', terme: 'fg', par: 'foreground' } },
    { type: 'regle', demande: 3, geste: { type: 'remplacer-par', terme: 'quux', par: 'quuxed' } },
    { type: 'configurer', demande: 4, collectionsExclues: ['c3'] },
    { type: 'regle', demande: 5, geste: { type: 'supprimer', terme: 'fg' } },
    { type: 'regle', demande: 6, geste: { type: 'remplacer-par', terme: 'nouveau', par: '' } },
  ];
  for (const demande of demandes) for (const { session } of [seul, distant]) await session.recevoir(demande);
  assert.deepEqual(distant.messages.map((message) => message.type), seul.messages.map((message) => message.type));
  assert.equal(texte(distant.messages.filter((message) => message.type !== 'bilan')), texte(seul.messages.filter((message) => message.type !== 'bilan')), 'refus et erreur identiques');
  assert.equal(texte(distant.messages.filter((message) => message.type === 'bilan')), texte(seul.messages.filter((message) => message.type === 'bilan')), 'bilans identiques');
  assert.equal(dernierBilan(distant.messages).generation, generation + 3);
  assert.equal(texte([...distant.stock]), texte([...seul.stock]));
  assert.equal(distant.moteurs.lexiques, 0);
});

test('G1.7 : un import des règles recalcule dans le Worker', async () => {
  const { seul, distant, travailleur } = await deuxSessions(FIXTURES[2]);
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'exporter', demande: 2 });
  const exporte = seul.messages.at(-1);
  assert.ok(exporte && exporte.type === 'regles-exportees');
  const modifie = JSON.stringify({ ...JSON.parse(exporte.texte), termes: [] });
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'importer', demande: 3, texte: modifie });
  assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)));
  assert.equal(distant.moteurs.lexiques, 0);
  assert.equal(travailleur.requetes.at(-1)!.sorte, 'recalculer');
});

test('G1.7 : le premier choix d\'écriture marque les groupes comme vus puis le Worker refait la projection', async () => {
  const ecriture = { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } } as const;
  const { seul, distant, travailleur } = await deuxSessions(FIXTURES[0]);
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'regle', demande: 2, geste: { type: 'ecriture', ecriture } });
  assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)));
  assert.equal(texte([...distant.stock]), texte([...seul.stock]), 'les groupes vus sont rangés');
  assert.deepEqual(travailleur.requetes.slice(1).map((requete) => requete.sorte), ['preparer', 'recalculer', 'adopter']);
  assert.equal(distant.moteurs.lexiques, 0);
});

test('G1.7 : appliquer écrit les renommages que le Worker rend, relus contre l\'inventaire du sandbox', async () => {
  const { seul, distant, travailleur } = await deuxSessions(FIXTURES[1], undefined, true);
  const selection = { groupes: bilanDe(seul.messages).groupes.map((groupe) => groupe.cle), exclus: [], inclus: [] };
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'appliquer', demande: 2, generation: GENERATION_DE_LA_FIXTURE, selection });
  assert.ok(seul.messages.some((message) => message.type === 'application' && message.resultat.renommes > 0), 'des noms sont écrits');
  assert.equal(texte([...distant.noms]), texte([...seul.noms]), 'les mêmes noms dans Figma');
  assert.equal(texte(distant.messages.filter((message) => message.type === 'application')), texte(seul.messages.filter((message) => message.type === 'application')));
  assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)), 'le bilan relu après l\'écriture');
  assert.deepEqual(travailleur.requetes.slice(1).map((requete) => requete.sorte), ['renommages', 'calculer']);
  assert.equal(distant.moteurs.lexiques, 0);
});

test('G1.7 : un renommage que l\'inventaire du sandbox ne confirme pas fait calculer le sandbox lui-même', async () => {
  const faux: Surcharge = (travail) => (travail.sorte === 'renommages'
    ? { type: 'calcule', resultat: { sorte: 'renommages', renommages: [{ id: 'v1', ancienNom: 'Un autre nom', nouveauNom: 'x' }] }, mesure: MESURE, envoyeA: 1, recuA: 2 } : undefined);
  const { seul, distant } = await deuxSessions(FIXTURES[1], faux, true);
  const selection = { groupes: bilanDe(seul.messages).groupes.map((groupe) => groupe.cle), exclus: [], inclus: [] };
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'appliquer', demande: 2, generation: GENERATION_DE_LA_FIXTURE, selection });
  assert.equal(texte([...distant.noms]), texte([...seul.noms]), 'les noms écrits sont ceux que le sandbox a calculés');
  assert.equal(distant.moteurs.lexiques, 1, 'le sandbox refait le calcul de la génération');
});

// Le repli

test('G1.7 : quand le Worker ne rend pas une lecture, le sandbox refait le calcul une fois, répond comme seul, et garde la voie jusqu\'à la prochaine analyse', async () => {
  const { seul, distant, travailleur, generation } = await deuxSessions(FIXTURES[2], sauf('lire', repli('echec')));
  oublierLesPassagesDuModeTokens();
  const groupe = bilanDe(seul.messages).groupes[0].cle;
  const lectures: readonly DemandeDeNomenclature[] = [
    { type: 'lignes', demande: 2, generation, groupe, debut: 0 },
    { type: 'fiche', demande: 3, generation, terme: 'quux' },
    { type: 'simuler', demande: 4, generation, geste: { type: 'ecart-ucm', terme: 'disabled', actif: false } },
  ];
  for (const lecture of lectures) for (const { session } of [seul, distant]) await session.recevoir(lecture);
  assert.equal(texte(reponses(distant.messages)), texte(reponses(seul.messages)));
  assert.equal(distant.moteurs.lexiques, 1, 'un seul calcul complet pour toutes les demandes');
  assert.deepEqual(travailleur.requetes.slice(1).map((requete) => requete.sorte), ['lire'], 'le Worker n\'est plus interrogé après son échec');
  const relecture = passagesDuModeTokens().filter((passage) => passage.phase === 'calcul-des-noms' && passage.voie === 'sandbox');
  assert.deepEqual(relecture.map((passage) => passage.repli), ['echec'], 'le journal dit pourquoi le sandbox a calculé');
  // Un geste suit la voie du sandbox, puis une nouvelle analyse revient au Worker.
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'regle', demande: 5, geste: { type: 'supprimer', terme: 'quux' } });
  assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)));
  assert.ok(!travailleur.requetes.slice(1).some((requete) => requete.sorte === 'recalculer'));
  await distant.session.recevoir({ type: 'noms-analyser', demande: 6 });
  assert.equal(travailleur.requetes.at(-1)!.sorte, 'calculer');
  oublierLesPassagesDuModeTokens();
});

test('G1.7 : une génération que le Worker ne garde plus est calculée par le sandbox', async () => {
  const { seul, distant, generation } = await deuxSessions(FIXTURES[2], sauf('lire', { type: 'calcule', resultat: { sorte: 'perimee' }, mesure: MESURE, envoyeA: 1, recuA: 2 }));
  const groupe = bilanDe(seul.messages).groupes[0].cle;
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'lignes', demande: 2, generation, groupe, debut: 0 });
  assert.equal(texte(distant.messages.at(-1)), texte(seul.messages.at(-1)));
  assert.equal(distant.moteurs.lexiques, 1);
});

test('G1.7 : quand le Worker ne rend pas le recalcul d\'un geste, le sandbox recalcule depuis son propre état', async () => {
  const { seul, distant, travailleur } = await deuxSessions(FIXTURES[2], sauf('recalculer', repli('delai')));
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'regle', demande: 2, geste: { type: 'remplacer-par', terme: 'fg', par: 'foreground' } });
  assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)));
  assert.equal(texte([...distant.stock]), texte([...seul.stock]));
  assert.equal(distant.moteurs.lexiques, 1, 'le sandbox refait le calcul de la génération avant de recalculer');
  assert.deepEqual(travailleur.requetes.slice(1).map((requete) => requete.sorte), ['preparer', 'recalculer']);
});

test('G1.7 : quand le Worker ne prépare pas les écritures, le sandbox les prépare avec son état', async () => {
  const { seul, distant } = await deuxSessions(FIXTURES[1], sauf('preparer', repli('echec')));
  const question = bilanDe(seul.messages).questions.find((candidate) => candidate.type === 'paire')!;
  for (const { session } of [seul, distant]) await session.recevoir({ type: 'noms-repondre', demande: 2, question: question.cle, reponse: { type: 'garder', rang: 1 } });
  assert.equal(texte(dernierBilan(distant.messages)), texte(dernierBilan(seul.messages)));
  assert.equal(texte([...distant.stock]), texte([...seul.stock]));
});

// Les réponses périmées

test('G1.7 : la réponse du Worker à une lecture arrive après une nouvelle analyse : l\'écran reçoit generation-perimee, jamais la page', async () => {
  const fixture = FIXTURES[2];
  const seul = banc(fixture);
  await seul.session.recevoir({ type: 'noms-analyser', demande: 1 });
  const groupe = bilanDe(seul.messages).groupes[0].cle;
  let liberer: () => void = () => {};
  const retenue = new Promise<void>((resoudre) => { liberer = resoudre; });
  const base = portDuTravailleur();
  const attendue: IssueDuCalculDistant[] = [];
  const port: PortDeCalculDistant = {
    calculer(requete) {
      const requeteDeBase = base.calculer(requete);
      if (requete.travail.sorte !== 'lire') return requeteDeBase;
      return { issue: requeteDeBase.issue.then(async (issue) => { attendue.push(issue); await retenue; return issue; }), annuler: requeteDeBase.annuler };
    },
  };
  const distant = banc(fixture, port);
  await distant.session.recevoir({ type: 'noms-analyser', demande: 1 });
  const lecture = distant.session.recevoir({ type: 'lignes', demande: 2, generation: 1, groupe, debut: 0 });
  for (let tour = 0; tour < 50 && attendue.length === 0; tour += 1) await new Promise((resoudre) => setImmediate(resoudre));
  assert.equal(attendue.length, 1, 'le Worker a reçu la lecture');
  await distant.session.recevoir({ type: 'noms-analyser', demande: 3 });
  assert.equal(dernierBilan(distant.messages).generation, 2);
  liberer();
  await lecture;
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 2, code: 'generation-perimee' });
  assert.ok(!distant.messages.some((message) => message.type === 'lignes'));
});

test('G1.7 : une lecture ou un geste d\'une génération périmée reçoit l\'erreur d\'une session seule, sans interroger le Worker', async () => {
  const { distant, travailleur, generation } = await deuxSessions(FIXTURES[1], undefined, true);
  const requetes = travailleur.requetes.length;
  await distant.session.recevoir({ type: 'lignes', demande: 2, generation: generation + 1, groupe: 'x', debut: 0 });
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 2, code: 'generation-perimee' });
  await distant.session.recevoir({ type: 'simuler', demande: 3, generation: generation + 1, geste: { type: 'supprimer', terme: 'quux' } });
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 3, code: 'generation-perimee' });
  await distant.session.recevoir({ type: 'appliquer', demande: 4, generation: generation + 1, selection: { groupes: [], exclus: [], inclus: [] } });
  assert.deepEqual(distant.messages.at(-1), { type: 'erreur', demande: 4, code: 'generation-perimee' });
  assert.equal(travailleur.requetes.length, requetes);
  assert.equal(distant.moteurs.lexiques, 0);
});

test('G1.7 : le journal note la voie du Worker pour une lecture et pour un recalcul', async () => {
  const { seul, distant, generation } = await deuxSessions(FIXTURES[2]);
  oublierLesPassagesDuModeTokens();
  const groupe = bilanDe(seul.messages).groupes[0].cle;
  await distant.session.recevoir({ type: 'lignes', demande: 12, generation, groupe, debut: 0 });
  await distant.session.recevoir({ type: 'regle', demande: 13, geste: { type: 'supprimer', terme: 'quux' } });
  const passages = passagesDuModeTokens();
  assert.deepEqual(passages.filter((passage) => passage.demande === 12).map((passage) => [passage.phase, passage.voie]), [['worker-calcul', 'worker']]);
  const duGeste = passages.filter((passage) => passage.demande === 13);
  assert.deepEqual(duGeste.filter((passage) => passage.phase === 'calcul-des-noms').map((passage) => passage.voie), ['worker']);
  assert.ok(duGeste.some((passage) => passage.phase === 'worker-retour'));
  assert.deepEqual(duGeste.filter((passage) => ['lexique', 'renommages', 'questions', 'bilan'].includes(passage.phase)), [], 'le sandbox ne calcule rien');
  oublierLesPassagesDuModeTokens();
});

// L'atelier

test('le Worker ne tire ni figma, ni le journal du mode Tokens, ni le sandbox, ni l\'écran hors de son propre fichier', () => {
  const { metafile, outputFiles } = buildSync({
    entryPoints: [join(__dirname, '../src/ui/nomenclature/calculDesNomsWorker.ts')],
    bundle: true, write: false, metafile: true, platform: 'browser', target: 'chrome80', logLevel: 'silent',
  });
  const sources = Object.keys(metafile.inputs).map((entree) => entree.split(sep).join('/'));
  for (const attendu of ['src/nomenclature/atelier.ts', 'src/nomenclature/gestes.ts', 'src/nomenclature/projection.ts']) assert.ok(sources.some((entree) => entree.endsWith(attendu)), attendu);
  const interdits = sources.filter((entree) => /(^|\/)src\/(ui\/(?!nomenclature\/calculDesNomsWorker\.ts$)|code\.ts$|lecture\.ts$|sandbox\/(?!acquisition\.ts))/.test(entree));
  assert.deepEqual(interdits, []);
  const code = outputFiles[0].text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(/\bfigma\./.test(code), false, 'aucun appel à l\'objet figma');
});

test('l\'atelier garde les deux dernières générations, refuse une génération disparue et adopte de nouvelles règles sans recalculer', async () => {
  const atelier = creerAtelier();
  const entree = parLePont(await entreeDeFixture(FIXTURES[2], 1));
  const bilan = atelier.executer({ sorte: 'calculer', entree }, 1);
  assert.equal(bilan.sorte === 'bilan' && texte(bilan.bilan), texte(calculerLeBilanDirect(entree)));
  const regles = entree.regles;
  for (const generation of [2, 3]) atelier.executer({ sorte: 'recalculer', base: generation - 1, regles }, generation);
  assert.deepEqual(atelier.executer({ sorte: 'lire', lecture: { type: 'diagnostic', demande: 1, generation: 1 } }, 1), { sorte: 'perimee' }, 'la génération 1 est oubliée');
  assert.equal(atelier.executer({ sorte: 'lire', lecture: { type: 'diagnostic', demande: 1, generation: 2 } }, 2).sorte, 'message');
  assert.deepEqual(atelier.executer({ sorte: 'recalculer', base: 1, regles }, 4), { sorte: 'perimee' });
  assert.deepEqual(atelier.executer({ sorte: 'adopter', regles }, 9), { sorte: 'perimee' });
  assert.deepEqual(atelier.executer({ sorte: 'renommages', selection: { groupes: [], exclus: [], inclus: [] } }, 7), { sorte: 'perimee' });
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
const TRAVAIL: TravailDesNoms = { sorte: 'calculer', entree: ENTREE };
const BILAN = { generation: 4, groupes: [], questions: [] } as unknown as Bilan;
const calcule = (demande: number, generation: number, revision: string): ReponseDuCalculDesNoms => ({ type: 'noms-calcules', demande, generation, revision, resultat: { sorte: 'bilan', bilan: BILAN }, mesure: MESURE });

test('le port ignore une réponse dont la demande, la génération ou la révision diffère, et attend la bonne', async () => {
  const { port, envoyes } = portDeLaSession();
  const requete = port.calculer({ demande: 7, generation: 4, travail: TRAVAIL });
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

test('le port attend plusieurs requêtes à la fois, une par demande', async () => {
  const { port } = portDeLaSession();
  const premiere = port.calculer({ demande: 1, generation: 4, travail: TRAVAIL });
  const seconde = port.calculer({ demande: 2, generation: 4, travail: TRAVAIL });
  port.recevoir(calcule(2, 4, 'r1'));
  assert.equal((await seconde.issue).type, 'calcule');
  port.recevoir(calcule(1, 4, 'r1'));
  assert.equal((await premiere.issue).type, 'calcule');
});

test('le port se replie après le délai, sur l\'échec du Worker ou quand l\'envoi lève, et abandonne sur demande', async () => {
  const delai = portDeLaSession();
  const attente = delai.port.calculer({ demande: 1, generation: 1, travail: TRAVAIL });
  delai.rappels[0]();
  assert.deepEqual(await attente.issue, { type: 'repli', cause: 'delai' });
  assert.deepEqual(delai.rappels, [], 'le rappel du délai est annulé quand la requête conclut');

  const echec = portDeLaSession();
  const requete = echec.port.calculer({ demande: 2, generation: 1, travail: TRAVAIL });
  echec.port.recevoir({ type: 'noms-non-calcules', demande: 2, generation: 1, revision: 'r1', cause: 'demarrage' });
  assert.deepEqual(await requete.issue, { type: 'repli', cause: 'demarrage' });

  const leve = creerPortDistant({ envoyer: () => { throw new Error('plus d\'interface'); }, revision: () => 'r' });
  assert.deepEqual(await leve.calculer({ demande: 3, generation: 1, travail: TRAVAIL }).issue, { type: 'repli', cause: 'indisponible' });

  const abandon = portDeLaSession();
  const abandonnee = abandon.port.calculer({ demande: 4, generation: 1, travail: TRAVAIL });
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
  const bilan = (demande: number, generation: number): ReponseDuCalculDesNoms =>
    ({ type: 'noms-calcules', demande, generation, revision: 'r1', resultat: { sorte: 'bilan', bilan: parLePont(calculerLeBilanDirect(entree)) }, mesure: MESURE });
  // L'ancienne réponse arrive après l'abandon : elle ne rend rien.
  port.recevoir(bilan(1, envoyes[0].generation));
  assert.deepEqual(messages.filter((message) => message.type === 'bilan'), []);
  port.recevoir(bilan(2, envoyes[1].generation));
  await seconde;
  assert.deepEqual(messages.filter((message) => message.type === 'bilan').map((message) => message.demande), [2]);
});
