/**
 * Les interactions de la Configuration du fichier des tokens : la page pleine fenêtre, la Library, le niveau de contraste, et
 * l'Historique de la création de variables. Écrites au lot U8, lancées par `test:ui`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, avecReleve, envoyer, exiger, fermer, lancerLeNavigateur, ouvrir } from './aide.mjs';

lancerLeNavigateur();
const { bilans, messages } = exiger('../../galerie/nomenclature/donnees.cjs');
const { releveIntencial } = exiger('../../galerie/etats/nomenclature.cjs');
const { rangeeAvec } = exiger('../../galerie/etats/preparation.cjs');

const configuration = { type: 'configuration', library: { cle: 'tokens', nom: 'Intencial Tokens', liaisons: 412 }, candidates: [{ cle: 'tokens', nom: 'Intencial Tokens', liaisons: 412 }, { cle: 'icons', nom: 'Icônes Intencial', liaisons: 0 }], niveau: 'AA' };
const creees = { type: 'variables-creees', preparation: 'prep-tag', creees: 15, gardees: 1, sautees: 0, remplacees: 0, divergentes: [], echecs: [], journal: true, refus: null, collections: [] };
const annulee = (resume = {}) => ({ type: 'structure-annulee', demande: 1, refus: null, journal: 'lu', defaites: 15, sautees: [], restantes: 0, limiteDesUsages: true, ...resume });

async function ouvrirLaConfiguration(bilan = bilans.avecUnImport) {
  const page = await ouvrir();
  await avecReleve(page, { ...releveIntencial(), fichier: 'Intencial Tokens' });
  await envoyer(page, messages.initial(true));
  await envoyer(page, messages.bilan(1, bilan));
  await page.locator('.icon-button').click();
  await attendreLesDemandes(page, 'lire-configuration');
  await envoyer(page, configuration);
  return page;
}

test('la Configuration prend toute la fenêtre : ni arbre, ni tableau, ni pied, une colonne de 720 px au plus', async () => {
  const page = await ouvrirLaConfiguration();
  try {
    assert.equal(await page.locator('.corps.corps-configuration').count(), 1);
    assert.equal(await page.locator('.arbre').isVisible(), false);
    assert.equal(await page.locator('.centre').isVisible(), false);
    assert.equal(await page.locator('.pied').isVisible(), false);
    const colonne = await page.locator('.panneau-lateral > .container').boundingBox();
    assert.ok(colonne.width <= 720);
    await page.getByRole('button', { name: 'Retour' }).click();
    assert.equal(await page.locator('.corps.corps-configuration').count(), 0);
    assert.equal(await page.locator('.arbre').isVisible(), true);
  } finally { await fermer(page); }
});

test('la Library et le niveau de contraste suivent le message du sandbox, et un clic range le niveau choisi', async () => {
  const page = await ouvrirLaConfiguration();
  try {
    assert.equal(await page.getByLabel('Le mode Composant lit').inputValue(), 'tokens');
    assert.equal(await page.getByText('Choisie parce que ses variables sont liées à 412 layers de ce fichier.').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'AA', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'AAA', exact: true }).click();
    const [demande] = await attendreLesDemandes(page, 'ranger-niveau');
    assert.deepEqual(demande, { type: 'ranger-niveau', niveau: 'AAA' });
    await page.getByLabel('Le mode Composant lit').selectOption('icons');
    const [library] = await attendreLesDemandes(page, 'ranger-library');
    assert.deepEqual(library, { type: 'ranger-library', cle: 'icons' });
  } finally { await fermer(page); }
});

test('Coller une préparation ferme la Configuration et ouvre la zone de texte du mode Composant', async () => {
  const page = await ouvrirLaConfiguration();
  try {
    await page.getByRole('button', { name: 'Coller une préparation' }).click();
    const [demande] = await attendreLesDemandes(page, 'changer-disposition');
    assert.deepEqual(demande, { type: 'changer-disposition', disposition: 'etroite' });
    assert.equal(await page.getByLabel('Préparation reçue').isVisible(), true);
  } finally { await fermer(page); }
});

test('l’Historique garde la dernière création de variables et l’annule par le journal de structure', async () => {
  const page = await ouvrirLaConfiguration();
  try {
    await page.locator('#onglet-historique').click();
    assert.equal(await page.getByText('Dernière création de variables').count(), 0);
    await page.locator('#onglet-reglages').click();
    await page.getByRole('button', { name: 'Retour' }).click();
    await envoyer(page, { type: 'preparations', preparations: [rangeeAvec((rang) => (rang === 15 ? 'existe-identique' : 'a-creer'))] });
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees);
    await page.locator('.icon-button').click();
    await page.locator('#onglet-historique').click();
    assert.match(await page.locator('.config-renommage', { hasText: 'variables de Tag' }).textContent(), /^15 variables de Tag, aujourd’hui à \d\d:\d\d$/);
    assert.equal(await page.getByText('Si la library est publiée, les layers liés à ces variables perdront leur liaison.').isVisible(), true);
    await page.locator('[data-action="annuler-creation"]').click();
    const [demande] = await attendreLesDemandes(page, 'annuler-structure');
    assert.equal(demande.type, 'annuler-structure');
    assert.equal(await page.locator('[data-action="annuler-creation"]').isDisabled(), true);
    await envoyer(page, annulee({ demande: demande.demande }));
    const resultat = page.locator('[data-action="annuler-creation"]').locator('xpath=ancestor::*[contains(@class, "config-section")][1]');
    assert.match(await resultat.textContent(), /15 variables supprimées\./);
    assert.match(await resultat.textContent(), /Les usages dans les autres fichiers ne peuvent pas être vérifiés\./);
    assert.equal(await page.locator('[data-action="annuler-creation"]').isDisabled(), true);
  } finally { await fermer(page); }
});

test('une annulation qui laisse des variables en place dit pourquoi et reste possible', async () => {
  const page = await ouvrirLaConfiguration();
  try {
    await page.getByRole('button', { name: 'Retour' }).click();
    await envoyer(page, { type: 'preparations', preparations: [rangeeAvec((rang) => (rang === 15 ? 'existe-identique' : 'a-creer'))] });
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees);
    await page.locator('.icon-button').click();
    await page.locator('#onglet-historique').click();
    await page.locator('[data-action="annuler-creation"]').click();
    const [demande] = await attendreLesDemandes(page, 'annuler-structure');
    await envoyer(page, annulee({
      demande: demande.demande, defaites: 14, restantes: 1, limiteDesUsages: false,
      sautees: [{ variable: 'components/tag/size/padding-x', sorte: 'creation', motif: 'usage-ajoute' }],
    }));
    const resultat = page.locator('[data-action="annuler-creation"]').locator('xpath=ancestor::*[contains(@class, "config-section")][1]');
    assert.match(await resultat.textContent(), /« components\/tag\/size\/padding-x » est utilisée dans ce fichier\. La variable reste en place\./);
    assert.equal(await page.locator('[data-action="annuler-creation"]').isDisabled(), false);
  } finally { await fermer(page); }
});

test('un journal absent ou illisible dit qu’aucune structure ne s’annule', async () => {
  for (const [journal, attendu] of [['absent', /le journal est absent de ce fichier/], ['illisible', /le journal ne peut pas être lu/]]) {
    const page = await ouvrirLaConfiguration();
    try {
      await page.getByRole('button', { name: 'Retour' }).click();
      await envoyer(page, { type: 'preparations', preparations: [rangeeAvec((rang) => (rang === 15 ? 'existe-identique' : 'a-creer'))] });
      await page.locator('[data-action="preparation-voir"]').click();
      await page.locator('[data-action="preparation-creer"]').click();
      await envoyer(page, creees);
      await page.locator('.icon-button').click();
      await page.locator('#onglet-historique').click();
      await page.locator('[data-action="annuler-creation"]').click();
      const [demande] = await attendreLesDemandes(page, 'annuler-structure');
      await envoyer(page, annulee({ demande: demande.demande, journal, defaites: 0, limiteDesUsages: false }));
      assert.match(await page.locator('[data-action="annuler-creation"]').locator('xpath=ancestor::*[contains(@class, "config-section")][1]').textContent(), attendu);
    } finally { await fermer(page); }
  }
});
