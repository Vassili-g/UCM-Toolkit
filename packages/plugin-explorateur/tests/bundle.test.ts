/**
 * Les deux bundles, sandbox et interface, ne tirent aucune dépendance Node :
 * ni `node:fs`, ni `ajv`, ni la porte `@ucm-kit/core/lecteurs`. Le test les
 * construit en mémoire, comme le build.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildSync } from 'esbuild';

const racine = path.resolve(__dirname, '..');

function construire(entree: string): string {
  const resultat = buildSync({ entryPoints: [path.join(racine, entree)], bundle: true, write: false, platform: 'browser', target: 'chrome80', format: 'iife', logLevel: 'silent' });
  return resultat.outputFiles[0].text;
}

for (const entree of ['src/code.ts', 'src/ui/index.ts']) {
  test(`le bundle de ${entree} ne tire aucune dépendance Node`, () => {
    const texte = construire(entree);
    for (const interdit of ['node:fs', 'require("fs")', 'readFileSync', 'new Ajv', 'ajv']) assert.equal(texte.includes(interdit), false, `${interdit} présent`);
  });
}

test('aucune source n’importe la porte Node du kit', () => {
  const fichiers = (dossier: string): string[] => fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    return entree.isDirectory() ? fichiers(chemin) : chemin.endsWith('.ts') ? [chemin] : [];
  });
  const fautes = fichiers(path.join(racine, 'src')).filter((fichier) => /from '@ucm-kit\/core\/lecteurs'/.test(fs.readFileSync(fichier, 'utf8')));
  assert.deepEqual(fautes, []);
});
