/**
 * Lance les fichiers de test du dossier `tests/` d'un paquet.
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

/**
 * Les fichiers de `racine/tests/` dont le nom finit par l'une des `extensions`,
 * directement sous `tests/` : `tests/interface/` et `tests/cascade/` ont leur
 * propre lanceur et ne sont pas parcourus.
 */
function decouvrirLesTests(racine, extensions) {
  return fs
    .readdirSync(path.join(racine, 'tests'), { withFileTypes: true })
    .filter((entree) => entree.isFile() && extensions.some((extension) => entree.name.endsWith(extension)))
    .map((entree) => path.join('tests', entree.name))
    .sort();
}

/**
 * Lance `racine/tests/*` dont le nom finit par l'une des `extensions`, et sort
 * du processus avec le code de `tsx --test`. Un dossier sans test sort en
 * échec : un test qu'on n'exécute pas ne peut pas rougir.
 */
function lancerLesTests({ racine, extensions, nom }) {
  const files = decouvrirLesTests(racine, extensions);

  if (files.length === 0) {
    console.error(`Aucun fichier de test trouvé dans tests/ (${nom}).`);
    process.exit(1);
  }

  const result = spawnSync('npx', ['tsx', '--test', ...files], {
    cwd: racine,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  process.exit(result.status ?? 1);
}

module.exports = { lancerLesTests, decouvrirLesTests };

if (require.main === module) {
  lancerLesTests({ racine: path.resolve(__dirname, '..'), extensions: ['.test.ts', '.test.mjs'], nom: 'le socle' });
}
