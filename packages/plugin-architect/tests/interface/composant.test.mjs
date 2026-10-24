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
    assert.equal(await page.getByRole('button', { name: 'Analyser' }).isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Constats' }).getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.bouton-panneau .pastille-compte').count(), 0);
    assert.equal(await page.locator('.arch-laterale').count(), 0);
    const alert = composantSimple();
    await envoyer(page, choisir(alert));
    assert.deepEqual(await lecturesDemandees(page), [[2, null]]);
    assert.equal(await page.locator('.vc-vide p').textContent(), 'Lecture du composant…');
    await envoyer(page, { type: 'composant', demande: 2, lecture: alert });
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'Alert');
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
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'Tag');
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
    assert.equal(await page.locator('.vc-tete h2').textContent(), pirate);
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
    assert.deepEqual(await page.locator('.vc-imbriques button').allTextContents(), ['Alert', 'Button×2', 'TileLink×7']);
    await page.getByTitle('Ouvrir Button').click();
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'stresstest:19']]);
    const bouton = composantBouton();
    await envoyer(page, { type: 'composant', demande: 3, lecture: bouton });
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'Button');
    assert.deepEqual(await page.locator('.vc-fil > *').allTextContents(), ['StressTest', '›', 'Button']);
    assert.equal(await page.locator('.vc-ligne').count(), 8);
    assert.deepEqual(await page.locator('.vc-mode').allTextContents(), ['intencial']);
    await page.locator('.vc-fil button').click();
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'StressTest');
    assert.equal(await page.locator('.vc-fil').count(), 0);
    assert.equal(await page.locator('.vc-image').count(), 1);

    const saisie = stressTest.calques.find((calque) => calque.nom === 'UserInput').id;
    await envoyer(page, choisir(stressTest, saisie));
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'UserInput');
    assert.deepEqual(await page.locator('.vc-fil > *').allTextContents(), ['StressTest', '›', 'UserInput']);
    assert.equal(await page.locator('.vc-pied').textContent(), '14 tokens');
    assert.equal(await page.locator('.vc-cadre-portee').count(), 1);
    assert.deepEqual(await page.locator('.vc-imbriques button').allTextContents(), ['Button×2']);
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'stresstest:19']]);
    await page.locator('.vc-fil button').click();
    assert.equal(await page.locator('.vc-tete h2').textContent(), 'StressTest');
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'stresstest:19']]);
  } finally { await fermer(page); }
});

test('le filtre s’ouvre par la loupe, filtre à la frappe et ouvre les sections', async () => {
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
    assert.equal(await page.getByLabel('Variant lu').count(), 0);
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

/** Un jeu de cinq variants, `Severity` et `Variant`, et l'analyse qui compte deux constats : un « à corriger » et un « à vérifier ». */
function jeuDeVariants() {
  const alert = composantSimple();
  const noms = ['Severity=info, Variant=standard', 'Severity=info, Variant=outlined', 'Severity=error, Variant=standard', 'Severity=error, Variant=outlined', 'Severity=warning, Variant=standard'];
  const variants = noms.map((nom, rang) => ({ id: rang === 0 ? alert.calques[0].id : `alert:v${rang}`, nom }));
  const lecture = { ...alert, sujet: { ...alert.sujet, type: 'COMPONENT_SET', variant: noms[0], variants } };
  const constat = (id, type, touches) => ({ id, code: 'C16', type, famille: 'liaisons', variants: touches, layers: [], faits: {} });
  const analyse = { type: 'analyse', analyse: { sujet: 'alert-set', generation: 1 }, statut: 'complete', constats: [constat('a', 'corriger', [noms[1]]), constat('b', 'verifier', [noms[3]])], lecture: null, variants };
  return { lecture, analyse };
}

/** Ces tests jouent des messages d'analyse que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page. */
const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

test('la section Variants montre une ligne par property, les valeurs à constat et la valeur affichée, et « +N » replie le reste', async () => {
  const { lecture, analyse } = jeuDeVariants();
  const page = await ouvrirComposant(lecture, { image: false });
  try {
    assert.equal(await page.locator('.variants').count(), 0, 'pas de section avant l’analyse');
    await envoyer(page, analyse);
    assert.deepEqual(await page.locator('.axe-nom').allTextContents(), ['Severity', 'Variant']);
    assert.equal(await page.locator('.variants-tete h3').textContent(), 'Variants5');
    assert.deepEqual(await page.locator('.axe').nth(0).locator('.valeur-axe').allTextContents(), ['info1', 'error1', '+1']);
    assert.deepEqual(await page.locator('.axe').nth(1).locator('.valeur-axe').allTextContents(), ['standard', 'outlined2']);
    assert.equal(await page.locator('.valeur-axe.choisie').count(), 2);
    assert.equal(await page.locator('.variants-affiche').textContent(), 'AffichéSeverity=info, Variant=standard');
    await page.locator('.valeur-axe.plus').click();
    assert.deepEqual(await page.locator('.axe').nth(0).locator('.valeur-axe').allTextContents(), ['info1', 'error1', 'warning']);
    assert.equal(await page.locator('.vc-sous select').count(), 0);
  } finally { await terminer(page); }
});

test('une puce choisit le variant qui garde le plus de valeurs affichées, sans changer la sélection', async () => {
  const { lecture, analyse } = jeuDeVariants();
  const page = await ouvrirComposant(lecture, { image: false });
  try {
    await envoyer(page, analyse);
    await page.locator('.valeur-axe[data-propriete="Severity"][data-valeur="error"]').click();
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'alert:v2']]);
    assert.equal(await page.evaluate(() => window.demandes.filter((demande) => demande.type === 'selectionner').length), 0);
  } finally { await terminer(page); }
});

test('le lien Tableau croise deux properties ; une cellule sans variant est inactive', async () => {
  const { lecture, analyse } = jeuDeVariants();
  const page = await ouvrirComposant(lecture, { image: false });
  try {
    await envoyer(page, analyse);
    await page.getByRole('button', { name: 'Tableau' }).click();
    assert.equal(await page.locator('.tableau-cellule').count(), 6);
    assert.equal(await page.locator('.tableau-cellule:disabled').count(), 1);
    await page.getByRole('button', { name: 'Tableau' }).click();
    assert.equal(await page.locator('.tableau-grille').count(), 0);
    await page.getByRole('button', { name: 'Tableau' }).click();
    await page.locator('.tableau-cellule').nth(3).click();
    assert.deepEqual(await lecturesDemandees(page), [[2, null], [3, 'alert:v3']]);
  } finally { await terminer(page); }
});

test('le bouton Constats ouvre le panneau, demande la taille ouverte sans la ranger, et compte les constats', async () => {
  const { lecture, analyse } = jeuDeVariants();
  const page = await ouvrirComposant(lecture, { image: false });
  try {
    await page.setViewportSize({ width: 1040, height: 760 });
    await page.getByRole('button', { name: 'Constats' }).click();
    await page.waitForFunction(() => window.demandes.some((demande) => demande.type === 'resize'));
    assert.deepEqual(await page.evaluate(() => window.demandes.filter((demande) => demande.type === 'resize')), [{ type: 'resize', largeur: 1040, hauteur: 760, fin: false }]);
    await page.locator('.arch-laterale').waitFor();
    assert.equal(await page.locator('.arch-laterale').isVisible(), true);
    assert.equal(await page.locator('.arch-resume .meta').textContent(), '5 variants, pas encore analysé');
    assert.equal(await page.locator('.arch-laterale .alerte').count(), 1);
    await envoyer(page, analyse);
    assert.equal(await page.locator('.bouton-panneau .pastille-compte').textContent(), '2');
    assert.equal(await page.locator('.bouton-panneau .pastille-compte.ton-corriger').count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).isVisible(), true);
    await page.getByRole('button', { name: 'Constats' }).click();
    assert.equal(await page.locator('.arch-laterale').count(), 0);
  } finally { await terminer(page); }
});

test('la frontière se tire aux flèches et garde la largeur minimale de la vue', async () => {
  const { lecture } = jeuDeVariants();
  const page = await ouvrirComposant(lecture, { image: false });
  try {
    await page.setViewportSize({ width: 1040, height: 760 });
    await page.getByRole('button', { name: 'Constats' }).click();
    const largeur = () => page.locator('.vc').evaluate((vue) => Math.round(vue.getBoundingClientRect().width));
    assert.equal(await largeur(), 400);
    await page.locator('.arch-poignee').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await largeur(), 424);
    for (let fois = 0; fois < 10; fois += 1) await page.keyboard.press('ArrowLeft');
    assert.equal(await largeur(), 320);
  } finally { await terminer(page); }
});
