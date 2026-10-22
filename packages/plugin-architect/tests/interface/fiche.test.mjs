/** Les interactions de la fiche d’une variable. Ces tests décrivaient l’inspecteur, qui a cédé sa place à Nomenclature : ils sont sautés jusqu’au lot U2, qui les réécrit sur la fiche. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, avecReleve, fermer, fixtures } from './aide.mjs';

lancerLeNavigateur();
const { projetLibre, cinqCollections } = fixtures;

test('zéro, faux et le texte vide se copient exactement ; un refus du presse-papiers laisse le texte sélectionnable', { skip: 'la fiche vient au lot U2 : l’inspecteur a cédé sa place à Nomenclature' }, async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator(`[data-focus='choix:["mesures"]']`).click();
    await page.locator('[data-focus="nom:zero"]').click();
    await page.getByRole('group', { name: 'Copier' }).getByRole('button', { name: 'Valeur' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '0');
    await page.locator('.recherche').fill('badge/visible');
    await page.locator('[data-focus="nom:visible"]').click();
    await page.getByRole('group', { name: 'Copier' }).getByRole('button', { name: 'Valeur' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'false');
    await page.locator('.recherche').fill('action/label');
    await page.locator('[data-focus="nom:libelle"]').click();
    await page.evaluate(() => navigator.clipboard.writeText('avant'));
    await page.getByRole('group', { name: 'Copier' }).getByRole('button', { name: 'Valeur' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '');
    await page.evaluate(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error('refusé'));
      document.execCommand = () => false;
    });
    await page.getByRole('group', { name: 'Copier' }).getByRole('button', { name: 'Nom Figma' }).click();
    const secours = page.locator('.secours');
    await secours.waitFor();
    assert.equal(await secours.inputValue(), 'action/label');
    assert.match(await page.locator('.annonce').textContent(), /Sélectionnez le texte/);
  } finally { await fermer(page); }
});

test('changer de contexte garde le token inspecté et recalcule son résultat', { skip: 'la fiche vient au lot U2 : l’inspecteur a cédé sa place à Nomenclature' }, async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    assert.equal(await page.locator('.inspecteur .valeur-grande').textContent(), '#E06666');
    assert.equal(await page.locator('.barre select').count(), 0);
    await page.locator('#onglet-comparer').click();
    await page.getByLabel('Mode de brand', { exact: true }).selectOption('marque:Beta');
    assert.equal(await page.locator('.inspecteur-titre').textContent(), 'button/primary/bg');
    assert.equal(await page.locator('.inspecteur .valeur-grande').textContent(), '#2E9E5B');
  } finally { await fermer(page); }
});

test('à la taille minimale, l’inspecteur ouvert ne masque ni la recherche, ni la bascule, ni Actualiser', { skip: 'la fiche vient au lot U2 : l’inspecteur a cédé sa place à Nomenclature' }, async () => {
  const page = await ouvrir({ largeur: 560, hauteur: 480 });
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    const inspecteur = await page.locator('.inspecteur').boundingBox();
    const recherche = await page.locator('.arbre .recherche').boundingBox();
    assert.ok(recherche.x + recherche.width <= inspecteur.x, 'la recherche sous l’inspecteur');
    for (const selecteur of ['.bascule', '.barre-lecture .bouton-discret >> nth=0']) {
      const boite = await page.locator(selecteur).boundingBox();
      assert.ok(boite.y + boite.height <= inspecteur.y, `${selecteur} sous l’inspecteur`);
    }
    await page.getByRole('button', { name: 'Fermer' }).click();
    assert.equal(await page.locator('.inspecteur').isVisible(), false);
  } finally { await fermer(page); }
});
