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
const { projetLibre, cinqCollections, grandReleve, constructeur, couleur, texte, composantSimple, composantComplexe, composantBouton, composantInterrompu, peinturesDe } = exiger('../../dist/galerie-fixtures.cjs');
const { imagePng } = exiger('../../galerie/image.cjs');
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
const MESSAGES_DU_SANDBOX = new Set(['preferences', 'preferences-rangees', 'progression', 'releve', 'lecture-echouee', 'annulation', 'selection', 'recette-palettes', 'disposition', 'composant', 'apercu-du-composant']);

/** Les demandes qu'un explorateur en lecture seule peut envoyer. */
const DEMANDES_PERMISES = new Set(['lire-preferences', 'ranger-preferences', 'lire-releve', 'annuler', 'lire-recette-palettes', 'lire-composant', 'changer-disposition', 'resize']);

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

test('un groupe montre ses descendants ; replier garde la table ; suivre un alias ouvre le groupe de sa cible', async () => {
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
  } finally { await fermer(page); }
});

test('le nom terminal reste clair et son chemin secondaire dans un groupe et dans la recherche', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator(`[data-focus='choix:["interface","card"]']`).click();
    const nom = page.locator('[data-focus="nom:entete-fond"]');
    assert.equal(await nom.textContent(), 'header/fill');
    assert.equal(await nom.locator('.nom-de-token-chemin').textContent(), 'header/');
    const couleurs = await nom.evaluate((element) => [getComputedStyle(element).color, getComputedStyle(element.firstElementChild).color]);
    const style = await nom.evaluate((element) => ({ fond: getComputedStyle(element).backgroundColor, alignement: getComputedStyle(element).textAlign }));
    assert.equal(style.fond, 'rgba(0, 0, 0, 0)');
    assert.equal(style.alignement, 'left');
    assert.notEqual(couleurs[0], couleurs[1]);
    const luminosite = (couleur) => couleur.match(/\d+/g).slice(0, 3).map(Number).reduce((somme, canal) => somme + canal, 0);
    assert.ok(luminosite(couleurs[0]) > luminosite(couleurs[1]));
    await page.locator('.arbre .recherche').fill('card/header/fill');
    assert.equal(await nom.textContent(), 'card/header/fill');
    assert.equal(await nom.locator('.nom-de-token-chemin').textContent(), 'card/header/');
    await page.locator('.arbre .recherche').fill('zero');
    const racine = page.locator('.nom-de-token');
    assert.equal(await racine.textContent(), 'zero');
    assert.equal(await racine.locator('.nom-de-token-chemin').textContent(), '');
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
    assert.equal(await page.locator('.barre select').count(), 0);
    await page.locator('#onglet-comparer').click();
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
    assert.deepEqual(await page.locator('.onglet').allTextContents(), ['Variables', 'Comparer', 'Dépendants', 'Diagnostics', 'Intégrations', 'Relevés']);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#onglet-comparer').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panneau-comparer .vue-titre').textContent(), 'Un token, deux contextes');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('.barre .recherche, .arbre > .note').count(), 0);
    await page.locator('.arbre .recherche').focus();
    await page.keyboard.type('papier');
    assert.match(await page.locator('.table-tete .note').textContent(), /1 résultat/);
  } finally { await fermer(page); }
});

test('une poignée règle la largeur d’une colonne et de l’arbre ; le nom et l’arbre se rangent, un double clic rend le défaut', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    const largeur = async (selecteur) => Math.round((await page.locator(selecteur).first().boundingBox()).width);
    const glisser = async (nom, ecart) => {
      const boite = await page.getByRole('separator', { name: nom, exact: true }).boundingBox();
      const [x, y] = [boite.x + boite.width / 2, boite.y + boite.height / 2];
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + ecart, y, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(30);
    };
    const rangees = () => page.evaluate(() => window.demandes.filter((demande) => demande.type === 'ranger-preferences').map((demande) => demande.preferences.largeurs));

    await glisser('Largeur de Valeur (défaut)', -2000);
    assert.equal(await largeur('.cellule-valeur'), 120);
    assert.deepEqual(await rangees(), []);

    assert.equal(await largeur('.cellule-nom'), 240);
    await glisser('Largeur de Nom', 100);
    assert.equal(await largeur('.cellule-nom'), 340);
    assert.equal(await largeur('.cellule-valeur'), 120);
    assert.deepEqual((await rangees()).pop(), { nom: 340 });

    assert.equal(await largeur('.arbre'), 220);
    await glisser('Largeur des collections', 80);
    assert.equal(await largeur('.arbre'), 300);
    assert.deepEqual((await rangees()).pop(), { nom: 340, arbre: 300 });

    await page.getByRole('separator', { name: 'Largeur des collections', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await largeur('.arbre'), 284);

    await page.getByRole('separator', { name: 'Largeur de Nom', exact: true }).dblclick();
    assert.equal(await largeur('.cellule-nom'), 240);
    assert.deepEqual((await rangees()).pop(), { arbre: 284 });

    await envoyer(page, { type: 'preferences', preferences: { vueCompacte: false, palettes: false, profilUcm: false, associations: {}, exceptions: {}, largeurs: { arbre: 9000, type: 150 } } });
    assert.equal(await largeur('.arbre'), 480);
    assert.equal(await largeur('.cellule-type'), 150);
  } finally { await fermer(page); }
});

test('à la taille minimale, l’inspecteur ouvert ne masque ni la recherche, ni la bascule, ni Actualiser', async () => {
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

/*
 * La vue composant. Le relevé part sous la demande 1 au chargement ; la
 * première lecture d'un composant prend la demande 2.
 */
const choisir = (lecture, portee = lecture.sujet.id, ignores = 0) => ({ type: 'selection', sujet: { id: lecture.sujet.id, portee }, ignores });
/** Les lectures de composant demandées ; une demande arrive au relevé un instant après le geste. */
async function lecturesDemandees(page) {
  await page.waitForTimeout(30);
  return page.evaluate(() => window.demandes.filter((demande) => demande.type === 'lire-composant').map((demande) => [demande.demande, demande.calque]));
}
const ligne = (page, debut) => page.locator(`[data-focus^='ligne:${debut}']`);

function apercuDe(lecture, demande) {
  const { largeur, hauteur } = lecture.calques[0].boite;
  return { type: 'apercu-du-composant', demande, sujet: lecture.sujet.id, octets: [...imagePng(largeur, hauteur, peinturesDe(lecture))], largeur, hauteur, origine: { x: 0, y: 0 } };
}

/** Ouvre la fenêtre étroite sur un composant sélectionné et lu, image comprise. */
async function ouvrirComposant(lecture, { image = true } = {}) {
  const page = await ouvrir({ largeur: 364, hauteur: 724 });
  await envoyer(page, { type: 'disposition', disposition: 'etroite' });
  await envoyer(page, choisir(lecture));
  await envoyer(page, { type: 'composant', demande: 2, lecture });
  if (image) {
    await envoyer(page, apercuDe(lecture, 2));
    await page.waitForFunction(() => [...document.images].every((candidate) => candidate.complete && candidate.naturalWidth > 0));
  }
  return page;
}

test('une sélection affiche le composant ; la disposition étroite monte la barre, sans arbre, ni onglets, ni inspecteur', async () => {
  const page = await ouvrir({ largeur: 364, hauteur: 724 });
  try {
    await envoyer(page, { type: 'disposition', disposition: 'etroite' });
    assert.equal(await page.locator('.vc-vide p').textContent(), 'Sélectionnez un composant');
    for (const selecteur of ['.arbre', '.onglets', '.inspecteur', '.table']) assert.equal(await page.locator(selecteur).count(), 0, selecteur);
    assert.equal(await page.locator('.barre').evaluate((barre) => barre.offsetHeight), 44);
    assert.equal(await page.getByRole('button', { name: 'Composant' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.barre-lecture').isVisible(), false);
    const alert = composantSimple();
    await envoyer(page, choisir(alert));
    assert.deepEqual(await lecturesDemandees(page), [[2, null]]);
    assert.equal(await page.locator('.vc-vide p').textContent(), 'Lecture du composant…');
    await envoyer(page, { type: 'composant', demande: 2, lecture: alert });
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇Alert');
    assert.equal(await page.locator('.vc-sous').textContent(), 'info · standard');
    assert.equal(await page.locator('.vc-ligne').count(), 10);
    assert.deepEqual(await page.locator('.vc-section-tete span').allTextContents(), ['Couleur', 'Forme', 'Espacement', 'Taille', 'Texte']);
    assert.equal(await page.locator('.vc-pied').textContent(), '10 tokens · 11 liaisons');
    assert.equal(await page.locator('.vc-apercu').count(), 0);
    await envoyer(page, apercuDe(alert, 2));
    assert.deepEqual(await page.locator('.vc-echelle').evaluate((element) => [element.offsetWidth, Math.round(element.offsetHeight)]), [310, 47]);
    await envoyer(page, { type: 'selection', sujet: null, ignores: 0 });
    assert.equal(await page.locator('.vc-vide p').textContent(), 'Sélectionnez un composant');
  } finally { await fermer(page); }
});

test('un clic déplie la chaîne, la copie écrit la valeur, et le focus revient sur la ligne', async () => {
  const page = await ouvrirComposant(composantSimple());
  try {
    const rayon = ligne(page, 'components/alert/sizes/border-radius');
    assert.equal(await rayon.getAttribute('aria-expanded'), 'false');
    assert.equal(await rayon.locator('.vc-points i').count(), 3);
    await rayon.click();
    assert.equal(await rayon.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.focus?.startsWith('ligne:components/alert/sizes/border-radius')), true);
    assert.deepEqual(await page.locator('.vc-etape-nom').allTextContents(), ['alert/sizes/border-radius', 'radius/md', 'dimensions/6']);
    assert.deepEqual(await page.locator('.vc-etape-col').allTextContents(), ['components', 'layouts', 'primitives']);
    assert.equal(await page.locator('.vc-sur-calques').textContent(), 'Rayon · Alert');
    await page.locator('.vc-copie').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '6');
    assert.match(await page.locator('.annonce').textContent(), /Copié : 6/);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.locator('.vc-copie').focus();
    await rayon.focus();
    await page.keyboard.press('Enter');
    assert.equal(await rayon.getAttribute('aria-expanded'), 'false');
    await ligne(page, 'style:S:Body/Large').click();
    assert.deepEqual(await page.locator('.vc-champs li').first().locator('span, em, code').allTextContents(), ['fontFamily', 'primitives', 'Open Sans']);
  } finally { await fermer(page); }
});

test('une réponse d’une lecture de composant remplacée est ignorée', async () => {
  const page = await ouvrir({ largeur: 364, hauteur: 724 });
  try {
    await envoyer(page, { type: 'disposition', disposition: 'etroite' });
    const alert = composantSimple();
    const tag = composantInterrompu();
    await envoyer(page, choisir(alert));
    await envoyer(page, choisir(tag));
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, null]]);
    assert.deepEqual(await page.evaluate(() => window.demandes.filter((demande) => demande.type === 'annuler').map((demande) => demande.demande)), [2]);
    await envoyer(page, { type: 'composant', demande: 2, lecture: alert });
    assert.equal(await page.locator('.vc-vide p').textContent(), 'Lecture du composant…');
    await envoyer(page, { type: 'composant', demande: 3, lecture: tag });
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇Tag');
    assert.deepEqual(await page.locator('.vc-mode').allTextContents(), ['Light', 'Apicil']);
    await envoyer(page, apercuDe(alert, 2));
    assert.equal(await page.locator('.vc-apercu').count(), 0);
    assert.equal(await ligne(page, 'components/tag/outline/foreground').locator('.vc-valeur').textContent(), 'interrompue');
    await ligne(page, 'components/tag/outline/foreground').click();
    assert.equal(await page.locator('.vc-rompue-texte').textContent(), 'Cible inaccessible');
    assert.equal(await page.locator('.vc-copie').count(), 0);
    await page.getByRole('button', { name: '1 sans token' }).click();
    assert.deepEqual(await page.locator('.vc-directes li').allTextContents(), ['Marge11']);
  } finally { await fermer(page); }
});

test('une lecture de composant qui lève s’annonce à la place de la liste', async () => {
  const page = await ouvrir({ largeur: 364, hauteur: 724 });
  try {
    await envoyer(page, { type: 'disposition', disposition: 'etroite' });
    await envoyer(page, choisir(composantSimple()));
    await envoyer(page, { type: 'lecture-echouee', demande: 2, message: 'Accès refusé' });
    assert.match(await page.locator('.vc-vide p').textContent(), /La lecture du composant a échoué : Accès refusé/);
  } finally { await fermer(page); }
});

test('le nom d’un calque qui contient du HTML s’insère comme du texte', async () => {
  const alert = composantSimple();
  const pirate = '<img src=x onerror="window.pirate=1">';
  const lecture = { ...alert, sujet: { ...alert.sujet, nom: '<b>Alert</b>' }, calques: alert.calques.map((calque, rang) => (rang === 1 ? { ...calque, nom: pirate } : calque)) };
  const page = await ouvrir({ largeur: 364, hauteur: 724 });
  try {
    await envoyer(page, { type: 'disposition', disposition: 'etroite' });
    await envoyer(page, choisir(lecture, lecture.calques[1].id));
    await envoyer(page, { type: 'composant', demande: 2, lecture });
    assert.equal(await page.locator('.vc-tete h2').textContent(), `#${pirate}`);
    assert.deepEqual(await page.locator('.vc-fil > *').allTextContents(), ['<b>Alert</b>', '›', pirate]);
    await page.locator('.vc-ligne').first().click();
    assert.match(await page.locator('.vc-sur-calques').first().textContent(), /<img src=x/);
    assert.equal(await page.evaluate(() => window.pirate), undefined);
    assert.equal(await page.locator('.vc-tete b, .vc-fil b, .vc img').count(), 0);
  } finally { await fermer(page); }
});

test('un composant complexe replié tient sans défilement à 364 × 724 ; une pastille du résumé ouvre sa ligne', async () => {
  const page = await ouvrirComposant(composantComplexe());
  try {
    assert.equal(await page.locator('.vc-ligne').count(), 0);
    assert.deepEqual(await page.locator('.vc-section-tete').evaluateAll((titres) => titres.map((titre) => `${titre.textContent} ${titre.getAttribute('aria-expanded')}`)), ['▸Couleur18 false', '▸Forme10 false', '▸Espacement15 false', '▸Taille4 false', '▸Texte5 false']);
    assert.equal(await page.locator('.vc-pied').textContent(), '52 tokens · 91 liaisons');
    const [contenu, visible] = await page.locator('.vc-corps').evaluate((corps) => [corps.scrollHeight, corps.clientHeight]);
    assert.ok(contenu <= visible, `${contenu} px de contenu pour ${visible} px visibles`);
    await page.locator('.vc-resume button').nth(2).click();
    assert.equal(await page.locator('[data-section="couleur"]').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.vc-ligne').count(), 18);
    const ouverte = page.locator('.vc-ligne[aria-expanded="true"]');
    assert.equal(await ouverte.count(), 1);
    assert.equal(await ouverte.locator('.vc-nom').textContent(), 'tilesgrid/colors/tile');
    assert.equal(await ouverte.locator('.vc-fois').textContent(), '×12');
    assert.equal(await page.locator('.vc-sur-calques').textContent(), 'Fond · Tile ×12');
    await page.getByRole('button', { name: 'Tout déplier ou replier' }).click();
    assert.equal(await page.locator('.vc-ligne').count(), 52);
    await page.getByRole('button', { name: 'Tout déplier ou replier' }).click();
    assert.equal(await page.locator('.vc-ligne').count(), 0);
    await page.locator('[data-section="texte"]').click();
    assert.deepEqual(await page.locator('.vc-nom').allTextContents(), ['Title/Medium', 'Body/Medium', 'Label/Small', 'Body/Large', 'Body/Small']);
  } finally { await fermer(page); }
});

test('une frontière envoie lire-composant avec son calque ; la miette revient sans relecture ; une sélection sous le même sujet ne demande rien', async () => {
  const stressTest = composantComplexe();
  const page = await ouvrirComposant(stressTest);
  try {
    assert.deepEqual(await page.locator('.vc-imbriques button').allTextContents(), ['◇ Alert', '◇ Button×2', '◇ TileLink×7']);
    await page.getByTitle('Ouvrir Button').click();
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'stresstest:19']]);
    const bouton = composantBouton();
    await envoyer(page, { type: 'composant', demande: 3, lecture: bouton });
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇Button');
    assert.deepEqual(await page.locator('.vc-fil > *').allTextContents(), ['StressTest', '›', 'Button']);
    assert.equal(await page.locator('.vc-ligne').count(), 8);
    assert.deepEqual(await page.locator('.vc-mode').allTextContents(), ['intencial']);
    await page.locator('.vc-fil button').click();
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇StressTest');
    assert.equal(await page.locator('.vc-fil').count(), 0);
    assert.equal(await page.locator('.vc-image').count(), 1);

    const saisie = stressTest.calques.find((calque) => calque.nom === 'UserInput').id;
    await envoyer(page, choisir(stressTest, saisie));
    assert.equal(await page.locator('.vc-tete h2').textContent(), '#UserInput');
    assert.deepEqual(await page.locator('.vc-fil > *').allTextContents(), ['StressTest', '›', 'UserInput']);
    assert.equal(await page.locator('.vc-pied').textContent(), '14 tokens');
    assert.equal(await page.locator('.vc-cadre-portee').count(), 1);
    assert.deepEqual(await page.locator('.vc-imbriques button').allTextContents(), ['◇ Button×2']);
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'stresstest:19']]);
    await page.locator('.vc-fil button').click();
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇StressTest');
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'stresstest:19']]);
  } finally { await fermer(page); }
});

test('le filtre s’ouvre par la loupe, filtre à la frappe et ouvre les sections ; le choix d’un variant relit ce variant', async () => {
  const alert = composantSimple();
  const lecture = { ...alert, sujet: { ...alert.sujet, type: 'COMPONENT_SET', variants: [{ id: alert.calques[0].id, nom: 'info · standard' }, { id: 'alert:erreur', nom: 'error · standard' }] } };
  const page = await ouvrirComposant(lecture, { image: false });
  try {
    await page.getByRole('button', { name: 'Filtrer' }).click();
    const champ = page.getByLabel('Filtrer les tokens');
    assert.equal(await champ.evaluate((element) => element === document.activeElement), true);
    await champ.pressSequentially('padd');
    assert.deepEqual(await page.locator('.vc-nom').allTextContents(), ['sizes/padding-x', 'sizes/padding-y']);
    assert.equal(await champ.evaluate((element) => element === document.activeElement), true);
    await champ.fill('introuvable');
    assert.equal(await page.locator('.vc-aucun').textContent(), 'Aucun token ne correspond.');
    await page.getByRole('button', { name: 'Filtrer' }).click();
    assert.equal(await page.locator('.vc-ligne').count(), 10);
    await page.getByLabel('Variant lu').selectOption('alert:erreur');
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'alert:erreur']]);
  } finally { await fermer(page); }
});

test('le survol d’une ligne à 12 calques pose 12 cadres ; une boîte absente ou hors de l’image n’en pose aucun', async () => {
  const stressTest = composantComplexe();
  const page = await ouvrirComposant(stressTest);
  try {
    await page.locator('[data-section="couleur"]').click();
    await ligne(page, 'components/stresstest/info/tilesgrid/colors/tile').hover();
    assert.equal(await page.locator('.vc-cadre').count(), 12);
    const [cadre, image] = await page.evaluate(() => [document.querySelector('.vc-cadre').getBoundingClientRect().toJSON(), document.querySelector('.vc-image').getBoundingClientRect().toJSON()]);
    assert.ok(cadre.left >= image.left && cadre.right <= image.right && cadre.top >= image.top && cadre.bottom <= image.bottom, 'le cadre sort de l’image');
    assert.equal(await page.locator('.vc-image').count(), 1);
    await ligne(page, 'components/stresstest/info/base/colors/background').hover();
    assert.equal(await page.locator('.vc-cadre').count(), 1);
    await page.locator('.vc-tete h2').hover();
    assert.equal(await page.locator('.vc-cadre').count(), 0);
    await ligne(page, 'components/stresstest/info/tilesgrid/colors/tile').focus();
    assert.equal(await page.locator('.vc-cadre').count(), 12);
  } finally { await fermer(page); }

  const sansBoites = { ...stressTest, calques: stressTest.calques.map(({ boite, ...calque }, rang) => (rang === 0 ? { ...calque, boite } : rang === 6 ? { ...calque, boite: { x: 9000, y: 9000, largeur: 10, hauteur: 10 } } : calque)) };
  const seconde = await ouvrirComposant(sansBoites);
  try {
    await seconde.locator('[data-section="couleur"]').click();
    await ligne(seconde, 'components/stresstest/info/tilesgrid/colors/tile').hover();
    assert.equal(await seconde.locator('.vc-cadre').count(), 0);
  } finally { await fermer(seconde); }
});

test('la bascule passe de l’explorateur de tokens à la vue composant, qui lit alors la sélection, puis revient', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    const dispositions = async () => {
      await page.waitForTimeout(30);
      return page.evaluate(() => window.demandes.filter((demande) => demande.type === 'changer-disposition').map((demande) => demande.disposition));
    };
    const alert = composantSimple();
    await envoyer(page, choisir(alert));
    assert.deepEqual(await lecturesDemandees(page), []);
    assert.equal(await page.getByRole('button', { name: 'Tokens' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Composant' }).click();
    assert.deepEqual(await dispositions(), ['etroite']);
    assert.deepEqual(await lecturesDemandees(page), [[2, null]]);
    await envoyer(page, { type: 'composant', demande: 2, lecture: alert });
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇Alert');
    assert.equal(await page.locator('.arbre').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).count(), 0);
    await envoyer(page, { type: 'disposition', disposition: 'etroite' });
    assert.equal(await page.locator('.vc-tete h2').textContent(), '◇Alert');
    await page.getByRole('button', { name: 'Tokens' }).click();
    assert.deepEqual(await dispositions(), ['etroite', 'large']);
    assert.equal(await page.locator('.vc').count(), 0);
    assert.equal(await page.locator('.table-titre').textContent(), 'Interface');
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).isVisible(), true);
  } finally { await fermer(page); }
});
