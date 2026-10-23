/**
 * Les interactions du domaine `structure` : « À faire dans Figma » et les corrections de modes et de scopes. Le sandbox du domaine
 * n'existe pas encore : le test joue ses réponses, à la forme de `messages/structure.ts`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { avecReleve, envoyer, exiger, lancerLeNavigateur, ouvrir } from './aide.mjs';

const { releveDeStructure, bilanDeStructure, structure } = exiger('../../galerie/structure/donnees.cjs');
const { messages } = exiger('../../galerie/nomenclature/donnees.cjs');

lancerLeNavigateur();

const demandesDe = (page, type) => page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);

/** Le fichier Intencial ouvert, le bilan de Nomenclature lu, puis la réponse du sandbox à `lire-structure`. */
async function ouvrirLaStructure() {
  const page = await ouvrir();
  await avecReleve(page, releveDeStructure());
  await envoyer(page, messages.initial(true));
  await envoyer(page, messages.bilan(1, bilanDeStructure));
  await envoyer(page, structure(1));
  return page;
}

test('la lecture de la structure se demande au relevé, sous son propre numéro', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, releveDeStructure());
    await page.waitForFunction(() => window.demandes.some((demande) => demande.type === 'lire-structure'));
    assert.deepEqual(await demandesDe(page, 'lire-structure'), [{ type: 'lire-structure', demande: 1 }]);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('À faire dans Figma range les six constats sous leurs intertitres, chacun de son type', async () => {
  const page = await ouvrirLaStructure();
  try {
    await page.locator('#onglet-a-faire').click();
    const panneau = page.locator('#panneau-a-faire');
    assert.deepEqual(await panneau.locator('.intertitre-structure h2').allTextContents(), ['Alias', 'Modes', 'Valeurs', 'Couches']);
    assert.deepEqual(await panneau.locator('.bloc .gravite').allTextContents(), ['À corriger', 'À corriger', 'À vérifier', 'À vérifier', 'Information', 'À corriger']);
    assert.equal(await panneau.locator('.bloc.a-ton.ton-info').count(), 1);
    assert.equal(await page.locator('#onglet-a-faire .compte').textContent(), '6');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('un chemin cité dans une phrase prend un fond gris, et le mot « vise » reste du texte', async () => {
  const page = await ouvrirLaStructure();
  try {
    await page.locator('#onglet-a-faire').click();
    await page.locator('#panneau-a-faire .bloc-bouton').first().click();
    const voisines = page.locator('#panneau-a-faire .constat-fait:nth-child(2) > span:last-child');
    assert.equal(await voisines.locator('.ch-inline').count(), 2);
    assert.equal((await voisines.textContent()).replace(/\s+/g, ' ').trim(), 'theme/info/soft/page/foreground vise brands/info/light/700');
    assert.equal(await voisines.evaluate((element) => [...element.childNodes].filter((noeud) => noeud.nodeType === 3).map((noeud) => noeud.textContent).join('')), ' vise ');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('Ouvrir la fiche montre la variable en cause dans l’explorateur', async () => {
  const page = await ouvrirLaStructure();
  try {
    await page.locator('#onglet-a-faire').click();
    await page.locator('#panneau-a-faire .bloc-bouton').first().click();
    await page.locator('#panneau-a-faire .constat-actions .btn:visible').click();
    assert.equal(await page.locator('.feuille-titre').textContent(), 'info/soft/page/border');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('une réponse d’une demande remplacée est ignorée', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, releveDeStructure());
    await envoyer(page, messages.initial(true));
    await envoyer(page, messages.bilan(1, bilanDeStructure));
    await envoyer(page, structure(7));
    assert.equal(await page.locator('.structure-liste .bloc').count(), 0);
    assert.equal(await page.locator('#onglet-a-faire .compte:not([hidden])').count(), 0);
    await envoyer(page, structure(1));
    assert.equal(await page.locator('#panneau-a-faire .bloc').count(), 6);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('Corrections ajoute les modes et les scopes aux renommages, avec les mots de la fenêtre Edit variable', async () => {
  const page = await ouvrirLaStructure();
  try {
    const corrections = page.locator('#panneau-a-appliquer .structure-liste');
    assert.deepEqual(await corrections.locator('.intertitre-structure h2').allTextContents(), ['Modes', 'Scopes']);
    await corrections.locator('.bloc-bouton').nth(1).click();
    assert.equal(await corrections.locator('.bloc').nth(1).locator('.colonnes-tete').textContent(), 'Aujourd’huiAprès l’application');
    assert.deepEqual(await corrections.locator('.bloc').nth(1).locator('.meta').allTextContents().then((textes) => textes.slice(0, 1)), ['UCM réserve le dossier surface aux fonds. Aujourd’hui, leur scope est Show in all.']);
    assert.deepEqual(await corrections.locator('.bloc').nth(1).locator('.chemin-apres .ch-ajout').allTextContents(), ['Frame fill, Shape fill', 'Frame fill, Shape fill', 'Frame fill, Shape fill']);
    assert.equal(await page.locator('#onglet-a-appliquer .compte').textContent(), '89');
    assert.match(await page.locator('.structure-pied').textContent(), /^Appliquer écrit 4 corrections de modes et de scopes\.Appliquer$/);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});

test('Appliquer n’envoie que les lignes cochées, et la réponse dit ce qui s’est écrit', async () => {
  const page = await ouvrirLaStructure();
  try {
    const corrections = page.locator('#panneau-a-appliquer .structure-liste');
    await corrections.locator('.bloc-bouton').nth(1).click();
    await corrections.locator('.bloc').nth(1).locator('.diff .case').first().uncheck();
    assert.match(await page.locator('.structure-pied .structure-resume').textContent(), /^Appliquer écrit 3 corrections de modes et de scopes\.$/);
    await page.locator('.structure-pied .btn-primary').click();
    await page.waitForFunction(() => window.demandes.some((demande) => demande.type === 'appliquer-structure'));
    const [envoi] = await demandesDe(page, 'appliquer-structure');
    assert.deepEqual(envoi.ids, ['mode:success/vivid/ring', 'scope:primary/surface/hover', 'scope:info/soft/surface/default']);
    assert.equal(await page.locator('.structure-pied .btn-primary').isDisabled(), true);
    await envoyer(page, { type: 'structure-appliquee', demande: envoi.demande, ecrites: 3, sautees: [] });
    assert.equal(await page.locator('#panneau-a-appliquer .resultat:visible').textContent().then((texte) => texte.includes('3 corrections écrites.')), true);
    assert.equal((await demandesDe(page, 'lire-structure')).length, 2);
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});
