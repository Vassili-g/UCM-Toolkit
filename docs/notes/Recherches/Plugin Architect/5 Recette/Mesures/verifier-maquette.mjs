// Contrôle la maquette sans la capturer : erreurs de script, feuilles chargées, débordements, hauteurs des cartes.
// `node "docs/notes/Recherches/Plugin Architect/5 Recette/Mesures/verifier-maquette.mjs"`
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const maquette = path.resolve(ici, '../Maquettes/MAQUETTE-RECETTE-ARCHITECT.html');
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1400, height: 900 } });
const erreurs = [];
page.on('pageerror', (erreur) => erreurs.push(erreur.message));
page.on('console', (message) => { if (message.type() === 'error') erreurs.push(message.text()); });
await page.goto(pathToFileURL(maquette).href);
await page.waitForTimeout(1500);
// Le tour 1 est replié : on l'ouvre pour le mesurer aussi.
await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
await page.waitForTimeout(500);

const cadres = await page.evaluate(() => [...document.querySelectorAll('.cadre')].map((hote) => {
  const iframe = hote.querySelector('iframe');
  const doc = iframe?.contentDocument;
  if (!doc) return { id: hote.id, vide: true };
  const racine = doc.documentElement;
  const debordent = [...doc.querySelectorAll('body *')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.right > racine.clientWidth + 0.5;
  }).slice(0, 4).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} → ${Math.round(e.getBoundingClientRect().right)}`);
  const retire = doc.querySelector('.jeton-retire, .seg-retire');
  const cartes = [...doc.querySelectorAll('.carte.question')].map((c) => Math.round(c.getBoundingClientRect().height));
  return {
    id: hote.id,
    largeur: racine.clientWidth,
    hauteurContenu: racine.scrollHeight,
    debordement: racine.scrollWidth > racine.clientWidth,
    debordent,
    couleurRetire: retire ? getComputedStyle(retire).backgroundColor : null,
    policeCorps: getComputedStyle(doc.body).fontSize,
    cartes,
    boutonsBleus: [...doc.querySelectorAll('.btn-primary')].length,
  };
}));
await navigateur.close();
console.log(JSON.stringify({ erreurs, cadres }, null, 1));
