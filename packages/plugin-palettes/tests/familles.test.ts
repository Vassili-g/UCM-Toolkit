/** Les familles de teinte qui nomment les bouts de la piste de teinte ([UI-38]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { FAMILLES_DE_TEINTE, familleVoisine } from '../src/familles';

test('[UI-38] 257° a pour voisines turquoise et violet', () => {
  assert.equal(familleVoisine(257, -1), 'turquoise');
  assert.equal(familleVoisine(257, 1), 'violet');
});

test('[UI-38] un centre à 10° ou moins de la teinte est sa famille de départ, pas sa voisine', () => {
  assert.equal(familleVoisine(255, 1), 'violet');
  assert.equal(familleVoisine(255, -1), 'turquoise');
  assert.equal(familleVoisine(265, -1), 'turquoise', 'bleu est à 10° exactement');
  assert.equal(familleVoisine(264, -1), 'turquoise');
  assert.equal(familleVoisine(266, -1), 'bleu', 'bleu est à 11°');
});

test('[UI-38] la roue des familles boucle de 360° à 0°', () => {
  assert.equal(familleVoisine(310, 1), 'rose', 'après violet, rose revient à 360°');
  assert.equal(familleVoisine(5, -1), 'violet', 'avant rose, violet est à 65°');
  assert.equal(familleVoisine(350, 1), 'rouge', 'rose est à 10°, rouge à 39°');
});

test('[UI-38] les huit familles sont rangées par centre croissant', () => {
  const centres = FAMILLES_DE_TEINTE.map(({ centre }) => centre);
  assert.deepEqual(centres, [...centres].sort((a, b) => a - b));
  assert.equal(FAMILLES_DE_TEINTE.length, 8);
});
