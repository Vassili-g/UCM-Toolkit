/** Les interactions de la recherche dans l'arbre : le texte, `terme:` et `vise:`, et l'arbre qui ne liste que les collections trouvées. Écrites au lot U2, lancées par `test:ui`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, avecReleve, fermer, fixtures } from './aide.mjs';

lancerLeNavigateur();
const { cinqCollections, projetLibre } = fixtures;

test('une recherche tapée liste les collections qui ont un résultat, avec leur nombre', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator('.arbre .recherche').fill('surface');
    assert.equal(await page.locator('.table-titre').textContent(), 'Recherche');
    assert.equal(await page.locator('.emplacement').textContent(), 'Toutes les collections');
    const lignes = await page.locator('.arbre-ligne').allTextContents();
    assert.ok(lignes.length >= 1 && lignes.every((ligne) => /\d$/.test(ligne)));
    assert.equal(await page.locator('.arbre .recherche-active').count(), 0);
  } finally { await fermer(page); }
});

test('terme: cherche le terme et ses formes dans les segments des noms, et la note les énumère', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('.arbre .recherche').fill('terme:background');
    assert.equal(await page.locator('.nom-de-token').count(), 1);
    assert.equal(await page.locator('.nom-de-token').textContent(), 'button/primary/bg');
    assert.equal(await page.locator('.table-tete .note').textContent(), '1 variable : background, bg');
    assert.equal(await page.locator('.nom-de-token .ch-variable-vu').textContent(), 'bg');
  } finally { await fermer(page); }
});

test('vise: montre les variables qui visent directement la variable nommée', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('.arbre .recherche').fill('vise:surface/primary');
    assert.equal(await page.locator('.nom-de-token').count(), 1);
    assert.equal(await page.locator('.nom-de-token').textContent(), 'button/primary/bg');
    await page.locator('.arbre .recherche').fill('vise:inconnue');
    assert.equal(await page.locator('.nom-de-token').count(), 0);
  } finally { await fermer(page); }
});

test('Échap vide la recherche et l’arbre retrouve toutes ses collections', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    const avant = await page.locator('.arbre-ligne').count();
    await page.locator('.arbre .recherche').fill('terme:background');
    await page.locator('.arbre .recherche').press('Escape');
    assert.equal(await page.locator('.arbre .recherche').inputValue(), '');
    assert.equal(await page.locator('.arbre-ligne').count(), avant);
  } finally { await fermer(page); }
});
