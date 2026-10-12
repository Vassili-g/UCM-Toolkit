// Capture une maquette : fichier, image de sortie, puis des sélecteurs à cliquer (`sélecteur@rang`). ANCRE limite la capture à un élément, LARGEUR fixe la largeur de la fenêtre, ATTENTE le délai avant la capture.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const [fichier, sortie, ...clics] = process.argv.slice(2);
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: Number(process.env.LARGEUR || 1440), height: 900 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(pathToFileURL(fichier).href);
for (const c of clics) { const [sel, idx] = c.split('@'); await page.locator(sel).nth(Number(idx || 0)).click(); }
await page.waitForTimeout(Number(process.env.ATTENTE || 300));
const ancre = process.env.ANCRE;
if (ancre) await page.locator(ancre).screenshot({ path: sortie });
else await page.screenshot({ path: sortie, fullPage: true });
console.log(erreurs.length ? erreurs.join('\n') : 'aucune erreur');
await navigateur.close();
