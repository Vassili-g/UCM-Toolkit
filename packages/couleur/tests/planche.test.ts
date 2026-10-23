/** La planche du moteur commitée correspond à ce que le générateur écrit aujourd'hui. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CHEMIN_DE_LA_PLANCHE, genererPlanche } from '../planche/generer-planche';

const sansRetourChariot = (texte: string): string => texte.replace(/\r\n/g, '\n');

test('la planche commitée est à jour', () => {
  const attendue = genererPlanche();
  const commitee = sansRetourChariot(readFileSync(CHEMIN_DE_LA_PLANCHE, 'utf8'));
  assert.ok(
    commitee === attendue,
    "La vue n'est plus à jour. Lancez `npm run vues`.",
  );
});

test('la planche est autonome et tient sous 1 Mo', () => {
  const page = genererPlanche();
  assert.ok(Buffer.byteLength(page) < 1_000_000);
  assert.deepEqual(page.match(/https?:\/\/|src=|<link|@import|url\(/g), null);
});
