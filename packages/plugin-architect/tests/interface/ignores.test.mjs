/**
 * Les interactions du domaine `ignores` : les constats à faire dans Figma, Ignorer, Ne plus ignorer et le clic sur une carte. Le panneau
 * n'écrit rien : il envoie `ignorer`, `ne-plus-ignorer` et `selectionner`, et sépare les constats ignorés de ceux de l'analyse
 * selon le message `ignores`. Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes
 * les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, deplierLesSections, envoyer, exiger, lancerLeNavigateur, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { alertCorrections } = exiger('../../galerie/etats/corrections.cjs');
const { analyseDeQuestions, constatsDeQuestions, ignore, ignoresDeQuestions } = exiger('../../galerie/etats/questions.cjs');
const { IDENTITE } = exiger('../../galerie/composant/donnees.cjs');

const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

async function ouvrirAFaire(analyse = analyseDeQuestions) {
  const page = await ouvrirComposant(alertCorrections);
  await page.setViewportSize({ width: 1040, height: 760 });
  await envoyer(page, analyse);
  await envoyer(page, ignoresDeQuestions);
  await page.getByRole('button', { name: 'Constats' }).click();
  await deplierLesSections(page);
  return page;
}

/** Les points du panneau : la puce « Tout » les compte. */
const points = (page) => page.locator('.puce-element[data-element="tout"] .nombre').textContent();
const cartes = (page) => page.locator('.arch-laterale .bloc-constat:not(.muette)');
const enTete = (page) => page.locator('.en-tete-bloquants .bloc-constat');
const rangement = (page) => cartes(page).filter({ hasText: 'rangés sous' });
const ignores = (constats, analyse = IDENTITE) => ({ type: 'ignores', analyse, constats });
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};

test('douze constats à faire, chacun de son type, le Bloquant en tête hors des sections, et les constats ignorés en bas', async () => {
  const page = await ouvrirAFaire();
  try {
    assert.deepEqual(await page.locator('.arch-laterale .intertitre-structure h2').allTextContents(), ['Ignorés']);
    assert.equal(await cartes(page).count(), 12);
    assert.equal(await points(page), '23');
    const types = await cartes(page).locator('.gravite').allTextContents();
    const nombre = (type) => types.filter((candidat) => candidat === type).length;
    assert.deepEqual(['Bloquant', 'À corriger', 'À vérifier', 'Information'].map(nombre), [1, 4, 6, 1]);
    assert.equal(await page.locator('.arch-laterale .bloc.a-ton.ton-bloquant').count(), 1);
    assert.equal(await enTete(page).count(), 1);
    assert.equal(await page.locator('.section-element .bloc.ton-bloquant').count(), 0);
  } finally { await terminer(page); }
});

test('un chemin cité dans une phrase prend le style des chemins, et les variants se montrent en puces dans la ligne de lieu', async () => {
  const page = await ouvrirAFaire();
  try {
    const stroke = cartes(page).filter({ hasText: 'Le stroke manque de contraste sur la page.' });
    assert.equal((await stroke.locator('.bloc-phrase').innerText()), 'Le stroke manque de contraste sur la page.');
    assert.equal(await stroke.locator('.bloc-phrase .ch-variant').count(), 0);
    assert.equal(await stroke.locator('.constat-lieu').textContent(), '4 variantsoutlined, layer container');
    assert.equal(await stroke.locator('.constat-lieu .puce-valeur').getAttribute('title'), 'Variant=outlined');
    assert.equal(await enTete(page).locator('.constat-lieu .ch-inline:not(.ch-variant)').innerText(), 'colors/info/filled/border');
    assert.equal(await rangement(page).locator('.bloc-phrase code.mot-cite').count(), 2);
  } finally { await terminer(page); }
});

test('les ignorés sont des cartes muettes, avec Ne plus ignorer', async () => {
  const page = await ouvrirAFaire();
  try {
    const muette = page.locator('.arch-laterale .bloc.muette');
    assert.equal(await muette.count(), 1);
    assert.match(await muette.innerText(), /Le stroke de Severity=error, Variant=outlined est plus fin que les autres\.\s*Ignoré dans ce fichier\. Ne plus ignorer/);
    assert.equal(await muette.locator('.bloc-bouton').evaluate((element) => element.tagName), 'DIV');
  } finally { await terminer(page); }
});

test('Ignorer envoie ignorer sous l’identité de l’analyse, et le message ignores range le constat avec les ignorés', async () => {
  const page = await ouvrirAFaire();
  try {
    await rangement(page).locator('.bloc-bouton').click();
    await page.getByRole('button', { name: /^Ignorer :/ }).click();
    const [envoi] = await attendreLesDemandes(page, 'ignorer');
    assert.deepEqual({ analyse: envoi.analyse, constat: envoi.constat, portee: envoi.portee }, { analyse: IDENTITE, constat: 'C44:rangement', portee: 'constat' });
    assert.equal(await cartes(page).count(), 12);
    await envoyer(page, ignores([ignore.id, 'C44:rangement']));
    assert.equal(await cartes(page).count(), 11);
    assert.equal(await points(page), '22');
    assert.equal(await page.locator('.arch-laterale .bloc.muette').count(), 2);
  } finally { await terminer(page); }
});

test('Ne plus ignorer envoie ne-plus-ignorer et le message ignores rend le constat à sa section', async () => {
  const page = await ouvrirAFaire();
  try {
    await page.getByRole('button', { name: /^Ne plus ignorer :/ }).click();
    const [envoi] = await attendreLesDemandes(page, 'ne-plus-ignorer');
    assert.deepEqual({ analyse: envoi.analyse, constat: envoi.constat }, { analyse: IDENTITE, constat: ignore.id });
    await envoyer(page, ignores([]));
    assert.equal(await page.locator('.arch-laterale .bloc.muette').count(), 0);
    assert.equal(await cartes(page).count(), 13);
    assert.equal(await points(page), '24');
    assert.equal(await page.locator('.arch-laterale .intertitre-structure h2').count(), 0);
  } finally { await terminer(page); }
});

test('une limite de lecture n’a pas de bouton Ignorer', async () => {
  const page = await ouvrirAFaire();
  try {
    const limite = cartes(page).filter({ has: page.locator('.gravite', { hasText: 'Information' }) });
    assert.equal(await limite.locator('.gravite').innerText(), 'Information');
    assert.equal(await limite.locator('button').count(), 0);
    assert.equal(await page.getByRole('button', { name: /^Ignorer : Le fill/ }).count(), 0);
  } finally { await terminer(page); }
});

test('ouvrir une carte qui porte des layers les sélectionne dans Figma et le dit sur la ligne grise', async () => {
  const avecLayers = { ...analyseDeQuestions, constats: constatsDeQuestions.map((constat) => (constat.id === 'C41:bordure' ? { ...constat, layers: ['alert:l:container'] } : constat)) };
  const page = await ouvrirAFaire(avecLayers);
  try {
    await enTete(page).locator('.bloc-bouton').click();
    const [envoi] = await attendreLesDemandes(page, 'selectionner');
    assert.deepEqual({ analyse: envoi.analyse, layers: envoi.layers }, { analyse: IDENTITE, layers: ['alert:l:container'] });
    assert.match(await enTete(page).locator('.constat-lieu').innerText(), /Sélectionnés dans Figma\.$/);
  } finally { await terminer(page); }
});

test('un message d’une autre identité d’analyse est ignoré', async () => {
  const page = await ouvrirAFaire();
  try {
    await envoyer(page, ignores([], { sujet: IDENTITE.sujet, generation: IDENTITE.generation + 1 }));
    await envoyer(page, ignores([], { sujet: 'autre', generation: IDENTITE.generation }));
    assert.equal(await page.locator('.arch-laterale .bloc.muette').count(), 1);
    assert.equal(await points(page), '23');
  } finally { await terminer(page); }
});

test('une analyse périmée ne laisse ni Ignorer ni Ne plus ignorer', async () => {
  const page = await ouvrirAFaire();
  try {
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'selection' });
    assert.equal(await page.locator('.arch-laterale .liste button').count(), 0);
    assert.equal(await page.locator('.arch-laterale .liste').innerText(), 'Les constats datent d’avant le changement.');
    assert.deepEqual(await demandes(page, 'ignorer'), []);
  } finally { await terminer(page); }
});
