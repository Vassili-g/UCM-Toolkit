/**
 * Les interactions du domaine `questions` : répondre à une question du moteur, voir la correction qu'elle tire passer dans Corrections,
 * annuler la réponse. Le panneau n'écrit rien : il envoie `repondre` et `annuler-reponse`, et ne retient que ce que le sandbox rend.
 * Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, envoyer, exiger, lancerLeNavigateur, ouvrirComposant } from './aide.mjs';

lancerLeNavigateur();
const { alertCorrections } = exiger('../../galerie/etats/corrections.cjs');
const { analyseDeQuestions, ignoresDeQuestions } = exiger('../../galerie/etats/questions.cjs');
const { IDENTITE } = exiger('../../galerie/composant/donnees.cjs');

const QUESTION = 'q:C15:title';
const correction = {
  id: QUESTION, sorte: 'liaison', cible: { layer: 'alert:l:title', champ: 'fills' }, avant: null, apres: { cle: 'cle-title', nom: 'alert/colors/info/standard/title' },
  aRelire: { axes: { Severity: 'info', Variant: 'standard' }, regle: 'Le designer a choisi ce token parmi les candidats du moteur.', avant: null },
};
const repondue = (surLIdentite = IDENTITE) => ({ type: 'question-repondue', analyse: surLIdentite, question: QUESTION, correction });

const terminer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

async function ouvrirLesQuestions(analyse = analyseDeQuestions) {
  const page = await ouvrirComposant(alertCorrections);
  await page.setViewportSize({ width: 1040, height: 760 });
  await envoyer(page, analyse);
  await envoyer(page, ignoresDeQuestions);
  await page.getByRole('button', { name: 'Constats' }).click();
  await page.locator('#onglet-questions').click();
  return page;
}

const compte = (page, onglet) => page.locator(`#onglet-${onglet} .compte`).textContent();
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};
const cartes = (page) => page.locator('#panneau-questions .question');
const reponses = (page) => page.evaluate(() => window.demandes.filter((demande) => demande.type === 'repondre').map(({ analyse, question, reponse }) => ({ analyse, question, reponse })));

test('une carte par question, au modèle d’À trancher ; aucun candidat n’est choisi avant le clic', async () => {
  const page = await ouvrirLesQuestions();
  try {
    assert.equal(await cartes(page).count(), 2);
    assert.equal(await compte(page, 'questions'), '2');
    const premiere = cartes(page).first();
    assert.equal(await premiere.locator('.question-titre').innerText(), 'Lier title à colors/info/standard/title ?');
    assert.deepEqual(await premiere.locator('.question-pied button').allInnerTexts(), ['Lier', 'Lier à …/foreground', 'Plus tard']);
    assert.equal(await cartes(page).nth(1).locator('.question-titre').innerText(), 'Renommer Outlined en outline ?');
    assert.equal(await cartes(page).nth(1).locator('.origine').innerText(), 'Variant');
    assert.deepEqual(await demandes(page, 'repondre'), []);
  } finally { await terminer(page); }
});

test('Lier envoie repondre sous l’identité de l’analyse, avec la clé du candidat', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await cartes(page).first().getByRole('button', { name: /^Lier :/ }).click();
    assert.deepEqual(await attendreLesDemandes(page, 'repondre').then(() => reponses(page)), [{ analyse: IDENTITE, question: QUESTION, reponse: 'cle-title' }]);
  } finally { await terminer(page); }
});

test('un autre candidat a son bouton, et une question de nom répond par le nom du candidat', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await cartes(page).first().getByRole('button', { name: /^Lier à …\/foreground/ }).click();
    await cartes(page).nth(1).getByRole('button', { name: /^Renommer :/ }).click();
    await attendreLesDemandes(page, 'repondre', 2);
    assert.deepEqual((await reponses(page)).map(({ question, reponse }) => [question, reponse]), [[QUESTION, 'cle-foreground'], ['q:C12:outlined', 'outline']]);
  } finally { await terminer(page); }
});

test('la réponse du sandbox montre le résultat, passe la correction dans Corrections et compte une question de moins', async () => {
  const page = await ouvrirLesQuestions();
  try {
    assert.equal(await compte(page, 'corrections'), '4');
    await envoyer(page, repondue());
    assert.equal(await page.locator('#panneau-questions .resultat').innerText().then((texte) => texte.replace(/\s+/g, ' ').trim()), '✓ title sera lié à colors/info/standard/title. Appliquez-le dans l’onglet Corrections.');
    assert.deepEqual(await page.locator('#panneau-questions .constat-actions .btn-texte').allInnerTexts(), ['Ouvrir Corrections', 'Annuler la réponse']);
    assert.equal(await cartes(page).count(), 1);
    assert.equal(await compte(page, 'questions'), '1');
    assert.equal(await compte(page, 'corrections'), '5');
    await page.getByRole('button', { name: 'Ouvrir Corrections' }).click();
    assert.equal(await page.locator('#onglet-corrections').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#panneau-corrections .liste .bloc').count(), 5);
  } finally { await terminer(page); }
});

test('Annuler la réponse envoie annuler-reponse ; la réponse sans correction rend la carte et retire la carte de Corrections', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, repondue());
    await page.getByRole('button', { name: /^Annuler la réponse à/ }).click();
    const [envoi] = await attendreLesDemandes(page, 'annuler-reponse');
    assert.deepEqual({ analyse: envoi.analyse, question: envoi.question }, { analyse: IDENTITE, question: QUESTION });
    await envoyer(page, { type: 'question-repondue', analyse: IDENTITE, question: QUESTION, correction: null });
    assert.equal(await cartes(page).count(), 2);
    assert.equal(await page.locator('#panneau-questions .resultat').count(), 0);
    assert.equal(await compte(page, 'questions'), '2');
    assert.equal(await compte(page, 'corrections'), '4');
  } finally { await terminer(page); }
});

test('une réponse que le sandbox refuse laisse la carte où elle est', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, { type: 'question-repondue', analyse: IDENTITE, question: QUESTION, correction: null });
    assert.equal(await cartes(page).count(), 2);
    assert.equal(await compte(page, 'corrections'), '4');
  } finally { await terminer(page); }
});

test('un message d’une autre identité d’analyse est ignoré', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, repondue({ sujet: IDENTITE.sujet, generation: IDENTITE.generation + 1 }));
    await envoyer(page, { ...repondue(), analyse: { sujet: 'autre', generation: IDENTITE.generation } });
    assert.equal(await page.locator('#panneau-questions .resultat').count(), 0);
    assert.equal(await compte(page, 'questions'), '2');
    assert.equal(await compte(page, 'corrections'), '4');
  } finally { await terminer(page); }
});

test('Plus tard range la carte en fin de liste, sans rien envoyer', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await cartes(page).first().getByRole('button', { name: /^Plus tard :/ }).click();
    assert.deepEqual(await cartes(page).locator('.question-titre').allInnerTexts(), ['Renommer Outlined en outline ?', 'Lier title à colors/info/standard/title ?']);
    assert.equal(await compte(page, 'questions'), '2');
    assert.deepEqual(await demandes(page, 'repondre'), []);
  } finally { await terminer(page); }
});

test('une analyse périmée ne laisse aucune réponse à donner', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'selection' });
    assert.equal(await page.locator('#panneau-questions button').count(), 0);
    assert.equal(await page.locator('#panneau-questions').innerText(), 'Les constats datent d’avant le changement.');
    assert.deepEqual(await demandes(page, 'repondre'), []);
  } finally { await terminer(page); }
});
