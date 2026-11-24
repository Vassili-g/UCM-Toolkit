/** L'écran de destination nomme la collection neuve d'après le référentiel, sans second littéral. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { DESTINATION_DES_PALETTES } from '@ucm-kit/core/referentiel';

test('[U2] la destination neuve de Palettes porte DESTINATION_DES_PALETTES.collection', () => {
  const source = readFileSync(new URL('../src/ui/destination.ts', import.meta.url), 'utf8');
  assert.match(source, /: DESTINATION_DES_PALETTES\.collection;/);
  assert.doesNotMatch(source, new RegExp(`'${DESTINATION_DES_PALETTES.collection}'`));
});
