// Fige des états sombres de la galerie d'UCM Nomenclature : le DOM rendu, sans script, et la feuille du plugin.
// Les maquettes modifient ces écrans réels au lieu de les redessiner.
// Préalable : `npm run galerie -w ucm-nomenclature-plugin`. Lancer depuis la racine du dépôt :
// `node "docs/notes/Recherches/Plugin Architect/5 Recette/Mesures/extraire-galerie.mjs"`.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const galerie = path.resolve(ici, '../../../../../../packages/plugin-nomenclature/dist/galerie/sombre');
const sortie = path.resolve(ici, '../Maquettes/galerie');
const ETATS = [
  'a-appliquer-depliee',
  'a-trancher',
  'regles',
  'feuille-terme-ucm',
  'feuille-terme-personnalise',
];

const navigateur = await chromium.launch();
// La taille par défaut de la fenêtre du plugin (galerie/build-galerie.cjs).
const page = await navigateur.newPage({ viewport: { width: 640, height: 720 } });
// Hors de Figma, `parent` est la fenêtre elle-même : l'écran reçoit ses propres demandes `termes`, `fiche` et `lignes`
// comme des réponses, sans leur liste, et plante. On arrête ces échos avant l'écran (voir R0 du dossier).
await page.addInitScript(() => {
  window.addEventListener('message', (evenement) => {
    const message = evenement.data?.pluginMessage;
    const echo = message && ((message.type === 'termes' && !('termes' in message))
      || (message.type === 'fiche' && !('fiche' in message))
      || (message.type === 'lignes' && !('lignes' in message)));
    if (echo) evenement.stopImmediatePropagation();
  }, true);
});
const etats = {};
let feuille = '';
for (const etat of ETATS) {
  await page.goto(pathToFileURL(path.join(galerie, `${etat}.html`)).href);
  // Le pilote de la galerie pose `data-galerie="pret"` quand le scénario est joué jusqu'au bout.
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret', null, { timeout: 15000 });
  await page.waitForTimeout(300);
  const lu = await page.evaluate(() => {
    // Les valeurs saisies ne sont pas des attributs : on les y écrit pour qu'elles survivent au gel.
    document.querySelectorAll('input').forEach((e) => {
      e.setAttribute('value', e.value);
      if (e.checked) e.setAttribute('checked', '');
      if (e.indeterminate) e.setAttribute('data-indetermine', '');
    });
    document.querySelectorAll('select').forEach((s) => [...s.options].forEach((o) => { if (o.selected) o.setAttribute('selected', ''); }));
    document.querySelectorAll('script, .largeur-fenetre, .resize-grip, [hidden]').forEach((e) => e.remove());
    return { corps: document.body.innerHTML, feuille: [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'), classe: document.documentElement.className };
  });
  etats[etat] = { corps: lu.corps, classe: lu.classe };
  feuille = lu.feuille;
  console.log(etat, `${Math.round(lu.corps.length / 1024)} Ko`);
}
await navigateur.close();
mkdirSync(sortie, { recursive: true });
writeFileSync(path.join(sortie, 'plugin.css'), feuille);
writeFileSync(path.join(sortie, 'etats.js'), `// Généré par Mesures/extraire-galerie.mjs depuis la galerie sombre ; ne pas modifier à la main.\nwindow.GALERIE = ${JSON.stringify(etats)};\n`);
console.log(`plugin.css ${Math.round(feuille.length / 1024)} Ko`);
