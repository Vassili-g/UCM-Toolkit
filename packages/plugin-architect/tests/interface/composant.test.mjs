/** Les interactions de la vue Composant. Le relevé part sous la demande 1 au chargement ; la première lecture d’un composant prend la demande 2. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, ouvrir, envoyer, fermer, choisir, lecturesDemandees, ligne, apercuDe, ouvrirComposant, FENETRE_COMPOSANT, fixtures } from './aide.mjs';

lancerLeNavigateur();
const { composantSimple, composantComplexe, composantBouton, composantInterrompu } = fixtures;

test('une sélection affiche le composant ; la disposition étroite monte la barre, sans arbre, ni onglets, ni inspecteur', async () => {
  const page = await ouvrir(FENETRE_COMPOSANT);
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
  const page = await ouvrir(FENETRE_COMPOSANT);
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
  const page = await ouvrir(FENETRE_COMPOSANT);
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
  const page = await ouvrir(FENETRE_COMPOSANT);
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
    assert.deepEqual(await page.locator('.vc-section-tete').evaluateAll((titres) => titres.map((titre) => `${titre.textContent} ${titre.getAttribute('aria-expanded')}`)), ['Couleur18 false', 'Forme10 false', 'Espacement15 false', 'Taille4 false', 'Texte5 false']);
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
