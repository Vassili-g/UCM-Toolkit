/** Les interactions du domaine arbre et tableau des tokens : arbre, table, valeurs, survol de la chaîne, poignées de largeur. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, envoyer, avecReleve, fermer, fixtures, exiger } from './aide.mjs';

lancerLeNavigateur();
const { projetLibre, cinqCollections, grandReleve, constructeur, texte } = fixtures;

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
  } finally { await fermer(page); }
});

test('le nom terminal reste clair et son chemin secondaire dans un groupe et dans la recherche', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    await page.locator(`[data-focus='choix:["interface","card"]']`).click();
    const nom = page.locator('[data-focus="nom:entete-fond"]');
    assert.equal(await nom.textContent(), 'header/fill');
    assert.equal(await nom.locator('.ch-groupe').first().textContent(), 'header');
    assert.equal(await nom.locator('.ch-variable').textContent(), 'fill');
    const couleurs = await nom.evaluate((element) => [getComputedStyle(element.querySelector('.ch-variable')).color, getComputedStyle(element.querySelector('.ch-groupe')).color]);
    const style = await nom.evaluate((element) => ({ fond: getComputedStyle(element).backgroundColor, alignement: getComputedStyle(element).textAlign }));
    assert.equal(style.fond, 'rgba(0, 0, 0, 0)');
    assert.equal(style.alignement, 'left');
    assert.notEqual(couleurs[0], couleurs[1]);
    const luminosite = (couleur) => couleur.match(/\d+/g).slice(0, 3).map(Number).reduce((somme, canal) => somme + canal, 0);
    assert.ok(luminosite(couleurs[0]) > luminosite(couleurs[1]));
    await page.locator('.arbre .recherche').fill('card/header/fill');
    assert.equal(await nom.textContent(), 'card/header/fill');
    assert.equal(await nom.locator('.ch-groupe').first().textContent(), 'card');
    await page.locator('.arbre .recherche').fill('zero');
    const racine = page.locator('.nom-de-token');
    assert.equal(await racine.textContent(), 'zero');
    assert.equal(await racine.locator('.ch-groupe').count(), 0);
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

test('le clavier atteint l’arbre, la table et la recherche', async () => {
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

    assert.equal(await largeur('.arbre'), 200);
    await glisser('Largeur des collections', 80);
    assert.equal(await largeur('.arbre'), 280);
    assert.deepEqual((await rangees()).pop(), { nom: 340, arbre: 280 });

    await page.getByRole('separator', { name: 'Largeur des collections', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await largeur('.arbre'), 264);

    await page.getByRole('separator', { name: 'Largeur de Nom', exact: true }).dblclick();
    assert.equal(await largeur('.cellule-nom'), 240);
    assert.deepEqual((await rangees()).pop(), { arbre: 264 });

    await envoyer(page, { type: 'preferences', preferences: { vueCompacte: false, largeurs: { arbre: 9000, type: 150 } } });
    assert.equal(await largeur('.arbre'), 480);
    assert.equal(await largeur('.cellule-type'), 150);
  } finally { await fermer(page); }
});

test('le bouton de l’arbre replie toutes les sections, sauf celle qui est choisie', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    const chevron = (collection, ...segments) => page.locator(`[data-focus='chevron:${JSON.stringify([collection, ...segments])}']`);
    await chevron('interface', 'card').click();
    await chevron('mesures').click();
    assert.equal(await chevron('interface', 'card').getAttribute('aria-expanded'), 'true');
    assert.equal(await chevron('mesures').getAttribute('aria-expanded'), 'true');
    await page.getByRole('button', { name: 'Replier les autres sections' }).click();
    assert.equal(await chevron('interface').getAttribute('aria-expanded'), 'true');
    assert.equal(await chevron('interface', 'card').getAttribute('aria-expanded'), 'false');
    assert.equal(await chevron('mesures').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.arbre-choix[aria-current="true"] .arbre-libelle').textContent(), 'Interface');
  } finally { await fermer(page); }
});

test('les modes affichés tiennent sur une ligne, un menu par collection à plusieurs modes, et le choix change le contexte', async () => {
  const page = await ouvrir();
  try {
    await avecReleve(page, projetLibre());
    const menus = page.locator('.modes-affiches .mode-col');
    assert.deepEqual(await menus.locator('.collection').allTextContents(), ['Mesures', 'Couleurs']);
    assert.equal(await page.locator('.modes-affiches').evaluate((element) => getComputedStyle(element).flexWrap), 'nowrap');
    await page.getByLabel('Mode de Couleurs').selectOption('couleurs:Jour');
    assert.match(await page.locator('.table-ligne').first().textContent(), /F7F8FA/i);
  } finally { await fermer(page); }
});

/**
 * La collection choisie dans l'arbre filtre la barre latérale : une puce sous les onglets la nomme, sa croix enlève le filtre,
 * qui revient au prochain choix dans l'arbre. Les demandes de Nomenclature sortent de la liste de `fermer` : la page se ferme ici
 * sans les compter.
 */
test('la collection choisie filtre la barre latérale par une puce, que sa croix enlève', async () => {
  const { releveIntencial } = exiger('../../galerie/etats/nomenclature.cjs');
  const { messages, renommagesInterface } = exiger('../../galerie/nomenclature/donnees.cjs');
  const page = await ouvrir();
  try {
    await avecReleve(page, releveIntencial());
    await page.locator(`[data-focus='choix:["interface"]']`).click();
    await envoyer(page, messages.initial(true));
    await envoyer(page, messages.bilan(1, renommagesInterface));
    const puce = page.locator('.filtre-ligne .puce-filtre');
    assert.equal(await puce.textContent(), 'collectionInterface×');
    await page.locator('.filtre-ligne .puce-x').click();
    assert.equal(await page.locator('.filtre-ligne').isVisible(), false);
    assert.equal(await page.locator('.table-ligne .ch-lien').count(), 0);
    await page.locator(`[data-focus='choix:["interface"]']`).click();
    assert.equal(await puce.textContent(), 'collectionInterface×');
    await page.locator(`[data-focus='choix:["brands"]']`).click();
    assert.equal(await puce.textContent(), 'collectionbrands×');
    assert.deepEqual(page.erreurs, []);
  } finally { await page.context().close(); }
});
