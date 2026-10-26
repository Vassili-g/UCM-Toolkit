import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentExport } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { sortieComparable } from './aides/parite';

test('le comparateur refuse une permutation des parties et des localisations', () => {
  const sortie = {
    content: '{"exportedAt":"2026-01-01"}',
    parties: new Map([['premier', { titre: 'Premier' }], ['second', { titre: 'Second' }]]),
    localisations: new Map([['premier', ['calque-a']], ['second', ['calque-b']]]),
    localisationsDeclarees: new Map([['premier', 'a'], ['second', 'b']]),
  } as unknown as ComponentExport;
  const permutee = {
    ...sortie,
    parties: new Map([...sortie.parties].reverse()),
    localisations: new Map([...sortie.localisations].reverse()),
    localisationsDeclarees: new Map([...sortie.localisationsDeclarees].reverse()),
  };

  assert.notDeepEqual(sortieComparable(sortie), sortieComparable(permutee));
  assert.notDeepEqual(sortieComparable(sortie).parties, sortieComparable(permutee).parties);
  assert.notDeepEqual(sortieComparable(sortie).localisations, sortieComparable(permutee).localisations);
  assert.notDeepEqual(sortieComparable(sortie).localisationsDeclarees, sortieComparable(permutee).localisationsDeclarees);
});

test('le comparateur conserve les diagnostics imbriqués et ignore seulement la date', () => {
  const sortie = {
    content: '{"exportedAt":"2026-01-01","meta":{"diagnostics":[{"parts":["a","b"]}]}}',
    parties: new Map(),
    localisations: new Map(),
    localisationsDeclarees: new Map(),
  } as unknown as ComponentExport;
  const autreDate = { ...sortie, content: sortie.content.replace('2026-01-01', '2026-02-01') };
  const diagnosticPermute = { ...sortie, content: sortie.content.replace('["a","b"]', '["b","a"]') };

  assert.deepEqual(sortieComparable(sortie), sortieComparable(autreDate));
  assert.notDeepEqual(sortieComparable(sortie), sortieComparable(diagnosticPermute));
});
