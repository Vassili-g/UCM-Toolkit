/** Le geste Actualiser du mode Composant envoie l'intention `actualiser` au sandbox, le geste Analyser l'intention `analyser`. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { poserLeDom, comme } from './domDeTest';

poserLeDom();

import type { UiRequest } from '../src/messages';
import { creerApplication } from '../src/ui/application';
import { creerBarre } from '../src/ui/barre';
import { recevoirUneAnalyse } from '../src/ui/composant/analyse';
import { etatInitial } from '../src/ui/etat';

const IDENTITE = { sujet: 'Alert', generation: 1 };

function monter() {
  const envois: UiRequest[] = [];
  (globalThis as unknown as { parent: unknown }).parent = { postMessage: (message: { pluginMessage: UiRequest }) => envois.push(message.pluginMessage) };
  const etat = etatInitial();
  etat.disposition = 'etroite';
  const app = creerApplication(etat, () => ({ rendre() {} }) as never);
  const barre = creerBarre(app);
  const bouton = comme(comme(barre.element).querySelector('.btn-compact'));
  const cliquer = (): Extract<UiRequest, { type: 'analyser' }> => {
    envois.length = 0;
    barre.mettreAJour?.();
    bouton.clic();
    return envois.find((m): m is Extract<UiRequest, { type: 'analyser' }> => m.type === 'analyser')!;
  };
  return { etat, cliquer };
}

test('avant toute analyse, le bouton envoie Analyser', () => {
  const { cliquer } = monter();
  assert.equal(cliquer().intention, 'analyser');
});

test('une fois le composant analysé, le même bouton se lit Actualiser et envoie actualiser', () => {
  const { etat, cliquer } = monter();
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: IDENTITE });
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: [], lecture: null, variants: [], sansTokens: false });
  assert.equal(cliquer().intention, 'actualiser');
});

test('une analyse périmée se relit par Actualiser', () => {
  const { etat, cliquer } = monter();
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: IDENTITE });
  recevoirUneAnalyse(etat, { type: 'perime', analyse: IDENTITE, cause: 'document' });
  assert.equal(cliquer().intention, 'actualiser');
});
