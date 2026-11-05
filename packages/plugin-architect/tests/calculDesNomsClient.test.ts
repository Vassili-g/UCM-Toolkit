/**
 * Le client du Worker de calcul des noms, vu de l'écran : il passe l'entrée au Worker, rend au sandbox le bilan ou la cause du repli,
 * ignore la réponse d'une requête remplacée et jette un Worker qui ne démarre pas ou qui plante. Le Worker est ici un faux ; son
 * démarrage dans Chromium se joue dans `tests/interface/calculDesNoms.test.mjs`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { estCalculDesNoms, estReponseDuCalculDesNoms, type MessageDeCalculDesNoms, type ReponseDuCalculDesNoms } from '../src/messages/calculDesNoms';
import type { Bilan } from '../src/messages/nomenclature';
import { calculerLeBilanDirect } from '../src/nomenclature/calcul';
import { creerCalculateurDeNoms, type TravailleurDeNoms } from '../src/ui/nomenclature/calculDesNoms';
import { servirLesCalculs, type ReponseDuTravailleur, type RequeteDuTravailleur } from '../src/ui/nomenclature/calculDesNomsWorker';
import { FIXTURES, entreeDeFixture } from './outils/fixturesDeNomenclature';

/** Un Worker de test : la page y lit les requêtes et y joue les réponses. */
function fauxTravailleur() {
  const travailleur = {
    requetes: [] as RequeteDuTravailleur[],
    ferme: false,
    postMessage(message: RequeteDuTravailleur) { travailleur.requetes.push(message); },
    terminate() { travailleur.ferme = true; },
    onmessage: null as TravailleurDeNoms['onmessage'],
    onerror: null as TravailleurDeNoms['onerror'],
    onmessageerror: null as TravailleurDeNoms['onmessageerror'],
    repondre(reponse: ReponseDuTravailleur) { travailleur.onmessage?.({ data: reponse }); },
  };
  return travailleur;
}

const ENTREE = { generation: 3, inventaire: { entrees: [] }, regles: {} } as unknown as Extract<MessageDeCalculDesNoms['travail'], { sorte: 'calculer' }>['entree'];
const CALCULER: MessageDeCalculDesNoms['travail'] = { sorte: 'calculer', entree: ENTREE };
const LIRE: MessageDeCalculDesNoms['travail'] = { sorte: 'lire', lecture: { type: 'fiche', demande: 1, generation: 3, terme: 'quux' } };
const requete = (demande: number, generation = 3, revision = 'r1', travail: MessageDeCalculDesNoms['travail'] = CALCULER): MessageDeCalculDesNoms =>
  ({ type: 'calcul-des-noms', demande, generation, revision, envoyeA: 100, travail });
const BILAN = { generation: 3, groupes: [], questions: [] } as unknown as Bilan;
const bilan = (demande: number, generation = 3, revision = 'r1', recuA = 5, finA = 9): ReponseDuTravailleur =>
  ({ type: 'resultat', demande, generation, revision, resultat: { sorte: 'bilan', bilan: BILAN }, recuA, calculDebutA: recuA, calculFinA: finA });

function client(options: { travailleur?: ReturnType<typeof fauxTravailleur> | null; fabriquer?: () => TravailleurDeNoms | null; delai?: number } = {}) {
  const reponses: ReponseDuCalculDesNoms[] = [];
  const delais: { rappel: () => void; ms: number; annule: boolean }[] = [];
  let heure = 1000;
  const travailleur = options.travailleur === undefined ? fauxTravailleur() : options.travailleur;
  const calculateur = creerCalculateurDeNoms({
    envoyer: (reponse) => { reponses.push(reponse); },
    fabriquer: options.fabriquer ?? (() => travailleur),
    maintenant: () => (heure += 10),
    delaiDeDemarrage: options.delai ?? 5000,
    planifier: (rappel, ms) => { const delai = { rappel, ms, annule: false }; delais.push(delai); return () => { delai.annule = true; }; },
  });
  return { calculateur, reponses, travailleur, delais };
}

test('le client passe l\'entrée au Worker et rend le bilan avec les heures du trajet', () => {
  const { calculateur, reponses, travailleur, delais } = client();
  calculateur.recevoir(requete(7));
  assert.deepEqual(travailleur!.requetes, [{ type: 'travailler', demande: 7, generation: 3, revision: 'r1', travail: CALCULER }]);
  assert.equal(delais.length, 1);
  assert.equal(delais[0].ms, 5000, 'le démarrage a un délai');
  travailleur!.repondre({ type: 'demarre' });
  assert.equal(delais[0].annule, true, 'un Worker démarré annule le délai');
  travailleur!.repondre(bilan(7));
  assert.deepEqual(reponses, [{ type: 'noms-calcules', demande: 7, generation: 3, revision: 'r1', resultat: { sorte: 'bilan', bilan: BILAN }, mesure: { recuA: 1010, demarrage: true, travailleurRecuA: 5, calculDebutA: 5, calculFinA: 9 } }]);
  // Le Worker vit encore : la requête suivante ne le recrée pas et ne compte pas de démarrage.
  calculateur.recevoir(requete(8, 4));
  travailleur!.repondre(bilan(8, 4));
  assert.equal(reponses.length, 2);
  assert.equal((reponses[1] as Extract<ReponseDuCalculDesNoms, { type: 'noms-calcules' }>).mesure.demarrage, false);
  assert.equal(delais.length, 1);
});

test('le client ignore la réponse d\'une requête remplacée et toute réponse dont la demande, la génération ou la révision diffère', () => {
  const { calculateur, reponses, travailleur } = client();
  calculateur.recevoir(requete(1, 1));
  calculateur.recevoir(requete(2, 2));
  travailleur!.repondre(bilan(1, 1));
  travailleur!.repondre(bilan(2, 1));
  travailleur!.repondre(bilan(2, 2, 'r0'));
  travailleur!.repondre(bilan(3, 2));
  assert.equal(reponses.length, 0);
  travailleur!.repondre(bilan(2, 2));
  assert.deepEqual(reponses.map((reponse) => [reponse.type, reponse.demande, reponse.generation]), [['noms-calcules', 2, 2]]);
  travailleur!.repondre(bilan(2, 2));
  assert.equal(reponses.length, 1, 'une requête n\'a qu\'une réponse');
});

test('un calcul en échec rend `echec` sans jeter le Worker', () => {
  const { calculateur, reponses, travailleur } = client();
  calculateur.recevoir(requete(1));
  travailleur!.repondre({ type: 'demarre' });
  travailleur!.repondre({ type: 'echec', demande: 1, generation: 3, revision: 'r1' });
  assert.deepEqual(reponses, [{ type: 'noms-non-calcules', demande: 1, generation: 3, revision: 'r1', cause: 'echec' }]);
  assert.equal(calculateur.disponible(), true);
  assert.equal(travailleur!.ferme, false);
});

test('un Worker impossible à créer rend `indisponible` à chaque requête, sans nouvelle tentative', () => {
  let tentatives = 0;
  for (const fabriquer of [() => { tentatives += 1; throw new Error('politique de contenu'); }, () => { tentatives += 1; return null; }]) {
    tentatives = 0;
    const { calculateur, reponses } = client({ fabriquer });
    calculateur.recevoir(requete(1));
    calculateur.recevoir(requete(2));
    assert.deepEqual(reponses.map((reponse) => [(reponse as { cause?: string }).cause, reponse.demande]), [['indisponible', 1], ['indisponible', 2]]);
    assert.equal(tentatives, 1);
    assert.equal(calculateur.disponible(), false);
  }
});

test('un Worker muet au démarrage est jeté après le délai : `demarrage`, puis `indisponible`', () => {
  const { calculateur, reponses, travailleur, delais } = client();
  calculateur.recevoir(requete(1));
  delais[0].rappel();
  assert.deepEqual(reponses, [{ type: 'noms-non-calcules', demande: 1, generation: 3, revision: 'r1', cause: 'demarrage' }]);
  assert.equal(travailleur!.ferme, true);
  calculateur.recevoir(requete(2));
  assert.equal((reponses[1] as { cause: string }).cause, 'indisponible');
  assert.equal(travailleur!.requetes.length, 1, 'le Worker jeté ne reçoit plus rien');
});

test('un script qui ne charge pas, une erreur ou un message illisible jettent le Worker', () => {
  const avantLeDemarrage = client();
  avantLeDemarrage.calculateur.recevoir(requete(1));
  avantLeDemarrage.travailleur!.onerror?.({});
  assert.equal((avantLeDemarrage.reponses[0] as { cause: string }).cause, 'demarrage');

  const apres = client();
  apres.calculateur.recevoir(requete(1));
  apres.travailleur!.repondre({ type: 'demarre' });
  apres.travailleur!.onerror?.({});
  assert.equal((apres.reponses[0] as { cause: string }).cause, 'echec');
  assert.equal(apres.calculateur.disponible(), false);

  const illisible = client();
  illisible.calculateur.recevoir(requete(1));
  illisible.travailleur!.repondre({ type: 'demarre' });
  illisible.travailleur!.onmessageerror?.({});
  assert.equal((illisible.reponses[0] as { cause: string }).cause, 'echec');
});

test('un Worker qui refuse le message jette le Worker et répond `echec`', () => {
  const travailleur = fauxTravailleur();
  travailleur.postMessage = () => { throw new Error('clone impossible'); };
  const { calculateur, reponses } = client({ travailleur });
  calculateur.recevoir(requete(1));
  assert.equal((reponses[0] as { cause: string }).cause, 'echec');
  assert.equal(calculateur.disponible(), false);
});

test('sans source embarquée, le client replie tout de suite : Node, galerie sans build', () => {
  const reponses: ReponseDuCalculDesNoms[] = [];
  const calculateur = creerCalculateurDeNoms({ envoyer: (reponse) => { reponses.push(reponse); } });
  calculateur.recevoir(requete(1));
  assert.deepEqual(reponses.map((reponse) => (reponse as { cause?: string }).cause), ['indisponible']);
});

test('plusieurs requêtes attendent ensemble ; un nouveau calcul de bilan ne remplace que les calculs de bilan en attente', () => {
  const { calculateur, reponses, travailleur } = client();
  calculateur.recevoir(requete(1, 3));
  calculateur.recevoir(requete(2, 3, 'r1', LIRE));
  calculateur.recevoir(requete(3, 3, 'r1', LIRE));
  calculateur.recevoir(requete(4, 4));
  travailleur!.repondre(bilan(1, 3));
  assert.equal(reponses.length, 0, 'le calcul de bilan remplacé par la demande 4 n\'est plus attendu');
  travailleur!.repondre(bilan(3, 3));
  travailleur!.repondre(bilan(2, 3));
  travailleur!.repondre(bilan(4, 4));
  assert.deepEqual(reponses.map((reponse) => reponse.demande), [3, 2, 4], 'chaque lecture reçoit sa réponse, dans l\'ordre où le Worker les rend');
});

test('un Worker jeté répond `echec` à toutes les requêtes qu\'il laisse en attente', () => {
  const { calculateur, reponses, travailleur } = client();
  calculateur.recevoir(requete(1));
  calculateur.recevoir(requete(2, 3, 'r1', LIRE));
  travailleur!.repondre({ type: 'demarre' });
  travailleur!.onerror?.({});
  assert.deepEqual(reponses.map((reponse) => [reponse.type, reponse.demande, (reponse as { cause?: string }).cause]), [['noms-non-calcules', 1, 'echec'], ['noms-non-calcules', 2, 'echec']]);
});

test('le Worker rend le bilan du calcul pur, avec les heures de son calcul, et `echec` sur une entrée qu\'il ne sait pas lire', async () => {
  const entree = await entreeDeFixture(FIXTURES[2], 4);
  const envoyes: ReponseDuTravailleur[] = [];
  const portee = { postMessage: (message: ReponseDuTravailleur) => { envoyes.push(message); }, onmessage: null as null | ((evenement: { data: RequeteDuTravailleur }) => void) };
  servirLesCalculs(portee);
  assert.deepEqual(envoyes, [{ type: 'demarre' }]);
  portee.onmessage!({ data: { type: 'travailler', demande: 9, generation: 4, revision: 'r', travail: { sorte: 'calculer', entree: JSON.parse(JSON.stringify(entree)) } } });
  assert.deepEqual(envoyes.slice(1, -1).map((message) => message.type === 'etape' ? message.etape : message.type), ['lexique', 'questions'], 'les étapes partent avant le résultat');
  const reponse = envoyes.at(-1)!;
  assert.ok(reponse.type === 'resultat');
  assert.equal(JSON.stringify(reponse.resultat), JSON.stringify({ sorte: 'bilan', bilan: calculerLeBilanDirect(entree) }));
  assert.deepEqual([reponse.demande, reponse.generation, reponse.revision], [9, 4, 'r']);
  assert.ok(reponse.calculFinA >= reponse.calculDebutA);
  portee.onmessage!({ data: { type: 'travailler', demande: 10, generation: 4, revision: 'r', travail: { sorte: 'calculer', entree: {} as never } } });
  assert.deepEqual(envoyes.at(-1), { type: 'echec', demande: 10, generation: 4, revision: 'r' });
});

test('le sandbox et l\'écran reconnaissent la forme des messages du calcul', () => {
  assert.equal(estCalculDesNoms(requete(1)), true);
  for (const faux of [null, {}, { ...requete(1), demande: 0 }, { ...requete(1), revision: 3 }, { ...requete(1), travail: null }, { ...requete(1), travail: { sorte: 'inconnue' } }, { ...requete(1), type: 'bilan' }]) assert.equal(estCalculDesNoms(faux), false);
  const mesure = { recuA: 1, demarrage: false, travailleurRecuA: 2, calculDebutA: 3, calculFinA: 4 };
  const reponse = (resultat: unknown) => ({ type: 'noms-calcules', demande: 1, generation: 3, revision: 'r', resultat, mesure });
  for (const bon of [{ sorte: 'bilan', bilan: BILAN }, { sorte: 'message', message: { type: 'fiche' } }, { sorte: 'ecritures', ecritures: [], regles: {} }, { sorte: 'refus', conflits: [] },
    { sorte: 'erreur', code: 'echec' }, { sorte: 'renommages', renommages: [] }, { sorte: 'perimee' }]) assert.equal(estReponseDuCalculDesNoms(reponse(bon)), true, JSON.stringify(bon));
  for (const mauvais of [null, {}, { sorte: 'bilan', bilan: { ...BILAN, generation: 9 } }, { sorte: 'message', message: null }, { sorte: 'ecritures', ecritures: {} }, { sorte: 'inconnue' }]) {
    assert.equal(estReponseDuCalculDesNoms(reponse(mauvais)), false, JSON.stringify(mauvais));
  }
});

test('G3 : le client rend à l’écran les étapes du Worker pour la requête en attente, et ignore celles d’une autre génération', () => {
  const travailleur = fauxTravailleur();
  const vues: [number, string][] = [];
  const calculateur = creerCalculateurDeNoms({ envoyer: () => {}, fabriquer: () => travailleur, surEtape: (demande, etape) => { vues.push([demande, etape]); } });
  calculateur.recevoir(requete(7));
  travailleur.repondre({ type: 'demarre' });
  travailleur.repondre({ type: 'etape', demande: 7, generation: 3, revision: 'r1', etape: 'lexique' });
  travailleur.repondre({ type: 'etape', demande: 7, generation: 2, revision: 'r1', etape: 'questions' });
  travailleur.repondre({ type: 'etape', demande: 8, generation: 3, revision: 'r1', etape: 'questions' });
  travailleur.repondre({ type: 'etape', demande: 7, generation: 3, revision: 'r1', etape: 'questions' });
  assert.deepEqual(vues, [[7, 'lexique'], [7, 'questions']]);
});
