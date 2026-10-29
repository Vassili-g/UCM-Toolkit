/**
 * Le bouton Sélectionner des cartes du panneau des constats, monté sur le DOM réduit : la ligne d'actions d'une carte de constat, le corps
 * déplié d'une carte de correction, la ligne d'une question. Après le clic le bouton dit « Sélectionnés » et se désactive, jusqu'à ce que
 * la sélection de Figma change ; ouvrir une carte ne sélectionne rien.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import { monterLePanneau, type PanneauDesConstats } from '../src/ui/analyse';
import type { AnalyseRecue } from '../src/ui/composant/analyse';

const { constatsDeQuestions } = require('../galerie/etats/questions.cjs') as { constatsDeQuestions: Constat[] };
const { alertCorrections } = require('../galerie/etats/corrections.cjs') as { alertCorrections: { sujet: { nom: string; variants: Array<{ id: string; nom: string }> } } };

const BORDURE = 'C41:bordure';
const CONTAINER = 'alert:l:container';

interface Banc {
  panneau: PanneauDesConstats;
  racine: ElementDeTest;
  /** Les layers de chaque appel à `app.selectionner`, dans l'ordre. */
  selections: Array<readonly string[]>;
}

function monter(constats: readonly Constat[] = constatsDeQuestions.map((constat) => (constat.id === BORDURE ? { ...constat, layers: [CONTAINER] } : constat)), surcharge: Partial<AnalyseRecue> = {}): Banc {
  const selections: Banc['selections'] = [];
  const analyse = {
    identite: { sujet: 'Alert', generation: 1 }, statut: 'complete', constats, tous: constats, ignores: [], repondues: {}, variants: alertCorrections.sujet.variants, lecture: null, sansTokens: false,
    progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: 0, ...surcharge,
  } as unknown as AnalyseRecue;
  const etat = { composant: { lecture: alertCorrections }, analyse, architecture: null, reference: null, panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' } };
  const app = {
    etat, selectionner: (layers: readonly string[]) => selections.push(layers),
    appliquer() {}, ignorerLaProposition() {}, repondre() {}, ignorer() {}, nePlusIgnorer() {}, ouvrirLaConfiguration() {}, rendre() {}, annulerLaReponse() {},
  };
  const panneau = monterLePanneau(app as never, { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} } as never);
  panneau.mettreAJour();
  return { panneau, racine: comme(panneau.element), selections };
}

const choisir = (banc: Banc, id: string): void => {
  const puce = banc.racine.querySelectorAll('.puce-element').find((candidate) => candidate.dataset.element === id);
  comme(puce).clic();
};
/** La carte de constat à faire qui vise le container : le Bloquant, en tête de « Tout ». */
const carteDeConstat = (banc: Banc): ElementDeTest => comme(banc.racine.querySelector('.en-tete-bloquants .bloc-constat'));
const boutonDe = (carte: ElementDeTest): ElementDeTest => comme(carte.querySelector('.bouton-selectionner'));

test('une carte de constat qui vise des layers a son bouton Sélectionner dans une ligne d’actions sous le texte, et le chevron reste dans l’en-tête', () => {
  const carte = carteDeConstat(monter());
  const ligne = comme(carte.querySelector('.bloc-actions'));
  assert.equal(carte.children[carte.children.length - 1], ligne, 'la ligne est la dernière de la carte');
  assert.equal(ligne.parent, carte);
  const bouton = boutonDe(carte);
  assert.equal(bouton.parent, ligne);
  assert.equal(bouton.textContent, 'Sélectionner');
  assert.equal(bouton.disabled, false);
  assert.ok(bouton.querySelector('.signe'), 'le signe de la sélection de Figma');
  assert.match(bouton.getAttribute('aria-label') ?? '', /^Sélectionner : /);
  const tete = comme(carte.querySelector('.bloc-tete'));
  assert.ok(tete.querySelector('.bloc-droite .chevron-svg'), 'le chevron est en haut à droite, dans l’en-tête');
  assert.equal(ligne.querySelector('.chevron-svg'), null);
});

test('une carte de constat sans layer n’a ni bouton ni ligne d’actions', () => {
  const carte = carteDeConstat(monter(constatsDeQuestions));
  assert.equal(carte.querySelector('.bouton-selectionner'), null);
  assert.equal(carte.querySelector('.bloc-actions'), null);
});

test('le clic envoie les layers de la carte, puis le bouton dit « Sélectionnés » et se désactive', () => {
  const banc = monter();
  boutonDe(carteDeConstat(banc)).clic();
  assert.deepEqual(banc.selections, [[CONTAINER]]);
  const bouton = boutonDe(carteDeConstat(banc));
  assert.equal(bouton.textContent, 'Sélectionnés');
  assert.equal(bouton.disabled, true);
  assert.match(bouton.getAttribute('aria-label') ?? '', /^Sélectionnés : /);
  bouton.clic();
  assert.equal(banc.selections.length, 1, 'un bouton désactivé n’envoie rien');
});

test('le bouton redevient actif quand la sélection de Figma change', () => {
  const banc = monter();
  boutonDe(carteDeConstat(banc)).clic();
  banc.panneau.oublierLaSelection();
  banc.panneau.mettreAJour();
  const bouton = boutonDe(carteDeConstat(banc));
  assert.equal(bouton.textContent, 'Sélectionner');
  assert.equal(bouton.disabled, false);
});

test('ouvrir une carte de constat ne sélectionne rien', () => {
  const banc = monter();
  comme(carteDeConstat(banc).querySelector('.bloc-bouton')).clic();
  assert.equal(carteDeConstat(banc).querySelector('.bloc-bouton')?.getAttribute('aria-expanded'), 'true');
  assert.deepEqual(banc.selections, []);
});

test('une analyse périmée désactive Sélectionner', () => {
  const banc = monter(undefined, { perimee: true, statut: 'provisoire' });
  assert.equal(boutonDe(carteDeConstat(banc)).disabled, true);
});

test('une carte de correction porte Sélectionner dans son corps déplié, et l’ouvrir ne sélectionne rien', () => {
  const banc = monter();
  choisir(banc, 'tailles');
  const carte = comme(banc.racine.querySelector('.section-element .bloc'));
  const bouton = boutonDe(carte);
  assert.ok(carte.querySelector('.bloc-corps')?.contains(bouton), 'le bouton est dans le corps');
  assert.equal(carte.querySelector('.bloc-tete .bouton-selectionner'), null);
  comme(carte.querySelector('.bloc-bouton')).clic();
  comme(comme(banc.racine.querySelector('.section-element .bloc')).querySelector('.bloc-bouton')).clic();
  assert.deepEqual(banc.selections, []);
  bouton.clic();
  assert.equal(banc.selections.length, 1);
  assert.deepEqual([...banc.selections[0]].sort(), ['alert:l:gauche', 'alert:l:haut']);
  assert.equal(boutonDe(comme(banc.racine.querySelector('.section-element .bloc'))).textContent, 'Sélectionnés');
});

test('une carte de correction sans layer n’a pas de bouton', () => {
  const banc = monter();
  choisir(banc, 'regles');
  assert.equal(banc.racine.querySelector('.section-element .bouton-selectionner'), null);
});

test('une question qui vise un layer a Sélectionner dans sa ligne d’actions', () => {
  const banc = monter();
  choisir(banc, 'couleurs');
  const cartes = banc.racine.querySelectorAll('.question').filter((carte) => carte.querySelector('.bouton-selectionner'));
  assert.equal(cartes.length >= 1, true);
  const pied = comme(cartes[0].querySelector('.question-pied'));
  assert.ok(pied.contains(boutonDe(cartes[0])));
  boutonDe(cartes[0]).clic();
  assert.deepEqual(banc.selections, [['alert:l:title']]);
});
