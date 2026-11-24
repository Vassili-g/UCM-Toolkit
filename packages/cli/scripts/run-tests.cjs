/**
 * Lance tous les fichiers de test du dossier `tests/`.
 *
 * Deux extensions cohabitent, et c'est la coupure du paquet qui l'impose : le
 * format est du TypeScript compilé vers `dist/`, ses tests sont en `.test.ts` ;
 * les lecteurs se publient en JavaScript tel quel, leurs tests sont en
 * `.test.mjs`. `tsx` exécute les deux.
 *
 * Pourquoi ce script plutôt qu'une liste dans package.json : une liste écrite
 * à la main laisse un nouveau fichier de test hors du lot, silencieusement et
 * jusqu'en CI. Et pourquoi pas un glob passé à `tsx --test` : `node --test` ne
 * développe les motifs qu'à partir de Node 22, or la CI et les postes de
 * développement ne sont pas forcément sur la même version. Lire le dossier
 * fonctionne partout.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const testsDir = path.join(rootDir, 'tests');

const files = fs
  .readdirSync(testsDir, { withFileTypes: true })
  .filter((entree) => entree.isFile() && (entree.name.endsWith('.test.ts') || entree.name.endsWith('.test.mjs')))
  .map((entree) => path.join('tests', entree.name))
  .sort();

if (files.length === 0) {
  console.error('Aucun fichier de test trouvé dans tests/ (@ucm-kit/cli).');
  process.exit(1);
}

const result = spawnSync('npx', ['tsx', '--test', ...files], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
