// Fige des états sombres de la galerie large d'Architect (mode Tokens) : le DOM rendu, sans script, et la feuille du plugin.
// La maquette de l'intégrité de la structure modifie ces écrans réels au lieu de les redessiner.
// Préalable : `npm run galerie:plugin -- architect`.
// Lancer depuis la racine du dépôt : `node "docs/notes/Recherches/UCM Architect/8 Intégrité de la structure/Mesures/extraire-galerie.mjs"`.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const paquets = path.resolve(ici, '../../../../../../packages');
const sortie = path.resolve(ici, '../galerie');
const dossier = path.join(paquets, 'plugin-architect/dist/galerie/sombre');
const ETATS = ['t-portees', 't-structure'];

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1360, height: 800 } });
const etats = {};
let feuille = '';
for (const etat of ETATS) {
  await page.goto(pathToFileURL(path.join(dossier, `${etat}.html`)).href);
  try {
    await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret', null, { timeout: 15000 });
  } catch {
    console.log(`${etat} : la galerie n'a pas signalé « pret », état figé tel quel`);
  }
  await page.waitForTimeout(400);
  const lu = await page.evaluate(() => {
    document.querySelectorAll('input').forEach((e) => {
      e.setAttribute('value', e.value);
      if (e.checked) e.setAttribute('checked', '');
    });
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
writeFileSync(path.join(sortie, 'etats.js'), `// Généré par Mesures/extraire-galerie.mjs depuis la galerie large sombre ; ne pas modifier à la main.\nwindow.GALERIE = ${JSON.stringify(etats)};\n`);
