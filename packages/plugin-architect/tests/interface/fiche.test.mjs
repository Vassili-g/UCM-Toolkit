/** Les interactions de la fiche d'une variable : la feuille que le tableau ouvre sur la barre latérale. Écrites au lot U2, lancées par `test:ui`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, avecReleve, fermer, fixtures } from './aide.mjs';

lancerLeNavigateur();
const { cinqCollections } = fixtures;

test('un clic sur le nom ouvre la fiche : le nom en titre, la chaîne d’alias et la valeur au bout', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    assert.equal(await page.locator('.feuille-titre').textContent(), 'button/primary/bg');
    assert.equal(await page.locator('.chaine-alias li:not(.terme)').count(), 5);
    assert.equal(await page.locator('.chaine-alias .terme').textContent(), '#E06666');
    assert.equal(await page.locator('.table-ligne.ligne-choisie').count(), 1);
  } finally { await fermer(page); }
});

test('la croix ferme la fiche et la ligne perd son fond', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    await page.getByRole('button', { name: 'Fermer' }).click();
    await page.locator('.feuille-voile').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.table-ligne.ligne-choisie').count(), 0);
  } finally { await fermer(page); }
});

test('changer de mode affiché garde la variable ouverte et recalcule sa chaîne', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    assert.equal(await page.locator('.chaine-alias .terme').textContent(), '#E06666');
    await page.getByLabel('Mode de brand', { exact: true }).selectOption('marque:Beta');
    assert.equal(await page.locator('.feuille-titre').textContent(), 'button/primary/bg');
    assert.equal(await page.locator('.chaine-alias .terme').textContent(), '#2E9E5B');
  } finally { await fermer(page); }
});

test('« Afficher cette variable dans le tableau des tokens » écrit vise: dans la recherche et ferme la fiche', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator(`[data-focus='choix:["usage"]']`).click();
    await page.locator('[data-focus="nom:usage-surface"]').click();
    await page.getByRole('button', { name: 'Afficher cette variable dans le tableau des tokens' }).click();
    await page.locator('.feuille-voile').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.arbre .recherche').inputValue(), 'vise:surface/primary');
    assert.equal(await page.locator('.arbre .recherche-active').count(), 1);
    assert.equal(await page.locator('.nom-de-token').count(), 1);
    assert.equal(await page.locator('.nom-de-token').textContent(), 'button/primary/bg');
  } finally { await fermer(page); }
});

test('la feuille ne couvre que la barre latérale, à toutes les tailles', async () => {
  for (const [largeur, hauteur] of [[1360, 800], [560, 480]]) {
    const page = await ouvrir({ largeur, hauteur });
    try {
      await avecReleve(page, cinqCollections());
      await page.locator('[data-focus="nom:bouton-fond"]').click();
      const voile = await page.locator('.feuille-voile').boundingBox();
      const laterale = await page.locator('.panneau-lateral').boundingBox();
      const recherche = await page.locator('.arbre .recherche').boundingBox();
      assert.ok(voile.x >= laterale.x - 1 && voile.y >= laterale.y - 1 && voile.x + voile.width <= laterale.x + laterale.width + 1 && voile.y + voile.height <= laterale.y + laterale.height + 1, `${largeur}`);
      assert.ok(recherche.y + recherche.height <= voile.y || recherche.x + recherche.width <= voile.x, `la recherche sous la feuille à ${largeur}`);
    } finally { await fermer(page); }
  }
});
