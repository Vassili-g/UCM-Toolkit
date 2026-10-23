/**
 * Les interactions du domaine `preparation` dans le fichier des tokens : l'alerte des variables à créer, la feuille qui les liste, la
 * création et son résultat. Écrites au lot U8, lancées par `test:ui`. Le mode Composant (g-entree à g-coller) se rejoue par la galerie.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, avecReleve, envoyer, exiger, fermer, lancerLeNavigateur, ouvrir } from './aide.mjs';

lancerLeNavigateur();
const { bilans, messages } = exiger('../../galerie/nomenclature/donnees.cjs');
const { releveIntencial } = exiger('../../galerie/etats/nomenclature.cjs');
const { rangeeAvec, variablesRangee } = exiger('../../galerie/etats/preparation.cjs');

const aCreer = (rang) => (rang === 15 ? 'existe-identique' : 'a-creer');
const preparations = (etat = aCreer, extras = {}) => ({ type: 'preparations', preparations: [{ ...rangeeAvec(etat), ...extras }] });
const creees = (resume = {}) => ({
  type: 'variables-creees', preparation: 'prep-tag', creees: 15, gardees: 1, sautees: 0, remplacees: 0, divergentes: [], echecs: [], journal: true, refus: null, collections: [], ...resume,
});

/** Le fichier des tokens ouvert sur le bilan de Nomenclature, avec la préparation rangée sur ce poste. */
async function ouvrirLeFichierDesTokens() {
  const page = await ouvrir();
  await avecReleve(page, { ...releveIntencial(), fichier: 'Intencial Tokens' });
  await envoyer(page, messages.initial(true));
  await envoyer(page, messages.bilan(1, bilans.travail));
  await envoyer(page, preparations());
  return page;
}

test('le fichier des tokens lit les préparations rangées dès l’ouverture du plugin', async () => {
  const page = await ouvrir();
  try {
    await attendreLesDemandes(page, 'lire-preparations');
  } finally { await fermer(page); }
});

test('une préparation à créer annonce ses variables ; Voir ouvre la feuille, trois lignes d’abord', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    const alerte = page.locator('.alerte', { hasText: '16 variables à créer pour Tag.' });
    assert.equal(await alerte.count(), 1);
    await page.locator('[data-action="preparation-voir"]').click();
    assert.equal(await page.locator('.feuille-titre').textContent(), 'Variables à créer pour Tag');
    assert.match(await page.locator('.feuille-entete .meta').textContent(), /^Préparées dans le fichier des composants, aujourd’hui à 14:20\.$/);
    assert.equal(await page.locator('.feuille-contenu > p').first().textContent(), '15 variables à créer. 1 existe déjà.');
    const lignes = page.locator('.fiche-liste .diff');
    assert.equal(await lignes.count(), 4);
    assert.equal(await lignes.nth(3).locator('.chemin-apres').textContent(), 'existe déjà, vise theme/info/vivid/surface/default gardée');
    await page.getByRole('button', { name: 'Afficher les 12 autres' }).click();
    assert.equal(await page.locator('.fiche-liste .diff').count(), 16);
    assert.equal(await page.locator('[data-action="preparation-creer"]').textContent(), 'Créer 15 variables');
  } finally { await fermer(page); }
});

test('Créer envoie la préparation au sandbox et reste inactif jusqu’à la réponse', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    const [demande] = await attendreLesDemandes(page, 'creer-variables');
    assert.deepEqual(demande, { type: 'creer-variables', preparation: 'prep-tag' });
    assert.equal(await page.locator('[data-action="preparation-creer"]').isDisabled(), true);
  } finally { await fermer(page); }
});

test('une création réussie ferme la feuille, retire l’alerte et dit où publier', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees());
    await envoyer(page, preparations((rang) => (rang === 15 ? 'existe-identique' : 'creee')));
    assert.equal(await page.locator('.feuille-voile').count(), 0);
    assert.equal(await page.locator('[data-action="preparation-voir"]').count(), 0);
    const resultat = page.locator('.resultat');
    assert.equal(await resultat.locator('.pile > span').first().textContent(), '✓ 15 variables créées pour Tag');
    assert.match(await resultat.textContent(), /Publiez Intencial Tokens : Assets, Libraries, puis Publish\./);
    assert.match(await resultat.textContent(), /Configuration › Historique annule la création\./);
  } finally { await fermer(page); }
});

test('un refus de la création garde la feuille ouverte et en dit la raison', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees({ creees: 0, gardees: 0, refus: 'sans-destination' }));
    assert.match(await page.locator('.feuille-contenu .alerte').textContent(), /Ce fichier n’a pas de collection components où créer les variables\./);
    assert.equal(await page.locator('[data-action="preparation-creer"]').isDisabled(), false);
    assert.equal(await page.locator('.resultat').count(), 0);
  } finally { await fermer(page); }
});

test('une destination ambiguë propose les collections, et le choix part avec la demande', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    await envoyer(page, creees({ creees: 0, gardees: 0, refus: 'destination-ambigue', collections: [{ id: 'c1', nom: 'components' }, { id: 'c2', nom: 'components 2' }] }));
    await page.getByLabel('Collection components').selectOption('c2');
    await page.locator('[data-action="preparation-creer"]').click();
    const demandes = await attendreLesDemandes(page, 'creer-variables', 2);
    assert.deepEqual(demandes[1], { type: 'creer-variables', preparation: 'prep-tag', collection: 'c2' });
  } finally { await fermer(page); }
});

test('une variable existante qui vise autre chose attend Garder ou Remplacer, les échecs disent pourquoi', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('[data-action="preparation-creer"]').click();
    const divergente = variablesRangee[2][0];
    await envoyer(page, creees({ creees: 12, sautees: 3, divergentes: [{ nom: divergente, vise: variablesRangee[2][1] }], echecs: [{ nom: variablesRangee[4][0], motif: 'cible-introuvable' }, { nom: variablesRangee[5][0], motif: 'erreur' }] }));
    await envoyer(page, preparations((rang) => (rang === 15 ? 'existe-identique' : rang === 2 ? 'existe-divergente' : rang === 4 || rang === 5 ? 'echec' : 'creee')));
    assert.match(await page.locator('.feuille-contenu .alerte').textContent(), /3 variables restent à régler\./);
    assert.equal(await page.getByText('La variable visée n’existe pas dans la collection choisie.').count(), 1);
    assert.equal(await page.getByText('Figma n’a pas pu créer cette variable.').count(), 1);
    await page.locator(`input[name="existante:${divergente}"][value="remplacer"]`).check();
    await page.locator('[data-action="preparation-creer"]').click();
    const demandes = await attendreLesDemandes(page, 'creer-variables', 2);
    assert.deepEqual(demandes[1], { type: 'creer-variables', preparation: 'prep-tag', reponses: { [`existante:${divergente}`]: 'remplacer' } });
  } finally { await fermer(page); }
});

test('Abandonner la préparation demande son retrait au sandbox, et la feuille se ferme quand il l’a rangée', async () => {
  const page = await ouvrirLeFichierDesTokens();
  try {
    await page.locator('[data-action="preparation-voir"]').click();
    await page.locator('.prep-abandonner').click();
    const [demande] = await attendreLesDemandes(page, 'abandonner-preparation');
    assert.deepEqual(demande, { type: 'abandonner-preparation', preparation: 'prep-tag' });
    await envoyer(page, { type: 'preparations', preparations: [] });
    assert.equal(await page.locator('.feuille-voile').count(), 0);
    assert.equal(await page.locator('[data-action="preparation-voir"]').count(), 0);
  } finally { await fermer(page); }
});
