// Fige des états sombres de la galerie d'Architect : le DOM rendu, sans script, et la feuille du plugin.
// La maquette de la fiabilisation modifie ces écrans réels au lieu de les redessiner.
// Préalable : `npm run galerie:plugin -- architect`.
// Lancer depuis la racine du dépôt : `node "docs/notes/Recherches/UCM Architect/8 Fiabilisation/Mesures/extraire-galerie.mjs"`.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(ici, '../../../../../../packages/plugin-architect/dist');
const sortie = path.resolve(ici, '../galerie');
// Le mode Tokens vient de la galerie large, le mode Composant de la galerie étroite.
const ETATS = [
  ['galerie', 'a-appliquer'], ['galerie', 'a-trancher'], ['galerie', 't-integrite-a-faire'], ['galerie', 't-structure'], ['galerie', 'regles'],
  ['galerie-etroite', 'x-button-corr'], ['galerie-etroite', 'c-corrections'], ['galerie-etroite', 'c-questions'], ['galerie-etroite', 'c-afaire'],
  ['galerie-etroite', 'e-partiel'], ['galerie-etroite', 'i-perimee'], ['galerie-etroite', 'i-ouvert'], ['galerie-etroite', 'analyse-occupee'],
  ['galerie-etroite', 'analyse-provisoire-partielle'], ['galerie-etroite', 'c-modele'],
];

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 700, height: 900 } });
const etats = {};
let feuille = '';
for (const [dossier, etat] of ETATS) {
  await page.setViewportSize({ width: dossier === 'galerie' ? 700 : 520, height: 900 });
  await page.goto(pathToFileURL(path.join(dist, dossier, 'sombre', `${etat}.html`)).href);
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
  etats[etat] = { corps: lu.corps, classe: lu.classe, largeur: dossier === 'galerie' ? 700 : 520 };
  feuille = lu.feuille;
  console.log(etat, `${Math.round(lu.corps.length / 1024)} Ko`);
}
await navigateur.close();
mkdirSync(sortie, { recursive: true });
writeFileSync(path.join(sortie, 'plugin.css'), feuille);
writeFileSync(path.join(sortie, 'etats.js'), `// Généré par Mesures/extraire-galerie.mjs depuis la galerie sombre ; ne pas modifier à la main.\nwindow.GALERIE = ${JSON.stringify(etats)};\n`);
