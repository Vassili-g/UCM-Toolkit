/** La session d'analyse : une entrée par sujet, remplacée par la suivante, sans rien de l'état affiché. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerLaSession, type RequeteRetenue } from '../src/composant/analyse/session';

type Sorties = { readonly releve: string; readonly catalogue: string };
type Requetes = { readonly projection: RequeteRetenue<readonly string[]> };

const suivi = (curseur: number) => ({
  curseur, noeuds: new Set(['n']), admis: new Set(['n']), parents: new Map<string, string>(), pages: new Set(['p']),
  couverture: { instances: 'descendues', complete: true, trous: [] } as const,
});
const contenu = (releve: string, curseur = 0) => ({
  sorties: { releve, catalogue: 'c' },
  requetes: { projection: { resultat: [releve], entrees: ['releve', 'catalogue'] } },
  suivi: suivi(curseur),
});

test('retenir range une entrée par sujet et la remplace sans en garder l’ancienne', () => {
  const session = creerLaSession<Sorties, Requetes>();
  assert.equal(session.entree('A'), null);
  const premiere = session.retenir('A', contenu('un'));
  const seconde = session.retenir('A', contenu('deux', 5));
  assert.equal(session.entree('A'), seconde);
  assert.equal(seconde.sorties.releve, 'deux');
  assert.equal(seconde.suivi.curseur, 5);
  assert.ok(seconde.rang > premiere.rang);
  assert.deepEqual(session.sujets(), ['A']);
});

test('les sujets se rendent du plus récent au plus ancien ; lire ne change pas le rang', () => {
  const session = creerLaSession<Sorties, Requetes>();
  session.retenir('A', contenu('a'));
  session.retenir('B', contenu('b'));
  session.entree('A');
  assert.deepEqual(session.sujets(), ['B', 'A']);
  session.retenir('A', contenu('a2'));
  assert.deepEqual(session.sujets(), ['A', 'B']);
});

test('oublier retire un sujet et vider les retire tous', () => {
  const session = creerLaSession<Sorties, Requetes>();
  session.retenir('A', contenu('a'));
  session.retenir('B', contenu('b'));
  assert.equal(session.oublier('A'), true);
  assert.equal(session.oublier('A'), false);
  assert.equal(session.entree('A'), null);
  session.vider();
  assert.deepEqual(session.sujets(), []);
});

test('l’entrée ne porte que sujet, rang, sorties, requêtes et suivi', () => {
  const session = creerLaSession<Sorties, Requetes>();
  const entree = session.retenir('A', { ...contenu('a'), corrections: new Map(), reponses: {}, generation: 3 } as never);
  assert.deepEqual(Object.keys(entree).sort(), ['rang', 'requetes', 'sorties', 'suivi', 'sujet']);
});
