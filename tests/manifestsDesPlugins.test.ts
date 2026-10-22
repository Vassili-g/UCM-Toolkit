/**
 * Figma reconnaît un plugin de développement par l'`id` de son manifest : deux
 * plugins du dépôt qui partagent un `id`, ou qui n'en ont pas, s'ouvrent l'un à
 * la place de l'autre. L'`id` s'obtient sans publier, par `Plugins >
 * Development > New plugin…`, puis se recopie dans `manifest.json`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paquets = path.join(racine, 'packages');

/** Les plugins dont le dossier porte un `manifest.json`, avec leur `id` éventuel. */
const plugins = fs.readdirSync(paquets)
  .filter((dossier) => fs.existsSync(path.join(paquets, dossier, 'manifest.json')))
  .map((dossier) => ({
    dossier,
    id: (JSON.parse(fs.readFileSync(path.join(paquets, dossier, 'manifest.json'), 'utf8')) as { id?: string }).id,
  }));

test('deux plugins du dépôt ne partagent jamais un id de manifest', () => {
  const vus = new Map<string, string>();
  const doublons: string[] = [];
  for (const { dossier, id } of plugins) {
    if (typeof id !== 'string') continue;
    const autre = vus.get(id);
    if (autre) doublons.push(`${autre} et ${dossier} : ${id}`);
    vus.set(id, dossier);
  }
  assert.deepEqual(doublons, []);
});

test('le dépôt compte au moins trois plugins à manifest', () => {
  assert.ok(plugins.length >= 3, plugins.map(({ dossier }) => dossier).join(', '));
});
