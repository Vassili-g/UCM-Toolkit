/**
 * Les interactions de l'interface compilée, dans Chromium, avec les messages
 * du sandbox simulés. Les relevés viennent des fixtures, compilées par la
 * galerie (`npm run galerie` précède ce test dans `test:ui`).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test, { after, before } from 'node:test';
import { chromium } from 'playwright';

const exiger = createRequire(import.meta.url);
const { projetLibre, cinqCollections, grandReleve, constructeur, couleur, texte } = exiger('../../dist/galerie-fixtures.cjs');
const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });

/** Relève chaque demande que l'interface envoie au sandbox ; posé avant le bundle. */
const RELEVE = `<script>
  // La page de test n'est pas un contexte sécurisé : le presse-papiers est simulé.
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (texte) => { window.copie = texte; }, readText: async () => window.copie } });
  window.demandes = [];
  window.addEventListener('message', (event) => {
    const message = event.data && event.data.pluginMessage;
    if (message && message.type) window.demandes.push(message);
  });
</script>`;

/**
 * Dans une page sans iframe, `parent` est la fenêtre elle-même : le relevé voit
 * aussi les messages que le test joue au nom du sandbox.
 */
const MESSAGES_DU_SANDBOX = new Set(['preferences', 'preferences-rangees', 'progression', 'releve', 'lecture-echouee', 'annulation', 'consommateurs', 'selection', 'calque-affiche', 'valeurs-de-figma', 'recette-palettes']);

/** Les demandes qu'un explorateur en lecture seule peut envoyer. */
const DEMANDES_PERMISES = new Set(['lire-preferences', 'ranger-preferences', 'lire-releve', 'annuler', 'chercher-consommateurs', 'afficher-calque', 'verifier-sur-calque', 'lire-recette-palettes', 'resize']);

async function ouvrir({ largeur = 1200, hauteur = 800, classe = '', presse = true } = {}) {
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, permissions: presse ? ['clipboard-read', 'clipboard-write'] : [] });
  const page = await contexte.newPage();
  page.setDefaultTimeout(5000);
  const erreurs = [];
  page.on('pageerror', (erreur) => erreurs.push(erreur.message));
  await page.setContent(html.replace('<head>', () => `<head>${RELEVE}`).replace('<html lang="fr" dir="ltr">', () => `<html lang="fr" dir="ltr" class="${classe}">`));
  page.erreurs = erreurs;
  return page;
}

async function envoyer(page, message) {
  await page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), message);
  await page.waitForTimeout(30);
}

async function avecReleve(page, releve, demande = 1) {
  await envoyer(page, { type: 'releve', demande, releve });
}

async function fermer(page) {
  assert.deepEqual(page.erreurs, []);
  const demandes = await page.evaluate(() => window.demandes.map((demande) => demande.type));
  assert.deepEqual(demandes.filter((type) => !DEMANDES_PERMISES.has(type) && !MESSAGES_DU_SANDBOX.has(type)), []);
  await page.context().close();
}

test('les surfaces restent sombres sous un hôte clair comme sous un hôte sombre', async () => {
  for (const classe of ['', 'figma-dark']) {
    const page = await ouvrir({ classe });
    try {
      await avecReleve(page, projetLibre());
      const fonds = await page.evaluate(() => ['body', '.barre', '.centre', '.inspecteur', '.recherche'].map((selecteur) => getComputedStyle(document.querySelector(selecteur)).backgroundColor));
      for (const fond of fonds) {
        const [r, g, b] = fond.match(/\d+/g).map(Number);
        assert.ok(r < 80 && g < 80 && b < 80, `${classe || 'clair'} : ${fond}`);
      }
    } finally { await fermer(page); }
  }
});

test('un groupe montre ses descendants ; replier garde la table ; suivre un alias puis Retour restaure groupe, token et défilement', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator(`[data-focus='chevron:["interface","card"]']`).click();
    await page.locator(`[data-focus='choix:["interface","card"]']`).click();
    const noms = () => page.locator('.nom-de-token').allTextContents();
    assert.deepEqual(await noms(), ['fill', 'gap', 'header/fill', 'header/title']);
    await page.locator(`[data-focus='chevron:["interface","card"]']`).click();
    assert.equal(await page.locator(`[data-focus='choix:["interface","card","header"]']`).count(), 0);
    assert.deepEqual(await noms(), ['fill', 'gap', 'header/fill', 'header/title']);
    await page.locator('[data-focus="nom:entete-fond"]').click();
    await page.getByRole('button', { name: 'Suivre l’alias vers Couleurs / surface' }).first().click();
    assert.equal(await page.locator('.table-titre').textContent(), 'Couleurs');
    assert.equal(await page.locator('.inspecteur-titre').textContent(), 'surface');
    await page.getByRole('button', { name: '← Retour' }).click();
    assert.equal(await page.locator('.table-titre').textContent(), 'card');
    assert.equal(await page.locator('.inspecteur-titre').textContent(), 'card/header/fill');
  } finally { await fermer(page); }
});

test('une réponse d’une lecture remplacée ne remplace pas le relevé courant', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await page.waitForTimeout(30);
    const derniere = await page.evaluate(() => window.demandes.filter((demande) => demande.type === 'lire-releve').pop().demande);
    assert.equal(derniere, 2);
    await avecReleve(page, cinqCollections(), 1);
    assert.equal(await page.locator('.table-titre').textContent(), 'Interface');
    await avecReleve(page, cinqCollections(), 2);
    assert.equal(await page.locator('.table-titre').textContent(), 'components');
  } finally { await fermer(page); }
});

test('zéro, faux et le texte vide se copient exactement ; un refus du presse-papiers laisse le texte sélectionnable', async () => {
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

test('un nom qui contient du HTML reste du texte inerte', async () => {
  const page = await ouvrir();
  try {
    const c = constructeur();
    c.collection('x', '<img src=x onerror="window.pirate=1">', ['M']);
    c.variable('v', 'x', '<b>gras</b>/<script>window.pirate=2</script>', 'STRING', { M: texte('<i>valeur</i>') });
    await avecReleve(page, c.releve());
    await page.locator('[data-focus="nom:v"]').click();
    assert.equal(await page.evaluate(() => window.pirate), undefined);
    assert.equal(await page.locator('b, i, img:not(svg img)').count(), 0);
    assert.match(await page.locator('.inspecteur-titre').textContent(), /<b>gras<\/b>/);
  } finally { await fermer(page); }
});

test('la chaîne paraît au survol après 250 ms et se ferme par Échap ; le focus clavier la montre aussi', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    const nom = page.locator('[data-focus="nom:bouton-fond"]');
    await nom.hover();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.bulle').isVisible(), false);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.bulle').isVisible(), true);
    assert.equal(await page.locator('.bulle .etape').count(), 5);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.bulle').isVisible(), false);
    await page.mouse.move(5, 790);
    await nom.focus();
    await page.waitForTimeout(350);
    assert.equal(await page.locator('.bulle').isVisible(), true);
  } finally { await fermer(page); }
});

test('changer de contexte garde le token inspecté et recalcule son résultat', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    assert.equal(await page.locator('.inspecteur .valeur-grande').textContent(), '#E06666');
    await page.getByLabel('Mode de brand', { exact: true }).selectOption('marque:Beta');
    assert.equal(await page.locator('.inspecteur-titre').textContent(), 'button/primary/bg');
    assert.equal(await page.locator('.inspecteur .valeur-grande').textContent(), '#2E9E5B');
  } finally { await fermer(page); }
});

test('dix mille variables : la table ne monte que les lignes visibles, et la recherche reste globale', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, grandReleve());
    const rendues = await page.locator('.table-ligne').count();
    assert.ok(rendues > 5 && rendues < 60, `${rendues} lignes rendues`);
    await page.locator('.recherche').fill('token-499');
    assert.match(await page.locator('.table-tete .note').textContent(), /20 résultats dans toutes les collections/);
  } finally { await fermer(page); }
});

test('importer un tokens.json ajoute la correspondance ; le retirer rend l’inspecteur du socle', async () => {
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

test('une simulation s’annonce, ne demande aucune écriture, et Réinitialiser rend le relevé d’origine', async () => {
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

test('le clavier atteint l’arbre, la table, l’inspecteur, ses copies et les onglets', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    const actif = () => page.evaluate(() => document.activeElement?.dataset.focus ?? document.activeElement?.textContent);
    await page.locator(`[data-focus='choix:["interface"]']`).focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await actif(), 'choix:["interface","card"]');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator(`[data-focus='choix:["interface","card","header"]']`).count(), 1);
    await page.locator(`[data-focus='choix:["interface","card"]']`).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.table-titre').textContent(), 'card');
    await page.locator('[data-focus="nom:carte-gap"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.inspecteur-titre').textContent(), 'card/gap');
    const copier = page.getByRole('group', { name: 'Copier' }).getByRole('button', { name: 'Nom Figma' });
    await copier.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'card/gap');
    await page.locator('#onglet-table').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#onglet-comparer').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panneau-comparer .vue-titre').textContent(), 'Un token, deux contextes');
    await page.keyboard.press('ArrowLeft');
    await page.locator('.recherche').focus();
    await page.keyboard.type('papier');
    assert.match(await page.locator('.table-tete .note').textContent(), /1 résultat/);
  } finally { await fermer(page); }
});

test('à la taille minimale, l’inspecteur ouvert ne masque ni la recherche ni Actualiser', async () => {
  const page = await ouvrir({ largeur: 560, hauteur: 480 });
  try {
    await avecReleve(page, cinqCollections());
    await page.locator('[data-focus="nom:bouton-fond"]').click();
    const inspecteur = await page.locator('.inspecteur').boundingBox();
    for (const selecteur of ['.recherche', '.barre .bouton-discret >> nth=1']) {
      const boite = await page.locator(selecteur).boundingBox();
      assert.ok(boite.y + boite.height <= inspecteur.y, `${selecteur} sous l’inspecteur`);
    }
    await page.getByRole('button', { name: 'Fermer' }).click();
    assert.equal(await page.locator('.inspecteur').isVisible(), false);
  } finally { await fermer(page); }
});
