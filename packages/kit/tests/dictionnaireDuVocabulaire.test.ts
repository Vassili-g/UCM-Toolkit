import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { commencerLexique, detecterLesQuestions, indexerVocabulaire,
  ABREVIATIONS, FORMES_D_UN_MEME_MOT, MOTS_DISTINCTS, SYNONYMES_COURANTS,
  type DejaJuge, type NomLu, type Question } from '../src/referentiel/index.js';

const index = indexerVocabulaire({ personnalises: [], ecartsUcm: [] }).index;
const vide: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };

const cle = ([a, b]: readonly [string, string] | readonly string[]): string => [a, b].sort().join('|');

function nom(id: string, chemin: string): NomLu {
  return { id, nom: chemin, portee: 'collection-1', categorie: 'variables' };
}

function questions(noms: readonly NomLu[], dejaJuge: DejaJuge = vide): Question[] {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return [...detecterLesQuestions(etape.value, index, dejaJuge, { seuil: 0, maximum: 500 }).questions];
}

/** Deux mots dans deux noms qui partagent un voisin : la place que les questions de paire exigent. */
const couple = (a: string, b: string): NomLu[] => [nom('a', `card/${a}/fill`), nom('b', `card/${b}/fill`)];
const paires = (noms: readonly NomLu[], dejaJuge?: DejaJuge): Question[] => questions(noms, dejaJuge).filter((q) => q.type === 'paire');

type Classement = { readonly memeMot: [string, string][]; readonly motsDistincts: [string, string][] };
const formes = JSON.parse(readFileSync(new URL('./stress/f1-noms/donnees/formes.json', import.meta.url), 'utf8')) as Classement;

// E2.1

test('le dictionnaire du kit est celui de formes.json, couple pour couple', () => {
  assert.deepEqual(FORMES_D_UN_MEME_MOT.map(cle).sort(), formes.memeMot.map(cle).sort());
  assert.deepEqual(MOTS_DISTINCTS.map(cle).sort(), formes.motsDistincts.map(cle).sort());
  assert.equal(FORMES_D_UN_MEME_MOT.length, 32);
  assert.equal(MOTS_DISTINCTS.length, 98);
});

test('un couple n’est classé qu’une fois, et le classement ne contredit ni les synonymes ni les abréviations', () => {
  const memeMot = new Set(FORMES_D_UN_MEME_MOT.map(cle));
  const distincts = MOTS_DISTINCTS.map(cle);
  assert.equal(memeMot.size, FORMES_D_UN_MEME_MOT.length, 'un couple en double parmi les formes d’un même mot');
  assert.equal(new Set(distincts).size, distincts.length, 'un couple en double parmi les mots distincts');
  assert.deepEqual(distincts.filter((couple) => memeMot.has(couple)), []);
  const synonymes = new Set([
    ...SYNONYMES_COURANTS.flatMap((groupe) => groupe.flatMap((a, i) => groupe.slice(i + 1).map((b) => cle([a, b])))),
    ...Object.entries(ABREVIATIONS).map(cle),
  ]);
  assert.deepEqual(distincts.filter((couple) => synonymes.has(couple)), []);
});

test('un couple de mots distincts du dictionnaire ne donne aucune question, ni de terminaison ni de faute', () => {
  assert.deepEqual(paires(couple('select', 'selected')), [], 'select / selected : un verbe et son participe, deux mots');
  assert.deepEqual(paires(couple('fill', 'filled')), []);
  const noms = [...Array.from({ length: 5 }, (_, i) => nom(`ref-${i}`, `box${i}/border/bg`)), nom('rare', 'box0/bolder/fg')];
  assert.deepEqual(questions(noms), [], 'bolder / border : deux mots, pas une faute de border');
});

test('un couple de formes d’un même mot garde sa question de pluriel', () => {
  assert.deepEqual(paires(couple('step', 'steps')).map((q) => q.cle), ['paire:step|steps']);
  assert.deepEqual(paires(couple('expand', 'expanded')).map((q) => q.cle), ['paire:expand|expanded']);
});

// E2.2

test('deux mots proches absents du dictionnaire donnent une question « même mot ou deux mots »', () => {
  const resultat = paires(couple('ledger', 'ledgar'));
  assert.equal(resultat.length, 1);
  const [question] = resultat;
  assert.ok(question.type === 'paire');
  assert.equal(question.cle, 'paire:ledgar|ledger');
  assert.equal(question.indice, 'ecriture-proche');
  assert.deepEqual(question.termes.map((terme) => terme.mot), ['ledgar', 'ledger']);
  assert.deepEqual(question.termes.map((terme) => terme.ucm), [false, false]);
});

test('le mot le plus employé est le mot proposé', () => {
  const noms = [...couple('ledger', 'ledgar'), nom('c', 'card/ledger/edge'), nom('d', 'card/ledger/text')];
  const [question] = paires(noms);
  assert.ok(question?.type === 'paire');
  assert.equal(question.termes[question.propose].mot, 'ledger');
});

test('l’échange de deux lettres, la lettre ajoutée et la lettre remplacée sont des couples proches', () => {
  assert.deepEqual(paires(couple('ledger', 'legder')).map((q) => q.cle), ['paire:ledger|legder']);
  assert.deepEqual(paires(couple('ledger', 'ledgerx')).map((q) => q.cle), ['paire:ledger|ledgerx']);
  assert.deepEqual(paires(couple('ledger', 'ledges')).map((q) => q.cle), ['paire:ledger|ledges']);
});

test('un couple classé par le dictionnaire ne donne aucune question', () => {
  assert.deepEqual(paires(couple('swatch', 'switch')), [], 'mots distincts');
  assert.deepEqual(paires(couple('slate', 'state')), [], 'mots distincts');
  assert.deepEqual(paires(couple('orange', 'range')), [], 'mots distincts');
});

test('un couple proche ne sort pas sans place commune, sous cinq lettres, ni quand un mot est connu du kit', () => {
  assert.deepEqual(paires([nom('a', 'card/ledger/fill'), nom('b', 'tab/ledgar/text')]), [], 'aucun voisin commun');
  assert.deepEqual(paires(couple('quix', 'quax')), [], 'moins de cinq lettres');
  assert.deepEqual(paires(couple('border', 'bordre')), [], 'bordre est une faute de border, la question de faute le traite');
  assert.deepEqual(paires(couple('hover', 'hovers')).map((q) => (q.type === 'paire' ? q.indice : q.type)), ['pluriel'], 'une seule question, du pluriel');
});

test('une paire que le fichier a jugée distincte, ou mise de côté, ou voulue, ne revient pas', () => {
  const noms = couple('ledger', 'ledgar');
  assert.equal(paires(noms).length, 1);
  assert.deepEqual(paires(noms, { ...vide, distincts: [['ledgar', 'ledger']] }), []);
  assert.deepEqual(paires(noms, { ...vide, distincts: [['Ledger', 'LEDGAR']] }), [], 'la casse ne change pas la paire jugée');
  assert.deepEqual(paires(noms, { ...vide, plusTard: ['paire:ledgar|ledger'] }), []);
  assert.deepEqual(paires(noms, { ...vide, voulus: ['ledgar'] }), []);
});
