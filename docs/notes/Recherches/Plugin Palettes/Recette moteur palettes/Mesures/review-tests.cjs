/** Rejoue les assertions des tests purs avec les défauts actuels puis K65, compilés en mémoire. */
const { build } = require('esbuild');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { pathToFileURL } = require('node:url');
const racine = resolve(__dirname, '../../../../../..');
const fichiers = ['packages/couleur/tests/recette.test.ts', 'packages/couleur/tests/enveloppe.test.ts', 'packages/plugin-palettes/tests/configuration.test.ts'];

(async () => {
  const resultat = [];
  for (const variante of ['A', 'K65']) for (const fichier of fichiers) {
    const tests = [];
    const sortie = await build({
      entryPoints: [resolve(racine, fichier)], bundle: true, write: false, platform: 'node', format: 'cjs',
      plugins: [{ name: 'defauts-en-memoire', setup(b) {
        b.onLoad({ filter: /\.[cm]?[jt]s$/ }, ({ path }) => {
          let contents = readFileSync(path, 'utf8').replaceAll('import.meta.url', JSON.stringify(pathToFileURL(path).href));
          if (variante === 'K65' && path.replaceAll('\\', '/').endsWith('/couleur/src/recette.ts')) {
            contents = contents.replace('part: 0.85,', 'part: 0.6175,').replace('enveloppe: { p0: 0.85, light: { a: 0.6, b: 0.38, jaunes: 1 }, dark: { a: 1.1, b: 0.38, jaunes: 0 } }', 'enveloppe: { p0: 0.6175, light: { a: 1.1, b: 0.48, jaunes: 0.5 }, dark: { a: 1.1, b: 0.3, jaunes: 0 } }');
          }
          return { contents, loader: path.endsWith('.ts') ? 'ts' : 'js', resolveDir: dirname(path) };
        });
      } }],
    });
    const enregistrer = (nom, fn) => { if (typeof fn !== 'function') throw Error('Forme de test non prise en charge'); tests.push({ nom, fn }); };
    enregistrer.test = enregistrer;
    const charger = id => id === 'node:test' ? enregistrer : require(id);
    new Function('require', 'module', 'exports', '__dirname', '__filename', sortie.outputFiles[0].text)(charger, { exports: {} }, {}, dirname(resolve(racine, fichier)), resolve(racine, fichier));
    const echecs = [];
    for (const t of tests) {
      try { await t.fn(); } catch (e) { echecs.push({ nom: t.nom, erreur: e.message.slice(0, 700) }); }
    }
    resultat.push({ variante, fichier, tests: tests.length, echecs });
  }
  writeFileSync(resolve(__dirname, 'REVIEW-CODEX-TESTS.json'), JSON.stringify(resultat, null, 2) + '\n');
  console.log(JSON.stringify(resultat.map(r => ({ ...r, echecs: r.echecs.map(e => e.nom) })), null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
