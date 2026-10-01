/** Interactions de l'interface construite d'UCM Palettes, avec les messages du sandbox simulés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test, { after, before } from 'node:test';
import { chromium } from 'playwright';

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });
const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');

test('la préférence anglaise, son enregistrement et sa récupération sont indépendants de la recette', async () => {
  const page = await ouvrir(MINIMALE, 'inconnue');
  try {
    await page.getByRole('tab', { name: 'Create', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    await page.getByRole('button', { name: 'Open shared settings' }).click();
    const langue = page.getByLabel('Language', { exact: true });
    assert.deepEqual(await langue.locator('option').allTextContents(), ['English', 'Français']);
    await langue.selectOption('fr');
    assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).waitFor();
    await page.waitForFunction(() => window.langueRangee === 'fr');
    const suivante = await ouvrir(MINIMALE, await page.evaluate(() => window.langueRangee));
    try { await suivante.getByRole('tab', { name: 'Création', exact: true }).waitFor(); }
    finally { await suivante.close(); }
    assert.deepEqual(await page.evaluate(() => window.demandes), [{ type: 'lire-etat', demande: 1 }]);
  } finally { await page.close(); }
});

test('la bascule conserve les champs incomplets, les cartes ouvertes et les éléments montés', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const champ = page.locator('input[data-mode="light"][data-rang="7"]');
    await champ.fill('0,');
    await page.evaluate(() => {
      window.champConserve = document.querySelector('input[data-mode="light"][data-rang="7"]');
      window.cartesConservees = [...document.querySelectorAll('.carte')];
      window.defilementAvant = document.scrollingElement.scrollTop;
      document.querySelector('#langue-du-plugin').value = 'en';
      document.querySelector('#langue-du-plugin').dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await champ.inputValue(), '0,');
    assert.equal(await champ.evaluate((element) => element === window.champConserve && document.activeElement === element), true);
    assert.equal(await page.evaluate(() => window.cartesConservees.every((element) => element.isConnected)), true);
    assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop === window.defilementAvant), true);
    await page.getByRole('button', { name: 'Back to palettes and board' }).click();
    assert.equal(await page.locator('.carte[aria-label="Hue shift"]').getAttribute('data-ouverte'), 'true');
    assert.equal(await page.locator('body').textContent().then((texte) => texte.includes('[object Object]')), false);
    assert.equal(await page.evaluate(() => window.demandes.filter((d) => ['ranger-recette', 'dessiner', 'retirer-cadre'].includes(d.type)).length), 0);
  } finally { await page.close(); }
});

test('un dessin en cours garde sa demande et son résultat à travers une bascule', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    await envoyer(page, { type: 'progression', demande: demande.demande, fait: 0, total: 1, nom: 'Bleu' });
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    await page.getByLabel('Langue', { exact: true }).selectOption('en');
    assert.equal(await page.locator('#panneau-planche').textContent().then((texte) => texte.includes('Generating “Bleu”…')), true);
    assert.equal(await page.locator('.carte-de-reglage').first().evaluate((element) => element.closest('[inert]') !== null), true);
    await envoyer(page, dessinDe(demande.demande, { issue: 'etrangers', cadres: [{ palette: ID_DU_BLEU, calques: [{ id: 'x', nom: 'Note personnelle' }] }] }));
    await page.getByRole('button', { name: 'Back to palettes and board' }).click();
    await page.getByText('Content added to the frame for “Bleu”').waitFor();
    assert.match(await page.locator('#panneau-planche').textContent(), /Note personnelle/);
    assert.equal(await page.evaluate(() => window.demandes.filter((d) => d.type === 'dessiner').length), 1);
  } finally { await page.close(); }
});

test('un refus de préférence se retraduit et peut être réessayé, une lecture tardive est ignorée', async () => {
  const page = await ouvrir(MINIMALE, 'en');
  try {
    await page.getByRole('button', { name: 'Open shared settings' }).click();
    await page.evaluate(() => { window.refuserLangue = true; });
    await page.getByLabel('Language', { exact: true }).selectOption('fr');
    const reessayer = page.getByRole('button', { name: 'Réessayer l’enregistrement de la langue' });
    await reessayer.waitFor();
    await envoyer(page, { type: 'langue', langue: 'en' });
    assert.equal(await page.locator('html').getAttribute('lang'), 'fr');
    await page.evaluate(() => { window.refuserLangue = false; });
    await reessayer.click();
    await reessayer.waitFor({ state: 'hidden' });
    await page.getByLabel('Langue', { exact: true }).selectOption('en');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  } finally { await page.close(); }
});

/**
 * Le relevé des demandes que l'interface envoie au sandbox. Il se pose avant
 * le bundle : l'interface demande l'état dès son chargement.
 */
const RELEVE = `<script>
  window.demandes = [];
  window.addEventListener('message', (event) => {
    const type = event.data.pluginMessage && event.data.pluginMessage.type;
    if (type === 'lire-langue') window.postMessage({ pluginMessage: { type: 'langue', langue: 'fr' } }, '*');
    if (type === 'ranger-langue') {
      window.langueRangee = event.data.pluginMessage.langue;
      window.postMessage({ pluginMessage: { type: 'langue-rangee', selection: event.data.pluginMessage.selection, reussie: !window.refuserLangue } }, '*');
    }
    if (['lire-etat', 'ranger-recette', 'dessiner', 'voir-sur-la-planche', 'retirer-cadre'].includes(type)) window.demandes.push(event.data.pluginMessage);
  });
</script>`;

/** La taille minimale de la fenêtre ([UI-01]). */
const MINIMALE = { width: 500, height: 520 };

/** Ouvre l'interface, par défaut à 440 × 520, sous la largeur minimale. */
async function ouvrir(viewport = { width: 440, height: 520 }, langue = 'fr') {
  const page = await navigateur.newPage({ viewport });
  page.setDefaultTimeout(5000);
  await page.setContent(html.replace('<head>', () => `<head>${RELEVE.replace("langue: 'fr'", `langue: ${JSON.stringify(langue)}`)}`));
  return page;
}

test('la fenêtre s’ouvre sur l’onglet Création et demande l’état du fichier', async () => {
  const page = await ouvrir();
  try {
    const palettes = page.getByRole('tab', { name: 'Création', exact: true });
    assert.equal(await palettes.getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('tab', { name: 'Palettes', exact: true }).getAttribute('aria-selected'), 'false');
    assert.equal(await page.locator('#panneau-palettes').isVisible(), true);
    assert.equal(await page.locator('#panneau-planche').isVisible(), false);
    await page.waitForFunction(() => window.demandes.length > 0);
    assert.deepEqual(await page.evaluate(() => window.demandes), [{ type: 'lire-etat', demande: 1 }]);
  } finally {
    await page.close();
  }
});

test('l’engrenage ouvre la configuration, le retour ramène aux onglets', async () => {
  const page = await ouvrir();
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    assert.equal(await page.getByRole('tablist').isVisible(), false);
    assert.equal(await page.locator('.page-title').textContent(), 'Réglages communs');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.equal(await page.getByRole('tablist').isVisible(), true);
    assert.equal(await page.locator('.page-title').textContent(), 'UCM Palettes');
  } finally {
    await page.close();
  }
});

test('un état plus ancien que la dernière lecture est écarté', async () => {
  const page = await ouvrir();
  try {
    const etat = (demande, classement) => ({ type: 'etat', demande, classement, empreinte: null, profil: 'SRGB' });
    await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), etat(0, { etat: 'future', version: 9 }));
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant').count(), 0);
    await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), etat(1, { etat: 'future', version: 9 }));
    await page.locator('#panneau-palettes .constat-bloquant').waitFor();
    assert.match(await page.locator('#panneau-palettes .constat-ou').textContent(), /format 9/);
  } finally {
    await page.close();
  }
});

/** Les messages des états de la galerie : l'interface est éprouvée sur les mêmes scénarios. */
const { ETATS } = createRequire(import.meta.url)('../../galerie/etats.cjs');
const messageDe = (id) => ETATS.find((etat) => etat.id === id).atteinte[0].message;

/** Choisit la première palette de la liste, comme le designer : l'onglet Création n'en ouvre aucune de lui-même ([UI-06]). */
async function ouvrirLaPremierePalette(page) {
  await page.locator('.selecteur-bouton').click();
  await page.locator('.selecteur-option').first().click();
  await page.locator('.tete-de-la-palette .titre-de-premier-rang').waitFor();
}

/** Ouvre l'interface sur le premier message d'un état de la galerie, puis sur sa première palette, sauf `sansPalette`. */
async function ouvrirSur(id, viewport, { sansPalette = false } = {}) {
  const page = await ouvrir(viewport);
  await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), messageDe(id));
  if (sansPalette) await page.locator('.selecteur-bouton').waitFor();
  else await ouvrirLaPremierePalette(page);
  return page;
}

/** Une carte d'un onglet, par son titre ; l'onglet Création par défaut. */
const carteDeLOnglet = (page, titre, panneau = '#panneau-palettes') => page.locator(`${panneau} .carte[aria-label="${titre}"]`);
/** L'en-tête d'une carte repliable : le bouton qui la déplie ([UI-12]). */
const bascule = (page, titre, panneau) => carteDeLOnglet(page, titre, panneau).locator('> .carte-bascule');

/** Déplie une carte repliée à l'ouverture ([UI-09], [UI-12], [UI-14], V8.5) ; une carte ouverte le reste. */
async function deplierLaCarte(page, titre, panneau) {
  if ((await carteDeLOnglet(page, titre, panneau).getAttribute('data-ouverte')) !== 'true') await bascule(page, titre, panneau).click();
}

/** La carte « Teinte, saturation, luminosité » de l'onglet Création (Z10.6). */
const CARTE_DES_REGLAGES = 'Teinte, saturation, luminosité';

/** Une carte des Réglages communs, par son titre ([ENT-12]) : le panneau masque l'onglet, qui a lui aussi une carte Intensités. */
const reglage = (page, titre) => page.locator(`.carte[aria-label="${titre}"]:visible`);

const dansLaFenetre = async (locator, hauteur = 520) => {
  const boite = await locator.boundingBox();
  return boite !== null && boite.y >= 0 && boite.y + boite.height <= hauteur;
};

/** La taille par défaut de la fenêtre ([UI-01]). */
const PAR_DEFAUT = { width: 600, height: 720 };

test('[UI-03] [UI-11] à 600 × 720, la carte « Configuration de la palette » et le haut de l’aperçu se lisent sans défiler ; à 500 × 520, le sélecteur, le titre seul sur sa ligne et la rangée du nom et de la référence', async () => {
  const grande = await ouvrirSur('promesses-manquees', PAR_DEFAUT);
  try {
    for (const [nom, locator] of Object.entries({
      configuration: grande.locator('[aria-label="Configuration de la palette"]'),
      'onglets de thème': grande.locator('.nuancier-tete .bascule'),
      'rampe Soft': grande.locator('.pastille[data-profil="soft"]').first(),
    })) assert.equal(await dansLaFenetre(locator, PAR_DEFAUT.height), true, `${nom} hors de la fenêtre par défaut`);
  } finally {
    await grande.close();
  }
  const page = await ouvrirSur('promesses-manquees', MINIMALE);
  try {
    const visibles = {
      sélecteur: page.locator('.selecteur-bouton'),
      titre: page.locator('.tete-de-la-palette .titre-de-premier-rang'),
      'nom et référence': page.locator('[aria-label="Configuration de la palette"] .colonnes-de-base'),
    };
    for (const [nom, locator] of Object.entries(visibles)) assert.equal(await dansLaFenetre(locator), true, `${nom} hors de la fenêtre`);
    assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop), 0);
    // La génération appartient à l'onglet Palettes : la tête de la palette ne porte que le titre, dans le flux ([UI-05]).
    const tete = page.locator('#panneau-palettes .tete-de-la-palette');
    assert.equal(await tete.textContent(), 'Palette Bleu');
    assert.equal(await tete.locator('button, [role="status"], [aria-live]').count(), 0, 'ni geste, ni état, ni progression sous le titre');
    assert.equal(await tete.evaluate((element) => getComputedStyle(element).position), 'static');
  } finally {
    await page.close();
  }
});

test('[UI-04] les flèches déplacent le focus sur les pastilles ; Entrée choisit la nuance et ouvre son détail, puis la relâche', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const active = page.locator('.nuancier-grille [tabindex="0"]');
    assert.equal(await active.count(), 1);
    await active.focus();
    const focalisee = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
    assert.match(await focalisee(), /^Profil Vivid, nuance 700,/);
    await page.keyboard.press('ArrowRight');
    assert.match(await focalisee(), /^Profil Vivid, nuance 800,/);
    await page.keyboard.press('ArrowUp');
    assert.match(await focalisee(), /^Profil Soft, nuance 800,/);
    // La pastille on-solid précède les rampes : Origine s'y pose, la flèche droite rend la première nuance.
    await page.keyboard.press('Home');
    assert.match(await focalisee(), /^on-solid, fond du thème,/);
    // Le fond se pose en texte sur solid à ses quatre états : 700 à 950, pas 700 à 700.
    await page.keyboard.press('Enter');
    assert.match(await page.locator('.nuancier-detail').innerText(), /Il se pose en texte sur solid 700 à 950\./);
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    assert.match(await focalisee(), /^Profil Soft, nuance 50,/);
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false, 'le focus seul n’ouvre pas le détail');
    await page.keyboard.press('Enter');
    const choisie = page.locator('[aria-label^="Profil Soft, nuance 50,"]');
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Soft · 50');
    assert.match(await page.locator('.nuancier-detail .detail-code').textContent(), /^#[0-9A-F]{6}$/);
    assert.equal(await choisie.getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.nuancier-grille [tabindex="0"]').count(), 1);
    // Le même geste relâche la nuance et referme son détail ; le focus reste sur elle.
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false);
    assert.equal(await choisie.getAttribute('aria-selected'), 'false');
    assert.match(await focalisee(), /^Profil Soft, nuance 50,/);
    await page.keyboard.press(' ');
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Soft · 50');
    await page.keyboard.press(' ');
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[UI-04] [UI-10] un clic sur une nuance donne son code, ses rôles et ses contrastes, sans copier ni naviguer ; un second clic la relâche', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const nuance = page.locator('[aria-label^="Profil Vivid, nuance 700,"]');
    await nuance.hover();
    assert.equal(await page.locator('.nuancier-detail').isVisible(), false, 'le survol ne remplace pas le détail');
    await nuance.click();
    const detail = page.locator('.nuancier-detail');
    assert.equal(await detail.locator('.detail-titre').textContent(), 'Vivid · 700');
    assert.match(await detail.locator('.detail-code').textContent(), /^#[0-9A-F]{6}$/);
    const [sertA, contrastes] = await detail.locator('.detail-groupe').allInnerTexts();
    for (const role of ['solid · default', 'text · default', 'border-control · hover']) assert.ok(sertA.includes(role), role);
    assert.match(sertA, /✓ sur surface 100 : \d+,\d\d:1\s*AA/);
    // Chaque ratio porte le nom de ce qu'il compare, une seule fois.
    const lignes = await detail.locator('.detail-contraste').evaluateAll((rangees) => rangees.map((rangee) => rangee.innerText.split('\n').filter(Boolean)));
    assert.deepEqual(lignes.map(([nom]) => nom), ['Fond du thème', 'Blanc', 'Noir']);
    for (const [, ratio, badge] of lignes) {
      assert.match(ratio, /^\d+,\d\d:1$/);
      assert.match(badge, /^AAA?( ✗)?$/);
    }
    assert.equal((contrastes.match(/Fond du thème/g) ?? []).length, 1);
    assert.deepEqual(await page.evaluate(() => window.demandes.map((demande) => demande.type)), ['lire-etat']);
    await nuance.click();
    assert.equal(await detail.isVisible(), false);
    assert.equal(await nuance.getAttribute('aria-selected'), 'false');
  } finally {
    await page.close();
  }
});

test('[UI-12] l’onglet se règle avant de se juger : titre, configuration, aperçu, Teinte, saturation, luminosité, Dérive de teinte, Garanties de contraste, Interface de test, les cartes repliables repliées', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const configuration = page.locator('#panneau-palettes .configuration-de-la-palette');
    assert.equal(await configuration.locator('> :first-child').getAttribute('class'), 'tete-de-la-palette');
    assert.deepEqual(await configuration.locator('> .carte').evaluateAll((cartes) => cartes.map((carte) => [carte.getAttribute('aria-label'), carte.dataset.ouverte])), [
      ['Configuration de la palette', 'true'],
      ['Aperçu', 'true'],
      [CARTE_DES_REGLAGES, 'false'],
      ['Dérive de teinte', 'false'],
      ['Garanties de contraste', 'false'],
      ['Interface de test', 'false'],
    ]);
    // La carte Dérive de teinte ne redit pas les garanties : ni bilan, ni lien vers leur carte.
    await deplierLaCarte(page, 'Dérive de teinte');
    const derive = carteDeLOnglet(page, 'Dérive de teinte');
    assert.equal(await derive.getByRole('button', { name: 'Voir les garanties' }).count(), 0);
    assert.doesNotMatch(await derive.textContent(), /Garanties :/);
  } finally {
    await page.close();
  }
});

test('[MOT-17] [UI-04] la nuance qui porte la référence porte son repère, qui change de colonne avec le thème', async () => {
  const page = await ouvrirSur('reference-vivid');
  try {
    // #A855F7 : Vivid 600 en Light, Vivid 700 en Dark.
    const reperee = () => page.locator('.pastille[data-reference="true"]').evaluate((pastille) => `${pastille.dataset.profil} ${pastille.dataset.cran}`);
    await page.getByRole('button', { name: 'Thème Light', exact: true }).click();
    assert.equal(await reperee(), 'vivid 600');
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Vivid · nuance 600');
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    assert.equal(await reperee(), 'vivid 700');
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Vivid · nuance 700');
    assert.equal(await page.locator('.pastille[data-reference="true"]').count(), 1);
  } finally {
    await page.close();
  }
});

test('[UI-11] [UI-15] [UI-17] « Ajuster la référence » ne paraît sous le code qu’avec une garantie manquée, hors du libellé, dans la ligne qui commence au bord gauche de la colonne', async () => {
  // Vert, #16A34A : deux garanties Vivid manquées.
  const page = await ouvrirSur('ajustement-ouvert', PAR_DEFAUT);
  try {
    const configuration = carteDeLOnglet(page, 'Configuration de la palette');
    const lien = configuration.getByRole('button', { name: 'Ajuster la référence', exact: true });
    assert.equal(await lien.isVisible(), true);
    // Le libellé du champ désigne la pastille : il ne contient pas un second contrôle.
    assert.equal(await lien.evaluate((element) => element.closest('label') === null), true);
    const { colonne, ligne, boite } = await lien.evaluate((element) => ({
      colonne: element.closest('.champ-colonne').getBoundingClientRect().toJSON(),
      ligne: element.closest('.ligne-fixe').getBoundingClientRect().toJSON(),
      boite: element.getBoundingClientRect().toJSON(),
    }));
    const code = await configuration.locator('.champ-hexa').boundingBox();
    assert.ok(boite.y >= code.y + code.height, 'le lien vient sous le code');
    assert.ok(Math.abs(ligne.x - colonne.x) < 1, 'la ligne commence au bord gauche de la colonne');
    assert.equal(ligne.height, 24, 'la ligne garde sa hauteur fixe');
    assert.ok(boite.width < colonne.width / 2, `le lien garde sa largeur : ${boite.width} px sur ${colonne.width}`);
  } finally {
    await page.close();
  }
  // Vert ajusté, #0DA047 : toutes les garanties tenues ; la trace de l'ajustement reste.
  const ajustee = await ouvrirSur('reference-ajustee', PAR_DEFAUT);
  try {
    const configuration = carteDeLOnglet(ajustee, 'Configuration de la palette');
    assert.equal(await configuration.getByRole('button', { name: 'Ajuster la référence', exact: true }).isVisible(), false);
    const ligne = configuration.locator('.ligne-de-la-reference');
    assert.equal(await ligne.locator('.ligne-fixe-texte').textContent(), 'Ajustée depuis #16A34A');
    assert.equal(await ligne.getByRole('button', { name: 'Revenir à l’originale' }).isVisible(), true);
  } finally {
    await ajustee.close();
  }
});

test('[UI-04] le nuancier porte le fond du thème choisi, et ses textes s’y lisent', async () => {
  const page = await ouvrirSur('fond-personnalise');
  try {
    const { fond, encre } = await page.locator('.nuancier-surface').evaluate((surface) => ({ fond: getComputedStyle(surface).backgroundColor, encre: getComputedStyle(surface).color }));
    assert.equal(fond, 'rgb(255, 216, 77)');
    assert.equal(encre, 'rgb(30, 30, 30)');
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => getComputedStyle(surface).backgroundColor), 'rgb(18, 18, 18)');
  } finally {
    await page.close();
  }
});

test('[UI-09] repliées, les garanties gardent le résultat des deux profils ; la première ligne en échec est choisie, et un clic ou Entrée en choisit une autre, qui trace un arc par état', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    const garanties = carteDeLOnglet(page, 'Garanties de contraste');
    assert.equal(await garanties.getAttribute('data-ouverte'), 'false');
    assert.equal(await garanties.locator('.carte-resume').textContent(), 'Soft ✗ 1 · Vivid ✗ 1');
    await deplierLaCarte(page, 'Garanties de contraste');
    assert.equal(await garanties.locator('.carte-resume').textContent(), 'Thème Light');
    // Le profil porteur est choisi, et chaque segment porte le résultat de son profil.
    assert.deepEqual(await garanties.locator('.bascule-des-profils button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')])), [['Soft ✗ 1', 'false'], ['Vivid ✗ 1', 'true']]);
    const choisie = () => garanties.locator('.garantie[aria-pressed="true"]').getAttribute('data-association');
    const arcs = () => garanties.locator('.reglette-arc').evaluateAll((traits) => traits.map((trait) => trait.dataset.verdict));
    assert.equal(await choisie(), 'text/surface');
    assert.deepEqual(await arcs(), ['manquee', 'tenue', 'tenue', 'tenue']);
    assert.match(await garanties.locator('.garantie-echec').first().innerText(), /^État default : 4,19:1 pour un minimum de 4,5:1/);
    await garanties.locator('.garantie[data-association="text/fond"]').click();
    assert.equal(await choisie(), 'text/fond');
    assert.deepEqual(await arcs(), ['tenue']);
    await garanties.locator('.garantie[data-association="on-solid/solid"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await choisie(), 'on-solid/solid');
    assert.equal((await arcs()).length, 4);
    // Le choix se conserve au changement de profil.
    await garanties.locator('.bascule-des-profils button').first().click();
    assert.equal(await choisie(), 'on-solid/solid');
  } finally {
    await page.close();
  }
});

/** Les badges passés sous la ligne de leur ratio, dans une carte des garanties. */
const badgesALaLigne = (carte) => carte.evaluate((element) => [...element.querySelectorAll('.garantie-resultat')].filter((resultat) => {
  const badge = resultat.querySelector('.badge-de-niveau');
  return badge && badge.getBoundingClientRect().top > resultat.getBoundingClientRect().top + 6;
}).length);

test('Z6.3 [UI-09] à 500 et à 770 px, chaque badge reste sur la ligne de son ratio, au ratio le plus long', async () => {
  for (const viewport of [MINIMALE, { width: 770, height: 720 }]) {
    const page = await ouvrirSur('garantie-en-echec', viewport);
    try {
      await deplierLaCarte(page, 'Garanties de contraste');
      const carte = carteDeLOnglet(page, 'Garanties de contraste');
      assert.equal(await badgesALaLigne(carte), 0, `${viewport.width} px, contenu réel`);
      // Le pire contenu : « ✗ 21,00 » et le badge le plus large, dans chaque case.
      await carte.evaluate((element) => {
        for (const resultat of element.querySelectorAll('.garantie-resultat')) {
          const badge = resultat.querySelector('.badge-de-niveau');
          badge.textContent = 'AA ✗';
          resultat.replaceChildren('✗ 21,00', badge);
        }
      });
      assert.equal(await badgesALaLigne(carte), 0, `${viewport.width} px, « ✗ 21,00 » et « AA ✗ »`);
      const debordent = await carte.evaluate((element) => [...element.querySelectorAll('.garantie-etat')].filter((cellule) => cellule.querySelector('.garantie-resultat').getBoundingClientRect().right > cellule.getBoundingClientRect().right + 0.5).length);
      assert.equal(debordent, 0, `${viewport.width} px, chaque résultat tient dans sa case`);
    } finally {
      await page.close();
    }
  }
});

test('Z6.3 [UI-09] un encadré par minimum ; les états nommés une fois, en tête de colonne ; le code d’un rôle à la taille du texte qui l’entoure', async () => {
  const page = await ouvrirSur('garantie-en-echec', { width: 770, height: 720 });
  try {
    await deplierLaCarte(page, 'Garanties de contraste');
    const carte = carteDeLOnglet(page, 'Garanties de contraste');
    const blocs = carte.locator('.garanties-bloc');
    assert.deepEqual(await blocs.evaluateAll((liste) => liste.map((bloc) => bloc.getAttribute('aria-label'))), ['Textes lisibles', 'Éléments visibles']);
    for (const bloc of await blocs.all()) {
      const texte = await bloc.evaluate((element) => [...element.querySelectorAll('.garantie')].map((ligne) => ligne.innerText).join(' '));
      for (const etat of ['default', 'hover', 'active']) assert.equal(texte.includes(etat), false, `« ${etat} » se répète dans les lignes`);
      assert.deepEqual(await bloc.locator('.garanties-colonnes [data-rang]').allTextContents(), ['default', 'hover', 'active', 'active-hover']);
    }
    // Chaque case tombe sous le nom de son état.
    const alignees = await carte.evaluate((element) => [...element.querySelectorAll('.garantie-etat')].every((cellule) => {
      const nom = cellule.closest('.garanties-bloc').querySelector(`.garanties-colonnes [data-rang="${cellule.dataset.rang}"]`).getBoundingClientRect();
      const cadre = cellule.getBoundingClientRect();
      return Math.abs(cadre.left - nom.left) < 1;
    }));
    assert.equal(alignees, true, 'chaque état dans sa colonne');
    const [codeTaille, texteTaille] = await carte.locator('.garantie-qui p').first().evaluate((relation) => [getComputedStyle(relation.querySelector('.code-du-role')).fontSize, getComputedStyle(relation).fontSize]);
    assert.equal(codeTaille, texteTaille);
  } finally {
    await page.close();
  }
});

test('Z6.3 [UI-09] la rangée choisie porte une barre écartée du texte, le focus se voit, et une garantie en échec garde ses liens', async () => {
  const page = await ouvrirSur('garantie-en-echec', { width: 770, height: 720 });
  try {
    await deplierLaCarte(page, 'Garanties de contraste');
    const carte = carteDeLOnglet(page, 'Garanties de contraste');
    const choisie = carte.locator('.garantie[aria-pressed="true"]');
    const { barre, ecart, fond, fondLibre } = await choisie.evaluate((ligne) => {
      const avant = getComputedStyle(ligne, '::before');
      const libre = ligne.parentElement.querySelector('.garantie[aria-pressed="false"]');
      const texte = ligne.querySelector('.garantie-qui').getBoundingClientRect().left - ligne.getBoundingClientRect().left;
      return { barre: avant.width, ecart: texte - (parseFloat(avant.left) + parseFloat(avant.width)), fond: getComputedStyle(ligne).backgroundColor, fondLibre: getComputedStyle(libre).backgroundColor };
    });
    assert.equal(barre, '3px');
    assert.ok(ecart >= 6, `la barre est à ${ecart} px du texte`);
    assert.notEqual(fond, fondLibre, 'la rangée choisie a son fond');
    await carte.locator('.garantie').first().focus();
    await page.keyboard.press('Tab');
    const contour = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(contour, 'none', 'le focus se voit');
    assert.deepEqual(await carte.locator('.garantie-echec .lien-de-constat').allTextContents(), [CARTE_DES_REGLAGES, 'Dérive de teinte', 'Luminosité des nuances', 'Ajuster la référence']);
  } finally {
    await page.close();
  }
});

test('[UI-09] des garanties manquées dans l’autre thème se comptent, basculent l’aperçu sur ce thème, et un bouton ramène au thème d’avant', async () => {
  // Le cran 700 plus clair fait manquer text sur surface en Light ; l'aperçu montre Dark.
  const page = await ouvrirSur('garantie-en-echec');
  try {
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    await deplierLaCarte(page, 'Garanties de contraste');
    const autre = carteDeLOnglet(page, 'Garanties de contraste').locator('.autre-theme');
    assert.equal(await autre.isVisible(), true);
    await autre.locator('.lien-de-constat').click();
    assert.equal(await page.getByRole('button', { name: 'Thème Light', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await carteDeLOnglet(page, 'Garanties de contraste').locator('.carte-resume').textContent(), 'Thème Light');
    await page.getByRole('button', { name: 'Revenir au thème Dark' }).click();
    assert.equal(await page.getByRole('button', { name: 'Thème Dark', exact: true }).getAttribute('aria-pressed'), 'true');
  } finally {
    await page.close();
  }
});

test('la bascule montre la rampe sombre', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const clair = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Thème Dark', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Thème Dark', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), clair);
  } finally {
    await page.close();
  }
});

test('[ENT-02] une référence saisie recalcule l’aperçu et la dérive sans passer par le sandbox', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    const avant = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    // #FACC15 est le 300 de vivid en Light, #1E6FD9 son 600 : le pivot de la dérive change de colonne.
    assert.equal(await colonneDuPivot(page), 3);
    await page.locator('#panneau-palettes .champ-hexa').fill('#1E6FD9');
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), avant);
    assert.equal(await colonneDuPivot(page), 6);
    assert.deepEqual(await page.evaluate(() => window.demandes.map((demande) => demande.type)), ['lire-etat']);
  } finally {
    await page.close();
  }
});

test('[UI-06] le sélecteur liste les palettes et ouvre celle qu’on choisit au clavier', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.locator('.selecteur-bouton').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('listbox').isVisible(), true);
    assert.deepEqual(await page.getByRole('option').allTextContents(), ['Jaune', 'Bleu']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('listbox').isVisible(), false);
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').inputValue(), '#1E6FD9');
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Bleu');
  } finally {
    await page.close();
  }
});

/** Une page de la galerie, jouée par le pilote du banc jusqu'à son image stable. */
async function pageDeGalerie(id) {
  const page = await navigateur.newPage({ viewport: { width: 600, height: 720 } });
  page.setDefaultTimeout(5000);
  await page.goto(new URL(`../../dist/galerie/clair/${id}.html`, import.meta.url).href);
  await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
  return page;
}

test('le banc de galerie joue un clic : le détail de la nuance choisie s’affiche', async () => {
  const page = await pageDeGalerie('palette-en-saisie');
  try {
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Vivid · 700');
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').inputValue(), '#7C3AED');
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue une touche : le focus avance d’un cran', async () => {
  const page = await pageDeGalerie('promesses-manquees');
  try {
    assert.match(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), /^Profil Vivid, nuance 800,/);
  } finally {
    await page.close();
  }
});

const envoyer = async (page, message) => {
  await page.evaluate((pluginMessage) => window.postMessage({ pluginMessage }, '*'), message);
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
};
const demandes = (page) => page.evaluate(() => window.demandes);
const compte = async (page) => (await demandes(page)).length;
/** La prochaine demande que l'interface envoie après la `rang`-ième : `postMessage` est asynchrone. */
async function prochaine(page, rang) {
  await page.waitForFunction((n) => window.demandes.length > n, rang);
  return (await demandes(page))[rang];
}
const rangee = (demande) => ({ type: 'rangement', demande, issue: { issue: 'rangee', empreinte: '0000000f' } });

test('[ENT-03] au premier lancement, créer une palette la range, sans empreinte lue', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('premier-lancement'));
    const avant = await compte(page);
    await page.locator('.champ-creation').fill('#1E6FD9');
    await page.getByRole('button', { name: 'Créer la palette', exact: true }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.empreinteLue, null);
    assert.equal(demande.recette.palettes.length, 1);
    assert.match(demande.recette.palettes[0].id, /^p-[0-9a-f]{8}$/);
    // Un enregistrement réussi ne s'annonce pas : la ligne du titre ne porte que « Palette [nom] ».
    await envoyer(page, rangee(demande.demande));
    assert.equal(await page.locator('#panneau-palettes .tete-de-la-palette').textContent(), 'Palette #1E6FD9');
  } finally {
    await page.close();
  }
});

test('D-D : un nom se range quand le champ est validé, jamais pendant la saisie', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    const nom = page.getByRole('textbox', { name: 'Nom de la palette' });
    await nom.fill('Soleil');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'la saisie ne range rien');
    await nom.press('Tab');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.palettes[0].nom, 'Soleil');
    assert.equal(demande.empreinteLue, messageDe('alertes-seules').empreinte);
  } finally {
    await page.close();
  }
});

test('[ENT-03] dupliquer, monter, puis supprimer après confirmation', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const geste = async (nom) => {
      const avant = await compte(page);
      await page.getByRole('button', { name: 'Actions sur la palette' }).click();
      await page.getByRole('menuitem', { name: nom }).click();
      return avant;
    };
    let demande = await prochaine(page, await geste('Dupliquer la palette'));
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune', 'Copie de Jaune', 'Bleu']);
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Copie de Jaune');
    await envoyer(page, rangee(demande.demande));
    demande = await prochaine(page, await geste('Déplacer vers le haut'));
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Copie de Jaune', 'Jaune', 'Bleu']);
    await envoyer(page, rangee(demande.demande));
    const avant = await geste('Supprimer la palette');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'la suppression attend sa confirmation');
    await page.locator('.confirmation').getByRole('button', { name: 'Supprimer la palette' }).click();
    demande = await prochaine(page, avant);
    assert.deepEqual(demande.recette.palettes.map((palette) => palette.nom), ['Jaune', 'Bleu']);
  } finally {
    await page.close();
  }
});

test('[UI-02] « Supprimer la palette » porte le fond plein du danger, et son survol un rouge plus soutenu, jamais la couleur de marque', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer la palette' }).click();
    const bouton = page.locator('.confirmation').getByRole('button', { name: 'Supprimer la palette' });
    const peinture = () => bouton.evaluate((element) => ({ fond: getComputedStyle(element).backgroundColor, texte: getComputedStyle(element).color }));
    // Les valeurs de repli du socle, hors de Figma : #F24822, puis #DC3412 au survol, texte blanc.
    assert.deepEqual(await peinture(), { fond: 'rgb(242, 72, 34)', texte: 'rgb(255, 255, 255)' });
    await bouton.hover();
    assert.deepEqual(await peinture(), { fond: 'rgb(220, 52, 18)', texte: 'rgb(255, 255, 255)' });
    const marque = await page.evaluate(() => {
      const temoin = document.createElement('span');
      document.body.append(temoin);
      const couleurs = ['--fond-marque', '--fond-marque-survol'].map((jeton) => {
        temoin.style.background = `var(${jeton})`;
        return getComputedStyle(temoin).backgroundColor;
      });
      temoin.remove();
      return couleurs;
    });
    assert.ok(!marque.includes((await peinture()).fond), 'le survol n’hérite pas du bouton principal');
  } finally {
    await page.close();
  }
});

test('[REC-10] un rangement refusé propose « Recharger », qui relit l’état', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    let avant = await compte(page);
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer la palette' }).click();
    const demande = await prochaine(page, avant);
    await envoyer(page, { type: 'rangement', demande: demande.demande, issue: { issue: 'modifiee-ailleurs' } });
    avant = await compte(page);
    await page.getByRole('button', { name: 'Recharger les palettes' }).click();
    const relecture = await prochaine(page, avant);
    assert.equal(relecture.type, 'lire-etat');
    await envoyer(page, { ...messageDe('alertes-seules'), demande: relecture.demande });
    assert.equal(await page.getByRole('button', { name: 'Recharger les palettes' }).count(), 0);
    // La copie n'a jamais été rangée : relue sans elle, l'onglet attend un nouveau choix ([UI-06]).
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Sélectionner une palette');
  } finally {
    await page.close();
  }
});

test('E13 : la fenêtre relit l’état quand elle reprend le focus', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });
    assert.equal((await prochaine(page, avant)).type, 'lire-etat');
  } finally {
    await page.close();
  }
});

test('un hexa impossible se signale sous le champ, et l’aperçu ne change pas', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await page.locator('#panneau-palettes .champ-hexa').fill('#FACZ15');
    assert.equal(await page.locator('#panneau-palettes .champ-hexa').getAttribute('aria-invalid'), 'true');
    assert.match(await carteDeLOnglet(page, 'Configuration de la palette').locator('.field-error:visible').textContent(), /n’est pas accepté/);
    assert.equal(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), avant);
  } finally {
    await page.close();
  }
});

test('E13 : le premier focus de la fenêtre ne relit rien, l’état vient d’être lu', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await compte(page);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant);
  } finally {
    await page.close();
  }
});

test('[UI-03] un nom de palette long ne pousse ni les gestes ni le champ du nom hors de la fenêtre', async () => {
  const page = await ouvrir();
  try {
    const message = structuredClone(messageDe('alertes-seules'));
    message.classement.recette.palettes[0].nom = 'Jaune principal de la marque, déclinaison institutionnelle';
    await envoyer(page, message);
    await ouvrirLaPremierePalette(page);
    // Le bord droit du contenu est celui de l'en-tête : il est hors des grilles de l'onglet.
    const enTete = await page.locator('.header').boundingBox();
    const largeur = enTete.x + enTete.width;
    for (const locator of [page.getByRole('button', { name: 'Actions sur la palette' }), page.locator('.tete-de-la-palette .titre-de-premier-rang'), page.getByRole('textbox', { name: 'Nom de la palette' })]) {
      const boite = await locator.boundingBox();
      assert.ok(boite.x + boite.width <= largeur, JSON.stringify(boite));
    }
    assert.equal(await page.locator('.tete-de-la-palette .titre-de-premier-rang').evaluate((element) => element.scrollWidth > element.clientWidth), true, 'le nom long se coupe');
  } finally {
    await page.close();
  }
});

test('[UI-06] à 500 px, la liste prend la largeur libre, les deux gestes ont sa hauteur, et un nom long se coupe', async () => {
  const page = await ouvrir(MINIMALE);
  try {
    const message = structuredClone(messageDe('alertes-seules'));
    message.classement.recette.palettes[0].nom = 'Jaune principal de la marque, déclinaison institutionnelle';
    await envoyer(page, message);
    await ouvrirLaPremierePalette(page);
    const liste = await page.locator('.selecteur-bouton').boundingBox();
    const nouvelle = await page.getByRole('button', { name: 'Nouvelle palette', exact: true }).boundingBox();
    const menu = await page.getByRole('button', { name: 'Actions sur la palette' }).boundingBox();
    const barre = await page.locator('.barre-gestes').boundingBox();
    assert.deepEqual([nouvelle.height, menu.height], [liste.height, liste.height]);
    // La liste occupe ce que les deux gestes et leurs écarts laissent : 8 px chacun.
    assert.equal(Math.round(liste.width), Math.round(barre.width - nouvelle.width - menu.width - 16));
    assert.ok(menu.x + menu.width <= barre.x + barre.width + 0.5, JSON.stringify({ menu, barre }));
    const coupe = await page.locator('.selecteur-nom').evaluate((nom) => nom.scrollWidth > nom.clientWidth && getComputedStyle(nom).textOverflow === 'ellipsis');
    assert.equal(coupe, true);
  } finally {
    await page.close();
  }
});

test('[UI-11] le titre dit « Palette [nom] » et suit la saisie du nom, sans retirer le focus du champ', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const titre = page.locator('.tete-de-la-palette .titre-de-premier-rang');
    assert.equal(await titre.textContent(), 'Palette Jaune');
    assert.equal(await page.locator('[aria-label="Configuration de la palette"] .carte-titre').textContent(), 'Configuration de la palette');
    const nom = page.getByRole('textbox', { name: 'Nom de la palette' });
    await nom.click();
    await nom.press('End');
    await page.keyboard.type(' vif');
    assert.equal(await titre.textContent(), 'Palette Jaune vif');
    assert.equal(await nom.evaluate((champ) => champ === document.activeElement), true);
  } finally {
    await page.close();
  }
});

test('[UI-06] [ENT-14] la création est une carte en P2, en Standard et à une intensité, ses gestes à gauche ; Entrée crée avec les intensités et la référence exacte choisies, Échap annule', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const nouvelle = page.getByRole('button', { name: 'Nouvelle palette', exact: true });
    await nouvelle.click();
    const carte = page.locator('[aria-label="Nouvelle palette"]');
    // Disposition P2 : le nom et la référence sur une ligne, puis le modèle et les intensités, chacun sur sa rangée.
    assert.deepEqual(await carte.locator('.colonnes-de-base .libelle-de-champ').allTextContents(), ['Nom de la palette', 'Couleur de référence']);
    assert.deepEqual(await carte.locator('.carte-corps > .champ-colonne:visible > .libelle-de-champ').allTextContents(), ['Modèle', 'Intensités']);
    assert.equal(await carte.getByRole('button', { name: 'Standard', exact: true }).getAttribute('aria-pressed'), 'true');
    const une = carte.getByRole('radio', { name: /^Une intensité/ });
    const deux = carte.getByRole('radio', { name: /^Deux intensités/ });
    assert.equal(await une.getAttribute('aria-checked'), 'true', '« Une » par défaut');
    assert.equal(await carte.getByRole('group', { name: 'Référence exacte dans' }).isVisible(), false, 'pas de profil à choisir pour une intensité');
    assert.deepEqual(await carte.locator('.creation-ligne button').allTextContents(), ['Créer la palette', 'Annuler']);
    const [gestes, corps] = [await carte.locator('.creation-ligne button').first().boundingBox(), await carte.locator('.carte-corps').boundingBox()];
    assert.ok(gestes.x - corps.x < corps.width / 4, 'les gestes de la création sont à gauche');
    assert.equal(await page.locator('.champ-creation').evaluate((champ) => champ === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await carte.isVisible(), false);
    assert.equal(await nouvelle.evaluate((bouton) => bouton === document.activeElement), true);

    await nouvelle.click();
    await page.locator('.champ-creation').fill('#16A34A');
    // Un code lisible : chaque carte montre la rampe qu'elle donnerait.
    assert.deepEqual(await carte.locator('.carte-d-intensite-apercu .fiche-rangee').evaluateAll((rangees) => rangees.map((rangee) => rangee.dataset.intensite)), ['unique', 'soft', 'vivid']);
    await deux.click();
    assert.equal(await deux.getAttribute('aria-checked'), 'true');
    assert.equal(await carte.locator('.carte-d-intensite').nth(1).getByRole('group', { name: 'Référence exacte dans' }).isVisible(), true, 'le choix du porteur est dans la carte « Deux intensités »');
    assert.equal(await carte.getByText('Auto choisira Vivid').isVisible(), true);
    await carte.getByRole('button', { name: 'Vivid', exact: true }).click();
    await carte.getByRole('textbox', { name: 'Nom de la palette' }).fill('Menthe');
    const avant = await compte(page);
    await page.locator('.champ-creation').press('Enter');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.deepEqual(
      (({ nom, reference, base, intensites }) => ({ nom, reference, base, intensites }))(demande.recette.palettes.at(-1)),
      { nom: 'Menthe', reference: '#16A34A', base: 'vivid', intensites: undefined },
    );
    assert.equal(await page.locator('.tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette Menthe');
    await envoyer(page, rangee(demande.demande));

    // À une intensité, la palette ne porte ni profil porteur ni parts : `intensites: 1`.
    await nouvelle.click();
    await page.locator('.champ-creation').fill('#DC2626');
    const suivante = await compte(page);
    await page.locator('.champ-creation').press('Enter');
    const creee = (await prochaine(page, suivante)).recette.palettes.at(-1);
    assert.equal(creee.intensites, 1);
    assert.equal(creee.base, undefined);
  } finally {
    await page.close();
  }
});

test('[UI-04] la carte d’aperçu n’a pas de titre : les onglets de thème à gauche, l’actif sur un fond plus foncé, la référence sous la surface', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const carte = page.locator('[aria-label="Aperçu"]');
    assert.equal(await carte.locator('.carte-titre').count(), 0);
    const onglets = await carte.locator('.nuancier-tete .bascule').boundingBox();
    const fond = await carte.locator('.pastille-du-fond').boundingBox();
    const tete = await carte.locator('.carte-tete').boundingBox();
    assert.equal(Math.round(onglets.x), Math.round(tete.x), 'les onglets ouvrent l’en-tête');
    assert.ok(fond.x > onglets.x + onglets.width);
    const fondDe = (nom) => carte.getByRole('button', { name: nom, exact: true }).evaluate((bouton) => getComputedStyle(bouton).backgroundColor);
    assert.notEqual(await fondDe('Thème Light'), await fondDe('Thème Dark'));
    assert.notEqual(await fondDe('Thème Light'), await carte.evaluate((element) => getComputedStyle(element).backgroundColor), 'l’onglet actif se détache de la carte');
    const ordre = await carte.locator('.nuancier-surface, .repere-de-la-reference').evaluateAll((elements) => elements.map((element) => element.className));
    assert.deepEqual(ordre, ['nuancier-surface', 'repere-de-la-reference']);
  } finally {
    await page.close();
  }
});

test('[UI-04] W4.1 la pastille du fond ouvre le sélecteur en Hex avec la mention du fond commun ; une frappe prévisualise, Entrée range, et les Réglages communs le montrent', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Modifier le fond du thème Light, actuellement #F7F7F7' }).click();
    // L'étiquette suit la valeur : la pastille se retrouve ensuite par sa classe.
    const pastille = page.locator('.pastille-du-fond');
    const selecteur = page.getByRole('dialog', { name: 'Fond du thème Light' });
    assert.equal(await selecteur.isVisible(), true);
    assert.equal(await pastille.getAttribute('aria-expanded'), 'true');
    assert.equal(await selecteur.getByRole('combobox', { name: 'Format du code' }).inputValue(), 'hex');
    const code = selecteur.getByRole('textbox', { name: 'Code hexadécimal' });
    assert.equal(await code.evaluate((champ) => champ === document.activeElement), true, 'le code a le focus à l’ouverture');
    assert.equal(await code.inputValue(), 'F7F7F7');
    assert.equal(await selecteur.locator('.selecteur-mention').textContent(), 'Ce fond s’applique à toutes les palettes.');
    assert.equal(await selecteur.locator('.selecteur-titre').textContent(), 'Fonds par défaut et premières nuances');
    const noms = await selecteur.locator('.selecteur-pastille').evaluateAll((boutons) => boutons.map((bouton) => bouton.getAttribute('aria-label')));
    assert.deepEqual(noms.slice(0, 3), ['Fond Light par défaut, #F7F7F7', 'Fond Dark par défaut, #121212', 'Blanc, #FFFFFF']);
    assert.match(noms[3], /^Vivid 50, #[0-9A-F]{6}$/);
    assert.equal(noms.length, 5);

    const avant = await compte(page);
    await code.fill('ffd84d');
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => surface.style.background), 'rgb(255, 216, 77)');
    assert.equal(await compte(page), avant, 'la frappe ne range rien');
    await code.press('Enter');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.fonds.light, '#FFD84D');
    assert.equal(await code.inputValue(), 'FFD84D');
    assert.equal(await page.getByRole('button', { name: 'Modifier le fond du thème Light, actuellement #FFD84D' }).count(), 1);

    await page.keyboard.press('Escape');
    assert.equal(await selecteur.isVisible(), false);
    assert.equal(await pastille.evaluate((bouton) => bouton === document.activeElement), true, 'Échap rend le focus à la pastille');
    assert.equal(await pastille.getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    assert.equal(await page.locator('.champ-hexa[aria-label="Fond du thème Light"]').inputValue(), '#FFD84D');
  } finally {
    await page.close();
  }
});

test('W4.1 un glisser dans la zone prévisualise sans ranger, et le relâcher range une seule fois', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: /^Modifier le fond du thème Light/ }).click();
    const zone = page.getByRole('slider', { name: 'Saturation et luminosité' });
    const boite = await zone.boundingBox();
    const avant = await compte(page);
    await page.mouse.move(boite.x + boite.width * 0.9, boite.y + boite.height * 0.1);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width * 0.5, boite.y + boite.height * 0.3, { steps: 5 });
    const pendant = await page.locator('.nuancier-surface').evaluate((surface) => surface.style.background);
    assert.notEqual(pendant, 'rgb(247, 247, 247)', 'l’aperçu suit le glisser');
    assert.equal(await compte(page), avant, 'le glisser ne range rien');
    await page.mouse.up();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.notEqual(demande.recette.fonds.light, '#F7F7F7');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    assert.equal(await compte(page), avant + 1);
    const code = await page.getByRole('textbox', { name: 'Code hexadécimal' }).inputValue();
    assert.equal(`#${code}`, demande.recette.fonds.light);
  } finally {
    await page.close();
  }
});

test('W4.2 le sélecteur de la référence : nuances Vivid, formats, code invalide gardé, clavier, focus rendu, Hex à chaque ouverture', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const configuration = page.locator('[aria-label="Configuration de la palette"]');
    const pipette = configuration.getByRole('button', { name: 'Couleur de référence', exact: true });
    const reference = await configuration.locator('.champ-hexa').inputValue();
    await pipette.click();
    const selecteur = page.getByRole('dialog', { name: 'Couleur de référence' });
    assert.equal(await selecteur.getByRole('textbox', { name: 'Code hexadécimal' }).inputValue(), reference.slice(1));
    assert.equal(await selecteur.locator('.selecteur-mention').isVisible(), false);
    assert.equal(await selecteur.locator('.selecteur-titre').textContent(), 'Nuances de la palette ouverte');
    const noms = await selecteur.locator('.selecteur-pastille').evaluateAll((boutons) => boutons.map((bouton) => bouton.getAttribute('aria-label')));
    assert.equal(noms.length, 11);
    assert.match(noms[0], /^Vivid 50, #/);
    assert.match(noms[10], /^Vivid 950, #/);

    // RGB : trois champs ; un canal hors bornes reste dans son champ, marqué, et rien ne se range.
    await selecteur.getByRole('combobox', { name: 'Format du code' }).selectOption('rgb');
    const rouge = selecteur.getByRole('textbox', { name: 'Rouge, de 0 à 255' });
    assert.equal(await selecteur.locator('.selecteur-champ').count(), 3);
    const avant = await compte(page);
    await rouge.fill('300');
    await rouge.press('Tab');
    assert.equal(await rouge.inputValue(), '300');
    assert.equal(await rouge.getAttribute('aria-invalid'), 'true');
    assert.equal(await compte(page), avant, 'un code invalide ne se range pas');
    assert.equal(await configuration.locator('.champ-hexa').inputValue(), reference);

    // HSL : la teinte au clavier, un degré puis dix avec Maj ; chaque pression range.
    await selecteur.getByRole('combobox', { name: 'Format du code' }).selectOption('hsl');
    const teinte = selecteur.getByRole('slider', { name: 'Teinte' });
    const depart = Number(await teinte.getAttribute('aria-valuenow'));
    await teinte.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(Number(await teinte.getAttribute('aria-valuenow')), (depart + 1) % 360);
    await page.keyboard.press('Shift+ArrowRight');
    assert.equal(Number(await teinte.getAttribute('aria-valuenow')), (depart + 11) % 360);
    assert.equal(await selecteur.getByRole('textbox', { name: 'Teinte, en degrés' }).inputValue(), String((depart + 11) % 360));
    // Un rangement à la fois : le second attend la réponse au premier.
    for (const rang of [avant, avant + 1]) {
      const rangement = await prochaine(page, rang);
      assert.equal(rangement.type, 'ranger-recette');
      await envoyer(page, rangee(rangement.demande));
    }
    const zone = selecteur.getByRole('slider', { name: 'Saturation et luminosité' });
    const valeur = await zone.getAttribute('aria-valuetext');
    await zone.focus();
    await page.keyboard.press('ArrowDown');
    assert.notEqual(await zone.getAttribute('aria-valuetext'), valeur);
    await envoyer(page, rangee((await prochaine(page, avant + 2)).demande));

    // Échap rend le focus à la pastille ; la réouverture revient à Hex.
    await page.keyboard.press('Escape');
    assert.equal(await pipette.evaluate((bouton) => bouton === document.activeElement), true);
    await pipette.click();
    assert.equal(await selecteur.getByRole('combobox', { name: 'Format du code' }).inputValue(), 'hex');

    // Une pastille proposée devient la référence, d'un clic.
    const vivid500 = selecteur.getByRole('button', { name: /^Vivid 500, / });
    const hexa = (await vivid500.getAttribute('aria-label')).split(', ')[1];
    const rang = await compte(page);
    await vivid500.click();
    const rangement = await prochaine(page, rang);
    assert.ok(rangement.recette.palettes.some((palette) => palette.reference === hexa));
    assert.equal(await configuration.locator('.champ-hexa').inputValue(), hexa);
    assert.equal(await vivid500.getAttribute('aria-pressed'), 'true');

    // Un clic hors du sélecteur le referme.
    await page.locator('.tete-de-la-palette .titre-de-premier-rang').click();
    assert.equal(await selecteur.isVisible(), false);
  } finally {
    await page.close();
  }
});

test('W4.1 la création ouvre le sélecteur sans pastille, et la couleur choisie remplit le code', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Nouvelle palette', exact: true }).click();
    const creation = page.locator('[aria-label="Nouvelle palette"]');
    await creation.getByRole('button', { name: 'Couleur de référence' }).click();
    const selecteur = page.getByRole('dialog', { name: 'Couleur de référence' });
    assert.equal(await selecteur.locator('.selecteur-pastilles').isVisible(), false);
    const code = selecteur.getByRole('textbox', { name: 'Code hexadécimal' });
    assert.equal(await code.inputValue(), '1E6FD9', 'le sélecteur part de l’exemple du champ vide');
    await code.fill('16a34a');
    await code.press('Enter');
    assert.equal(await creation.getByRole('textbox', { name: 'Couleur de référence' }).inputValue(), '#16A34A');
  } finally {
    await page.close();
  }
});

test('W4.3 Luminosité des nuances : chaque champ sous son point du tracé, flèches à 0,005 et 0,05 avec Maj, puis « Rétablir »', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const carte = page.locator('[aria-label="Luminosité des nuances"]');
    for (const mode of ['light', 'dark']) {
      const points = await carte.locator(`.trace-point[data-mode="${mode}"]`).evaluateAll((cercles) => cercles.map((cercle) => {
        const boite = cercle.getBoundingClientRect();
        return boite.x + boite.width / 2;
      }));
      const champs = await carte.locator(`.champ-de-courbe[data-mode="${mode}"]`).evaluateAll((saisies) => saisies.map((saisie) => {
        const boite = saisie.getBoundingClientRect();
        return { centre: boite.x + boite.width / 2, droite: boite.right, deborde: saisie.scrollWidth > saisie.clientWidth };
      }));
      assert.equal(champs.length, 11);
      champs.forEach(({ centre, deborde }, rang) => {
        assert.ok(Math.abs(centre - points[rang]) <= 2, `${mode} ${rang} : champ à ${centre}, point à ${points[rang]}`);
        assert.equal(deborde, false, `${mode} ${rang} : la valeur est rognée`);
      });
      assert.ok(champs[10].droite <= 500, 'la table tient dans la fenêtre');
    }

    const champ = page.getByRole('textbox', { name: 'Thème Light 700' });
    assert.equal(await champ.inputValue(), '0,5');
    const avant = await compte(page);
    await champ.focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await champ.inputValue(), '0,505');
    const premier = await prochaine(page, avant);
    assert.equal(premier.recette.courbes.light[7], 0.505);
    await envoyer(page, rangee(premier.demande));
    await page.keyboard.press('Shift+ArrowDown');
    assert.equal(await champ.inputValue(), '0,455');
    const second = await prochaine(page, avant + 1);
    assert.equal(second.recette.courbes.light[7], 0.455);
    await envoyer(page, rangee(second.demande));

    const retablir = carte.getByRole('button', { name: /^Rétablir/ });
    assert.equal(await retablir.isDisabled(), false);
    await retablir.click();
    const retour = await prochaine(page, avant + 2);
    assert.equal(retour.recette.courbes.light[7], 0.5);
    assert.equal(await champ.inputValue(), '0,5');
  } finally {
    await page.close();
  }
});

test('W4.4 Minimums et détection : une ligne par seuil, l’aide lisible sans survol, champs et unités alignés', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    for (const [titre, lignes] of [['Minimums des promesses', 2], ['Détection des couleurs proches', 2]]) {
      const carte = page.locator(`[aria-label="${titre}"]`);
      await carte.locator('.carte-bascule').click();
      const mesures = await carte.locator('.ligne-de-seuil').evaluateAll((elements) => elements.map((ligne) => ({
        champ: ligne.querySelector('.champ-nombre').getBoundingClientRect().x,
        unite: ligne.querySelector('.unite').getBoundingClientRect().x,
        aide: ligne.querySelector('.ligne-de-seuil-textes .ligne-secondaire').textContent,
      })));
      assert.equal(mesures.length, lignes);
      for (const mesure of mesures) {
        assert.equal(Math.round(mesure.champ), Math.round(mesures[0].champ), `${titre} : champs alignés`);
        assert.equal(Math.round(mesure.unite), Math.round(mesures[0].unite), `${titre} : unités alignées`);
        assert.ok(mesure.aide.length > 0);
      }
    }
    assert.deepEqual(await page.locator('.ligne-de-seuil .unite').allTextContents(), [':1', ':1', 'ΔEok', 'ΔEok']);
    const texte = page.getByRole('textbox', { name: 'Texte', exact: true });
    const avant = await compte(page);
    await texte.fill('7');
    await texte.press('Tab');
    assert.equal((await prochaine(page, avant)).recette.seuils.texte, 7);
  } finally {
    await page.close();
  }
});

test('W6.5 passer en Libre retire la palette de base et la carte des garanties ; les puces règlent la liste, bornée de 4 à 13 ; revenir au modèle rend la liste commune', async () => {
  const page = await ouvrirSur('reference-dans-le-selecteur');
  try {
    const configuration = page.locator('[aria-label="Configuration de la palette"]');
    const avant = await compte(page);
    await configuration.getByRole('button', { name: 'Libre', exact: true }).click();
    const libre = await prochaine(page, avant);
    await envoyer(page, rangee(libre.demande));
    const palette = libre.recette.palettes[0];
    assert.deepEqual(palette.crans, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
    assert.equal('base' in palette, false);
    assert.equal(await configuration.getByRole('group', { name: 'Palette de base' }).isVisible(), false);
    assert.equal(await configuration.getByText('Sans rôles ni garanties').isVisible(), true);
    assert.equal(await page.locator('[aria-label="Garanties de contraste"]').isVisible(), false);
    assert.equal(await page.locator('.pastille-on-solid').isVisible(), false);
    assert.equal(await page.locator('.accolades').isVisible(), false);

    // Une puce éteinte s'allume, une allumée s'éteint ; la liste se range triée.
    await configuration.getByRole('button', { name: 'Nuance 1000' , exact: true }).click();
    const plus = await prochaine(page, avant + 1);
    assert.deepEqual(plus.recette.palettes[0].crans.slice(-2), [950, 1000]);
    await envoyer(page, rangee(plus.demande));
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 1000' , exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.nuancier-numero').count(), 12);
    // Treize au plus : à treize, les puces éteintes se désactivent.
    await configuration.getByRole('button', { name: 'Nuance 1050' , exact: true }).click();
    await envoyer(page, rangee((await prochaine(page, avant + 2)).demande));
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 250' , exact: true }).isDisabled(), true);
    assert.match(await configuration.locator('.puces-de-nuances').getAttribute('aria-label'), /^Nuances · 13 sur 13 au plus$/);

    await configuration.getByRole('button', { name: 'Standard', exact: true }).click();
    const modele = await prochaine(page, avant + 3);
    assert.equal('crans' in modele.recette.palettes[0], false);
    await envoyer(page, rangee(modele.demande));
    assert.equal(await page.locator('[aria-label="Garanties de contraste"]').isVisible(), true);
    assert.equal(await page.locator('.nuancier-numero').count(), 11);
  } finally {
    await page.close();
  }
});

test('W6.5 une palette libre de six nuances : l’aperçu suit sa liste, le détail n’invente aucun rôle, quatre puces allumées ne s’éteignent plus', async () => {
  const page = await ouvrirSur('palette-libre');
  try {
    assert.deepEqual(await page.locator('.nuancier-numero').allTextContents(), ['100', '200', '400', '600', '800', '900']);
    await page.locator('.pastille[data-profil="vivid"][data-cran="800"]').click();
    const detail = page.locator('.nuancier-detail');
    assert.match(await detail.textContent(), /^Vivid · 800#10479E/);
    assert.doesNotMatch(await detail.textContent(), /Sert à/);
    const configuration = page.locator('[aria-label="Configuration de la palette"]');
    for (const numero of [100, 200]) {
      const avant = await compte(page);
      await configuration.getByRole('button', { name: `Nuance ${numero}` , exact: true }).click();
      await envoyer(page, rangee((await prochaine(page, avant)).demande));
    }
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 400' , exact: true }).isDisabled(), true, 'à quatre nuances, une puce allumée ne s’éteint plus');
    assert.equal(await configuration.getByRole('button', { name: 'Nuance 50' , exact: true }).isDisabled(), false);
  } finally {
    await page.close();
  }
});

test('W6.4 le préréglage se choisit dans « Luminosité des nuances » : l’effet se lit avant, se range à la confirmation, et Annuler ne range rien', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const carte = page.locator('[aria-label="Luminosité des nuances"]');
    assert.equal(await carte.getByRole('button', { name: '11 nuances' }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await carte.locator('.bascule-du-prereglage .bascule-option').allTextContents(), ['11', '13'], 'le préréglage à neuf nuances, sans 400 ni 950, est retiré');
    const avant = await compte(page);
    await carte.getByRole('button', { name: '13 nuances' }).click();
    assert.match(await carte.locator('.confirmation p').textContent(), /^Passer à 13 nuances ajoute 1000 et 1050\./);
    await carte.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await carte.locator('.confirmation').isVisible(), false);
    assert.equal(await compte(page), avant, 'Annuler ne range rien');

    await carte.getByRole('button', { name: '13 nuances' }).click();
    assert.match(await carte.locator('.confirmation p').textContent(), /^Passer à 13 nuances ajoute 1000 et 1050\. Les rôles gardent leurs numéros\./);
    await carte.getByRole('button', { name: 'Passer à 13 nuances' }).click();
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.crans.slice(-3), [950, 1000, 1050]);
    assert.deepEqual(rangement.recette.courbes.light.slice(-2), [0.215, 0.165]);
    await envoyer(page, rangee(rangement.demande));
    assert.equal(await carte.getByRole('button', { name: '13 nuances' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await carte.locator('.champ-de-courbe[data-mode="light"]').count(), 13);
    const rognes = await carte.locator('.champ-de-courbe').evaluateAll((champs) => champs.filter((champ) => champ.scrollWidth > champ.clientWidth).length);
    assert.equal(rognes, 0, 'treize valeurs tiennent à 500 px');
    assert.equal(await carte.getByText('Liste importée').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[ENT-10] une clarté éditée fait sonner la garantie, se range à la validation, et l’aperçu la suit', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avantLAperçu = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const clair700 = page.getByRole('textbox', { name: 'Thème Light 700' });
    assert.equal(await clair700.inputValue(), '0,5');
    assert.equal(await reglage(page, 'Luminosité des nuances').locator('.constat-alerte').count(), 0);
    const avant = await compte(page);
    await clair700.fill('0,56');
    assert.equal(await reglage(page, 'Luminosité des nuances').locator('.constat-alerte').count(), 2);
    assert.equal(await compte(page), avant, 'la saisie ne range rien');
    await clair700.press('Tab');
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.recette.courbes.light[7], 0.56);
    await envoyer(page, rangee(demande.demande));
    await clair700.fill('0,5');
    assert.equal(await reglage(page, 'Luminosité des nuances').locator('.constat-alerte').count(), 0);
    await clair700.fill('0,56');
    await clair700.press('Tab');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), avantLAperçu);
  } finally {
    await page.close();
  }
});

test('[REC-05] une clarté qui casse la courbe se refuse sous le groupe, et rien n’est rangé', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const avant = await compte(page);
    const clair700 = page.getByRole('textbox', { name: 'Thème Light 700' });
    await clair700.fill('0,9');
    await clair700.press('Tab');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant);
    assert.match(await reglage(page, 'Luminosité des nuances').locator('.field-error').textContent(), /doit être inférieure/);
  } finally {
    await page.close();
  }
});

test('[ENT-07] [ENT-12] chaque carte des Réglages communs compte les palettes qu’elle touche ; les cartes repliées, une ligne par seuil', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const fixes = ['Couleurs de fond', 'Intensités', 'Luminosité des nuances'];
    assert.deepEqual(await Promise.all(fixes.map((titre) => reglage(page, titre).locator('.carte-resume').textContent())), [
      '3 palettes concernées',
      '2 palettes concernées',
      '3 palettes concernées',
    ]);
    const comptes = [];
    for (const titre of ['Minimums des promesses', 'Détection des couleurs proches']) {
      assert.equal(await reglage(page, titre).getAttribute('data-ouverte'), 'false');
      await reglage(page, titre).locator('> .carte-bascule').click();
      comptes.push(...await reglage(page, titre).locator('.carte-corps .ligne-secondaire').evaluateAll((lignes) => lignes.map((ligne) => ligne.textContent).filter((texte) => /concernée/.test(texte))));
    }
    // Seuils de contraste, profils confondus, palettes proches.
    assert.deepEqual(comptes, [
      '3 palettes concernées',
      '2 palettes concernées',
      '3 palettes concernées',
    ]);
  } finally {
    await page.close();
  }
});

test('[ENT-05] un fond et un seuil se saisissent dans la configuration, et se rangent à la validation', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const fond = page.getByRole('textbox', { name: 'Fond du thème Dark' });
    assert.equal(await fond.inputValue(), '#121212');
    const avant = await compte(page);
    await fond.fill('#1c1c1c');
    await fond.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.fonds, { light: '#F7F7F7', dark: '#1C1C1C' });
    await envoyer(page, rangee(rangement.demande));

    await fond.fill('#12');
    await fond.press('Tab');
    assert.equal(await reglage(page, 'Couleurs de fond').locator('.field-error:visible').textContent(), 'Saisissez un code couleur à 6 caractères, par exemple #1E6FD9. « #12 » n’est pas accepté.');
    assert.equal(await compte(page), avant + 1, 'une couleur refusée ne se range pas');

    await reglage(page, 'Minimums des promesses').locator('> .carte-bascule').click();
    const texte = page.getByRole('textbox', { name: 'Texte', exact: true });
    await texte.fill('7');
    await texte.press('Tab');
    assert.equal((await prochaine(page, avant + 1)).recette.seuils.texte, 7);
  } finally {
    await page.close();
  }
});

const deplier = (page) => deplierLaCarte(page, 'Dérive de teinte');

test('[DER-01] le bouton de la dérive déplie le graphe : une ligne, le pivot, deux poignées, onze colonnes alignées', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    assert.equal(await page.locator('.derive-graphe').isVisible(), false, 'replié par défaut (E22)');
    await deplier(page);
    assert.equal(await page.locator('.derive-trait').count(), 1);
    assert.equal(await page.locator('.derive-pivot').count(), 1);
    assert.equal(await page.locator('.derive-poignee').count(), 2);
    const colonnes = await page.evaluate(() => {
      const cases = [...document.querySelectorAll('.derive-graphe rect')];
      return cases.map((rect) => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2);
    });
    assert.equal(colonnes.length, 22, 'onze cases de bande, onze crans');
    for (let rang = 0; rang < 11; rang += 1) assert.ok(Math.abs(colonnes[2 * rang] - colonnes[2 * rang + 1]) < 1e-6);
    assert.equal(await bascule(page, 'Dérive de teinte').getAttribute('aria-expanded'), 'true');
  } finally {
    await page.close();
  }
});

test('[DER-05] deux profils déliés tracent deux lignes, et les poignées portent l’initiale du profil', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('derive-deliee-libre'));
    await ouvrirLaPremierePalette(page);
    await deplier(page);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.derive-trait')].map((trait) => trait.getAttribute('class'))), [
      'derive-trait derive-trait-soft',
      'derive-trait derive-trait-vivid',
    ]);
    assert.deepEqual(await page.locator('.derive-poignee-lettre').allTextContents(), ['v', 'v']);
  } finally {
    await page.close();
  }
});

test('[DER-14] une référence plus sombre que le bout sombre masque la poignée sombre et le dit', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('reference-hors-rampe'));
    await ouvrirLaPremierePalette(page);
    await deplier(page);
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.derive-poignee')].map((poignee) => poignee.dataset.bout)), ['clair']);
    // La référence exacte porte la dernière nuance claire : le pivot tombe dans cette colonne ([DER-02]).
    assert.equal(await page.locator('.derive-pivot').count(), 1);
    assert.equal(await colonneDuPivot(page), 10);
    assert.match(await page.locator('.editeur-derive > .ligne-secondaire').textContent(), /plus sombre que toutes les nuances/);
  } finally {
    await page.close();
  }
});

/** Le rang de la colonne où le pivot tombe, lu sur les cases de la rampe sous le graphe. */
async function colonneDuPivot(page) {
  return page.evaluate(() => {
    const x = Number(/^M ([\d.]+)/.exec(document.querySelector('.derive-pivot').getAttribute('d'))[1]);
    const cases = [...document.querySelectorAll('.derive-graphe rect')].filter((_, rang) => rang % 2 === 1);
    return cases.findIndex((rect) => Math.abs(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2 - x) < 1e-6);
  });
}

test('[DER-04] synchronisés, les profils montrent le porteur : la rampe de Soft et sa référence exacte', async () => {
  const page = await ouvrirSur('reference-soft');
  try {
    await deplier(page);
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Soft · nuance 400');
    assert.equal(await colonneDuPivot(page), 4);
    const rampe = await page.evaluate(() => [...document.querySelectorAll('.derive-graphe rect')].filter((_, rang) => rang % 2 === 1).map((rect) => rect.getAttribute('fill')));
    assert.equal(rampe[4], '#A0B599');
  } finally {
    await page.close();
  }
});

test('[DER-02] le pivot tombe dans la colonne de la nuance qui porte la référence, et son infobulle la nomme', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplier(page);
    // #FACC15 est le 300 de vivid en Light.
    assert.equal(await colonneDuPivot(page), 3);
    assert.match(await page.locator('.derive-pivot title').textContent(), /Vivid · nuance 300 en Thème Light, 900 en Thème Dark/);
  } finally {
    await page.close();
  }
});

test('[DER-15] une palette grise désactive l’éditeur ; une palette très désaturée le garde', async () => {
  for (const [id, desactive] of [['palette-grise', true], ['palette-tres-desaturee', false]]) {
    const page = await ouvrirSur(id);
    try {
      assert.equal(await bascule(page, 'Dérive de teinte').isDisabled(), desactive, id);
      if (desactive) assert.equal(await carteDeLOnglet(page, 'Dérive de teinte').locator('.carte-resume').textContent(), 'Désactivée pour une palette grise');
    } finally {
      await page.close();
    }
  }
});

test('[VER-08] Q4 : un presque noir donne des rampes grises, sans point à vérifier ni note de poignée masquée', async () => {
  const page = await ouvrirSur('presque-noir');
  try {
    assert.equal(await page.locator('#panneau-palettes .constat-alerte').count(), 0);
    assert.equal(await page.locator('#panneau-palettes .constat-notice').count(), 0);
    assert.equal(await bascule(page, 'Dérive de teinte').isDisabled(), true);
    assert.equal(await page.locator('.editeur-derive > .ligne-secondaire:visible').count(), 0, 'la note de [DER-14] se tait quand l’éditeur est désactivé');
  } finally {
    await page.close();
  }
});

/** Le rangement qu'un geste envoie, aussitôt accepté : le geste suivant part avec son empreinte. */
async function rangementDe(page, avant) {
  const demande = await prochaine(page, avant);
  assert.equal(demande.type, 'ranger-recette');
  await envoyer(page, rangee(demande.demande));
  return demande.recette.palettes[0];
}

async function editeurSur(id) {
  const page = await ouvrirSur(id);
  await deplier(page);
  return page;
}

const poignee = (page, bout) => page.locator(`.derive-poignee[data-bout="${bout}"]`);

test('[DER-07] glisser une poignée suit le pointeur sans ranger, puis range au relâchement', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const avantLApercu = await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label');
    // L'éditeur est sous le nuancier : à 440 × 520, la poignée se fait voir avant d'être saisie.
    await poignee(page, 'clair').scrollIntoViewIfNeeded();
    const boite = await poignee(page, 'clair').locator('circle').boundingBox();
    const avant = await compte(page);
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width / 2, boite.y - 30, { steps: 4 });
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 50,"]').getAttribute('aria-label'), avantLApercu, 'l’aperçu suit le glisser');
    assert.equal(await compte(page), avant, 'rien ne se range pendant le glisser');
    await page.mouse.up();
    const palette = await rangementDe(page, avant);
    assert.ok(palette.derive.vivid.clair > 7.8, JSON.stringify(palette.derive));
    assert.ok(Number.isInteger(palette.derive.vivid.clair), 'au degré près');
    assert.equal(palette.derive.vivid.origine, 'libre');
    assert.deepEqual(palette.derive.soft, palette.derive.vivid);
  } finally {
    await page.close();
  }
});

test('[DER-09] au clavier, une poignée avance d’un degré, de cinq avec Maj, et garde le focus', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    await poignee(page, 'sombre').focus();
    const depart = Number(await poignee(page, 'sombre').getAttribute('aria-valuenow'));
    let avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.sombre, Math.round((depart + 1) * 100) / 100);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.bout), 'sombre', 'le focus survit au redessin');
    avant = await compte(page);
    await page.keyboard.press('Shift+ArrowDown');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.sombre, Math.round((depart - 4) * 100) / 100);
    avant = await compte(page);
    await page.keyboard.press('Home');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.sombre, -90);
    assert.match(await poignee(page, 'sombre').getAttribute('aria-valuetext'), /^Décalage de −90,0°, teinte obtenue : \d+°$/);
  } finally {
    await page.close();
  }
});

test('[DER-10] un double-clic ramène la poignée au préréglage Tailwind', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const tailwind = Number(await poignee(page, 'clair').getAttribute('aria-valuenow'));
    await poignee(page, 'clair').focus();
    let avant = await compte(page);
    await page.keyboard.press('Shift+ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await poignee(page, 'clair').locator('circle').dblclick();
    const palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, tailwind);
    assert.equal(palette.derive.vivid.origine, 'tailwind');
  } finally {
    await page.close();
  }
});

test('[DER-08] le champ et la réglette règlent le bout, virgule acceptée, Maj pour cinq degrés', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const champ = page.locator('.reglette').first().locator('.champ-nombre');
    let avant = await compte(page);
    await champ.fill('12,5');
    await champ.press('Tab');
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, 12.5);
    assert.equal(Number(await poignee(page, 'clair').getAttribute('aria-valuenow')), 12.5, 'le graphe suit le champ');
    avant = await compte(page);
    await page.locator('.reglette').first().locator('.reglette-curseur').focus();
    await page.keyboard.press('Shift+ArrowRight');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, 17.5);
  } finally {
    await page.close();
  }
});

test('[DER-11] le préréglage Constante pose deux dérives nulles', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    const avant = await compte(page);
    await page.getByRole('combobox', { name: 'Dérive de teinte' }).selectOption('constante');
    const palette = await rangementDe(page, avant);
    assert.deepEqual(palette.derive.vivid, { clair: 0, sombre: 0, origine: 'constante' });
    assert.deepEqual(palette.derive.soft, palette.derive.vivid);
  } finally {
    await page.close();
  }
});

test('[DER-12] délier règle un seul profil, relier demande confirmation et aligne soft sur vivid', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    let avant = await compte(page);
    await page.getByRole('checkbox', { name: 'Synchroniser la dérive de soft et vivid' }).click();
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.lien, false);
    await page.getByRole('group', { name: 'Profil à modifier' }).getByRole('button', { name: 'soft' }).click();
    await poignee(page, 'clair').focus();
    avant = await compte(page);
    await page.keyboard.press('Shift+ArrowUp');
    palette = await rangementDe(page, avant);
    assert.notDeepEqual(palette.derive.soft, palette.derive.vivid);
    const vivid = palette.derive.vivid;
    avant = await compte(page);
    await page.getByRole('checkbox', { name: 'Synchroniser la dérive de soft et vivid' }).click();
    assert.equal(await page.locator('.editeur-derive .confirmation').isVisible(), true);
    assert.equal(await compte(page), avant, 'relier attend la confirmation');
    await page.getByRole('button', { name: 'Appliquer à soft' }).click();
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.lien, true);
    assert.deepEqual(palette.derive.soft, vivid);
  } finally {
    await page.close();
  }
});

test('E21 : Ctrl+Z dans l’éditeur défait le dernier réglage, hors d’un champ texte', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    await poignee(page, 'clair').focus();
    const depart = Number(await poignee(page, 'clair').getAttribute('aria-valuenow'));
    let avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await page.keyboard.press('Control+z');
    const palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, Math.round((depart + 1) * 100) / 100);
    // Un réglage reste dans la pile : Ctrl+Z dans le champ ne doit pas le défaire.
    const champ = page.locator('.reglette').first().locator('.champ-nombre');
    await champ.focus();
    avant = await compte(page);
    await page.keyboard.press('Control+z');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'dans un champ texte, Ctrl+Z reste au champ');
  } finally {
    await page.close();
  }
});

test('[DER-03] à ±90°, les poignées et leurs étiquettes restent dans le cadre du graphe', async () => {
  for (const [clair, sombre] of [[90, -90], [-90, 90]]) {
    const page = await ouvrir();
    try {
      const message = structuredClone(messageDe('derive-deliee-libre'));
      message.classement.recette.palettes[0].derive.vivid = { clair, sombre, origine: 'libre' };
      await envoyer(page, message);
      await ouvrirLaPremierePalette(page);
      await deplier(page);
      const dehors = await page.evaluate(() => {
        const cadre = document.querySelector('.derive-graphe').getBoundingClientRect();
        return [...document.querySelectorAll('.derive-poignee text, .derive-poignee circle')]
          .map((noeud) => noeud.getBoundingClientRect())
          .filter((boite) => boite.top < cadre.top || boite.bottom > cadre.bottom || boite.left < cadre.left || boite.right > cadre.right)
          .length;
      });
      assert.equal(dehors, 0, `clair ${clair}, sombre ${sombre}`);
    } finally {
      await page.close();
    }
  }
});

const ID_DU_BLEU = 'p-3fa2c91e';
const dessinDe = (demande, resultat) => ({ type: 'dessin', demande, resultat });

const ETRANGERS = { issue: 'etrangers', cadres: [{ palette: ID_DU_BLEU, calques: [{ id: '40:7', nom: 'Note' }, { id: '40:8', nom: 'Flèche' }] }] };

/** La première demande du type donné, parmi celles qui suivent les `rang` premières. */
async function prochaineDuType(page, type, rang) {
  await page.waitForFunction(([cherche, n]) => window.demandes.slice(n).some((demande) => demande.type === cherche), [type, rang]);
  return (await demandes(page)).slice(rang).find((demande) => demande.type === type);
}

/** Ouvre l'onglet Palettes et clique le premier geste de la fiche d'une palette ([UI-05]). */
async function genererDepuisLaFiche(page, palette) {
  await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
  await page.locator(`#panneau-planche .fiche-planche[data-palette="${palette}"] [data-geste="generer"]`).click();
}

test('[PLA-24] [UI-05] « Générer sur Figma » d’une fiche envoie sa palette, dit la progression, rend les onglets inertes, puis montre l’état du cadre relu', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    // La génération n'a pas d'option : la grille des contrastes est toujours dessinée.
    assert.deepEqual(demande, { type: 'dessiner', demande: demande.demande, palettes: [ID_DU_BLEU], empreinteLue: messageDe('dessin-en-cours').empreinte, etrangersConfirmes: [] });
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).isDisabled(), false);
    await envoyer(page, { type: 'progression', demande: demande.demande, fait: 0, total: 1, nom: 'Bleu' });
    assert.equal(await page.locator('#panneau-planche .gestes-globaux .btn-secondary').textContent(), 'Génération de « Bleu »…', 'la progression prend la place de « Générer tout »');

    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('#panneau-planche .gestes-globaux .btn-secondary').textContent(), 'Générer tout (1 palette)');
    assert.equal(await page.locator('#panneau-planche .constat').count(), 0, 'aucun message de succès empilé');
    // Un dessin fini a posé des cadres : l'état se relit, et la fiche dit l'état du cadre.
    const relecture = await prochaineDuType(page, 'lire-etat', avant);
    await envoyer(page, { ...ETATS.find(({ id }) => id === 'generation-reussie').atteinte.findLast((etape) => etape.message?.type === 'etat').message, demande: relecture.demande });
    const fiche = page.locator(`.fiche-planche[data-palette="${ID_DU_BLEU}"]`);
    assert.equal(await fiche.getAttribute('data-etat'), 'a-jour');
    assert.deepEqual(await fiche.locator('.fiche-gestes button').allTextContents(), ['Afficher', 'Modifier'], 'un cadre à jour n’a pas de premier geste');
    const vu = await compte(page);
    await fiche.getByRole('button', { name: 'Afficher', exact: true }).click();
    assert.deepEqual(await prochaine(page, vu), { type: 'voir-sur-la-planche', demande: relecture.demande + 1, page: '40:1', cadres: ['40:2'] });
  } finally {
    await page.close();
  }
});

test('[PLA-24] D-I : au-delà de six palettes, tout dessiner se confirme, grille des contrastes comprise', async () => {
  const page = await ouvrirSur('confirmation-six-palettes');
  try {
    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    assert.equal(await page.locator('.fiche-planche[data-palette]').count(), 7);
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Générer tout (7 palettes)' }).click();
    assert.equal(await page.locator('#panneau-planche .confirmation').textContent(), 'La génération de 7 palettes ajoutera plus de 1 500 calques par palette. Confirmez pour lancer la génération.Générer sur FigmaAnnuler');
    await page.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await page.locator('#panneau-planche .confirmation').isVisible(), false);
    await page.getByRole('button', { name: 'Générer tout (7 palettes)' }).click();
    await page.locator('#panneau-planche .confirmation').getByRole('button', { name: 'Générer sur Figma' }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'dessiner');
    assert.equal(demande.palettes.length, 7);
    assert.equal(await compte(page), avant + 1, 'aucune demande pendant la confirmation');
  } finally {
    await page.close();
  }
});

test('[UI-05] une fiche à jour n’a pas de premier geste ; une modification enregistrée lui donne « Actualiser sur Figma »', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const fiche = page.locator(`.fiche-planche[data-palette="${ID_DU_BLEU}"]`);
    assert.equal(await fiche.locator('[data-geste="generer"]').count(), 0);
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    const avant = await compte(page);
    await page.locator('#panneau-palettes .champ-hexa').fill('#2563EB');
    await page.locator('#panneau-palettes .champ-hexa').press('Tab');
    const rangement = await prochaineDuType(page, 'ranger-recette', avant);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    const generer = fiche.locator('[data-geste="generer"]');
    assert.equal(await generer.textContent(), 'Actualiser sur Figma');
    assert.equal(await generer.isDisabled(), false);
    await generer.click();
    assert.deepEqual((await dessinEnvoye(page, 1)).palettes, [ID_DU_BLEU]);
  } finally {
    await page.close();
  }
});

test('[PLA-24] six palettes se dessinent sans confirmation', async () => {
  const page = await ouvrir();
  try {
    const sept = messageDe('confirmation-six-palettes');
    const recette = JSON.parse(JSON.stringify(sept.classement.recette));
    recette.palettes = recette.palettes.slice(0, 6);
    await envoyer(page, { ...sept, classement: { ...sept.classement, recette } });
    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Générer tout (6 palettes)' }).click();
    assert.equal((await dessinEnvoye(page, 1)).palettes.length, 6);
    assert.equal(await page.locator('#panneau-planche .confirmation').isVisible(), false);
  } finally {
    await page.close();
  }
});

test('[PLA-22] un dessin interrompu se relance à l’identique par « Réessayer »', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const premiere = await dessinEnvoye(page, 1);
    await envoyer(page, dessinDe(premiere.demande, { issue: 'interrompue', palette: ID_DU_BLEU, message: 'refus', dessines: 0 }));
    assert.equal(await page.locator('#panneau-planche .constat-bloquant .constat-quoi').textContent(), 'La génération s’est arrêtée : aucune nouvelle présentation de palette n’a été créée.');
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant').count(), 0, 'le résultat ne s’affiche que dans l’onglet Palettes');
    await page.locator('#panneau-planche').getByRole('button', { name: 'Réessayer' }).click();
    const reprise = await dessinEnvoye(page, 2);
    assert.deepEqual({ ...reprise, demande: 0 }, { ...premiere, demande: 0 });
    assert.ok(reprise.demande > premiere.demande);
  } finally {
    await page.close();
  }
});

test('E13 : un dessin refusé sur une autre recette propose de recharger', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'modifiee-ailleurs' }));
    // La fin du dessin relit déjà l'état : le clic doit en demander une seconde lecture, et aucun dessin.
    assert.equal((await prochaine(page, avant)).type, 'lire-etat');
    await page.locator('#panneau-planche .constat-bloquant').getByRole('button', { name: 'Recharger les palettes' }).click();
    assert.equal((await prochaine(page, avant + 1)).type, 'lire-etat');
    assert.equal(await compte(page), avant + 2);
  } finally {
    await page.close();
  }
});

test('l’onglet Palettes d’un fichier sans palette renvoie vers l’onglet Création', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('planche-sans-palette'));
    await page.getByRole('tab', { name: 'Palettes', exact: true }).click();
    assert.equal(await page.locator('#panneau-planche .gestes-globaux').isVisible(), false);
    await page.getByRole('button', { name: 'Créer une palette' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Création', exact: true }).getAttribute('aria-selected'), 'true');
  } finally {
    await page.close();
  }
});

test('E13 : un dessin qui attendait un rangement refusé est abandonné, et l’interface redevient active', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Dupliquer la palette' }).click();
    const rangement = await prochaine(page, avant);
    // Un rangement en vol : l'onglet Palettes ne relit pas l'état à son ouverture.
    await ouvrirLaPlanche(page);
    await page.locator(`#panneau-planche .fiche-planche[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), true);
    await envoyer(page, { type: 'rangement', demande: rangement.demande, issue: { issue: 'modifiee-ailleurs' } });
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('#panneau-palettes').evaluate((panneau) => panneau.inert), false);
    assert.deepEqual((await demandes(page)).slice(avant).map((demande) => demande.type), ['ranger-recette']);
  } finally {
    await page.close();
  }
});

const ID_DU_JAUNE = 'p-08b7d4a0';
const ouvrirLaPlanche = (page) => page.getByRole('tab', { name: 'Palettes', exact: true }).click();
const etatsDesLignes = (page) => page.locator('.fiche-planche[data-palette]').evaluateAll((lignes) => lignes.map((ligne) => ligne.dataset.etat));
const dessinsEnvoyes = async (page) => (await demandes(page)).filter((demande) => demande.type === 'dessiner');
/** Attend le `rang`-ième dessin envoyé, compté à partir de 1. */
async function dessinEnvoye(page, rang) {
  await page.waitForFunction((n) => window.demandes.filter((demande) => demande.type === 'dessiner').length >= n, rang);
  return (await dessinsEnvoyes(page))[rang - 1];
}

test('[PLA-20] l’onglet Palettes dit l’état de chaque cadre, et « Actualiser sur Figma » envoie la seule palette périmée', async () => {
  const page = await ouvrirSur('planche-perimee');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'perimee', 'jamais-dessinee']);
    const fiches = page.locator('.fiche-planche[data-palette]');
    // Chaque fiche porte sa pastille d'état, un cadre jamais dessiné compris (Y2.2).
    assert.deepEqual(await fiches.locator('.etat-du-cadre').allTextContents(), ['À jour', 'À actualiser', 'Pas encore sur Figma']);
    // Y1.9 : le premier geste quand le cadre en demande un, puis « Afficher » pour un cadre localisé, puis « Modifier ».
    assert.deepEqual(await fiches.evaluateAll((cartes) => cartes.map((fiche) => [...fiche.querySelectorAll('.fiche-gestes button')].map((bouton) => bouton.textContent))), [
      ['Afficher', 'Modifier'],
      ['Actualiser sur Figma', 'Afficher', 'Modifier'],
      ['Générer sur Figma', 'Modifier'],
    ]);
    assert.deepEqual(await fiches.locator('[data-geste="generer"]').evaluateAll((boutons) => boutons.map((bouton) => bouton.classList.contains('btn-primary'))), [true, true], 'le premier geste est le bouton principal');
    await fiches.nth(1).getByRole('button', { name: 'Actualiser sur Figma' }).click();
    const demande = await dessinEnvoye(page, 1);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'dessiner', demande: 0, palettes: [ID_DU_JAUNE], empreinteLue: messageDe('planche-perimee').empreinte, etrangersConfirmes: [] });
  } finally {
    await page.close();
  }
});

test('[PLA-20] une recette rangée périme le cadre de la palette qu’elle change, et lui seul', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'a-jour']);
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    const avant = await compte(page);
    const nom = page.getByRole('textbox', { name: 'Nom de la palette' });
    await nom.fill('Bleu roi');
    await nom.press('Tab');
    const rangement = await prochaine(page, avant);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['perimee', 'a-jour']);
  } finally {
    await page.close();
  }
});

test('[PLA-20] une courbe rangée depuis la configuration, ouverte sur l’onglet Palettes, périme tous les cadres', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const avant = await compte(page);
    const clair700 = page.getByRole('textbox', { name: 'Thème Light 700' });
    await clair700.fill('0,56');
    await clair700.press('Tab');
    await envoyer(page, rangee((await prochaine(page, avant)).demande));
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.deepEqual(await etatsDesLignes(page), ['perimee', 'perimee']);
  } finally {
    await page.close();
  }
});

const carteSupprimee = (page, cadre) => page.locator(`.carte-supprimee[data-cadre="${cadre}"]`);

test('[ENT-03] [UI-02] une palette supprimée se lit en une carte, et « Afficher dans Figma » montre son cadre', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await page.locator('.carte-supprimee .carte-titre').allTextContents(), ['Ardoise', 'Rouge']);
    const ardoise = carteSupprimee(page, '40:4');
    assert.equal(await ardoise.locator('p').first().textContent(), 'Palette supprimée du plugin. Ce cadre ne sera plus mis à jour.');
    assert.equal(await page.locator('#panneau-planche .constat-notice').count(), 0, 'plus de notice pour un cadre sans palette');
    const couleurs = await ardoise.evaluate((carte) => [getComputedStyle(carte).backgroundColor, getComputedStyle(document.querySelector('.fiche-planche[data-palette]')).backgroundColor]);
    assert.notEqual(couleurs[0], couleurs[1], 'la carte porte sa teinte d’avertissement');
    const avant = await compte(page);
    await ardoise.getByRole('button', { name: 'Afficher dans Figma' }).click();
    const demande = await prochaine(page, avant);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'voir-sur-la-planche', demande: 0, page: '40:1', cadres: ['40:4'] });
  } finally {
    await page.close();
  }
});

test('[PLA-27] « Supprimer définitivement » part sans confirmation ; la carte disparaît, le focus passe à la suivante, puis au compte', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    let avant = await compte(page);
    await carteSupprimee(page, '40:4').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const demande = await prochaine(page, avant);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'retirer-cadre', demande: 0, palette: 'p-5c1d0e77', cadre: '40:4' });
    assert.equal(await carteSupprimee(page, '40:6').getByRole('button', { name: 'Supprimer définitivement' }).isDisabled(), true, 'un seul retrait en vol');
    avant = await compte(page);
    await envoyer(page, { type: 'retrait', demande: demande.demande, issue: { issue: 'retire' } });
    assert.equal(await carteSupprimee(page, '40:4').count(), 0);
    assert.equal(await page.locator('#panneau-planche [role="status"]').textContent(), 'Cadre « Ardoise » supprimé. Ctrl+Z dans Figma le rétablit.');
    assert.equal(await carteSupprimee(page, '40:6').getByRole('button', { name: 'Afficher dans Figma' }).evaluate((bouton) => bouton === document.activeElement), true);
    assert.equal((await prochaine(page, avant)).type, 'lire-etat', 'l’état se relit');

    avant = await compte(page);
    await carteSupprimee(page, '40:6').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const second = await prochaine(page, avant);
    await envoyer(page, { type: 'retrait', demande: second.demande, issue: { issue: 'deja-absent' } });
    assert.equal(await page.locator('.carte-supprimee').count(), 0);
    assert.equal(await page.locator('.planche-compte').evaluate((ligne) => ligne === document.activeElement), true);
  } finally {
    await page.close();
  }
});

test('[PLA-27] un retrait refusé laisse la carte et le dit ; pendant un conflit, le geste est inactif et dit pourquoi', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    let avant = await compte(page);
    await carteSupprimee(page, '40:4').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const demande = await prochaine(page, avant);
    await envoyer(page, { type: 'retrait', demande: demande.demande, issue: { issue: 'refuse' } });
    assert.equal(await carteSupprimee(page, '40:4').count(), 1);
    assert.equal(await page.locator('#panneau-planche [role="status"] .constat-ou').textContent(), 'Cadre non supprimé : Ardoise');

    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    avant = await compte(page);
    await page.getByRole('textbox', { name: 'Nom de la palette' }).fill('Bleu roi');
    await page.getByRole('textbox', { name: 'Nom de la palette' }).press('Tab');
    const rangement = await prochaine(page, avant);
    await envoyer(page, { type: 'rangement', demande: rangement.demande, issue: { issue: 'modifiee-ailleurs' } });
    await ouvrirLaPlanche(page);
    const geste = carteSupprimee(page, '40:4').getByRole('button', { name: 'Supprimer définitivement' });
    assert.equal(await geste.isDisabled(), true);
    assert.equal(await geste.getAttribute('title'), 'Exportez vos modifications ou rechargez les palettes avant de supprimer un cadre.');
  } finally {
    await page.close();
  }
});

test('[PLA-25] une copie de cadre se signale, et ne compte pas comme le cadre de sa palette', async () => {
  const page = await ouvrirSur('copie-de-cadre');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-planche .constat-notice .constat-ou').textContent(), 'Copie du cadre « Bleu copie »');
  } finally {
    await page.close();
  }
});

test('E11 : un document Display P3 dit de copier l’hexa depuis la carte', async () => {
  const page = await ouvrirSur('document-display-p3');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-planche .constat-notice .constat-ou').textContent(), 'Fichier Figma en Display P3');
  } finally {
    await page.close();
  }
});


test('D-H : des calques étrangers se confirment ; « Annuler » ne dessine rien, « Remplacer le cadre et son contenu » les nomme au sandbox', async () => {
  const page = await ouvrirSur('calques-etrangers');
  try {
    // Le cadre est périmé : « Actualiser sur Figma » de sa fiche le redessine.
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, ETRANGERS));
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'La mise à jour supprimera' });
    assert.equal(await confirmation.locator('.constat-quoi').textContent(), 'La mise à jour supprimera les 2 calques que vous avez ajoutés dans ce cadre : « Note », « Flèche ».');
    assert.equal(await page.locator('#panneau-planche').evaluate((panneau) => panneau.inert), false);
    await confirmation.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await confirmation.count(), 0);
    assert.equal((await dessinsEnvoyes(page)).length, 1, 'annuler ne dessine rien');

    await page.locator(`#panneau-planche .fiche-planche[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    const seconde = await dessinEnvoye(page, 2);
    await envoyer(page, dessinDe(seconde.demande, ETRANGERS));
    await page.getByRole('button', { name: 'Remplacer le cadre et son contenu' }).click();
    const confirmee = await dessinEnvoye(page, 3);
    assert.deepEqual({ ...confirmee, demande: 0 }, { ...seconde, demande: 0, etrangersConfirmes: ['40:7', '40:8'] });
  } finally {
    await page.close();
  }
});

test('L6.14 : une couleur peinte autrement que l’aperçu est un point à vérifier près de la génération ; sans écart, rien ne s’ajoute', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    const zone = page.locator('#panneau-planche');
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await zone.locator('.constat').count(), 0);

    await page.locator(`#panneau-planche .fiche-planche[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    const peints = [{ palette: ID_DU_BLEU, nom: 'vivid/light/700', hexa: '#000000' }];
    await envoyer(page, dessinDe((await dessinEnvoye(page, 2)).demande, { issue: 'dessinee', page: '5:6', cadres, peints }));
    assert.equal(await zone.locator('.constat-alerte .constat-quoi').textContent(), '1 couleur ne correspond pas à l’aperçu.');
    assert.match(await zone.locator('.constat-alerte .constat-detail p').textContent(), /^Exemple, vivid\/light\/700 : #[0-9A-F]{6} dans l’aperçu, #000000 sur la planche\.$/);
    assert.equal(await zone.locator('.constat').count(), 1, 'le résultat suivant remplace le précédent');
  } finally {
    await page.close();
  }
});

test('[UI-05] le résultat d’une génération se lit dans l’onglet Palettes, jamais dans l’onglet Création', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    await envoyer(page, dessinDe(demande.demande, ETRANGERS));
    assert.equal(await page.locator('#panneau-planche .confirmation', { hasText: 'La mise à jour supprimera' }).count(), 1);
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    assert.doesNotMatch(await page.locator('#panneau-palettes').textContent(), /La mise à jour supprimera|Remplacer le cadre/);
  } finally {
    await page.close();
  }
});

test('[ENT-09] [UI-12] la saturation d’un profil se saisit dans la carte « Teinte, saturation, luminosité », repliée sur son résumé ; Soft reste sous Vivid, et le retour aux réglages communs la retire', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const soft = page.getByRole('textbox', { name: 'Saturation de Soft' });
    assert.equal(await soft.isVisible(), false, 'la carte est repliée à l’ouverture');
    // Vivid porte #FACC15 et prend sa saturation, 0,983 ([ENT-11]).
    assert.equal(await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.carte-resume').textContent(), 'Aucun réglage · Soft 45 % · Vivid 98 %');
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    // Le profil proposé d'abord ne porte pas la référence : Vivid la porte.
    assert.equal(await soft.inputValue(), '45 %');
    const avant = await compte(page);
    await soft.fill('60');
    await soft.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes[0].parts, { soft: 0.6, vivid: 0.983, origine: 'designer' });
    await envoyer(page, rangee(rangement.demande));

    // Soft ne dépasse jamais vivid : une saisie au-dessus s'arrête à la saturation de vivid.
    await soft.fill('99');
    await soft.press('Tab');
    const bornee = await prochaine(page, avant + 1);
    assert.deepEqual(bornee.recette.palettes[0].parts, { soft: 0.983, vivid: 0.983, origine: 'designer' });
    await envoyer(page, rangee(bornee.demande));

    await page.getByRole('button', { name: 'Utiliser les réglages communs pour l’intensité' }).click();
    assert.equal((await prochaine(page, avant + 2)).recette.palettes[0].parts, undefined);
  } finally {
    await page.close();
  }
});

test('[ENT-09] Z10.8 un glisser de teinte, de saturation ou de luminosité prévisualise sans enregistrer, et Échap rend la valeur d’avant le geste', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const nuance = page.locator('[aria-label^="Profil Soft, nuance 50,"]');
    const avantLApercu = await nuance.getAttribute('aria-label');
    const avant = await compte(page);
    for (const [grandeur, valeur] of [['Teinte', '20'], ['Saturation', '0.2'], ['Luminosité', '-0.05']]) {
      const curseur = page.getByRole('slider', { name: `${grandeur} de Soft` });
      await curseur.evaluate((element, v) => {
        element.value = v;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }, valeur);
      // L'aperçu se rend à l'image suivante : un seul rendu par image pendant un glisser (Z4).
      await page.waitForFunction((a) => document.querySelector('[aria-label^="Profil Soft, nuance 50,"]').getAttribute('aria-label') !== a, avantLApercu, { timeout: 2000 });
      assert.equal(await compte(page), avant, `${grandeur} : rien ne s’enregistre pendant le geste`);
      await curseur.press('Escape');
      assert.equal(await nuance.getAttribute('aria-label'), avantLApercu, `${grandeur} : Échap rend l’aperçu d’avant`);
    }
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    assert.equal(await nuance.getAttribute('aria-label'), avantLApercu, 'aucun aperçu en attente ne revient après Échap');
    assert.equal(await compte(page), avant);
  } finally {
    await page.close();
  }
});

test('[VER-10] la saturation de la référence se situe par un repère sur la piste de saturation, sans message permanent', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    // #FACC15 a une intensité de 0,98, au-dessus de la part commune de vivid (0,95) : Vivid la prend ([ENT-11]).
    const reperes = page.locator('.reglages-de-la-palette .repere-de-reference:visible');
    assert.equal(await reperes.count(), 1);
    assert.match(await reperes.getAttribute('title'), /^Intensité de la couleur de référence : 0,98$/);
    assert.equal(await reperes.evaluate((repere) => repere.closest('.reglage-de-la-palette').querySelector('input[type="range"]').getAttribute('aria-label')), 'Saturation de Soft');
    assert.equal(await page.locator('.reglages-de-la-palette > .constats .constat').count(), 0, 'aucune notice permanente');
    assert.equal(await page.locator('.reglages-de-la-palette > .constat-detail').isVisible(), false, 'aucune notice à déplier : Vivid porte la référence à sa saturation');
    assert.equal(await page.locator('#panneau-palettes .constats-titre-notice').count(), 0);
  } finally {
    await page.close();
  }
});

test('[VER-11] [UI-12] des profils confondus s’annoncent sur la carte repliée, se lisent sous ses curseurs, et mènent aux intensités communes', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    assert.match(await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.carte-resume').textContent(), / · 1 point à vérifier$/);
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const message = page.locator('.reglages-de-la-palette .ligne-fixe[data-ton="avertissement"]').filter({ hasText: 'soft et vivid' });
    // L'alerte ne nomme que les nuances des emplois ; le repère de l'aperçu porte sur toute la liste ([PLA-15]).
    assert.equal(await message.locator('.ligne-fixe-texte').textContent(), 'Bleu : nuances Light 100 · Les couleurs soft et vivid sont très proches sur ces nuances.');
    assert.equal((await message.boundingBox()).height, 24);
    assert.deepEqual(await page.locator('.pastille[data-confondue="true"]').evaluateAll((pastilles) => pastilles.map((pastille) => `${pastille.dataset.profil} ${pastille.dataset.cran}`)), ['soft 50', 'soft 100', 'vivid 50', 'vivid 100']);
    await message.getByRole('button', { name: 'Intensités communes' }).click();
    assert.equal(await page.locator('.page-title').textContent(), 'Réglages communs');
  } finally {
    await page.close();
  }
});

test('D-G [DER-15] : une palette grise le dit sous les curseurs et n’a pas de teinte à régler ; saturer Vivid rend la teinte réglable', async () => {
  const page = await ouvrirSur('palette-grise');
  try {
    const lignes = await page.locator('.reglages-de-la-palette > .ligne-fixe:not([hidden]) .ligne-fixe-texte').allTextContents();
    assert.ok(lignes.includes('Votre couleur de référence est un gris pur. Soft et Vivid sont gris.'), JSON.stringify(lignes));
    assert.equal(await page.getByRole('button', { name: 'Utiliser les réglages communs pour l’intensité' }).isVisible(), false);
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const reglages = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    assert.equal(await reglages.getByRole('slider', { name: /^Teinte de / }).isDisabled(), true);
    assert.equal(await reglages.getByRole('textbox', { name: /^Teinte de / }).isDisabled(), true);
    assert.equal(await reglages.getByText('Cette palette est entièrement grise. Il n’y a pas de teinte à régler.').isVisible(), true);
    assert.equal(await reglages.getByRole('slider', { name: /^Saturation de / }).isDisabled(), false);
    assert.equal(await reglages.getByRole('slider', { name: /^Luminosité de / }).isDisabled(), false);

    // Vivid saturé colore ses nuances : la teinte que l'octet imposait se règle (R4).
    const avant = await compte(page);
    const vivid = reglages.getByRole('textbox', { name: 'Saturation de Vivid' });
    await vivid.fill('30');
    await vivid.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes[0].parts, { soft: 0, vivid: 0.3, origine: 'designer' });
    await envoyer(page, rangee(rangement.demande));
    assert.equal(await reglages.getByRole('slider', { name: /^Teinte de / }).isDisabled(), false);
    assert.equal(await reglages.getByText('Cette palette est entièrement grise. Il n’y a pas de teinte à régler.').isVisible(), false);
    assert.equal(await bascule(page, 'Dérive de teinte').isDisabled(), false);
  } finally {
    await page.close();
  }
});

test('T3 [DER-15] : une palette très désaturée n’a pas de ligne d’origine, et sa teinte se règle', async () => {
  const page = await ouvrirSur('palette-tres-desaturee');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const reglages = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    const lignes = await page.locator('.reglages-de-la-palette > .ligne-fixe:not([hidden]) .ligne-fixe-texte').allTextContents();
    assert.ok(lignes.length > 0, 'les lignes fixes de la carte se relèvent');
    assert.ok(!lignes.some((ligne) => /réglages communs|gris pur/.test(ligne)), JSON.stringify(lignes));
    assert.equal(await reglages.getByRole('slider', { name: /^Teinte de / }).isDisabled(), false);
    assert.equal(await page.locator('#panneau-palettes .ligne-fixe[data-ton="avertissement"]').filter({ hasText: 'soft et vivid' }).count(), 0, 'aucun point à vérifier, « Profils confondus » compris');
    assert.match(await page.locator('.pied-texte').textContent(), / · aucune alerte$/);
  } finally {
    await page.close();
  }
});

test('[VER-15] un lien de message ouvre les Réglages communs sur son groupe, et le retour rend le focus au lien', async () => {
  const page = await ouvrirSur('fond-personnalise');
  try {
    await page.locator('.pied-de-la-palette').getByRole('button', { name: 'Détails' }).click();
    const lien = page.locator('.volet-de-la-palette .constat-alerte').getByRole('button', { name: 'Couleurs de fond' });
    await lien.click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Fond du thème Light');
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Couleurs de fond');
  } finally {
    await page.close();
  }
});

/** Le fichier que « Exporter la recette » propose : son nom et son contenu. */
/** Déplie la carte « Palettes et réglages » de l'onglet Palettes, quand l'onglet en a une : un blocage porte ses gestes lui-même. */
async function deplierLaRecette(page, dans) {
  if (await carteDeLOnglet(page, 'Palettes et réglages', dans).count() > 0) await deplierLaCarte(page, 'Palettes et réglages', dans);
}

async function exporter(page, dans) {
  await deplierLaRecette(page, dans);
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(dans).getByRole('button', { name: 'Exporter les palettes et les réglages' }).click(),
  ]);
  return { nom: telechargement.suggestedFilename(), contenu: readFileSync(await telechargement.path(), 'utf8') };
}
const importerLeFichier = async (page, dans, contenu) =>
  (await deplierLaRecette(page, dans), page).locator(`${dans} input[type="file"]`).setInputFiles({ name: 'palettes-et-reglages.json', mimeType: 'application/json', buffer: Buffer.from(contenu) });

test('L7.7 : exporter la recette, modifier le JSON, l’importer, voir l’écart, confirmer, puis dessiner', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    assert.equal(await page.getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).count(), 0, 'une recette lisible ne se remplace que par un import');
    const exporte = await exporter(page, '#panneau-planche');
    assert.equal(exporte.nom, 'palettes-et-reglages.json');
    assert.equal(exporte.contenu, messageDe('planche-a-jour').texte, '[REC-07] le JSON canonique de la recette rangée');

    const modifiee = JSON.parse(exporte.contenu);
    modifiee.palettes[0].nom = 'Bleu roi';
    modifiee.seuils.texte = 7;
    const avant = await compte(page);
    await importerLeFichier(page, '#panneau-planche', JSON.stringify(modifiee, null, 2));
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?' });
    assert.deepEqual(await confirmation.locator('p').allTextContents(), [
      'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?',
      'Palette à modifier : Bleu roi (nom).',
      'Réglage commun à modifier : minimum des textes.',
      'Minimums des promesses : le résultat des garanties peut changer, sans changer les couleurs.',
      'Sur la planche : 2 cadres passeront « À actualiser » (Bleu roi, Jaune).',
      'L’import remplacera vos palettes et vos réglages dans ce fichier Figma. La planche restera telle quelle jusqu’à sa prochaine mise à jour.',
    ]);
    assert.equal(await compte(page), avant, 'rien ne se range avant la confirmation');
    await confirmation.getByRole('button', { name: 'Remplacer par cette sauvegarde' }).click();
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    assert.deepEqual(rangement.recette, modifiee);
    assert.equal(rangement.empreinteLue, messageDe('planche-a-jour').empreinte);
    await envoyer(page, rangee(rangement.demande));

    assert.equal(await page.locator('.fiche-planche[data-palette] .carte-titre').first().textContent(), 'Bleu roi');
    assert.equal(await page.locator('.fiche-planche[data-palette]').first().getAttribute('data-etat'), 'perimee');
    await page.getByRole('button', { name: 'Générer tout (2 palettes)' }).click();
    const dessin = await dessinEnvoye(page, 1);
    assert.deepEqual(dessin.palettes, modifiee.palettes.map(({ id }) => id));
    assert.equal(dessin.empreinteLue, '0000000f', 'le dessin part sur la recette importée');
  } finally {
    await page.close();
  }
});

test('[REC-11] E19 : une recette illisible s’exporte telle qu’elle est rangée, et repart de la recette par défaut après confirmation', async () => {
  const page = await ouvrir();
  try {
    const illisible = messageDe('recette-illisible');
    await envoyer(page, illisible);
    const bloquant = '#panneau-palettes';
    assert.equal((await exporter(page, bloquant)).contenu, illisible.texte);
    const avant = await compte(page);
    await page.locator(bloquant).getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).click();
    assert.equal(await compte(page), avant, 'la confirmation vient avant tout rangement');
    await page.locator(bloquant).getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes, []);
    assert.equal(rangement.empreinteLue, illisible.empreinte);
    assert.equal(await page.locator('#panneau-palettes .constat-bloquant:visible').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).count(), 0);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    assert.equal(await page.locator('#panneau-planche .constat-bloquant:visible').count(), 0, 'l’onglet Palettes quitte aussi le bloquant');
    assert.equal(await page.getByText('Créez une palette dans l’onglet « Création » pour pouvoir générer sa présentation ici.').isVisible(), true);
  } finally {
    await page.close();
  }
});

test('[REC-08] un fichier d’une version future ou cassé se refuse, et rien ne se range', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaPlanche(page);
    await importerLeFichier(page, '#panneau-planche', JSON.stringify({ formatVersion: 99 }));
    assert.equal(await page.locator('#panneau-planche .constat-bloquant .constat-ou').textContent(), 'Import impossible : palettes-et-reglages.json, format 99');
    await importerLeFichier(page, '#panneau-planche', '{pas du json');
    assert.match(await page.locator('#panneau-planche .constat-bloquant .constat-quoi').textContent(), /Vos palettes et vos réglages actuels sont conservés\.$/);
    // L'onglet Palettes relit l'état à son ouverture ([PLA-20]) : seul un rangement compte ici.
    assert.deepEqual((await demandes(page)).filter((demande) => demande.type === 'ranger-recette'), []);
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue un fichier : l’écart d’import attend sa confirmation', async () => {
  const page = await pageDeGalerie('ecart-d-import');
  try {
    const confirmation = page.locator('#panneau-planche .confirmation', { hasText: 'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?' });
    assert.equal(await confirmation.locator('p').nth(1).textContent(), 'Palette à ajouter : Ardoise.');
  } finally {
    await page.close();
  }
});

/** Le rapport que « Exporter le rapport » propose, relu en JSON. */
async function exporterLeRapport(page) {
  await deplierLaCarte(page, 'Palettes et réglages', '#panneau-planche');
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exporter le rapport de vérification' }).click(),
  ]);
  assert.equal(telechargement.suggestedFilename(), 'rapport-palettes.json');
  return JSON.parse(readFileSync(await telechargement.path(), 'utf8'));
}

test('[VER-01] [VER-02] le rapport porte l’empreinte de la recette, ses palettes, et les écarts du dernier dessin', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const avant = await exporterLeRapport(page);
    assert.equal(avant.empreinte, messageDe('planche-a-jour').empreinte);
    assert.deepEqual(avant.palettes.map(({ nom }) => nom), ['Bleu', 'Jaune']);
    // Seize paires par profil et par thème, dont les deux de surface-card (X6).
    assert.equal(avant.palettes[0].promesses.length, 76);
    assert.equal(avant.ecartsDuDernierDessin, null, 'aucun dessin depuis l’ouverture');

    await page.getByRole('button', { name: 'Générer tout (2 palettes)' }).click();
    const peints = [{ palette: ID_DU_BLEU, nom: 'vivid/light/700', hexa: '#000000' }];
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, { issue: 'dessinee', page: '40:1', cadres: [], peints }));
    const apres = await exporterLeRapport(page);
    assert.deepEqual(apres.ecartsDuDernierDessin.map(({ nom, peint }) => [nom, peint]), [['vivid/light/700', '#000000']]);
  } finally {
    await page.close();
  }
});

test('[VER-01] une recette illisible n’a pas de rapport à exporter', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('recette-illisible'));
    await ouvrirLaPlanche(page);
    assert.equal(await page.getByRole('button', { name: 'Exporter les palettes et les réglages' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Exporter le rapport de vérification' }).count(), 0);
  } finally {
    await page.close();
  }
});

/** La couleur de fond calculée d'un élément, et celle de la carte qui le porte. */
const fonds = (locator) => locator.evaluate((element) => [getComputedStyle(element).backgroundColor, getComputedStyle(element.closest('.carte')).backgroundColor]);

test('Y1.4 : l’onglet actif des trois bascules, Thème, Soft et Vivid, Écran et États, a le même fond, distinct de sa carte, aux deux thèmes de Figma', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Garanties de contraste');
    await deplierLaCarte(page, 'Interface de test');
    const actifs = [
      page.locator('.nuancier-tete .bascule-option[aria-pressed="true"]'),
      page.locator('.bascule-des-profils .bascule-option[aria-pressed="true"]'),
      page.locator('.bascule-de-l-essai .bascule-option[aria-pressed="true"]'),
    ];
    for (const theme of ['clair', 'sombre']) {
      if (theme === 'sombre') await page.evaluate(() => document.documentElement.classList.add('figma-dark'));
      const releves = await Promise.all(actifs.map(fonds));
      for (const [onglet, carte] of releves) {
        assert.notEqual(onglet, carte, `${theme} : l’onglet actif se confond avec sa carte`);
        assert.notEqual(onglet, 'rgba(0, 0, 0, 0)', `${theme} : l’onglet actif n’a pas de fond`);
      }
      assert.equal(new Set(releves.map(([onglet]) => onglet)).size, 1, `${theme} : trois fonds différents ${JSON.stringify(releves)}`);
    }
  } finally {
    await page.close();
  }
});

test('Y1.5 : dans la grille des États, deux anneaux de focus de rangées voisines gardent un jour entre eux', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Interface de test');
    await page.locator('.bascule-de-l-essai .bascule-option').nth(1).click();
    // L'anneau déborde de 4 px de chaque spécimen ; le jour se mesure entre les anneaux de deux rangées voisines.
    const jours = await page.locator('.essai-etats').evaluate((grille) => {
      const rangees = [...grille.querySelectorAll('.essai-rangee')].filter((rangee) => rangee.querySelector('.essai-specimen'));
      const bornes = rangees.map((rangee) => {
        const boites = [...rangee.querySelectorAll('.essai-specimen')].map((specimen) => specimen.getBoundingClientRect());
        return { haut: Math.min(...boites.map((boite) => boite.top)) - 4, bas: Math.max(...boites.map((boite) => boite.bottom)) + 4 };
      });
      return bornes.slice(1).map((borne, rang) => borne.haut - bornes[rang].bas);
    });
    assert.ok(jours.length >= 6, JSON.stringify(jours));
    assert.ok(Math.min(...jours) > 0, `deux anneaux se touchent : ${JSON.stringify(jours)}`);
  } finally {
    await page.close();
  }
});

test('Y1.6 : les gestes d’une fiche et ceux d’une palette supprimée ont la même hauteur, « Supprimer définitivement » compris', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    const hauteurs = await page.locator('#panneau-planche .fiche-gestes button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getBoundingClientRect().height]));
    assert.ok(hauteurs.some(([texte]) => texte === 'Supprimer définitivement'), JSON.stringify(hauteurs));
    assert.ok(hauteurs.some(([texte]) => texte === 'Modifier'), JSON.stringify(hauteurs));
    assert.deepEqual([...new Set(hauteurs.map(([, hauteur]) => hauteur))], [24], JSON.stringify(hauteurs));
  } finally {
    await page.close();
  }
});

/** Les intensités que l'aperçu, les garanties et l'interface de test montrent. */
async function intensitesMontrees(page) {
  return {
    apercu: [...new Set(await page.locator('.nuancier-grille .pastille[data-profil]').evaluateAll((pastilles) => pastilles.map((pastille) => pastille.dataset.profil)))],
    basculeDesGaranties: await page.locator('.bascule-des-profils').isVisible(),
    basculeDeLEssai: await page.locator('.bascule-du-profil-essaye').isVisible(),
    carteDesReglages: await carteDeLOnglet(page, CARTE_DES_REGLAGES).isVisible(),
    cibleDesReglages: await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.cible-des-reglages').evaluate((cible) => !cible.hidden),
    synchronisation: await carteDeLOnglet(page, 'Dérive de teinte').getByText('Synchroniser', { exact: false }).isVisible(),
  };
}

test('Y4.8 [ENT-14] : le segment « Une » des intensités change l’aperçu, les garanties, l’interface de test, le choix du profil à régler et la dérive ; le retour les rend', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await deplierLaCarte(page, 'Garanties de contraste');
    await deplierLaCarte(page, 'Interface de test');
    await deplierLaCarte(page, 'Dérive de teinte');
    const configuration = carteDeLOnglet(page, 'Configuration de la palette');
    assert.deepEqual(await intensitesMontrees(page), { apercu: ['soft', 'vivid'], basculeDesGaranties: true, basculeDeLEssai: true, carteDesReglages: true, cibleDesReglages: true, synchronisation: true });
    // La configuration choisit par des segments, comme le modèle ; les deux cartes et leurs rampes restent à la création.
    const intensites = configuration.getByRole('group', { name: 'Intensités' });
    const [une, deux] = [intensites.getByRole('button', { name: 'Une', exact: true }), intensites.getByRole('button', { name: 'Deux', exact: true })];
    assert.deepEqual([await une.getAttribute('aria-pressed'), await deux.getAttribute('aria-pressed')], ['false', 'true']);
    assert.equal(await intensites.evaluate((groupe) => groupe.classList.contains('bascule-de-base')), true, 'la facture des segments du modèle');
    assert.equal(await configuration.getByRole('radio').count(), 0);
    assert.equal(await configuration.getByRole('switch').count(), 0);
    assert.equal(await configuration.getByRole('group', { name: 'Référence exacte dans' }).isVisible(), true);
    const avant = await compte(page);
    await une.click();
    const rangement = await prochaineDuType(page, 'ranger-recette', avant);
    assert.equal(rangement.recette.palettes[0].intensites, 1);
    assert.deepEqual([await une.getAttribute('aria-pressed'), await deux.getAttribute('aria-pressed')], ['true', 'false']);
    assert.deepEqual(await intensitesMontrees(page), { apercu: ['unique'], basculeDesGaranties: false, basculeDeLEssai: false, carteDesReglages: true, cibleDesReglages: false, synchronisation: false });
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : nuance 600', 'la référence ne nomme plus de profil');
    assert.equal(await configuration.getByRole('group', { name: 'Référence exacte dans' }).isVisible(), false);
    assert.match(await configuration.getByText(/^Intensité : /).textContent(), /^Intensité : 0,\d+$/);
    await envoyer(page, rangee(rangement.demande));
    const suivant = await compte(page);
    await deux.click();
    assert.equal((await prochaineDuType(page, 'ranger-recette', suivant)).recette.palettes[0].intensites, undefined);
    assert.deepEqual((await intensitesMontrees(page)).apercu, ['soft', 'vivid']);
  } finally {
    await page.close();
  }
});

test('Y4.8 [PLA-20] : changer le nombre d’intensités d’une palette générée fait passer son cadre « À actualiser »', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'a-jour']);
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    const avant = await compte(page);
    await carteDeLOnglet(page, 'Configuration de la palette').getByRole('group', { name: 'Intensités' }).getByRole('button', { name: 'Une', exact: true }).click();
    await envoyer(page, rangee((await prochaineDuType(page, 'ranger-recette', avant)).demande));
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['perimee', 'a-jour']);
    const fiche = page.locator(`.fiche-planche[data-palette="${ID_DU_BLEU}"]`);
    assert.deepEqual(await fiche.locator('.fiche-rangee').evaluateAll((rangees) => rangees.map((rangee) => rangee.dataset.intensite)), ['unique'], 'la fiche ne montre que la rampe présente');
  } finally {
    await page.close();
  }
});

test('Y6.3 : chaque fiche porte son état en pastille et ses gestes dans l’ordre ; après une génération, le focus revient à la fiche', async () => {
  const page = await ouvrirSur('fiche-refaite');
  try {
    await ouvrirLaPlanche(page);
    const fiches = page.locator('.fiche-planche[data-palette]');
    assert.deepEqual(await fiches.locator('.carte-tete .pastille-d-etat').allTextContents(), ['À jour', 'À actualiser', 'Pas encore sur Figma']);
    assert.deepEqual(await fiches.evaluateAll((cartes) => cartes.map((fiche) => [...fiche.querySelectorAll('.fiche-gestes button')].map((bouton) => bouton.dataset.geste))), [
      ['voir', 'modifier'],
      ['generer', 'voir', 'modifier'],
      ['generer', 'modifier'],
    ]);
    const jaune = fiches.nth(1);
    await jaune.getByRole('button', { name: 'Actualiser sur Figma' }).click();
    const demande = await dessinEnvoye(page, 1);
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'dessinee', page: '40:1', cadres: [{ palette: ID_DU_JAUNE, cadre: '40:3' }], peints: [] }));
    const relecture = await prochaineDuType(page, 'lire-etat', avant);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.geste), 'generer', 'le focus revient au geste, que le dessin avait rendu inerte');
    // Relu à jour, le cadre n'a plus de premier geste : le focus passe au premier geste de la même fiche.
    const aJour = messageDe('planche-a-jour');
    await envoyer(page, { ...messageDe('fiche-refaite'), demande: relecture.demande, planche: { ...messageDe('fiche-refaite').planche, cadres: messageDe('fiche-refaite').planche.cadres.map((cadre) => (cadre.palette === ID_DU_JAUNE ? { ...cadre, empreinte: aJour.planche.cadres.find(({ palette }) => palette === ID_DU_JAUNE)?.empreinte ?? cadre.empreinte } : cadre)) } });
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.fiche-planche')?.dataset.palette), ID_DU_JAUNE);
  } finally {
    await page.close();
  }
});

/**
 * Les couleurs calculées d'un élément, en sRGB de 0 à 1, et le contraste WCAG
 * de son texte sur son fond. `color-mix` se calcule en `color(srgb …)`, une
 * couleur de rôle en `rgb(…)`.
 */
function couleursCalculees(element) {
  const lire = (ecrite) => {
    const srgb = /color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/.exec(ecrite);
    if (srgb) return srgb.slice(1, 4).map(Number);
    return /rgba?\((\d+), (\d+), (\d+)/.exec(ecrite).slice(1, 4).map((valeur) => Number(valeur) / 255);
  };
  const luminance = (canaux) => {
    const [r, v, b] = canaux.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * v + 0.0722 * b;
  };
  const style = getComputedStyle(element);
  const [texte, fond] = [lire(style.color), lire(style.backgroundColor)].map(luminance);
  const role = (nom) => {
    const temoin = document.createElement('span');
    temoin.style.background = `var(${nom})`;
    document.body.append(temoin);
    const valeur = getComputedStyle(temoin).backgroundColor;
    temoin.remove();
    return valeur;
  };
  return {
    fond: style.backgroundColor,
    texte: style.color,
    contraste: (Math.max(texte, fond) + 0.05) / (Math.min(texte, fond) + 0.05),
    roles: Object.fromEntries(['--fond-succes', '--fond-note', '--fond-avertissement', '--fond-danger', '--texte-avertissement', '--texte-danger'].map((nom) => [nom, role(nom)])),
  };
}

test('Z1.5 : « À jour » a le fond de succès, distinct de celui des notes ; « À actualiser » et « Pas encore sur Figma » l’avertissement ; introuvable et illisible le danger ; chaque texte tient 4,5:1 aux deux thèmes de Figma', async () => {
  const page = await ouvrirSur('pastilles-des-etats');
  try {
    await ouvrirLaPlanche(page);
    const pastilles = page.locator('.fiche-planche[data-palette] .carte-tete .pastille-d-etat');
    assert.deepEqual(await pastilles.allTextContents(), ['À jour', 'À actualiser', 'Pas encore sur Figma', 'Cadre introuvable', 'Lecture impossible']);
    for (const theme of ['clair', 'sombre']) {
      if (theme === 'sombre') await page.evaluate(() => document.documentElement.classList.add('figma-dark'));
      const [aJour, perimee, jamais, introuvable, illisible] = await pastilles.evaluateAll((elements, source) => elements.map(new Function(`return ${source}`)()), couleursCalculees.toString());
      const roles = aJour.roles;
      assert.equal(aJour.fond, roles['--fond-succes'], `thème ${theme} : « À jour » sur le fond de succès`);
      assert.notEqual(aJour.fond, roles['--fond-note'], `thème ${theme} : « À jour » distinct du fond des notes`);
      for (const [nom, pastille] of Object.entries({ perimee, jamais })) {
        assert.deepEqual([pastille.fond, pastille.texte], [roles['--fond-avertissement'], roles['--texte-avertissement']], `thème ${theme} : ${nom} en avertissement`);
      }
      for (const [nom, pastille] of Object.entries({ introuvable, illisible })) {
        assert.deepEqual([pastille.fond, pastille.texte], [roles['--fond-danger'], roles['--texte-danger']], `thème ${theme} : ${nom} en danger`);
      }
      for (const [nom, pastille] of Object.entries({ aJour, perimee, jamais })) {
        assert.ok(pastille.contraste >= 4.5, `thème ${theme} : ${nom} à ${pastille.contraste.toFixed(2)}:1`);
      }
    }
  } finally {
    await page.close();
  }
});

/** La largeur du code, et celle que sa ligne lui laisse après la pastille et l'espacement. */
const largeurDuCode = (code) => code.evaluate((saisie) => {
  const ligne = saisie.closest('.champ-ligne');
  const pastille = ligne.querySelector('.pipette');
  const ecart = parseFloat(getComputedStyle(ligne).columnGap);
  return { code: saisie.getBoundingClientRect().width, libre: ligne.getBoundingClientRect().width - pastille.getBoundingClientRect().width - ecart };
});

test('Z1.6 : le code hexa prend la largeur de sa colonne, moins la pastille, dans la configuration et dans la création ; à 500 px, le nom et la référence tiennent sur une rangée', async () => {
  for (const taille of [PAR_DEFAUT, MINIMALE]) {
    const page = await ouvrirSur('palette-deux-intensites', taille);
    try {
      const configuration = carteDeLOnglet(page, 'Configuration de la palette');
      const code = configuration.locator('.colonnes-de-base .champ-hexa');
      const { code: largeur, libre } = await largeurDuCode(code);
      assert.ok(Math.abs(largeur - libre) < 1, `${taille.width} px : le code mesure ${largeur} px pour ${libre} px libres`);
      assert.ok(largeur > 88, `${taille.width} px : le code dépasse l’ancienne largeur fixe`);
      assert.equal(await code.evaluate((saisie) => getComputedStyle(saisie).fontVariantNumeric), 'tabular-nums');
      const [nom, reference] = await configuration.locator('.colonnes-de-base > .champ-colonne').evaluateAll((colonnes) => colonnes.map((colonne) => colonne.getBoundingClientRect()));
      assert.equal(nom.top, reference.top, `${taille.width} px : le nom et la référence sur une rangée`);
      assert.ok(reference.right <= (await configuration.boundingBox()).x + (await configuration.boundingBox()).width, `${taille.width} px : la référence tient dans la carte`);

      await page.locator('.bouton-de-barre').click();
      const creation = page.locator('#panneau-palettes .champ-creation');
      const saisie = await largeurDuCode(creation);
      assert.ok(Math.abs(saisie.code - saisie.libre) < 1, `${taille.width} px : le code de la création mesure ${saisie.code} px pour ${saisie.libre} px libres`);
    } finally {
      await page.close();
    }
  }
});

/** Ce que l'onglet Création montre de lui-même : le sélecteur, le menu, l'invitation et la palette. */
const vueDeLaCreation = (page) => page.evaluate(() => {
  const visible = (selecteur) => {
    const element = document.querySelector(`#panneau-palettes ${selecteur}`);
    return Boolean(element && element.getClientRects().length > 0);
  };
  return {
    selecteur: document.querySelector('.selecteur-nom')?.textContent,
    invitation: visible('.invitation') ? document.querySelector('.invitation').innerText.split('\n').filter(Boolean) : null,
    menu: visible('.menu-palette'),
    nouvelle: visible('.bouton-de-barre'),
    palette: visible('.configuration-de-la-palette'),
  };
});

const INVITATION = ['Choisissez une palette', 'Sélectionnez une palette dans la liste pour la régler, ou créez-en une avec « Nouvelle palette ».'];

test('Z2.5 [UI-06] à l’ouverture, aucune palette n’est choisie : « Sélectionner une palette », l’invitation, ni menu ni palette ; la liste ne coche rien', async () => {
  const page = await ouvrirSur('sans-palette-choisie', PAR_DEFAUT, { sansPalette: true });
  try {
    assert.deepEqual(await vueDeLaCreation(page), { selecteur: 'Sélectionner une palette', invitation: INVITATION, menu: false, nouvelle: true, palette: false });
    assert.equal(await page.locator('.invitation button').count(), 0, 'les gestes sont ceux de la barre');
    assert.equal(await page.locator('#panneau-palettes .titre-de-premier-rang:visible').textContent(), 'Choisissez une palette');
    await page.locator('.selecteur-bouton').click();
    assert.deepEqual(await page.locator('.selecteur-option').evaluateAll((options) => options.map((option) => option.getAttribute('aria-selected'))), ['false', 'false', 'false']);
    assert.equal(await page.evaluate(() => window.demandes.filter(({ type }) => type === 'ranger-recette').length), 0, 'ouvrir sans choisir ne range rien');
  } finally {
    await page.close();
  }
});

test('Z2.5 [UI-06] deux gestes mènent à une palette : la liste, puis une option ; « Nouvelle palette » crée et ouvre la palette créée', async () => {
  const page = await ouvrirSur('sans-palette-choisie', PAR_DEFAUT, { sansPalette: true });
  try {
    await page.locator('.selecteur-bouton').click();
    await page.getByRole('option', { name: 'Jaune' }).click();
    assert.deepEqual(await vueDeLaCreation(page), { selecteur: 'Jaune', invitation: null, menu: true, nouvelle: true, palette: true });
    assert.equal(await page.locator('.tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette Jaune');
  } finally {
    await page.close();
  }
  const creation = await ouvrirSur('sans-palette-choisie', PAR_DEFAUT, { sansPalette: true });
  try {
    await creation.locator('.bouton-de-barre').click();
    assert.equal((await vueDeLaCreation(creation)).invitation, null, 'la création ouverte remplace l’invitation');
    await creation.locator('#panneau-palettes .champ-creation').fill('#7C3AED');
    const avant = await compte(creation);
    await creation.getByRole('button', { name: 'Créer la palette' }).click();
    const rangement = await prochaineDuType(creation, 'ranger-recette', avant);
    assert.equal(rangement.recette.palettes.length, 4);
    assert.deepEqual(await vueDeLaCreation(creation), { selecteur: '#7C3AED', invitation: null, menu: true, nouvelle: true, palette: true });
  } finally {
    await creation.close();
  }
});

test('Z2.5 [UI-06] la palette choisie disparue, par un import ou une autre session, l’onglet revient à l’invitation ; supprimée, la suivante s’ouvre', async () => {
  const page = await ouvrirSur('sans-palette-choisie');
  try {
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Bleu');
    // Une autre session a retiré Bleu : l'état relu ne la porte plus.
    const lu = messageDe('sans-palette-choisie');
    const sansBleu = structuredClone(lu);
    sansBleu.classement.recette.palettes = sansBleu.classement.recette.palettes.filter(({ id }) => id !== ID_DU_BLEU);
    await envoyer(page, { ...sansBleu, demande: 2 });
    assert.deepEqual(await vueDeLaCreation(page), { selecteur: 'Sélectionner une palette', invitation: INVITATION, menu: false, nouvelle: true, palette: false });

    await ouvrirLaPremierePalette(page);
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Jaune');
    await page.getByRole('button', { name: 'Actions sur la palette' }).click();
    await page.getByRole('menuitem', { name: 'Supprimer la palette' }).click();
    await page.locator('#panneau-palettes .confirmation').getByRole('button', { name: 'Supprimer la palette' }).click();
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Ardoise', 'la suivante s’ouvre (Q6.3)');
  } finally {
    await page.close();
  }
});

test('Z2.5 [VER-15] les Réglages communs, ouverts sans palette choisie, n’ont pas d’aperçu en tête et ne nomment aucune palette', async () => {
  const page = await ouvrirSur('sans-palette-choisie', PAR_DEFAUT, { sansPalette: true });
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    assert.equal(await page.locator('.reglages-apercu').isVisible(), false);
    assert.equal(await reglage(page, 'Couleurs de fond').isVisible(), true);
    await page.getByRole('button', { name: 'Retour aux palettes et à la planche' }).click();
    assert.deepEqual(await vueDeLaCreation(page), { selecteur: 'Sélectionner une palette', invitation: INVITATION, menu: false, nouvelle: true, palette: false });
  } finally {
    await page.close();
  }
});

/**
 * Ouvre le sélecteur de la couleur de référence, cartes lourdes dépliées, et
 * pose dans la page `glisser(mouvements, apres)` : un appui dans la zone,
 * les mouvements donnés dans la même tâche, bouton enfoncé, puis `apres`
 * ('rien', 'echap' ou 'relacher'). Les événements sont synthétiques : la
 * capture du pointeur n'existe que pour un vrai pointeur, elle se simule.
 * `compteDesRendus` compte les rendus de l'aperçu, qui repeignent le
 * nuancier ; `garantiesTouchees`, ceux de la carte des garanties, qui
 * n'arrivent qu'avec un rendu complet.
 */
async function ouvrirLeGlisser(page) {
  await deplierLaCarte(page, 'Garanties de contraste');
  await deplierLaCarte(page, 'Interface de test');
  await carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base .pipette').click();
  await page.evaluate(() => {
    const zone = document.querySelector('.selecteur-zone');
    zone.setPointerCapture = () => {};
    zone.hasPointerCapture = () => true;
    const cadre = zone.getBoundingClientRect();
    const point = (x, y, buttons = 1) => ({ bubbles: true, pointerId: 1, isPrimary: true, button: 0, buttons, clientX: cadre.left + cadre.width * x, clientY: cadre.top + cadre.height * y });
    window.compteDesRendus = 0;
    new MutationObserver(() => { window.compteDesRendus += 1; }).observe(document.querySelector('.nuancier-surface'), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    window.garantiesTouchees = 0;
    new MutationObserver(() => { window.garantiesTouchees += 1; }).observe(document.querySelector('[aria-label="Garanties de contraste"] .carte-corps'), { childList: true, characterData: true, subtree: true, attributes: true });
    window.glisser = (mouvements, apres) => {
      zone.dispatchEvent(new PointerEvent('pointerdown', point(0.1, 0.1)));
      for (const [x, y] of mouvements) zone.dispatchEvent(new PointerEvent('pointermove', point(x, y)));
      if (apres === 'echap') document.querySelector('.selecteur-de-couleur').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      if (apres === 'relacher') zone.dispatchEvent(new PointerEvent('pointerup', point(...mouvements.at(-1), 0)));
      // Le champ Hex du sélecteur s'écrit sans dièse.
      return `#${document.querySelector('.selecteur-champ').value}`;
    };
    window.bouger = (x, y, buttons = 1) => zone.dispatchEvent(new PointerEvent('pointermove', point(x, y, buttons)));
    window.relacher = () => zone.dispatchEvent(new PointerEvent('pointerup', point(0.8, 0.6, 0)));
    window.perdreLaCapture = () => zone.dispatchEvent(new PointerEvent('lostpointercapture', point(0.8, 0.6)));
  });
}

const referenceMontree = (page) => carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base .champ-hexa').inputValue();
const imageSuivante = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const rangements = (page) => page.evaluate(() => window.demandes.filter(({ type }) => type === 'ranger-recette'));

test('Z4.4 [UI-13] pendant un glisser dans le sélecteur de couleur, l’aperçu se rend une fois par image, à la couleur du dernier mouvement ; les garanties attendent', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const avant = await referenceMontree(page);
    // Les mouvements et la lecture du code tiennent dans une même tâche : aucune image ne passe entre eux.
    const [code, rendusPendant, montreePendant] = await page.evaluate(() => {
      window.compteDesRendus = 0;
      window.garantiesTouchees = 0;
      // Un observateur ne reçoit sa file qu'après la tâche : takeRecords la lit dans la tâche.
      const pendant = new MutationObserver(() => {});
      pendant.observe(document.querySelector('.repere-de-la-reference'), { childList: true, characterData: true, subtree: true });
      const lu = window.glisser([[0.3, 0.2], [0.5, 0.3], [0.7, 0.4], [0.9, 0.5]], 'rien');
      const rendus = pendant.takeRecords().length;
      pendant.disconnect();
      return [lu, rendus, document.querySelector('[aria-label="Configuration de la palette"] .colonnes-de-base .champ-hexa').value];
    });
    assert.equal(rendusPendant, 0, 'aucun rendu dans les mouvements');
    assert.equal(montreePendant, avant, 'le code de la configuration attend l’image');
    await imageSuivante(page);
    assert.equal(await page.evaluate(() => window.compteDesRendus), 1, 'un rendu pour quatre mouvements');
    assert.equal(await referenceMontree(page), code, 'le rendu porte le dernier mouvement');
    assert.equal(await page.evaluate(() => window.garantiesTouchees), 0, 'les garanties attendent la fin du geste');
    assert.deepEqual(await rangements(page), [], 'rien ne se range pendant le geste');
  } finally {
    await page.close();
  }
});

test('Z4.4 [UI-13] la fin d’un glisser range une seule fois, à la couleur du dernier mouvement, et rend les garanties', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const code = await page.evaluate(() => window.glisser([[0.3, 0.2], [0.6, 0.4], [0.8, 0.6]], 'rien'));
    // Une image passe avant le relâcher : l'aperçu seul s'est rendu.
    await imageSuivante(page);
    await page.evaluate(() => {
      window.garantiesTouchees = 0;
      window.relacher();
    });
    await imageSuivante(page);
    const ranges = await rangements(page);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].recette.palettes[0].reference, code);
    assert.equal(await referenceMontree(page), code);
    assert.ok(await page.evaluate(() => window.garantiesTouchees) > 0, 'les garanties suivent la fin du geste');
  } finally {
    await page.close();
  }
});

test('Z4.4 [UI-13] Échap pendant un glisser referme le sélecteur, rend le focus à la pastille, laisse l’aperçu au dernier mouvement sans rien ranger, puis rend tout l’onglet', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const code = await page.evaluate(() => {
      window.garantiesTouchees = 0;
      return window.glisser([[0.4, 0.3], [0.8, 0.7]], 'echap');
    });
    assert.equal(await referenceMontree(page), code, 'l’aperçu garde le dernier mouvement');
    assert.equal(await page.locator('.selecteur-de-couleur').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('pipette')), true);
    await page.waitForFunction(() => window.garantiesTouchees > 0, null, { timeout: 2000 });
    await page.evaluate(() => document.querySelector('.selecteur-zone').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })));
    assert.deepEqual(await rangements(page), [], 'Échap n’enregistre rien');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] une pause de 300 ms, bouton enfoncé, ne rend pas tout l’onglet : les garanties attendent le relâcher', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    await page.evaluate(() => window.glisser([[0.3, 0.2], [0.6, 0.4]], 'rien'));
    await imageSuivante(page);
    await page.evaluate(() => { window.garantiesTouchees = 0; });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.bouger(0.7, 0.5));
    await imageSuivante(page);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.garantiesTouchees), 0, 'aucun rendu complet pendant les pauses');
    assert.deepEqual(await rangements(page), [], 'rien ne se range pendant le geste');
    await page.evaluate(() => window.relacher());
    assert.ok(await page.evaluate(() => window.garantiesTouchees) > 0, 'le relâcher rend tout');
    assert.equal((await rangements(page)).length, 1);
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] Échap pendant un glisser rend tout l’onglet une fois, sans attendre ni rien ranger', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const touchees = await page.evaluate(() => {
      window.glisser([[0.4, 0.3], [0.8, 0.7]], 'rien');
      window.garantiesTouchees = 0;
      const pendant = new MutationObserver(() => {});
      pendant.observe(document.querySelector('[aria-label="Garanties de contraste"] .carte-corps'), { childList: true, characterData: true, subtree: true, attributes: true });
      document.querySelector('.selecteur-de-couleur').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Le rendu complet part dans la même tâche que la touche.
      const lus = pendant.takeRecords().length;
      pendant.disconnect();
      return lus;
    });
    assert.ok(touchees > 0, 'Échap rend les garanties dans sa propre tâche');
    await imageSuivante(page);
    assert.deepEqual(await rangements(page), [], 'Échap n’enregistre rien');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] un mouvement que le navigateur donne sans bouton prolonge le glisser, et une capture perdue l’arrête sans rien ranger', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    await page.evaluate(() => window.glisser([[0.3, 0.2], [0.6, 0.4]], 'rien'));
    await imageSuivante(page);
    const avant = await referenceMontree(page);
    // Dans Figma, le glisser s'arrêtait au premier mouvement quand le sélecteur lisait `buttons`.
    await page.evaluate(() => window.bouger(0.9, 0.9, 0));
    await imageSuivante(page);
    assert.deepEqual(await rangements(page), [], 'le geste continue');
    assert.notEqual(await referenceMontree(page), avant, 'l’aperçu suit le mouvement');
    await page.evaluate(() => window.relacher());
    assert.equal((await rangements(page)).length, 1);

    await page.evaluate(() => window.glisser([[0.2, 0.2], [0.3, 0.8]], 'rien'));
    await page.evaluate(() => { window.garantiesTouchees = 0; window.perdreLaCapture(); });
    assert.ok(await page.evaluate(() => window.garantiesTouchees) > 0, 'la capture perdue rend tout');
    assert.equal((await rangements(page)).length, 1, 'la capture perdue ne range rien');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] la réponse d’un rangement reçue en plein glisser ne rend pas tout l’onglet ; un refus s’y lit aussitôt', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    await page.evaluate(() => window.glisser([[0.3, 0.2], [0.6, 0.4]], 'relacher'));
    const [premier] = await rangements(page);
    await page.evaluate(() => window.glisser([[0.2, 0.3], [0.5, 0.6]], 'rien'));
    await imageSuivante(page);
    await page.evaluate(() => { window.garantiesTouchees = 0; });
    await envoyer(page, rangee(premier.demande));
    assert.equal(await page.evaluate(() => window.garantiesTouchees), 0, 'la réponse attend la fin du geste');
    await page.evaluate(() => window.relacher());
    const [, second] = await rangements(page);
    assert.ok(second, 'le relâcher range, la réponse précédente reçue');
    await page.evaluate(() => window.glisser([[0.4, 0.4], [0.7, 0.7]], 'rien'));
    await imageSuivante(page);
    await envoyer(page, { type: 'rangement', demande: second.demande, issue: { issue: 'modifiee-ailleurs' } });
    assert.equal(await page.locator('#panneau-palettes [role="alert"]').count(), 1, 'le refus se lit pendant le geste');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-04] pendant un glisser, le nuancier repeint ses pastilles sans créer d’élément, et la liste des palettes garde les siens', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const ajouts = await page.evaluate(async () => {
      let nuancier = 0;
      let barre = 0;
      const compter = (liste) => liste.reduce((total, mutation) => total + mutation.addedNodes.length, 0);
      const surNuancier = new MutationObserver((liste) => { nuancier += compter(liste); });
      surNuancier.observe(document.querySelector('.nuancier-surface'), { childList: true, subtree: true });
      const surBarre = new MutationObserver((liste) => { barre += compter(liste); });
      surBarre.observe(document.querySelector('.barre-gestes'), { childList: true, subtree: true });
      window.glisser([[0.3, 0.2], [0.6, 0.4]], 'rien');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.glisser([[0.7, 0.6], [0.9, 0.9]], 'rien');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      surNuancier.disconnect();
      surBarre.disconnect();
      return { nuancier, barre };
    });
    assert.ok(await page.evaluate(() => window.compteDesRendus) >= 2, 'l’aperçu s’est rendu');
    assert.deepEqual(ajouts, { nuancier: 0, barre: 0 });
    const pastille = await page.locator('.selecteur-bouton .pastille-reference').evaluate((element) => element.style.background);
    assert.equal(pastille, await page.evaluate(() => document.querySelector('.pastille[data-reference="true"]').style.background), 'la pastille du bouton suit la référence');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-02] le glisser d’un fond des Réglages communs ne redessine ni le tracé ni la garantie des courbes avant le relâcher, puis une fois', async () => {
  const page = await ouvrirSur('configuration-de-la-recette');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    await reglage(page, 'Couleurs de fond').locator('.pipette').first().click();
    const pendant = await page.evaluate(async () => {
      const zone = document.querySelector('.selecteur-zone');
      zone.setPointerCapture = () => {};
      zone.hasPointerCapture = () => true;
      const cadre = zone.getBoundingClientRect();
      const point = (x, y, buttons = 1) => ({ bubbles: true, pointerId: 1, isPrimary: true, button: 0, buttons, clientX: cadre.left + cadre.width * x, clientY: cadre.top + cadre.height * y });
      // Sans manque, un recalcul ne muterait rien : un témoin posé dans la zone disparaît s'il se refait.
      const temoin = document.createElement('span');
      temoin.id = 'temoin-de-garantie';
      document.querySelector('[aria-label="Luminosité des nuances"] .constats').append(temoin);
      window.tracesRedessines = 0;
      window.garantiesRedessinees = 0;
      window.apercusRedessines = 0;
      const compter = (cle) => () => { window[cle] += 1; };
      new MutationObserver(compter('tracesRedessines')).observe(document.querySelector('.trace-des-courbes'), { childList: true });
      new MutationObserver(compter('garantiesRedessinees')).observe(document.querySelector('[aria-label="Luminosité des nuances"] .constats'), { childList: true });
      new MutationObserver(compter('apercusRedessines')).observe(document.querySelector('.reglages-apercu'), { childList: true, subtree: true });
      zone.dispatchEvent(new PointerEvent('pointerdown', point(0.1, 0.1)));
      for (const [x, y] of [[0.2, 0.3], [0.5, 0.5]]) {
        zone.dispatchEvent(new PointerEvent('pointermove', point(x, y)));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      const lus = { traces: window.tracesRedessines, garanties: window.garantiesRedessinees, apercus: window.apercusRedessines };
      zone.dispatchEvent(new PointerEvent('pointerup', point(0.5, 0.5, 0)));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      return lus;
    });
    assert.ok(pendant.apercus > 0, 'l’aperçu compact suit le pointeur');
    assert.deepEqual({ traces: pendant.traces, garanties: pendant.garanties }, { traces: 0, garanties: 0 });
    assert.equal(await page.evaluate(() => window.tracesRedessines), 1, 'le relâcher redessine le tracé une fois');
    assert.equal(await page.evaluate(() => window.garantiesRedessinees), 0, 'la garantie ne dépend pas des fonds : elle ne se recalcule pas');
    assert.equal(await page.locator('#temoin-de-garantie').count(), 1);
    assert.equal((await rangements(page)).length, 1);
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] un code tapé dans le sélecteur puis un clic sur une garantie : le clic la choisit, puis l’onglet se rend', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const champ = page.locator('.selecteur-champ').first();
    await champ.fill('2A7FDB');
    const visee = page.locator('[aria-label="Garanties de contraste"] .garantie[aria-pressed="false"]').nth(2);
    const association = await visee.getAttribute('data-association');
    // Le rendu complet rebâtit les lignes des garanties : parti au pointerdown, il perdrait le clic.
    await visee.click();
    await page.waitForFunction(() => !document.querySelector('.selecteur-de-couleur') || document.querySelector('.selecteur-de-couleur').hidden);
    await imageSuivante(page);
    assert.equal(await page.locator(`[aria-label="Garanties de contraste"] .garantie[data-association="${association}"]`).getAttribute('aria-pressed'), 'true');
    assert.equal(await referenceMontree(page), '#2A7FDB', 'l’aperçu garde le code tapé');
  } finally {
    await page.close();
  }
});

/** Vert, #16A34A : deux garanties Vivid manquées en Thème Light. Ouvre la modale par le lien sous le code. */
async function ouvrirLAjustement(page) {
  await carteDeLOnglet(page, 'Configuration de la palette').getByRole('button', { name: 'Ajuster la référence', exact: true }).click();
  const modale = page.getByRole('dialog', { name: 'Ajuster la référence' });
  await modale.waitFor();
  return modale;
}

const lienDAjustement = (page) => carteDeLOnglet(page, 'Configuration de la palette').getByRole('button', { name: 'Ajuster la référence', exact: true });
const focusDans = (page, selecteur) => page.evaluate((cible) => document.activeElement?.matches(cible) ?? false, selecteur);

test('Z5.3 [UI-15] le lien ouvre la modale : la phrase qui dit pourquoi, les témoins, les pas, la ligne des nuances, le code, le tableau et le bilan, sans luminosité ; la page dessous est inerte', async () => {
  const page = await ouvrirSur('ajustement-ouvert', { width: 770, height: 720 });
  try {
    const modale = await ouvrirLAjustement(page);
    assert.equal(await modale.getAttribute('aria-modal'), 'true');
    assert.equal(await modale.locator('.ajustement-pourquoi').textContent(), 'La palette utilise votre couleur telle quelle. En Thème Light, elle est trop claire pour les bordures de champ.');
    assert.deepEqual(await modale.locator('.ajustement-temoin .detail-code').allTextContents(), ['#16A34A', '#16A34A']);
    assert.equal(await modale.getByRole('button', { name: 'Un pas plus sombre' }).evaluate((element) => element === document.activeElement), true, 'le premier pas a le focus');
    assert.match(await modale.locator('.ajustement-nuances').textContent(), /^Nuance \d+/);
    assert.deepEqual(await modale.locator('.ajustement-entete').evaluate((entete) => [...entete.children].map((cellule) => cellule.textContent)), ['Garantie', 'Thème', 'Avant', '', 'Après']);
    assert.deepEqual(await modale.locator('.ajustement-ligne:not(.ajustement-entete) .ajustement-qui').allTextContents(), ['border-control sur surface', 'focus sur surface']);
    assert.equal(await modale.locator('.ajustement-ligne:not(.ajustement-entete) .ajustement-theme').first().textContent(), 'Light · Vivid');
    assert.equal(await modale.locator('.ajustement-groupe').isVisible(), false, 'à 770 px, le thème est une colonne');
    assert.equal(await modale.locator('.ajustement-bilan').textContent(), 'Soft ✓ inchangé · Vivid ✗ 2 inchangé');
    assert.equal(await modale.getByText('Luminosité', { exact: false }).count(), 0);
    assert.equal(await page.locator('#app').evaluate((app) => app.inert), true, 'la page dessous est inerte');
    // Chaque garantie tient sur une ligne, badge compris.
    const hauteurs = await modale.locator('.ajustement-ligne:not(.ajustement-entete)').evaluateAll((lignes) => lignes.map((ligne) => ligne.getBoundingClientRect().height));
    assert.ok(hauteurs.every((hauteur) => hauteur < 30), `lignes : ${hauteurs}`);
  } finally {
    await page.close();
  }
});

test('Z5.3 [UI-15] rien ne change avant « Appliquer » ; Appliquer range la proposition, garde l’originale, et rend le focus au code quand le lien disparaît ; « Revenir à l’originale » la rend', async () => {
  const page = await ouvrirSur('ajustement-ouvert', { width: 770, height: 720 });
  try {
    const modale = await ouvrirLAjustement(page);
    await modale.getByRole('button', { name: 'Un pas plus sombre' }).click();
    await modale.getByRole('button', { name: 'Un pas plus sombre' }).click();
    assert.deepEqual(await modale.locator('.ajustement-temoin .detail-code').allTextContents(), ['#16A34A', '#029D44']);
    assert.equal(await modale.locator('.ajustement-bilan').textContent(), 'Soft ✓ inchangé · Vivid ✗ 2 → ✓');
    assert.deepEqual(await rangements(page), [], 'un pas ne range rien');
    assert.equal(await referenceMontree(page), '#16A34A', 'un pas ne change pas la palette');
    await modale.getByRole('button', { name: 'Appliquer' }).click();
    assert.equal(await modale.isVisible(), false);
    const ranges = await rangements(page);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].recette.palettes[0].reference, '#029D44');
    assert.equal(ranges[0].recette.palettes[0].originale, '#16A34A');
    assert.deepEqual(ranges[0].recette.palettes[0].reglages, { porteur: 'vivid', clarte: { vivid: -0.02 } }, 'la modale pose la luminosité du porteur (R1)');
    assert.equal(await lienDAjustement(page).isVisible(), false, 'toutes les garanties tenues : le lien disparaît');
    assert.equal(await focusDans(page, '[aria-label="Configuration de la palette"] .colonnes-de-base .champ-hexa'), true, 'le focus revient au code');
    assert.equal(await page.locator('#app').evaluate((app) => app.inert), false);
    await envoyer(page, rangee(ranges[0].demande));
    await page.getByRole('button', { name: 'Revenir à l’originale' }).click();
    await page.waitForFunction(() => window.demandes.filter(({ type }) => type === 'ranger-recette').length === 2, null, { timeout: 2000 });
    const [, retour] = await rangements(page);
    assert.equal(retour.recette.palettes[0].reference, '#16A34A');
    assert.equal(retour.recette.palettes[0].originale, undefined);
    assert.equal(retour.recette.palettes[0].reglages, undefined);
  } finally {
    await page.close();
  }
});

test('Z5.3 [UI-15] « Annuler », Échap et un clic sur le voile referment sans rien changer et rendent le focus au lien ; un clic dans la modale ne la referme pas', async () => {
  const page = await ouvrirSur('ajustement-ouvert', { width: 770, height: 720 });
  try {
    const fermetures = {
      annuler: (modale) => modale.getByRole('button', { name: 'Annuler' }).click(),
      echap: () => page.keyboard.press('Escape'),
      voile: () => page.mouse.click(8, 700),
    };
    for (const [nom, fermer] of Object.entries(fermetures)) {
      const modale = await ouvrirLAjustement(page);
      await modale.getByRole('button', { name: 'Un pas plus sombre' }).click();
      await modale.locator('.ajustement-pourquoi').click();
      assert.equal(await modale.isVisible(), true, `${nom} : un clic dans la modale la garde ouverte`);
      await fermer(modale);
      assert.equal(await modale.isVisible(), false, `${nom} referme la modale`);
      assert.equal(await lienDAjustement(page).evaluate((element) => element === document.activeElement), true, `${nom} rend le focus au lien`);
      assert.equal(await referenceMontree(page), '#16A34A', `${nom} ne change rien`);
      assert.equal(await page.locator('#app').evaluate((app) => app.inert), false, `${nom} rend la page`);
    }
    assert.deepEqual(await rangements(page), []);
  } finally {
    await page.close();
  }
});

test('Z5.3 [UI-15] Tab reste dans la modale, dans les deux sens', async () => {
  const page = await ouvrirSur('ajustement-ouvert', { width: 770, height: 720 });
  try {
    const modale = await ouvrirLAjustement(page);
    await modale.getByRole('button', { name: 'Un pas plus sombre' }).click();
    for (let rang = 0; rang < 8; rang += 1) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('.modale'))), true, `Tab n°${rang + 1} sort de la modale`);
    }
    await modale.getByRole('button', { name: 'Un pas plus sombre' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await modale.getByRole('button', { name: 'Appliquer' }).evaluate((element) => element === document.activeElement), true, 'Maj+Tab depuis le premier va au dernier');
  } finally {
    await page.close();
  }
});

test('Z5.3 [UI-15] à 500 × 520, la modale tient dans la fenêtre, 16 px de marge, le thème et l’intensité en titre et chaque garantie sur une ligne', async () => {
  const page = await ouvrirSur('ajustement-ouvert', MINIMALE);
  try {
    const modale = await ouvrirLAjustement(page);
    const cadre = await modale.boundingBox();
    const largeurUtile = await page.evaluate(() => document.documentElement.clientWidth);
    assert.ok(cadre.x >= 16 && cadre.x + cadre.width <= largeurUtile - 16 + 0.5, `modale de ${cadre.x} à ${cadre.x + cadre.width} sur ${largeurUtile}`);
    assert.ok(cadre.y >= 0 && cadre.y + cadre.height <= MINIMALE.height, 'la modale tient dans la hauteur');
    assert.equal(await modale.locator('.ajustement-entete').isVisible(), false);
    assert.deepEqual(await modale.locator('.ajustement-groupe').allTextContents(), ['Thème Light · Vivid']);
    assert.equal(await modale.locator('.ajustement-groupe').isVisible(), true, 'le thème passe en titre');
    assert.equal(await modale.locator('.ajustement-theme').first().isVisible(), false);
    const hauteurs = await modale.locator('.ajustement-ligne:not(.ajustement-entete)').evaluateAll((lignes) => lignes.map((ligne) => ligne.getBoundingClientRect().height));
    assert.ok(hauteurs.every((hauteur) => hauteur < 30), `lignes : ${hauteurs}`);
  } finally {
    await page.close();
  }
});

test('Z5.3 [UI-13] [UI-15] la pastille de la référence n’ouvre que le choix d’une couleur ; une garantie en échec ouvre la modale', async () => {
  const page = await ouvrirSur('ajustement-ouvert', { width: 770, height: 720 });
  try {
    await carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base .pipette').click();
    const selecteur = page.locator('.selecteur-de-couleur');
    assert.equal(await selecteur.locator('.selecteur-zone').isVisible(), true);
    assert.equal(await selecteur.getByRole('button', { name: 'Ajuster' }).count(), 0, 'plus d’onglet « Ajuster »');
    assert.equal(await selecteur.getByText('Ajuster la référence').count(), 0);
    await page.keyboard.press('Escape');
    await deplierLaCarte(page, 'Garanties de contraste');
    await carteDeLOnglet(page, 'Garanties de contraste').locator('.garantie[data-verdict="manquee"], .garantie:has([data-verdict="manquee"])').first().click();
    await carteDeLOnglet(page, 'Garanties de contraste').getByRole('button', { name: 'Ajuster la référence' }).first().click();
    assert.equal(await page.getByRole('dialog', { name: 'Ajuster la référence' }).isVisible(), true);
  } finally {
    await page.close();
  }
});

/**
 * Ce qu'un graphe rend à l'écran : sa largeur et sa hauteur, la hauteur d'un
 * texte par classe, et l'épaisseur d'un trait, viewBox appliquée.
 */
const rendu = (page, svg, textes, trait) => page.locator(svg).first().evaluate((element, { textes, trait }) => {
  const cadre = element.getBoundingClientRect();
  const echelle = cadre.height / element.viewBox.baseVal.height;
  const hauteurs = Object.fromEntries(textes.map((classe) => [classe, Math.round(element.querySelector(classe).getBoundingClientRect().height * 10) / 10]));
  // L'étendue du dessin : du bord gauche de la première case, ou du premier point, au bord droit de la dernière.
  const formes = [...element.querySelectorAll('rect, circle')].map((forme) => forme.getBoundingClientRect());
  const [gauche, droite] = [Math.min(...formes.map((forme) => forme.left)), Math.max(...formes.map((forme) => forme.right))];
  const dedans = gauche >= cadre.left - 1 && droite <= cadre.right + 1;
  return { largeur: cadre.width, etendue: droite - gauche, dedans, hauteur: Math.round(cadre.height * 10) / 10, ...hauteurs, trait: parseFloat(getComputedStyle(element.querySelector(trait)).strokeWidth) * echelle };
}, { textes, trait });

const pareils = (petit, grand, nom) => {
  assert.ok(grand.etendue > petit.etendue + 300, `${nom} : le dessin s'étend de ${petit.etendue} à ${grand.etendue} px`);
  assert.ok(petit.dedans && grand.dedans, `${nom} : le dessin tient dans son cadre`);
  for (const cle of Object.keys(petit).filter((cle) => !['largeur', 'etendue', 'dedans'].includes(cle))) {
    assert.ok(Math.abs(petit[cle] - grand[cle]) <= 0.5, `${nom}, ${cle} : ${petit[cle]} à 500 px, ${grand[cle]} à 1 000 px`);
  }
};

test('Z8.5 [DER-01] [UI-09] à 500 et à 1 000 px, la dérive et la réglette gardent la taille de leurs textes, de leurs traits et leur hauteur ; seules leurs colonnes s’étirent', async () => {
  const page = await ouvrirSur('derive-deliee-libre', MINIMALE);
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    await deplierLaCarte(page, 'Garanties de contraste');
    await imageSuivante(page);
    const mesurer = async () => ({
      derive: await rendu(page, '.derive-graphe', ['.derive-graduation', '.derive-poignee-lettre'], '.derive-trait'),
      reglette: await rendu(page, '.reglette-svg', ['.reglette-numero'], '.reglette-arc'),
    });
    const petit = await mesurer();
    await page.setViewportSize({ width: 1000, height: 720 });
    await imageSuivante(page);
    const grand = await mesurer();
    pareils(petit.derive, grand.derive, 'dérive');
    pareils(petit.reglette, grand.reglette, 'réglette');
    // Les numéros, la bande et la rampe tombent sur les mêmes colonnes.
    const decalages = await page.locator('.derive-graphe').evaluate((svg) => {
      const numeros = [...svg.querySelectorAll('text.derive-graduation')].filter((texte) => /^\d+$/.test(texte.textContent));
      const cases = [...svg.querySelectorAll('rect[rx]')];
      return numeros.map((numero, rang) => {
        const a = numero.getBoundingClientRect();
        const b = cases[rang].getBoundingClientRect();
        return Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2);
      });
    });
    assert.ok(decalages.length === 11 && decalages.every((ecart) => ecart < 1), `décalages : ${decalages}`);
    // La bande de teintes est continue : chaque case touche la suivante.
    const trous = await page.locator('.derive-graphe').evaluate((svg) => {
      const bande = [...svg.querySelectorAll('rect:not([rx])')].map((forme) => forme.getBoundingClientRect());
      return bande.slice(1).map((forme, rang) => Math.abs(forme.left - bande[rang].right));
    });
    assert.ok(trous.every((trou) => trou < 1), `trous dans la bande : ${trous}`);
  } finally {
    await page.close();
  }
});

test('Z8.5 [UI-02] à 500 et à 1 000 px, le tracé des courbes garde ses traits, son losange et sa hauteur', async () => {
  const page = await ouvrirSur('configuration-de-la-recette', MINIMALE);
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    await imageSuivante(page);
    const petit = await rendu(page, '.trace-courbes', ['.trace-reference'], '.trace-courbe');
    await page.setViewportSize({ width: 1000, height: 720 });
    await imageSuivante(page);
    const grand = await rendu(page, '.trace-courbes', ['.trace-reference'], '.trace-courbe');
    pareils(petit, grand, 'tracé');
  } finally {
    await page.close();
  }
});

test('Z8.5 [DER-07] à 1 000 px, une poignée glissée sur le repère de +15° prend 15°', async () => {
  const page = await ouvrirSur('derive-deliee-libre', { width: 1000, height: 720 });
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    await imageSuivante(page);
    const poignee = page.locator('.derive-poignee[data-bout="sombre"]');
    await page.locator('.derive-graphe').evaluate((svg) => svg.scrollIntoView({ block: 'center' }));
    const depart = await poignee.locator('circle').boundingBox();
    const cible = await page.locator('.derive-graphe').evaluate((svg) => {
      const texte = [...svg.querySelectorAll('.derive-graduation')].find((element) => element.textContent.replace('−', '-').startsWith('+15'));
      const trait = texte.parentElement.querySelector('line');
      const cadre = svg.getBoundingClientRect();
      return cadre.top + Number(trait.getAttribute('y1')) * (cadre.height / svg.viewBox.baseVal.height);
    });
    await page.mouse.move(depart.x + depart.width / 2, depart.y + depart.height / 2);
    await page.mouse.down();
    await page.mouse.move(depart.x + depart.width / 2, cible, { steps: 8 });
    await page.mouse.up();
    assert.equal(await page.locator('.derive-poignee[data-bout="sombre"]').getAttribute('aria-valuenow'), '15');
  } finally {
    await page.close();
  }
});

test('Z8.5 [DER-01] carte repliée, un changement de largeur ne redessine pas la dérive ; dépliée, elle se redessine à sa largeur', async () => {
  const page = await ouvrirSur('derive-deliee-libre', MINIMALE);
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    await imageSuivante(page);
    await bascule(page, 'Dérive de teinte').click();
    await page.evaluate(() => {
      window.redessins = 0;
      new MutationObserver(() => { window.redessins += 1; }).observe(document.querySelector('.derive-graphe'), { childList: true });
    });
    await page.setViewportSize({ width: 1000, height: 720 });
    await imageSuivante(page);
    await imageSuivante(page);
    assert.equal(await page.evaluate(() => window.redessins), 0, 'repliée, aucun redessin');
    await bascule(page, 'Dérive de teinte').click();
    await imageSuivante(page);
    const { viewBox, largeur } = await page.locator('.derive-graphe').evaluate((svg) => ({ viewBox: svg.viewBox.baseVal.width, largeur: svg.getBoundingClientRect().width }));
    assert.ok(Math.abs(viewBox * (451 / 396) - largeur) < 1, `dépliée, le viewBox suit la largeur : ${viewBox} unités pour ${largeur} px`);
  } finally {
    await page.close();
  }
});

test('Z5.1 [UI-11] [UI-17] sous le code, une référence qui manque des garanties dit combien et dans quel thème, en couleur de danger, puis « Ajuster la référence » ; sans manque, la ligne dit que la référence est employée telle quelle', async () => {
  const page = await ouvrirSur('ajustement-ouvert');
  try {
    await page.keyboard.press('Escape');
    const colonne = carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base');
    const ligne = colonne.locator('.ligne-de-la-reference');
    const manque = ligne.locator('.ligne-fixe-texte');
    assert.equal(await manque.textContent(), '2 garanties manquées en Thème Light');
    assert.equal(await ligne.locator('.ligne-fixe-icone').textContent(), '✗');
    const [couleur, danger] = await manque.evaluate((element) => {
      const temoin = document.createElement('span');
      temoin.style.color = 'var(--texte-danger)';
      document.body.append(temoin);
      const attendue = getComputedStyle(temoin).color;
      temoin.remove();
      return [getComputedStyle(element).color, attendue];
    });
    assert.equal(couleur, danger);
    const lien = ligne.getByRole('button', { name: 'Ajuster la référence' });
    const [texte, geste] = [await manque.boundingBox(), await lien.boundingBox()];
    assert.ok(texte.x + texte.width <= geste.x, 'le lien suit le texte, sur la même ligne');
  } finally {
    await page.close();
  }
  const sansManque = await ouvrirSur('garanties-respectees');
  try {
    const colonne = carteDeLOnglet(sansManque, 'Configuration de la palette').locator('.colonnes-de-base');
    assert.equal(await colonne.locator('.ligne-de-la-reference .ligne-fixe-texte').textContent(), 'Couleur de référence employée telle quelle.');
    assert.equal(await colonne.locator('.ligne-de-la-reference').getAttribute('data-ton'), 'neutre');
    assert.equal(await colonne.getByRole('button', { name: 'Ajuster la référence' }).count(), 0);
  } finally {
    await sansManque.close();
  }
});

test('Z10.8 un profil réglé seul ne touche ni l’autre ni la référence ; l’avertissement précède un réglage du porteur, puis dit que la référence a bougé', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    const avertissement = carte.locator('.avertissement-des-reglages');
    const texteDeLAvertissement = () => avertissement.locator('.ligne-fixe-texte').textContent();
    // Bleu : Vivid porte la référence, et la carte s'ouvre sur Soft, qui ne la déplace pas.
    assert.equal(await carte.getByRole('button', { name: 'Soft', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await avertissement.getAttribute('data-ton'), 'neutre');
    assert.equal(await texteDeLAvertissement(), 'Ce réglage ne touche pas la couleur de référence.');
    const avant = await compte(page);
    await carte.getByRole('textbox', { name: 'Teinte de Soft' }).fill('8');
    await carte.getByRole('textbox', { name: 'Teinte de Soft' }).press('Tab');
    const soft = await prochaine(page, avant);
    assert.deepEqual(soft.recette.palettes[0].reglages, { teinte: { soft: 8 }, porteur: 'vivid' });
    assert.equal(soft.recette.palettes[0].reference, '#1E6FD9');
    assert.equal(soft.recette.palettes[0].originale, undefined);
    await envoyer(page, rangee(soft.demande));

    await carte.getByRole('button', { name: 'Vivid ◆' }).click();
    assert.equal(await avertissement.getAttribute('data-ton'), 'avertissement', 'l’avertissement précède le geste');
    assert.equal(await texteDeLAvertissement(), 'Attention : ce réglage va modifier votre couleur de référence.');
    await carte.getByRole('textbox', { name: 'Luminosité de Vivid' }).fill('-0,02');
    await carte.getByRole('textbox', { name: 'Luminosité de Vivid' }).press('Tab');
    const vivid = await prochaine(page, avant + 1);
    assert.deepEqual(vivid.recette.palettes[0].reglages, { teinte: { soft: 8 }, clarte: { vivid: -0.02 }, porteur: 'vivid' }, 'Soft garde sa teinte');
    assert.equal(vivid.recette.palettes[0].reference, '#1669D2');
    assert.equal(vivid.recette.palettes[0].originale, '#1E6FD9');
    await envoyer(page, rangee(vivid.demande));
    assert.equal(await avertissement.getAttribute('data-ton'), 'avertissement');
    assert.equal(await texteDeLAvertissement(), 'Attention, votre couleur de référence a été modifiée.');
    assert.equal(await referenceMontree(page), '#1669D2');
    // Vivid porte la référence assombrie et prend sa saturation ([ENT-11]).
    assert.equal(await carte.locator('.carte-resume').textContent(), 'Soft +8° · Vivid −0,02 · Soft 45 % · Vivid 93 %');
  } finally {
    await page.close();
  }
});

test('Z10.8 « Les deux » déplace les deux profils du même écart et prévient avant ; « Rétablir » les remet à zéro et rend la référence', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    await carte.getByRole('button', { name: 'Les deux' }).click();
    assert.equal(await carte.locator('.avertissement-des-reglages').getAttribute('data-ton'), 'avertissement');
    assert.equal(await carte.locator('.avertissement-des-reglages .ligne-fixe-texte').textContent(), 'Attention : ce réglage va modifier votre couleur de référence.');
    assert.equal(await carte.locator('.fantome-du-profil:visible').count(), 0, 'aucun repère de l’autre profil quand les deux se règlent');
    const avant = await compte(page);
    const champ = carte.getByRole('textbox', { name: 'Teinte de Soft et Vivid' });
    await champ.fill('5');
    await champ.press('Tab');
    const deux = await prochaine(page, avant);
    assert.deepEqual(deux.recette.palettes[0].reglages, { teinte: { soft: 5, vivid: 5 }, porteur: 'vivid' });
    assert.equal(deux.recette.palettes[0].reference, '#356CDA');
    assert.equal(deux.recette.palettes[0].originale, '#1E6FD9');
    await envoyer(page, rangee(deux.demande));

    await carte.getByRole('button', { name: 'Rétablir la teinte' }).click();
    const retablie = await prochaine(page, avant + 1);
    assert.equal(retablie.recette.palettes[0].reglages, undefined);
    assert.equal(retablie.recette.palettes[0].reference, '#1E6FD9');
    assert.equal(retablie.recette.palettes[0].originale, undefined);
  } finally {
    await page.close();
  }
});

test('Z10.6 [ENT-14] une palette à une intensité a la carte, sans choix de profil : l’avertissement la précède, et la saturation récrit la référence', async () => {
  const page = await ouvrirSur('palette-une-intensite');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    assert.equal(await carte.locator('.cible-des-reglages').isVisible(), false);
    assert.equal(await carte.locator('.avertissement-des-reglages').getAttribute('data-ton'), 'avertissement');
    assert.equal(await carte.locator('.avertissement-des-reglages .ligne-fixe-texte').textContent(), 'Attention : ce réglage va modifier votre couleur de référence.');
    assert.equal(await carte.locator('.repere-de-reference:visible').count(), 0, 'la saturation est celle de la référence : aucun repère');
    const avant = await compte(page);
    await carte.getByRole('textbox', { name: 'Saturation', exact: true }).fill('50');
    await carte.getByRole('textbox', { name: 'Saturation', exact: true }).press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes[0].reglages, { part: 0.5 });
    assert.equal(rangement.recette.palettes[0].originale, '#1E6FD9');
    assert.notEqual(rangement.recette.palettes[0].reference, '#1E6FD9');
  } finally {
    await page.close();
  }
});

/** Ouvre l'interface dans une langue, sur le premier message d'un état de la galerie et sa première palette. */
async function ouvrirSurEn(id, viewport, langue) {
  const page = await ouvrir(viewport, langue);
  await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), messageDe(id));
  await ouvrirLaPremierePalette(page);
  return page;
}

test('Z11.1 chaque segment garde une marge autour de son libellé, « Vivid ◆ » compris, en français et en anglais, à 500 px', async () => {
  for (const langue of ['fr', 'en']) {
    const page = await ouvrirSurEn('reglages-profil-delie', MINIMALE, langue);
    try {
      await page.locator('.carte-bascule[aria-expanded="false"]').first().waitFor();
      await page.evaluate(() => document.querySelectorAll('#panneau-palettes .carte-bascule[aria-expanded="false"]').forEach((bouton) => bouton.click()));
      const serres = await page.evaluate(() => [...document.querySelectorAll('.bascule-de-base .bascule-option')]
        .filter((bouton) => bouton.getClientRects().length > 0)
        .map((bouton) => {
          const boite = bouton.getBoundingClientRect();
          const plage = document.createRange();
          plage.selectNodeContents(bouton);
          const texte = plage.getBoundingClientRect();
          return { libelle: bouton.textContent, gauche: texte.left - boite.left, droite: boite.right - texte.right, coupe: bouton.scrollWidth > bouton.clientWidth };
        })
        .filter(({ gauche, droite, coupe }) => coupe || gauche < 6 || droite < 6));
      assert.deepEqual(serres, [], `${langue} : segments sans marge`);
    } finally {
      await page.close();
    }
  }
});

test('Z11.2 la lettre de l’autre profil se lit au-dessus du curseur, sans toucher la rangée d’au-dessus', async () => {
  const page = await ouvrirSur('reglages-profil-delie', MINIMALE);
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const places = await page.evaluate(() => [...document.querySelectorAll('.reglage-de-la-palette')]
      .filter((ligne) => ligne.getClientRects().length > 0)
      .map((ligne) => {
        const lettre = ligne.querySelector('.fantome-du-profil').getBoundingClientRect();
        const curseur = ligne.querySelector('.curseur-peint').getBoundingClientRect();
        const dessus = ligne.previousElementSibling.getBoundingClientRect();
        // Le curseur rond fait 14 px et commence 4 px sous le haut de sa piste de 22 px.
        return { sousLeCurseur: lettre.bottom - (curseur.top + 4), contreLaRangee: dessus.bottom + 2 - lettre.top };
      }));
    assert.equal(places.length, 3);
    for (const { sousLeCurseur, contreLaRangee } of places) {
      assert.ok(sousLeCurseur <= 0, `la lettre descend de ${sousLeCurseur} px sur le curseur`);
      assert.ok(contreLaRangee <= 0, `la lettre monte de ${contreLaRangee} px sur la rangée d’au-dessus`);
    }
  } finally {
    await page.close();
  }
});

test('Z11.3 à 500 px, le titre d’une carte tient sur une ligne ; un résumé trop long passe dessous sans le chevaucher', async () => {
  const page = await ouvrirSur('reglages-profil-delie', MINIMALE);
  try {
    const titres = await page.evaluate(() => [...document.querySelectorAll('#panneau-palettes .carte-bascule')]
      .filter((bouton) => bouton.getClientRects().length > 0)
      .map((bouton) => {
        const titre = bouton.querySelector('.carte-titre');
        const plage = document.createRange();
        plage.selectNodeContents(titre);
        const lignes = new Set([...plage.getClientRects()].map((rect) => Math.round(rect.top))).size;
        const t = titre.getBoundingClientRect();
        const r = bouton.querySelector('.carte-resume').getBoundingClientRect();
        const chevauche = r.width > 0 && t.left < r.right && r.left < t.right && t.top < r.bottom && r.top < t.bottom;
        return { titre: titre.textContent, lignes, chevauche };
      }));
    assert.ok(titres.some(({ titre }) => titre === 'Teinte, saturation, luminosité'));
    assert.deepEqual(titres.filter(({ lignes, chevauche }) => lignes !== 1 || chevauche), []);
  } finally {
    await page.close();
  }
});

test('Z11.4 [DER-05] aucune ligne de la dérive ne barre l’étiquette d’une poignée, et le nom d’une courbe ne la chevauche pas', async () => {
  // La dérive de la galerie descend vers le bout sombre. À +20°, elle remonte vers lui ; à +3°, sa fin presque plate met
  // l'étiquette de la poignée à la hauteur du nom de la courbe.
  for (const [viewport, sombre] of [[MINIMALE, null], [{ width: 600, height: 720 }, null], [{ width: 1000, height: 720 }, null], [MINIMALE, '20'], [{ width: 600, height: 720 }, '20'], [MINIMALE, '3'], [{ width: 600, height: 720 }, '3']]) {
    const page = await ouvrirSur('derive-deliee-libre', viewport);
    try {
      await deplierLaCarte(page, 'Dérive de teinte');
      if (sombre) {
        const champ = carteDeLOnglet(page, 'Dérive de teinte').getByRole('textbox', { name: 'Nuances sombres' });
        await champ.fill(sombre);
        await champ.press('Tab');
      }
      const conflits = await page.evaluate(() => {
        const svg = document.querySelector('#panneau-palettes .derive-graphe');
        const boite = (texte) => texte.getBBox();
        const etiquettes = [...svg.querySelectorAll('.derive-poignee text:not(.derive-poignee-lettre)')].map(boite);
        const noms = [...svg.querySelectorAll('.derive-nom-de-courbe')].map(boite);
        const dans = ({ x, y }, b) => x > b.x && x < b.x + b.width && y > b.y && y < b.y + b.height;
        const seCoupent = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        const out = [];
        for (const ligne of svg.querySelectorAll('polyline')) {
          const points = [...ligne.points];
          for (let i = 1; i < points.length; i++) {
            for (let pas = 0; pas <= 40; pas++) {
              const point = { x: points[i - 1].x + ((points[i].x - points[i - 1].x) * pas) / 40, y: points[i - 1].y + ((points[i].y - points[i - 1].y) * pas) / 40 };
              etiquettes.forEach((b, rang) => { if (dans(point, b)) out.push(`ligne sur l’étiquette ${rang}`); });
            }
          }
        }
        noms.forEach((nom, n) => etiquettes.forEach((b, e) => { if (seCoupent(nom, b)) out.push(`nom ${n} sur l’étiquette ${e}`); }));
        // Un nom se lit sur la courbe la plus proche : la sienne.
        const hauteurA = (ligne, x) => {
          const points = [...ligne.points];
          const rang = points.findIndex((point, i) => i > 0 && x >= points[i - 1].x && x <= point.x);
          if (rang < 1) return null;
          const [a, b] = [points[rang - 1], points[rang]];
          return a.y + ((x - a.x) / (b.x - a.x || 1)) * (b.y - a.y);
        };
        const traits = { Soft: svg.querySelector('polyline.derive-trait-soft'), Vivid: svg.querySelector('polyline.derive-trait-vivid') };
        for (const nom of svg.querySelectorAll('.derive-nom-de-courbe')) {
          const b = nom.getBBox();
          const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
          const propre = hauteurA(traits[nom.textContent], x);
          const autre = hauteurA(traits[nom.textContent === 'Soft' ? 'Vivid' : 'Soft'], x);
          if (!(Math.abs(y - propre) < Math.abs(y - autre))) out.push(`nom ${nom.textContent} plus près de l’autre courbe`);
        }
        return { nombre: etiquettes.length, conflits: [...new Set(out)] };
      });
      assert.equal(conflits.nombre, 2, `${viewport.width} px : deux poignées`);
      assert.deepEqual(conflits.conflits, [], `${viewport.width} px, bout sombre ${sombre ?? 'de la galerie'}`);
    } finally {
      await page.close();
    }
  }
});

test('Z11.5 Échap pendant un glisser de la carte des réglages : le curseur revient, et le relâcher n’enregistre rien', async () => {
  const page = await ouvrirSur('alertes-seules', { width: 600, height: 720 });
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const curseur = page.getByRole('slider', { name: 'Teinte de Soft' });
    await curseur.scrollIntoViewIfNeeded();
    const boite = await curseur.boundingBox();
    const avant = await curseur.inputValue();
    const ranges = (await rangements(page)).length;
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width * 0.8, boite.y + boite.height / 2, { steps: 5 });
    await page.keyboard.press('Escape');
    assert.equal(await curseur.inputValue(), avant, 'Échap rend la valeur d’avant au curseur');
    await page.mouse.move(boite.x + boite.width * 0.9, boite.y + boite.height / 2, { steps: 3 });
    await page.mouse.up();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    assert.equal((await rangements(page)).length, ranges, 'le relâcher après Échap n’enregistre rien');
    assert.equal(await curseur.inputValue(), avant);
  } finally {
    await page.close();
  }
});

test('Z11.6 Échap dans un champ de la carte des réglages rend sa valeur, et le quitter ensuite n’enregistre rien', async () => {
  const page = await ouvrirSur('alertes-seules', { width: 600, height: 720 });
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const champ = page.getByRole('textbox', { name: 'Teinte de Soft' });
    const avant = await champ.inputValue();
    const ranges = (await rangements(page)).length;
    await champ.fill('25');
    await champ.press('Escape');
    assert.equal(await champ.inputValue(), avant, 'Échap rend la valeur d’avant au champ');
    await champ.press('Tab');
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    assert.equal((await rangements(page)).length, ranges, 'quitter le champ après Échap n’enregistre rien');
  } finally {
    await page.close();
  }
});

test('Z11.7 « Rétablir » la saturation de Soft laisse celle de Vivid', async () => {
  const page = await ouvrirSur('reglages-profil-delie', { width: 600, height: 720 });
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    const cible = carte.getByRole('group', { name: 'Profil à régler' });
    const avant = await compte(page);
    await cible.getByRole('button', { name: 'Vivid ◆' }).click();
    await carte.getByRole('textbox', { name: 'Saturation de Vivid' }).fill('80');
    await carte.getByRole('textbox', { name: 'Saturation de Vivid' }).press('Tab');
    const vivid = await prochaine(page, avant);
    await envoyer(page, rangee(vivid.demande));
    await cible.getByRole('button', { name: 'Soft', exact: true }).click();
    await carte.getByRole('textbox', { name: 'Saturation de Soft' }).fill('30');
    await carte.getByRole('textbox', { name: 'Saturation de Soft' }).press('Tab');
    const soft = await prochaine(page, avant + 1);
    assert.deepEqual(soft.recette.palettes[0].parts, { soft: 0.3, vivid: 0.8, origine: 'designer' });
    await envoyer(page, rangee(soft.demande));
    await carte.getByRole('button', { name: 'Rétablir la saturation' }).click();
    const retablie = await prochaine(page, avant + 2);
    assert.equal(retablie.recette.palettes[0].parts.vivid, 0.8, 'Vivid garde sa saturation');
    assert.equal(retablie.recette.palettes[0].parts.soft, 0.45, 'Soft reprend celle de la recette');
  } finally {
    await page.close();
  }
});

/** Un événement de souris réel, par le protocole de Chromium : `buttons` se choisit, ce que `page.mouse` ne permet pas. */
async function sourisReelle(page) {
  const cdp = await page.context().newCDPSession(page);
  return (type, x, y, buttons) => cdp.send('Input.dispatchMouseEvent', { type, x, y, buttons, clickCount: 1, button: type === 'mouseMoved' && buttons === 0 ? 'none' : 'left' });
}

test('le glisser d’un curseur de la carte des réglages continue hors de sa piste après un mouvement sans bouton, comme Figma en donne, et le relâcher enregistre une fois', async () => {
  const page = await ouvrirSur('alertes-seules', { width: 600, height: 720 });
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const curseur = page.getByRole('slider', { name: 'Teinte de Soft' });
    await curseur.scrollIntoViewIfNeeded();
    const boite = await curseur.boundingBox();
    const souris = await sourisReelle(page);
    const y = boite.y + boite.height / 2;
    await souris('mouseMoved', boite.x + boite.width / 2, y, 0);
    await souris('mousePressed', boite.x + boite.width / 2, y, 1);
    await souris('mouseMoved', boite.x + boite.width * 0.6, y, 1);
    // Sous la piste, sans bouton : Chromium y lâche toute capture, et le curseur natif s'arrêtait là.
    await souris('mouseMoved', boite.x + boite.width * 0.6, y + 60, 0);
    await souris('mouseMoved', boite.x + boite.width * 0.9, y + 60, 0);
    assert.equal(await curseur.inputValue(), '25', 'la valeur suit le pointeur hors de la piste');
    assert.equal(await curseur.evaluate((element) => document.activeElement === element), true, 'le curseur garde le focus');
    assert.equal((await rangements(page)).length, 0, 'rien ne s’enregistre avant le relâcher');
    await souris('mouseReleased', boite.x + boite.width * 0.9, y + 60, 0);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    const ranges = await rangements(page);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].recette.palettes.find(({ reglages }) => reglages?.teinte?.soft !== undefined)?.reglages.teinte.soft, 25);
    await souris('mouseMoved', boite.x + boite.width * 0.1, y, 0);
    assert.equal(await curseur.inputValue(), '25', 'après le relâcher, le pointeur ne règle plus rien');
  } finally {
    await page.close();
  }
});

/**
 * Une page qui joue Figma : l'interface dans une iframe à 150 × 100 de son coin, 600 × 720, et le relevé des demandes
 * dans l'hôte, `resize` compris. Rend l'iframe, une fois l'état du fichier demandé.
 */
async function ouvrirDansUneIframe(page) {
  await page.setContent(`<body style="margin:0"><iframe id="ui" style="position:absolute;left:150px;top:100px;width:600px;height:720px;border:0"></iframe>
    <script>
      window.demandes = [];
      const ui = document.getElementById('ui');
      window.addEventListener('message', (event) => {
        const message = event.data.pluginMessage;
        if (event.source !== ui.contentWindow || !message) return;
        if (message.type === 'lire-langue') ui.contentWindow.postMessage({ pluginMessage: { type: 'langue', langue: 'fr' } }, '*');
        if (['lire-etat', 'ranger-recette', 'resize'].includes(message.type)) window.demandes.push(message);
      });
    </script></body>`);
  await page.evaluate((contenu) => { document.getElementById('ui').srcdoc = contenu; }, html);
  await page.waitForFunction(() => window.demandes.length > 0);
  return page.frames()[1];
}

test('le glisser d’un curseur de la carte des réglages, sans capture, finit à la dernière valeur quand le pointeur quitte la fenêtre du plugin', async () => {
  const page = await navigateur.newPage({ viewport: { width: 900, height: 900 } });
  page.setDefaultTimeout(5000);
  try {
    const ui = await ouvrirDansUneIframe(page);
    await ui.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), messageDe('alertes-seules'));
    await ui.locator('.selecteur-bouton').click();
    await ui.locator('.selecteur-option').first().click();
    await ui.locator('.tete-de-la-palette .titre-de-premier-rang').waitFor();
    const carte = ui.locator(`#panneau-palettes .carte[aria-label="${CARTE_DES_REGLAGES}"]`);
    if ((await carte.getAttribute('data-ouverte')) !== 'true') await carte.locator('> .carte-bascule').click();
    const curseur = ui.getByRole('slider', { name: 'Teinte de Soft' });
    await curseur.scrollIntoViewIfNeeded();
    const boite = await curseur.boundingBox();
    const souris = await sourisReelle(page);
    const y = boite.y + boite.height / 2;
    await souris('mouseMoved', boite.x + boite.width / 2, y, 0);
    await souris('mousePressed', boite.x + boite.width / 2, y, 1);
    await souris('mouseMoved', boite.x + boite.width * 0.6, y, 1);
    await souris('mouseMoved', boite.x + boite.width * 0.8, y + 40, 0);
    const derniere = await curseur.inputValue();
    assert.ok(Number(derniere) > 6, 'la valeur suit le pointeur hors de la piste');
    // Hors de l'iframe, le relâcher ne s'y verrait pas : le geste finit à la sortie.
    await souris('mouseMoved', 40, y, 0);
    await page.waitForFunction(() => window.demandes.some(({ type }) => type === 'ranger-recette'));
    await souris('mouseReleased', 40, y, 0);
    await souris('mouseMoved', boite.x + boite.width * 0.2, y, 0);
    assert.equal(await curseur.inputValue(), derniere, 'revenu dans le plugin, le pointeur ne règle plus rien');
    const ranges = await page.evaluate(() => window.demandes.filter(({ type }) => type === 'ranger-recette'));
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].recette.palettes.find(({ reglages }) => reglages?.teinte?.soft !== undefined)?.reglages.teinte.soft, Number(derniere));
  } finally {
    await page.close();
  }
});

test('un double-clic sur un curseur de la carte des réglages rend la valeur de départ, même loin du zéro de la piste', async () => {
  const page = await ouvrirSur('alertes-seules', { width: 600, height: 720 });
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const curseur = page.getByRole('slider', { name: 'Teinte de Soft' });
    const aLaValeur = async () => {
      await curseur.scrollIntoViewIfNeeded();
      const boite = await curseur.boundingBox();
      return { x: boite.width * 0.9, y: boite.height / 2 };
    };
    // Un premier clic range la teinte : le résumé de la carte change et peut la décaler, d'où une seconde mesure.
    await curseur.click({ position: await aLaValeur() });
    assert.notEqual(await curseur.inputValue(), '0');
    await envoyer(page, rangee((await rangements(page))[0].demande));
    await curseur.dblclick({ position: await aLaValeur() });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    assert.equal(await curseur.inputValue(), '0');
    await page.waitForFunction(() => window.demandes.filter(({ type }) => type === 'ranger-recette').length === 2);
    const derniere = (await rangements(page)).at(-1);
    assert.equal(derniere.recette.palettes.some(({ reglages }) => reglages?.teinte?.soft), false, 'la teinte de Soft rangée revient à zéro');
  } finally {
    await page.close();
  }
});

/** Les demandes `resize` de la poignée, relevées dans la page. */
async function releverLesTailles(page) {
  await page.evaluate(() => {
    window.tailles = [];
    window.addEventListener('message', (event) => {
      if (event.data.pluginMessage?.type === 'resize') window.tailles.push(event.data.pluginMessage);
    });
  });
}

const centreDe = async (locator) => {
  const boite = await locator.boundingBox();
  return { x: boite.x + boite.width / 2, y: boite.y + boite.height / 2 };
};

test('Z9.4 la poignée envoie au plus un message par image, à la dernière position reçue, et marque le dernier message du geste', async () => {
  const page = await ouvrirSur('alertes-seules', { width: 600, height: 720 });
  try {
    await releverLesTailles(page);
    const coin = await centreDe(page.locator('.resize-grip'));
    const souris = await sourisReelle(page);
    await souris('mouseMoved', coin.x, coin.y, 0);
    await souris('mousePressed', coin.x, coin.y, 1);
    // Dix mouvements dans la même tâche, comme une souris plus rapide que les images.
    const avantLImage = await page.evaluate(() => {
      for (let rang = 1; rang <= 10; rang += 1) window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, isPrimary: true, clientX: 500 + rang * 10, clientY: 600 + rang * 5, bubbles: true }));
      return window.tailles.length;
    });
    assert.equal(avantLImage, 0, 'aucun message avant l’image');
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    assert.deepEqual(await page.evaluate(() => window.tailles), [{ type: 'resize', largeur: 604, hauteur: 654, fin: false }]);
    await souris('mouseReleased', coin.x - 40, coin.y - 30, 0);
    const tailles = await page.evaluate(() => window.tailles);
    assert.deepEqual(tailles.at(-1), { type: 'resize', largeur: Math.ceil(coin.x - 40 + 4), hauteur: Math.ceil(coin.y - 30 + 4), fin: true });
    assert.equal(tailles.filter(({ fin }) => fin).length, 1, 'un seul message de fin par geste');
    assert.notEqual(await page.evaluate(() => document.activeElement?.className), 'resize-grip', 'la poignée ne prend pas le focus');
  } finally {
    await page.close();
  }
});

test('Z9.4 un mouvement sans bouton, comme Figma en donne, prolonge le geste de la poignée ; après le relâcher, la survoler n’envoie plus rien', async () => {
  const page = await ouvrirSur('alertes-seules', { width: 600, height: 720 });
  try {
    await releverLesTailles(page);
    const coin = await centreDe(page.locator('.resize-grip'));
    const souris = await sourisReelle(page);
    const image = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    await souris('mouseMoved', coin.x, coin.y, 0);
    await souris('mousePressed', coin.x, coin.y, 1);
    await souris('mouseMoved', coin.x - 20, coin.y - 20, 1);
    await image();
    // Sans bouton, loin de la poignée : Chromium y retire la capture.
    await souris('mouseMoved', coin.x - 100, coin.y - 80, 0);
    await image();
    await souris('mouseMoved', coin.x - 150, coin.y - 120, 0);
    await image();
    assert.deepEqual((await page.evaluate(() => window.tailles)).at(-1), { type: 'resize', largeur: Math.ceil(coin.x - 150 + 4), hauteur: Math.ceil(coin.y - 120 + 4), fin: false }, 'la poignée suit encore le pointeur');
    await souris('mouseReleased', coin.x - 150, coin.y - 120, 0);
    const auRelacher = (await page.evaluate(() => window.tailles)).length;
    for (const [dx, dy] of [[0, 0], [-4, -4], [-30, -10]]) await souris('mouseMoved', coin.x + dx, coin.y + dy, 0);
    await image();
    assert.equal((await page.evaluate(() => window.tailles)).length, auRelacher, 'aucun message après le relâcher');
  } finally {
    await page.close();
  }
});

test('Z9.4 sans capture, la sortie de la fenêtre finit le geste de la poignée, et y revenir n’envoie plus rien', async () => {
  const page = await navigateur.newPage({ viewport: { width: 900, height: 900 } });
  page.setDefaultTimeout(5000);
  try {
    const ui = await ouvrirDansUneIframe(page);
    const coin = await centreDe(ui.locator('.resize-grip'));
    const souris = await sourisReelle(page);
    const tailles = () => page.evaluate(() => window.demandes.filter(({ type }) => type === 'resize'));
    await souris('mouseMoved', coin.x, coin.y, 0);
    await souris('mousePressed', coin.x, coin.y, 1);
    await souris('mouseMoved', coin.x - 40, coin.y - 40, 0);
    // Hors de l'iframe, à droite : sans capture, le relâcher n'y serait pas vu.
    await souris('mouseMoved', 800, coin.y - 40, 0);
    await page.waitForFunction(() => window.demandes.some(({ type, fin }) => type === 'resize' && fin));
    await souris('mouseReleased', 800, coin.y - 40, 0);
    const avant = (await tailles()).length;
    for (const [dx, dy] of [[-40, -40], [0, 0], [-10, -10]]) await souris('mouseMoved', coin.x + dx, coin.y + dy, 0);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 20))));
    assert.equal((await tailles()).length, avant, 'revenu dans le plugin, le pointeur ne redimensionne plus');
    assert.equal((await tailles()).filter(({ fin }) => fin).length, 1);
  } finally {
    await page.close();
  }
});

/**
 * Relève, à chaque image, l'écart vertical d'un élément à sa position au début du relevé ([UI-20]). Le relevé
 * s'arrête à `ecartsReleves`, avant le relâcher : la fin du geste range et peut rendre l'onglet autrement.
 */
async function releverLesEcarts(page, selecteur) {
  await page.evaluate((cible) => {
    const element = document.querySelector(cible);
    const depart = element.getBoundingClientRect().top;
    window.ecartsDuGeste = [];
    window.releveEnCours = true;
    const relever = () => {
      if (!window.releveEnCours) return;
      window.ecartsDuGeste.push(Math.round(element.getBoundingClientRect().top - depart));
      requestAnimationFrame(relever);
    };
    requestAnimationFrame(relever);
  }, selecteur);
}
const ecartsReleves = (page) => page.evaluate(() => {
  window.releveEnCours = false;
  return window.ecartsDuGeste;
});
/** Deux images : le rendu d'un mouvement part à l'image qui le suit (Z4). */
const deuxImages = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
/**
 * Une fenêtre assez haute pour que l'onglet ne défile pas. Défilé, Chromium ancre le défilement sur un élément
 * visible et compense un bloc qui grandit hors de la vue : le relevé ne verrait alors pas le saut.
 */
const SANS_DEFILEMENT = (largeur) => ({ width: largeur, height: 1600 });

test('[UI-20] glisser la luminosité de Soft et Vivid de 0 à +0,02 sur Vert, près d’un seuil, ne déplace pas le curseur d’un pixel', async () => {
  const page = await ouvrirSur('ajuster-en-modale', SANS_DEFILEMENT(600));
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    await carte.getByRole('button', { name: 'Les deux' }).click();
    const nom = 'Luminosité de Soft et Vivid';
    const curseur = carte.getByRole('slider', { name: nom });
    await curseur.scrollIntoViewIfNeeded();
    const boite = await curseur.boundingBox();
    const souris = await sourisReelle(page);
    const y = boite.y + boite.height / 2;
    // Le centre du pouce parcourt la piste moins deux demi-pouces de 7 px ; la piste va de −0,05 à +0,02.
    const x = (valeur) => boite.x + 7 + ((valeur + 0.05) / 0.07) * (boite.width - 14);
    await releverLesEcarts(page, `[aria-label="${nom}"]`);
    await souris('mouseMoved', x(0), y, 0);
    await souris('mousePressed', x(0), y, 1);
    for (const valeur of [0.005, 0.01, 0.015, 0.02, 0.01, 0.02]) {
      await souris('mouseMoved', x(valeur), y, 1);
      await deuxImages(page);
    }
    const ecarts = await ecartsReleves(page);
    await souris('mouseReleased', x(0.02), y, 0);
    assert.equal(await curseur.inputValue(), '0.02', 'le geste a porté la luminosité à +0,02');
    assert.deepEqual([...new Set(ecarts)], [0], `écarts relevés à chaque image : ${ecarts.join(', ')} px`);
  } finally {
    await page.close();
  }
});

test('[UI-20] à 500 px, glisser la poignée claire de la dérive sur Jaune ne déplace pas le graphe d’un pixel', async () => {
  const page = await ouvrirSur('alertes-seules', SANS_DEFILEMENT(500));
  try {
    await deplierLaCarte(page, 'Dérive de teinte');
    const rond = poignee(page, 'clair').locator('circle');
    await rond.scrollIntoViewIfNeeded();
    const boite = await rond.boundingBox();
    const souris = await sourisReelle(page);
    const x = boite.x + boite.width / 2;
    const y = boite.y + boite.height / 2;
    await releverLesEcarts(page, '.derive-graphe');
    await souris('mouseMoved', x, y, 0);
    await souris('mousePressed', x, y, 1);
    // Vers le bas, la teinte claire s'écarte de Tailwind : un point à vérifier paraît en cours de geste.
    for (let pas = 1; pas <= 12; pas += 1) {
      await souris('mouseMoved', x, y + pas * 12, 1);
      await deuxImages(page);
    }
    const ecarts = await ecartsReleves(page);
    await souris('mouseReleased', x, y + 144, 0);
    assert.deepEqual([...new Set(ecarts)], [0], `écarts relevés à chaque image : ${ecarts.join(', ')} px`);
  } finally {
    await page.close();
  }
});

test('[UI-17] une ligne fixe coupée s’ouvre au clic dans une bulle, sans rien déplacer ; Échap la referme et rend le focus', async () => {
  const page = await ouvrirSur('avertissement-long', MINIMALE);
  try {
    const ligne = carteDeLOnglet(page, 'Configuration de la palette').locator('.ligne-de-la-reference');
    const texte = ligne.locator('.ligne-fixe-texte');
    const complet = '2 garanties manquées en Thème Light · Ajustée depuis #15803D';
    assert.equal(await texte.getAttribute('title'), complet);
    assert.ok(await texte.evaluate((element) => element.scrollWidth > element.clientWidth), 'à 500 px, le texte se coupe');
    assert.equal((await ligne.boundingBox()).height, 24);
    const avant = (await ligne.boundingBox()).y;
    await texte.click();
    const bulle = page.locator('.bulle-de-ligne');
    assert.equal(await bulle.isVisible(), true);
    assert.equal(await bulle.textContent(), complet);
    assert.equal(await texte.getAttribute('aria-expanded'), 'true');
    assert.equal((await ligne.boundingBox()).y, avant, 'la bulle ne déplace pas la ligne');
    const cadre = await bulle.boundingBox();
    assert.ok(cadre.x >= 0 && cadre.x + cadre.width <= MINIMALE.width, 'la bulle tient dans la fenêtre');
    await page.keyboard.press('Escape');
    assert.equal(await bulle.isVisible(), false);
    assert.equal(await texte.evaluate((element) => document.activeElement === element), true);
    await texte.click();
    await page.mouse.click(5, 5);
    assert.equal(await bulle.isVisible(), false, 'un clic ailleurs la referme');
  } finally {
    await page.close();
  }
});

test('[UI-18] le pied compte les garanties et les alertes à toute position de défilement ; « Détails » ouvre le volet, de hauteur fixe, et Échap le referme', async () => {
  const page = await ouvrirSur('promesses-manquees', PAR_DEFAUT);
  try {
    const pied = page.locator('.pied-de-la-palette');
    assert.match(await pied.locator('.pied-texte').textContent(), /^\d+ garanties manquées sur 76 · /);
    assert.equal(await pied.getAttribute('data-ton'), 'danger');
    for (const position of [0, 400, 100000]) {
      await page.evaluate((y) => window.scrollTo(0, y), position);
      const boite = await pied.boundingBox();
      assert.equal(Math.round(boite.y + boite.height), PAR_DEFAUT.height, `le pied reste au bas de la fenêtre, défilement ${position}`);
    }
    const details = pied.getByRole('button', { name: 'Détails' });
    await details.click();
    const volet = page.getByRole('dialog', { name: 'Garanties et alertes' });
    assert.equal(await volet.isVisible(), true);
    assert.equal(await details.getAttribute('aria-expanded'), 'true');
    assert.match(await volet.locator('.constats-titre').first().textContent(), /^Promesses à corriger · \d+$/);
    const hauteur = (await volet.boundingBox()).height;
    assert.ok(await volet.locator('.volet-corps').evaluate((corps) => corps.scrollHeight > corps.clientHeight), 'le volet fait défiler ce qu’il liste');
    await page.keyboard.press('Escape');
    assert.equal(await volet.isVisible(), false);
    assert.equal(await details.evaluate((element) => document.activeElement === element), true);
    await details.click();
    assert.equal((await volet.boundingBox()).height, hauteur);
    // Un lien vers un réglage de l'onglet referme le volet, qui couvrirait ce réglage.
    await volet.getByRole('button', { name: 'Dérive de teinte' }).first().click();
    assert.equal(await volet.isVisible(), false);
    assert.equal(await carteDeLOnglet(page, 'Dérive de teinte').getAttribute('data-ouverte'), 'true');
  } finally {
    await page.close();
  }
});

test('[UI-20] le bilan ne s’annonce au lecteur d’écran qu’à la fin d’un geste, jamais pendant', async () => {
  const page = await ouvrirSur('ajuster-en-modale', SANS_DEFILEMENT(600));
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    await carte.getByRole('button', { name: 'Les deux' }).click();
    const annonce = page.locator('.pied-annonce');
    assert.equal(await annonce.getAttribute('aria-live'), 'polite');
    const avant = await annonce.textContent();
    const curseur = carte.getByRole('slider', { name: 'Luminosité de Soft et Vivid' });
    const boite = await curseur.boundingBox();
    const souris = await sourisReelle(page);
    const y = boite.y + boite.height / 2;
    const x = (valeur) => boite.x + 7 + ((valeur + 0.05) / 0.07) * (boite.width - 14);
    await souris('mouseMoved', x(0), y, 0);
    await souris('mousePressed', x(0), y, 1);
    const pendant = [];
    for (const valeur of [0.005, 0.01, 0.015, 0.02]) {
      await souris('mouseMoved', x(valeur), y, 1);
      await deuxImages(page);
      pendant.push(await annonce.textContent());
    }
    assert.deepEqual([...new Set(pendant)], [avant], 'rien ne s’annonce pendant le glisser');
    const bilanPendant = await page.locator('.pied-texte').textContent();
    await souris('mouseReleased', x(0.02), y, 0);
    await deuxImages(page);
    assert.notEqual(await annonce.textContent(), avant, 'le bilan changé s’annonce au relâcher');
    assert.ok(bilanPendant.startsWith(await annonce.textContent()), 'l’annonce reprend le bilan du pied');
  } finally {
    await page.close();
  }
});
