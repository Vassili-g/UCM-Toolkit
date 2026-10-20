/** Les règles du fichier : lecture tolérante, clés, réponses, journal, reprise de la v1 et échange d'export. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConflitDeVocabulaire } from '@ucm-kit/core/referentiel';
import { creerPortDeRegles } from '../src/ecriture';
import {
  budgetDUneEntree, cleDistinct, cleJournal, cleReponse, cleTerme, defaireLImport, defaireReponse, preparerImport, dejaJugeDuFichier, ecrituresDesRegles, effacerLeJournal, exporterLesRegles,
  importerLesRegles, lireLeStockage, lireLesRegles, octetsUtf8, preparerJournal, preparerReponse, rangerLesEcritures, reglesVides,
  serialiserRegle, vocabulaireDuFichier, type Ecriture, type Journal, type ReglesDuFichier, type RenommageJournal,
} from '../src/regles';

const convention = { casse: 'minuscules', separateur: 'tiret' } as const;
const autre = { casse: 'PascalCase', separateur: 'inchange' } as const;
const ecriture = { groupes: convention, variables: autre };
const dans = (ecritures: readonly Ecriture[]): Map<string, string> => new Map(ecritures.filter((e) => e.texte !== null).map((e) => [e.cle, e.texte as string]));
/** Un stockage en mémoire sur une table. */
const stockageDe = (table: Map<string, string>) => ({
  cles: () => [...table.keys()],
  lire: (cle: string) => table.get(cle) ?? '',
  ecrire: (cle: string, texte: string) => { table.set(cle, texte); },
  effacer: (cle: string) => { table.delete(cle); },
});

const completes: ReglesDuFichier = {
  ...reglesVides,
  ecriture,
  termes: [{ terme: ['extra', 'small'], remplace: [['xs'], ['x', 'small']], definition: 'La plus petite taille' }, { terme: ['gap'], remplace: [] }],
  ecartsUcm: ['ucm-etat-hover'],
  distincts: [['large', 'larger']],
  voulus: ['extra small'],
  ordinaires: ['stress-test'],
  plusTard: ['paire:a|b'],
  collectionsGardees: ['VariableCollectionId:1:2'],
  collectionsExclues: ['VariableCollectionId:3:4'],
  vus: ['g1', 'g2'],
};

test('chaque règle a la clé du plan et une version', () => {
  const clesAttendues = ['ecriture', 'terme:extra small', 'terme:gap', 'ecart:ucm-etat-hover', 'distinct:large|larger', 'voulu:extra small',
    'ordinaire:stress-test', 'plus-tard:paire:a|b', 'collection:VariableCollectionId:1:2', 'exclues', 'vus'];
  const ecritures = ecrituresDesRegles(completes);
  assert.deepEqual(ecritures.map((e) => e.cle), clesAttendues);
  for (const e of ecritures) assert.equal(JSON.parse(e.texte!).version, 1);
  assert.equal(cleDistinct('zeta', 'alpha'), 'distinct:alpha|zeta');
  assert.equal(cleTerme(['a', 'b']), 'terme:a b');
  assert.equal(serialiserRegle({ type: 'distinct', termes: ['b', 'a'] }).cle, 'distinct:a|b');
});

test('relire les entrées rend les règles, le vocabulaire et le déjà jugé du kit', () => {
  const lues = lireLesRegles(dans(ecrituresDesRegles(completes)));
  assert.deepEqual(lues.ecriture, ecriture);
  assert.equal(lues.ecritureDeLaV1, false);
  assert.deepEqual(vocabulaireDuFichier(lues), { personnalises: completes.termes, ecartsUcm: ['ucm-etat-hover'] });
  assert.deepEqual(dejaJugeDuFichier(lues), { distincts: [['large', 'larger']], plusTard: ['paire:a|b'], voulus: ['extra small'], collectionsGardees: ['VariableCollectionId:1:2'] });
  assert.deepEqual(lues.collectionsExclues, ['VariableCollectionId:3:4']);
  assert.deepEqual(lues.ordinaires, ['stress-test']);
  assert.deepEqual(lues.vus, ['g1', 'g2']);
});

test('une clé plus-tard:echelle:… déjà rangée n’est ni lue ni importée, donc ne compte pas dans plusTard', () => {
  const lues = lireLesRegles(new Map([
    ['plus-tard:echelle:sm|small', JSON.stringify({ version: 1 })],
    ['plus-tard:paire:a|b', JSON.stringify({ version: 1 })],
  ]));
  assert.deepEqual(lues.plusTard, ['paire:a|b']);
  assert.equal(lues.plusTard.length, 1);
  const texte = JSON.stringify({ version: 1, plusTard: ['echelle:sm|small', 'paire:c|d'] });
  const resultat = importerLesRegles(texte, reglesVides, () => []);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut === 'valide') assert.deepEqual(resultat.regles.plusTard, ['paire:c|d']);
});

test('une entrée illisible, d’une autre version ou incohérente se lit comme absente', () => {
  const lues = lireLesRegles([
    ['ecriture', '{pas du json'],
    ['terme:a', JSON.stringify({ version: 2, terme: ['a'], remplace: [] })],
    ['terme:b', JSON.stringify({ version: 1, terme: ['autre'], remplace: [] })],
    ['terme:c', JSON.stringify({ version: 1, terme: ['c'], remplace: 'x' })],
    ['terme:d', JSON.stringify({ version: 1, terme: ['d'], remplace: [['e']] })],
    ['ecart:x', '[]'], ['ecart:y', ''], ['ecart:z', JSON.stringify({ version: 2 })],
    ['distinct:seul', JSON.stringify({ version: 1 })], ['distinct:a|a', JSON.stringify({ version: 1 })],
    ['exclues', JSON.stringify({ version: 1, ids: [1] })],
    ['reponse:q', JSON.stringify({ version: 1, avant: { k: 3 } })],
    ['inconnue', JSON.stringify({ version: 1 })],
  ]);
  assert.deepEqual(lues.termes, [{ terme: ['d'], remplace: [['e']] }]);
  assert.equal(lues.ecriture, undefined);
  assert.deepEqual([lues.ecartsUcm, lues.distincts, lues.collectionsExclues, lues.reponses], [[], [], [], {}]);
});

test('une lecture n’écrit rien, même sur des entrées illisibles', () => {
  const traces: string[] = [];
  const stockage = { cles: () => ['ecriture', 'journal:0'], lire: () => '{casse', ecrire: () => { traces.push('ecrire'); }, effacer: () => { traces.push('effacer'); } };
  assert.equal(lireLesRegles(lireLeStockage(stockage)).ecriture, undefined);
  assert.deepEqual(traces, []);
});

test('la reprise de la v1 donne l’écriture quand ecriture manque', () => {
  const v1 = JSON.stringify({ version: 1, termesUcm: true, conventions: { groupes: convention, variables: autre, valeurs: convention } });
  const reprise = lireLesRegles([['conventions', v1]]);
  assert.deepEqual(reprise.ecriture, ecriture);
  assert.equal(reprise.ecritureDeLaV1, true);
  const rangee = lireLesRegles([['conventions', v1], ['ecriture', serialiserRegle({ type: 'ecriture', ecriture: { groupes: autre, variables: autre } }).texte!]]);
  assert.deepEqual(rangee.ecriture, { groupes: autre, variables: autre });
  assert.equal(rangee.ecritureDeLaV1, false);
});

test('la reprise de la v1 ignore l’absence, la donnée corrompue et une catégorie manquante', () => {
  assert.equal(lireLesRegles([]).ecriture, undefined);
  assert.equal(lireLesRegles([['conventions', '{"version":1,"termesUcm":tr']]).ecriture, undefined);
  assert.equal(lireLesRegles([['conventions', JSON.stringify({ version: 1, termesUcm: true, conventions: { groupes: { casse: 'inconnue', separateur: 'tiret' }, variables: convention } })]]).ecriture, undefined);
  assert.equal(lireLesRegles([['conventions', JSON.stringify({ version: 2, termesUcm: true, conventions: { groupes: convention, variables: convention } })]]).ecriture, undefined);
  assert.equal(lireLesRegles([['conventions', JSON.stringify({ version: 1, termesUcm: true, conventions: { variables: convention } })]]).ecriture, undefined);
});

test('une réponse garde les valeurs d’avant et son annulation les rétablit exactement', () => {
  const voulu = serialiserRegle({ type: 'voulu', mots: ['x'] });
  const depart = dans([voulu, serialiserRegle({ type: 'terme', terme: { terme: ['a'], remplace: [['b']] } })]);
  const changements: Ecriture[] = [
    serialiserRegle({ type: 'terme', terme: { terme: ['a'], remplace: [['b'], ['c']] } }),
    serialiserRegle({ type: 'distinct', termes: ['p', 'q'] }),
    voulu,
  ];
  const ecritures = preparerReponse('paire:p|q', changements, depart);
  assert.deepEqual(ecritures.map((e) => e.cle), ['terme:a', 'distinct:p|q', 'reponse:paire:p|q']);
  const table = new Map(depart);
  rangerLesEcritures(stockageDe(table), ecritures);
  assert.equal(lireLesRegles(table).reponses['paire:p|q']!.avant['distinct:p|q'], null);
  assert.deepEqual(lireLesRegles(table).distincts, [['p', 'q']]);
  rangerLesEcritures(stockageDe(table), defaireReponse('paire:p|q', table)!);
  assert.deepEqual([...table].sort(), [...depart].sort());
  assert.equal(defaireReponse('paire:p|q', table), undefined);
});

test('répondre deux fois à la même question garde le premier avant', () => {
  const premiere = preparerReponse('q', [serialiserRegle({ type: 'voulu', mots: ['a'] })], dans([]));
  const seconde = preparerReponse('q', [serialiserRegle({ type: 'voulu', mots: ['a'] }), serialiserRegle({ type: 'plus-tard', cle: 'q' })], dans(premiere));
  assert.deepEqual(JSON.parse(seconde.at(-1)!.texte!).avant, { 'voulu:a': null, 'plus-tard:q': null });
  assert.equal(seconde.length, 2, 'le changement identique n’est pas réécrit');
});

/** Les écritures d'un lot, la référence en dernier. */
const ecritureDuLot = (journal: Journal, lot: string, max?: number): Ecriture[] => {
  const prepare = preparerJournal(journal, lot, max)!;
  return [...prepare.entrees, prepare.reference];
};
const uneVariable = (i: number, ancienNom: string, nouveauNom: string): RenommageJournal => ({ type: 'variable', id: `v${i}`, ancienNom, nouveauNom });

test('octetsUtf8 compte 1, 2, 3 octets, et 4 pour une paire de substituts', () => {
  assert.equal(octetsUtf8('abc'), 3);
  assert.equal(octetsUtf8('é'), 2);
  assert.equal(octetsUtf8('漢'), 3);
  assert.equal(octetsUtf8('😀'), 4);
  assert.equal(octetsUtf8('\ud83d'), 3, 'un substitut isolé');
  for (const texte of ['Brand/été', '色彩/前景', 'a😀b😀', '\u0000\u007f\u0080߿ࠀ￿']) {
    assert.equal(octetsUtf8(texte), Buffer.byteLength(texte, 'utf8'), texte);
  }
});

test('le budget d’une entrée retire l’espace, la clé la plus longue et 1 000 octets de marge', () => {
  assert.equal(budgetDUneEntree('l1'), 100_000 - octetsUtf8('ucm_architect') - octetsUtf8('journal:l1:999999999') - 1_000);
});

test('8 000 renommages se découpent sous le budget en octets, puis se relisent à l’identique', () => {
  const renommages: RenommageJournal[] = Array.from({ length: 8000 }, (_, i) => ({
    type: i % 10 === 0 ? 'collection' : 'variable', id: `VariableID:${i}:${i * 7}`, ancienNom: `Brand Color/Texte ${i}/été`, nouveauNom: `brand-color/texte-${i}/ete`,
  }));
  const journal: Journal = { heure: '2026-10-17T10:00:00.000Z', renommages };
  const ecritures = ecritureDuLot(journal, 'l1');
  assert.ok(ecritures.length > 2);
  for (const e of ecritures) assert.ok(octetsUtf8('ucm_architect') + octetsUtf8(e.cle) + Buffer.byteLength(e.texte!, 'utf8') <= 100_000 - 1_000, `${e.cle} : ${Buffer.byteLength(e.texte!, 'utf8')}`);
  assert.deepEqual(ecritures.map((e) => e.cle), [...ecritures.slice(0, -1).map((_, i) => cleJournal('l1', i)), 'journal']);
  assert.deepEqual(lireLesRegles(dans(ecritures)).journal, journal);
});

test('les paires déjà en conflit suivent les renommages sous le même budget, et se relisent à l’identique', () => {
  const paires: [string, string][] = Array.from({ length: 4000 }, (_, i) => [`VariableID:${i}:${i * 7}`, `VariableID:${i + 1}:${(i + 1) * 7}`]);
  const journal: Journal = { heure: 'h', renommages: [uneVariable(0, 'a', 'b')], dejaEnConflit: paires };
  const ecritures = ecritureDuLot(journal, 'l1', 20_000);
  assert.ok(ecritures.length > 3);
  for (const e of ecritures.slice(0, -1)) assert.ok(Buffer.byteLength(e.texte!, 'utf8') <= 20_000, e.cle);
  assert.deepEqual(lireLesRegles(dans(ecritures)).journal, journal);
  const sansPaire = ecritureDuLot({ heure: 'h', renommages: [uneVariable(0, 'a', 'b')] }, 'l2');
  assert.equal('dejaEnConflit' in JSON.parse(sansPaire[0]!.texte!), false, 'le champ est omis quand il est vide');
  assert.deepEqual(lireLesRegles(dans(sansPaire)).journal, { heure: 'h', renommages: [uneVariable(0, 'a', 'b')] });
  const illisible = dans(ecritureDuLot({ heure: 'h', renommages: [uneVariable(0, 'a', 'b')], dejaEnConflit: [['v0', 'v1']] }, 'l3'));
  illisible.set('journal:l3:0', JSON.stringify({ version: 1, lot: 'l3', rang: 0, renommages: [uneVariable(0, 'a', 'b')], dejaEnConflit: [['v0']] }));
  assert.equal(lireLesRegles(illisible).journal, undefined, 'une paire mal formée rend le journal illisible');
});

test('des noms en é, idéogrammes et emoji se découpent sur les octets, pas sur les caractères', () => {
  const renommages = Array.from({ length: 700 }, (_, i) => uneVariable(i, `${'漢字色彩背景前景'.repeat(3)}${i}`, `新${'😀é'.repeat(8)}${i}`));
  const journal: Journal = { heure: 'h', renommages };
  const ecritures = ecritureDuLot(journal, 'l1');
  assert.ok(ecritures.length > 2);
  for (const e of ecritures) {
    assert.ok(Buffer.byteLength(e.texte!, 'utf8') + Buffer.byteLength(`ucm_architect${e.cle}`, 'utf8') <= 102_400, e.cle);
    assert.ok(e.texte!.length < 90_000, 'le compte en caractères ne suffit pas à tenir sous la limite');
  }
  assert.deepEqual(lireLesRegles(dans(ecritures)).journal, journal);
});

test('un renommage qui ne tient pas seul dans une entrée rend un journal impossible', () => {
  const trop = uneVariable(0, '😀'.repeat(30_000), 'b');
  assert.equal(preparerJournal({ heure: 'h', renommages: [trop] }, 'l1'), undefined);
  assert.equal(preparerJournal({ heure: 'h', renommages: [uneVariable(1, 'a', 'b'), trop] }, 'l1'), undefined);
  assert.ok(preparerJournal({ heure: 'h', renommages: [uneVariable(1, 'a', 'b')] }, 'l1'));
});

test('la référence se range en dernier et nomme le lot ; une entrée manquante, d’un autre lot ou d’un autre rang rend le journal illisible', () => {
  const renommages: RenommageJournal[] = Array.from({ length: 30 }, (_, i) => uneVariable(i, 'a'.repeat(40), 'b'));
  const long = ecritureDuLot({ heure: 'h', renommages }, 'l1', 600);
  assert.ok(long.length > 3);
  assert.equal(long.at(-1)!.cle, 'journal');
  assert.deepEqual(lireLesRegles(dans(long)).journal, { heure: 'h', renommages });
  assert.equal(lireLesRegles(dans(long.slice(0, -1))).journal, undefined, 'sans référence');
  assert.equal(lireLesRegles(dans(long.filter((e) => e.cle !== 'journal:l1:1'))).journal, undefined, 'une entrée manque');
  const autreLot = ecritureDuLot({ heure: 'h', renommages: renommages.slice().reverse() }, 'l2', 600);
  const melange = dans([...long.filter((e) => e.cle !== 'journal:l1:1'), ...autreLot.filter((e) => e.cle === 'journal:l2:1').map((e) => ({ cle: 'journal:l1:1', texte: e.texte }))]);
  assert.equal(lireLesRegles(melange).journal, undefined, 'une entrée d’un autre lot sous la clé du lot');
  const permutee = dans(long.map((e) => e.cle === 'journal:l1:1' ? { cle: e.cle, texte: long.find((x) => x.cle === 'journal:l1:2')!.texte } : e));
  assert.equal(lireLesRegles(permutee).journal, undefined, 'une entrée d’un autre rang');
  const referenceCorrompue = new Map(dans(long)).set('journal', '{casse');
  assert.equal(lireLesRegles(referenceCorrompue).journal, undefined, 'une référence illisible ne retombe pas sur la forme ancienne');
});

test('la forme ancienne journal:<n> reste lue tant qu’aucune référence n’existe', () => {
  const tete = JSON.stringify({ version: 1, heure: 'h', morceaux: 2, renommages: [uneVariable(0, 'a', 'b')] });
  const queue = JSON.stringify({ version: 1, renommages: [uneVariable(1, 'c', 'd')] });
  const ancien = new Map([['journal:0', tete], ['journal:1', queue]]);
  assert.deepEqual(lireLesRegles(ancien).journal, { heure: 'h', renommages: [uneVariable(0, 'a', 'b'), uneVariable(1, 'c', 'd')] });
  assert.equal(lireLesRegles(new Map([['journal:0', tete]])).journal, undefined, 'une entrée manque');
  const neuf = dans(ecritureDuLot({ heure: 'h2', renommages: [] }, 'l1'));
  assert.deepEqual(lireLesRegles(new Map([...ancien, ...neuf])).journal, { heure: 'h2', renommages: [] }, 'la référence prime');
});

test('effacerLeJournal couvre la forme ancienne, la référence et les lots, et épargne les clés gardées', () => {
  const cles = ['ecriture', 'journal:0', 'journal:1', 'journal', 'journal:l1:0', 'journal:l2:0', 'terme:a'];
  assert.deepEqual(effacerLeJournal(cles).map((e) => e.cle), ['journal:0', 'journal:1', 'journal', 'journal:l1:0', 'journal:l2:0']);
  assert.deepEqual(effacerLeJournal(cles, new Set(['journal', 'journal:l2:0'])).map((e) => e.cle), ['journal:0', 'journal:1', 'journal:l1:0']);
  assert.ok(effacerLeJournal(cles).every((e) => e.texte === null));
});

test('l’export se relit à l’identique par l’import', () => {
  const texte = exporterLesRegles(completes);
  assert.equal(JSON.parse(texte).version, 1);
  const resultat = importerLesRegles(texte, reglesVides, () => []);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut !== 'valide') return;
  assert.equal(exporterLesRegles(resultat.regles), texte);
  assert.deepEqual(lireLesRegles(dans(resultat.ecritures)).termes, completes.termes);
  assert.deepEqual(lireLesRegles(dans(resultat.ecritures)).ecriture, ecriture);
  assert.equal(texte.includes('ollections'), false, 'l’export ne porte pas les collections');
  assert.ok(resultat.ecritures.every((e) => !e.cle.startsWith('collection:') && e.cle !== 'exclues'));
});

test('l’import ignore les collections d’un export et laisse celles du fichier', () => {
  const dejaLa: ReglesDuFichier = { ...reglesVides, collectionsGardees: ['c1'], collectionsExclues: ['c2'] };
  const avecIds = JSON.stringify({ ...JSON.parse(exporterLesRegles(completes)), collectionsGardees: ['x'], collectionsExclues: ['y'] });
  const resultat = importerLesRegles(avecIds, dejaLa, () => []);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut !== 'valide') return;
  assert.deepEqual([resultat.regles.collectionsGardees, resultat.regles.collectionsExclues], [['c1'], ['c2']]);
  assert.ok(resultat.ecritures.every((e) => !e.cle.startsWith('collection:') && e.cle !== 'exclues'));
});

test('l’import refuse un conflit factice et n’écrit rien', () => {
  const conflit: ConflitDeVocabulaire = { type: 'cycle', termes: [['a'], ['b']] };
  const recus: unknown[] = [];
  const resultat = importerLesRegles(exporterLesRegles(completes), reglesVides, (vocabulaire) => { recus.push(vocabulaire); return [conflit]; });
  assert.deepEqual(resultat, { statut: 'conflits', conflits: [conflit] });
  assert.deepEqual(recus, [{ personnalises: completes.termes, ecartsUcm: ['ucm-etat-hover'] }]);
});

test('l’import contrôle le vocabulaire fusionné avec celui du fichier', () => {
  const dejaLa: ReglesDuFichier = { ...reglesVides, termes: [{ terme: ['gap'], remplace: [['ancien']] }, { terme: ['zone'], remplace: [] }] };
  let vu: unknown;
  const resultat = importerLesRegles(exporterLesRegles({ ...reglesVides, termes: [{ terme: ['gap'], remplace: [['nouveau']] }] }), dejaLa, (v) => { vu = v; return []; });
  assert.equal(resultat.statut, 'valide');
  assert.deepEqual(vu, { personnalises: [{ terme: ['gap'], remplace: [['nouveau']] }, { terme: ['zone'], remplace: [] }], ecartsUcm: [] });
});

test('l’import valide tout avant de rendre une écriture', () => {
  const bon = JSON.parse(exporterLesRegles(completes));
  let appels = 0;
  const controler = () => { appels++; return []; };
  for (const abime of [
    'pas du json', '[]', JSON.stringify({ ...bon, version: 2 }), JSON.stringify({ ...bon, termes: [...bon.termes, { terme: ['x y'], remplace: [] }] }),
    JSON.stringify({ ...bon, distincts: [['a']] }), JSON.stringify({ ...bon, plusTard: [3] }), JSON.stringify({ ...bon, ecriture: { groupes: {}, variables: {} } }),
    JSON.stringify({ ...bon, voulus: [''] }), JSON.stringify({ ...bon, ordinaires: ['a b'] }), JSON.stringify({ ...bon, ordinaires: 'x' }),
  ]) assert.deepEqual(importerLesRegles(abime, reglesVides, controler), { statut: 'illisible' }, abime);
  assert.equal(appels, 0);
});

test('le port de stockage lit, écrit et efface dans l’espace d’Architect sans point d’annulation', () => {
  const donnees = new Map<string, string>();
  const traces: string[] = [];
  const api = { root: {
    getSharedPluginDataKeys: (espace: string) => { traces.push(espace); return [...donnees.keys()]; },
    getSharedPluginData: (espace: string, cle: string) => { traces.push(espace); return donnees.get(cle) ?? ''; },
    setSharedPluginData: (espace: string, cle: string, texte: string) => { traces.push(espace); if (texte) donnees.set(cle, texte); else donnees.delete(cle); },
  }, commitUndo: () => { traces.push('commitUndo'); } } as unknown as PluginAPI;
  const port = creerPortDeRegles(api);
  rangerLesEcritures(port, ecrituresDesRegles(completes));
  assert.deepEqual(lireLesRegles(lireLeStockage(port)).termes, completes.termes);
  rangerLesEcritures(port, [{ cle: 'ecart:ucm-etat-hover', texte: null }]);
  assert.equal(port.cles().includes('ecart:ucm-etat-hover'), false);
  assert.ok(traces.length > 0 && traces.every((t) => t === 'ucm_architect'));
  assert.equal(cleReponse('q'), 'reponse:q');
});

test('une collection renommée garde sa cible dans l’entrée `collection:<id>` et compte comme déjà jugée', () => {
  const regles: ReglesDuFichier = { ...reglesVides, collectionsGardees: ['c1'], collectionsRenommees: { c3: 'theme', c2: 'color-brands' } };
  const ecritures = ecrituresDesRegles(regles);
  assert.deepEqual(ecritures.map((e) => e.cle), ['collection:c1', 'collection:c2', 'collection:c3']);
  assert.deepEqual(JSON.parse(ecritures[1].texte!), { version: 1, cible: 'color-brands' });
  assert.deepEqual(JSON.parse(ecritures[0].texte!), { version: 1 });
  const lues = lireLesRegles(dans(ecritures));
  assert.deepEqual(lues.collectionsGardees, ['c1']);
  assert.deepEqual(lues.collectionsRenommees, { c2: 'color-brands', c3: 'theme' });
  assert.deepEqual(dejaJugeDuFichier(lues).collectionsGardees, ['c1', 'c2', 'c3']);
  assert.deepEqual(serialiserRegle({ type: 'collection', id: 'c2', cible: 'theme' }), { cle: 'collection:c2', texte: JSON.stringify({ version: 1, cible: 'theme' }) });
});

test('une cible inconnue se lit comme « nom gardé » ; l’export et l’import ne portent pas les renommages', () => {
  const lues = lireLesRegles([['collection:c1', JSON.stringify({ version: 1, cible: 'pas-une-collection' })]]);
  assert.deepEqual([lues.collectionsGardees, lues.collectionsRenommees], [['c1'], {}]);
  const dejaLa: ReglesDuFichier = { ...reglesVides, collectionsRenommees: { c1: 'theme' } };
  const texte = exporterLesRegles(dejaLa);
  assert.equal(texte.includes('theme'), false);
  const resultat = importerLesRegles(texte, dejaLa, () => []);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut === 'valide') assert.deepEqual(resultat.regles.collectionsRenommees, { c1: 'theme' });
});

// Les mots, les réponses défaites et l'import annulable

test('un mot de terme refuse les espaces et les caractères / | . { } $, à la lecture comme à l’import', () => {
  for (const mot of ['a/b', 'a|b', 'a.b', 'a{b', 'a}b', 'a$b', 'a b']) {
    const lues = lireLesRegles([[`terme:${mot}`, JSON.stringify({ version: 1, terme: [mot], remplace: [] })]]);
    assert.deepEqual(lues.termes, [], mot);
    const texte = JSON.stringify({ version: 1, termes: [{ terme: ['gap'], remplace: [[mot]] }] });
    assert.deepEqual(importerLesRegles(texte, reglesVides, () => []), { statut: 'illisible' }, mot);
  }
  assert.equal(importerLesRegles(JSON.stringify({ version: 1, termes: [{ terme: ['text/quux'], remplace: [['quux']] }] }), reglesVides, () => []).statut, 'illisible');
});

test('annuler une réponse garde les formes qu’un autre geste a ajoutées au même terme depuis', () => {
  const peinture = serialiserRegle({ type: 'terme', terme: { terme: ['ink'], remplace: [['paint']] } });
  const table = new Map(dans([peinture]));
  rangerLesEcritures(stockageDe(table), preparerReponse('q', [serialiserRegle({ type: 'terme', terme: { terme: ['ink'], remplace: [['paint'], ['dye']] } })], table));
  // Un autre geste ajoute « pigment » après la réponse.
  rangerLesEcritures(stockageDe(table), [serialiserRegle({ type: 'terme', terme: { terme: ['ink'], remplace: [['paint'], ['dye'], ['pigment']] } })]);
  rangerLesEcritures(stockageDe(table), defaireReponse('q', table)!);
  assert.deepEqual(lireLesRegles(table).termes, [{ terme: ['ink'], remplace: [['paint'], ['pigment']] }]);
  assert.ok(!table.has('reponse:q'));
});

test('annuler une réponse laisse en l’état une clé changée depuis qui n’est pas un terme, et efface un terme sans reste', () => {
  const table = new Map<string, string>();
  const ecritures = preparerReponse('q', [serialiserRegle({ type: 'terme', terme: { terme: ['ink'], remplace: [['dye']] } }), serialiserRegle({ type: 'voulu', mots: ['x'] })], table);
  rangerLesEcritures(stockageDe(table), ecritures);
  table.set('voulu:x', JSON.stringify({ version: 1, change: true }));
  rangerLesEcritures(stockageDe(table), defaireReponse('q', table)!);
  assert.ok(!table.has('terme:ink'), 'le terme que la réponse a créé et qui ne garde rien disparaît');
  assert.equal(JSON.parse(table.get('voulu:x')!).change, true);
});

test('une réponse rangée avant l’ajout de « apres » se défait comme avant', () => {
  const table = new Map([['voulu:a', JSON.stringify({ version: 1 })], ['reponse:q', JSON.stringify({ version: 1, avant: { 'voulu:a': null } })]]);
  assert.deepEqual(defaireReponse('q', table), [{ cle: 'voulu:a', texte: null }, { cle: 'reponse:q', texte: null }]);
});

test('reponse:import n’est pas lue comme une réponse ; l’import qui écrase l’écriture et un terme se défait', () => {
  const nouvelle = { groupes: autre, variables: autre };
  const table = new Map(dans([serialiserRegle({ type: 'ecriture', ecriture }), serialiserRegle({ type: 'terme', terme: { terme: ['gap'], remplace: [['ancien']] } })]));
  const depart = new Map(table);
  const texte = JSON.stringify({ version: 1, ecriture: nouvelle, termes: [{ terme: ['gap'], remplace: [['nouveau']] }, { terme: ['pad'], remplace: [] }] });
  const resultat = importerLesRegles(texte, lireLesRegles(table), () => []);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut !== 'valide') return;
  const rangee = preparerImport(resultat.ecritures, table, '14:32')!;
  assert.equal(rangee.cle, 'reponse:import');
  rangerLesEcritures(stockageDe(table), [...resultat.ecritures, rangee]);
  const lues = lireLesRegles(table);
  assert.deepEqual(lues.reponses, {});
  assert.equal(lues.dernierImport?.heure, '14:32');
  assert.deepEqual(lues.ecriture, nouvelle);
  rangerLesEcritures(stockageDe(table), defaireLImport(table));
  assert.deepEqual([...table].sort(), [...depart].sort());
  assert.deepEqual(defaireLImport(table), []);
});

test('un import qui n’écrase rien ne range pas reponse:import', () => {
  const resultat = importerLesRegles(JSON.stringify({ version: 1, termes: [{ terme: ['pad'], remplace: [] }] }), reglesVides, () => []);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut === 'valide') assert.equal(preparerImport(resultat.ecritures, new Map(), 'h'), undefined);
});

test('un rangement interrompu rétablit chaque clé déjà touchée et relance l’erreur', () => {
  const table = new Map([['a', 'A0']]);
  let appels = 0;
  const stockage = { ...stockageDe(table), ecrire: (cle: string, texte: string) => { if (++appels === 3) throw new Error('plein'); table.set(cle, texte); } };
  assert.throws(() => rangerLesEcritures(stockage, [{ cle: 'a', texte: 'A1' }, { cle: 'b', texte: 'B1' }, { cle: 'c', texte: 'C1' }]), /plein/u);
  assert.deepEqual([...table], [['a', 'A0']]);
});

test('un export sans ordinaires se lit comme une liste vide, et la fusion des ordinaires les réunit', () => {
  const ancien = JSON.stringify({ version: 1, termes: [] });
  const lu = importerLesRegles(ancien, reglesVides, () => []);
  assert.equal(lu.statut, 'valide');
  if (lu.statut !== 'valide') return;
  assert.deepEqual(lu.regles.ordinaires, []);
  const dejaLa: ReglesDuFichier = { ...reglesVides, ordinaires: ['head'] };
  const fusion = importerLesRegles(exporterLesRegles(completes), dejaLa, () => []);
  assert.equal(fusion.statut, 'valide');
  if (fusion.statut !== 'valide') return;
  assert.deepEqual(fusion.regles.ordinaires, ['head', 'stress-test']);
  assert.deepEqual(lireLesRegles(dans(fusion.ecritures)).ordinaires, ['stress-test']);
  assert.deepEqual(lireLesRegles(dans([{ cle: 'ordinaire:a b', texte: '{"version":1}' }, { cle: 'ordinaire:', texte: '{"version":1}' }])).ordinaires, []);
});
