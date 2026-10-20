import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '../../../../../..');
const require = createRequire(import.meta.url);
const { GALERIES } = require(path.join(racine, 'packages/plugin-nomenclature/galerie/build-galerie.cjs'));
const candidats = [process.env.UCM_CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
const executablePath = candidats.find((candidat) => fs.existsSync(candidat));
const navigateur = await chromium.launch(executablePath ? { executablePath } : {});
const resultats = [];
const travaux = GALERIES.flatMap((galerie) => ['clair', 'sombre', 'replis'].flatMap((mode) =>
  galerie.etats.filter((etat) => etat.existe).map((etat) => ({ galerie, mode, etat }))));
let prochain = 0;
try {
  await Promise.all(Array.from({ length: 4 }, async () => {
    const page = await navigateur.newPage();
    for (;;) {
      const travail = travaux[prochain++];
      if (!travail) break;
      const { galerie, mode, etat } = travail;
      const erreurs = [];
      const retenir = (erreur) => erreurs.push(erreur.message);
      page.on('pageerror', retenir);
      await page.setViewportSize({ width: galerie.largeur, height: galerie.hauteur });
      const cible = path.join(galerie.racine, 'dist', galerie.dossier ?? 'galerie', mode, `${etat.id}.html`);
      let pret = true;
      try {
        await page.goto(pathToFileURL(cible).href);
        await page.waitForSelector('html[data-galerie="pret"]', { timeout: 10000 });
      } catch (erreur) { pret = false; erreurs.push(erreur.message); }
      const geometrie = await page.evaluate(() => ({
        largeur: document.documentElement.clientWidth,
        contenu: document.documentElement.scrollWidth,
        titre: document.title,
      }));
      const attendues = etat.atteinte.filter((etape) => etape.erreurUi).map((etape) => etape.erreurUi);
      const inattendues = erreurs.filter((erreur) => !attendues.includes(erreur));
      resultats.push({ etat: etat.id, mode, largeur: galerie.largeur, hauteur: galerie.hauteur,
        pret, erreurs: inattendues, debordement: geometrie.contenu > geometrie.largeur });
      page.off('pageerror', retenir);
    }
    await page.close();
  }));
} finally { await navigateur.close(); }
resultats.sort((a, b) => a.largeur - b.largeur || a.mode.localeCompare(b.mode) || a.etat.localeCompare(b.etat));
fs.writeFileSync(path.join(ici, 'galerie-resultats.json'), JSON.stringify(resultats, null, 2) + '\n');
const echecs = resultats.filter((r) => !r.pret || r.erreurs.length > 0);
const debordements = resultats.filter((r) => r.debordement);
console.log(JSON.stringify({ pages: resultats.length, echecs, debordements }, null, 2));
assert.equal(echecs.length, 0);
