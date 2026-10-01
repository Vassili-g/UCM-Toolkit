/**
 * Mesure le noyau et le rendu sur un relevé de 10 000 variables : vingt
 * collections, quatre modes, groupes profonds et chaînes partagées. Chaque
 * phase tourne dix fois après un échauffement ; la médiane et le maximum
 * s'impriment. Ce sont des mesures de travail, hors des tests : aucun seuil
 * n'arrête la CI.
 *
 *   npm run mesure --workspace ucm-explorateur-plugin
 *
 * Le rendu se mesure dans Chromium sur `dist/ui.html` ; sans build ni
 * navigateur, seule la mesure du noyau s'imprime.
 */
import { buildSync } from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exiger = createRequire(import.meta.url);
const sortie = path.join(racine, 'dist', 'mesure-noyau.cjs');
buildSync({
  stdin: {
    contents: `export * from './tests/fixtures'; export * from './src/indexation'; export * from './src/resolution'; export * from './src/diagnostics'; export * from './src/groupes';`,
    resolveDir: racine,
    loader: 'ts',
  },
  outfile: sortie,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  logLevel: 'silent',
});
const noyau = exiger(sortie);

const REPETITIONS = 10;

function mesurer(nom, fabrique) {
  fabrique();
  const durees = [];
  for (let rang = 0; rang < REPETITIONS; rang += 1) {
    const debut = performance.now();
    fabrique();
    durees.push(performance.now() - debut);
  }
  durees.sort((a, b) => a - b);
  const mediane = (durees[4] + durees[5]) / 2;
  console.log(`${nom.padEnd(42)} médiane ${mediane.toFixed(1).padStart(7)} ms   max ${durees[durees.length - 1].toFixed(1).padStart(7)} ms`);
  return mediane;
}

const releve = noyau.grandReleve(20, 500, 4);
console.log(`Relevé : ${releve.variables.length} variables, ${releve.collections.length} collections, 4 modes\n`);

/** Le tas après un ramasse-miettes forcé, quand Node l'expose (`--expose-gc`). */
const tas = () => {
  globalThis.gc?.();
  return process.memoryUsage().heapUsed;
};
const avant = tas();
const index = noyau.indexer(releve);
mesurer('indexation', () => noyau.indexer(releve));
mesurer('arbres des groupes', () => releve.collections.map((collection) => noyau.arbreDeCollection(collection, index.variables)));
mesurer('résolution froide (10 000 variables)', () => {
  const resolveur = noyau.creerResolveur(index);
  for (const variable of releve.variables) resolveur.resoudre(variable.id, {});
});
const resolveur = noyau.creerResolveur(index);
for (const variable of releve.variables) resolveur.resoudre(variable.id, {});
mesurer('résolution mémorisée (10 000 variables)', () => {
  for (const variable of releve.variables) resolveur.resoudre(variable.id, {});
});
mesurer('recherche globale, noms et valeurs', () => {
  const terme = 'token-499';
  return releve.variables.filter((variable) => {
    const resultat = resolveur.resoudre(variable.id, {});
    const valeur = resultat.statut === 'resolu' && resultat.valeur.nature === 'couleur' ? `${resultat.valeur.couleur.r}` : '';
    return `${variable.nom}\n${valeur}`.toLowerCase().includes(terme);
  });
});
mesurer('diagnostics (40 000 résolutions)', () => noyau.diagnostiquer(noyau.creerResolveur(index), {}));
console.log(`\nmémoire retenue par l'index et un résolveur rempli : ${((tas() - avant) / 1024 / 1024).toFixed(1)} Mo${globalThis.gc ? '' : ' (sans ramasse-miettes forcé, surestimée)'}`);

const ui = path.join(racine, 'dist', 'ui.html');
let chromium;
try {
  ({ chromium } = exiger('playwright'));
} catch {
  chromium = null;
}
if (!existsSync(ui) || !chromium) {
  console.log('\nRendu non mesuré : lancer npm run build:ui et installer Chromium par npx playwright install chromium.');
} else {
  const navigateur = await chromium.launch();
  const durees = [];
  for (let rang = 0; rang <= REPETITIONS; rang += 1) {
    const page = await navigateur.newPage({ viewport: { width: 1200, height: 800 } });
    await page.setContent(readFileSync(ui, 'utf8'));
    const duree = await page.evaluate((donnees) => new Promise((resolve) => {
      const debut = performance.now();
      window.postMessage({ pluginMessage: { type: 'releve', demande: 1, releve: donnees } }, '*');
      const attendre = () => (document.querySelector('.table-ligne') ? resolve(performance.now() - debut) : requestAnimationFrame(attendre));
      attendre();
    }), releve);
    const lignes = await page.locator('.table-ligne').count();
    if (rang > 0) durees.push(duree);
    if (rang === REPETITIONS) console.log(`\nlignes de table présentes dans le DOM : ${lignes}`);
    await page.close();
  }
  await navigateur.close();
  durees.sort((a, b) => a - b);
  console.log(`premier rendu de la table (Chromium)          médiane ${((durees[4] + durees[5]) / 2).toFixed(1).padStart(7)} ms   max ${durees[durees.length - 1].toFixed(1).padStart(7)} ms`);
}
