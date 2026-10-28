/** L'égalité exacte qui valide une entrée de session avant sa réutilisation, et les écarts des sorties relues. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ecartsDesSorties, egalesExactement, egalesExactementParEtapes } from '../src/composant/analyse/validation';

test('les primitives se comparent par Object.is : NaN égale NaN, 0 et -0 diffèrent', () => {
  assert.equal(egalesExactement(NaN, NaN), true);
  assert.equal(egalesExactement(0, -0), false);
  assert.equal(egalesExactement('a', 'a'), true);
  assert.equal(egalesExactement(1, '1'), false);
  assert.equal(egalesExactement(null, undefined), false);
  assert.equal(egalesExactement({ v: NaN }, { v: NaN }), true);
  assert.equal(egalesExactement([0], [-0]), false);
});

test('une liste se compare dans son ordre, et une case vide diffère de undefined', () => {
  assert.equal(egalesExactement([1, [2, { a: 3 }]], [1, [2, { a: 3 }]]), true);
  assert.equal(egalesExactement([1, 2], [2, 1]), false);
  assert.equal(egalesExactement([1], [1, 2]), false);
  const creuse: unknown[] = new Array(2);
  creuse[1] = 1;
  assert.equal(egalesExactement(creuse, [undefined, 1]), false);
  assert.equal(egalesExactement([], {}), false);
});

test('un objet se compare par ses clés dans leur ordre, et une clé à undefined diffère d’une clé absente', () => {
  assert.equal(egalesExactement({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }), true);
  assert.equal(egalesExactement({ a: 1, b: 2 }, { b: 2, a: 1 }), false);
  assert.equal(egalesExactement({ a: 1, b: undefined }, { a: 1 }), false);
  assert.equal(egalesExactement({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(egalesExactement(Object.assign(Object.create(null), { a: 1 }), Object.assign(Object.create(null), { a: 1 })), true);
  assert.equal(egalesExactement(Object.assign(Object.create(null), { a: 1 }), { a: 1 }), false);
});

test('une Map et un Set se comparent dans leur ordre d’insertion, clés et valeurs comprises', () => {
  assert.equal(egalesExactement(new Map([['a', { v: 1 }], ['b', [2]]]), new Map([['a', { v: 1 }], ['b', [2]]])), true);
  assert.equal(egalesExactement(new Map([['a', 1], ['b', 2]]), new Map([['b', 2], ['a', 1]])), false);
  assert.equal(egalesExactement(new Map([['a', 1]]), new Map([['a', 2]])), false);
  assert.equal(egalesExactement(new Map([[{ k: 1 }, 'x']]), new Map([[{ k: 1 }, 'x']])), true);
  assert.equal(egalesExactement(new Set([1, 2]), new Set([1, 2])), true);
  assert.equal(egalesExactement(new Set([1, 2]), new Set([2, 1])), false);
  assert.equal(egalesExactement(new Set([1]), [1]), false);
  assert.equal(egalesExactement({ m: new Map([['a', new Set(['x'])]]) }, { m: new Map([['a', new Set(['y'])]]) }), false);
});

test('un objet qui n’est pas simple n’égale que lui-même', () => {
  class Noeud { constructor(readonly id: string) {} }
  const noeud = new Noeud('1:2');
  assert.equal(egalesExactement(noeud, noeud), true);
  assert.equal(egalesExactement(new Noeud('1:2'), new Noeud('1:2')), false);
  assert.equal(egalesExactement(new Date(0), new Date(0)), false);
  assert.equal(egalesExactement({ noeud }, { noeud }), true);
  const fonction = () => 1;
  assert.equal(egalesExactement(fonction, fonction), true);
  assert.equal(egalesExactement(() => 1, () => 1), false);
});

test('un cycle se compare sans boucler', () => {
  const a: Record<string, unknown> = { nom: 'a' };
  a.soi = a;
  const b: Record<string, unknown> = { nom: 'a' };
  b.soi = b;
  assert.equal(egalesExactement(a, b), true);
  const c: Record<string, unknown> = { nom: 'c' };
  c.soi = c;
  assert.equal(egalesExactement(a, c), false);
});

test('les écarts nomment les sorties relues qui diffèrent de leur version retenue, dans l’ordre donné', () => {
  assert.deepEqual(ecartsDesSorties([
    { nom: 'releve', retenue: { layers: [1, 2] }, relue: { layers: [2, 1] } },
    { nom: 'catalogue', retenue: { v: 1 }, relue: { v: 1 } },
    { nom: 'regles', retenue: null, relue: { a: 1 } },
  ]), ['different:releve', 'different:regles']);
  assert.deepEqual(ecartsDesSorties([{ nom: 'releve', retenue: [1], relue: [1] }]), []);
});

/** Conduit la comparaison par étapes jusqu'au bout ; rend l'issue et le nombre d'étapes. */
function parEtapes(a: unknown, b: unknown, profondeur?: number): { egales: boolean; etapes: number } {
  const calcul = egalesExactementParEtapes(a, b, profondeur);
  for (let etapes = 0; ; etapes += 1) {
    const suivant = calcul.next();
    if (suivant.done) return { egales: suivant.value, etapes };
  }
}

test('la comparaison par étapes rend la même issue qu’egalesExactement, à toute profondeur, sur chaque règle', () => {
  class Noeud { constructor(readonly id: string) {} }
  const noeud = new Noeud('1:2');
  const creuse: unknown[] = new Array(2);
  creuse[1] = 1;
  const cycle = (nom: string) => { const objet: Record<string, unknown> = { nom }; objet.soi = objet; return objet; };
  const paires: Array<[unknown, unknown]> = [
    [NaN, NaN], [0, -0], [{ v: NaN }, { v: NaN }], [[0], [-0]], [null, undefined], ['a', 'a'],
    [[1, [2, { a: 3 }]], [1, [2, { a: 3 }]]], [[1, 2], [2, 1]], [[1], [1, 2]], [creuse, [undefined, 1]], [[], {}],
    [{ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }], [{ a: 1, b: 2 }, { b: 2, a: 1 }], [{ a: 1, b: undefined }, { a: 1 }],
    [Object.assign(Object.create(null), { a: 1 }), { a: 1 }],
    [new Map([['a', { v: 1 }]]), new Map([['a', { v: 1 }]])], [new Map([['a', 1], ['b', 2]]), new Map([['b', 2], ['a', 1]])],
    [new Set([1, 2]), new Set([2, 1])], [new Set([1]), [1]], [{ m: new Map([['a', new Set(['x'])]]) }, { m: new Map([['a', new Set(['y'])]]) }],
    [{ noeud }, { noeud }], [new Noeud('1:2'), new Noeud('1:2')], [new Date(0), new Date(0)],
    [cycle('a'), cycle('a')], [cycle('a'), cycle('c')],
    [{ variants: [{ layers: [{ liaisons: [{ variable: { nom: 'a' } }] }] }] }, { variants: [{ layers: [{ liaisons: [{ variable: { nom: 'b' } }] }] }] }],
  ];
  for (const [rang, [a, b]] of paires.entries()) {
    for (const profondeur of [0, 1, 2, 4, 10]) assert.equal(parEtapes(a, b, profondeur).egales, egalesExactement(a, b), `paire ${rang}, profondeur ${profondeur}`);
  }
});

test('la comparaison par étapes s’arrête à chaque élément jusqu’à la profondeur donnée, puis compare d’un bloc ; elle s’arrête au premier écart', () => {
  const releve = (nom: string) => ({ variants: Array.from({ length: 3 }, (_, v) => ({ layers: Array.from({ length: 4 }, (_, l) => ({ id: `${v}:${l}`, liaisons: [{ nom }] })) })) });
  // racine : 1 clé ; variants : 3 éléments ; chaque variant : 1 clé ; layers : 4 éléments chacun.
  assert.deepEqual(parEtapes(releve('a'), releve('a')), { egales: true, etapes: 1 + 3 + 3 + 12 });
  assert.deepEqual(parEtapes(releve('a'), releve('a'), 0), { egales: true, etapes: 0 });
  assert.equal(parEtapes(releve('a'), releve('b')).etapes, 4, 'le premier layer diffère : la comparaison s’arrête');
});
