// Fige des états sombres de la galerie d'UCM Palettes à 400 px : le DOM rendu, sans script, et la feuille du plugin.
// Les maquettes modifient ces écrans réels au lieu de les redessiner. Préalable : `npm run galerie --workspace ucm-palettes-plugin`.
// Lancer depuis packages/plugin-palettes pour que Playwright se résolve : `node "<chemin>/extraire-galerie.mjs"`.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const galerie = path.resolve(ici, '../../../../../../packages/plugin-palettes/dist/galerie/sombre');
const sortie = path.resolve(ici, '../Maquettes/galerie');
const ETATS = ['harmonisation-paire', 'harmonisation-roue'];

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 400, height: 900 } });
const etats = {};
let feuille = '';
for (const etat of ETATS) {
  await page.goto(pathToFileURL(path.join(galerie, `${etat}.html`)).href);
  // La galerie rejoue les gestes de l'état après le chargement.
  await page.waitForTimeout(2500);
  const lu = await page.evaluate(() => {
    document.querySelectorAll('input').forEach((e) => { e.setAttribute('value', e.value); if (e.checked) e.setAttribute('checked', ''); });
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
writeFileSync(path.join(sortie, 'socle.css'), feuille);
writeFileSync(path.join(sortie, 'etats.js'), `// Généré par Mesures/extraire-galerie.mjs depuis la galerie sombre ; ne pas modifier à la main.\nwindow.GALERIE = ${JSON.stringify(etats)};\n`);
console.log(`socle.css ${Math.round(feuille.length / 1024)} Ko`);
