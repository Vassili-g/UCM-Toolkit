/** La barre : Analyser reste inactif pendant le calcul et redevient actif dès que l'analyse est périmée, provisoire reçu ou non. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { poserLeDom, comme } from './domDeTest';

poserLeDom();

import { creerBarre } from '../src/ui/barre';
import { recevoirUneAnalyse } from '../src/ui/composant/analyse';
import { etatInitial } from '../src/ui/etat';

const IDENTITE = { sujet: 'Alert', generation: 1 };

function monter() {
  const etat = etatInitial();
  etat.disposition = 'etroite';
  const barre = creerBarre({ etat, configurationOuverte: () => false } as never);
  const analyser = (): ReturnType<typeof comme> => comme(comme(barre.element).querySelector('.btn-compact'));
  return { etat, barre, analyser };
}

test('Analyser est inactif pendant en-cours et pendant le provisoire, actif une fois l’analyse périmée', () => {
  for (const provisoire of [false, true]) {
    const { etat, barre, analyser } = monter();
    recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: IDENTITE });
    if (provisoire) recevoirUneAnalyse(etat, { type: 'analyse-provisoire', analyse: IDENTITE, constats: [], ignores: [], lecture: null as never, variants: [] });
    barre.mettreAJour?.();
    assert.equal(analyser().disabled, true, `calcul${provisoire ? ' provisoire' : ''}`);
    recevoirUneAnalyse(etat, { type: 'perime', analyse: IDENTITE, cause: 'document' });
    barre.mettreAJour?.();
    assert.equal(analyser().disabled, false, `périmée${provisoire ? ' après provisoire' : ''}`);
  }
});
