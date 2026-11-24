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
