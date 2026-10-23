/**
 * Les interactions du domaine `bibliotheque` : un fichier sans variable locale lit une library par ses noms, importe les valeurs d'un groupe à
 * son ouverture, grise les onglets de renommage et n'ouvre le fichier des tokens que si sa clé est connue. Le test joue les réponses du sandbox.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, avecReleve, envoyer, exiger, lancerLeNavigateur, ouvrir } from './aide.mjs';

const { releveVide, library } = exiger('../../galerie/bibliotheque/donnees.cjs');
const { bilans, messages } = exiger('../../galerie/nomenclature/donnees.cjs');

lancerLeNavigateur();

const demandesDe = (page, type) => page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
const groupe = (page, ...segments) => page.locator(`[data-focus='choix:${JSON.stringify(segments)}']`).click();

/** Le fichier des composants ouvert, ses noms de library lus, puis le groupe primary de theme ouvert. */
async function ouvrirLaLibrary(cle = 'TOKENS123') {
  const page = await ouvrir();
  await page.evaluate(() => { window.ouverts = []; window.open = (...arguments_) => { window.ouverts.push(arguments_); return null; }; });
  await avecReleve(page, releveVide());
  await envoyer(page, messages.initial(true));
  await envoyer(page, messages.bilan(1, { ...bilans.travail, sansVariableLocale: true }));
  await envoyer(page, library.noms(1, cle));
  return page;
}

test('un relevé sans variable demande les noms de la library, sous le numéro 1 de son domaine', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, releveVide());
    assert.deepEqual(await demandesDe(page, 'lire-bibliotheque'), [{ type: 'lire-bibliotheque', demande: 1 }]);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('la réponse d’une demande remplacée est ignorée', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, releveVide());
    await envoyer(page, library.noms(7));
    assert.equal(await page.locator('.arbre .surtitre').textContent(), 'Collections');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('l’arbre de la library se lit depuis ses noms, sans importer aucune valeur de plus qu’un groupe', async () => {
  const page = await ouvrirLaLibrary();
  try {
    assert.equal(await page.locator('.arbre .surtitre').textContent(), 'Library Intencial Tokens');
    // Les cinq collections, et le groupe scale que primitives ouvre sous elle.
    assert.equal(await page.locator('.arbre-ligne').count(), 6);
    const demandes = await demandesDe(page, 'lire-valeurs');
    assert.equal(demandes.length, 1);
    assert.ok(demandes[0].cles.length <= 100);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('ouvrir un groupe demande ses valeurs ; elles restent en attente jusqu’à la réponse, puis leurs cibles se lisent à leur suite', async () => {
  const page = await ouvrirLaLibrary();
  try {
    await envoyer(page, library.sansValeur(2));
    await page.locator("[data-focus='chevron:[\"theme\"]']").click();
    await groupe(page, 'theme', 'primary');
    const demandes = await attendreLesDemandes(page, 'lire-valeurs', 2);
    assert.equal(demandes.length, 2);
    assert.equal(demandes[1].cles.length, 13);
    assert.equal(await page.locator('.valeur-attente').count(), 13);
    assert.equal(await page.locator('.valeur-attente').first().getAttribute('title'), 'Valeur en cours de lecture');
    await envoyer(page, library.valeursDePrimary(3, 9));
    // Quatre variables attendent encore leur valeur, dans chacun des deux modes affichés.
    assert.equal(await page.locator('.valeur-attente').count(), 8);
    const cibles = (await demandesDe(page, 'lire-valeurs'))[2];
    assert.ok(cibles.cles.length > 0);
    await envoyer(page, library.valeursDesCibles(4, 9));
    assert.ok((await page.locator('.alias-nom').allTextContents()).includes('primary/light/700'));
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('une valeur que l’import refuse ne reste pas en attente', async () => {
  const page = await ouvrirLaLibrary();
  try {
    const [premiere] = (await attendreLesDemandes(page, 'lire-valeurs'))[0].cles;
    await envoyer(page, { type: 'valeurs', demande: 2, valeurs: { [premiere]: { illisible: 'Figma refuse cette variable.' } } });
    assert.equal(await page.locator('.valeur-attente').count(), (await page.locator('.table-ligne').count()) - 1);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('les onglets de renommage sont grisés, Règles est ouvert et l’alerte dit où renommer', async () => {
  const page = await ouvrirLaLibrary();
  try {
    for (const onglet of ['a-appliquer', 'a-trancher', 'a-faire']) assert.equal(await page.locator(`#onglet-${onglet}`).isDisabled(), true, onglet);
    assert.equal(await page.locator('#onglet-regles').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.compte:visible').count(), 0);
    const alerte = page.locator('.alerte:visible');
    assert.match(await alerte.locator('.alerte-titre').textContent(), /^Ces variables viennent de la library Intencial Tokens\.$/);
    assert.equal(await alerte.locator('.alerte-corps > p:not(.alerte-titre)').textContent(), 'Pour les renommer, ouvrez ce fichier.');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('Ouvrir Intencial Tokens n’existe que si la clé du fichier des tokens est connue, et ouvre ce fichier', async () => {
  const avec = await ouvrirLaLibrary('TOKENS123');
  try {
    await avec.locator('.alerte:visible .lien-externe').click();
    assert.deepEqual(await avec.evaluate(() => window.ouverts), [['https://www.figma.com/design/TOKENS123', '_blank', 'noopener']]);
    assert.equal(await avec.locator('.alerte:visible .lien-externe').textContent(), 'Ouvrir Intencial Tokens');
  } finally { await avec.context().close(); }
  const sans = await ouvrirLaLibrary(null);
  try {
    assert.equal(await sans.locator('.alerte:visible').count(), 1);
    assert.equal(await sans.locator('.alerte:visible .lien-externe').count(), 0);
  } finally { await sans.context().close(); }
});

test('un relevé qui a des variables rend les onglets et retire l’alerte', async () => {
  const page = await ouvrirLaLibrary();
  try {
    const { releveDeStructure } = exiger('../../galerie/structure/donnees.cjs');
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await avecReleve(page, releveDeStructure(), 2);
    await page.waitForTimeout(30);
    assert.equal(await page.locator('.alerte:visible').count(), 0);
    assert.equal(await page.locator('#onglet-a-appliquer').isDisabled(), false);
    assert.equal(await page.locator('.arbre .surtitre').textContent(), 'Collections');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});
