// Fige des états sombres de la galerie d'UCM Palettes : le DOM rendu, sans script, et la feuille du plugin.
// Les maquettes modifient ces écrans réels au lieu de les redessiner. Préalable : `npm run galerie --workspace ucm-palettes-plugin`.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const galerie = path.resolve(ici, '../../../../../../packages/plugin-palettes/dist/galerie/sombre');
const sortie = path.resolve(ici, '../Maquettes/galerie');
const ETATS = [
  'palette-deux-intensites',
  'reglages-reference-modifiee',
  'color-shift-luminosite',
  'configuration-de-la-recette',
  'verification-bilan-a-verifier',
  'gestion-liste',
];

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 480, height: 900 } });
const etats = {};
let feuille = '';
for (const etat of ETATS) {
  await page.goto(pathToFileURL(path.join(galerie, `${etat}.html`)).href);
  await page.waitForTimeout(400);
  const lu = await page.evaluate(() => {
    // Les valeurs saisies ne sont pas des attributs : on les y écrit pour qu'elles survivent au gel.
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
