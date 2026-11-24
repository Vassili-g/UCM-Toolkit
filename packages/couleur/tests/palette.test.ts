/** Une palette est colorée dès que la chroma OKLCH de sa référence atteint 0,05 : un seul prédicat, le contraire d'`estReferenceGrise`. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { estColoree, estReferenceGrise, lireHexa, rgb8VersOklch } from '../src/index';

test('[U1] une référence de chroma 0,05 est colorée, une de chroma 0,0499 est grise', () => {
  const grise = lireHexa('#7A7F87')!;
  assert.ok(rgb8VersOklch(grise).C < 0.05);
  assert.equal(estColoree(grise), false);
  const coloree = lireHexa('#7A8FAD')!;
  assert.ok(rgb8VersOklch(coloree).C >= 0.05);
  assert.equal(estColoree(coloree), true);
  for (const hexa of ['#808080', '#6B7280', '#1E6FD9']) {
    assert.equal(estColoree(lireHexa(hexa)!), !estReferenceGrise(lireHexa(hexa)!), hexa);
  }
});
