/**
 * Les interactions du domaine `accessibilite` : les cartes de contraste et d'accessibilité de À faire dans Figma, les questions d'état,
 * et le bouton « Copier ses liaisons aux autres variants » de la section Variants. Le panneau n'écrit rien : le bouton envoie
 * `servir-de-modele`, et `modele-propose` range les constats du modèle dans l'analyse retenue.
 * Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { envoyer, exiger, lancerLeNavigateur, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { alertCorrections, alertModele, analyseAvantLeModele, aucunIgnore, modelePropose, perime } = exiger('../../galerie/etats/corrections.cjs');
const { analyseDAlert, analyseDeButton, button } = exiger('../../galerie/etats/accessibilite.cjs');
const { IDENTITE } = exiger('../../galerie/composant/donnees.cjs');

const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

async function ouvrirLePanneau(lecture, analyse, onglet) {
  const page = await ouvrirComposant(lecture);
  await page.setViewportSize({ width: 1040, height: 760 });
  await envoyer(page, analyse);
  await envoyer(page, aucunIgnore);
  await page.getByRole('button', { name: 'Constats' }).click();
  if (onglet) await page.locator(`#onglet-${onglet}`).click();
  return page;
}

const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};
const cartes = (page) => page.locator('#panneau-a-faire .bloc-constat');
const copier = (page) => page.locator('[data-action="copier-les-liaisons"]');

test('une mesure de contraste dit sa paire, son rapport sans arrondi, son seuil et ses modes', async () => {
  const page = await ouvrirLePanneau(alertCorrections, analyseDAlert.message, 'a-faire');
  try {
    assert.deepEqual(await page.locator('#panneau-a-faire .intertitre-structure h2').allTextContents(), ['Contraste et accessibilité']);
    const premiere = cartes(page).first();
    await premiere.locator('.bloc-bouton').click();
    assert.equal(await premiere.locator('.bloc-phrase').innerText(), 'Le texte de Severity=warning, Variant=standard manque de contraste en Dark.');
    const mesure = premiere.locator('.constat-fait').first();
    assert.equal(await mesure.locator('span').first().textContent(), 'Mesure');
    assert.equal(await mesure.locator('.paire b').textContent(), '3,9:1');
    assert.equal(await mesure.locator('.paire .meta').textContent(), 'seuil 4,5:1, intencial en Dark');
    assert.equal(await mesure.locator('.paire-echantillon').evaluate((element) => [element.style.color, element.style.backgroundColor]).then((couleurs) => couleurs.join(' sur ')), 'rgb(201, 140, 90) sur rgb(60, 42, 30)');
    assert.deepEqual(await premiere.locator('.mesures span').allTextContents(), ['intencial en Light : 7,1:1', 'marque-2 en Light : 6,8:1', 'marque-2 en Dark : 4,6:1']);
    assert.equal(await premiere.getByRole('button', { name: /^Ignorer :/ }).textContent(), 'Ignorer ce layer');
    assert.equal(await cartes(page).nth(1).locator('.constat-lieu').innerText(), '4 variants, 2,4:1 au lieu de 3:1');
  } finally { await terminer(page); }
});

test('une limite de lecture le dit sans verdict et n’a pas de bouton Ignorer ; la note borne ce que les mesures prouvent', async () => {
  const page = await ouvrirLePanneau(alertCorrections, analyseDAlert.message, 'a-faire');
  try {
    const limite = cartes(page).nth(2);
    assert.equal(await limite.locator('.bloc-phrase').innerText(), 'Le fill de Severity=error, Variant=filled est un dégradé. Le contraste n’a pas été mesuré.');
    assert.equal(await limite.locator('.gravite').textContent(), 'Information');
    assert.equal(await limite.locator('.bloc-bouton[aria-expanded]').count(), 0);
    assert.equal(await page.locator('#panneau-a-faire .meta').last().textContent(), 'Ces mesures portent sur le dessin du composant dans Figma. Elles ne prouvent pas la conformité de l’interface livrée.');
  } finally { await terminer(page); }
});

test('la cible, l’anneau et le texte sous 12 px sont des recommandations ; les variants désactivés ne sont pas un manquement', async () => {
  const page = await ouvrirLePanneau(button, analyseDeButton.message, 'a-faire');
  try {
    assert.equal(await cartes(page).count(), 7);
    const statuts = await cartes(page).locator('.constat-statut').allTextContents();
    assert.deepEqual(statuts, ['Réglez le token ring dans UCM Palettes', 'Ajoutez l’anneau dans Figma', 'Recommandation', 'Agrandissez la zone dans Figma', 'Recommandation', 'Recommandation']);
    assert.deepEqual(await cartes(page).locator('.gravite').allTextContents(), ['À corriger', 'À corriger', 'À vérifier', 'À corriger', 'À vérifier', 'À vérifier', 'Information']);
    assert.equal(await cartes(page).nth(3).locator('.bloc-phrase').innerText(), 'La zone cliquable de Size=small mesure 20 × 20 px. Elle doit mesurer au moins 24 × 24 px.');
    assert.equal(await cartes(page).nth(6).locator('.bloc-phrase').innerText(), 'Les 54 variants State=disabled ne sont pas mesurés. WCAG ne leur demande pas de contraste.');
    assert.equal(await page.locator('#panneau-a-faire .meta').last().textContent(), 'Ces mesures portent sur le dessin du composant dans Figma.');
  } finally { await terminer(page); }
});

test('une question d’état cite l’état et le token d’état, met le segment en couleur et répond par la clé du candidat', async () => {
  const page = await ouvrirLePanneau(button, analyseDeButton.message, 'questions');
  try {
    const premiere = page.locator('#panneau-questions .question').first();
    assert.equal(await premiere.locator('.question-titre').innerText(), 'Lier le fill de State=hover à button/color/primary/contained/hover/background ?');
    assert.equal(await premiere.locator('.meta').innerText(), 'Palette=primary, Style=contained, State=hover, layer container. Lié aujourd’hui au token du repos. 46 des 54 variants State=hover emploient un token hover.');
    assert.equal(await premiere.locator('.meta .ch-variant').count(), 1, 'l’indice du moteur reste un texte simple');
    assert.equal(await premiere.locator('.ancien .seg-ancien').textContent(), 'default');
    assert.equal(await premiere.locator('.nouveau .seg-nouveau').textContent(), 'hover');
    assert.equal(await page.locator('#panneau-questions .question').nth(1).locator('.question-titre').innerText(), 'Lier le texte de State=hover à button/color/primary/text/hover/foreground ?');
    await premiere.getByRole('button', { name: /^Lier au token hover/ }).click();
    const [envoi] = await demandes(page, 'repondre');
    assert.deepEqual({ analyse: envoi.analyse, question: envoi.question, reponse: envoi.reponse }, { analyse: IDENTITE, question: 'q:C16:fond', reponse: 'cle-C16:fond' });
  } finally { await terminer(page); }
});

test('le bouton du pied de Variants envoie servir-de-modele pour le variant affiché', async () => {
  const page = await ouvrirComposant(alertModele);
  try {
    await envoyer(page, analyseAvantLeModele);
    assert.equal(await copier(page).isEnabled(), true);
    await copier(page).click();
    const [envoi] = await demandes(page, 'servir-de-modele');
    assert.deepEqual({ analyse: envoi.analyse, variant: envoi.variant }, { analyse: IDENTITE, variant: 'alert:0' });
  } finally { await terminer(page); }
});

test('modele-propose range les constats du modèle dans l’analyse, sans remplacer les autres ; une autre identité est ignorée', async () => {
  const page = await ouvrirLePanneau(alertModele, analyseAvantLeModele, 'corrections');
  try {
    const comptes = () => page.evaluate(() => ['corrections', 'questions', 'a-faire'].map((onglet) => document.querySelector(`#onglet-${onglet} .compte`).textContent));
    const avant = await comptes();
    assert.equal(avant[0], '0');
    await envoyer(page, { ...modelePropose, analyse: { ...IDENTITE, generation: 9 } });
    assert.deepEqual(await comptes(), avant, 'une autre analyse ne range rien');
    await envoyer(page, modelePropose);
    const apres = await comptes();
    assert.equal(apres[0], '1');
    assert.match(await page.locator('#panneau-corrections .liste .bloc').first().locator('.bloc-pile').innerText(), /Copier les liaisons de\s+Severity=info, Variant=standard/);
    // Six constats deviennent des questions et trois prennent une correction, donc quittent À faire dans Figma ; deux constats à y faire s'ajoutent ; les autres restent.
    assert.equal(Number(apres[1]) - Number(avant[1]), 6);
    assert.equal(Number(apres[2]) - Number(avant[2]), 2 - 3 - 6);
  } finally { await terminer(page); }
});

test('une analyse périmée rend le bouton inactif, et rien ne part au clic', async () => {
  const page = await ouvrirComposant(alertModele);
  try {
    await envoyer(page, analyseAvantLeModele);
    await envoyer(page, perime('selection').message);
    assert.equal(await copier(page).isDisabled(), true);
    await copier(page).click({ force: true });
    assert.deepEqual(await demandes(page, 'servir-de-modele'), []);
  } finally { await terminer(page); }
});
