/**
 * La barre du mode Composant : sans logo ni nom, Analyser avec son libellé, Constats et Configuration en icône. Analyser se grise
 * quand Figma dit qu'aucun composant n'est sélectionné, et reste actif tant que la sélection est inconnue. Configuration est une bascule.
 * La première analyse d’un composant ouvre le panneau des constats ; une nouvelle analyse du même composant n’y touche pas.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { poserLeDom, comme } from './domDeTest';

poserLeDom();

import type { UiRequest } from '../src/messages';
import { creerApplication } from '../src/ui/application';
import { creerBarre } from '../src/ui/barre';
import { recevoirUneAnalyse } from '../src/ui/composant/analyse';
import { etatInitial } from '../src/ui/etat';
import { TEXTES } from '../src/ui/textes';

function monter(disposition: 'large' | 'etroite' = 'etroite') {
  const envois: UiRequest[] = [];
  (globalThis as unknown as { parent: unknown }).parent = { postMessage: (message: { pluginMessage: UiRequest }) => envois.push(message.pluginMessage) };
  const etat = etatInitial();
  etat.disposition = disposition;
  const configuration = { ouverte: false, ouvertures: 0, fermetures: 0 };
  const app = creerApplication(etat, () => ({
    rendre() {},
    ouvrirLaConfiguration() { configuration.ouverte = true; configuration.ouvertures += 1; },
    fermerLaConfiguration() { configuration.ouverte = false; configuration.fermetures += 1; },
    configurationOuverte: () => configuration.ouverte,
  }) as never);
  const barre = creerBarre(app);
  const racine = comme(barre.element);
  barre.mettreAJour?.();
  return {
    etat, app, barre, configuration, envois,
    produit: comme(racine.querySelector('.produit')),
    analyser: comme(racine.querySelector('.btn-compact')),
    constats: comme(racine.querySelector('.bouton-panneau')),
    boutonConfiguration: comme(racine.querySelector(`[aria-label="${TEXTES.configuration}"]`)),
    relire: () => barre.mettreAJour?.(),
  };
}

test('en mode Composant, la barre n’a ni logo ni nom, et Constats et Configuration n’ont que leur icône', () => {
  const { produit, constats, boutonConfiguration, analyser } = monter();
  assert.equal(produit.hidden, true);
  assert.equal(comme(constats.querySelector('span')).hidden, true);
  assert.equal(comme(boutonConfiguration.querySelector('span')).hidden, true);
  assert.equal(constats.getAttribute('aria-label'), TEXTES.constats);
  assert.equal(boutonConfiguration.getAttribute('aria-label'), TEXTES.configuration);
  assert.equal(analyser.textContent, TEXTES.analyser);
  assert.equal(analyser.hidden, false);
});

test('en mode Tokens, la barre garde le produit et Analyser est caché', () => {
  const { produit, analyser } = monter('large');
  assert.equal(produit.hidden, false);
  assert.equal(analyser.hidden, true);
});

test('Analyser se grise et nomme le geste à faire quand la sélection est connue et sans composant', () => {
  const { etat, analyser, relire } = monter();
  etat.composant.selectionConnue = true;
  etat.composant.selection = null;
  relire();
  assert.equal(analyser.disabled, true);
  assert.equal(analyser.title, TEXTES.selectionnerUnComposant);
  etat.composant.selection = { id: 'Button', portee: 'Button' };
  relire();
  assert.equal(analyser.disabled, false);
  assert.equal(analyser.title, TEXTES.analyserAide);
});

test('Analyser reste actif tant que la sélection est inconnue', () => {
  const { etat, analyser, relire } = monter();
  assert.equal(etat.composant.selectionConnue, false);
  assert.equal(etat.composant.selection, null);
  relire();
  assert.equal(analyser.disabled, false);
  assert.equal(analyser.title, TEXTES.analyserAide);
});

test('un clic sur Analyser grisé n’envoie rien', () => {
  const { etat, analyser, relire, envois } = monter();
  etat.composant.selectionConnue = true;
  relire();
  analyser.clic();
  assert.equal(envois.some((message) => message.type === 'analyser'), false);
});

test('la première analyse d’un composant ouvre le panneau des constats et la fenêtre à 1144 px ; un panneau ouvert le reste', () => {
  for (const ouvert of [false, true]) {
    const { etat, analyser, relire, envois } = monter();
    etat.panneau = { ...etat.panneau, ouvert };
    relire();
    analyser.clic();
    assert.equal(envois.some((message) => message.type === 'analyser'), true, 'la demande est partie');
    assert.equal(etat.panneau.ouvert, true);
    assert.equal(envois.filter((message) => message.type === 'resize').length, ouvert ? 0 : 1);
  }
});

test('une nouvelle analyse du même composant laisse le panneau fermé', () => {
  const { etat, analyser, relire, envois } = monter();
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: { sujet: 'Alert', generation: 1 }, statut: 'complete', constats: [], lecture: null, variants: [], sansTokens: false });
  relire();
  analyser.clic();
  assert.equal(envois.some((message) => message.type === 'analyser'), true, 'la demande est partie');
  assert.equal(etat.panneau.ouvert, false);
  assert.equal(envois.some((message) => message.type === 'resize'), false);
});

test('Configuration est une bascule : aria-pressed suit l’ouverture, le second clic ferme', () => {
  const { boutonConfiguration, configuration, relire } = monter();
  assert.equal(boutonConfiguration.getAttribute('aria-pressed'), 'false');
  boutonConfiguration.clic();
  relire();
  assert.equal(configuration.ouvertures, 1);
  assert.equal(boutonConfiguration.getAttribute('aria-pressed'), 'true');
  boutonConfiguration.clic();
  relire();
  assert.equal(configuration.fermetures, 1);
  assert.equal(configuration.ouvertures, 1);
  assert.equal(boutonConfiguration.getAttribute('aria-pressed'), 'false');
});

test('ouvrir la Configuration depuis le mode Composant ne change ni le mode ni la fenêtre', () => {
  const { etat, boutonConfiguration, envois } = monter();
  boutonConfiguration.clic();
  assert.equal(etat.disposition, 'etroite');
  assert.equal(envois.some((message) => message.type === 'changer-disposition' || message.type === 'resize'), false);
});
