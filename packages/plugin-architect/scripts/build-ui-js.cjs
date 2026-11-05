/**
 * Compile le JavaScript de l'interface en `dist/ui.js`, après celui de son Worker de calcul des noms.
 *
 * L'interface est un seul fichier HTML : le Worker ne peut pas être un second fichier. Son bundle est donc construit d'abord, en mémoire, puis
 * embarqué dans celui de l'interface comme une chaîne (`__SOURCE_DU_WORKER_DE_NOMS__`), que `src/ui/nomenclature/calculDesNoms.ts` lance
 * depuis un `Blob`. Les deux bundles partagent la cible et la minification. `--banner:js=<code>` ajoute une ligne en tête du bundle de l'interface
 * (le build de capture y pose ses drapeaux, voir le README).
 */
const path = require('path');
const { buildSync } = require('esbuild');

const racine = path.resolve(__dirname, '..');
const commun = { bundle: true, format: 'iife', platform: 'browser', target: 'chrome80', minify: true, absWorkingDir: racine };

const banniere = process.argv.slice(2).find((argument) => argument.startsWith('--banner:js='))?.slice('--banner:js='.length);

const travailleur = buildSync({ ...commun, entryPoints: ['src/ui/nomenclature/calculDesNomsWorker.ts'], write: false });
const source = travailleur.outputFiles[0].text;

buildSync({
  ...commun,
  entryPoints: ['src/ui/index.ts'],
  outfile: 'dist/ui.js',
  define: { __SOURCE_DU_WORKER_DE_NOMS__: JSON.stringify(source) },
  ...(banniere ? { banner: { js: banniere } } : {}),
});
console.log(`Created dist/ui.js with a ${source.length}-byte calculation worker`);
