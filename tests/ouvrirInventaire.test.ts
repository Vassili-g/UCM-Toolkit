/**
 * `npm run inventaire` écrit une page générée, sans toucher au fichier commité ni ouvrir le navigateur.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';


test("ecrireLaPage écrit une page HTML au chemin donné", async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'inventaire-'));
  const chemin = path.join(dossier, 'INVENTAIRE-UCM.html');
  try {
    const { ecrireLaPage } = await import('../scripts/ouvrir-inventaire.mjs');
    await ecrireLaPage(chemin);
    assert.ok(fs.readFileSync(chemin, 'utf8').toLowerCase().startsWith('<!doctype html>'));
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});
