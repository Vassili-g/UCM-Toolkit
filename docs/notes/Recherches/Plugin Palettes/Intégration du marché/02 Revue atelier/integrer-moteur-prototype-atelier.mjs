/** Embarque le moteur local dans la proposition pour ouvrir le HTML sans serveur. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const racine = fileURLToPath(new URL('../../../../../../', import.meta.url));
const cible = new URL('./REVUE-ET-PROTOTYPE-ATELIER.html', import.meta.url);
const resultat = await build({
  stdin: {
    contents: `export { recetteParDefaut, rampesDe, verifierPromesses, ecrireHexa, lireHexa, contraste, atteintLeSeuil, ancrageDe } from './packages/couleur/src/index.ts';
export { nouvellePalette, changerReference } from './packages/plugin-palettes/src/edition.ts';`,
    resolveDir: racine,
    sourcefile: 'moteur-proposition.ts',
  },
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'UCM',
  minify: true,
  legalComments: 'none',
  target: 'es2020',
});
const html = await readFile(cible, 'utf8');
const marque = /<script id="moteur-ucm">[\s\S]*?<\/script>/;
if (!marque.test(html)) throw new Error('Emplacement du moteur absent.');
const code = resultat.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile(cible, html.replace(marque, () => `<script id="moteur-ucm">${code}</script>`));
console.log('Moteur intégré à REVUE-ET-PROTOTYPE-ATELIER.html.');
