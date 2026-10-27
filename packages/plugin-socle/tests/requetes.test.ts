/** L'ossature des requêtes : la clé (forme canonique, session, version, pas de génération) et les révisions des valeurs. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleDeRequete, creerLaSessionDuDocument, creerLeRegistreDeRevisions, elementsDeCle, formeCanonique, VERSION_DE_L_ALGORITHME,
} from '../src/composant/analyse/requetes';

const SESSION = 'doc-fixe';

test('l’ordre d’écriture des clés d’un objet ne change pas la forme canonique, à tous les niveaux', () => {
  assert.equal(formeCanonique({ b: 1, a: { d: 2, c: 3 } }), formeCanonique({ a: { c: 3, d: 2 }, b: 1 }));
  assert.equal(cleDeRequete('controles', [{ niveau: 'AA', ucm: true }], SESSION), cleDeRequete('controles', [{ ucm: true, niveau: 'AA' }], SESSION));
  assert.notEqual(formeCanonique({ a: 1 }), formeCanonique({ a: 2 }));
});

test('listes, Map et Set gardent leur ordre, deux Map de mêmes paires dans le même ordre ont la même forme', () => {
  assert.equal(formeCanonique(new Map([['a', 1], ['b', 2]])), formeCanonique(new Map([['a', 1], ['b', 2]])));
  assert.notEqual(formeCanonique(new Map([['a', 1], ['b', 2]])), formeCanonique(new Map([['b', 2], ['a', 1]])));
  assert.notEqual(formeCanonique(new Set([1, 2])), formeCanonique(new Set([2, 1])));
  assert.notEqual(formeCanonique([1, 2]), formeCanonique([2, 1]));
  assert.notEqual(formeCanonique(new Map([['a', 1]])), formeCanonique([['a', 1]]), 'une Map n’est pas une liste de paires');
  assert.notEqual(formeCanonique(new Set([1])), formeCanonique([1]));
});

test('les nombres spéciaux ont chacun leur forme, comme pour l’égalité exacte', () => {
  assert.equal(formeCanonique(NaN), formeCanonique(NaN));
  assert.notEqual(formeCanonique(0), formeCanonique(-0));
  assert.notEqual(formeCanonique(NaN), formeCanonique('NaN'));
  assert.notEqual(formeCanonique(1), formeCanonique('1'));
  assert.notEqual(formeCanonique(Infinity), formeCanonique(-Infinity));
  assert.notEqual(formeCanonique(null), formeCanonique(undefined));
  assert.notEqual(formeCanonique({ a: undefined }), formeCanonique({}), 'une clé à undefined diffère d’une clé absente');
  // eslint-disable-next-line no-sparse-arrays
  assert.notEqual(formeCanonique([, 1]), formeCanonique([undefined, 1]));
});

test('les chaînes à séparateurs ne se confondent ni entre elles ni avec une liste', () => {
  assert.notEqual(formeCanonique(['a,b']), formeCanonique(['a', 'b']));
  assert.notEqual(formeCanonique(['a","b']), formeCanonique(['a', 'b']));
  assert.notEqual(formeCanonique(['a]']), formeCanonique(['a']));
  assert.notEqual(formeCanonique({ 'a:1': 2 }), formeCanonique({ a: '1:2' }));
  assert.notEqual(cleDeRequete('a|b', ['c'], SESSION), cleDeRequete('a', ['b|c'], SESSION));
  assert.notEqual(cleDeRequete('a', ['x'], 'doc|1'), cleDeRequete('a', ['x'], 'doc'));
  assert.equal(formeCanonique('ligne\n"guillemets"\\'), formeCanonique('ligne\n"guillemets"\\'));
});

test('un argument instable ou hors forme lève au lieu de rendre une clé fausse', () => {
  assert.throws(() => formeCanonique(new Date(0)), /objets simples/);
  assert.throws(() => formeCanonique(new (class Noeud { id = 'n1'; })()), /objets simples/);
  assert.throws(() => formeCanonique(() => 1), /function/);
  assert.throws(() => formeCanonique(Symbol('x')), /symbol/);
  const cycle: { soi?: unknown } = {};
  cycle.soi = cycle;
  assert.throws(() => formeCanonique(cycle), /cycle/);
  const partage = { a: 1 };
  assert.doesNotThrow(() => formeCanonique([partage, partage]), 'un objet partagé sans cycle est admis');
  assert.equal(formeCanonique(Object.create(null) as object), '{}');
});

test('deux sessions du document donnent des clés différentes pour la même requête', () => {
  const premiere = creerLaSessionDuDocument();
  const seconde = creerLaSessionDuDocument();
  assert.notEqual(premiere, seconde);
  assert.notEqual(cleDeRequete('controles', ['n1'], premiere), cleDeRequete('controles', ['n1'], seconde));
  assert.equal(cleDeRequete('controles', ['n1'], premiere), cleDeRequete('controles', ['n1'], premiere));
});

test('une autre version d’algorithme donne une autre clé, et la version par défaut est celle de la constante', () => {
  assert.notEqual(cleDeRequete('controles', [], SESSION, 1), cleDeRequete('controles', [], SESSION, 2));
  assert.equal(cleDeRequete('controles', [], SESSION), cleDeRequete('controles', [], SESSION, VERSION_DE_L_ALGORITHME));
  assert.equal(elementsDeCle(cleDeRequete('controles', [], SESSION, 7)).version, 7);
});

test('une clé ne porte que version, session, nom et arguments, et refuse génération et identité d’analyse', () => {
  const elements = elementsDeCle(cleDeRequete('projection', ['n1', { niveau: 'AA' }], SESSION));
  assert.deepEqual(Object.keys(elements), ['version', 'session', 'nom', 'arguments']);
  assert.deepEqual(elements, { version: VERSION_DE_L_ALGORITHME, session: SESSION, nom: 'projection', arguments: formeCanonique(['n1', { niveau: 'AA' }]) });
  assert.throws(() => cleDeRequete('projection', [{ generation: 3 }], SESSION), /génération/);
  assert.throws(() => cleDeRequete('projection', [[{ imbrique: { identite: { sujet: 'x' } } }]], SESSION), /identité/);
  // Aucun autre paramètre : la même requête appelée à deux générations s’écrit de la même façon.
  assert.equal(cleDeRequete.length, 3, 'nom, arguments et session sont obligatoires ; la version a une valeur par défaut');
});

test('poser un fait de valeur égale ne monte pas la révision, une valeur différente la monte', () => {
  const registre = creerLeRegistreDeRevisions();
  assert.equal(registre.revision, 0);
  assert.equal(registre.poserLEntree('couleur', { r: 1, v: 2 }), true);
  assert.equal(registre.revision, 1);
  assert.equal(registre.poserLEntree('couleur', { r: 1, v: 2 }), false, 'une valeur égale par le contenu, objet neuf');
  assert.equal(registre.revision, 1);
  assert.deepEqual(registre.etat('couleur'), { valeur: { r: 1, v: 2 }, revisionVerifiee: 1, revisionChangee: 1 });
  assert.equal(registre.poserLEntree('couleur', { r: 1, v: 3 }), true);
  assert.equal(registre.revision, 2);
  assert.equal(registre.etat('couleur')?.revisionChangee, 2);
  assert.equal(registre.poserLEntree('autre', 'x'), true);
  assert.equal(registre.revision, 3);
  assert.equal(registre.etat('couleur')?.revisionChangee, 2, 'un autre fait ne date pas celui-ci');
  assert.equal(registre.etat('inconnu'), undefined);
});

test('l’égalité des faits est exacte : l’ordre, -0 et NaN comptent', () => {
  const registre = creerLeRegistreDeRevisions();
  registre.poserLEntree('liste', ['a', 'b']);
  assert.equal(registre.poserLEntree('liste', ['b', 'a']), true);
  registre.poserLEntree('zero', 0);
  assert.equal(registre.poserLEntree('zero', -0), true);
  registre.poserLEntree('nan', NaN);
  assert.equal(registre.poserLEntree('nan', NaN), false);
});

test('un résultat de requête égal garde sa révision de changement, un résultat différent la prend', () => {
  const registre = creerLeRegistreDeRevisions();
  registre.poserLEntree('fait', 1);
  assert.equal(registre.poserLaRequete('q', { visibles: [1] }), true);
  assert.deepEqual(registre.etat('q'), { valeur: { visibles: [1] }, revisionVerifiee: 1, revisionChangee: 1 });
  registre.poserLEntree('fait', 2);
  assert.equal(registre.poserLaRequete('q', { visibles: [1] }), false, 'recalcul au même résultat : propagation arrêtée');
  assert.deepEqual(registre.etat('q'), { valeur: { visibles: [1] }, revisionVerifiee: 2, revisionChangee: 1 });
  registre.poserLEntree('fait', 3);
  assert.equal(registre.poserLaRequete('q', { visibles: [2] }), true);
  assert.deepEqual(registre.etat('q'), { valeur: { visibles: [2] }, revisionVerifiee: 3, revisionChangee: 3 });
  assert.equal(registre.revision, 3, 'une requête ne monte pas la révision globale');
});

test('vérifier reconnaît une valeur à jour sans toucher à sa révision de changement', () => {
  const registre = creerLeRegistreDeRevisions();
  registre.poserLaRequete('q', 'v');
  registre.poserLEntree('fait', 1);
  registre.verifier('q');
  registre.verifier('inconnue');
  assert.deepEqual(registre.etat('q'), { valeur: 'v', revisionVerifiee: 1, revisionChangee: 0 });
  assert.equal(registre.etat('inconnue'), undefined);
});

test('une clé ne sert pas à la fois de fait et de requête', () => {
  const registre = creerLeRegistreDeRevisions();
  registre.poserLEntree('a', 1);
  registre.poserLaRequete('b', 1);
  assert.throws(() => registre.poserLaRequete('a', 1), /déjà posée comme entree/);
  assert.throws(() => registre.poserLEntree('b', 1), /déjà posée comme requete/);
});
