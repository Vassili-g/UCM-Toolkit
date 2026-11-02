import assert from 'node:assert/strict';
import test from 'node:test';
import { agreger, comparer, tableauTexte } from '../scripts/stress/commun/comparer.js';
import { echantillon, graineDe, melanger, mulberry32 } from '../scripts/stress/commun/prng.js';
import type { CasDeStress, ConstatAttendu } from '../scripts/stress/commun/types.js';
import type { Constat } from '../src/controles/constat.js';

function constat(code: `C${number}`, cle: string, reste: Partial<Constat> = {}): Constat {
  return { id: `${code}-${cle}`, code, type: 'erreur', famille: 'liaisons', variants: [], layers: [cle], faits: {}, ...reste } as Constat;
}

const correction = (cle: string, nom: string): NonNullable<Constat['correction']> =>
  ({ id: 'k', sorte: 'liaison', cible: {}, avant: null, apres: { cle, nom }, aRelire: { regle: 'r', avant: null } });
const question = (...noms: string[]): NonNullable<Constat['question']> => ({ id: 'q', candidats: noms.map((nom) => ({ nom })) });
const cleDe = (c: Constat): string => c.layers[0];

function cas(attendus: ConstatAttendu[], reste: Partial<CasDeStress<null>> = {}): CasDeStress<null> {
  return { id: 'K1-1', famille: 'F2', operateur: 'K1', verdict: 'attendu', entree: null, attendus, ...reste };
}

test('deux tireurs de même graine rendent les mêmes tirages, et la sous-graine d’un cas est stable', () => {
  const a = mulberry32(7102);
  const b = mulberry32(7102);
  const tirages = Array.from({ length: 100 }, () => a());
  assert.deepEqual(tirages, Array.from({ length: 100 }, () => b()));
  assert.ok(tirages.every((t) => t >= 0 && t < 1));
  assert.equal(graineDe(7102, 'K1-3'), graineDe(7102, 'K1-3'));
  assert.notEqual(graineDe(7102, 'K1-3'), graineDe(7102, 'K1-4'));
});

test('melanger rend une permutation sans toucher l’entrée, et echantillon ne répète rien', () => {
  const entree = Array.from({ length: 20 }, (_, i) => i);
  const copie = [...entree];
  const melange = melanger(mulberry32(1), entree);
  assert.deepEqual(entree, copie);
  assert.deepEqual([...melange].sort((x, y) => x - y), entree);
  const prise = echantillon(mulberry32(2), entree, 8);
  assert.equal(prise.length, 8);
  assert.equal(new Set(prise).size, 8);
});

test('comparer rend exactement une fois chaque sorte d’écart', () => {
  const attendus: ConstatAttendu[] = [
    { code: 'C1', cle: 'manque', forme: 'correction' },
    { code: 'C1', cle: 'double', forme: 'correction' },
    { code: 'C1', cle: 'cible', forme: 'correction', apres: { cle: 'v1' } },
    { code: 'C1', cle: 'question-corrigee', forme: 'question' },
    { code: 'C1', cle: 'question-fausse', forme: 'question', candidats: ['a', 'b'] },
  ];
  const resultat = comparer(cas(attendus), [
    constat('C1', 'double', { correction: correction('v1', 'n') }),
    constat('C1', 'double', { correction: correction('v1', 'n') }),
    constat('C1', 'cible', { correction: correction('v2', 'n') }),
    constat('C1', 'question-corrigee', { question: question('a'), correction: correction('v1', 'n') }),
    constat('C1', 'question-fausse', { question: question('a', 'c') }),
    constat('C1', 'intrus'),
  ], cleDe);
  assert.deepEqual(resultat.ecarts.map((e) => e.sorte).sort(),
    ['correction-inexacte', 'correction-inexacte', 'doublon', 'faux-constat', 'manque', 'question-inexacte']);
  assert.equal(resultat.attendus, 5);
  assert.equal(resultat.detectes, 1);
});

test('un cas conforme rend zéro écart, et un code hors de codesJuges n’est pas un faux constat', () => {
  const attendus: ConstatAttendu[] = [
    { code: 'C1', cle: 'a', forme: 'correction', apres: { nom: 'n' } },
    { code: 'C1', cle: 'b', forme: 'question', candidats: ['x', 'y'] },
    { code: 'C1', cle: 'c', forme: 'a-faire' },
  ];
  const emis = [
    constat('C1', 'a', { correction: correction('v', 'n') }),
    constat('C1', 'b', { question: question('y', 'x') }),
    constat('C1', 'c'),
    constat('C9', 'autre'),
  ];
  const conforme = comparer(cas(attendus, { codesJuges: ['C1'] }), emis, cleDe);
  assert.deepEqual(conforme.ecarts, []);
  assert.equal(conforme.detectes, conforme.attendus);
  assert.equal(comparer(cas(attendus), emis, cleDe).ecarts.length, 1);
});

test('agreger compte les écarts d’un cas mesure dans enAttente seulement', () => {
  const a = comparer(cas([{ code: 'C1', cle: 'a', forme: 'a-faire' }]), [], cleDe);
  const b = comparer(cas([{ code: 'C1', cle: 'a', forme: 'a-faire' }], { id: 'K1-2', verdict: 'mesure', question: 'Q-1' }), [], cleDe);
  const lignes = agreger([a, b]);
  assert.equal(lignes.length, 2);
  assert.equal(lignes[0].sortes.manque, 1);
  assert.equal(lignes[0].enAttente, 1);
  assert.equal(lignes[0].cas, 2);
  assert.equal(lignes[1].famille, 'Total');
  assert.match(tableauTexte(lignes).split('\n')[0], /^\| Famille \| Opérateur \| Cas \|.*\| En attente \|$/);
});
