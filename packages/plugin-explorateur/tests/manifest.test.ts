/** Le manifest de l'explorateur : aucun domaine, aucun droit privé, pages chargées à la demande. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { domainesOuverts, manifestsAuxDroitsPrives } from 'ucm-plugin-socle/lois/distribution';

const racine = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(racine, 'manifest.json'), 'utf8')) as Record<string, unknown>;

test('le manifest n’ouvre aucun domaine', () => {
  assert.deepEqual(domainesOuverts(racine), ['none']);
});

test('le manifest ne déclare aucun droit réservé à un plugin privé, ni aucune permission', () => {
  assert.deepEqual(manifestsAuxDroitsPrives(racine), []);
  assert.equal('permissions' in manifest, false);
});

test('le manifest charge les pages à la demande, dans Figma seul', () => {
  assert.equal(manifest.documentAccess, 'dynamic-page');
  assert.deepEqual(manifest.editorType, ['figma']);
});

test('le manifest ne reprend l’identifiant d’aucun autre plugin du dépôt', () => {
  const autres = ['plugin-exporter', 'plugin-palettes'].map((dossier) => (JSON.parse(fs.readFileSync(path.join(racine, '..', dossier, 'manifest.json'), 'utf8')) as { id?: string }).id);
  if (typeof manifest.id === 'string') assert.equal(autres.includes(manifest.id), false);
});
