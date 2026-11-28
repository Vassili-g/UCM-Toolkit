/**
 * `npm run banc:pieces` : le script écrit son rapport (texte et JSON) dans le dossier qu'on lui donne et rend les comptes du banc.
 * Le tirage de 200 composants du banc lui-même est dans `packages/plugin-exporter/tests/bancDesPieces.test.ts`.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { executerLeBanc, GRAINE_DU_BANC, NOMBRE_DU_BANC } from '../scripts/banc-pieces';

test('le script lance le banc sur un petit nombre de tirages et écrit son rapport', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'banc-pieces-'));
  try {
    const { resultat, texte } = await executerLeBanc(['--graine', '7', '--nombre', '12'], dossier);
    assert.equal(resultat.graine, 7);
    assert.equal(resultat.nombre, 12);
    assert.equal(resultat.juges + resultat.attenduEn15.length, 12);
    assert.equal(resultat.enEcart.length, 0);
    assert.equal(readFileSync(join(dossier, 'rapport.txt'), 'utf8'), texte);
    assert.equal(JSON.parse(readFileSync(join(dossier, 'rapport.json'), 'utf8')).nombre, 12);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
  assert.ok(!existsSync(dossier));
});

test('les valeurs par défaut sont la graine 1729 et 5 200 tirages', () => {
  assert.equal(GRAINE_DU_BANC, 1729);
  assert.equal(NOMBRE_DU_BANC, 5200);
});
