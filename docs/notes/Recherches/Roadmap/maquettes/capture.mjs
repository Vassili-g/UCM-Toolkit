// Capture d'une page locale à 1400 px : node capture.mjs <fichier.html> <sortie.png> [sélecteur] [script avant capture]
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , fichier, sortie, selecteur, action] = process.argv;
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1400, height: 900 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(pathToFileURL(path.resolve(fichier)).href);
if (action) await page.evaluate(action);
await page.waitForTimeout(400);
const el = selecteur ? await page.$(selecteur) : null;
if (el) await el.screenshot({ path: sortie });
else await page.screenshot({ path: sortie, fullPage: true });
const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
console.log('ok', sortie, 'scrollWidth=' + largeur, erreurs.length ? 'ERREURS: ' + erreurs.join(' | ') : 'sans erreur');
await navigateur.close();
