/**
 * Les interactions du domaine `ignores` : l'onglet À faire dans Figma, Ignorer, Ne plus ignorer et le clic sur une carte. Le panneau
 * n'écrit rien : il envoie `ignorer`, `ne-plus-ignorer` et `selectionner`, et sépare les constats ignorés de ceux de l'analyse
 * selon le message `ignores`. Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes
 * les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, envoyer, exiger, lancerLeNavigateur, ouvrirComposant } from './aide.mjs';

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
  await page.locator('#onglet-a-faire').click();
  return page;
}

const compte = (page) => page.locator('#onglet-a-faire .compte').textContent();
const cartes = (page) => page.locator('#panneau-a-faire .bloc-constat:not(.muette)');
const ignores = (constats, analyse = IDENTITE) => ({ type: 'ignores', analyse, constats });
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};

test('douze constats sous cinq intertitres, chacun de son type, et les constats ignorés en bas', async () => {
  const page = await ouvrirAFaire();
  try {
    assert.deepEqual(await page.locator('#panneau-a-faire .intertitre-structure h2').allTextContents(), ['Tokens', 'Variants', 'Contraste et accessibilité', 'Typographie et icônes', 'Visibilité', 'Ignorés']);
    assert.equal(await cartes(page).count(), 12);
    assert.equal(await compte(page), '12');
    assert.deepEqual(await cartes(page).locator('.gravite').allTextContents(), [
      'À corriger', 'À corriger', 'Bloquant', 'À vérifier', 'À vérifier', 'À vérifier', 'À corriger', 'À corriger', 'Information', 'À vérifier', 'À vérifier', 'À vérifier',
    ]);
    assert.equal(await page.locator('#panneau-a-faire .bloc.a-ton.ton-bloquant').count(), 1);
  } finally { await terminer(page); }
});

test('un chemin cité dans une phrase prend le style des chemins, et un variant s’écrit comme Figma le nomme', async () => {
  const page = await ouvrirAFaire();
  try {
    const stroke = cartes(page).nth(7);
    assert.equal((await stroke.locator('.bloc-phrase').innerText()), 'Le stroke de Variant=outlined manque de contraste sur la page.');
    assert.equal(await stroke.locator('.bloc-phrase .ch-variant').count(), 1);
    assert.equal(await cartes(page).nth(2).locator('.constat-lieu .ch-inline:not(.ch-variant)').innerText(), 'colors/info/filled/border');
    assert.equal(await cartes(page).first().locator('.bloc-phrase code.mot-cite').count(), 2);
  } finally { await terminer(page); }
});

test('les ignorés sont des cartes muettes, avec Ne plus ignorer', async () => {
  const page = await ouvrirAFaire();
  try {
    const muette = page.locator('#panneau-a-faire .bloc.muette');
    assert.equal(await muette.count(), 1);
    assert.match(await muette.innerText(), /Le stroke de Severity=error, Variant=outlined est plus fin que les autres\.\s*Ignoré dans ce fichier\. Ne plus ignorer/);
    assert.equal(await muette.locator('.bloc-bouton').evaluate((element) => element.tagName), 'DIV');
  } finally { await terminer(page); }
});

test('Ignorer envoie ignorer sous l’identité de l’analyse, et le message ignores range le constat avec les ignorés', async () => {
  const page = await ouvrirAFaire();
  try {
    await cartes(page).first().locator('.bloc-bouton').click();
    await page.getByRole('button', { name: /^Ignorer :/ }).click();
    const [envoi] = await attendreLesDemandes(page, 'ignorer');
    assert.deepEqual({ analyse: envoi.analyse, constat: envoi.constat, portee: envoi.portee }, { analyse: IDENTITE, constat: 'C44:rangement', portee: 'constat' });
    assert.equal(await cartes(page).count(), 12);
    await envoyer(page, ignores([ignore.id, 'C44:rangement']));
    assert.equal(await cartes(page).count(), 11);
    assert.equal(await compte(page), '11');
    assert.equal(await page.locator('#panneau-a-faire .bloc.muette').count(), 2);
  } finally { await terminer(page); }
});

test('Ne plus ignorer envoie ne-plus-ignorer et le message ignores rend le constat à sa section', async () => {
  const page = await ouvrirAFaire();
  try {
    await page.getByRole('button', { name: /^Ne plus ignorer :/ }).click();
    const [envoi] = await attendreLesDemandes(page, 'ne-plus-ignorer');
    assert.deepEqual({ analyse: envoi.analyse, constat: envoi.constat }, { analyse: IDENTITE, constat: ignore.id });
    await envoyer(page, ignores([]));
    assert.equal(await page.locator('#panneau-a-faire .bloc.muette').count(), 0);
    assert.equal(await cartes(page).count(), 13);
    assert.equal(await page.locator('#panneau-a-faire .intertitre-structure h2').last().innerText(), 'Visibilité');
  } finally { await terminer(page); }
});

test('une limite de lecture n’a pas de bouton Ignorer', async () => {
  const page = await ouvrirAFaire();
  try {
    const limite = cartes(page).nth(8);
    assert.equal(await limite.locator('.gravite').innerText(), 'Information');
    assert.equal(await limite.locator('button').count(), 0);
    assert.equal(await page.getByRole('button', { name: /^Ignorer : Le fill/ }).count(), 0);
  } finally { await terminer(page); }
});

test('ouvrir une carte qui porte des layers les sélectionne dans Figma et le dit sur la ligne grise', async () => {
  const avecLayers = { ...analyseDeQuestions, constats: constatsDeQuestions.map((constat) => (constat.id === 'C41:bordure' ? { ...constat, layers: ['alert:l:container'] } : constat)) };
  const page = await ouvrirAFaire(avecLayers);
  try {
    await cartes(page).nth(2).locator('.bloc-bouton').click();
    const [envoi] = await attendreLesDemandes(page, 'selectionner');
    assert.deepEqual({ analyse: envoi.analyse, layers: envoi.layers }, { analyse: IDENTITE, layers: ['alert:l:container'] });
    assert.match(await cartes(page).nth(2).locator('.constat-lieu').innerText(), /Sélectionnés dans Figma\.$/);
  } finally { await terminer(page); }
});

test('un message d’une autre identité d’analyse est ignoré', async () => {
  const page = await ouvrirAFaire();
  try {
    await envoyer(page, ignores([], { sujet: IDENTITE.sujet, generation: IDENTITE.generation + 1 }));
    await envoyer(page, ignores([], { sujet: 'autre', generation: IDENTITE.generation }));
    assert.equal(await page.locator('#panneau-a-faire .bloc.muette').count(), 1);
    assert.equal(await compte(page), '12');
  } finally { await terminer(page); }
});

test('une analyse périmée ne laisse ni Ignorer ni Ne plus ignorer', async () => {
  const page = await ouvrirAFaire();
  try {
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'selection' });
    assert.equal(await page.locator('#panneau-a-faire button').count(), 0);
    assert.equal(await page.locator('#panneau-a-faire').innerText(), 'Les constats datent d’avant le changement.');
    assert.deepEqual(await demandes(page, 'ignorer'), []);
  } finally { await terminer(page); }
});
