/** Une référence est un gris teinté sous une chroma OKLCH de 0,05 : le hub et la planche le jugent par la même fonction (D-12). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FAMILLES_GRISES, estReferenceGrise, lireHexa, rgb8VersOklch } from '../src/index';

test('estReferenceGrise est vrai sous la chroma 0,05 et faux au-delà', () => {
  assert.equal(estReferenceGrise([128, 128, 128]), true);
  assert.equal(estReferenceGrise(lireHexa('#64748B')!), true);
  assert.equal(estReferenceGrise(lireHexa('#6B7280')!), true);
  assert.equal(estReferenceGrise(lireHexa('#B15152')!), false);
  assert.equal(estReferenceGrise(lireHexa('#1E6FD9')!), false);
});

test('estReferenceGrise garde le seuil de 0,05 sur la chroma OKLCH', () => {
  const sous = lireHexa('#7A7F87')!;
  assert.ok(rgb8VersOklch(sous).C < 0.05);
  assert.equal(estReferenceGrise(sous), true);
  const dessus = lireHexa('#7A8FAD')!;
  assert.ok(rgb8VersOklch(dessus).C >= 0.05);
  assert.equal(estReferenceGrise(dessus), false);
});

test('FAMILLES_GRISES nomme les cinq gris de Tailwind', () => {
  assert.deepEqual([...FAMILLES_GRISES], ['slate', 'gray', 'zinc', 'neutral', 'stone']);
});
