/** Les interactions des onglets Intégrations et Relevés, que l’étape 3 du lot A1 retire avec leurs vues. Sautés : l’inspecteur qu’ils lisent n’existe plus. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, avecReleve, fermer, fixtures } from './aide.mjs';

lancerLeNavigateur();
const { projetLibre } = fixtures;

test('importer un tokens.json ajoute la correspondance ; le retirer rend l’inspecteur du socle', { skip: 'l’onglet est retiré à l’étape 3 du lot A1 ; l’inspecteur a cédé sa place à Nomenclature' }, async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator('[data-focus="nom:carte-fond"]').click();
    const avant = await page.locator('.inspecteur').textContent();
    await page.locator('#onglet-integrations').click();
    const tokens = JSON.stringify({ $extensions: { 'com.ucm.formatVersion': 2 }, interface: { card: { fill: { $value: '{couleurs.surface}', $type: 'color' } } } });
    await page.locator('.champ-fichier').first().setInputFiles({ name: 'tokens.json', mimeType: 'application/json', buffer: Buffer.from(tokens) });
    await page.getByText('Correspond à {interface.card.fill}').waitFor();
    await page.getByRole('button', { name: 'Retirer tokens.json' }).click();
    assert.equal(await page.locator('.inspecteur').textContent(), avant);
    await page.locator('.champ-fichier').first().setInputFiles({ name: 'casse.json', mimeType: 'application/json', buffer: Buffer.from('{ casse') });
    await page.getByText('casse.json refusé : le JSON est illisible').waitFor();
  } finally { await fermer(page); }
});

test('une simulation s’annonce, ne demande aucune écriture, et Réinitialiser rend le relevé d’origine', { skip: 'l’onglet est retiré à l’étape 3 du lot A1 ; l’inspecteur a cédé sa place à Nomenclature' }, async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator(`[data-focus='choix:["couleurs"]']`).click();
    await page.locator('[data-focus="nom:encre"]').click();
    await page.locator('#onglet-releves').click();
    await page.getByLabel('Mode', { exact: true }).selectOption('couleurs:Nuit');
    await page.getByLabel('Nouvelle valeur ou nom de la cible').fill('#FF0000');
    await page.getByRole('button', { name: 'Simuler' }).click();
    await page.locator('.bandeau-simulation').first().waitFor();
    assert.equal(await page.locator('.inspecteur .valeur-grande').textContent(), '#FF0000');
    await page.getByRole('button', { name: 'Réinitialiser' }).click();
    assert.equal(await page.locator('.inspecteur .valeur-grande').textContent(), '#222630');
    assert.equal(await page.locator('.bandeau-simulation:visible').count(), 0);
  } finally { await fermer(page); }
});
