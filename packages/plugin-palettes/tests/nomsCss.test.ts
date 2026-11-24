/** P27, lot 5.3 : deux palettes dont les segments donnent la même variable CSS se dédoublonnent (cas C2). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { joinTokenPath, tokenCssVariable } from '@ucm-kit/core/format';

import { segmentsDesPalettes } from '../src/variables/noms';

const segmentsDe = (a: string, b: string): [string, string] => {
  const segments = segmentsDesPalettes({ palettes: [{ id: 'p1', nom: a }, { id: 'p2', nom: b }] } as never);
  return [segments.get('p1')!.segment, segments.get('p2')!.segment];
};
const cssDe = (segment: string): string => tokenCssVariable(joinTokenPath('primitives', `color/${segment}/light/500`));

for (const [a, b] of [
  ['Café', 'Cafe'],
  ['Sky Blue', 'Sky_Blue'],
  ['Été', 'Ete'],
  ['Cafe\u0301', 'Caf\u00e9'],
  ['Grass', 'grass'],
] as const) {
  test(`C2 : « ${a} » et « ${b} » ne donnent pas la même variable CSS`, () => {
    const [premier, second] = segmentsDe(a, b);
    assert.notEqual(cssDe(premier), cssDe(second));
    assert.equal(premier.endsWith('-p1') || premier.endsWith('-p2'), false, 'la premi\u00e8re palette garde son segment');
    assert.ok(second.endsWith('-p2'), 'la seconde prend son identifiant en suffixe');
  });
}

test('C2 : deux noms vraiment différents gardent leur segment', () => {
  assert.deepEqual(segmentsDe('Sky Blue', 'Sea Blue'), ['Sky-Blue', 'Sea-Blue']);
});

// Le suffixe d'une palette peut lui-même reprendre le nom d'une palette placée avant (C1 de la chasse P27).
const cssDesSegments = (palettes: ReadonlyArray<{ id: string; nom: string }>): string[] =>
  [...segmentsDesPalettes({ palettes } as never).values()].map(({ segment }) => tokenCssVariable(segment));

test('C1 : un nom qui reprend le suffixe d’une palette suivante garde trois noms CSS distincts', () => {
  const segments = segmentsDesPalettes({ palettes: [
    { id: 'p-0000000a', nom: 'Bleu-p-0000000c' },
    { id: 'p-0000000b', nom: 'Bleu' },
    { id: 'p-0000000c', nom: 'Bleu' },
  ] } as never);
  assert.equal(new Set(cssDesSegments([
    { id: 'p-0000000a', nom: 'Bleu-p-0000000c' }, { id: 'p-0000000b', nom: 'Bleu' }, { id: 'p-0000000c', nom: 'Bleu' },
  ])).size, 3);
  assert.equal(segments.get('p-0000000a')!.segment, 'Bleu-p-0000000c', 'la première palette garde son nom');
  assert.equal(segments.get('p-0000000b')!.segment, 'Bleu', 'la seconde garde le sien, encore libre');
  assert.equal(segments.get('p-0000000c')!.segment, 'Bleu-p-0000000c-p-0000000c');
  assert.equal(segments.get('p-0000000c')!.suffixe, true);
});

test('C1 : plusieurs suffixes déjà occupés donnent autant d’identifiants répétés que nécessaire', () => {
  const palettes = [
    { id: 'p1', nom: 'Bleu' },
    { id: 'p2', nom: 'Bleu-p4' },
    { id: 'p3', nom: 'Bleu-p4-p4' },
    { id: 'p4', nom: 'Bleu' },
    { id: 'p5', nom: 'bleu' },
  ];
  const segments = segmentsDesPalettes({ palettes } as never);
  assert.equal(new Set(cssDesSegments(palettes)).size, 5);
  assert.deepEqual([...segments.values()].map(({ segment }) => segment), ['Bleu', 'Bleu-p4', 'Bleu-p4-p4', 'Bleu-p4-p4-p4', 'bleu-p5']);
});
