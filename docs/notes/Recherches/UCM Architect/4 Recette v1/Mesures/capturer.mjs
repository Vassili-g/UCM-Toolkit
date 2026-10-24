// Capture une page entière, ou un seul élément par son sélecteur, et rend les erreurs de la console.
// `node capturer.mjs <page.html> <sortie.png> [sélecteur] [largeur] [échelle]`, depuis la racine du dépôt.
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [,, fichier, sortie, selecteur = '', largeur = '1500', echelle = '1'] = process.argv;
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: Number(largeur), height: 900 }, deviceScaleFactor: Number(echelle) });
page.on('console', (message) => { if (['warning', 'error'].includes(message.type())) console.log('console :', message.text()); });
page.on('pageerror', (erreur) => console.log('erreur :', erreur.message));
await page.goto(pathToFileURL(path.resolve(fichier)).href);
await page.waitForTimeout(1500);
if (selecteur) await page.locator(selecteur).screenshot({ path: sortie });
else await page.screenshot({ path: sortie, fullPage: true });
await navigateur.close();
