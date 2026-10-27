/** La rétention de la session : bornes, éviction du moins récent, sujet rangé protégé, entrée trop grosse non retenue. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { estimerLesOctets } from '../src/composant/analyse/retention';
import { creerLaSession, type RequeteRetenue } from '../src/composant/analyse/session';

type Sorties = { readonly releve: string };
type Requetes = { readonly projection: RequeteRetenue<readonly string[]> };

const contenu = (releve: string, curseur = 0) => ({
  sorties: { releve },
  requetes: { projection: { resultat: [releve], entrees: ['releve', 'catalogue'] } },
  suivi: {
    curseur, noeuds: new Set(['n']), admis: new Set(['n']), parents: new Map<string, string>(), pages: new Set(['p']),
    couverture: { instances: 'descendues', complete: true, trous: [] } as const,
  },
});

const session = (bornes: { sujets: number; octets: number; aretes: number }, aretes?: () => number) =>
  creerLaSession<Sorties, Requetes>({ bornes: () => bornes, ...(aretes ? { aretes } : {}) });
const LARGE = { sujets: 100, octets: 1_000_000, aretes: 1000 };

test('l’estimation des octets est déterministe, compte chaînes, nombres et structures, et traite un cycle une fois', () => {
  const cycle: { nom: string; soi?: unknown } = { nom: 'abc' };
  cycle.soi = cycle;
  assert.equal(estimerLesOctets(cycle, 1000), estimerLesOctets(cycle, 1000));
  assert.equal(estimerLesOctets('abcd', 1000), 8);
  assert.equal(estimerLesOctets([1, 2, true], 1000), 8 + 8 + 8 + 4);
  assert.equal(estimerLesOctets(new Map([['a', 1]]), 1000), 8 + 2 + 8);
  assert.ok(estimerLesOctets(cycle, 1000) < 100);
});

test('l’estimation d’une valeur plus grosse que le plafond dépasse le plafond sans la parcourir entière', () => {
  const grosse = Array.from({ length: 5000 }, (_, i) => ({ [`k${i}`]: 'x'.repeat(10) }));
  const mesure = estimerLesOctets(grosse, 100);
  assert.ok(mesure > 100 && mesure < 1000, 'le parcours s’arrête peu après le plafond');
});

test('un sujet de plus que la borne évince le moins récent', () => {
  const s = session({ ...LARGE, sujets: 2 });
  s.retenir('A', contenu('a'));
  s.retenir('B', contenu('b'));
  s.retenir('A', contenu('a2'));
  s.retenir('C', contenu('c'));
  assert.deepEqual(s.sujets(), ['C', 'A']);
  assert.equal(s.entree('B'), null);
});

test('l’éviction retire aussi la marque d’invalidation du sujet évincé', () => {
  const s = session({ ...LARGE, sujets: 1 });
  s.retenir('A', contenu('a'));
  s.invalider('A', ['style']);
  s.retenir('B', contenu('b'));
  assert.equal(s.entree('A'), null);
  assert.deepEqual(s.invalidations('A'), []);
  assert.equal(s.evalueJusqua('A'), null);
});

test('la borne d’octets évince plusieurs sujets anciens, jamais le sujet rangé', () => {
  const petit = contenu('x'.repeat(10));
  const cout = (() => { const m = session(LARGE); m.retenir('Z', petit); return m.mesure().octets; })();
  const s = session({ ...LARGE, octets: cout * 2 + 1 });
  s.retenir('A', petit);
  s.retenir('B', petit);
  s.retenir('C', petit);
  assert.deepEqual(s.sujets(), ['C', 'B']);
  assert.ok(s.mesure().octets <= cout * 2 + 1);
});

test('la borne d’arêtes compte les entrées de requêtes et les arêtes de l’appelant', () => {
  const s = session({ ...LARGE, aretes: 7 }, () => 3);
  s.retenir('A', contenu('a'));
  assert.equal(s.mesure().aretes, 5);
  s.retenir('B', contenu('b'));
  assert.deepEqual(s.sujets(), ['B']);
  assert.equal(s.mesure().aretes, 5);
});

test('un sujet qui dépasse seul une borne n’est pas retenu et son entrée précédente est retirée', () => {
  const cout = (() => { const m = session(LARGE); m.retenir('Z', contenu('a')); return m.mesure().octets; })();
  const s = session({ ...LARGE, octets: cout * 3 });
  assert.ok(s.retenir('A', contenu('a')));
  s.retenir('B', contenu('b'));
  s.invalider('A', ['style']);
  assert.equal(s.retenir('A', contenu('x'.repeat(cout))), null);
  assert.equal(s.entree('A'), null);
  assert.deepEqual(s.invalidations('A'), []);
  assert.deepEqual(s.sujets(), ['B'], 'les autres sujets restent');
  const sans = session({ ...LARGE, aretes: 1 });
  assert.equal(sans.retenir('A', contenu('a')), null, 'deux arêtes dépassent la borne d’une');
});
