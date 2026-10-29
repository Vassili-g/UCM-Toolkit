/**
 * Les interactions du domaine `accessibilite` : les cartes de contraste et d'accessibilité de À faire dans Figma, les questions d'état,
 * et `modele-propose`, qui range les constats d'un variant modèle dans l'analyse retenue. Le panneau n'écrit rien.
 * Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { deplierLesSections, envoyer, exiger, lancerLeNavigateur, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { alertCorrections, alertModele, analyseAvantLeModele, aucunIgnore, modelePropose } = exiger('../../galerie/etats/corrections.cjs');
const { analyseDAlert, analyseDeButton, button } = exiger('../../galerie/etats/accessibilite.cjs');
const { IDENTITE } = exiger('../../galerie/composant/donnees.cjs');

const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

async function ouvrirLePanneau(lecture, analyse) {
  const page = await ouvrirComposant(lecture);
  await page.setViewportSize({ width: 1040, height: 760 });
  await envoyer(page, analyse);
  await envoyer(page, aucunIgnore);
  await page.getByRole('button', { name: 'Constats' }).click();
  await deplierLesSections(page);
  return page;
}

const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};
/** Les cartes de l'élément Accessibilité : contraste, recommandations et limites de lecture. */
const SECTION = '.section-element[data-element="a11y"]';
const cartes = (page) => page.locator(`${SECTION} .bloc-constat`);
const note = (page) => page.locator(`${SECTION} > p.meta`).last();

test('une mesure de contraste dit sa paire, son rapport sans arrondi, son seuil et ses modes', async () => {
  const page = await ouvrirLePanneau(alertCorrections, analyseDAlert.message);
  try {
    assert.deepEqual(await page.locator('.puce-element').evaluateAll((puces) => puces.map((puce) => puce.dataset.element)), ['tout', 'couleurs', 'tailles', 'variants', 'regles', 'a11y']);
    const premiere = cartes(page).first();
    await premiere.locator('.bloc-bouton').click();
    assert.equal(await premiere.locator('.bloc-phrase').innerText(), 'Le texte manque de contraste en Dark.');
    assert.deepEqual(await premiere.locator('.constat-lieu .puce-valeur').allTextContents(), ['warning', 'standard']);
    assert.deepEqual(await premiere.locator('.constat-lieu .puce-valeur').evaluateAll((puces) => puces.map((puce) => puce.title)), ['Severity=warning', 'Variant=standard']);
    const mesure = premiere.locator('.constat-fait').first();
    assert.equal(await mesure.locator('span').first().textContent(), 'Mesure');
    assert.equal(await mesure.locator('.paire b').textContent(), '3,9:1');
    assert.equal(await mesure.locator('.paire .meta').textContent(), 'seuil 4,5:1, intencial en Dark');
    assert.equal(await mesure.locator('.paire-echantillon').evaluate((element) => [element.style.color, element.style.backgroundColor]).then((couleurs) => couleurs.join(' sur ')), 'rgb(201, 140, 90) sur rgb(60, 42, 30)');
    assert.deepEqual(await premiere.locator('.mesures span').allTextContents(), ['intencial en Light : 7,1:1', 'marque-2 en Light : 6,8:1', 'marque-2 en Dark : 4,6:1']);
    assert.equal(await premiere.getByRole('button', { name: /^Ignorer :/ }).textContent(), 'Ignorer ce layer');
    assert.equal(await cartes(page).nth(1).locator('.constat-lieu').textContent(), '4 variantsoutlined, 2,4:1 au lieu de 3:1');
  } finally { await terminer(page); }
});

test('une limite de lecture est une ligne de la section Informations, sans verdict ni carte', async () => {
  const page = await ouvrirLePanneau(alertCorrections, analyseDAlert.message);
  try {
    assert.equal(await cartes(page).count(), 2);
    const section = page.locator('.section-informations');
    const ligne = section.locator('.info-ligne');
    assert.equal(await ligne.count(), 1);
    assert.equal(await ligne.locator('.info-texte').innerText(), 'Contraste non mesuré : le fill du layer container est un dégradé.');
    assert.equal(await ligne.locator('.gravite').count(), 0);
    assert.equal(await ligne.locator('.bloc-bouton').count(), 0);
    assert.equal(await note(page).textContent(), 'Ces mesures portent sur le dessin du composant dans Figma.');
  } finally { await terminer(page); }
});

test('la cible, l’anneau et le texte sous 12 px sont des recommandations ; les variants désactivés ne sont pas un manquement', async () => {
  const page = await ouvrirLePanneau(button, analyseDeButton.message);
  try {
    assert.equal(await cartes(page).count(), 6);
    const statuts = await cartes(page).locator('.constat-statut').allTextContents();
    assert.deepEqual(statuts, ['Réglez le token ring dans UCM Palettes', 'Ajoutez l’anneau dans Figma', 'Recommandation', 'Agrandissez la zone dans Figma', 'Recommandation', 'Recommandation']);
    assert.deepEqual(await cartes(page).locator('.gravite').allTextContents(), ['À corriger', 'À corriger', 'À vérifier', 'À corriger', 'À vérifier', 'À vérifier']);
    assert.equal(await cartes(page).nth(3).locator('.bloc-phrase').innerText(), 'La zone cliquable mesure 20 × 20 px. Elle doit mesurer au moins 24 × 24 px.');
    assert.equal(await cartes(page).nth(3).locator('.constat-lieu').textContent(), '72 variantssmall');
    const section = page.locator('.section-informations');
    assert.equal(await section.locator('.bande-element .nombre').textContent(), '1');
    assert.equal(await section.locator('.info-texte').innerText(), 'Contraste non mesuré sur disabled, que WCAG exempte.');
    assert.equal(await section.locator('.info-lieu').textContent(), '54 variantsdisabled');
    assert.equal(await note(page).textContent(), 'Ces mesures portent sur le dessin du composant dans Figma.');
  } finally { await terminer(page); }
});

test('une question d’état cite l’état et le token d’état, met le segment en couleur et répond par la clé du candidat', async () => {
  const page = await ouvrirLePanneau(button, analyseDeButton.message);
  try {
    const premiere = page.locator('.arch-laterale .question').first();
    assert.equal(await premiere.locator('.question-titre').innerText(), 'Lier le fill de State=hover à button/color/primary/contained/hover/background ?');
    assert.equal(await premiere.locator('.meta').textContent(), '3 variantsprimarycontainedhover, layer container. Lié aujourd’hui au token du repos. 46 des 54 variants State=hover emploient un token hover.');
    assert.deepEqual(await premiere.locator('.meta .puce-valeur').evaluateAll((puces) => puces.map((puce) => puce.title)), ['Palette=primary', 'Style=contained', 'State=hover']);
    assert.equal(await premiere.locator('.meta .ch-variant').count(), 0, 'l’indice du moteur reste un texte simple');
    assert.equal(await premiere.locator('.ancien .seg-ancien').textContent(), 'default');
    assert.equal(await premiere.locator('.nouveau .seg-nouveau').textContent(), 'hover');
    assert.equal(await page.locator('.arch-laterale .question').nth(1).locator('.question-titre').innerText(), 'Lier le texte de State=hover à button/color/primary/text/hover/foreground ?');
    await premiere.getByRole('button', { name: /^Lier au token hover/ }).click();
    const [envoi] = await demandes(page, 'repondre');
    assert.deepEqual({ analyse: envoi.analyse, question: envoi.question, reponse: envoi.reponse }, { analyse: IDENTITE, question: 'q:C16:fond', reponse: 'cle-C16:fond' });
  } finally { await terminer(page); }
});

test('modele-propose range les constats du modèle dans l’analyse, sans remplacer les autres ; une autre identité est ignorée', async () => {
  const page = await ouvrirLePanneau(alertModele, analyseAvantLeModele);
  try {
    // Les cartes de corrections, les questions et les constats à faire dans Figma de toutes les sections.
    const comptes = async () => {
      await deplierLesSections(page);
      return page.evaluate(() => [
        document.querySelectorAll('.arch-laterale .liste .bloc:has(> .bloc-tete > input.case)').length,
        document.querySelectorAll('.arch-laterale .question').length,
        document.querySelectorAll('.arch-laterale .bloc-constat:not(.muette)').length,
      ]);
    };
    const avant = await comptes();
    assert.equal(avant[0], 0);
    await envoyer(page, { ...modelePropose, analyse: { ...IDENTITE, generation: 9 } });
    assert.deepEqual(await comptes(), avant, 'une autre analyse ne range rien');
    await envoyer(page, modelePropose);
    const apres = await comptes();
    assert.equal(apres[0], 1);
    assert.match(await page.locator('.arch-laterale .liste .bloc:has(> .bloc-tete > input.case)').first().locator('.bloc-pile').innerText(), /Copier les liaisons de\s+Severity=info, Variant=standard/);
    // Six constats deviennent des questions et trois prennent une correction, donc quittent les constats à faire dans Figma ; deux constats à y faire s'ajoutent ; les autres restent.
    assert.equal(apres[1] - avant[1], 6);
    assert.equal(apres[2] - avant[2], 2 - 3 - 6);
  } finally { await terminer(page); }
});

