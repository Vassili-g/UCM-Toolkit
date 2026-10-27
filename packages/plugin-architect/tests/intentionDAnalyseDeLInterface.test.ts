/** Le bouton du mode Composant envoie `analyser`, qui permet la reprise validée ; seul Maj+clic sur Actualiser envoie `actualiser`. */
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
  const cliquer = (maj = false): Extract<UiRequest, { type: 'analyser' }> => {
    envois.length = 0;
    barre.mettreAJour?.();
    if (maj) bouton.dispatchEvent(Object.assign(new Event('click', { cancelable: true }), { shiftKey: true }));
    else bouton.clic();
    return envois.find((m): m is Extract<UiRequest, { type: 'analyser' }> => m.type === 'analyser')!;
  };
  return { etat, cliquer, bouton };
}

test('avant toute analyse, le bouton envoie Analyser', () => {
  const { cliquer } = monter();
  assert.equal(cliquer().intention, 'analyser');
});

/** Un bouton monté sur une analyse finie (`complete`) ou périmée. */
function apresUneAnalyse(fin: 'complete' | 'perimee') {
  const monte = monter();
  recevoirUneAnalyse(monte.etat, { type: 'analyse-commencee', analyse: IDENTITE });
  if (fin === 'complete') recevoirUneAnalyse(monte.etat, { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: [], lecture: null, variants: [], sansTokens: false });
  else recevoirUneAnalyse(monte.etat, { type: 'perime', analyse: IDENTITE, cause: 'document' });
  return monte;
}

test('une fois le composant analysé, le clic sur Actualiser envoie analyser et son infobulle nomme Maj+clic', () => {
  const { cliquer, bouton } = apresUneAnalyse('complete');
  assert.equal(cliquer().intention, 'analyser');
  assert.match(String(bouton.title), /Maj\+clic/);
});

test('une fois le composant analysé, Maj+clic sur Actualiser envoie actualiser', () => {
  assert.equal(apresUneAnalyse('complete').cliquer(true).intention, 'actualiser');
});

test('une analyse périmée se reprend par le clic et se reconstruit par Maj+clic', () => {
  assert.equal(apresUneAnalyse('perimee').cliquer().intention, 'analyser');
  assert.equal(apresUneAnalyse('perimee').cliquer(true).intention, 'actualiser');
});

test('avant toute analyse, Maj+clic envoie aussi analyser', () => {
  const { cliquer } = monter();
  assert.equal(cliquer(true).intention, 'analyser');
});
