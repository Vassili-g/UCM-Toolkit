/**
 * Les interactions du domaine `questions` : répondre à une question du moteur, voir la correction qu'elle tire devenir une carte de
 * corrections de sa section, annuler la réponse. Le panneau n'écrit rien : il envoie `repondre` et `annuler-reponse`, et ne retient que ce que le sandbox rend.
 * Ces tests jouent des messages et des demandes que `fermer` ne connaît pas : ils vérifient eux-mêmes les erreurs de la page.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { attendreLesDemandes, deplierLesSections, envoyer, exiger, lancerLeNavigateur, ouvrirComposant } from './aide.mjs';

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
  await deplierLesSections(page);
  return page;
}

/** Les cartes de corrections de toutes les sections : celles qui ont une case. */
const correctionsDuPanneau = (page) => page.locator('.liste .bloc:has(> .bloc-tete > input.case)');
const demandes = async (page, type) => {
  await page.waitForTimeout(30);
  return page.evaluate((cherche) => window.demandes.filter((demande) => demande.type === cherche), type);
};
const cartes = (page) => page.locator('.arch-laterale .question');
const reponses = (page) => page.evaluate(() => window.demandes.filter((demande) => demande.type === 'repondre').map(({ analyse, question, reponse }) => ({ analyse, question, reponse })));

test('une carte par question, au modèle d’À trancher ; aucun candidat n’est choisi avant le clic', async () => {
  const page = await ouvrirLesQuestions();
  try {
    assert.equal(await cartes(page).count(), 2);
    const premiere = cartes(page).first();
    assert.equal(await premiere.locator('.question-titre').innerText(), 'Lier title à colors/info/standard/title ?');
    assert.deepEqual(await premiere.locator('.question-pied button').allInnerTexts(), ['Lier', 'Lier à …/foreground', 'Sélectionner', 'Plus tard']);
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

test('la réponse du sandbox montre le résultat, ajoute la correction à sa section et compte une question de moins', async () => {
  const page = await ouvrirLesQuestions();
  try {
    assert.equal(await correctionsDuPanneau(page).count(), 4);
    const pointsDeCouleurs = await page.locator('.puce-element[data-element="couleurs"] .nombre').textContent();
    await envoyer(page, repondue());
    assert.equal(await page.locator('.arch-laterale .resultat').innerText().then((texte) => texte.replace(/\s+/g, ' ').trim()), '✓ title sera lié à colors/info/standard/title. Appliquez-le avec les corrections de cette section.');
    assert.deepEqual(await page.locator('.resultat + .constat-actions .btn-texte').allInnerTexts(), ['Annuler la réponse']);
    assert.equal(await cartes(page).count(), 1);
    assert.equal(await correctionsDuPanneau(page).count(), 5);
    // La question répondue reste un point : sa correction est celle du même constat.
    assert.equal(await page.locator('.puce-element[data-element="couleurs"] .nombre').textContent(), pointsDeCouleurs);
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
    assert.equal(await page.locator('.arch-laterale .resultat').count(), 0);
    assert.equal(await correctionsDuPanneau(page).count(), 4);
  } finally { await terminer(page); }
});

test('une réponse que le sandbox refuse laisse la carte où elle est', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, { type: 'question-repondue', analyse: IDENTITE, question: QUESTION, correction: null });
    assert.equal(await cartes(page).count(), 2);
    assert.equal(await correctionsDuPanneau(page).count(), 4);
  } finally { await terminer(page); }
});

test('un message d’une autre identité d’analyse est ignoré', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, repondue({ sujet: IDENTITE.sujet, generation: IDENTITE.generation + 1 }));
    await envoyer(page, { ...repondue(), analyse: { sujet: 'autre', generation: IDENTITE.generation } });
    assert.equal(await page.locator('.arch-laterale .resultat').count(), 0);
    assert.equal(await cartes(page).count(), 2);
    assert.equal(await correctionsDuPanneau(page).count(), 4);
  } finally { await terminer(page); }
});

const dePlusieurs = (calque) => ({
  id: `C15:${calque}`, code: 'C15', type: 'corriger', famille: 'liaisons', variants: ['Severity=info, Variant=standard'], layers: [`alert:l:${calque}`],
  faits: { calque, champ: 'fills' }, question: { id: `q:C15:${calque}`, candidats: [{ cle: `cle-${calque}`, nom: `alert/colors/info/standard/${calque}` }] },
});

test('Plus tard range la carte en fin de liste de sa section, sans rien envoyer', async () => {
  const page = await ouvrirLesQuestions({ ...analyseDeQuestions, constats: ['title', 'icon'].map(dePlusieurs) });
  try {
    const avant = await cartes(page).locator('.question-titre').allInnerTexts();
    assert.equal(avant.length, 2);
    await cartes(page).first().getByRole('button', { name: /^Plus tard :/ }).click();
    assert.deepEqual(await cartes(page).locator('.question-titre').allInnerTexts(), [...avant].reverse());
    assert.deepEqual(await demandes(page, 'repondre'), []);
  } finally { await terminer(page); }
});

test('une analyse périmée ne laisse aucune réponse à donner', async () => {
  const page = await ouvrirLesQuestions();
  try {
    await envoyer(page, { type: 'perime', analyse: IDENTITE, cause: 'selection' });
    assert.equal(await page.locator('.arch-laterale .liste button').count(), 0);
    assert.equal(await page.locator('.arch-laterale .liste').innerText(), 'Les constats datent d’avant le changement.');
    assert.deepEqual(await demandes(page, 'repondre'), []);
  } finally { await terminer(page); }
});

const procheDe = (variant) => ({
  id: `C29:${variant}:fond:cornerRadius:13`, code: 'C29', type: 'corriger', famille: 'tailles', variants: [variant], layers: ['alert:l:container'],
  faits: { calque: 'container', champ: 'cornerRadius', valeur: 13, proche: 1 },
  question: { id: `q:C29:${variant}`, candidats: [{ cle: 'r12', nom: 'alert/radius/12', valeur: 12 }, { cle: 'r14', nom: 'alert/radius/14', valeur: 14 }] },
});
const analyseDeProches = { ...analyseDeQuestions, constats: ['Severity=info, Variant=standard', 'Severity=error, Variant=standard'].map(procheDe) };

test('une question de token proche : un bouton de même poids par candidat, une seule carte pour deux variants, une réponse par question', async () => {
  const page = await ouvrirLesQuestions(analyseDeProches);
  try {
    assert.equal(await cartes(page).count(), 1);
    assert.equal(await cartes(page).locator('.question-titre').innerText(), 'Le radius de container vaut 13 px. Aucun token radius ne vaut cette valeur.');
    assert.deepEqual(await cartes(page).locator('.question-pied button').allInnerTexts(), ['Adopter 12 px (−1 px)', 'Adopter 14 px (+1 px)', 'Sélectionner', 'Plus tard']);
    assert.deepEqual(await cartes(page).locator('.question-candidat-token').allInnerTexts(), ['radius/12', 'radius/14']);
    assert.match(await cartes(page).innerText(), /Répondre pour les 2 variants/);
    await cartes(page).getByRole('button', { name: /^Adopter 14 px/ }).click();
    await attendreLesDemandes(page, 'repondre', 2);
    assert.deepEqual((await reponses(page)).map(({ question, reponse }) => [question, reponse]), [
      ['q:C29:Severity=info, Variant=standard', 'r14'], ['q:C29:Severity=error, Variant=standard', 'r14'],
    ]);
  } finally { await terminer(page); }
});
