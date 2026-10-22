/**
 * Chaque état de Nomenclature, rejoué dans Chromium dans le panneau latéral d'Architect : trois thèmes, chaque taille de la galerie. Un état réussit quand son
 * scénario mène la page jusqu'à `data-galerie="pret"` sans erreur inattendue et que la racine ne déborde pas en largeur.
 * `npm run galerie` précède ce test dans `test:ui`.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test, { after, before } from 'node:test';
import { chromium } from 'playwright';

const exiger = createRequire(import.meta.url);
const { GALERIES } = exiger('../../galerie/build-galerie.cjs');
const MODES = ['clair', 'sombre', 'replis'];

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });

for (const galerie of GALERIES.map((candidate) => ({ ...candidate, etats: candidate.etats.filter((etat) => etat.domaine === 'nomenclature') })).filter((candidate) => candidate.etats.length > 0)) {
  for (const mode of MODES) {
    test(`galerie ${galerie.largeur} × ${galerie.hauteur}, thème ${mode} : chaque état atteignable est prêt`, async () => {
      const page = await navigateur.newPage({ viewport: { width: galerie.largeur, height: galerie.hauteur } });
      const echecs = [];
      try {
        for (const etat of galerie.etats.filter((candidat) => candidat.existe)) {
          const erreurs = [];
          const retenir = (erreur) => erreurs.push(erreur.message);
          page.on('pageerror', retenir);
          const cible = path.join(galerie.racine, 'dist', galerie.dossier ?? 'galerie', mode, `${etat.id}.html`);
          try {
            await page.goto(pathToFileURL(cible).href);
            await page.waitForSelector('html[data-galerie="pret"]', { timeout: 10000 });
          } catch (erreur) { erreurs.push(erreur.message); }
          page.off('pageerror', retenir);
          const attendues = new Set(etat.atteinte.filter((etape) => etape.erreurUi).map((etape) => etape.erreurUi));
          const inattendues = erreurs.filter((erreur) => !attendues.has(erreur));
          const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
          if (inattendues.length > 0 || deborde) echecs.push({ etat: etat.id, erreurs: inattendues, deborde });
        }
      } finally { await page.close(); }
      assert.deepEqual(echecs, []);
    });
  }
}
