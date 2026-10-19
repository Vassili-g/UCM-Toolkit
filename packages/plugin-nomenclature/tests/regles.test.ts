/** Les règles du fichier : lecture tolérante, clés, réponses, journal, reprise de la v1 et échange d'export. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ConflitDeVocabulaire } from '@ucm-kit/core/referentiel';
import { creerPortDeRegles } from '../src/ecriture';
import {
  cleDistinct, cleJournal, cleReponse, cleTerme, defaireReponse, dejaJugeDuFichier, ecrituresDesRegles, exporterLesRegles,
  importerLesRegles, lireLeStockage, lireLesRegles, preparerJournal, preparerReponse, rangerLesEcritures, reglesVides,
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
  plusTard: ['paire:a|b'],
  collectionsGardees: ['VariableCollectionId:1:2'],
  collectionsExclues: ['VariableCollectionId:3:4'],
  vus: ['g1', 'g2'],
};

test('chaque règle a la clé du plan et une version', () => {
  const clesAttendues = ['ecriture', 'terme:extra small', 'terme:gap', 'ecart:ucm-etat-hover', 'distinct:large|larger', 'voulu:extra small',
    'plus-tard:paire:a|b', 'collection:VariableCollectionId:1:2', 'exclues', 'vus'];
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

test('8 000 renommages se découpent en entrées de 90 000 caractères au plus, puis se relisent à l’identique', () => {
  const renommages: RenommageJournal[] = Array.from({ length: 8000 }, (_, i) => ({
    type: i % 10 === 0 ? 'collection' : 'variable', id: `VariableID:${i}:${i * 7}`, ancienNom: `Brand Color/Texte ${i}/été`, nouveauNom: `brand-color/texte-${i}/ete`,
  }));
  const journal: Journal = { heure: '2026-10-17T10:00:00.000Z', renommages };
  const ecritures = preparerJournal(journal);
  assert.ok(ecritures.length > 1);
  for (const e of ecritures) assert.ok(e.texte!.length <= 90_000, `${e.cle} : ${e.texte!.length}`);
  assert.deepEqual(ecritures.map((e) => e.cle), ecritures.map((_, i) => cleJournal(i)));
  assert.deepEqual(lireLesRegles(dans(ecritures)).journal, journal);
});

test('un journal incomplet se lit absent, et un journal plus court efface les entrées en trop', () => {
  const renommages: RenommageJournal[] = Array.from({ length: 30 }, (_, i) => ({ type: 'variable', id: `v${i}`, ancienNom: 'a'.repeat(40), nouveauNom: 'b' }));
  const long = preparerJournal({ heure: 'h', renommages }, [], 600);
  assert.ok(long.length > 2);
  assert.equal(lireLesRegles(dans(long.slice(0, -1))).journal, undefined);
  assert.equal(lireLesRegles(dans(long.filter((e) => e.cle !== 'journal:1'))).journal, undefined);
  const court = preparerJournal({ heure: 'h2', renommages: [] }, long.map((e) => e.cle));
  assert.deepEqual(court.map((e) => [e.cle, e.texte === null]), [['journal:0', false], ...long.slice(1).map((e) => [e.cle, true])]);
  assert.deepEqual(lireLesRegles(dans(court)).journal, { heure: 'h2', renommages: [] });
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
    JSON.stringify({ ...bon, voulus: [''] }),
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
