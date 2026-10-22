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
import { lancerLeNavigateur, ouvrir, envoyer, avecReleve } from './aide.mjs';

const exiger = createRequire(import.meta.url);
const { GALERIES } = exiger('../../galerie/build-galerie.cjs');
const MODES = ['clair', 'sombre', 'replis'];

lancerLeNavigateur();

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

/**
 * Le fichier Intencial de la maquette, la collection Interface choisie et ses Corrections lues : le bilan est la demande 1 de Nomenclature,
 * les quatre lectures de groupes les demandes 2 à 5, et la suite des noms d'écriture la demande 7 (la 6 est la liste des termes).
 * Les demandes de Nomenclature sortent de la liste de `fermer` : ces pages se ferment sans la compter.
 */
async function ouvrirInterface() {
  const { releveIntencial } = exiger('../../galerie/etats/nomenclature.cjs');
  const { messages, renommagesInterface, pagesInterface } = exiger('../../galerie/nomenclature/donnees.cjs');
  const page = await ouvrir();
  await avecReleve(page, releveIntencial());
  await page.locator(`[data-focus='choix:["interface"]']`).click();
  await envoyer(page, messages.initial(true));
  await envoyer(page, messages.bilan(1, renommagesInterface));
  for (const message of pagesInterface({ fonds: 2, survols: 3, ecriture: 4, collection: 5, suiteEcriture: 7 })) await envoyer(page, message);
  return page;
}

const demandesDe = (page, type) => page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);

test('un clic sur un terme vert de la table ouvre sa carte dans Corrections, ciblée', async () => {
  const page = await ouvrirInterface();
  try {
    assert.equal(await page.locator('.carte-ciblee').count(), 0);
    const termes = await page.locator('.table-ligne:nth-child(2) .ch-lien').allTextContents();
    assert.deepEqual(termes, ['background', 'hover']);
    await page.locator('.table-ligne:nth-child(2) .ch-lien').first().click();
    const carte = page.locator('.carte-ciblee');
    assert.equal(await carte.count(), 1);
    assert.equal(await carte.locator('.jeton-retenu').textContent(), 'background');
    assert.equal(await carte.locator('.tete-bouton').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.table-ligne:nth-child(2) .ch-lien.survol').textContent(), 'background');
    assert.equal(await page.locator('#onglet-a-appliquer').getAttribute('aria-selected'), 'true');
    await page.locator('.table-ligne:nth-child(2) .ch-lien').nth(1).click();
    assert.equal(await page.locator('.carte-ciblee .jeton-retenu').textContent(), 'hover');
    assert.equal(await page.locator('.carte-ciblee').count(), 1);
    await page.locator('#onglet-a-trancher').click();
    assert.equal(await page.locator('.carte-ciblee').count(), 0);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('le nom de la table est entier, seul le terme que Corrections change est vert', async () => {
  const page = await ouvrirInterface();
  try {
    const nom = page.locator('.table-ligne:nth-child(1) .nom-de-token');
    assert.equal(await nom.textContent(), 'Button/background/default');
    assert.equal(await nom.locator('.ch-ajout').allTextContents().then((t) => t.join()), 'background');
    const intact = page.locator('.table-ligne:nth-child(3) .nom-de-token');
    assert.equal(await intact.textContent(), 'Button/foreground/default');
    assert.equal(await intact.locator('.ch-ajout').count(), 0);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('Appliquer sous le filtre n’écrit que les noms de la collection affichée, et le pied les compte', async () => {
  const page = await ouvrirInterface();
  try {
    assert.match(await page.locator('.noms-pied .resume').textContent(), /^Appliquer renomme 24 variables et 1 collection de Interface\.$/);
    assert.equal(await page.locator('#onglet-a-appliquer .compte').textContent(), '25');
    await page.locator('.noms-pied .btn-primary').click();
    await page.locator('.feuille-groupe .btn-primary').click();
    await page.waitForTimeout(30);
    const [demande] = await demandesDe(page, 'appliquer');
    assert.deepEqual(demande.selection.groupes, []);
    assert.deepEqual(demande.selection.exclus, []);
    assert.equal(demande.selection.inclus.length, 25);
    assert.ok(demande.selection.inclus.every((id) => id === 'interface' || /^i\d+$/.test(id)));
    assert.equal(new Set(demande.selection.inclus).size, 25);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('sans filtre, Appliquer écrit les groupes cochés du bilan', async () => {
  const page = await ouvrirInterface();
  try {
    await page.locator('.filtre-ligne .puce-x').click();
    assert.match(await page.locator('.noms-pied .resume').textContent(), /^87 noms cochés$/);
    await page.locator('.noms-pied .btn-primary').click();
    await page.locator('.feuille-groupe .btn-primary').click();
    await page.waitForTimeout(30);
    const [demande] = await demandesDe(page, 'appliquer');
    assert.equal(demande.selection.groupes.length, 4);
    assert.deepEqual(demande.selection.inclus, []);
  } finally { await page.context().close(); }
});
