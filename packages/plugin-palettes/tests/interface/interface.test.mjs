/** Interactions de l'interface construite d'UCM Palettes, avec les messages du sandbox simulés. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import { chromium } from 'playwright';

let navigateur;
before(async () => { navigateur = await chromium.launch(); });
after(async () => { await navigateur?.close(); });
const html = readFileSync(new URL('../../dist/ui.html', import.meta.url), 'utf8');

test('[UI-32] une variable absente garde la confirmation des couleurs retouchées dans Figma', async () => {
  const page = await ouvrir();
  try {
    const lu = structuredClone(messageDe('tokens-modifies'));
    const id = lu.variables.suivi.palettes[ID_DU_JAUNE].variables['soft/light/50'].id;
    lu.variables.variables = lu.variables.variables.filter((variable) => variable.id !== id);
    await envoyer(page, lu);
    await ouvrirLaPlanche(page);
    const fiche = page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_JAUNE}"]`);
    assert.equal(await fiche.locator('.sortie[data-sortie="tokens"] .pastille-d-etat').textContent(), 'Introuvables');
    await fiche.locator('[data-encart="modifiees"]').waitFor();
    await fiche.locator('[data-geste="laisser"]').click();
    await fiche.locator('.sortie[data-sortie="tokens"] [data-geste="mettre-a-jour"]').click();
    await fiche.locator('[data-encart="modifiees"]').waitFor();
    assert.equal((await demandes(page)).filter((demande) => demande.type === 'ecrire-variables').length, 0);
    await fiche.locator('[data-geste="remettre"]').click();
    const demande = await prochaineDuType(page, 'ecrire-variables', 0);
    assert.deepEqual(demande.remettre, [ID_DU_JAUNE]);
  } finally { await page.close(); }
});

test('[UI-34] une reprise partielle nomme la collision et affiche la forme réelle des thèmes', async () => {
  const page = await ouvrirSur('reprise-partielle');
  try {
    await ouvrirLaPlanche(page);
    const fiche = page.locator('.palette-depliable[data-palette="p-51a7e000"]');
    assert.equal(await fiche.locator('.sortie[data-sortie="tokens"] .pastille-d-etat').textContent(), 'À mettre à jour');
    assert.match(await fiche.textContent(), /Palette partiellement écrite/);
    assert.match(await fiche.textContent(), /slate\/dark\/50/);
    assert.match(await fiche.textContent(), /Thèmes dans le chemin/);
    assert.match(await fiche.textContent(), /Renommez ces variables dans Figma/);
  } finally { await page.close(); }
});

test('[UI-35] l’ancienne sortie demande sa propre confirmation et ne cible pas les tokens actuels', async () => {
  const page = await ouvrirSur('ancienne-sortie-des-tokens');
  try {
    await ouvrirLaPlanche(page);
    const ancienne = page.locator('.carte-supprimee').filter({ hasText: 'ancienne destination' });
    await ancienne.locator('[data-geste="supprimer-variables"]').click();
    assert.equal((await demandes(page)).filter((demande) => demande.type === 'retirer-variables').length, 0);
    await ancienne.locator('[data-geste="confirmer-variables"]').click();
    const demande = await prochaineDuType(page, 'retirer-variables', 0);
    assert.match(demande.palette, /^ancienne:/);
    assert.notEqual(demande.palette, ID_DU_BLEU);
  } finally { await page.close(); }
});

test('[VAR-04] un refus de lecture garde les palettes affichées et propose de synchroniser', async () => {
  const page = await ouvrirSur('tokens-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const demande = (await demandes(page)).filter((demande) => demande.type === 'lire-etat').at(-1);
    const avant = await page.locator('.palette-depliable[data-palette]').count();
    await envoyer(page, { type: 'etat-refuse', demande: demande.demande, message: 'lecture refusée' });
    assert.equal(await page.locator('.palette-depliable[data-palette]').count(), avant);
    await page.getByText('Figma a interrompu la demande', { exact: true }).waitFor();
    assert.match(await page.locator('#panneau-gestion').textContent(), /Synchronisez dans Gestion, puis réessayez/);
  } finally { await page.close(); }
});

test('[VAR-14] un refus de copie nomme les références déjà importées et libère le geste', async () => {
  const page = await ouvrirSur('copie-refusee');
  try {
    await ouvrirLaPlanche(page);
    await page.locator('#panneau-gestion .palette-depliable[data-bibliotheque] [data-geste="deplier"]').click();
    await page.locator('#panneau-gestion [data-geste="copier"]').click();
    await page.locator('#panneau-gestion [data-geste="confirmer-copie"]').click();
    const demande = await prochaineDuType(page, 'copier-palette', 0);
    await envoyer(page, { type: 'copie', demande: demande.demande, issue: { issue: 'bibliotheque-illisible', message: 'import refusé', importsEffectues: ['gray/50', 'gray/200'] } });
    await page.getByText('Références de bibliothèque importées', { exact: true }).waitFor();
    assert.match(await page.locator('#panneau-gestion').textContent(), /gray\/50, gray\/200/);
    assert.equal(await page.locator('[data-geste="confirmer-copie"]').isDisabled(), false);
  } finally { await page.close(); }
});

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
    await page.getByRole('button', { name: 'Retour aux palettes' }).waitFor();
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
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const champ = page.locator('input[data-mode="light"][data-rang="7"]');
    await champ.fill('0,');
    await page.evaluate(() => {
      window.champConserve = document.querySelector('input[data-mode="light"][data-rang="7"]');
      window.cartesConservees = [...document.querySelectorAll('.carte')];
      window.hautDuChampAvant = window.champConserve.getBoundingClientRect().top;
      document.querySelector('#langue-du-plugin').value = 'en';
      document.querySelector('#langue-du-plugin').dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await champ.inputValue(), '0,');
    assert.equal(await champ.evaluate((element) => element === window.champConserve && document.activeElement === element), true);
    assert.equal(await page.evaluate(() => window.cartesConservees.every((element) => element.isConnected)), true);
    // Les textes anglais n'ont pas la hauteur des textes français : la page garde le champ à la même place à l'écran, pas le même défilement.
    assert.equal(await page.evaluate(() => Math.abs(window.champConserve.getBoundingClientRect().top - window.hautDuChampAvant) <= 1), true);
    await page.getByRole('button', { name: 'Back to palettes' }).click();
    assert.equal(await page.locator('.carte[aria-label="Color shift"]').getAttribute('data-ouverte'), 'true');
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
    assert.equal(await page.locator('#panneau-gestion').textContent().then((texte) => texte.includes('Generating “Bleu”…')), true);
    assert.equal(await page.locator('.carte-de-reglage').first().evaluate((element) => element.closest('[inert]') !== null), true);
    await envoyer(page, dessinDe(demande.demande, { issue: 'etrangers', cadres: [{ palette: ID_DU_BLEU, calques: [{ id: 'x', nom: 'Note personnelle' }] }] }));
    await page.getByRole('button', { name: 'Back to palettes' }).click();
    await page.getByText('Content added to the frame for “Bleu”').waitFor();
    assert.match(await page.locator('#panneau-gestion').textContent(), /Note personnelle/);
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
    if (['lire-etat', 'ranger-recette', 'dessiner', 'voir-sur-la-planche', 'retirer-cadre', 'ranger-sections', 'choisir-page', 'ecrire-variables', 'ranger-destination', 'retirer-variables', 'reprendre-palette', 'copier-palette'].includes(type)) window.demandes.push(event.data.pluginMessage);
  });
</script>`;

/** La taille minimale de la fenêtre ([UI-01]). */
const MINIMALE = { width: 500, height: 520 };

test('les onglets suivent leur libellé avec le même retrait horizontal', async () => {
  const page = await ouvrir();
  try {
    const mesures = await page.getByRole('tab').evaluateAll((onglets) => onglets.map((onglet) => {
      const style = getComputedStyle(onglet);
      return {
        largeur: onglet.getBoundingClientRect().width,
        texte: onglet.textContent,
        retraitGauche: style.paddingLeft,
        retraitDroit: style.paddingRight,
      };
    }));
    assert.deepEqual(mesures.map(({ retraitGauche, retraitDroit }) => [retraitGauche, retraitDroit]), [['8px', '8px'], ['8px', '8px'], ['8px', '8px']]);
    assert.ok(mesures[1].largeur > mesures[0].largeur, 'Vérification est plus large que Création');
    assert.ok(mesures[0].largeur > mesures[2].largeur, 'Création est plus large que Gestion');
    assert.deepEqual(mesures.map(({ texte }) => texte), ['Création', 'Vérification', 'Gestion']);
  } finally {
    await page.close();
  }
});

/** Ouvre l'interface, par défaut à 440 × 520, sous la largeur minimale. */
async function ouvrir(viewport = { width: 440, height: 520 }, langue = 'fr', sections) {
  const page = await navigateur.newPage({ viewport });
  page.setDefaultTimeout(5000);
  await page.setContent(html.replace('<head>', () => `<head>${RELEVE.replace("langue: 'fr'", `langue: ${JSON.stringify(langue)}, sections: ${JSON.stringify(sections)}`)}`));
  return page;
}

test('la fenêtre s’ouvre sur l’onglet Création et demande l’état du fichier', async () => {
  const page = await ouvrir();
  try {
    const palettes = page.getByRole('tab', { name: 'Création', exact: true });
    assert.equal(await palettes.getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('tab', { name: 'Gestion', exact: true }).getAttribute('aria-selected'), 'false');
    assert.equal(await page.locator('#panneau-creation').isVisible(), true);
    assert.equal(await page.locator('#panneau-gestion').isVisible(), false);
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
    await page.getByRole('button', { name: 'Retour aux palettes' }).click();
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
    assert.equal(await page.locator('#panneau-creation .constat-bloquant').count(), 0);
    await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), etat(1, { etat: 'future', version: 9 }));
    await page.locator('#panneau-creation .constat-bloquant').waitFor();
    assert.match(await page.locator('#panneau-creation .constat-ou').textContent(), /format 9/);
  } finally {
    await page.close();
  }
});

/** Les messages des états de la galerie : l'interface est éprouvée sur les mêmes scénarios. */
const { ETATS } = createRequire(import.meta.url)('../../galerie/etats.cjs');
const messageDe = (id) => ETATS.find((etat) => etat.id === id).atteinte[0].message;

test('[UI-27] une ligne se déplie au clic ou au clavier, et ses états cèdent la place à « Modifier »', async () => {
  const page = await ouvrir(MINIMALE);
  try {
    await envoyer(page, messageDe('gestion-liste'));
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    const lignes = page.locator('#panneau-gestion .palette-depliable[data-palette]');
    assert.equal(await lignes.count(), 3);
    assert.equal(await page.locator('#panneau-gestion .palette-fiche').count(), 0);
    assert.equal(await page.locator('#panneau-gestion [data-geste="modifier"]').count(), 0);
    const bleu = lignes.first();
    assert.equal(await bleu.locator('.palette-etats .pastille-d-etat').count(), 2);
    await bleu.locator('.mini-rampe').click();
    const bascule = bleu.locator('[data-geste="deplier"]');
    assert.equal(await bascule.getAttribute('aria-expanded'), 'true');
    assert.equal(await bascule.evaluate((element) => element === document.activeElement), true);
    assert.equal(await bleu.locator('.palette-etats').count(), 0);
    assert.equal(await bleu.locator('[data-geste="modifier"]').isVisible(), true);
    assert.equal(await bleu.locator('.palette-fiche .sorties').isVisible(), true);
    // Un geste de la ligne dépliée ne la replie pas.
    await bleu.locator('[data-geste="modifier"]').click();
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    assert.equal(await bascule.getAttribute('aria-expanded'), 'true');
    // Plusieurs lignes restent dépliées à la fois.
    await lignes.nth(1).locator('[data-geste="deplier"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#panneau-gestion .palette-fiche').count(), 2);
    await bascule.focus();
    await page.keyboard.press('Space');
    assert.equal(await bascule.getAttribute('aria-expanded'), 'false');
    assert.equal(await bleu.locator('.palette-etats .pastille-d-etat').count(), 2);
    assert.equal((await demandes(page)).some((demande) => demande.type === 'ranger-vue'), false);
  } finally { await page.close(); }
});

test('[UI-32] une palette qui attend une décision se déplie seule, et repliée reste repliée', async () => {
  const page = await ouvrirSur('tokens-modifies');
  try {
    await ouvrirLaPlanche(page);
    const jaune = page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_JAUNE}"]`);
    assert.equal(await jaune.getAttribute('data-ouverte'), 'true');
    assert.equal(await jaune.locator('[data-geste="remettre"]').isVisible(), true);
    await jaune.locator('[data-geste="deplier"]').click();
    const demande = (await demandes(page)).filter((demande) => demande.type === 'lire-etat').at(-1);
    await envoyer(page, { ...messageDe('tokens-modifies'), demande: demande.demande });
    assert.equal(await jaune.getAttribute('data-ouverte'), 'false');
  } finally { await page.close(); }
});

test('[UI-36] les sections de Gestion se replient au clavier, se rangent et se restaurent sans écrire dans Figma', async () => {
  const page = await ouvrir(MINIMALE);
  let sections;
  try {
    await envoyer(page, messageDe('gestion-liste'));
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    const connexion = page.locator('[data-section="connexion"]');
    assert.equal(await connexion.locator('.section-bascule').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('[data-section="plugin"] .section-bascule').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('[data-section="recette"] .section-bascule').getAttribute('aria-expanded'), 'false');
    await connexion.locator('.section-bascule').focus();
    await connexion.locator('.section-bascule').press('Enter');
    assert.equal(await connexion.locator('.section-corps').isVisible(), true);
    assert.equal(await connexion.locator('.pastille-d-etat').count(), 0);
    assert.equal(await page.locator('[data-geste="tout-mettre-a-jour"]').count(), 0);
    await page.getByRole('button', { name: 'Changer', exact: true }).last().click();
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    assert.equal(await connexion.locator('[data-geste="changer-la-page"]').evaluate(element => element === document.activeElement), true);
    await connexion.locator('.section-bascule').press('Space');
    assert.equal(await connexion.locator('.section-corps').isVisible(), false);
    await connexion.locator('.section-bascule').click();
    await page.waitForFunction(() => window.demandes.filter(demande => demande.type === 'ranger-sections').length === 3);
    sections = (await demandes(page)).filter(demande => demande.type === 'ranger-sections').at(-1).sections;
    assert.equal(sections.connexion, true);
    assert.equal((await demandes(page)).some(demande => ['dessiner', 'ranger-recette', 'ecrire-variables'].includes(demande.type)), false);
  } finally { await page.close(); }
  const suivante = await ouvrir(MINIMALE, 'fr', sections);
  try {
    await envoyer(suivante, messageDe('gestion-liste'));
    await suivante.getByRole('tab', { name: 'Gestion', exact: true }).click();
    assert.equal(await suivante.locator('[data-section="connexion"] .section-corps').isVisible(), true);
  } finally { await suivante.close(); }
});

test('[UI-33] un fichier sans variables montre sa bibliothèque distante sous son intertitre, dans la liste', async () => {
  const page = await ouvrir(MINIMALE);
  try {
    const lu = structuredClone(messageDe('bibliotheques'));
    lu.classement.recette.palettes = [];
    lu.variables.variables = [];
    lu.variables.collections = [];
    lu.variables.suivi.palettes = {};
    await envoyer(page, lu);
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    const intertitres = page.locator('#panneau-gestion .palette-intertitre');
    assert.equal(await intertitres.count(), 1);
    assert.equal(await intertitres.locator('.ligne-secondaire').textContent(), 'Publiées par une bibliothèque distante');
    const gray = page.locator('#panneau-gestion .palette-depliable[data-bibliotheque]');
    await gray.locator('[data-geste="deplier"]').click();
    assert.equal(await gray.getByRole('button', { name: 'Copier dans le plugin', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    await page.getByLabel('Langue', { exact: true }).selectOption('en');
    await page.getByRole('button', { name: 'Back to palettes' }).click();
    assert.equal(await intertitres.locator('.ligne-secondaire').textContent(), 'Published by a remote library');
  } finally { await page.close(); }
});

test('[UI-30] S-A simule les chemins sans couleur et suit le groupe et les thèmes à la taille minimale', async () => {
  const page = await ouvrir(MINIMALE);
  try {
    await envoyer(page, messageDe('destination-ouverte'));
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    await page.locator('[data-section="connexion"] .section-bascule').click();
    await page.locator('[data-geste="changer-la-destination"]').click();
    const simulation = page.locator('.simulation');
    assert.equal(await simulation.locator('.chemin-cree').count(), 4);
    assert.deepEqual(await simulation.locator('.chemin-compte').allTextContents(), ['11', '11', '11', '11']);
    assert.match(await simulation.textContent(), /44 variables · 1 mode/);
    assert.match(await simulation.locator('.chemin-cree').first().textContent(), /colors \/ Bleu \/ soft \/ light \/ 50 … 950/);
    assert.equal(await simulation.locator('.valeur, [style*="background"]').count(), 0);
    await page.getByRole('button', { name: 'En modes', exact: true }).click();
    assert.equal(await simulation.locator('.chemin-cree').count(), 2);
    assert.match(await simulation.textContent(), /22 variables · 2 modes/);
    assert.match(await simulation.locator('.chemins-tete').textContent(), /modes Light, Dark/);
    await page.getByRole('textbox', { name: 'Groupe', exact: true }).fill('brand/colors');
    assert.match(await simulation.locator('.chemin-cree').first().textContent(), /brand \/ colors \/ Bleu \/ soft/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.equal((await demandes(page)).some(demande => demande.type === 'ranger-destination'), false);
  } finally { await page.close(); }
});

/** Choisit la première palette de la liste, comme le designer : l'onglet Création n'en ouvre aucune de lui-même ([UI-06]). */
async function ouvrirLaPremierePalette(page) {
  // Par son identifiant : l'onglet se nomme « Create » en anglais.
  await page.locator('#onglet-creation').click();
  await page.locator('.selecteur-bouton').click();
  await page.locator('.selecteur-option').first().click();
  await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').waitFor();
}

/**
 * Ouvre l'interface sur le premier message d'un état de la galerie, puis sur sa première palette, sauf `sansPalette`.
 * Un fichier qui porte des palettes s'ouvre sur Gestion : `sansPalette` revient à Création, sans rien choisir.
 */
async function ouvrirSur(id, viewport, { sansPalette = false } = {}) {
  const page = await ouvrir(viewport);
  await page.evaluate((message) => window.postMessage({ pluginMessage: message }, '*'), messageDe(id));
  if (sansPalette) {
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    await page.locator('.selecteur-bouton').waitFor();
  } else await ouvrirLaPremierePalette(page);
  return page;
}

/** Une carte d'un onglet, par son titre ; l'onglet Création par défaut. */
const carteDeLOnglet = (page, titre, panneau = '#panneau-creation') => page.locator(`${panneau} .carte[aria-label="${titre}"]`);
/** L'en-tête d'une carte repliable : le bouton qui la déplie ([UI-12]). */
const bascule = (page, titre, panneau) => carteDeLOnglet(page, titre, panneau).locator('> .carte-tete > .carte-bascule');

/**
 * Déplie une carte repliée à l'ouverture ([UI-09], [UI-12], [UI-14], V8.5) ; une carte ouverte le reste. Une carte
 * dont les réglages ont une limite dynamique attend la fin de son calcul ([DER-20]) : un geste lit la limite complète.
 */
async function deplierLaCarte(page, titre, panneau) {
  const carte = carteDeLOnglet(page, titre, panneau);
  if ((await carte.getAttribute('data-ouverte')) !== 'true') await bascule(page, titre, panneau).click();
  await limitesCalculees(carte);
}

/** Attend la fin du calcul des limites d'une carte, quand elle en a. */
async function limitesCalculees(carte) {
  if ((await carte.locator('[data-limites]').count()) > 0) await carte.locator('[data-limites="pretes"]').waitFor();
}

/** Ouvre l'onglet Vérification sur la palette ouverte ([VER-18]). */
async function ouvrirLaVerification(page) {
  await page.getByRole('tab', { name: 'Vérification', exact: true }).click();
  await page.locator('#panneau-verification .verdict').waitFor();
}

/** Revient à l'onglet Création. */
const ouvrirLaCreation = (page) => page.getByRole('tab', { name: 'Création', exact: true }).click();

/** La bascule Light/Dark de la ligne du titre de la palette, celle de l'onglet visible : Création et Vérification ont chacune la leur ([UI-23]). */
const themeDuTitre = (page) => page.locator('.tete-de-la-palette .choix-d-affichage:visible .bascule');
/** Choisit un thème dans la ligne du titre, par le nom de son segment : « Light » ou « Dark ». */
const choisirLeTheme = (page, nom) => themeDuTitre(page).getByRole('button', { name: nom, exact: true }).click();
/** Les segments de la bascule du titre avec leur état pressé. */
const themesDuTitre = (page) => themeDuTitre(page).locator('.bascule-option').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')]));

/** La carte « Garanties de contraste », dans l'onglet Vérification ([UI-09]). */
const carteDesGaranties = (page) => carteDeLOnglet(page, 'Garanties de contraste', '#panneau-verification');

/** La carte « Réglage global » de l'onglet Création (Z10.6, [UI-12]). */
const CARTE_DES_REGLAGES = 'Réglage global';

/** La carte « Color shift » de l'onglet Création (section 12). */
const CARTE_DE_LA_DERIVE = 'Color shift';

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
      'bascule de thème': themeDuTitre(grande),
      'rampe Soft': grande.locator('.pastille[data-profil="soft"]').first(),
    })) assert.equal(await dansLaFenetre(locator, PAR_DEFAUT.height), true, `${nom} hors de la fenêtre par défaut`);
  } finally {
    await grande.close();
  }
  const page = await ouvrirSur('promesses-manquees', MINIMALE);
  try {
    const visibles = {
      sélecteur: page.locator('.selecteur-bouton'),
      titre: page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang'),
      'nom et référence': page.locator('[aria-label="Configuration de la palette"] .colonnes-de-base'),
    };
    for (const [nom, locator] of Object.entries(visibles)) assert.equal(await dansLaFenetre(locator), true, `${nom} hors de la fenêtre`);
    assert.equal(await page.evaluate(() => document.scrollingElement.scrollTop), 0);
    // La génération appartient à l'onglet Gestion : la ligne du titre ne porte que le titre et la bascule du thème ([UI-05], [UI-23]).
    const tete = page.locator('#panneau-creation .tete-de-la-palette');
    assert.equal(await tete.locator('.titre-de-premier-rang').textContent(), 'Palette Bleu');
    assert.deepEqual(await tete.locator('button').evaluateAll((boutons) => boutons.map((bouton) => bouton.textContent)), ['Light', 'Dark'], 'seule la bascule du thème a des boutons');
    assert.equal(await tete.locator('[role="status"], [aria-live]').count(), 0, 'ni état ni progression sous le titre');
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
    // La case tiretée du texte des boutons précède les rampes : Origine s'y pose, la flèche droite rend la première nuance.
    await page.keyboard.press('Home');
    assert.match(await focalisee(), /^solid\/foreground, texte des boutons,/);
    // Le texte des boutons se pose sur les trois états du bouton : 700 à 900, pas 700 à 700.
    await page.keyboard.press('Enter');
    assert.match(await page.locator('.nuancier-detail').innerText(), /Il se pose sur solid\/default, solid\/hover et solid\/pressed, nuances 700 à 900\./);
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
    for (const role of ['solid/default · bouton', 'page/foreground · texte coloré', 'page/border · contour']) assert.ok(sertA.includes(role), role);
    assert.match(sertA, /✓ solid\/foreground dessus : \d+,\d\d:1\s*AA/);
    assert.match(sertA, /✓ sur la page : \d+,\d\d:1\s*AA/);
    // Chaque ratio porte le nom de ce qu'il compare, une seule fois.
    const lignes = await detail.locator('.detail-contraste').evaluateAll((rangees) => rangees.map((rangee) => rangee.innerText.split('\n').filter(Boolean)));
    assert.deepEqual(lignes.map(([nom]) => nom), ['Fond de la page', 'Blanc', 'Noir']);
    for (const [, ratio, badge] of lignes) {
      assert.match(ratio, /^\d+,\d\d:1$/);
      assert.match(badge, /^AAA?( ✗)?$/);
    }
    assert.equal((contrastes.match(/Fond de la page/g) ?? []).length, 1);
    assert.deepEqual(await page.evaluate(() => window.demandes.map((demande) => demande.type)), ['lire-etat']);
    await nuance.click();
    assert.equal(await detail.isVisible(), false);
    assert.equal(await nuance.getAttribute('aria-selected'), 'false');
  } finally {
    await page.close();
  }
});

test('[UI-12] Création règle la palette, Vérification la juge : titre, configuration, aperçu, Réglage global, Color shift, Interface de test, les cartes repliables repliées, et aucune carte des garanties', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const configuration = page.locator('#panneau-creation .configuration-de-la-palette');
    // La ligne du titre est un enfant direct de la vue, juste avant la configuration : collée en haut, elle ne tient que dans son parent.
    assert.equal(await configuration.evaluate((element) => element.previousElementSibling.className), 'tete-de-la-palette');
    assert.equal(await configuration.evaluate((element) => element.previousElementSibling.parentElement.classList.contains('vue-de-la-palette')), true);
    assert.deepEqual(await configuration.locator('> .carte').evaluateAll((cartes) => cartes.map((carte) => [carte.getAttribute('aria-label'), carte.dataset.ouverte])), [
      ['Configuration de la palette', 'true'],
      ['Aperçu', 'true'],
      [CARTE_DES_REGLAGES, 'false'],
      [CARTE_DE_LA_DERIVE, 'false'],
      ['Interface de test', 'false'],
    ]);
    assert.equal(await page.locator('#panneau-creation [aria-label="Garanties de contraste"]').count(), 0);
    // La carte Dérive de teinte ne redit pas les garanties : ni bilan, ni lien vers leur carte.
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    const derive = carteDeLOnglet(page, CARTE_DE_LA_DERIVE);
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
    await choisirLeTheme(page, 'Light');
    assert.equal(await reperee(), 'vivid 600');
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Vivid · nuance 600');
    await choisirLeTheme(page, 'Dark');
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
    await choisirLeTheme(page, 'Dark');
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => getComputedStyle(surface).backgroundColor), 'rgb(18, 18, 18)');
  } finally {
    await page.close();
  }
});

test('[UI-09] dans Vérification, la carte des garanties est fixe, sans chevron, son en-tête sans thème ; la première ligne en échec est choisie, et un clic ou Entrée en choisit une autre, qui trace un arc par état', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    const garanties = carteDesGaranties(page);
    await ouvrirLaVerification(page);
    assert.equal(await garanties.getAttribute('data-ouverte'), 'true');
    assert.equal(await garanties.locator('.carte-bascule, .carte-chevron').count(), 0, 'l’en-tête n’est pas un bouton');
    assert.equal(await garanties.locator('.carte-resume').isVisible(), false, 'l’en-tête ne nomme pas le thème');
    assert.equal(await garanties.locator('.carte-tete .glyphe').count(), 1, 'la carte fixe garde son glyphe');
    assert.equal(await garanties.locator('.carte-sous-titre').textContent(), 'Les contrastes de chaque variable');
    // Le profil porteur est choisi, et chaque segment porte le résultat de son profil.
    assert.deepEqual(await garanties.locator('.choix-d-affichage button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')])), [['Soft ✓', 'false'], ['Vivid ✗ 1', 'true']]);
    const choisie = () => garanties.locator('.garantie[aria-pressed="true"]').getAttribute('data-garantie');
    const arcs = () => garanties.locator('.reglette-arc').evaluateAll((traits) => traits.map((trait) => trait.dataset.verdict));
    // Le texte des boutons sur le bouton (première garantie) manque en default ; ses trois états tracent trois arcs.
    assert.equal(await choisie(), '1');
    assert.deepEqual(await arcs(), ['manquee', 'tenue', 'tenue']);
    assert.match(await garanties.locator('.garantie-echec').first().innerText(), /^État default : 4,33:1 pour un minimum de 4,5:1/);
    await garanties.locator('.garantie[data-garantie="5"]').click();
    assert.equal(await choisie(), '5');
    assert.deepEqual(await arcs(), ['tenue']);
    await garanties.locator('.garantie[data-garantie="3"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await choisie(), '3');
    assert.equal((await arcs()).length, 4);
    // Le choix se conserve au changement de profil.
    await garanties.locator('.choix-d-affichage button').first().click();
    assert.equal(await choisie(), '3');
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
      await ouvrirLaVerification(page);
      const carte = carteDesGaranties(page);
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
    await ouvrirLaVerification(page);
    const carte = carteDesGaranties(page);
    const blocs = carte.locator('.garanties-bloc');
    assert.deepEqual(await blocs.evaluateAll((liste) => liste.map((bloc) => bloc.getAttribute('aria-label'))), ['Textes lisibles', 'Éléments visibles']);
    for (const bloc of await blocs.all()) {
      const texte = await bloc.evaluate((element) => [...element.querySelectorAll('.garantie')].map((ligne) => ligne.innerText).join(' '));
      // Un nom de variable (`solid/default`) peut porter le nom d'un état ; seul l'état isolé se répète.
      for (const etat of ['default', 'hover', 'pressed']) assert.equal(new RegExp(`(?<![\w/])${etat}(?![\w/])`).test(texte), false, `« ${etat} » se répète dans les lignes`);
      assert.deepEqual(await bloc.locator('.garanties-colonnes [data-rang]').allTextContents(), ['sur la page', 'default', 'hover', 'pressed']);
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
    await ouvrirLaVerification(page);
    const carte = carteDesGaranties(page);
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
    assert.deepEqual(await carte.locator('.garantie-echec .lien-de-constat').allTextContents(), ['Ajuster le réglage global', 'Ajuster le Color shift', 'Ajuster la luminosité des nuances', 'Ajuster la référence']);
  } finally {
    await page.close();
  }
});

/** Les cases d'une ligne de garantie qui portent un résultat, par rang de colonne : 0 la page, 1 default, 2 hover, 3 pressed. */
const rangsRemplis = (ligne) => ligne.locator('.garantie-etat').evaluateAll((cases) => cases.filter((cellule) => cellule.querySelector('.garantie-resultat')).map((cellule) => cellule.dataset.rang));

test('[UI-09] la carte des garanties montre sept lignes sans numéro, en deux blocs et quatre colonnes, avec les cases vides des garanties qui ne jugent pas tous les états', async () => {
  const page = await ouvrirSur('garanties-respectees', { width: 770, height: 720 });
  try {
    await ouvrirLaVerification(page);
    const carte = carteDesGaranties(page);
    assert.equal(await carte.locator('.garantie').count(), 7);
    // Textes lisibles d'abord, Éléments visibles ensuite ; chaque ligne porte son numéro de plan dans data-garantie, jamais à l'écran.
    const blocs = await carte.locator('.garanties-bloc').evaluateAll((liste) => liste.map((bloc) => [bloc.getAttribute('aria-label'), [...bloc.querySelectorAll('.garantie')].map((ligne) => ligne.dataset.garantie)]));
    assert.deepEqual(blocs, [['Textes lisibles', ['1', '3', '5']], ['Éléments visibles', ['2', '4', '6', '7']]]);
    assert.equal(/\bG[1-7]\b/.test(await carte.innerText()), false, 'aucun numéro G1 à G7 dans le texte visible');
    const nomsAccessibles = await carte.locator('.garantie').evaluateAll((lignes) => lignes.map((ligne) => ligne.getAttribute('aria-label') ?? ''));
    assert.equal(nomsAccessibles.some((nom) => /\bG[1-7]\b/.test(nom)), false, 'aucun numéro dans les noms accessibles');
    for (const bloc of await carte.locator('.garanties-bloc').all()) {
      assert.deepEqual(await bloc.locator('.garanties-colonnes [data-rang]').allTextContents(), ['sur la page', 'default', 'hover', 'pressed']);
    }
    const rangs = Object.fromEntries(await Promise.all([1, 2, 3, 4, 5, 6, 7].map(async (numero) => [numero, (await rangsRemplis(carte.locator(`.garantie[data-garantie="${numero}"]`))).join('')])));
    assert.deepEqual(rangs, {
      1: '123', // le texte des boutons ne se juge que sur les trois états du bouton
      2: '0', // le bouton au repos contre la page
      3: '0123', // le texte sur fond teinté, sur la page et sur ses trois états
      4: '0123',
      5: '0',
      6: '0',
      7: '01', // l'anneau de focus, sur la page et sur le fond teinté au repos
    });
    // Une case sans jugement reste vide : pas de ratio, pas de badge.
    assert.equal(await carte.locator('.garantie[data-garantie="1"] .garantie-etat[data-rang="0"] .garantie-resultat').count(), 0);
    assert.equal(await carte.locator('.garantie-echec').count(), 0, 'Bleu tient ses sept garanties');
  } finally {
    await page.close();
  }
});

test('[UI-09] [VER-20] en Dark inversé, Rouge #D94635 manque la garantie du texte des boutons sur le bouton : le bloc d’échec sous cette ligne porte le lien « Ajuster la référence »', async () => {
  const page = await ouvrirSur('garantie-dark-inverse-g1', { width: 770, height: 720 });
  try {
    await choisirLeTheme(page, 'Dark');
    await ouvrirLaVerification(page);
    const carte = carteDesGaranties(page);
    assert.equal(await carte.locator('.reglette-des-garanties').evaluate((reglette) => getComputedStyle(reglette).backgroundColor), 'rgb(18, 18, 18)', 'la carte montre Dark');
    assert.deepEqual(await carte.locator('.choix-d-affichage button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')])), [['Soft ✓', 'false'], ['Vivid ✗ 1', 'true']]);
    const premiere = carte.locator('.garantie[data-garantie="1"]');
    assert.equal(await premiere.getAttribute('aria-pressed'), 'true', 'la ligne en échec est choisie d’office');
    // Le ratio est tronqué à deux décimales : 4,3052 s'écrit 4,30.
    assert.match(await premiere.locator('.garantie-etat[data-rang="1"]').innerText(), /4,30/);
    const echec = carte.locator('.garantie[data-garantie="1"] + .garantie-echec');
    assert.equal(await echec.count(), 1, 'le bloc d’échec suit la première ligne');
    assert.match(await echec.innerText(), /^État default : 4,30:1 pour un minimum de 4,5:1/);
    assert.equal(await carte.locator('.garantie-echec').count(), 1, 'une seule garantie manque');
    assert.equal(await echec.getByRole('button', { name: 'Ajuster la référence' }).isVisible(), true);
  } finally {
    await page.close();
  }
});

test('[UI-09] [VER-20] la carte suit le thème de la ligne du titre ; des garanties manquées dans l’autre thème se comptent, le lien montre ce thème, et un lien ramène au thème d’avant', async () => {
  // Le texte des boutons noir en Light fait manquer la première garantie en Light ; la ligne du titre montre Dark.
  const page = await ouvrirSur('garantie-en-echec');
  try {
    await choisirLeTheme(page, 'Dark');
    await ouvrirLaVerification(page);
    const carte = carteDesGaranties(page);
    // La réglette est peinte du fond du thème montré.
    const themeDeLaCarte = async () => ({ 'rgb(18, 18, 18)': 'Dark', 'rgb(247, 247, 247)': 'Light' })[await carte.locator('.reglette-des-garanties').evaluate((reglette) => getComputedStyle(reglette).backgroundColor)];
    assert.equal(await themeDeLaCarte(), 'Dark', 'la carte montre le thème que la ligne du titre a choisi');
    assert.equal(await carte.locator('.carte-resume').isVisible(), false, 'l’en-tête ne nomme pas le thème');
    const autre = carte.locator('.autre-theme');
    assert.match(await autre.textContent(), /^Thème Light : \d+ garanties? manquées? · Voir le thème Light$/);
    await autre.locator('.lien-de-constat').click();
    assert.equal(await page.getByRole('tab', { name: 'Vérification', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await themeDeLaCarte(), 'Light');
    assert.ok(await carte.locator('.garantie-echec').count() > 0, 'la carte montre les échecs du thème Light');
    await autre.getByRole('button', { name: 'Revenir au thème Dark' }).click();
    assert.equal(await themeDeLaCarte(), 'Dark');
    assert.equal(await autre.getByRole('button', { name: 'Voir le thème Light' }).isVisible(), true);
    // Un choix dans la ligne du titre pose le thème sans retour, et la ligne de Création le montre.
    await choisirLeTheme(page, 'Light');
    assert.equal(await themeDeLaCarte(), 'Light');
    assert.equal(await autre.isVisible(), false, 'le thème Dark n’a pas de garantie manquée, et aucun retour n’est offert');
    await ouvrirLaCreation(page);
    assert.equal(await themeDuTitre(page).getByRole('button', { name: 'Light', exact: true }).getAttribute('aria-pressed'), 'true');
  } finally {
    await page.close();
  }
});

test('la bascule montre la rampe sombre', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const clair = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    await choisirLeTheme(page, 'Dark');
    assert.equal(await themeDuTitre(page).getByRole('button', { name: 'Dark', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.notEqual(await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label'), clair);
  } finally {
    await page.close();
  }
});

/** Les deux segments de la bascule du titre avec leur état pressé, quand `clair` est le thème montré. */
const themesPresses = (clair) => [['Light', String(clair)], ['Dark', String(!clair)]];

/** Défile la page jusqu'à l'Interface de test, dépliée, de façon que la ligne du titre soit collée en haut. */
async function defilerJusqueLInterfaceDeTest(page) {
  await deplierLaCarte(page, 'Interface de test');
  await page.locator('#panneau-creation .essai-surface').evaluate((element) => element.scrollIntoView({ block: 'end' }));
  assert.ok(await page.evaluate(() => document.scrollingElement.scrollTop) > 0, 'la page est défilée');
}

/** Le haut de la ligne du titre de l'onglet visible, dans la fenêtre. */
const hautDuTitre = async (page) => (await page.locator('.tete-de-la-palette:visible').boundingBox()).y;

test('[UI-23] la ligne du titre porte « Aperçu » Light et Dark dans Création et dans Vérification ; choisir Dark dans Création montre Dark dans la carte des garanties, et l’inverse', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .choix-libelle').textContent(), 'Aperçu');
    assert.deepEqual(await themesDuTitre(page), themesPresses(true));
    await choisirLeTheme(page, 'Dark');
    assert.deepEqual(await themesDuTitre(page), themesPresses(false));
    await ouvrirLaVerification(page);
    assert.equal(await page.locator('#panneau-verification .tete-de-la-palette .choix-libelle').textContent(), 'Aperçu');
    assert.deepEqual(await themesDuTitre(page), themesPresses(false));
    assert.equal(await carteDesGaranties(page).locator('.reglette-des-garanties').evaluate((reglette) => getComputedStyle(reglette).backgroundColor), 'rgb(18, 18, 18)', 'la carte des garanties montre Dark');
    // L'inverse : Light, choisi dans Vérification, se retrouve dans Création, jusque dans le fond de l'aperçu.
    await choisirLeTheme(page, 'Light');
    assert.equal(await carteDesGaranties(page).locator('.reglette-des-garanties').evaluate((reglette) => getComputedStyle(reglette).backgroundColor), 'rgb(247, 247, 247)', 'la carte des garanties montre Light');
    await ouvrirLaCreation(page);
    assert.deepEqual(await themesDuTitre(page), themesPresses(true));
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => getComputedStyle(surface).backgroundColor), 'rgb(247, 247, 247)');
  } finally {
    await page.close();
  }
});

test('[UI-23] la bascule du titre n’a pas de cerne de marque : sa forme est celle des autres choix, fond de bloc, segment pressé au fond de la page', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    // La couleur de marque, telle que le socle la pose sur un cerne (`--bordure-marque`), lue sur un élément.
    const marque = await page.evaluate(() => {
      const sonde = document.createElement('div');
      sonde.style.cssText = 'position: absolute; border: 1px solid var(--bordure-marque)';
      document.body.append(sonde);
      const couleur = getComputedStyle(sonde).borderTopColor;
      sonde.remove();
      return couleur;
    });
    const formeDe = (choix) => choix.evaluate((element) => {
      const groupe = getComputedStyle(element.querySelector('.bascule'));
      const segments = [...element.querySelectorAll('.bascule-option')].map((segment) => getComputedStyle(segment));
      return {
        fondDuGroupe: groupe.backgroundColor,
        cerneDuGroupe: groupe.boxShadow,
        contourDuGroupe: `${groupe.outlineStyle} ${groupe.outlineColor}`,
        cernesDesSegments: segments.map((segment) => segment.boxShadow),
        fondPresse: getComputedStyle(element.querySelector('.bascule-option[aria-pressed="true"]')).backgroundColor,
        libelle: getComputedStyle(element.querySelector('.choix-libelle')).color,
        auRepos: getComputedStyle(element.querySelector('.bascule-option[aria-pressed="false"]')).color,
        rayon: groupe.borderRadius,
        remplissage: groupe.padding,
      };
    });
    const titre = await formeDe(page.locator('#panneau-creation .tete-de-la-palette .choix-d-affichage'));
    const fondDeLaPage = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert.equal(titre.fondPresse, fondDeLaPage, 'le segment pressé prend le fond de la page');
    assert.notEqual(titre.fondDuGroupe, titre.fondPresse, 'les segments reposent sur le fond des blocs');
    assert.equal(titre.libelle, titre.auRepos, 'le libellé et les segments au repos portent le texte second');
    assert.equal(titre.cerneDuGroupe.includes(marque), false, `aucune ombre de la couleur de marque autour des segments : ${titre.cerneDuGroupe}`);
    assert.equal(titre.contourDuGroupe.includes(marque), false, 'aucun contour de la couleur de marque hors focus');
    assert.deepEqual(titre.cernesDesSegments.filter((cerne) => cerne.includes(marque)), [], 'aucun segment ne porte la couleur de marque');
    // Même forme que le choix d'une carte : l'Interface de test, déplié, a le sien.
    await deplierLaCarte(page, 'Interface de test');
    const carte = await formeDe(carteDeLOnglet(page, 'Interface de test').locator('.choix-d-affichage').first());
    assert.deepEqual(titre, carte, 'la bascule du titre et le choix d’une carte ont la même forme');
  } finally {
    await page.close();
  }
});

test('[UI-23] à 600 × 720 et à 500 × 520, Interface de test dépliée et page défilée jusqu’à elle, la ligne du titre reste au haut de la zone visible, et choisir Dark peint la surface du fond Dark sans défiler', async () => {
  for (const viewport of [PAR_DEFAUT, MINIMALE]) {
    const page = await ouvrirSur('alertes-seules', viewport);
    const nom = `${viewport.width} × ${viewport.height}`;
    try {
      await deplierLaCarte(page, 'Interface de test');
      const surface = page.locator('#panneau-creation .essai-surface');
      const fondDeLEcran = () => surface.locator('.essai-ecran').evaluate((ecran) => getComputedStyle(ecran).backgroundColor);
      assert.equal(await fondDeLEcran(), 'rgb(247, 247, 247)', `${nom} : l’écran de l’essai est peint du fond Light`);
      await surface.evaluate((element) => element.scrollIntoView({ block: 'end' }));
      const defilement = () => page.evaluate(() => document.scrollingElement.scrollTop);
      const avant = await defilement();
      assert.ok(avant > 0, `${nom} : la page est défilée jusqu’à l’interface de test`);
      assert.ok(Math.abs(await hautDuTitre(page)) <= 0.5, `${nom} : la ligne du titre est au haut de la zone visible`);
      await choisirLeTheme(page, 'Dark');
      assert.equal(await fondDeLEcran(), 'rgb(18, 18, 18)', `${nom} : l’écran de l’essai est peint du fond Dark`);
      assert.equal(await defilement(), avant, `${nom} : choisir Dark ne défile pas la page`);
      assert.ok(Math.abs(await hautDuTitre(page)) <= 0.5, `${nom} : la ligne du titre reste au haut après le choix`);
    } finally {
      await page.close();
    }
  }
});

test('[UI-23] dans Vérification aussi, la ligne du titre reste au haut de la zone visible quand la page est défilée jusqu’en bas', async () => {
  for (const viewport of [PAR_DEFAUT, MINIMALE]) {
    const page = await ouvrirSur('promesses-manquees', viewport);
    const nom = `${viewport.width} × ${viewport.height}`;
    try {
      await ouvrirLaVerification(page);
      const sousLaBarre = (await page.locator('#panneau-verification .barre-de-palette').boundingBox());
      assert.ok(await hautDuTitre(page) >= sousLaBarre.y + sousLaBarre.height, `${nom} : au repos, la ligne du titre est sous la barre de la palette`);
      await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight));
      assert.ok(await page.evaluate(() => document.scrollingElement.scrollTop) > 0, `${nom} : la page de Vérification défile`);
      assert.ok(Math.abs(await hautDuTitre(page)) <= 0.5, `${nom} : la ligne du titre est au haut de la zone visible`);
      assert.equal(await themeDuTitre(page).isVisible(), true, `${nom} : la bascule du thème se lit`);
    } finally {
      await page.close();
    }
  }
});

test('[UI-23] à 500 px, en français et en anglais, la ligne du titre ne défile pas à l’horizontale, tient sur une ligne et cale la bascule à droite', async () => {
  for (const langue of ['fr', 'en']) {
    const page = await ouvrirSurEn('alertes-seules', MINIMALE, langue);
    try {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${langue} : la page ne défile pas à l’horizontale`);
      for (const panneau of ['#panneau-creation', '#panneau-verification']) {
        if (panneau === '#panneau-verification') await page.getByRole('tab', { name: langue === 'fr' ? 'Vérification' : 'Verify', exact: true }).click();
        const { tete, contenu, boites, bascule } = await page.locator(`${panneau} .tete-de-la-palette`).evaluate((element) => ({
          tete: element.getBoundingClientRect().toJSON(),
          contenu: element.scrollWidth - element.clientWidth,
          boites: [...element.children].map((enfant) => enfant.getBoundingClientRect().toJSON()),
          bascule: element.querySelector('.bascule').getBoundingClientRect().toJSON(),
        }));
        const nom = `${langue}, ${panneau}`;
        assert.equal(boites.length, 2, `${nom} : le titre et la bascule`);
        assert.ok(contenu <= 0, `${nom} : la ligne déborde de ${contenu} px`);
        const centres = boites.map((boite) => boite.y + boite.height / 2);
        assert.ok(Math.max(...centres) - Math.min(...centres) <= 1, `${nom} : le titre et la bascule ne sont pas sur la même ligne ${JSON.stringify(centres)}`);
        assert.ok(Math.abs(bascule.x + bascule.width - (tete.x + tete.width)) <= 0.5, `${nom} : la bascule est calée au bord droit de la ligne`);
        assert.ok(tete.height <= 32.5, `${nom} : la ligne mesure ${tete.height} px`);
      }
    } finally {
      await page.close();
    }
  }
});

test('[UI-23] la barre de la palette n’a aucun bouton de thème et ne se colle pas : elle défile avec la page', async () => {
  const page = await ouvrirSur('alertes-seules', MINIMALE);
  try {
    const barre = page.locator('#panneau-creation .barre-de-palette');
    assert.equal(await barre.locator('.bascule, .bascule-option, .choix-d-affichage').count(), 0);
    assert.equal(await barre.getByRole('button', { name: /^(Light|Dark|Thème (Light|Dark))$/ }).count(), 0);
    assert.equal(await barre.evaluate((element) => getComputedStyle(element).position), 'static');
    assert.equal(await barre.evaluate((element) => element.closest('.choix-de-palette') !== null), true, 'la barre est dans le bloc du choix de palette');
    await defilerJusqueLInterfaceDeTest(page);
    assert.ok((await barre.boundingBox()).y < -10, 'la barre a quitté le haut de la fenêtre avec la page');
  } finally {
    await page.close();
  }
});

/** Déplie les trois cartes repliables de Création et décoche « Synchroniser », que le choix du Color shift se montre. */
async function deplierLesCartesAChoix(page) {
  await deplierLaCarte(page, CARTE_DES_REGLAGES);
  await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
  await deplierLaCarte(page, 'Interface de test');
  await page.locator('#panneau-creation .editeur-derive input[type="checkbox"]').uncheck();
}

/**
 * Pour chaque choix visible de l'en-tête d'une carte de `panneau` : sa carte, son libellé, s'il est dans l'emplacement
 * des choix de l'en-tête hors du bouton de repli, et l'écart entre le bord droit du dernier choix et celui de l'en-tête.
 */
const choixDeLEnTete = (page, panneau) => page.evaluate((panneauVise) => {
  const visible = (element) => element.getClientRects().length > 0;
  return [...document.querySelectorAll(`${panneauVise} .carte-tete .choix-d-affichage`)].filter(visible).map((choix) => {
    const emplacement = choix.parentElement;
    const tete = choix.closest('.carte-tete');
    const dernier = [...emplacement.children].filter(visible).at(-1);
    return {
      carte: choix.closest('.carte').getAttribute('aria-label'),
      libelle: choix.querySelector('.choix-libelle').textContent,
      dansLEmplacement: emplacement.classList.contains('carte-choix') && emplacement.parentElement === tete,
      horsDuBouton: choix.closest('.carte-bascule') === null,
      ecartADroite: tete.getBoundingClientRect().right - dernier.getBoundingClientRect().right,
    };
  });
}, panneau);

test('[UI-12] [UI-14] dans Création, les choix du Réglage global, du Color shift et de l’Interface de test sont dans l’en-tête de leur carte ouverte, hors du bouton de repli, au bord droit ; cliquer un segment ne replie pas la carte', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    await deplierLesCartesAChoix(page);
    const choix = await choixDeLEnTete(page, '#panneau-creation');
    assert.deepEqual(choix.map(({ carte, libelle }) => [carte, libelle]), [
      ['Réglage global', 'Régler'],
      ['Color shift', 'Régler'],
      ['Interface de test', 'Vue'],
      ['Interface de test', 'Afficher'],
    ]);
    for (const releve of choix) {
      const nom = `${releve.carte} · ${releve.libelle}`;
      assert.equal(releve.dansLEmplacement, true, `${nom} : le choix est dans l’emplacement des choix de l’en-tête`);
      assert.equal(releve.horsDuBouton, true, `${nom} : le choix est hors du bouton de repli`);
      assert.ok(Math.abs(releve.ecartADroite) <= 1, `${nom} : le dernier choix est à ${releve.ecartADroite} px du bord droit de l’en-tête`);
    }
    for (const titre of [CARTE_DES_REGLAGES, CARTE_DE_LA_DERIVE, 'Interface de test']) {
      const carte = carteDeLOnglet(page, titre);
      await carte.locator('.carte-tete .choix-d-affichage .bascule-option[aria-pressed="false"]').first().click();
      assert.equal(await carte.getAttribute('data-ouverte'), 'true', `${titre} : un clic sur un segment replie la carte`);
      assert.equal(await carte.locator('.carte-corps').isVisible(), true, `${titre} : le corps se replie`);
    }
  } finally {
    await page.close();
  }
});

/**
 * Pour chaque choix visible du corps d'une carte de `panneau` : sa carte, sa rangée, et si cette rangée ouvre le corps
 * (première enfant du corps), l'écart entre le haut de la rangée et celui du contenu du corps, et l'écart entre le
 * bord droit du dernier choix et celui du contenu du corps.
 */
const placeDesChoix = (page, panneau) => page.evaluate((panneauVise) => {
  const visible = (element) => element.getClientRects().length > 0;
  return [...document.querySelectorAll(`${panneauVise} .carte-corps .choix-d-affichage`)].filter(visible).map((choix) => {
    const rangee = choix.parentElement;
    const corps = choix.closest('.carte-corps');
    const style = getComputedStyle(corps);
    const dernier = [...rangee.children].filter(visible).at(-1);
    const droiteDuCorps = corps.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth);
    return {
      carte: choix.closest('.carte').getAttribute('aria-label'),
      libelle: choix.querySelector('.choix-libelle').textContent,
      dansUneRangee: rangee.classList.contains('rangee-des-choix'),
      premiere: rangee === corps.firstElementChild,
      ecartEnHaut: rangee.getBoundingClientRect().top - (corps.getBoundingClientRect().top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth)),
      ecartADroite: droiteDuCorps - dernier.getBoundingClientRect().right,
    };
  });
}, panneau);

test('[UI-09] dans Vérification, le choix « Afficher » de la carte fixe des garanties est dans une rangée en tête de son corps, calé au bord droit du contenu, et son en-tête n’en porte aucun', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    await ouvrirLaVerification(page);
    const choix = await placeDesChoix(page, '#panneau-verification');
    assert.deepEqual(choix.map(({ carte, libelle }) => [carte, libelle]), [['Garanties de contraste', 'Afficher']]);
    const [releve] = choix;
    assert.equal(releve.dansUneRangee, true, 'le choix est dans une .rangee-des-choix');
    assert.equal(releve.premiere, true, 'la rangée ouvre le corps de la carte');
    assert.ok(Math.abs(releve.ecartEnHaut) <= 1, `la rangée est à ${releve.ecartEnHaut} px du haut du corps`);
    assert.ok(Math.abs(releve.ecartADroite) <= 1, `le dernier choix est à ${releve.ecartADroite} px du bord droit du contenu`);
    assert.equal(await carteDesGaranties(page).locator('.carte-tete .choix-d-affichage').count(), 0, 'l’en-tête de la carte fixe ne porte aucun choix');
  } finally {
    await page.close();
  }
});

/** La forme d'un choix visible de `panneau` : hauteur d'un segment, taille et graisse de ses segments et de son libellé, ordre du libellé et des segments. */
const formesDesChoix = (page, panneau) => page.evaluate((panneauVise) => {
  const visible = (element) => element.getClientRects().length > 0;
  return [...document.querySelectorAll(`${panneauVise} .choix-d-affichage`)].filter(visible).map((choix) => {
    const libelle = choix.querySelector('.choix-libelle');
    const segment = choix.querySelector('.bascule-option');
    const styleDuSegment = getComputedStyle(segment);
    const styleDuLibelle = getComputedStyle(libelle);
    return {
      libelle: libelle.textContent,
      forme: JSON.stringify({
        hauteur: segment.getBoundingClientRect().height,
        taille: styleDuSegment.fontSize,
        graisse: styleDuSegment.fontWeight,
        tailleDuLibelle: styleDuLibelle.fontSize,
        graisseDuLibelle: styleDuLibelle.fontWeight,
      }),
      libelleAvant: libelle.getBoundingClientRect().right <= segment.getBoundingClientRect().left,
    };
  });
}, panneau);

test('[UI-23] tous les choix visibles, ligne du titre comprise, ont la même hauteur de segment, la même taille et la même graisse de police, et le libellé précède les segments', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    await deplierLesCartesAChoix(page);
    const dansCreation = await formesDesChoix(page, '#panneau-creation');
    assert.deepEqual(dansCreation.map(({ libelle }) => libelle), ['Aperçu', 'Régler', 'Régler', 'Vue', 'Afficher']);
    await ouvrirLaVerification(page);
    const dansVerification = await formesDesChoix(page, '#panneau-verification');
    assert.deepEqual(dansVerification.map(({ libelle }) => libelle), ['Aperçu', 'Afficher']);
    const tous = [...dansCreation, ...dansVerification];
    assert.deepEqual([...new Set(tous.map(({ forme }) => forme))].length, 1, `plusieurs formes de choix : ${JSON.stringify(tous.map(({ libelle, forme }) => [libelle, forme]))}`);
    assert.deepEqual(tous.filter(({ libelleAvant }) => !libelleAvant).map(({ libelle }) => libelle), [], 'le libellé précède les segments');
  } finally {
    await page.close();
  }
});

test('[UI-12] carte repliée, les choix sont cachés et le résumé se lit ; carte ouverte, les choix se lisent et le résumé est caché', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    // Le choix du Color shift se montre décoché ; la carte se replie ensuite.
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    await page.locator('#panneau-creation .editeur-derive input[type="checkbox"]').uncheck();
    await bascule(page, CARTE_DE_LA_DERIVE).click();
    for (const titre of [CARTE_DES_REGLAGES, CARTE_DE_LA_DERIVE, 'Interface de test']) {
      const carte = carteDeLOnglet(page, titre);
      const choix = carte.locator('.carte-tete .choix-d-affichage').first();
      const resume = carte.locator('.carte-bascule .carte-resume');
      assert.equal(await carte.getAttribute('data-ouverte'), 'false', `${titre} : repliée au départ`);
      assert.equal(await choix.isVisible(), false, `${titre} : le choix est caché`);
      assert.ok((await resume.textContent()).length > 0, `${titre} : le résumé a un texte`);
      assert.equal(await resume.isVisible(), true, `${titre} : le résumé se lit`);
      await bascule(page, titre).click();
      assert.equal(await choix.isVisible(), true, `${titre} : le choix paraît dépliée`);
      assert.equal(await resume.isVisible(), false, `${titre} : le résumé est caché dépliée`);
      await bascule(page, titre).click();
      assert.equal(await choix.isVisible(), false, `${titre} : le choix disparaît repliée`);
      assert.equal(await resume.isVisible(), true, `${titre} : le résumé revient replié`);
    }
  } finally {
    await page.close();
  }
});

test('[UI-12] un emplacement dont tous les choix sont cachés se cache : Color shift synchronisé, palette à une intensité ; la rangée des garanties de même', async () => {
  const deux = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    await deplierLaCarte(deux, CARTE_DE_LA_DERIVE);
    const synchro = deux.locator('#panneau-creation .editeur-derive input[type="checkbox"]');
    const emplacement = carteDeLOnglet(deux, CARTE_DE_LA_DERIVE).locator('.carte-choix');
    await synchro.check();
    assert.equal(await emplacement.isVisible(), false, 'synchronisé, le choix « Régler » et son emplacement sont cachés');
    assert.equal(await emplacement.evaluate((element) => element.getClientRects().length), 0, 'l’emplacement caché ne tient aucune place');
    await synchro.uncheck();
    assert.equal(await emplacement.isVisible(), true, 'décoché, l’emplacement revient');
  } finally {
    await deux.close();
  }
  const une = await ouvrirSur('palette-une-intensite', PAR_DEFAUT);
  try {
    await deplierLaCarte(une, CARTE_DES_REGLAGES);
    await deplierLaCarte(une, 'Interface de test');
    assert.equal(await carteDeLOnglet(une, CARTE_DES_REGLAGES).locator('.carte-choix').isVisible(), false, 'Réglage global : aucun profil à régler');
    const essai = carteDeLOnglet(une, 'Interface de test');
    assert.deepEqual(await essai.locator('.carte-choix .choix-d-affichage:visible .choix-libelle').allTextContents(), ['Vue'], 'l’Interface de test ne garde que « Vue »');
    await ouvrirLaVerification(une);
    assert.equal(await carteDesGaranties(une).locator('.rangee-des-choix').isVisible(), false, 'Garanties : aucun profil à afficher');
  } finally {
    await une.close();
  }
});

test('[UI-14] l’Interface de test range « Vue » (« View ») puis « Afficher » (« Show ») dans son en-tête, et garde le nom accessible de la vue', async () => {
  for (const [langue, attendu] of [['fr', { libelles: ['Vue', 'Afficher'], nom: 'Vue de l’interface de test', segments: ['Écran', 'États'] }], ['en', { libelles: ['View', 'Show'], nom: 'Test interface view', segments: ['Screen', 'States'] }]]) {
    const page = await ouvrirSurEn('palette-deux-intensites', PAR_DEFAUT, langue);
    try {
      await page.locator('#panneau-creation .carte-bascule[aria-expanded="false"]').last().click();
      const emplacement = page.locator('#panneau-creation .carte[data-ouverte="true"] .carte-choix');
      assert.deepEqual(await emplacement.locator('.choix-libelle').allTextContents(), attendu.libelles, langue);
      assert.deepEqual(await emplacement.locator('.choix-de-la-vue .bascule-option').allTextContents(), attendu.segments, langue);
      assert.equal(await emplacement.getByRole('group', { name: attendu.nom }).count(), 1, `${langue} : le nom accessible de la vue`);
    } finally {
      await page.close();
    }
  }
});

test('[UI-12] à 500 px, en français et en anglais, aucun défilement horizontal, les choix tiennent dans leur en-tête ou leur rangée, et ceux qui ne tiennent pas à côté du titre passent dessous, calés à droite', async () => {
  for (const langue of ['fr', 'en']) {
    const page = await ouvrirSurEn('palette-deux-intensites', MINIMALE, langue);
    try {
      await page.evaluate(() => document.querySelectorAll('#panneau-creation .carte-bascule[aria-expanded="false"]').forEach((bouton) => bouton.click()));
      await page.locator('#panneau-creation .editeur-derive input[type="checkbox"]').uncheck();
      for (const panneau of ['#panneau-creation', '#panneau-verification']) {
        if (panneau === '#panneau-verification') await page.locator('#onglet-verification').click();
        const lignes = await page.locator(`${panneau} .carte-choix:visible, ${panneau} .rangee-des-choix:visible`).evaluateAll((liste) => liste.map((emplacement) => {
          const contenant = emplacement.closest('.carte-tete') ?? emplacement.closest('.carte-corps');
          const bouton = contenant.querySelector('.carte-bascule');
          const boite = emplacement.getBoundingClientRect();
          const cadre = contenant.getBoundingClientRect();
          const choix = [...emplacement.children].filter((enfant) => enfant.getClientRects().length > 0).map((enfant) => enfant.getBoundingClientRect().toJSON());
          const titre = bouton?.getBoundingClientRect();
          return {
            carte: emplacement.closest('.carte').getAttribute('aria-label'),
            deborde: emplacement.scrollWidth - emplacement.clientWidth,
            aGauche: boite.left - cadre.left,
            aDroite: cadre.right - boite.right,
            ecartADroite: cadre.right - Math.max(...choix.map((enfant) => enfant.right)),
            sousLeTitre: titre ? boite.top >= titre.bottom - 0.5 : null,
            surLeTitre: titre ? boite.left < titre.right - 0.5 && boite.right > titre.left + 0.5 && boite.top < titre.bottom - 0.5 : null,
            choix,
          };
        }));
        assert.ok(lignes.length >= (panneau === '#panneau-creation' ? 3 : 1), `${langue}, ${panneau} : des choix à lire ${JSON.stringify(lignes.map(({ carte }) => carte))}`);
        for (const { carte, deborde, aGauche, aDroite, ecartADroite, surLeTitre, choix } of lignes) {
          const nom = `${langue}, ${carte}`;
          assert.ok(deborde <= 0, `${nom} : les choix débordent de ${deborde} px`);
          assert.ok(aGauche >= -0.5 && aDroite >= -0.5, `${nom} : les choix sortent de leur cadre (${aGauche}, ${aDroite})`);
          assert.ok(Math.abs(ecartADroite) <= 1, `${nom} : le dernier choix est à ${ecartADroite} px du bord droit`);
          assert.ok(surLeTitre !== true, `${nom} : les choix chevauchent le titre`);
          assert.ok(choix.every((boite, rang) => rang === 0 || boite.left >= choix[rang - 1].right - 0.5 || boite.top >= choix[rang - 1].bottom - 0.5), `${nom} : deux choix se chevauchent`);
        }
        // « Vue » et « Afficher » ne tiennent pas à côté du titre de l'Interface de test, la dernière carte : ils passent dessous.
        if (panneau === '#panneau-creation') assert.equal(lignes.at(-1).sousLeTitre, true, `${langue} : les choix de l’Interface de test passent sous le titre`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${langue}, ${panneau} : la page défile à l’horizontale`);
      }
    } finally {
      await page.close();
    }
  }
});

test('[UI-23] page défilée de quelques pixels, puis la ligne du titre collée, la liste du sélecteur et celle du menu « … » passent au-dessus de la ligne du titre', async () => {
  /** Le centre du recouvrement d'une liste et d'un élément de la ligne du titre, et la liste y reçoit-elle le pointeur ; `null` sans recouvrement. */
  const recouvrement = (page, liste, ligne) => page.evaluate(({ liste: selecteurDeLaListe, ligne: selecteurDeLaLigne }) => {
    const element = document.querySelector(selecteurDeLaListe);
    const a = element.getBoundingClientRect();
    const b = document.querySelector(selecteurDeLaLigne).getBoundingClientRect();
    const gauche = Math.max(a.left, b.left);
    const droite = Math.min(a.right, b.right);
    const haut = Math.max(a.top, b.top);
    const bas = Math.min(a.bottom, b.bottom);
    if (droite <= gauche || bas <= haut) return null;
    return { recu: element.contains(document.elementFromPoint((gauche + droite) / 2, (haut + bas) / 2)) };
  }, { liste, ligne });
  // Quelques pixels : la ligne du titre est encore dans le flux. Vingt pixels après sa position naturelle : elle est collée.
  for (const defilement of ['quelques pixels', 'ligne collée']) {
    for (const liste of ['selecteur', 'menu']) {
      const page = await ouvrirSur('alertes-seules', MINIMALE);
      const nom = `${defilement}, ${liste}`;
      try {
        await deplierLaCarte(page, 'Interface de test');
        await page.evaluate((collee) => {
          const naturel = document.querySelector('#panneau-creation .tete-de-la-palette').getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, collee ? naturel + 20 : 20);
        }, defilement === 'ligne collée');
        if (defilement === 'ligne collée') assert.ok(Math.abs(await hautDuTitre(page)) <= 0.5, `${nom} : la ligne du titre est collée en haut`);
        // Un clic de Playwright défilerait la page jusqu'au bouton : le clic part du document.
        if (liste === 'selecteur') await page.locator('.selecteur-bouton').evaluate((bouton) => bouton.click());
        else await page.getByRole('button', { name: 'Actions sur la palette' }).evaluate((bouton) => bouton.click());
        const [selecteurDeLaListe, cible] = liste === 'selecteur'
          ? ['.barre-de-palette .selecteur-liste', '#panneau-creation .tete-de-la-palette .titre-de-premier-rang']
          : ['.menu-liste', '#panneau-creation .tete-de-la-palette .bascule'];
        await page.locator(selecteurDeLaListe).waitFor();
        const recouvre = await recouvrement(page, selecteurDeLaListe, cible);
        assert.ok(recouvre, `${nom} : la liste recouvre la ligne du titre, le test porte sur un recouvrement`);
        assert.equal(recouvre.recu, true, `${nom} : au point où la liste recouvre la ligne du titre, la liste reçoit le pointeur`);
      } finally {
        await page.close();
      }
    }
  }
});

test('l’en-tête de l’aperçu et celui de la carte des garanties n’ont aucun bouton de thème', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const sansBoutonDeTheme = async (carte) => {
      const enTete = carte.locator('.carte-tete');
      assert.equal(await enTete.isVisible(), true);
      assert.equal(await enTete.locator('.bascule, .bascule-option').count(), 0);
      assert.equal(await enTete.getByRole('button', { name: /^Thème (Light|Dark)$/ }).count(), 0);
    };
    await sansBoutonDeTheme(page.locator('[aria-label="Aperçu"]'));
    await ouvrirLaVerification(page);
    await sansBoutonDeTheme(carteDesGaranties(page));
  } finally {
    await page.close();
  }
});

test('changer de thème n’envoie aucune demande au sandbox', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const avant = await demandes(page);
    await choisirLeTheme(page, 'Dark');
    await choisirLeTheme(page, 'Light');
    assert.deepEqual(await demandes(page), avant);
  } finally {
    await page.close();
  }
});

test('[VER-20] le lien vers l’autre thème change le thème de la barre sans quitter Vérification, et « Revenir au thème » le rend', async () => {
  const page = await ouvrirSur('garantie-en-echec');
  try {
    await choisirLeTheme(page, 'Dark');
    await ouvrirLaVerification(page);
    const autre = carteDesGaranties(page).locator('.autre-theme');
    assert.deepEqual(await themesDuTitre(page), themesPresses(false));
    await autre.getByRole('button', { name: 'Voir le thème Light' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Vérification', exact: true }).getAttribute('aria-selected'), 'true');
    assert.deepEqual(await themesDuTitre(page), themesPresses(true));
    await autre.getByRole('button', { name: 'Revenir au thème Dark' }).click();
    assert.deepEqual(await themesDuTitre(page), themesPresses(false));
    assert.equal(await page.getByRole('tab', { name: 'Vérification', exact: true }).getAttribute('aria-selected'), 'true');
  } finally {
    await page.close();
  }
});

test('« Modifier » d’une fiche de Gestion en Dark ouvre Création en Dark, et la barre le montre', async () => {
  const page = await ouvrir(MINIMALE);
  try {
    await envoyer(page, messageDe('gestion-liste'));
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    await page.locator('#panneau-gestion [data-bascule="theme"]').getByRole('button', { name: 'Thème Dark', exact: true }).click();
    const bleu = page.locator('#panneau-gestion .palette-depliable[data-palette]').first();
    await bleu.locator('.mini-rampe').click();
    await bleu.locator('[data-geste="modifier"]').click();
    assert.equal(await page.getByRole('tab', { name: 'Création', exact: true }).getAttribute('aria-selected'), 'true');
    assert.deepEqual(await themesDuTitre(page), themesPresses(false));
    assert.equal(await page.locator('.nuancier-surface').evaluate((surface) => getComputedStyle(surface).backgroundColor), 'rgb(18, 18, 18)');
  } finally {
    await page.close();
  }
});

test('[ENT-02] une référence saisie recalcule l’aperçu et la dérive sans passer par le sandbox', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    const avant = await page.locator('[aria-label^="Profil Vivid, nuance 700,"]').getAttribute('aria-label');
    // #FACC15 est le 300 de vivid en Light, #1E6FD9 son 600 : le pivot de la dérive change de colonne.
    assert.equal(await colonneDuPivot(page), 3);
    await page.locator('#panneau-creation .champ-hexa').fill('#1E6FD9');
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
    assert.deepEqual(await page.locator('.selecteur-option-nom').allTextContents(), ['Jaune', 'Bleu']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await page.getByRole('listbox').isVisible(), false);
    assert.equal(await page.locator('#panneau-creation .champ-hexa').inputValue(), '#1E6FD9');
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

test('[UI-34] les nouveaux constats de Gestion restent lisibles aux deux tailles et aux deux thèmes', async () => {
  for (const largeur of [500, 600]) {
    for (const theme of ['clair', 'sombre']) {
      for (const id of ['reprise-partielle', 'ancienne-sortie-des-tokens', 'lecture-des-variables-refusee']) {
        const page = await navigateur.newPage({ viewport: { width: largeur, height: largeur === 500 ? 520 : 720 } });
        try {
          const galerie = largeur === 500 ? 'galerie-minimale' : 'galerie';
          await page.goto(new URL(`../../dist/${galerie}/${theme}/${id}.html`, import.meta.url).href);
          await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${id}, ${theme}, ${largeur}`);
          await page.screenshot({ path: fileURLToPath(new URL(`../../dist/revue-tokens-${id}-${theme}-${largeur}.png`, import.meta.url)), fullPage: true });
        } finally { await page.close(); }
      }
    }
  }
});

test('le banc de galerie joue un clic : le détail de la nuance choisie s’affiche', async () => {
  const page = await pageDeGalerie('palette-en-saisie');
  try {
    assert.equal(await page.locator('.nuancier-detail .detail-titre').textContent(), 'Vivid · 700');
    assert.equal(await page.locator('#panneau-creation .champ-hexa').inputValue(), '#7C3AED');
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
    // Un fichier sans palette montre l'encart d'appel : « Nouvelle palette » le remplace par la carte de création ([UI-22]).
    await page.locator('#panneau-creation .appel').getByRole('button', { name: 'Nouvelle palette' }).click();
    await page.locator('.champ-creation').fill('#1E6FD9');
    await page.getByRole('button', { name: 'Créer la palette', exact: true }).click();
    const demande = await prochaine(page, avant);
    assert.equal(demande.type, 'ranger-recette');
    assert.equal(demande.empreinteLue, null);
    assert.equal(demande.recette.palettes.length, 1);
    assert.match(demande.recette.palettes[0].id, /^p-[0-9a-f]{8}$/);
    // Un enregistrement réussi ne s'annonce pas : la ligne du titre ne porte que « Palette [nom] ».
    await envoyer(page, rangee(demande.demande));
    assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette #1E6FD9');
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
    await page.locator('#panneau-creation .champ-hexa').fill('#FACZ15');
    assert.equal(await page.locator('#panneau-creation .champ-hexa').getAttribute('aria-invalid'), 'true');
    assert.match(await carteDeLOnglet(page, 'Configuration de la palette').locator('.field-error:visible').textContent(), /code hexadécimal invalide/);
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
    for (const locator of [page.getByRole('button', { name: 'Actions sur la palette' }), page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang'), page.getByRole('textbox', { name: 'Nom de la palette' })]) {
      const boite = await locator.boundingBox();
      assert.ok(boite.x + boite.width <= largeur, JSON.stringify(boite));
    }
    assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').evaluate((element) => element.scrollWidth > element.clientWidth), true, 'le nom long se coupe');
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
    const titre = page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang');
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
    assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette Menthe');
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

/**
 * Ce qu'un en-tête de carte montre de son intitulé : le glyphe, le titre et le sous-titre. Les mesures qui se comparent
 * d'une carte à l'autre : taille du glyphe, typographie du titre et du sous-titre, retrait du titre et du sous-titre
 * depuis le bord gauche du glyphe, et écart vertical entre le centre du glyphe et celui de l'intitulé.
 */
const intituleDeLEnTete = (carte) => carte.evaluate((element) => {
  const [glyphe, titre, sousTitre, intitule] = ['.glyphe', '.carte-titre', '.carte-sous-titre', '.carte-intitule'].map((selecteur) => element.querySelector(`.carte-tete ${selecteur}`));
  const [boiteDuGlyphe, boiteDeLIntitule] = [glyphe, intitule].map((noeud) => noeud.getBoundingClientRect());
  const typographie = (noeud) => JSON.stringify(['fontSize', 'fontWeight', 'lineHeight', 'color'].map((propriete) => getComputedStyle(noeud)[propriete]));
  return {
    glyphe: [boiteDuGlyphe.width, boiteDuGlyphe.height],
    titre: titre.textContent,
    sousTitre: sousTitre.textContent,
    typographieDuTitre: typographie(titre),
    typographieDuSousTitre: typographie(sousTitre),
    retraits: [titre, sousTitre].map((noeud) => noeud.getBoundingClientRect().left - boiteDuGlyphe.left),
    ecartDeCentre: Math.abs(boiteDuGlyphe.top + boiteDuGlyphe.height / 2 - (boiteDeLIntitule.top + boiteDeLIntitule.height / 2)),
    sousLeTitre: sousTitre.getBoundingClientRect().top >= titre.getBoundingClientRect().bottom - 0.5,
  };
});

test('[UI-04] la carte d’aperçu a un titre : glyphe, titre « Aperçu » et sous-titre, à la même place et dans la même typographie que le Réglage global ; la carte reste fixe, le fond du thème à droite de l’en-tête, la référence sous la surface', async () => {
  for (const [langue, attendu] of [['fr', { titre: 'Aperçu', sousTitre: 'Les nuances sur le fond de la page' }], ['en', { titre: 'Preview', sousTitre: 'The shades on the page background' }]]) {
    const page = await ouvrirSurEn('alertes-seules', PAR_DEFAUT, langue);
    try {
      const carte = page.locator(`#panneau-creation .carte[aria-label="${attendu.titre}"]`);
      const apercu = await intituleDeLEnTete(carte);
      assert.equal(apercu.titre, attendu.titre, langue);
      assert.equal(apercu.sousTitre, attendu.sousTitre, langue);
      assert.equal(await carte.locator('.carte-tete > .glyphe[data-glyphe="apercu"]').count(), 1, `${langue} : le glyphe de l’aperçu est dans l’en-tête`);
      assert.equal(apercu.sousLeTitre, true, `${langue} : le sous-titre est sous le titre`);

      const reglage = await intituleDeLEnTete(page.locator(`#panneau-creation .carte[aria-label="${langue === 'fr' ? 'Réglage global' : 'Global adjustment'}"]`));
      for (const cle of ['glyphe', 'typographieDuTitre', 'typographieDuSousTitre']) assert.deepEqual(apercu[cle], reglage[cle], `${langue} : ${cle} diffère du Réglage global`);
      // Le titre et le sous-titre partent du même retrait depuis le glyphe, à 1 px près ; le chevron du Réglage global précède son glyphe.
      apercu.retraits.forEach((retrait, rang) => assert.ok(Math.abs(retrait - reglage.retraits[rang]) <= 1, `${langue} : retrait ${rang} à ${retrait} px du glyphe, ${reglage.retraits[rang]} px dans le Réglage global`));
      assert.ok(apercu.ecartDeCentre <= 1 && reglage.ecartDeCentre <= 1, `${langue} : le glyphe est centré sur l’intitulé (${apercu.ecartDeCentre}, ${reglage.ecartDeCentre})`);

      // La carte reste fixe : ni bouton de repli, ni chevron, corps toujours ouvert.
      assert.equal(await carte.locator('.carte-bascule, .carte-chevron').count(), 0, `${langue} : l’en-tête n’est pas un bouton`);
      assert.equal(await carte.getAttribute('data-ouverte'), 'true', langue);
      assert.equal(await carte.locator('.carte-corps').isVisible(), true, langue);
      const fond = await carte.locator('.pastille-du-fond').boundingBox();
      const tete = await carte.locator('.carte-tete').boundingBox();
      const intitule = await carte.locator('.carte-intitule').boundingBox();
      assert.ok(fond.x > tete.x + tete.width / 2, `${langue} : le fond est dans la moitié droite de l’en-tête`);
      assert.ok(fond.x >= intitule.x + intitule.width - 0.5, `${langue} : le fond est à droite de l’intitulé`);
      const ordre = await carte.locator('.nuancier-surface, .repere-de-la-reference').evaluateAll((elements) => elements.map((element) => element.className));
      assert.deepEqual(ordre, ['nuancier-surface', 'repere-de-la-reference'], langue);
    } finally {
      await page.close();
    }
  }
});

/** Le résumé de la carte de configuration, caché ou non, avec l'état de la carte et celui de son bouton. */
const etatDeLaConfiguration = (page) => page.evaluate(() => {
  const carte = document.querySelector('#panneau-creation .carte[aria-label="Configuration de la palette"]');
  const resume = carte.querySelector('.carte-bascule .carte-resume');
  const bouton = carte.querySelector('.carte-bascule');
  return {
    ouverte: carte.dataset.ouverte,
    etendu: bouton.getAttribute('aria-expanded'),
    corpsVisible: carte.querySelector('.carte-corps').getClientRects().length > 0,
    resumeVisible: resume.getClientRects().length > 0,
    resume: resume.textContent,
    focusSurLeBouton: document.activeElement === bouton,
  };
});
test('[UI-11] la carte « Configuration de la palette » est repliable et ouverte à l’ouverture du plugin ; ouverte, elle cache son résumé et montre ses champs ; un clic la replie, et le résumé reprend nom, référence, modèle et intensités', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const depart = await etatDeLaConfiguration(page);
    assert.deepEqual([depart.ouverte, depart.etendu, depart.corpsVisible, depart.resumeVisible], ['true', 'true', true, false], 'ouverte au départ, sans résumé');
    assert.equal(await page.getByRole('textbox', { name: 'Nom de la palette' }).isVisible(), true);
    await bascule(page, 'Configuration de la palette').click();
    const repliee = await etatDeLaConfiguration(page);
    assert.deepEqual([repliee.ouverte, repliee.etendu, repliee.corpsVisible, repliee.resumeVisible], ['false', 'false', false, true], 'repliée, son résumé se lit');
    assert.equal(repliee.resume, 'Jaune · #FACC15 · Standard · Deux intensités');
    assert.equal(await page.getByRole('textbox', { name: 'Nom de la palette' }).isVisible(), false);
    await bascule(page, 'Configuration de la palette').click();
    assert.deepEqual(await etatDeLaConfiguration(page), { ...depart, focusSurLeBouton: true, resume: repliee.resume }, 'un second clic la déplie');
  } finally {
    await page.close();
  }
});

test('[UI-11] « Nouvelle palette » replie la carte de configuration de la palette créée : son résumé la nomme, le focus reste sur le bouton de repli, un clic déplie', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    assert.equal((await etatDeLaConfiguration(page)).ouverte, 'true');
    await page.getByRole('button', { name: 'Nouvelle palette', exact: true }).click();
    await page.locator('.champ-creation').fill('#16A34A');
    const creation = page.locator('[aria-label="Nouvelle palette"]');
    await creation.getByRole('textbox', { name: 'Nom de la palette' }).fill('Menthe');
    await creation.getByRole('radio', { name: /^Deux intensités/ }).click();
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Créer la palette' }).click();
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    await envoyer(page, rangee(rangement.demande));
    assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette Menthe');
    const creee = await etatDeLaConfiguration(page);
    assert.deepEqual([creee.ouverte, creee.corpsVisible, creee.resumeVisible, creee.focusSurLeBouton], ['false', false, true, true]);
    assert.equal(creee.resume, 'Menthe · #16A34A · Standard · Deux intensités');
    await bascule(page, 'Configuration de la palette').click();
    assert.equal(await page.getByRole('textbox', { name: 'Nom de la palette' }).inputValue(), 'Menthe');
    assert.equal((await etatDeLaConfiguration(page)).ouverte, 'true');

    // Sans nom, le résumé n’écrit la référence qu’une fois ; à une intensité, il le dit.
    await page.getByRole('button', { name: 'Nouvelle palette', exact: true }).click();
    await page.locator('.champ-creation').fill('#DC2626');
    const suivante = await compte(page);
    await page.getByRole('button', { name: 'Créer la palette' }).click();
    assert.equal((await prochaine(page, suivante)).type, 'ranger-recette');
    const sansNom = await etatDeLaConfiguration(page);
    assert.deepEqual([sansNom.ouverte, sansNom.resume], ['false', '#DC2626 · Standard · Une intensité']);
  } finally {
    await page.close();
  }
});

test('[UI-11] [UI-22] l’invitation d’un fichier sans palette crée la première palette et replie sa carte de configuration', async () => {
  const page = await ouvrir();
  try {
    await envoyer(page, messageDe('premier-lancement'));
    await page.locator('#panneau-creation .appel').getByRole('button', { name: 'Nouvelle palette' }).click();
    await page.locator('.champ-creation').fill('#1E6FD9');
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Créer la palette', exact: true }).click();
    assert.equal((await prochaine(page, avant)).type, 'ranger-recette');
    const creee = await etatDeLaConfiguration(page);
    assert.deepEqual([creee.ouverte, creee.corpsVisible, creee.resumeVisible, creee.resume], ['false', false, true, '#1E6FD9 · Standard · Une intensité']);
  } finally {
    await page.close();
  }
});

test('[UI-11] ouvrir une autre palette ou changer d’onglet ne change pas l’état de la carte de configuration, repliée ou dépliée', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const autrePalette = async (nom) => {
      await page.locator('.selecteur-bouton').click();
      await page.getByRole('option', { name: nom }).click();
      assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').textContent(), `Palette ${nom}`);
    };
    const faireLeTour = async () => {
      await ouvrirLaVerification(page);
      await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
      await ouvrirLaCreation(page);
    };
    // « Modifier » d'une fiche de Gestion ouvre la palette de la fiche, sans toucher à la carte.
    const modifierDepuisGestion = async (nom) => {
      await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
      const fiche = page.locator('#panneau-gestion .palette-depliable[data-palette]').filter({ hasText: nom }).first();
      await fiche.locator('.mini-rampe').click();
      await fiche.locator('[data-geste="modifier"]').click();
      assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').textContent(), `Palette ${nom}`);
    };
    // Dépliée : elle le reste.
    await autrePalette('Bleu');
    await faireLeTour();
    await modifierDepuisGestion('Jaune');
    assert.equal((await etatDeLaConfiguration(page)).ouverte, 'true', 'dépliée, elle reste dépliée');
    // Repliée : elle le reste, et son résumé suit la palette ouverte.
    await bascule(page, 'Configuration de la palette').click();
    await autrePalette('Jaune');
    const apres = await etatDeLaConfiguration(page);
    assert.deepEqual([apres.ouverte, apres.resume], ['false', 'Jaune · #FACC15 · Standard · Deux intensités']);
    await faireLeTour();
    await modifierDepuisGestion('Bleu');
    assert.deepEqual([(await etatDeLaConfiguration(page)).ouverte, (await etatDeLaConfiguration(page)).resume], ['false', 'Bleu · #1E6FD9 · Standard · Deux intensités'], 'repliée, elle reste repliée');
  } finally {
    await page.close();
  }
});

test('[UI-11] [VER-15] un message de Vérification qui mène à la référence déplie la carte de configuration repliée, focalise le code ; « Ajuster la référence » la déplie et ouvre la modale', async () => {
  const page = await ouvrir();
  try {
    const lu = structuredClone(messageDe('alertes-seules'));
    // Une copie de Jaune à une nuance près : l’alerte « palettes proches » mène à la couleur de référence.
    lu.classement.recette.palettes.push({ ...lu.classement.recette.palettes[0], id: 'p-0cc0ffee', nom: 'Jaune bis', reference: '#FACC16' });
    await envoyer(page, lu);
    await ouvrirLaPremierePalette(page);
    await bascule(page, 'Configuration de la palette').click();
    assert.equal((await etatDeLaConfiguration(page)).ouverte, 'false');
    await ouvrirLaVerification(page);
    await page.locator('.messages-de-la-verification').getByRole('button', { name: 'Changer la couleur de référence' }).first().click();
    assert.equal(await page.locator('#onglet-creation').getAttribute('aria-selected'), 'true', 'le lien ramène à Création');
    assert.equal((await etatDeLaConfiguration(page)).ouverte, 'true', 'la carte est dépliée');
    assert.equal(await page.evaluate(() => document.activeElement.matches('#panneau-creation .carte[aria-label="Configuration de la palette"] .champ-hexa')), true, 'le code de référence a le focus');
  } finally {
    await page.close();
  }
  const ajustee = await ouvrirSur('garantie-en-echec');
  try {
    await bascule(ajustee, 'Configuration de la palette').click();
    assert.equal((await etatDeLaConfiguration(ajustee)).ouverte, 'false');
    await ouvrirLaVerification(ajustee);
    await carteDesGaranties(ajustee).getByRole('button', { name: 'Ajuster la référence' }).first().click();
    assert.equal(await ajustee.getByRole('dialog', { name: 'Ajuster la référence' }).isVisible(), true);
    assert.equal((await etatDeLaConfiguration(ajustee)).ouverte, 'true', 'la carte est dépliée derrière la modale');
    await ajustee.keyboard.press('Escape');
    assert.equal(await lienDAjustement(ajustee).evaluate((element) => element === document.activeElement), true, 'le focus revient au lien, visible');
  } finally {
    await ajustee.close();
  }
});

test('[UI-04] W4.1 la pastille du fond ouvre le sélecteur en Hex avec la mention du fond commun ; une frappe prévisualise, Entrée range, et les Réglages communs le montrent', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: 'Modifier le fond de la page, thème Light, actuellement #F7F7F7' }).click();
    // L'étiquette suit la valeur : la pastille se retrouve ensuite par sa classe.
    const pastille = page.locator('.pastille-du-fond');
    const selecteur = page.getByRole('dialog', { name: 'Fond de la page, thème Light' });
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
    assert.equal(await page.getByRole('button', { name: 'Modifier le fond de la page, thème Light, actuellement #FFD84D' }).count(), 1);

    await page.keyboard.press('Escape');
    assert.equal(await selecteur.isVisible(), false);
    assert.equal(await pastille.evaluate((bouton) => bouton === document.activeElement), true, 'Échap rend le focus à la pastille');
    assert.equal(await pastille.getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    assert.equal(await page.locator('.champ-hexa[aria-label="Fond de la page, thème Light"]').inputValue(), '#FFD84D');
  } finally {
    await page.close();
  }
});

test('W4.1 un glisser dans la zone prévisualise sans ranger, et le relâcher range une seule fois', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await page.getByRole('button', { name: /^Modifier le fond de la page, thème Light/ }).click();
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
    await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').click();
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
    for (const [titre, lignes] of [['Contrastes minimums', 2], ['Détection des couleurs proches', 2]]) {
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
    // La carte des garanties vit dans Vérification : une palette libre l'en retire.
    await page.getByRole('tab', { name: 'Vérification', exact: true }).click();
    assert.equal(await carteDesGaranties(page).isVisible(), false);
    await ouvrirLaCreation(page);
    assert.equal(await page.locator('.pastille-on-solid').isVisible(), false);
    assert.equal(await page.locator('.bandes').isVisible(), false);

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
    assert.equal(await page.locator('.nuancier-numero').count(), 11);
    await ouvrirLaVerification(page);
    assert.equal(await carteDesGaranties(page).isVisible(), true);
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
    // La 700 porte page/foreground contre la nuance la plus claire, et solid/default contre le texte des boutons : deux constats par profil.
    const constats = reglage(page, 'Luminosité des nuances').locator('.constat-alerte');
    assert.equal(await constats.count(), 4);
    assert.equal(await constats.filter({ hasText: '(solid/default)' }).count(), 2);
    assert.equal(await constats.filter({ hasText: '(page/foreground)' }).count(), 2);
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
    await page.getByRole('button', { name: 'Retour aux palettes' }).click();
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
    assert.match(await reglage(page, 'Luminosité des nuances').locator('.field-error').textContent(), /plus basse que la nuance précédente/);
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
    for (const titre of ['Contrastes minimums', 'Détection des couleurs proches']) {
      assert.equal(await reglage(page, titre).getAttribute('data-ouverte'), 'false');
      await reglage(page, titre).locator('> .carte-tete > .carte-bascule').click();
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
    const fond = page.getByRole('textbox', { name: 'Fond de la page, thème Dark' });
    assert.equal(await fond.inputValue(), '#121212');
    const avant = await compte(page);
    await fond.fill('#1c1c1c');
    await fond.press('Tab');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.fonds, { light: '#F7F7F7', dark: '#1C1C1C' });
    await envoyer(page, rangee(rangement.demande));

    await fond.fill('#12');
    await fond.press('Tab');
    assert.equal(await reglage(page, 'Couleurs de fond').locator('.field-error:visible').textContent(), '« #12 » : code hexadécimal invalide. Exemple : #1E6FD9.');
    assert.equal(await compte(page), avant + 1, 'une couleur refusée ne se range pas');

    await reglage(page, 'Contrastes minimums').locator('> .carte-tete > .carte-bascule').click();
    const texte = page.getByRole('textbox', { name: 'Texte', exact: true });
    await texte.fill('7');
    await texte.press('Tab');
    assert.equal((await prochaine(page, avant + 1)).recette.seuils.texte, 7);
  } finally {
    await page.close();
  }
});

const deplier = (page) => deplierLaCarte(page, CARTE_DE_LA_DERIVE);

test('[DER-01] le bouton de la dérive déplie le graphe : une ligne, le pivot, deux poignées, onze colonnes alignées', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    assert.equal(await page.locator('.derive-graphe').isVisible(), false, 'replié par défaut (E22)');
    await deplier(page);
    assert.equal(await page.locator('.derive-trait').count(), 1);
    assert.equal(await page.locator('.derive-pivot').count(), 1);
    assert.equal(await page.locator('.derive-poignee').count(), 2);
    // [DER-04] : la rampe sans Color shift puis la rampe avec, sur les mêmes colonnes.
    const colonnes = await page.evaluate(() => {
      const cases = [...document.querySelectorAll('.derive-graphe .derive-cran')];
      return cases.map((rect) => [rect.dataset.rampe, Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2]);
    });
    assert.equal(colonnes.length, 22, 'onze crans sans Color shift, onze avec');
    for (let rang = 0; rang < 11; rang += 1) {
      assert.deepEqual([colonnes[2 * rang][0], colonnes[2 * rang + 1][0]], ['sans', 'avec']);
      assert.ok(Math.abs(colonnes[2 * rang][1] - colonnes[2 * rang + 1][1]) < 1e-6);
    }
    assert.equal(await bascule(page, CARTE_DE_LA_DERIVE).getAttribute('aria-expanded'), 'true');
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
    assert.match(await page.locator('.note-du-color-shift').textContent(), /Aucune nuance plus sombre que la référence/);
  } finally {
    await page.close();
  }
});

/** Le rang de la colonne où le pivot tombe, lu sur les cases de la rampe sous le graphe. */
async function colonneDuPivot(page) {
  return page.evaluate(() => {
    const x = Number(/^M ([\d.]+)/.exec(document.querySelector('.derive-pivot').getAttribute('d'))[1]);
    const cases = [...document.querySelectorAll('.derive-graphe .derive-cran[data-rampe="avec"]')];
    return cases.findIndex((rect) => Math.abs(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2 - x) < 1e-6);
  });
}

test('[DER-04] synchronisés, les profils montrent le porteur : la rampe de Soft et sa référence exacte', async () => {
  const page = await ouvrirSur('reference-soft');
  try {
    await deplier(page);
    assert.equal(await page.locator('.repere-de-la-reference').textContent(), '◆ Référence : Soft · nuance 400');
    assert.equal(await colonneDuPivot(page), 4);
    const rampe = await page.evaluate(() => [...document.querySelectorAll('.derive-graphe .derive-cran[data-rampe="avec"]')].map((rect) => rect.getAttribute('fill')));
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

test('[DER-15] une palette grise ne règle que sa luminosité : Teinte et Saturation se désactivent ; une palette très désaturée garde les trois', async () => {
  for (const [id, grise] of [['palette-grise', true], ['palette-tres-desaturee', false]]) {
    const page = await ouvrirSur(id);
    try {
      assert.equal(await bascule(page, CARTE_DE_LA_DERIVE).isDisabled(), false, id);
      await deplier(page);
      const onglets = carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getByRole('tab');
      assert.deepEqual(await onglets.evaluateAll((liste) => liste.map((onglet) => onglet.disabled)), [grise, grise, false], id);
      if (grise) {
        assert.equal(await carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getByRole('tab', { selected: true }).locator('.onglet-de-grandeur-nom').textContent(), 'Luminosité');
        assert.equal(await page.locator('.note-du-color-shift').textContent(), 'Palette grise : seule la luminosité se règle.');
      }
    } finally {
      await page.close();
    }
  }
});

test('[VER-08] Q4 : un presque noir donne des rampes grises, sans point à vérifier ni note de poignée masquée', async () => {
  const page = await ouvrirSur('presque-noir');
  try {
    assert.equal(await page.locator('#panneau-creation .constat-alerte').count(), 0);
    assert.equal(await page.locator('#panneau-creation .constat-notice').count(), 0);
    await deplier(page);
    // Gris pur et plus sombre que le bout sombre : la note de la palette grise passe avant celle de [DER-14].
    assert.match(await page.locator('.note-du-color-shift').textContent(), /^Palette grise/);
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
    assert.match(await poignee(page, 'sombre').getAttribute('aria-valuetext'), /^Décalage de −90,0°, teinte obtenue : \d+°\. Plage sûre de −90,0° à \+90,0°$/);
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
    const champ = page.locator('.editeur-derive .reglette').first().locator('.champ-nombre');
    let avant = await compte(page);
    await champ.fill('12,5');
    await champ.press('Tab');
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, 12.5);
    assert.equal(Number(await poignee(page, 'clair').getAttribute('aria-valuenow')), 12.5, 'le graphe suit le champ');
    avant = await compte(page);
    await page.locator('.editeur-derive .reglette').first().locator('.reglette-curseur').focus();
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
    await page.getByRole('combobox', { name: 'Préréglage de la teinte' }).selectOption('constante');
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
    await page.getByRole('checkbox', { name: 'Synchroniser Soft et Vivid' }).click();
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
    await page.getByRole('checkbox', { name: 'Synchroniser Soft et Vivid' }).click();
    assert.equal(await page.locator('.editeur-derive .confirmation').isVisible(), true);
    assert.equal(await compte(page), avant, 'relier attend la confirmation');
    await page.getByRole('button', { name: 'Aligner', exact: true }).click();
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
    const champ = page.locator('.editeur-derive .reglette').first().locator('.champ-nombre');
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
  await ouvrirLaPlanche(page);
  await page.locator(`#panneau-gestion .palette-depliable[data-palette="${palette}"] [data-geste="generer"]`).click();
}

test('[PLA-24] [UI-05] « Créer la planche » d’une fiche envoie sa palette, dit la progression, rend les onglets inertes, puis montre l’état du cadre relu', async () => {
  const page = await ouvrirSur('dessin-en-cours');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const demande = await dessinEnvoye(page, 1);
    // La génération n'a pas d'option : la grille des contrastes est toujours dessinée.
    assert.deepEqual(demande, { type: 'dessiner', demande: demande.demande, palettes: [ID_DU_BLEU], empreinteLue: messageDe('dessin-en-cours').empreinte, etrangersConfirmes: [] });
    assert.equal(await page.locator('#panneau-creation').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.locator('#panneau-gestion').evaluate((panneau) => panneau.inert), true);
    assert.equal(await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).isDisabled(), false);
    await envoyer(page, { type: 'progression', demande: demande.demande, fait: 0, total: 1, nom: 'Bleu' });
    assert.equal(await page.locator('#panneau-gestion [role="status"]').first().textContent(), 'Génération de « Bleu »…');

    const cadres = [{ palette: ID_DU_BLEU, cadre: '12:34' }];
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await page.locator('#panneau-gestion').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('#panneau-gestion [data-geste="tout-mettre-a-jour"]').count(), 0);
    assert.equal(await page.locator('#panneau-gestion .constat').count(), 0, 'aucun message de succès empilé');
    // Un dessin fini a posé des cadres : l'état se relit, et la fiche dit l'état du cadre.
    const relecture = await prochaineDuType(page, 'lire-etat', avant);
    await envoyer(page, { ...ETATS.find(({ id }) => id === 'generation-reussie').atteinte.findLast((etape) => etape.message?.type === 'etat').message, demande: relecture.demande });
    const fiche = page.locator(`.palette-depliable[data-palette="${ID_DU_BLEU}"]`);
    assert.equal(await pastilleDeLaPlanche(fiche).getAttribute('data-etat'), 'a-jour');
    assert.deepEqual(await gestesDeLaPlanche(fiche), [['Afficher']], 'un cadre à jour n’a pas de premier geste');
    const vu = await compte(page);
    await fiche.getByRole('button', { name: 'Afficher', exact: true }).click();
    assert.deepEqual(await prochaine(page, vu), { type: 'voir-sur-la-planche', demande: relecture.demande + 1, page: '40:1', cadres: ['40:2'] });
  } finally {
    await page.close();
  }
});

test('[UI-28] 7 palettes gardent leurs gestes individuels sans mise à jour globale', async () => {
  const page = await ouvrir();
  try {
    const lu = structuredClone(messageDe('sept-palettes'));
    lu.classement.recette.palettes = lu.classement.recette.palettes.slice(0, 7);
    await envoyer(page, lu);
    await ouvrirLaPlanche(page);
    assert.equal(await page.locator('.palette-depliable[data-palette]').count(), 7);
    assert.equal(await page.locator('.palette-depliable[data-palette] [data-geste="generer"]').count(), 7);
    assert.equal(await page.locator('[data-geste="tout-mettre-a-jour"]').count(), 0);
  } finally { await page.close(); }
});

test('[UI-05] une fiche à jour n’a pas de premier geste ; une modification enregistrée lui donne « Actualiser »', async () => {
  const page = await ouvrirSur('planche-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const fiche = page.locator(`.palette-depliable[data-palette="${ID_DU_BLEU}"]`);
    assert.equal(await fiche.locator('[data-geste="generer"]').count(), 0);
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    const avant = await compte(page);
    await page.locator('#panneau-creation .champ-hexa').fill('#2563EB');
    await page.locator('#panneau-creation .champ-hexa').press('Tab');
    const rangement = await prochaineDuType(page, 'ranger-recette', avant);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    const generer = fiche.locator('[data-geste="generer"]');
    assert.equal(await generer.textContent(), 'Actualiser');
    assert.equal(await generer.isDisabled(), false);
    await generer.click();
    assert.deepEqual((await dessinEnvoye(page, 1)).palettes, [ID_DU_BLEU]);
  } finally {
    await page.close();
  }
});

test('[UI-28] 6 palettes gardent leurs gestes individuels sans mise à jour globale', async () => {
  const page = await ouvrir();
  try {
    const lu = structuredClone(messageDe('sept-palettes'));
    lu.classement.recette.palettes = lu.classement.recette.palettes.slice(0, 6);
    await envoyer(page, lu);
    await ouvrirLaPlanche(page);
    assert.equal(await page.locator('.palette-depliable[data-palette]').count(), 6);
    assert.equal(await page.locator('.palette-depliable[data-palette] [data-geste="generer"]').count(), 6);
    assert.equal(await page.locator('[data-geste="tout-mettre-a-jour"]').count(), 0);
  } finally { await page.close(); }
});

test('[PLA-22] un dessin interrompu se relance à l’identique par « Réessayer »', async () => {
  const page = await ouvrirSur('dessin-interrompu');
  try {
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const premiere = await dessinEnvoye(page, 1);
    await envoyer(page, dessinDe(premiere.demande, { issue: 'interrompue', palette: ID_DU_BLEU, message: 'refus', dessines: 0 }));
    assert.equal(await page.locator('#panneau-gestion .constat-bloquant .constat-quoi').textContent(), 'La génération s’est arrêtée : aucun nouveau cadre créé.');
    assert.equal(await page.locator('#panneau-creation .constat-bloquant').count(), 0, 'le résultat ne s’affiche que dans l’onglet Palettes');
    await page.locator('#panneau-gestion').getByRole('button', { name: 'Réessayer' }).click();
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
    await page.locator('#panneau-gestion .constat-bloquant').getByRole('button', { name: 'Recharger les palettes' }).click();
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
    await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
    assert.equal(await page.locator('#panneau-gestion .gestes-globaux').isVisible(), false);
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
    await page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
    assert.equal(await page.locator('#panneau-gestion').evaluate((panneau) => panneau.inert), true);
    await envoyer(page, { type: 'rangement', demande: rangement.demande, issue: { issue: 'modifiee-ailleurs' } });
    assert.equal(await page.locator('#panneau-gestion').evaluate((panneau) => panneau.inert), false);
    assert.equal(await page.locator('#panneau-creation').evaluate((panneau) => panneau.inert), false);
    assert.deepEqual((await demandes(page)).slice(avant).map((demande) => demande.type), ['ranger-recette']);
  } finally {
    await page.close();
  }
});

const ID_DU_JAUNE = 'p-08b7d4a0';
/** Ouvre Gestion et déplie chaque palette du plugin restée repliée ([UI-27]) : les tests y lisent les fiches. */
async function ouvrirLaPlanche(page) {
  await page.getByRole('tab', { name: 'Gestion', exact: true }).click();
  const repliee = page.locator('#panneau-gestion .palette-depliable[data-palette][data-ouverte="false"] [data-geste="deplier"]');
  while (await repliee.count() > 0) await repliee.first().click();
}
/** L'état de la planche de chaque fiche, lu sur la pastille de sa ligne « Planche » ([UI-26]) : `data-etat` de la fiche mêle les tokens et la planche. */
const pastilleDeLaPlanche = (fiche) => fiche.locator('.sortie[data-sortie="planche"] .pastille-d-etat');
const etatsDesLignes = (page) => pastilleDeLaPlanche(page.locator('.palette-depliable[data-palette]')).evaluateAll((pastilles) => pastilles.map((pastille) => pastille.dataset.etat));
/** Les gestes de la ligne « Planche » de chaque fiche, dans l'ordre. */
const gestesDeLaPlanche = (fiches) => fiches.evaluateAll((cartes) => cartes.map((fiche) => [...fiche.querySelectorAll('.sortie[data-sortie="planche"] .sortie-gestes button')].map((bouton) => bouton.textContent)));
const dessinsEnvoyes = async (page) => (await demandes(page)).filter((demande) => demande.type === 'dessiner');
/** Attend le `rang`-ième dessin envoyé, compté à partir de 1. */
async function dessinEnvoye(page, rang) {
  await page.waitForFunction((n) => window.demandes.filter((demande) => demande.type === 'dessiner').length >= n, rang);
  return (await dessinsEnvoyes(page))[rang - 1];
}

test('[PLA-20] l’onglet Palettes dit l’état de chaque cadre, et « Actualiser » envoie la seule palette périmée', async () => {
  const page = await ouvrirSur('planche-perimee');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour', 'perimee', 'jamais-dessinee']);
    const fiches = page.locator('.palette-depliable[data-palette]');
    // La ligne « Planche » de chaque fiche porte sa pastille d'état, un cadre jamais dessiné compris (Y2.2).
    assert.deepEqual(await pastilleDeLaPlanche(fiches).allTextContents(), ['À jour', 'À actualiser', 'Pas encore créée']);
    // Y1.9 : le geste que le cadre demande, puis « Afficher » pour un cadre localisé.
    assert.deepEqual(await gestesDeLaPlanche(fiches), [['Afficher'], ['Actualiser', 'Afficher'], ['Créer la planche']]);
    await fiches.nth(1).getByRole('button', { name: 'Actualiser', exact: true }).click();
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
    await page.getByRole('button', { name: 'Retour aux palettes' }).click();
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
    assert.equal(await page.locator('#panneau-gestion .constat-notice').count(), 0, 'plus de notice pour un cadre sans palette');
    const couleurs = await ardoise.evaluate((carte) => [getComputedStyle(carte).backgroundColor, getComputedStyle(document.querySelector('.palette-depliable[data-palette]')).backgroundColor]);
    assert.notEqual(couleurs[0], couleurs[1], 'la carte porte sa teinte d’avertissement');
    const avant = await compte(page);
    await ardoise.getByRole('button', { name: 'Afficher dans Figma' }).click();
    const demande = await prochaine(page, avant);
    assert.deepEqual({ ...demande, demande: 0 }, { type: 'voir-sur-la-planche', demande: 0, page: '40:1', cadres: ['40:4'] });
  } finally {
    await page.close();
  }
});

test('[PLA-27] « Supprimer définitivement » part sans confirmation ; la carte disparaît, le focus passe à la suivante, puis à l’en-tête des palettes du plugin', async () => {
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
    assert.equal(await page.locator('#panneau-gestion [role="status"]').textContent(), 'Cadre « Ardoise » supprimé. Ctrl+Z dans Figma le rétablit.');
    assert.equal(await carteSupprimee(page, '40:6').getByRole('button', { name: 'Afficher dans Figma' }).evaluate((bouton) => bouton === document.activeElement), true);
    assert.equal((await prochaine(page, avant)).type, 'lire-etat', 'l’état se relit');

    avant = await compte(page);
    await carteSupprimee(page, '40:6').getByRole('button', { name: 'Supprimer définitivement' }).click();
    const second = await prochaine(page, avant);
    await envoyer(page, { type: 'retrait', demande: second.demande, issue: { issue: 'deja-absent' } });
    assert.equal(await page.locator('.carte-supprimee').count(), 0);
    assert.equal(await page.locator('[data-section="plugin"] .section-bascule').evaluate((bascule) => bascule === document.activeElement), true);
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
    assert.equal(await page.locator('#panneau-gestion [role="status"] .constat-ou').textContent(), 'Cadre non supprimé : Ardoise');

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
    assert.equal(await page.locator('#panneau-gestion .constat-notice .constat-ou').textContent(), 'Copie du cadre « Bleu copie »');
  } finally {
    await page.close();
  }
});

test('E11 : un document Display P3 dit de copier l’hexa depuis la carte', async () => {
  const page = await ouvrirSur('document-display-p3');
  try {
    await ouvrirLaPlanche(page);
    assert.deepEqual(await etatsDesLignes(page), ['a-jour']);
    assert.equal(await page.locator('#panneau-gestion .constat-notice .constat-ou').textContent(), 'Fichier Figma en Display P3');
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
    const confirmation = page.locator('#panneau-gestion .confirmation', { hasText: 'La mise à jour supprimera' });
    assert.equal(await confirmation.locator('.constat-quoi').textContent(), 'La mise à jour supprimera les 2 calques que vous avez ajoutés dans ce cadre : « Note », « Flèche ».');
    assert.equal(await page.locator('#panneau-gestion').evaluate((panneau) => panneau.inert), false);
    await confirmation.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await confirmation.count(), 0);
    assert.equal((await dessinsEnvoyes(page)).length, 1, 'annuler ne dessine rien');

    await page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
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
    const zone = page.locator('#panneau-gestion');
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    await envoyer(page, dessinDe((await dessinEnvoye(page, 1)).demande, { issue: 'dessinee', page: '5:6', cadres, peints: [] }));
    assert.equal(await zone.locator('.constat').count(), 0);

    await page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_BLEU}"] [data-geste="generer"]`).click();
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
    assert.equal(await page.locator('#panneau-gestion .confirmation', { hasText: 'La mise à jour supprimera' }).count(), 1);
    await page.getByRole('tab', { name: 'Création', exact: true }).click();
    assert.doesNotMatch(await page.locator('#panneau-creation').textContent(), /La mise à jour supprimera|Remplacer le cadre/);
  } finally {
    await page.close();
  }
});

test('[ENT-09] [UI-12] la saturation d’un profil se saisit dans la carte « Teinte, saturation, luminosité », repliée sur son résumé ; Soft reste sous Vivid, et aucune ligne ne commente des saturations propres', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    const soft = page.getByRole('textbox', { name: 'Saturation de Soft' });
    assert.equal(await soft.isVisible(), false, 'la carte est repliée à l’ouverture');
    // Le résumé ne dit que l'état, sans les valeurs (recette v7).
    assert.equal(await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.carte-resume').textContent(), 'Aucun réglage');
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

    const lignes = await page.locator('.reglages-de-la-palette > .ligne-fixe:not([hidden]) .ligne-fixe-texte').allTextContents();
    assert.equal(lignes.some((ligne) => /personnalisées/.test(ligne)), false, JSON.stringify(lignes));
    assert.equal(await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.ligne-fixe .lien-de-constat', { hasText: 'Reprendre' }).count(), 0);
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
    // Une saisie dans les bornes permises prévisualise comme un glisser ; la saturation se saisit en pour cent.
    for (const [grandeur, valeur] of [['Teinte', '5'], ['Saturation', '40'], ['Luminosité', '-0,01']]) {
      const champ = page.getByRole('textbox', { name: `${grandeur} de Soft` });
      await champ.fill(valeur);
      // L'aperçu se rend à l'image suivante : un seul rendu par image pendant un glisser (Z4).
      await page.waitForFunction((a) => document.querySelector('[aria-label^="Profil Soft, nuance 50,"]').getAttribute('aria-label') !== a, avantLApercu, { timeout: 2000 });
      assert.equal(await compte(page), avant, `${grandeur} : rien ne s’enregistre pendant le geste`);
      await champ.press('Escape');
      assert.equal(await nuance.getAttribute('aria-label'), avantLApercu, `${grandeur} : Échap rend l’aperçu d’avant`);
      await champ.press('Tab');
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
    assert.equal(await reperes.evaluate((repere) => repere.closest('.reglage-de-la-palette').querySelector('.reglette-curseur').getAttribute('aria-label')), 'Saturation de Soft');
    assert.equal(await page.locator('.reglages-de-la-palette > .constats .constat').count(), 0, 'aucune notice permanente');
    assert.equal(await page.locator('.reglages-de-la-palette > .constat-detail').isVisible(), false, 'aucune notice à déplier : Vivid porte la référence à sa saturation');
    assert.equal(await page.locator('#panneau-creation .constats-titre-notice').count(), 0);
  } finally {
    await page.close();
  }
});

test('[VER-11] [UI-12] des profils confondus s’annoncent sur la carte repliée, se lisent sous ses curseurs, et mènent à la saturation de la carte', async () => {
  const page = await ouvrirSur('profils-confondus');
  try {
    assert.match(await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.carte-resume').textContent(), / · 1 point à vérifier$/);
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const message = page.locator('.reglages-de-la-palette .ligne-fixe[data-ton="avertissement"]').filter({ hasText: 'Soft et Vivid' });
    // L'alerte ne nomme que les nuances des emplois ; le repère de l'aperçu porte sur toute la liste ([PLA-15]).
    assert.match(await message.locator('.ligne-fixe-texte').textContent(), /Bleu : nuances .*Soft et Vivid sont presque identiques sur ces nuances\./);
    assert.equal((await message.boundingBox()).height, 24);
    assert.ok(await page.locator('.pastille[data-confondue="true"]').count() >= 6);
    await message.getByRole('button', { name: 'Ajuster la saturation' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Saturation de Soft');
  } finally {
    await page.close();
  }
});

test('D-G [DER-15] : une palette grise le dit sous les curseurs et n’a pas de teinte à régler ; saturer Vivid rend la teinte réglable', async () => {
  const page = await ouvrirSur('palette-grise');
  try {
    const lignes = await page.locator('.reglages-de-la-palette > .ligne-fixe:not([hidden]) .ligne-fixe-texte').allTextContents();
    assert.ok(lignes.includes('Référence grise : Soft et Vivid restent gris.'), JSON.stringify(lignes));
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const reglages = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    assert.equal(await reglages.getByRole('slider', { name: /^Teinte de / }).isDisabled(), true);
    assert.equal(await reglages.getByRole('textbox', { name: /^Teinte de / }).isDisabled(), true);
    assert.equal(await reglages.getByText('Palette grise : aucune teinte à régler.').isVisible(), true);
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
    assert.equal(await reglages.getByText('Palette grise : aucune teinte à régler.').isVisible(), false);
    assert.equal(await bascule(page, CARTE_DE_LA_DERIVE).isDisabled(), false);
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
    assert.equal(await page.locator('#panneau-creation .ligne-fixe[data-ton="avertissement"]').filter({ hasText: 'soft et vivid' }).count(), 0, 'aucun point à vérifier, « Profils confondus » compris');
    assert.match(await page.locator('#panneau-creation .pied-texte').textContent(), / · aucune alerte$/);
  } finally {
    await page.close();
  }
});

test('[VER-15] un lien de message ouvre les Réglages communs sur son groupe, et le retour rend le focus au lien', async () => {
  const page = await ouvrirSur('fond-personnalise');
  try {
    await ouvrirLaVerification(page);
    const lien = page.locator('.messages-de-la-verification .constat-alerte').getByRole('button', { name: 'Changer les couleurs de fond' });
    await lien.click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Fond de la page, thème Light');
    await page.getByRole('button', { name: 'Retour aux palettes' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Changer les couleurs de fond');
  } finally {
    await page.close();
  }
});

/** Le fichier que « Exporter la recette » propose : son nom et son contenu. */
/** Déplie la carte « Palettes et réglages » de l'onglet Palettes, quand l'onglet en a une : un blocage porte ses gestes lui-même. */
async function deplierLaRecette(page, dans) {
  const section = page.locator(`${dans} [data-section="recette"]`);
  if (await section.count() > 0 && await section.getAttribute('data-ouverte') !== 'true') await section.locator('.section-bascule').click();
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
    const exporte = await exporter(page, '#panneau-gestion');
    assert.equal(exporte.nom, 'palettes-et-reglages.json');
    assert.equal(exporte.contenu, messageDe('planche-a-jour').texte, '[REC-07] le JSON canonique de la recette rangée');

    const modifiee = JSON.parse(exporte.contenu);
    modifiee.palettes[0].nom = 'Bleu roi';
    modifiee.seuils.texte = 7;
    const avant = await compte(page);
    await importerLeFichier(page, '#panneau-gestion', JSON.stringify(modifiee, null, 2));
    const confirmation = page.locator('#panneau-gestion .confirmation', { hasText: 'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?' });
    assert.deepEqual(await confirmation.locator('p').allTextContents(), [
      'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?',
      'Palette à modifier : Bleu roi (nom).',
      'Réglage commun à modifier : minimum des textes.',
      'Contrastes minimums : les garanties peuvent changer, les couleurs restent identiques.',
      'Sur la planche : 2 cadres passeront « À actualiser » (Bleu roi, Jaune).',
      'L’import remplace les palettes et les réglages. Les cadres Figma restent inchangés.',
    ]);
    assert.equal(await compte(page), avant, 'rien ne se range avant la confirmation');
    await confirmation.getByRole('button', { name: 'Remplacer par cette sauvegarde' }).click();
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    assert.deepEqual(rangement.recette, modifiee);
    assert.equal(rangement.empreinteLue, messageDe('planche-a-jour').empreinte);
    await envoyer(page, rangee(rangement.demande));

    assert.equal(await page.locator('.palette-depliable[data-palette] .palette-nom').first().textContent(), 'Bleu roi');
    assert.equal(await page.locator('.palette-depliable[data-palette]').first().getAttribute('data-etat'), 'a-mettre-a-jour');
    await genererDepuisLaFiche(page, ID_DU_BLEU);
    const dessin = await dessinEnvoye(page, 1);
    assert.deepEqual(dessin.palettes, [ID_DU_BLEU]);
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
    const bloquant = '#panneau-creation';
    assert.equal((await exporter(page, bloquant)).contenu, illisible.texte);
    const avant = await compte(page);
    await page.locator(bloquant).getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).click();
    assert.equal(await compte(page), avant, 'la confirmation vient avant tout rangement');
    await page.locator(bloquant).getByRole('button', { name: 'Réinitialiser', exact: true }).click();
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes, []);
    assert.equal(rangement.empreinteLue, illisible.empreinte);
    assert.equal(await page.locator('#panneau-creation .constat-bloquant:visible').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Réinitialiser les palettes et les réglages' }).count(), 0);
    await envoyer(page, rangee(rangement.demande));
    await ouvrirLaPlanche(page);
    assert.equal(await page.locator('#panneau-gestion .constat-bloquant:visible').count(), 0, 'l’onglet Palettes quitte aussi le bloquant');
    assert.equal(await page.getByText('Créez une palette dans l’onglet « Création », puis générez-la ici.').isVisible(), true);
  } finally {
    await page.close();
  }
});

test('[REC-08] un fichier d’une version future ou cassé se refuse, et rien ne se range', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaPlanche(page);
    await importerLeFichier(page, '#panneau-gestion', JSON.stringify({ formatVersion: 99 }));
    assert.equal(await page.locator('#panneau-gestion .constat-bloquant .constat-ou').textContent(), 'Import impossible : palettes-et-reglages.json, format 99');
    await importerLeFichier(page, '#panneau-gestion', '{pas du json');
    assert.match(await page.locator('#panneau-gestion .constat-bloquant .constat-quoi').textContent(), /Vos palettes et vos réglages actuels sont conservés\.$/);
    // L'onglet Palettes relit l'état à son ouverture ([PLA-20]) : seul un rangement compte ici.
    assert.deepEqual((await demandes(page)).filter((demande) => demande.type === 'ranger-recette'), []);
  } finally {
    await page.close();
  }
});

test('le banc de galerie joue un fichier : l’écart d’import attend sa confirmation', async () => {
  const page = await pageDeGalerie('ecart-d-import');
  try {
    const confirmation = page.locator('#panneau-gestion .confirmation', { hasText: 'Remplacer les palettes et les réglages par « palettes-et-reglages.json » ?' });
    assert.equal(await confirmation.locator('p').nth(1).textContent(), 'Palette à ajouter : Ardoise.');
  } finally {
    await page.close();
  }
});

/** Le rapport que « Exporter le rapport » propose, relu en JSON. */
async function exporterLeRapport(page) {
  await deplierLaRecette(page, '#panneau-gestion');
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
    // Seize jugements par profil et par thème : 3 + 1 + 4 + 4 + 1 + 1 + 2 pour les sept garanties.
    assert.equal(avant.palettes[0].promesses.length, 64);
    assert.equal(avant.ecartsDuDernierDessin, null, 'aucun dessin depuis l’ouverture');

    await page.locator(`.palette-depliable[data-palette="${ID_DU_BLEU}"] [data-geste="modifier"]`).click();
    await page.locator('#panneau-creation .champ-hexa').fill('#2563EB');
    await page.locator('#panneau-creation .champ-hexa').press('Tab');
    const rangement = await prochaineDuType(page, 'ranger-recette', 0);
    await envoyer(page, rangee(rangement.demande));
    await genererDepuisLaFiche(page, ID_DU_BLEU);
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

/** Le fond calculé d'un segment pressé, celui du groupe de segments qui le porte, et celui de sa carte (`null` hors d'une carte, comme la ligne du titre). */
const fonds = (locator) => locator.evaluate((element) => {
  const fond = (noeud) => getComputedStyle(noeud).backgroundColor;
  const carte = element.closest('.carte');
  return [fond(element), fond(element.closest('.bascule')), carte ? fond(carte) : null];
});

test('Y1.4 : le segment pressé des choix, aperçu Light et Dark, Écran et États, Soft et Vivid, a le même fond, distinct de son groupe et de sa carte, aux deux thèmes de Figma', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    // Un fond calculé se lit aussi dans un panneau caché : la ligne du titre de Création, la carte des garanties de Vérification et la carte de l'Interface de test.
    await deplierLaCarte(page, 'Interface de test');
    await ouvrirLaVerification(page);
    const choix = [
      page.locator('#panneau-creation .tete-de-la-palette .choix-d-affichage .bascule-option[aria-pressed="true"]'),
      page.locator('#panneau-verification .tete-de-la-palette .choix-d-affichage .bascule-option[aria-pressed="true"]'),
      carteDesGaranties(page).locator('.choix-d-affichage .bascule-option[aria-pressed="true"]'),
      carteDeLOnglet(page, 'Interface de test').locator('.choix-de-l-essai .bascule-option[aria-pressed="true"]'),
      carteDeLOnglet(page, 'Interface de test').locator('.choix-de-la-vue .bascule-option[aria-pressed="true"]'),
    ];
    for (const theme of ['clair', 'sombre']) {
      if (theme === 'sombre') await page.evaluate(() => document.documentElement.classList.add('figma-dark'));
      const releves = await Promise.all(choix.map(fonds));
      for (const [pressee, groupe, carte] of releves) {
        assert.notEqual(pressee, groupe, `${theme} : le segment pressé se confond avec son groupe`);
        if (carte !== null) assert.notEqual(pressee, carte, `${theme} : le segment pressé se confond avec sa carte`);
        assert.notEqual(pressee, 'rgba(0, 0, 0, 0)', `${theme} : le segment pressé n’a pas de fond`);
      }
      assert.equal(new Set(releves.map(([pressee]) => pressee)).size, 1, `${theme} : plusieurs fonds de segment pressé ${JSON.stringify(releves)}`);
    }
  } finally {
    await page.close();
  }
});

test('Y1.5 : dans la grille des États, deux anneaux de focus de rangées voisines gardent un jour entre eux', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Interface de test');
    await page.locator('.choix-de-la-vue .bascule-option').nth(1).click();
    // L'anneau déborde de 4 px de chaque spécimen ; le jour se mesure entre les anneaux de deux rangées voisines.
    const jours = await page.locator('.essai-etats').evaluate((grille) => {
      const rangees = [...grille.querySelectorAll('.essai-rangee')].filter((rangee) => rangee.querySelector('.essai-specimen'));
      const bornes = rangees.map((rangee) => {
        const boites = [...rangee.querySelectorAll('.essai-specimen')].map((specimen) => specimen.getBoundingClientRect());
        return { haut: Math.min(...boites.map((boite) => boite.top)) - 4, bas: Math.max(...boites.map((boite) => boite.bottom)) + 4 };
      });
      return bornes.slice(1).map((borne, rang) => borne.haut - bornes[rang].bas);
    });
    // Six rangées portent un spécimen (plein, soft, contour, sans fond, champ, badge ; le lien n'en a pas), donc cinq jours. La rangée « Carte » a disparu (M3).
    assert.equal(jours.length, 5, JSON.stringify(jours));
    assert.ok(Math.min(...jours) > 0, `deux anneaux se touchent : ${JSON.stringify(jours)}`);
  } finally {
    await page.close();
  }
});

/** Les lignes de la bulle des variables : propriété, variable, nuance. */
const lignesDeLaBulle = (page) => page.locator('.essai-surface .essai-bulle .essai-bulle-ligne').evaluateAll((lignes) => lignes.map((ligne) => [...ligne.children].map((enfant) => enfant.textContent)));

test('[UI-04] I8 survoler un élément de l’écran ouvre une bulle qui liste ses propriétés et ses variables ; elle est cachée aux lecteurs d’écran et se ferme à la sortie du pointeur', async () => {
  const page = await ouvrirSur('interface-de-test-bulle');
  try {
    await deplierLaCarte(page, 'Interface de test');
    const surface = page.locator('#panneau-creation .essai-surface');
    assert.equal(await surface.locator('.essai-bulle').count(), 0, 'pas de bulle sans survol');
    const avant = await surface.evaluate((element) => element.textContent);
    const enregistrer = surface.locator('.essai-actions .essai-bouton:last-child');
    await enregistrer.hover();
    const bulle = surface.locator('.essai-bulle');
    await bulle.waitFor();
    assert.deepEqual(await lignesDeLaBulle(page), [['fond', 'solid/default', '700'], ['texte', 'solid/foreground', 'blanc']]);
    assert.equal(await bulle.getAttribute('aria-hidden'), 'true');
    assert.equal(await bulle.evaluate((element) => element.querySelectorAll('a, button, input, [tabindex]').length), 0, 'la bulle ne prend pas le focus');
    assert.equal(await enregistrer.evaluate((element) => element.classList.contains('essai-survole')), true);
    assert.equal(await enregistrer.evaluate((element) => getComputedStyle(element).outlineStyle), 'dashed', 'le contour de l’élément survolé est tireté');
    // La bulle se pose sous l'élément sans le recouvrir.
    const [boite, sous] = await Promise.all([enregistrer.boundingBox(), bulle.boundingBox()]);
    assert.ok(sous.y >= boite.y + boite.height, `la bulle recouvre le bouton : ${JSON.stringify([boite, sous])}`);
    // Hors de la bulle, l'écran ne gagne aucun texte.
    const texteSansBulle = await surface.evaluate((element) => {
      const copie = element.cloneNode(true);
      copie.querySelectorAll('.essai-bulle').forEach((noeud) => noeud.remove());
      return copie.textContent;
    });
    assert.equal(texteSansBulle, avant, 'le survol n’ajoute aucun texte hors de la bulle');
    // Le pointeur quitte la surface : la bulle se ferme et l'élément perd son contour.
    await page.mouse.move(2, 2);
    await bulle.waitFor({ state: 'detached' });
    assert.equal(await enregistrer.evaluate((element) => element.classList.contains('essai-survole')), false);
  } finally {
    await page.close();
  }
});

test('[UI-04] I8 la bulle suit l’élément survolé : le bouton soft porte surface/default et surface/foreground, le champ page/border, et un seul élément porte le contour tireté', async () => {
  const page = await ouvrirSur('interface-de-test-bulle');
  try {
    await deplierLaCarte(page, 'Interface de test');
    const surface = page.locator('#panneau-creation .essai-surface');
    await surface.locator('.essai-actions .essai-bouton:nth-child(2)').hover();
    await surface.locator('.essai-bulle').waitFor();
    assert.deepEqual((await lignesDeLaBulle(page)).map(([propriete, variable]) => [propriete, variable]), [['fond', 'surface/default'], ['texte', 'surface/foreground']]);
    assert.equal(await surface.locator('.essai-survole').count(), 1);
    await surface.locator('.essai-saisie').hover();
    assert.deepEqual((await lignesDeLaBulle(page)).map(([propriete, variable]) => [propriete, variable]), [['contour', 'page/border']]);
    assert.equal(await surface.locator('.essai-survole').count(), 1);
  } finally {
    await page.close();
  }
});

/** Les variables d'un spécimen de la grille des États, `propriete=variable;…` : rangée 0 plein, 1 soft, 2 contour, 3 sans fond, 4 champ ; colonne 0 default, 1 hover, 2 pressed, 3 focus. */
const variablesDuSpecimen = (page, rangee, colonne) => page
  .locator('.essai-etats [role="row"]:has(.essai-specimen, .essai-lien-peint)').nth(rangee)
  .locator('[role="cell"]').nth(colonne)
  .locator('[data-variables]').first()
  .getAttribute('data-variables');

async function ouvrirLaVueDesEtats(page) {
  await deplierLaCarte(page, 'Interface de test');
  await page.locator('.choix-de-la-vue .bascule-option').nth(1).click();
}

test('[UI-04] I8 la vue États a les colonnes default, hover, pressed et focus, et plus de rangée « Carte »', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaVueDesEtats(page);
    const grille = page.locator('.essai-etats');
    assert.deepEqual(await grille.locator('[role="columnheader"]').allTextContents(), ['default', 'hover', 'pressed', 'focus']);
    const noms = await grille.locator('[role="rowheader"]').allTextContents();
    assert.equal(noms.some((nom) => /carte/i.test(nom)), false, noms.join(' | '));
    assert.equal(noms.length, 7, noms.join(' | '));
  } finally {
    await page.close();
  }
});

test('[UI-04] I8 S3 dans la vue États, le focus garde la forme du repos et ajoute l’anneau page/focus, pour les quatre boutons', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaVueDesEtats(page);
    assert.equal(await variablesDuSpecimen(page, 0, 3), 'fond=solid/default;texte=solid/foreground;anneau=page/focus');
    assert.equal(await variablesDuSpecimen(page, 0, 0), 'fond=solid/default;texte=solid/foreground');
    assert.equal(await variablesDuSpecimen(page, 1, 3), 'fond=surface/default;texte=surface/foreground;anneau=page/focus');
    assert.equal(await variablesDuSpecimen(page, 2, 3), 'contour=page/border;texte=page/foreground;anneau=page/focus');
    assert.equal(await variablesDuSpecimen(page, 3, 3), 'texte=surface/foreground;anneau=page/focus');
    // Le survol et l'appui du plein gardent leurs variables propres.
    assert.equal(await variablesDuSpecimen(page, 0, 1), 'fond=solid/hover;texte=solid/foreground');
    assert.equal(await variablesDuSpecimen(page, 0, 2), 'fond=solid/pressed;texte=solid/foreground');
  } finally {
    await page.close();
  }
});

test('[UI-04] I8 dans la vue États, le texte du bouton soft est surface/foreground aux trois états, et le champ garde page/border aux quatre', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await ouvrirLaVueDesEtats(page);
    for (const [colonne, etat] of [[0, 'default'], [1, 'hover'], [2, 'pressed']]) {
      assert.equal(await variablesDuSpecimen(page, 1, colonne), `fond=surface/${etat};texte=surface/foreground`, `soft, ${etat}`);
    }
    for (const colonne of [0, 1, 2, 3]) {
      assert.match(await variablesDuSpecimen(page, 4, colonne), /^contour=page\/border(;|$)/, `champ, colonne ${colonne}`);
    }
  } finally {
    await page.close();
  }
});

test('[UI-04] I8 dans le thème inversé (texte des boutons noir en Light), solid/hover du bouton plein vise la 600, solid/pressed la 500, solid/default la 700', async () => {
  const page = await ouvrirSur('texte-des-boutons-noir-noir');
  try {
    await ouvrirLaVueDesEtats(page);
    const nuances = async (colonne) => {
      await page.locator('.essai-etats [role="row"]:has(.essai-specimen)').first().locator('[role="cell"]').nth(colonne).locator('.essai-specimen').hover();
      return Object.fromEntries((await lignesDeLaBulle(page)).map(([propriete, variable, nuance]) => [`${propriete}:${variable}`, nuance]));
    };
    assert.equal((await nuances(0))['fond:solid/default'], '700');
    assert.equal((await nuances(1))['fond:solid/hover'], '600');
    assert.equal((await nuances(2))['fond:solid/pressed'], '500');
    assert.equal((await nuances(0))['texte:solid/foreground'], 'noir');
  } finally {
    await page.close();
  }
});

/** Le choix du profil peint de l'Interface de test, et le segment que le designer presse. */
const choixDeLEssai = (page) => carteDeLOnglet(page, 'Interface de test').getByRole('group', { name: 'Profil peint' });
const choisirDansLEssai = (page, nom) => choixDeLEssai(page).getByRole('button', { name: nom, exact: true }).click();

test('[UI-14] le choix du profil peint dit « Afficher » puis Soft et Vivid, sous son nom accessible, et se retire pour une palette à une intensité', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await deplierLaCarte(page, 'Interface de test');
    const choix = carteDeLOnglet(page, 'Interface de test').locator('.choix-de-l-essai');
    assert.equal(await choix.locator('.choix-libelle').textContent(), 'Afficher');
    assert.deepEqual(await choixDeLEssai(page).locator('.bascule-option').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')])), [['Soft', 'false'], ['Vivid', 'true']]);
    assert.equal(await page.locator('#panneau-creation .essai-surface').count(), 1);
    assert.equal(await carteDeLOnglet(page, 'Interface de test').locator('.carte-resume').textContent(), 'Thème Light · Vivid');
    await configurerLesIntensites(page, 'Une');
    assert.equal(await choix.isVisible(), false);
  } finally {
    await page.close();
  }
});

/** Pose « Une » ou « Deux » dans le groupe Intensités de la configuration. */
const configurerLesIntensites = (page, nom) => carteDeLOnglet(page, 'Configuration de la palette').getByRole('group', { name: 'Intensités' }).getByRole('button', { name: nom, exact: true }).click();

test('[UI-14] changer de palette rouvre le choix sur le porteur', async () => {
  const page = await ouvrirSur('alertes-seules');
  try {
    await deplierLaCarte(page, 'Interface de test');
    const pressees = () => choixDeLEssai(page).locator('.bascule-option[aria-pressed="true"]').allTextContents();
    assert.deepEqual(await pressees(), ['Vivid'], 'la première palette s’ouvre sur son porteur');
    await choisirDansLEssai(page, 'Soft');
    assert.deepEqual(await pressees(), ['Soft']);
    assert.equal(await carteDeLOnglet(page, 'Interface de test').locator('.carte-resume').textContent(), 'Thème Light · Soft');
    await page.locator('.selecteur-bouton').click();
    await page.locator('.selecteur-option').nth(1).click();
    assert.equal(await page.locator('.selecteur-nom').textContent(), 'Bleu');
    assert.deepEqual(await pressees(), ['Vivid'], 'une autre palette rouvre le choix sur son porteur');
  } finally {
    await page.close();
  }
});

test('Y1.6 : les gestes d’une fiche et ceux d’une palette supprimée ont la même hauteur, « Supprimer définitivement » compris', async () => {
  const page = await ouvrirSur('palette-supprimee');
  try {
    await ouvrirLaPlanche(page);
    const hauteurs = await page.locator('#panneau-gestion .fiche-gestes button, #panneau-gestion .sortie-gestes button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getBoundingClientRect().height]));
    assert.ok(hauteurs.some(([texte]) => texte === 'Supprimer définitivement'), JSON.stringify(hauteurs));
    assert.ok(hauteurs.some(([texte]) => texte === 'Afficher'), JSON.stringify(hauteurs));
    assert.deepEqual([...new Set(hauteurs.map(([, hauteur]) => hauteur))], [24], JSON.stringify(hauteurs));
  } finally {
    await page.close();
  }
});

/** Les intensités que l'aperçu, les garanties et l'interface de test montrent. */
async function intensitesMontrees(page) {
  // La bascule des garanties vit dans Vérification ; le reste se lit dans Création.
  await ouvrirLaVerification(page);
  const basculeDesGaranties = await carteDesGaranties(page).locator('.choix-d-affichage').isVisible();
  await ouvrirLaCreation(page);
  return {
    apercu: [...new Set(await page.locator('.nuancier-grille .pastille[data-profil]').evaluateAll((pastilles) => pastilles.map((pastille) => pastille.dataset.profil)))],
    basculeDesGaranties,
    basculeDeLEssai: await page.locator('.choix-de-l-essai').isVisible(),
    carteDesReglages: await carteDeLOnglet(page, CARTE_DES_REGLAGES).isVisible(),
    cibleDesReglages: await carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.cible-des-reglages').evaluate((cible) => !cible.hidden),
    synchronisation: await carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getByText('Synchroniser', { exact: false }).isVisible(),
  };
}

test('Y4.8 [ENT-14] : le segment « Une » des intensités change l’aperçu, les garanties, l’interface de test, le choix du profil à régler et la dérive ; le retour les rend', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await deplierLaCarte(page, 'Interface de test');
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
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
    assert.equal(await configuration.getByText(/^Intensité : /).count(), 0, 'la part de la référence reste à la création (recette v7)');
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
    const fiche = page.locator(`.palette-depliable[data-palette="${ID_DU_BLEU}"]`);
    assert.deepEqual(await fiche.locator('.fiche-rangee').evaluateAll((rangees) => rangees.map((rangee) => rangee.dataset.intensite)), ['unique'], 'la fiche ne montre que la rampe présente');
  } finally {
    await page.close();
  }
});

test('Y6.3 : la ligne « Planche » de chaque fiche porte son état en pastille et ses gestes dans l’ordre ; après une génération, le focus revient à la fiche', async () => {
  const page = await ouvrirSur('fiche-refaite');
  try {
    await ouvrirLaPlanche(page);
    const fiches = page.locator('.palette-depliable[data-palette]');
    assert.deepEqual(await pastilleDeLaPlanche(fiches).allTextContents(), ['À jour', 'À actualiser', 'Pas encore créée']);
    assert.deepEqual(await fiches.evaluateAll((cartes) => cartes.map((fiche) => [...fiche.querySelectorAll('.sortie[data-sortie="planche"] .sortie-gestes button')].map((bouton) => bouton.dataset.geste))), [
      ['voir'],
      ['generer', 'voir'],
      ['generer'],
    ]);
    const jaune = fiches.nth(1);
    await jaune.getByRole('button', { name: 'Actualiser', exact: true }).click();
    const demande = await dessinEnvoye(page, 1);
    const avant = await compte(page);
    await envoyer(page, dessinDe(demande.demande, { issue: 'dessinee', page: '40:1', cadres: [{ palette: ID_DU_JAUNE, cadre: '40:3' }], peints: [] }));
    const relecture = await prochaineDuType(page, 'lire-etat', avant);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.geste), 'generer', 'le focus revient au geste, que le dessin avait rendu inerte');
    // Relu à jour, le cadre n'a plus de premier geste : le focus passe au premier geste de la même fiche.
    const aJour = messageDe('planche-a-jour');
    await envoyer(page, { ...messageDe('fiche-refaite'), demande: relecture.demande, planche: { ...messageDe('fiche-refaite').planche, cadres: messageDe('fiche-refaite').planche.cadres.map((cadre) => (cadre.palette === ID_DU_JAUNE ? { ...cadre, empreinte: aJour.planche.cadres.find(({ palette }) => palette === ID_DU_JAUNE)?.empreinte ?? cadre.empreinte } : cadre)) } });
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.palette-depliable')?.dataset.palette), ID_DU_JAUNE);
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

test('Z1.5 : « À jour » a le fond de succès, distinct de celui des notes ; « À actualiser » et « Pas encore créée » l’avertissement ; introuvable et illisible le danger ; chaque texte tient 4,5:1 aux deux thèmes de Figma', async () => {
  const page = await ouvrirSur('pastilles-des-etats');
  try {
    await ouvrirLaPlanche(page);
    const pastilles = pastilleDeLaPlanche(page.locator('.palette-depliable[data-palette]'));
    assert.deepEqual(await pastilles.allTextContents(), ['À jour', 'À actualiser', 'Pas encore créée', 'Introuvable', 'Lecture impossible']);
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
      const creation = page.locator('#panneau-creation .champ-creation');
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
    const element = document.querySelector(`#panneau-creation ${selecteur}`);
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

const INVITATION = ['Choisissez une palette', 'Sélectionnez une palette ou créez-en une avec « Nouvelle palette ».'];

test('Z2.5 [UI-06] à l’ouverture, aucune palette n’est choisie : « Sélectionner une palette », l’invitation, ni menu ni palette ; la liste ne coche rien', async () => {
  const page = await ouvrirSur('sans-palette-choisie', PAR_DEFAUT, { sansPalette: true });
  try {
    assert.deepEqual(await vueDeLaCreation(page), { selecteur: 'Sélectionner une palette', invitation: INVITATION, menu: false, nouvelle: true, palette: false });
    assert.equal(await page.locator('.invitation button').count(), 0, 'les gestes sont ceux de la barre');
    assert.equal(await page.locator('#panneau-creation .titre-de-premier-rang:visible').textContent(), 'Choisissez une palette');
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
    assert.equal(await page.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette Jaune');
  } finally {
    await page.close();
  }
  const creation = await ouvrirSur('sans-palette-choisie', PAR_DEFAUT, { sansPalette: true });
  try {
    await creation.locator('.bouton-de-barre').click();
    assert.equal((await vueDeLaCreation(creation)).invitation, null, 'la création ouverte remplace l’invitation');
    await creation.locator('#panneau-creation .champ-creation').fill('#7C3AED');
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
    await page.locator('#panneau-creation .confirmation').getByRole('button', { name: 'Supprimer la palette' }).click();
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
    await page.getByRole('button', { name: 'Retour aux palettes' }).click();
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
 * nuancier ; `rendusComplets`, ceux de la carte « Interface de test », qui
 * n'arrivent qu'avec un rendu complet de l'onglet.
 */
const TEMOIN_DU_RENDU_COMPLET = '#panneau-creation [aria-label="Interface de test"] .carte-corps';
async function ouvrirLeGlisser(page) {
  await deplierLaCarte(page, 'Interface de test');
  await carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base .pipette').click();
  await page.evaluate((temoin) => {
    const zone = document.querySelector('.selecteur-zone');
    zone.setPointerCapture = () => {};
    zone.hasPointerCapture = () => true;
    const cadre = zone.getBoundingClientRect();
    const point = (x, y, buttons = 1) => ({ bubbles: true, pointerId: 1, isPrimary: true, button: 0, buttons, clientX: cadre.left + cadre.width * x, clientY: cadre.top + cadre.height * y });
    window.compteDesRendus = 0;
    new MutationObserver(() => { window.compteDesRendus += 1; }).observe(document.querySelector('.nuancier-surface'), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    window.rendusComplets = 0;
    new MutationObserver(() => { window.rendusComplets += 1; }).observe(document.querySelector(temoin), { childList: true, characterData: true, subtree: true, attributes: true });
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
    window.sansCapture = () => { zone.hasPointerCapture = () => false; };
  }, TEMOIN_DU_RENDU_COMPLET);
}

const referenceMontree = (page) => carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base .champ-hexa').inputValue();
const imageSuivante = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const rangements = (page) => page.evaluate(() => window.demandes.filter(({ type }) => type === 'ranger-recette'));

test('Z4.4 [UI-13] pendant un glisser dans le sélecteur de couleur, l’aperçu se rend une fois par image, à la couleur du dernier mouvement ; le reste de l’onglet attend', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const avant = await referenceMontree(page);
    // Les mouvements et la lecture du code tiennent dans une même tâche : aucune image ne passe entre eux.
    const [code, rendusPendant, montreePendant] = await page.evaluate(() => {
      window.compteDesRendus = 0;
      window.rendusComplets = 0;
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
    assert.equal(await page.evaluate(() => window.rendusComplets), 0, 'le rendu complet attend la fin du geste');
    assert.deepEqual(await rangements(page), [], 'rien ne se range pendant le geste');
  } finally {
    await page.close();
  }
});

test('Z4.4 [UI-13] la fin d’un glisser range une seule fois, à la couleur du dernier mouvement, et rend tout l’onglet', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const code = await page.evaluate(() => window.glisser([[0.3, 0.2], [0.6, 0.4], [0.8, 0.6]], 'rien'));
    // Une image passe avant le relâcher : l'aperçu seul s'est rendu.
    await imageSuivante(page);
    await page.evaluate(() => {
      window.rendusComplets = 0;
      window.relacher();
    });
    await imageSuivante(page);
    const ranges = await rangements(page);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].recette.palettes[0].reference, code);
    assert.equal(await referenceMontree(page), code);
    assert.ok(await page.evaluate(() => window.rendusComplets) > 0, 'le rendu complet suit la fin du geste');
  } finally {
    await page.close();
  }
});

test('Z4.4 [UI-13] Échap pendant un glisser referme le sélecteur, rend le focus à la pastille, laisse l’aperçu au dernier mouvement sans rien ranger, puis rend tout l’onglet', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const code = await page.evaluate(() => {
      window.rendusComplets = 0;
      return window.glisser([[0.4, 0.3], [0.8, 0.7]], 'echap');
    });
    assert.equal(await referenceMontree(page), code, 'l’aperçu garde le dernier mouvement');
    assert.equal(await page.locator('.selecteur-de-couleur').isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('pipette')), true);
    await page.waitForFunction(() => window.rendusComplets > 0, null, { timeout: 2000 });
    await page.evaluate(() => document.querySelector('.selecteur-zone').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })));
    assert.deepEqual(await rangements(page), [], 'Échap n’enregistre rien');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] une pause de 300 ms, bouton enfoncé, ne rend pas tout l’onglet : le rendu complet attend le relâcher', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    await page.evaluate(() => window.glisser([[0.3, 0.2], [0.6, 0.4]], 'rien'));
    await imageSuivante(page);
    await page.evaluate(() => { window.rendusComplets = 0; });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.bouger(0.7, 0.5));
    await imageSuivante(page);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.rendusComplets), 0, 'aucun rendu complet pendant les pauses');
    assert.deepEqual(await rangements(page), [], 'rien ne se range pendant le geste');
    await page.evaluate(() => window.relacher());
    assert.ok(await page.evaluate(() => window.rendusComplets) > 0, 'le relâcher rend tout');
    assert.equal((await rangements(page)).length, 1);
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] Échap pendant un glisser rend tout l’onglet une fois, sans attendre ni rien ranger', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const touchees = await page.evaluate((temoin) => {
      window.glisser([[0.4, 0.3], [0.8, 0.7]], 'rien');
      window.rendusComplets = 0;
      const pendant = new MutationObserver(() => {});
      pendant.observe(document.querySelector(temoin), { childList: true, characterData: true, subtree: true, attributes: true });
      document.querySelector('.selecteur-de-couleur').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      // Le rendu complet part dans la même tâche que la touche.
      const lus = pendant.takeRecords().length;
      pendant.disconnect();
      return lus;
    }, TEMOIN_DU_RENDU_COMPLET);
    assert.ok(touchees > 0, 'Échap rend tout l’onglet dans sa propre tâche');
    await imageSuivante(page);
    assert.deepEqual(await rangements(page), [], 'Échap n’enregistre rien');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] un mouvement que le navigateur donne sans bouton prolonge le glisser, une capture perdue aussi, et le relâcher finit le geste', async () => {
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

    // Figma retire la capture en plein glisser : le geste se suit sur le document et continue.
    await page.evaluate(() => window.glisser([[0.2, 0.2], [0.3, 0.8]], 'rien'));
    await imageSuivante(page);
    const avantLaPerte = await referenceMontree(page);
    await page.evaluate(() => { window.rendusComplets = 0; window.perdreLaCapture(); window.sansCapture(); window.bouger(0.7, 0.3, 0); });
    await imageSuivante(page);
    assert.equal(await page.evaluate(() => window.rendusComplets), 0, 'la capture perdue ne rend pas tout l’onglet');
    assert.notEqual(await referenceMontree(page), avantLaPerte, 'l’aperçu suit le mouvement après la perte de la capture');
    assert.equal((await rangements(page)).length, 1, 'la capture perdue ne range rien');
    // Le premier rangement est encore en vol : le second attend sa réponse, et le relâcher rend tout l'onglet.
    await page.evaluate(() => window.relacher());
    assert.ok(await page.evaluate(() => window.rendusComplets) > 0, 'le relâcher finit le geste');
  } finally {
    await page.close();
  }
});

test('Z4.9 [UI-13] à la souris, le glisser du sélecteur de couleur continue après un mouvement sans bouton, comme Figma en donne, et le relâcher range une fois', async () => {
  const page = await ouvrirSur('palette-deux-intensites', { width: 600, height: 720 });
  try {
    await carteDeLOnglet(page, 'Configuration de la palette').locator('.colonnes-de-base .pipette').click();
    const boite = await page.locator('.selecteur-zone').boundingBox();
    const souris = await sourisReelle(page);
    const en = (x, y) => [boite.x + boite.width * x, boite.y + boite.height * y];
    await souris('mouseMoved', ...en(0.2, 0.3), 0);
    await souris('mousePressed', ...en(0.2, 0.3), 1);
    await souris('mouseMoved', ...en(0.4, 0.4), 1);
    await imageSuivante(page);
    const avant = await referenceMontree(page);
    // Sans bouton : Chromium y lâche la capture, et le sélecteur abandonnait le geste.
    await souris('mouseMoved', ...en(0.6, 0.5), 0);
    await souris('mouseMoved', ...en(0.8, 0.6), 0);
    await imageSuivante(page);
    assert.notEqual(await referenceMontree(page), avant, 'l’aperçu suit le pointeur après le mouvement sans bouton');
    assert.equal((await rangements(page)).length, 0, 'rien ne s’enregistre avant le relâcher');
    await souris('mouseReleased', ...en(0.8, 0.6), 0);
    // La demande passe par `postMessage` : elle arrive au relevé dans une tâche suivante.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    const ranges = await rangements(page);
    assert.equal(ranges.length, 1);
    const rangee = await referenceMontree(page);
    await souris('mouseMoved', ...en(0.1, 0.9), 0);
    await imageSuivante(page);
    assert.equal(await referenceMontree(page), rangee, 'après le relâcher, le pointeur ne règle plus rien');
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
    await page.evaluate(() => { window.rendusComplets = 0; });
    await envoyer(page, rangee(premier.demande));
    assert.equal(await page.evaluate(() => window.rendusComplets), 0, 'la réponse attend la fin du geste');
    await page.evaluate(() => window.relacher());
    const [, second] = await rangements(page);
    assert.ok(second, 'le relâcher range, la réponse précédente reçue');
    await page.evaluate(() => window.glisser([[0.4, 0.4], [0.7, 0.7]], 'rien'));
    await imageSuivante(page);
    await envoyer(page, { type: 'rangement', demande: second.demande, issue: { issue: 'modifiee-ailleurs' } });
    assert.equal(await page.locator('#panneau-creation [role="alert"]').count(), 1, 'le refus se lit pendant le geste');
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

test('Z4.9 [UI-13] un code tapé dans le sélecteur puis un clic sur la bascule de l’interface de test : le clic la bascule, puis l’onglet se rend', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await ouvrirLeGlisser(page);
    const champ = page.locator('.selecteur-champ').first();
    await champ.fill('2A7FDB');
    const visee = page.locator('.choix-de-la-vue .bascule-option[aria-pressed="false"]');
    // Le rendu complet rebâtit l'interface de test : parti au pointerdown, il pourrait perdre le clic.
    await visee.click();
    await page.waitForFunction(() => !document.querySelector('.selecteur-de-couleur') || document.querySelector('.selecteur-de-couleur').hidden);
    await imageSuivante(page);
    assert.equal(await visee.count(), 1, 'la bascule n’a que deux options');
    assert.equal(await page.locator('.choix-de-la-vue .bascule-option').nth(1).getAttribute('aria-pressed'), 'true');
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
    assert.equal(await modale.locator('.ajustement-pourquoi').textContent(), 'La palette utilise votre couleur telle quelle. En Thème Light, elle est trop claire pour « anneau de focus » (page/focus).');
    assert.deepEqual(await modale.locator('.ajustement-temoin .detail-code').allTextContents(), ['#16A34A', '#16A34A']);
    assert.equal(await modale.getByRole('button', { name: 'Un pas plus sombre' }).evaluate((element) => element === document.activeElement), true, 'le premier pas a le focus');
    assert.match(await modale.locator('.ajustement-nuances').textContent(), /^Nuance \d+/);
    assert.deepEqual(await modale.locator('.ajustement-entete').evaluate((entete) => [...entete.children].map((cellule) => cellule.textContent)), ['Garantie', 'Thème', 'Avant', '', 'Après']);
    assert.deepEqual(await modale.locator('.ajustement-ligne:not(.ajustement-entete) .ajustement-qui').allTextContents(), ['page/focus sur surface/default']);
    assert.equal(await modale.locator('.ajustement-ligne:not(.ajustement-entete) .ajustement-theme').first().textContent(), 'Light · Vivid');
    assert.equal(await modale.locator('.ajustement-groupe').isVisible(), false, 'à 770 px, le thème est une colonne');
    assert.equal(await modale.locator('.ajustement-bilan').textContent(), 'Soft ✓ inchangé · Vivid ✗ 1 inchangé');
    assert.equal(await modale.getByText('Luminosité', { exact: false }).count(), 0);
    assert.equal(await page.locator('#app').evaluate((app) => app.inert), true, 'la page dessous est inerte');
    // Le thème, l'avant et l'après, badge compris, tiennent chacun sur une ligne ; la garantie ne coupe jamais un nom de variable.
    const hauteurs = await modale.locator('.ajustement-ligne:not(.ajustement-entete) > :not(.ajustement-qui), .ajustement-qui .code-du-role').evaluateAll((cellules) => cellules.map((cellule) => cellule.getBoundingClientRect().height));
    assert.ok(hauteurs.length > 0 && hauteurs.every((hauteur) => hauteur < 30), `cellules : ${hauteurs}`);
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
    assert.equal(await modale.locator('.ajustement-bilan').textContent(), 'Soft ✓ inchangé · Vivid ✗ 1 → ✓');
    assert.deepEqual(await rangements(page), [], 'un pas ne range rien');
    assert.equal(await referenceMontree(page), '#16A34A', 'un pas ne change pas la palette');
    await modale.getByRole('button', { name: 'Appliquer' }).click();
    assert.equal(await modale.isVisible(), false);
    // La demande passe par `postMessage` : elle arrive au relevé dans une tâche suivante.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
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
    await ouvrirLaVerification(page);
    await carteDesGaranties(page).locator('.garantie[data-verdict="manquee"], .garantie:has([data-verdict="manquee"])').first().click();
    await carteDesGaranties(page).getByRole('button', { name: 'Ajuster la référence' }).first().click();
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
  // Le motif des hachures, dans `defs`, ne se dessine pas à sa place.
  const formes = [...element.querySelectorAll('rect, circle')].filter((forme) => !forme.closest('defs')).map((forme) => forme.getBoundingClientRect());
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
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    // La dérive se mesure dans Création, la réglette des garanties dans Vérification : un graphe caché n'a pas de taille.
    const mesurer = async () => {
      await ouvrirLaVerification(page);
      await imageSuivante(page);
      const reglette = await rendu(page, '.reglette-svg', ['.reglette-numero'], '.reglette-arc');
      await ouvrirLaCreation(page);
      await imageSuivante(page);
      return { derive: await rendu(page, '.derive-graphe', ['.derive-graduation', '.derive-poignee-lettre'], '.derive-trait'), reglette };
    };
    const petit = await mesurer();
    await page.setViewportSize({ width: 1000, height: 720 });
    await imageSuivante(page);
    const grand = await mesurer();
    pareils(petit.derive, grand.derive, 'dérive');
    pareils(petit.reglette, grand.reglette, 'réglette');
    // Les numéros et les deux rampes tombent sur les mêmes colonnes ([DER-04]).
    const decalages = await page.locator('.derive-graphe').evaluate((svg) => {
      const numeros = [...svg.querySelectorAll('text.derive-graduation')].filter((texte) => /^\d+$/.test(texte.textContent));
      const cases = [...svg.querySelectorAll('.derive-cran[data-rampe="avec"]')];
      return numeros.map((numero, rang) => {
        const a = numero.getBoundingClientRect();
        const b = cases[rang].getBoundingClientRect();
        return Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2);
      });
    });
    assert.ok(decalages.length === 11 && decalages.every((ecart) => ecart < 1), `décalages : ${decalages}`);
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
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
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
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    await imageSuivante(page);
    await bascule(page, CARTE_DE_LA_DERIVE).click();
    await page.evaluate(() => {
      window.redessins = 0;
      new MutationObserver(() => { window.redessins += 1; }).observe(document.querySelector('.derive-graphe'), { childList: true });
    });
    await page.setViewportSize({ width: 1000, height: 720 });
    await imageSuivante(page);
    await imageSuivante(page);
    assert.equal(await page.evaluate(() => window.redessins), 0, 'repliée, aucun redessin');
    await bascule(page, CARTE_DE_LA_DERIVE).click();
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
    assert.equal(await manque.textContent(), '1 garantie manquée en Thème Light');
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
    assert.equal(await colonne.locator('.ligne-de-la-reference .ligne-fixe-texte').textContent(), 'Couleur de référence inchangée.');
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
    assert.equal(await texteDeLAvertissement(), 'Couleur de référence inchangée.');
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
    assert.equal(await texteDeLAvertissement(), 'Ce réglage modifiera votre couleur de référence.');
    await carte.getByRole('textbox', { name: 'Luminosité de Vivid' }).fill('-0,02');
    await carte.getByRole('textbox', { name: 'Luminosité de Vivid' }).press('Tab');
    const vivid = await prochaine(page, avant + 1);
    assert.deepEqual(vivid.recette.palettes[0].reglages, { teinte: { soft: 8 }, clarte: { vivid: -0.02 }, porteur: 'vivid' }, 'Soft garde sa teinte');
    assert.equal(vivid.recette.palettes[0].reference, '#1669D2');
    assert.equal(vivid.recette.palettes[0].originale, '#1E6FD9');
    await envoyer(page, rangee(vivid.demande));
    assert.equal(await avertissement.getAttribute('data-ton'), 'avertissement');
    assert.equal(await texteDeLAvertissement(), 'Votre couleur de référence a été modifiée.');
    assert.equal(await referenceMontree(page), '#1669D2');
    assert.equal(await carte.locator('.carte-resume').textContent(), 'Réglé', 'le résumé ne dit que l’état (recette v7)');
  } finally {
    await page.close();
  }
});

/** Le libellé d'un choix du profil, puis ses segments, avec l'abscisse de chacun. */
const lireLeChoixDuProfil = (choix) => choix.evaluate((element) => ({
  libelle: element.querySelector('.choix-libelle').textContent,
  xDuLibelle: element.querySelector('.choix-libelle').getBoundingClientRect().x,
  segments: [...element.querySelectorAll('.bascule-option')].map((bouton) => ({ texte: bouton.textContent, x: bouton.getBoundingClientRect().x, presse: bouton.getAttribute('aria-pressed') })),
}));

test('[UI-12] le choix du Réglage global dit « Régler », puis range Soft, Vivid et Les deux, avec ◆ sur le profil qui porte la référence', async () => {
  const page = await ouvrirSur('palette-deux-intensites');
  try {
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const choix = await lireLeChoixDuProfil(carteDeLOnglet(page, CARTE_DES_REGLAGES).locator('.choix-d-affichage'));
    assert.equal(choix.libelle, 'Régler');
    assert.deepEqual(choix.segments.map(({ texte }) => texte), ['Soft', 'Vivid ◆', 'Les deux']);
    assert.ok(choix.segments.every(({ x }) => x > choix.xDuLibelle), 'le libellé précède les segments');
    assert.ok(choix.segments.every(({ x }, rang) => rang === 0 || x > choix.segments[rang - 1].x), 'les segments se suivent de gauche à droite');
    assert.deepEqual(choix.segments.map(({ presse }) => presse), ['true', 'false', 'false'], 'la carte s’ouvre sur le profil qui ne porte pas la référence');
  } finally {
    await page.close();
  }
});

test('[UI-09] dans la carte des garanties, le libellé « Afficher » précède Soft et Vivid, qui gardent leur résultat et leur nom accessible', async () => {
  const page = await ouvrirSur('promesses-manquees');
  try {
    await ouvrirLaVerification(page);
    const garanties = carteDesGaranties(page);
    const choix = await lireLeChoixDuProfil(garanties.locator('.choix-d-affichage'));
    assert.equal(choix.libelle, 'Afficher');
    assert.deepEqual(choix.segments.map(({ texte }) => texte), ['Soft ✓', 'Vivid ✗ 1']);
    assert.ok(choix.segments.every(({ x }) => x > choix.xDuLibelle), 'le libellé précède les segments');
    assert.deepEqual(await garanties.locator('.choix-d-affichage button').evaluateAll((boutons) => boutons.map((bouton) => bouton.getAttribute('aria-label'))), ['Soft : toutes les garanties sont respectées', 'Vivid : 1 garantie manquée']);
    assert.equal(await garanties.getByRole('group', { name: 'Profil des garanties' }).count(), 1);
  } finally {
    await page.close();
  }
});

test('[DER-12] dans le Color shift, le libellé « Régler » précède Soft et Vivid, sous le nom accessible « Profil à modifier »', async () => {
  const page = await editeurSur('alertes-seules');
  try {
    await page.getByRole('checkbox', { name: 'Synchroniser Soft et Vivid' }).click();
    const groupe = page.getByRole('group', { name: 'Profil à modifier' });
    const choix = await lireLeChoixDuProfil(groupe.locator('xpath=..'));
    assert.equal(choix.libelle, 'Régler');
    assert.deepEqual(choix.segments.map(({ texte }) => texte), ['Soft', 'Vivid']);
    assert.ok(choix.segments.every(({ x }) => x > choix.xDuLibelle), 'le libellé précède les segments');
    assert.deepEqual(choix.segments.map(({ presse }) => presse), ['false', 'true']);
  } finally {
    await page.close();
  }
});

test('le libellé du choix du profil se traduit : « Adjust » dans le Réglage global, « Show » dans les garanties', async () => {
  const page = await ouvrirSurEn('promesses-manquees', MINIMALE, 'en');
  try {
    assert.equal(await page.locator('#panneau-creation .carte[aria-label="Global adjustment"] .choix-d-affichage .choix-libelle').textContent(), 'Adjust');
    await page.getByRole('tab', { name: 'Verify', exact: true }).click();
    assert.equal(await page.locator('#panneau-verification .carte .choix-d-affichage .choix-libelle').textContent(), 'Show');
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
    assert.equal(await carte.locator('.avertissement-des-reglages .ligne-fixe-texte').textContent(), 'Ce réglage modifiera votre couleur de référence.');
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
    assert.equal(await carte.locator('.avertissement-des-reglages .ligne-fixe-texte').textContent(), 'Ce réglage modifiera votre couleur de référence.');
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
      await page.evaluate(() => document.querySelectorAll('#panneau-creation .carte-bascule[aria-expanded="false"]').forEach((bouton) => bouton.click()));
      const serres = await page.evaluate(() => [...document.querySelectorAll('.bascule-de-base .bascule-option, .choix-d-affichage .bascule-option')]
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
        const curseur = ligne.querySelector('.reglette-curseur').getBoundingClientRect();
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
    const titres = await page.evaluate(() => [...document.querySelectorAll('#panneau-creation .carte-bascule')]
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
    assert.ok(titres.some(({ titre }) => titre === CARTE_DES_REGLAGES));
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
      await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
      if (sombre) {
        const champ = carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getByRole('textbox', { name: 'Nuances sombres' });
        await champ.fill(sombre);
        await champ.press('Tab');
      }
      const conflits = await page.evaluate(() => {
        const svg = document.querySelector('#panneau-creation .derive-graphe');
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
    const avant = await curseur.getAttribute('aria-valuenow');
    const ranges = (await rangements(page)).length;
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width * 0.8, boite.y + boite.height / 2, { steps: 5 });
    await page.keyboard.press('Escape');
    assert.equal(await curseur.getAttribute('aria-valuenow'), avant, 'Échap rend la valeur d’avant au curseur');
    await page.mouse.move(boite.x + boite.width * 0.9, boite.y + boite.height / 2, { steps: 3 });
    await page.mouse.up();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    assert.equal((await rangements(page)).length, ranges, 'le relâcher après Échap n’enregistre rien');
    assert.equal(await curseur.getAttribute('aria-valuenow'), avant);
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
    assert.equal(await curseur.getAttribute('aria-valuenow'), '25', 'la valeur suit le pointeur hors de la piste');
    assert.equal(await curseur.evaluate((element) => document.activeElement === element), true, 'le curseur garde le focus');
    assert.equal((await rangements(page)).length, 0, 'rien ne s’enregistre avant le relâcher');
    await souris('mouseReleased', boite.x + boite.width * 0.9, y + 60, 0);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    const ranges = await rangements(page);
    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].recette.palettes.find(({ reglages }) => reglages?.teinte?.soft !== undefined)?.reglages.teinte.soft, 25);
    await souris('mouseMoved', boite.x + boite.width * 0.1, y, 0);
    assert.equal(await curseur.getAttribute('aria-valuenow'), '25', 'après le relâcher, le pointeur ne règle plus rien');
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
    // Un fichier qui porte des palettes s'ouvre sur Gestion.
    await ui.locator('#onglet-creation').click();
    await ui.locator('.selecteur-bouton').click();
    await ui.locator('.selecteur-option').first().click();
    await ui.locator('#panneau-creation .tete-de-la-palette .titre-de-premier-rang').waitFor();
    const carte = ui.locator(`#panneau-creation .carte[aria-label="${CARTE_DES_REGLAGES}"]`);
    if ((await carte.getAttribute('data-ouverte')) !== 'true') await carte.locator('> .carte-tete > .carte-bascule').click();
    const curseur = ui.getByRole('slider', { name: 'Teinte de Soft' });
    await curseur.scrollIntoViewIfNeeded();
    const boite = await curseur.boundingBox();
    const souris = await sourisReelle(page);
    const y = boite.y + boite.height / 2;
    await souris('mouseMoved', boite.x + boite.width / 2, y, 0);
    await souris('mousePressed', boite.x + boite.width / 2, y, 1);
    await souris('mouseMoved', boite.x + boite.width * 0.6, y, 1);
    await souris('mouseMoved', boite.x + boite.width * 0.8, y + 40, 0);
    const derniere = await curseur.getAttribute('aria-valuenow');
    assert.ok(Number(derniere) > 6, 'la valeur suit le pointeur hors de la piste');
    // Hors de l'iframe, le relâcher ne s'y verrait pas : le geste finit à la sortie.
    await souris('mouseMoved', 40, y, 0);
    await page.waitForFunction(() => window.demandes.some(({ type }) => type === 'ranger-recette'));
    await souris('mouseReleased', 40, y, 0);
    await souris('mouseMoved', boite.x + boite.width * 0.2, y, 0);
    assert.equal(await curseur.getAttribute('aria-valuenow'), derniere, 'revenu dans le plugin, le pointeur ne règle plus rien');
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
    assert.notEqual(await curseur.getAttribute('aria-valuenow'), '0');
    const premier = await prochaineDuType(page, 'ranger-recette', 0);
    await envoyer(page, rangee(premier.demande));
    await curseur.dblclick({ position: await aLaValeur() });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
    assert.equal(await curseur.getAttribute('aria-valuenow'), '0');
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

test('[UI-20] [ENT-15] glisser la luminosité de Soft et Vivid de 0 vers +0,02 sur Vert, près d’un seuil, ne déplace pas le curseur d’un pixel, et le curseur s’arrête à sa limite', async () => {
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
    // Le centre du pouce parcourt la piste moins deux demi-pouces de 7 px ; la piste va de −0,10 à +0,10.
    const x = (valeur) => boite.x + 7 + ((valeur + 0.1) / 0.2) * (boite.width - 14);
    await releverLesEcarts(page, `[aria-label="${nom}"]`);
    await souris('mouseMoved', x(0), y, 0);
    await souris('mousePressed', x(0), y, 1);
    for (const valeur of [0.005, 0.01, 0.015, 0.02, 0.01, 0.02]) {
      await souris('mouseMoved', x(valeur), y, 1);
      await deuxImages(page);
    }
    const ecarts = await ecartsReleves(page);
    await souris('mouseReleased', x(0.02), y, 0);
    // À +0,010, deux garanties tenues au départ manqueraient : le curseur s'arrête à +0,005, et la ligne de la plage dit pourquoi ([DER-22]).
    assert.equal(await curseur.getAttribute('aria-valuenow'), '0.005', 'le geste s’arrête à la limite');
    const plage = carte.locator('.reglages-de-la-palette > .ligne-fixe[data-ton="butee"] .ligne-fixe-texte');
    assert.match(await plage.textContent(), /^Luminosité de Soft et Vivid : limite atteinte à \+0,005\. Au-delà, .+ tomberait à \d+,\d+:1, sous \d(,\d)?:1\.$/);
    assert.deepEqual([...new Set(ecarts)], [0], `écarts relevés à chaque image : ${ecarts.join(', ')} px`);
  } finally {
    await page.close();
  }
});

test('[UI-20] à 500 px, glisser la poignée claire de la dérive sur Jaune ne déplace pas le graphe d’un pixel', async () => {
  const page = await ouvrirSur('alertes-seules', SANS_DEFILEMENT(500));
  try {
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
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
    const complet = '1 garantie manquée en Thème Light · Ajustée depuis #15803D';
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

test('[UI-18] le pied compte les garanties et les alertes à toute position de défilement ; « Vérifier » ouvre l’onglet Vérification sur la palette, et un lien de message ramène au réglage', async () => {
  const page = await ouvrirSur('promesses-manquees', PAR_DEFAUT);
  try {
    const pied = page.locator('#panneau-creation .pied-de-la-palette');
    assert.match(await pied.locator('.pied-texte').textContent(), /^\d+ garanties? manquées? sur 64 · /);
    assert.equal(await pied.getAttribute('data-ton'), 'danger');
    for (const position of [0, 400, 100000]) {
      await page.evaluate((y) => window.scrollTo(0, y), position);
      const boite = await pied.boundingBox();
      assert.equal(Math.round(boite.y + boite.height), PAR_DEFAUT.height, `le pied reste au bas de la fenêtre, défilement ${position}`);
    }
    await pied.getByRole('button', { name: 'Vérifier' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Vérification', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panneau-verification .tete-de-la-palette .titre-de-premier-rang').textContent(), 'Palette Bleu');
    assert.match(await page.locator('#panneau-verification .constats-titre').first().textContent(), /^Contrastes à corriger · \d+$/);
    // Un lien vers un réglage ramène à l'onglet Création, sur la carte dépliée.
    await page.locator('.messages-de-la-verification').getByRole('button', { name: 'Ajuster le Color shift' }).first().click();
    assert.equal(await page.getByRole('tab', { name: 'Création', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getAttribute('data-ouverte'), 'true');
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
    const x = (valeur) => boite.x + 7 + ((valeur + 0.1) / 0.2) * (boite.width - 14);
    await souris('mouseMoved', x(0), y, 0);
    await souris('mousePressed', x(0), y, 1);
    const pendant = [];
    // Vers le bas, Vert répare ses deux garanties manquées : la limite laisse passer ce qui répare ([DER-19]).
    for (const valeur of [-0.005, -0.01, -0.015, -0.02]) {
      await souris('mouseMoved', x(valeur), y, 1);
      await deuxImages(page);
      pendant.push(await annonce.textContent());
    }
    assert.deepEqual([...new Set(pendant)], [avant], 'rien ne s’annonce pendant le glisser');
    const bilanPendant = await page.locator('#panneau-creation .pied-texte').textContent();
    await souris('mouseReleased', x(-0.02), y, 0);
    await deuxImages(page);
    assert.notEqual(await annonce.textContent(), avant, 'le bilan changé s’annonce au relâcher');
    assert.ok(bilanPendant.startsWith(await annonce.textContent()), 'l’annonce reprend le bilan du pied');
  } finally {
    await page.close();
  }
});

/** Une réglette du Color shift, par son bout ([DER-21]). */
const regletteDuBout = (page, bout) => page.locator(`.editeur-derive .reglettes > .reglette:nth-child(${bout === 'clair' ? 1 : 2})`);
/** Choisit un onglet de grandeur du Color shift, et attend sa limite ([DER-18], [DER-20]). */
async function choisirLOnglet(page, nom) {
  await carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getByRole('tab', { name: new RegExp(`^${nom}`) }).click();
  await limitesCalculees(carteDeLOnglet(page, CARTE_DE_LA_DERIVE));
}
/** La ligne fixe de la plage sûre, sous les réglettes ([DER-22]). */
const ligneDeLaPlage = (page) => page.locator('.panneau-de-grandeur > .ligne-fixe');

test('[DER-18] trois onglets choisissent la grandeur ; chacun porte ses deux valeurs et une pastille quand il s’écarte de son départ ; le choix dure', async () => {
  const page = await editeurSur('color-shift-saturation');
  try {
    await choisirLOnglet(page, 'Saturation');
    const carte = carteDeLOnglet(page, CARTE_DE_LA_DERIVE);
    const onglets = carte.getByRole('tab');
    assert.deepEqual(await onglets.locator('.onglet-de-grandeur-nom').allTextContents(), ['Teinte', 'Saturation', 'Luminosité']);
    assert.deepEqual(await onglets.locator('.onglet-de-grandeur-valeurs').allTextContents(), ['−7,5° · +5,1°', '−40 % · +25 %', '+0,020 · −0,050']);
    // La teinte vaut Tailwind, son départ : pas de pastille ; la saturation et la luminosité s'écartent de zéro.
    assert.deepEqual(await onglets.locator('.pastille-reglee').evaluateAll((pastilles) => pastilles.map((pastille) => !pastille.hidden)), [false, true, true]);
    assert.equal(await carte.getByRole('tab', { selected: true }).locator('.onglet-de-grandeur-nom').textContent(), 'Saturation');
    assert.match(await page.locator('.derive-graduation').allTextContents().then((textes) => textes.join(' ')), /\+25 %/);
    // Les flèches passent d'un onglet à l'autre, au clavier comme le motif des onglets.
    await carte.getByRole('tab', { selected: true }).focus();
    await page.keyboard.press('ArrowRight');
    await limitesCalculees(carte);
    assert.equal(await carte.getByRole('tab', { selected: true }).locator('.onglet-de-grandeur-nom').textContent(), 'Luminosité');
    assert.deepEqual(await regletteDuBout(page, 'clair').locator('.champ-nombre').inputValue(), '+0,020');
    // Replier et rouvrir la carte garde l'onglet choisi.
    await bascule(page, CARTE_DE_LA_DERIVE).click();
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    assert.equal(await carte.getByRole('tab', { selected: true }).locator('.onglet-de-grandeur-nom').textContent(), 'Luminosité');
  } finally {
    await page.close();
  }
});

test('[DER-19] [DER-21] [DER-22] glisser une réglette au-delà de sa limite pose la borne et nomme la cause ; le relâcher range la borne', async () => {
  const page = await editeurSur('derive-liee-tailwind');
  try {
    await choisirLOnglet(page, 'Luminosité');
    // Bleu, nuances claires : −0,065 à +0,040, la borne haute tenue par l'ordre des nuances (étude, section 5.2).
    assert.equal(await ligneDeLaPlage(page).locator('.ligne-fixe-texte').textContent(), '', 'sans butée, la ligne garde sa place vide');
    const curseur = regletteDuBout(page, 'clair').getByRole('slider');
    assert.deepEqual([await curseur.getAttribute('aria-valuemin'), await curseur.getAttribute('aria-valuemax')], ['-0.065', '0.04']);
    assert.match(await curseur.getAttribute('aria-valuetext'), /^0,000\. Plage sûre de −0,065 à \+0,040$/);
    assert.equal(await regletteDuBout(page, 'clair').locator('.reglette-interdit-haut').isVisible(), true, 'la piste est hachurée au-delà de la limite');
    await curseur.scrollIntoViewIfNeeded();
    const boite = await curseur.boundingBox();
    const avant = await compte(page);
    await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
    await page.mouse.down();
    await page.mouse.move(boite.x + boite.width - 2, boite.y + boite.height / 2, { steps: 6 });
    assert.equal(await curseur.getAttribute('aria-valuenow'), '0.04', 'le pouce s’arrête sur la borne');
    assert.equal(await ligneDeLaPlage(page).getAttribute('data-ton'), 'butee');
    assert.equal(await ligneDeLaPlage(page).locator('.ligne-fixe-texte').textContent(), 'Luminosité, nuances claires : limite atteinte à +0,040. Au-delà, l’écart de luminosité entre deux nuances serait inférieur à 0,01.');
    assert.equal(await compte(page), avant, 'rien ne se range pendant le glisser');
    await page.mouse.up();
    const palette = await rangementDe(page, avant);
    assert.deepEqual(palette.derive.vivid.clarte, { clair: 0.04, sombre: 0 });
    assert.deepEqual(palette.derive.soft, palette.derive.vivid, 'synchronisés, les deux profils suivent');
    assert.equal(palette.derive.vivid.origine, 'tailwind', 'la luminosité ne change pas l’origine de la teinte');
  } finally {
    await page.close();
  }
});

test('[DER-09] [DER-19] au clavier, Fin et Origine posent une poignée sur ses bornes permises, et un pas au-delà annonce la cause', async () => {
  const page = await editeurSur('derive-liee-tailwind');
  try {
    await choisirLOnglet(page, 'Luminosité');
    const sombre = poignee(page, 'sombre');
    assert.deepEqual([await sombre.getAttribute('aria-valuemin'), await sombre.getAttribute('aria-valuemax')], ['-0.15', '0.055']);
    await sombre.focus();
    let avant = await compte(page);
    await page.keyboard.press('End');
    let palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clarte.sombre, 0.055, 'Fin va à la borne permise');
    await limitesCalculees(carteDeLOnglet(page, CARTE_DE_LA_DERIVE));
    avant = await compte(page);
    await poignee(page, 'sombre').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await ligneDeLaPlage(page).getAttribute('data-ton'), 'butee');
    assert.match(await ligneDeLaPlage(page).locator('.ligne-fixe-texte').textContent(), /^Luminosité, nuances sombres : limite atteinte à \+0,055\. Au-delà, page\/focus sur surface\/default \(Vivid, Dark\) tomberait à 2,95:1, sous 3:1\.$/);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'un pas au-delà de la borne ne range rien');
    // Les nuances sombres en butée, la borne basse des nuances claires se lit sur l'état du geste.
    const clair = poignee(page, 'clair');
    const basse = Number(await clair.getAttribute('aria-valuemin'));
    await clair.focus();
    await page.keyboard.press('Home');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clarte.clair, basse);
    assert.ok(basse < 0, String(basse));
  } finally {
    await page.close();
  }
});

test('[DER-13] Ctrl+Z défait le dernier réglage du Color shift, quelle que soit sa grandeur', async () => {
  const page = await editeurSur('derive-liee-tailwind');
  try {
    await choisirLOnglet(page, 'Saturation');
    const champ = regletteDuBout(page, 'sombre').locator('.champ-nombre');
    let avant = await compte(page);
    await champ.fill('30');
    await champ.press('Enter');
    let palette = await rangementDe(page, avant);
    assert.deepEqual(palette.derive.vivid.saturation, { clair: 0, sombre: 0.3 });
    await choisirLOnglet(page, 'Teinte');
    await poignee(page, 'clair').focus();
    avant = await compte(page);
    await page.keyboard.press('ArrowUp');
    await rangementDe(page, avant);
    avant = await compte(page);
    await page.keyboard.press('Control+z');
    palette = await rangementDe(page, avant);
    assert.equal(palette.derive.vivid.clair, -7.53, 'la teinte revient');
    assert.deepEqual(palette.derive.vivid.saturation, { clair: 0, sombre: 0.3 }, 'la saturation reste');
    avant = await compte(page);
    await poignee(page, 'clair').focus();
    await page.keyboard.press('Control+z');
    palette = await rangementDe(page, avant);
    assert.equal('saturation' in palette.derive.vivid, false, 'puis la saturation revient à zéro, et quitte la recette');
  } finally {
    await page.close();
  }
});

test('[DER-11] « Tout rétablir » rend la teinte Tailwind, la saturation et la luminosité à zéro', async () => {
  const page = await editeurSur('color-shift-saturation');
  try {
    const avant = await compte(page);
    await carteDeLOnglet(page, CARTE_DE_LA_DERIVE).getByRole('button', { name: 'Tout rétablir' }).click();
    const palette = await rangementDe(page, avant);
    assert.deepEqual(palette.derive.vivid, { clair: -7.53, sombre: 5.11, origine: 'tailwind' });
    assert.deepEqual(palette.derive.soft, palette.derive.vivid);
  } finally {
    await page.close();
  }
});

test('[UI-20] glisser une réglette du Color shift sur Vert jusqu’à sa butée ne déplace pas le curseur d’un pixel', async () => {
  const page = await ouvrirSur('ajuster-en-modale', SANS_DEFILEMENT(600));
  try {
    await page.keyboard.press('Escape');
    await deplierLaCarte(page, CARTE_DE_LA_DERIVE);
    await choisirLOnglet(page, 'Luminosité');
    const curseur = regletteDuBout(page, 'sombre').getByRole('slider');
    const boite = await curseur.boundingBox();
    const souris = await sourisReelle(page);
    const y = boite.y + boite.height / 2;
    await releverLesEcarts(page, '.editeur-derive .reglettes > .reglette:nth-child(2) .reglette-curseur');
    await souris('mouseMoved', boite.x + boite.width / 2, y, 0);
    await souris('mousePressed', boite.x + boite.width / 2, y, 1);
    for (let pas = 1; pas <= 8; pas += 1) {
      await souris('mouseMoved', boite.x + boite.width / 2 + (pas * boite.width) / 16, y, 1);
      await deuxImages(page);
    }
    const ecarts = await ecartsReleves(page);
    await souris('mouseReleased', boite.x + boite.width - 2, y, 0);
    assert.equal(await ligneDeLaPlage(page).getAttribute('data-ton'), 'butee', 'la butée s’annonce dans la même ligne');
    assert.deepEqual([...new Set(ecarts)], [0], `écarts relevés à chaque image : ${ecarts.join(', ')} px`);
  } finally {
    await page.close();
  }
});

test('[ENT-15] [DER-19] au clavier, Fin pose la luminosité du réglage global à sa borne permise, et un pas au-delà annonce la cause', async () => {
  const page = await ouvrirSur('ajuster-en-modale', { width: 600, height: 900 });
  try {
    await page.keyboard.press('Escape');
    await deplierLaCarte(page, CARTE_DES_REGLAGES);
    const carte = carteDeLOnglet(page, CARTE_DES_REGLAGES);
    await carte.getByRole('button', { name: 'Les deux' }).click();
    await limitesCalculees(carte);
    const curseur = carte.getByRole('slider', { name: 'Luminosité de Soft et Vivid' });
    // Vert : une garantie tenue au départ manquerait sous −0,055, bien avant la borne fixe de −0,10.
    assert.deepEqual([await curseur.getAttribute('aria-valuemin'), await curseur.getAttribute('aria-valuemax')], ['-0.055', '0.005']);
    let avant = await compte(page);
    await curseur.focus();
    await page.keyboard.press('End');
    const rangement = await prochaine(page, avant);
    assert.deepEqual(rangement.recette.palettes[0].reglages.clarte, { soft: 0.005, vivid: 0.005 });
    await envoyer(page, rangee(rangement.demande));
    avant = await compte(page);
    await curseur.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await curseur.getAttribute('aria-valuenow'), '0.005');
    assert.match(await carte.locator('.reglages-de-la-palette > .ligne-fixe[data-ton="butee"] .ligne-fixe-texte').textContent(), /^Luminosité de Soft et Vivid : limite atteinte à \+0,005\./);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 20)));
    assert.equal(await compte(page), avant, 'un pas au-delà de la borne ne range rien');
  } finally {
    await page.close();
  }
});

test('[UI-26] un état relu entre l’appui et le relâchement ne perd pas le clic sur « Mettre à jour » ; l’en-tête d’une fiche ne porte que « Modifier »', async () => {
  const page = await ouvrirSur('tokens-a-mettre-a-jour');
  try {
    await ouvrirLaPlanche(page);
    const fiche = page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_JAUNE}"]`);
    assert.equal(await page.locator('#panneau-gestion .palette-depliable[data-palette] .palette-ligne .pastille-d-etat').count(), 0);
    assert.deepEqual(await fiche.locator('.palette-ligne .palette-gestes button').evaluateAll((boutons) => boutons.map((bouton) => bouton.dataset.geste)), ['modifier']);
    assert.equal(await fiche.locator('.sortie[data-sortie="tokens"] .pastille-d-etat').textContent(), 'À mettre à jour');

    const geste = fiche.locator('[data-geste="mettre-a-jour"]');
    // La poignée suit le bouton pressé lui-même ; le sélecteur, lui, retrouverait celui qui le remplace.
    const presse = await geste.elementHandle();
    await geste.hover();
    await page.mouse.down();
    const avant = await compte(page);
    // Le retour du focus fait relire l'état, et la réponse arrive avant le relâchement.
    await page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
    const relecture = await prochaineDuType(page, 'lire-etat', avant);
    await envoyer(page, { ...messageDe('tokens-a-mettre-a-jour'), demande: relecture.demande });
    assert.equal(await presse.evaluate((bouton) => bouton.isConnected), true, 'le bouton pressé reste en place');
    await page.mouse.up();
    await page.locator(`#panneau-gestion .palette-depliable[data-palette="${ID_DU_JAUNE}"] [data-geste="mettre-a-jour"]:disabled`).waitFor();
    // L'état attendu s'affiche après le clic : la fiche se reconstruit, et le bouton pressé quitte le document.
    await page.waitForFunction((bouton) => !bouton.isConnected, presse);
  } finally {
    await page.close();
  }
});

const GROUPE_DU_TEXTE = { light: 'Texte des boutons du thème Light', dark: 'Texte des boutons du thème Dark' };
const FOND_DE_LA_PAGE = { light: 'Fond de la page, thème Light', dark: 'Fond de la page, thème Dark' };
// Light inversé ne change pas la 800 (0,42 des deux sens) : son message s'arrête à 700. Les nuances 500 à 800 sont les rangs 5 à 8 de la table des courbes (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950).
const LUMINOSITES = {
  light: { normal: ['0,67', '0,585', '0,5', '0,42'], inverse: ['0,745', '0,69', '0,61', '0,42'] },
  dark: { normal: ['0,49', '0,58', '0,67', '0,76'], inverse: ['0,45', '0,5', '0,55', '0,7'] },
};
const EFFET_DU_THEME = {
  light: 'Light inversé. Les nuances 500 à 700 passent à 0,745 · 0,69 · 0,61. Le bouton reste la 700 ; son survol et son appui vont vers la page : 600, 500.',
  dark: 'Dark inversé. Les nuances 500 à 800 passent à 0,45 · 0,50 · 0,55 · 0,70. Le bouton reste la 700 ; son survol et son appui vont vers la page : 600, 500.',
};
const EFFET_COMMUN = 'Le texte coloré et les contours montent d’une nuance. Les variables de ce thème passeront « À actualiser » dans Gestion.';

for (const [light, dark] of [['blanc', 'noir'], ['noir', 'noir'], ['blanc', 'blanc'], ['noir', 'blanc']]) {
  test(`[ENT-16] le texte des boutons ${light} en Light et ${dark} en Dark : segments, message d’effet, étiquettes, courbes et libellés des fonds`, async () => {
    const page = await ouvrirSur(`texte-des-boutons-${light}-${dark}`);
    try {
      await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
      const choix = { light, dark };
      const sens = { light: light === 'noir' ? 'inverse' : 'normal', dark: dark === 'blanc' ? 'inverse' : 'normal' };
      const inverses = ['light', 'dark'].filter((mode) => sens[mode] === 'inverse');
      const fonds = reglage(page, 'Couleurs de fond');
      for (const mode of ['light', 'dark']) {
        const groupe = fonds.getByRole('group', { name: GROUPE_DU_TEXTE[mode] });
        const pressees = await groupe.getByRole('button').evaluateAll((boutons) => boutons.map((bouton) => [bouton.textContent, bouton.getAttribute('aria-pressed')]));
        assert.deepEqual(pressees, [['Blanc', String(choix[mode] === 'blanc')], ['Noir', String(choix[mode] === 'noir')]], `segments du thème ${mode}`);
        assert.equal(await fonds.getByRole('textbox', { name: FOND_DE_LA_PAGE[mode] }).count(), 1);
      }
      // Le libellé de chaque fond porte son code, celui du texte des boutons le sien.
      const libelles = await fonds.locator('.entete-de-champ').evaluateAll((entetes) => entetes.map((entete) => entete.innerText.split('\n').filter(Boolean).join(' ')));
      assert.deepEqual(libelles.filter((libelle) => /Fond/.test(libelle)), ['Fond de la page, thème Light elevation/page', 'Fond de la page, thème Dark elevation/page']);
      assert.deepEqual(libelles.filter((libelle) => /Texte/.test(libelle)), ['Texte des boutons solid/foreground', 'Texte des boutons solid/foreground']);
      assert.equal(await fonds.getByText('Fond du thème').count(), 0);

      // Le message d'effet n'existe que si un thème est inversé : un paragraphe par thème (Dark d'abord), puis l'effet commun.
      const effet = fonds.locator('.effet-du-texte-des-boutons');
      assert.equal(await effet.getAttribute('role'), 'status');
      if (inverses.length === 0) assert.equal(await effet.isVisible(), false);
      else {
        assert.deepEqual(await effet.locator('p').allTextContents(), [...['dark', 'light'].filter((mode) => inverses.includes(mode)).map((mode) => EFFET_DU_THEME[mode]), EFFET_COMMUN]);
      }

      // La table des courbes : l'étiquette « inversé », les valeurs de 500 à 800 et celles qu'on cerne.
      const courbes = reglage(page, 'Luminosité des nuances');
      assert.deepEqual(await courbes.locator('.etiquette-de-ligne:visible').allTextContents(), inverses.map(() => 'inversé'));
      for (const mode of ['light', 'dark']) {
        const valeurs = await courbes.locator(`input[data-mode="${mode}"]`).evaluateAll((champs) => champs.slice(5, 9).map((champ) => [champ.value, champ.dataset.cerclee]));
        const attendues = LUMINOSITES[mode][sens[mode]].map((valeur, rang) => [valeur, String(sens[mode] === 'inverse' && valeur !== LUMINOSITES[mode].normal[rang])]);
        assert.deepEqual(valeurs, attendues, `courbe ${mode}`);
      }
      const resume = await courbes.locator('.carte-resume').textContent();
      if (inverses.length === 0) assert.doesNotMatch(resume, /inversée/);
      else assert.equal(resume, `Courbe inversée : ${inverses.map((mode) => (mode === 'light' ? 'Light' : 'Dark')).join(', ')}`);
    } finally {
      await page.close();
    }
  });
}

test('[ENT-16] une nuance réglée à la main demande une confirmation : Annuler ne change rien, Remplacer pose la courbe inversée', async () => {
  const page = await ouvrirSur('texte-des-boutons-confirmation');
  try {
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    const fonds = reglage(page, 'Couleurs de fond');
    const groupe = fonds.getByRole('group', { name: GROUPE_DU_TEXTE.light });
    const confirmation = fonds.locator('.confirmation');
    const pressee = async () => groupe.getByRole('button', { pressed: true }).textContent();
    const champ = page.locator('input[data-mode="light"][data-rang="7"]');
    const debut = await compte(page);
    await champ.fill('0,52');
    await champ.press('Tab');
    // Le sandbox range la valeur : sans cet accusé, l'interface attend et ne range pas la suite.
    await envoyer(page, rangee((await prochaine(page, debut)).demande));
    const avant = await compte(page);

    await groupe.getByRole('button', { name: 'Noir' }).click();
    assert.equal(await confirmation.isVisible(), true);
    assert.match(await confirmation.textContent(), /^Vos luminosités des nuances 500 à 800 en Light seront remplacées par celles de la courbe inversée\./);
    assert.equal(await pressee(), 'Blanc', 'rien n’est posé avant la confirmation');
    assert.equal(await compte(page), avant);

    await confirmation.getByRole('button', { name: 'Annuler' }).click();
    assert.equal(await confirmation.isVisible(), false);
    assert.equal(await pressee(), 'Blanc');
    assert.equal(await champ.inputValue(), '0,52');
    assert.equal(await compte(page), avant, 'Annuler ne range rien');

    await groupe.getByRole('button', { name: 'Noir' }).click();
    await confirmation.getByRole('button', { name: 'Remplacer' }).click();
    const rangement = await prochaine(page, avant);
    assert.equal(rangement.type, 'ranger-recette');
    assert.equal(rangement.recette.texteDesBoutons.light, 'noir');
    assert.deepEqual(rangement.recette.courbes.light.slice(5, 9), [0.745, 0.69, 0.61, 0.42]);
    assert.equal(await confirmation.isVisible(), false);
    assert.equal(await pressee(), 'Noir');
    assert.equal(await champ.inputValue(), '0,61');
  } finally {
    await page.close();
  }
});

/**
 * Le survol lié de l'aperçu en bandes ([UI-04], I13) : les classes que `nuancier.ts` pose, lues dans la surface.
 * `lie` marque une cible surlignée, `loupe` la surface qui atténue, `active` la bande du dossier survolé.
 */
const surlignage = (page) => page.locator('.nuancier-surface').evaluate((surface) => {
  const nuances = (selecteur) => [...surface.querySelectorAll(selecteur)].map((element) => element.dataset.cran);
  return {
    pastilles: [...surface.querySelectorAll('.nuancier-grille .pastille[data-cran].lie')].map((pastille) => `${pastille.dataset.profil} ${pastille.dataset.cran}`),
    petites: nuances('.rayure i[data-cran].lie'),
    codes: [...surface.querySelectorAll('.accolade-libelle [data-token].lie, .hors-rampe [data-token].lie')].map((code) => code.dataset.token).sort(),
    caseTiretee: surface.querySelector('.pastille-on-solid').classList.contains('lie'),
    petiteDuTexte: surface.querySelector('.rayure i[data-token="solid/foreground"]').classList.contains('lie'),
    specimens: [...surface.querySelectorAll('.specimen.lie')].map((specimen) => specimen.dataset.dossier),
    loupe: surface.classList.contains('loupe'),
    actives: [...surface.querySelectorAll('.bande.active')].map((bande) => bande.dataset.bande),
  };
});
const AUCUN_SURLIGNAGE = { pastilles: [], petites: [], codes: [], caseTiretee: false, petiteDuTexte: false, specimens: [], loupe: false, actives: [] };
const pastilleDeLApercu = (page, profil, cran) => page.locator(`.nuancier-grille .pastille[data-profil="${profil}"][data-cran="${cran}"]`);
/** Les variables que le thème normal donne à la 700, dans l'ordre du tri : `solid/default`, `page/foreground` et `page/border`. */
const CODES_DU_700_NORMAL = ['page/border', 'page/foreground', 'solid/default'];
/** Le pointeur quitte la surface : le survol s'efface. */
const quitterLApercu = (page) => page.mouse.move(0, 0);

test('[UI-04] I13 survoler ou focaliser une pastille surligne ses variables, sa petite pastille et le même cran dans l’autre intensité, puis tout s’efface', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE);
    const attendu = { ...AUCUN_SURLIGNAGE, pastilles: ['soft 700', 'vivid 700'], petites: ['700', '700', '700', '700'], codes: CODES_DU_700_NORMAL };
    await pastilleDeLApercu(page, 'soft', 700).hover();
    assert.deepEqual(await surlignage(page), attendu, 'survol');
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE, 'le pointeur part');
    await pastilleDeLApercu(page, 'vivid', 700).focus();
    assert.deepEqual(await surlignage(page), attendu, 'focus');
    await pastilleDeLApercu(page, 'vivid', 700).blur();
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE, 'le focus part');
    // Une nuance qu'aucune variable ne prend ne surligne rien : la 50.
    await pastilleDeLApercu(page, 'soft', 50).hover();
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE, 'la 50 n’a pas de variable');
  } finally {
    await page.close();
  }
});

test('[UI-04] I13 survoler une petite pastille d’une rayure surligne comme la pastille de son cran', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    await page.locator('.rayure i[data-cran="800"]').first().hover();
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, pastilles: ['soft 800', 'vivid 800'], petites: ['800', '800', '800', '800'], codes: ['solid/hover', 'surface/border', 'surface/foreground'] });
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE);
  } finally {
    await page.close();
  }
});

test('[UI-04] I13 survoler un code surligne ses pastilles dans chaque intensité et ses petites pastilles ; solid/foreground surligne la case tiretée, et la case surligne son code', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    await page.locator('.accolade-libelle [data-token="surface/hover"]').hover();
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, pastilles: ['soft 200', 'vivid 200'], petites: ['200', '200'], codes: ['surface/hover'] });
    await page.locator('.accolade-libelle [data-token="solid/foreground"]').hover();
    const texteDesBoutons = { ...AUCUN_SURLIGNAGE, codes: ['solid/foreground'], caseTiretee: true, petiteDuTexte: true };
    assert.deepEqual(await surlignage(page), texteDesBoutons, 'le code de solid/foreground');
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE);
    await page.locator('.pastille-on-solid').hover();
    assert.deepEqual(await surlignage(page), texteDesBoutons, 'la case tiretée');
  } finally {
    await page.close();
  }
});

test('[UI-04] I13 survoler un spécimen surligne les crans du dossier ; les autres pastilles passent à 0,3 et les autres bandes à 0,45', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    const opacites = () => page.locator('.nuancier-surface').evaluate((surface) => {
      const opacite = (selecteur) => getComputedStyle(surface.querySelector(selecteur)).opacity;
      return {
        surLaPastille: opacite('.pastille[data-profil="soft"][data-cran="800"]'),
        horsDuDossier: opacite('.pastille[data-profil="soft"][data-cran="700"]'),
        caseTiretee: opacite('.pastille-on-solid'),
        bandeActive: opacite('.bande[data-bande="surface"]'),
        autreBande: opacite('.bande[data-bande="solid"]'),
      };
    });
    assert.deepEqual(await opacites(), { surLaPastille: '1', horsDuDossier: '1', caseTiretee: '1', bandeActive: '1', autreBande: '1' });
    await page.locator('.specimen[data-dossier="surface"]').hover();
    const crans = [100, 200, 300, 800];
    assert.deepEqual(await surlignage(page), {
      ...AUCUN_SURLIGNAGE,
      pastilles: ['soft', 'vivid'].flatMap((profil) => crans.map((cran) => `${profil} ${cran}`)),
      // Les petites pastilles de ces crans, dans les deux intensités : surface/default, hover et pressed, puis foreground et border.
      petites: ['800', '800', '100', '200', '300', '100', '200', '300', '800', '800', '300', '300'],
      specimens: ['surface'],
      loupe: true,
      actives: ['surface'],
    });
    assert.deepEqual(await opacites(), { surLaPastille: '1', horsDuDossier: '0.3', caseTiretee: '1', bandeActive: '1', autreBande: '0.45' });
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), AUCUN_SURLIGNAGE);
    assert.deepEqual(await opacites(), { surLaPastille: '1', horsDuDossier: '1', caseTiretee: '1', bandeActive: '1', autreBande: '1' });
    await page.locator('.specimen[data-dossier="solid"]').hover();
    const solid = await surlignage(page);
    assert.deepEqual(solid.pastilles, ['soft', 'vivid'].flatMap((profil) => [700, 800, 900].map((cran) => `${profil} ${cran}`)));
    assert.deepEqual(solid.actives, ['solid']);
  } finally {
    await page.close();
  }
});

test('[UI-04] I13 la nuance choisie garde son surlignage, un survol le remplace le temps du survol, puis le choix revient ; Entrée et Espace choisissent comme le clic', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    const choisie = { ...AUCUN_SURLIGNAGE, pastilles: ['soft 700', 'vivid 700'], petites: ['700', '700', '700', '700'], codes: CODES_DU_700_NORMAL };
    await pastilleDeLApercu(page, 'vivid', 700).click();
    assert.equal(await pastilleDeLApercu(page, 'vivid', 700).getAttribute('aria-selected'), 'true');
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), choisie, 'le choix persiste quand le pointeur part');
    await pastilleDeLApercu(page, 'soft', 200).hover();
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, pastilles: ['soft 200', 'vivid 200'], petites: ['200', '200'], codes: ['surface/hover'] }, 'le survol remplace le choix');
    assert.equal(await pastilleDeLApercu(page, 'vivid', 700).getAttribute('aria-selected'), 'true', 'le choix reste posé pendant le survol');
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), choisie, 'le choix revient');
    // Le clavier choisit une autre nuance : Entrée, puis Espace.
    await pastilleDeLApercu(page, 'soft', 300).focus();
    await page.keyboard.press('Enter');
    await pastilleDeLApercu(page, 'soft', 300).blur();
    assert.equal(await pastilleDeLApercu(page, 'soft', 300).getAttribute('aria-selected'), 'true');
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, pastilles: ['soft 300', 'vivid 300'], petites: ['300', '300', '300', '300'], codes: ['page/divider', 'surface/pressed'] }, 'Entrée');
    await pastilleDeLApercu(page, 'vivid', 600).focus();
    await page.keyboard.press('Space');
    await pastilleDeLApercu(page, 'vivid', 600).blur();
    assert.equal(await pastilleDeLApercu(page, 'vivid', 600).getAttribute('aria-selected'), 'true');
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, pastilles: ['soft 600', 'vivid 600'], petites: ['600', '600'], codes: ['page/focus'] }, 'Espace');
    // La case tiretée choisie surligne `solid/foreground`.
    await page.locator('.pastille-on-solid').click();
    await quitterLApercu(page);
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, codes: ['solid/foreground'], caseTiretee: true, petiteDuTexte: true });
  } finally {
    await page.close();
  }
});

test('[UI-04] I3 I13 changer le thème affiché ou le texte des boutons déplace le surlignage selon la table du nouveau sens', async () => {
  const page = await ouvrirSur('palette-deux-intensites', PAR_DEFAUT);
  try {
    const crans700 = (codes, petites = 4) => ({ ...AUCUN_SURLIGNAGE, pastilles: ['soft 700', 'vivid 700'], petites: Array(petites).fill('700'), codes });
    const ordreDeSolid = () => page.locator('.bande[data-bande="solid"] .accolade-libelle:last-of-type .code-du-role').textContent();
    // Light blanc et Dark noir : le thème normal des deux côtés, la table ne bouge pas.
    await pastilleDeLApercu(page, 'soft', 700).click();
    assert.equal(await ordreDeSolid(), 'default · hover · pressed');
    await choisirLeTheme(page, 'Dark');
    assert.deepEqual(await surlignage(page), crans700(CODES_DU_700_NORMAL), 'Dark, texte noir : thème normal');
    assert.equal(await ordreDeSolid(), 'default · hover · pressed');
    // Dark passe au texte blanc : le thème est inversé, la 700 porte solid/default et page/focus, la 800 page/foreground et page/border.
    const avant = await compte(page);
    await page.getByRole('button', { name: 'Ouvrir les réglages communs' }).click();
    await reglage(page, 'Couleurs de fond').getByRole('group', { name: GROUPE_DU_TEXTE.dark }).getByRole('button', { name: 'Blanc' }).click();
    await envoyer(page, rangee((await prochaine(page, avant)).demande));
    await page.getByRole('button', { name: 'Retour aux palettes' }).click();
    await page.locator('#panneau-creation .nuancier-surface').waitFor();
    assert.deepEqual(await surlignage(page), crans700(['page/focus', 'solid/default']), 'Dark, texte blanc : thème inversé');
    assert.equal(await ordreDeSolid(), 'pressed · hover · default');
    await pastilleDeLApercu(page, 'soft', 800).hover();
    assert.deepEqual(await surlignage(page), { ...AUCUN_SURLIGNAGE, pastilles: ['soft 800', 'vivid 800'], petites: ['800', '800'], codes: ['page/border', 'page/foreground'] }, 'la 800 du thème inversé');
    await quitterLApercu(page);
    // Light garde son texte blanc : revenir à Light rend la table normale.
    await choisirLeTheme(page, 'Light');
    assert.deepEqual(await surlignage(page), crans700(CODES_DU_700_NORMAL), 'Light, texte blanc : thème normal');
    assert.equal(await ordreDeSolid(), 'default · hover · pressed');
  } finally {
    await page.close();
  }
});

test('[UI-12] I2 à 500 px, en français et en anglais, les bandes ne font pas défiler la page à l’horizontale, aucun libellé ne sort de la surface', async () => {
  for (const langue of ['fr', 'en']) {
    for (const id of ['palette-deux-intensites', 'apercu-une-intensite-dark-inverse', 'apercu-neutre']) {
      const page = await ouvrirSurEn(id, MINIMALE, langue);
      try {
        const mesures = await page.locator('.nuancier-surface').evaluate((surface) => {
          const limite = surface.getBoundingClientRect().right;
          return {
            page: document.documentElement.scrollWidth - window.innerWidth,
            surface: surface.scrollWidth - surface.clientWidth,
            bandes: surface.querySelector('.bandes').scrollWidth - surface.querySelector('.bandes').clientWidth,
            sorties: [...surface.querySelectorAll('.bande, .accolade-libelle, .specimen-case, .hors-rampe')]
              .filter((element) => element.getClientRects().length > 0)
              .map((element) => [element.className, element.getBoundingClientRect().right - limite])
              .filter(([, depasse]) => depasse > 0.5),
          };
        });
        const nom = `${langue}, ${id}`;
        assert.ok(mesures.page <= 0, `${nom} : la page défile de ${mesures.page} px`);
        assert.ok(mesures.surface <= 0, `${nom} : la surface déborde de ${mesures.surface} px`);
        assert.ok(mesures.bandes <= 0, `${nom} : les bandes débordent de ${mesures.bandes} px`);
        assert.deepEqual(mesures.sorties, [], `${nom} : des éléments sortent de la surface`);
      } finally {
        await page.close();
      }
    }
  }
});
