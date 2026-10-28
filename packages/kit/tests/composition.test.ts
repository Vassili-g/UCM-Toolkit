import assert from 'node:assert/strict';
import test from 'node:test';
import { sorteDeLImbrique } from '../src/referentiel/index.js';

test('un wrapper préfixé qui porte des dimensions liées est un wrapper de dimensions', () => {
  assert.equal(sorteDeLImbrique({ nom: '.sizeWrapperButton', reglesTrouvees: false, dimensionsLiees: 3 }), 'wrapper-de-dimensions');
});

test('une pièce préfixée sans règles ni dimensions est une pièce interne', () => {
  assert.equal(sorteDeLImbrique({ nom: '.Ring', reglesTrouvees: false, dimensionsLiees: 0 }), 'piece-interne');
  assert.equal(sorteDeLImbrique({ nom: '_Ring', reglesTrouvees: false, dimensionsLiees: 0 }), 'piece-interne');
});

test('un set nommé par un .componentRules est une dépendance, même préfixé', () => {
  assert.equal(sorteDeLImbrique({ nom: 'Icon', reglesTrouvees: true, dimensionsLiees: 0 }), 'dependance');
  assert.equal(sorteDeLImbrique({ nom: '.Icon', reglesTrouvees: true, dimensionsLiees: 2 }), 'dependance');
});

test('un imbriqué sans préfixe ni règles ni dimensions est un détail', () => {
  assert.equal(sorteDeLImbrique({ nom: 'Content', reglesTrouvees: false, dimensionsLiees: 0 }), 'detail');
});

test('des dimensions liées font un wrapper même sans préfixe', () => {
  assert.equal(sorteDeLImbrique({ nom: 'sizeWrapper', reglesTrouvees: false, dimensionsLiees: 1 }), 'wrapper-de-dimensions');
});
