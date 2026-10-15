/** Vérifie la maquette dans Chromium quand le navigateur intégré est indisponible. */
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { tmpdir } = require('node:os');

(async () => {
  const navigateur = await chromium.launch({ headless: true });
  const page = await navigateur.newPage({ viewport: { width: 1440, height: 1000 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(pathToFileURL(resolve(__dirname, '../Maquettes/MAQUETTE-MOTEUR.html')).href);
  console.log(JSON.stringify(await page.locator('button, select').evaluateAll(elements => elements.map(e => ({ tag: e.tagName, id: e.id, texte: e.textContent, parent: e.parentElement.id })))));
  const capture = resolve(tmpdir(), 'ucm-review-maquette.png');
  await page.screenshot({ path: capture, fullPage: true });
  console.log(JSON.stringify({ titre: await page.title(), erreurs, capture, lecture1: await page.locator('#lecture1').textContent(), lecture2: await page.locator('#lecture2').textContent() }));
  for (const mode of ['Light', 'Dark']) {
    await page.locator('#theme').getByRole('button', { name: mode, exact: true }).click();
    for (const bouton of await page.locator('#regle button').all()) {
      await bouton.click();
      console.log(JSON.stringify({ mode, regle: await bouton.textContent(), lecture: await page.locator('#lecture1').textContent(), debordement: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }));
    }
  }
  await page.locator('#regle').getByRole('button', { name: 'A, actuelle', exact: true }).click();
  await page.locator('#ex1').selectOption({ label: 'Vert terne #7DB05F' });
  console.log(JSON.stringify({ exemple: 'Vert terne', texte: await page.locator('#scene1 .compte').textContent() }));
  for (const bouton of await page.locator('#bosse button').all()) {
    await bouton.click();
    console.log(JSON.stringify({ bosse: await bouton.textContent(), texte: await page.locator('#lecture2').textContent() }));
  }
  console.log(JSON.stringify({ erreurs }));
  await navigateur.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
