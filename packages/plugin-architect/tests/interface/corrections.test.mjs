/**
 * Les interactions du domaine `corrections` : cocher, Appliquer sur une carte et Appliquer tout, la sélection d'un constat,
 * l'écriture en cours, la ligne de réussite et le Ctrl+Z. Le panneau n'écrit rien lui-même : il envoie `appliquer-corrections` et `selectionner`.
 * Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lancerLeNavigateur, envoyer, exiger, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { alertCorrections, alertModele, analyseCorrections, analyseModele, aucunIgnore, lot, lesIds, ICON, CONTAINER } = exiger('../../galerie/etats/corrections.cjs');
const { IDENTITE } = exiger('../../galerie/composant/donnees.cjs');

const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

async function ouvrirLePanneau(analyse = analyseCorrections, lecture = alertCorrections) {
  const page = await ouvrirComposant(lecture);
  await page.setViewportSize({ width: 1040, height: 760 });
  await envoyer(page, analyse);
  await envoyer(page, aucunIgnore);
  await page.getByRole('button', { name: 'Constats' }).click();
  // Couleurs a 18 points : sa section est repliée à l'arrivée. Ses deux cartes de corrections se lisent après le clic.
  await page.locator('.section-element[data-element="couleurs"] .bande-element').click();
  return page;
}
/** Les cartes de corrections : celles qui ont une case, hors des constats à faire dans Figma. */
const CARTES = '.liste .bloc:has(> .bloc-tete > input.case)';
const cartes = (page) => page.locator(CARTES);
const appliquerLaCarte = (page, element) => page.locator(`.section-element[data-element="${element}"] .appliquer-carte`).first();

/** Les demandes de l'interface au sandbox : l'envoi se relève un instant après le geste. */
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};
const texteDuPanneau = (page) => page.locator('.arch-laterale').innerText();
/** « Appliquer tout », dans le pied. */
const appliquer = (page) => page.locator('.corrections-pied .btn-primary');
const pied = (page) => page.locator('.corrections-resume').innerText();

test('quatre cartes rangées par élément, toutes cochées, et un pied qui compte layers et instances', async () => {
  const page = await ouvrirLePanneau();
  try {
    assert.deepEqual(await page.locator('.section-element .titre').allTextContents(), ['Couleurs', 'Tailles et forme', 'Tokens du composant', 'Règles d’utilisation', 'Texte', 'Variants et layers', 'Accessibilité']);
    assert.equal(await page.locator('.onglets').count(), 0);
    assert.equal(await cartes(page).count(), 4);
    assert.equal(await page.locator(`${CARTES} > .bloc-tete > input.case:checked`).count(), 4);
    assert.equal(await pied(page), '4 corrections cochées, 8 layers, 1 instance');
    assert.equal(await appliquer(page).isEnabled(), true);
    assert.equal(await appliquer(page).innerText(), 'Appliquer tout');
  } finally { await terminer(page); }
});

test('Appliquer sur une carte n’écrit que ses lignes cochées ; Appliquer tout écrit tout le coché, même ce que l’élément choisi cache', async () => {
  const page = await ouvrirLePanneau();
  try {
    await appliquerLaCarte(page, 'tailles').click();
    const premiere = await demandes(page, 'appliquer-corrections');
    assert.equal(premiere.length, 1);
    assert.deepEqual(premiere[0].analyse, IDENTITE);
    assert.deepEqual([...premiere[0].ids].sort(), ['cor:padding-x', 'cor:padding-y']);
    await envoyer(page, { type: 'occupe', analyse: IDENTITE });

    await page.locator('.puce-element[data-element="tailles"]').click();
    assert.equal(await pied(page), '4 corrections cochées, dont 1 dans Tailles et forme, 8 layers, 1 instance');
    await appliquer(page).click();
    const toutes = await demandes(page, 'appliquer-corrections');
    assert.deepEqual([...toutes[1].ids].sort(), [...lesIds].sort());
  } finally { await terminer(page); }
});

test('Appliquer n’envoie que les corrections cochées, sous l’identité de l’analyse, et le pied se recompte', async () => {
  const page = await ouvrirLePanneau();
  try {
    // La première carte est ouverte : sa première ligne, celle de l'icône, se décoche.
    await cartes(page).first().locator('.diff input.case').first().uncheck();
    assert.equal(await pied(page), '4 corrections cochées, 7 layers, 1 instance');
    assert.equal(await cartes(page).first().locator('.bloc-tete input.case').evaluate((caseACocher) => caseACocher.indeterminate), true);
    await appliquer(page).click();
    const envoyees = await demandes(page, 'appliquer-corrections');
    assert.equal(envoyees.length, 1);
    assert.deepEqual(envoyees[0].analyse, IDENTITE);
    assert.deepEqual([...envoyees[0].ids].sort(), lesIds.filter((id) => id !== 'cor:icon').sort());
  } finally { await terminer(page); }
});

test('décocher une carte entière retire ses lignes du lot et rend le pied à « aucune »', async () => {
  const page = await ouvrirLePanneau();
  try {
    for (const carte of await page.locator(`${CARTES} > .bloc-tete > input.case`).all()) await carte.uncheck();
    assert.equal(await pied(page), 'Aucune correction cochée.');
    assert.equal(await appliquer(page).isDisabled(), true);
    assert.deepEqual(await demandes(page, 'appliquer-corrections'), []);
  } finally { await terminer(page); }
});

test('la vue Composant montre en vert les liaisons cochées et les reprend quand on les décoche', async () => {
  const page = await ouvrirLePanneau();
  try {
    const icone = page.locator("[data-focus^='ligne:components/alert/colors/info/standard/icon']");
    assert.match(await icone.innerText(), /colors\/success\/standard\/icon/);
    assert.equal(await icone.locator('.ch-ajout').count() > 0, true);
    await cartes(page).first().locator('.diff input.case').first().uncheck();
    assert.match(await icone.innerText(), /colors\/info\/standard\/icon/);
  } finally { await terminer(page); }
});

test('ouvrir une carte sélectionne ses layers dans Figma et les entoure d’un trait de 1 px dans l’aperçu, jusqu’à la sélection suivante', async () => {
  const page = await ouvrirLePanneau();
  try {
    assert.equal(await page.locator('.vc-cadre-selection').count(), 0);
    const premiere = cartes(page).first().locator('.bloc-bouton');
    await premiere.click();
    await premiere.click();
    const envoyees = await demandes(page, 'selectionner');
    assert.equal(envoyees.length, 1);
    assert.deepEqual(envoyees[0].analyse, IDENTITE);
    assert.deepEqual([...envoyees[0].layers].sort(), [ICON, CONTAINER].sort());
    assert.match(await page.locator('.constat-selection').textContent(), /Sélectionnés dans Figma\./);
    assert.equal(await page.locator('.vc-cadre-selection').count(), 2);
    assert.equal(await page.locator('.vc-cadre-selection').first().evaluate((cadre) => getComputedStyle(cadre).outlineWidth), '1px');
    // L'écho du sandbox ne change pas la vue ; la sélection du designer dans Figma retire les cadres.
    await envoyer(page, { type: 'selection', sujet: { id: alertCorrections.sujet.id, portee: ICON }, ignores: 1, origine: 'plugin' });
    assert.equal(await page.locator('.vc-cadre-selection').count(), 2);
    await envoyer(page, { type: 'selection', sujet: { id: alertCorrections.sujet.id, portee: alertCorrections.sujet.id }, ignores: 0, origine: 'figma' });
    assert.equal(await page.locator('.vc-cadre-selection').count(), 0);
  } finally { await terminer(page); }
});

test('« Ne plus proposer » range la proposition de chaque constat de la carte', async () => {
  const page = await ouvrirLePanneau();
  try {
    const premiere = cartes(page).first().locator('.bloc-bouton');
    await premiere.click();
    await premiere.click();
    await page.getByRole('button', { name: 'Ne plus proposer pour ces 2 layers' }).click();
    const envoyees = await demandes(page, 'ignorer');
    assert.deepEqual(envoyees.map(({ constat, portee }) => [constat, portee]), [['C16:8', 'proposition'], ['C16:9', 'proposition']]);
    assert.ok(envoyees.every((demande) => demande.analyse.sujet === IDENTITE.sujet && demande.analyse.generation === IDENTITE.generation));
  } finally { await terminer(page); }
});

test('pendant l’écriture, Appliquer est inactif et rien ne repart ; une réponse d’une autre analyse est ignorée', async () => {
  const page = await ouvrirLePanneau();
  try {
    await appliquer(page).click();
    assert.match(await texteDuPanneau(page), /Écriture de 8 liaisons en cours\./);
    assert.equal(await appliquer(page).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Actualiser' }).isDisabled(), true);
    assert.equal((await demandes(page, 'appliquer-corrections')).length, 1);
    await envoyer(page, { ...lot, analyse: { sujet: 'autre-jeu', generation: 1 } });
    assert.match(await texteDuPanneau(page), /Écriture de 8 liaisons en cours\./);
  } finally { await terminer(page); }
});

test('un plugin occupé rend la liste et un Appliquer actif, sans rien écrire', async () => {
  const page = await ouvrirLePanneau();
  try {
    await appliquer(page).click();
    await envoyer(page, { type: 'occupe', analyse: IDENTITE });
    assert.doesNotMatch(await texteDuPanneau(page), /Écriture de/);
    assert.equal(await cartes(page).count(), 4);
    assert.equal(await appliquer(page).isEnabled(), true);
  } finally { await terminer(page); }
});

test('après l’écriture : la ligne de réussite et Ctrl+Z, puis, après un Ctrl+Z, plus que le constat du changement', async () => {
  const page = await ouvrirLePanneau();
  try {
    await appliquer(page).click();
    await envoyer(page, lot);
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'ecriture' });
    const texte = await texteDuPanneau(page);
    assert.match(texte, /Le composant a changé depuis l’analyse\./);
    assert.match(texte, /✓ 8 layers liés, 1 instance de règles créée/);
    assert.match(texte, /Ctrl\+Z dans Figma défait ce lot\./);
    assert.equal(await page.locator('.sommaire-elements').count(), 0);
    assert.equal(await page.locator('.section-element').count(), 0);
    assert.equal(await page.locator('.corrections-pied').count(), 0);

    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'document' });
    const apres = await texteDuPanneau(page);
    assert.doesNotMatch(apres, /Ctrl\+Z dans Figma défait ce lot/);
    assert.match(apres, /Les constats datent d’avant le changement\./);
    assert.deepEqual(await demandes(page, 'analyser'), [], 'le panneau ne relance rien');
  } finally { await terminer(page); }
});

test('les corrections sautées s’annoncent avec leur motif, dans la ligne de réussite du sandbox', async () => {
  const page = await ouvrirLePanneau();
  try {
    await appliquer(page).click();
    const resume = '7 layers liés, 1 instance de règles créée. 1 correction sautée : 1 car le layer n’existe plus.';
    await envoyer(page, { type: 'corrections-appliquees', analyse: IDENTITE, ecrites: 8, sautees: [{ id: 'cor:icon', motif: 'layer-absent' }], resume });
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'ecriture' });
    assert.match(await texteDuPanneau(page), /1 correction sautée : 1 car le layer n’existe plus\./);
  } finally { await terminer(page); }
});

test('une carte de modèle copie les liaisons du variant affiché ; Appliquer envoie ses lignes', async () => {
  const page = await ouvrirLePanneau(analyseModele, alertModele);
  try {
    assert.match(await cartes(page).first().locator('.bloc-pile').innerText(), /Copier les liaisons de\s+Severity=info, Variant=standard/);
    assert.match(await cartes(page).first().locator('.meta').innerText(), /3 variants, 3 liaisons exactes, 3 cas dans Questions/);
    assert.equal(await pied(page), '3 liaisons cochées');
    assert.deepEqual(await cartes(page).first().locator('.diff .chemin-apres').allInnerTexts(), ['colors/error/outlined/icon', 'colors/warning/standard/background', 'colors/success/filled/icon'].map((nom) => `→ ${nom}`).map((nom) => nom.replace('→ ', '')));
    await appliquer(page).click();
    assert.equal((await demandes(page, 'appliquer-corrections'))[0].ids.length, 3);
  } finally { await terminer(page); }
});
