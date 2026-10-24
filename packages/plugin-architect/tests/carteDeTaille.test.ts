/** La carte de tailles : une ligne par layer et par valeur, la valeur lue, le token du composant avec sa collection et sa valeur. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { cartesDeCorrections } from '../src/ui/corrections/modele';

const VARIANTS = Array.from({ length: 8 }, (_, rang) => ({ id: `v${rang}`, nom: `Severity=s${rang}` }));

/** Un C29 sur le stroke weight de container dans un variant : 1 px en dur, lié par la correction au token d'Alert. */
function c29(variant: string, layer = 'container', champ = 'strokeWeight', valeur = 1): Constat {
  return {
    id: `C29:${variant}:${layer}:${champ}`, code: 'C29', type: 'corriger', famille: 'tailles', variants: [variant], layers: [`${variant}:${layer}`],
    faits: { calque: layer, champ, valeur },
    correction: {
      id: `cor:${variant}:${layer}:${champ}`, sorte: 'liaison', cible: { layer: `${variant}:${layer}`, champ }, avant: null,
      apres: { cle: 'k', nom: 'alert/size/border-width', collection: 'components', valeur },
      aRelire: { regle: 'r', avant: null, valeur },
    },
  };
}

const contexte = (constats: Constat[]) => ({ composant: 'Alert', variants: VARIANTS, layers: new Map<string, string>(), constats });

test('une carte de tailles fait une ligne par layer, avec ses variants et ses corrections', () => {
  const constats = VARIANTS.map((variant) => c29(variant.id));
  const [carte] = cartesDeCorrections(constats, contexte(constats));
  assert.deepEqual(carte.phrase, ['Lier le stroke weight de container']);
  assert.equal(carte.groupes?.length, 1);
  const [ligne] = carte.groupes ?? [];
  assert.equal(ligne.layer, 'container');
  assert.equal(ligne.fois, 8);
  assert.equal(ligne.valeur, 1);
  assert.equal(ligne.apres, 'size/border-width');
  assert.equal(ligne.collection, 'components');
  assert.equal(ligne.valeurApres, 1);
  assert.deepEqual([...ligne.ids].sort(), constats.map((constat) => constat.correction?.id).sort());
});

test('deux layers font deux lignes, et le titre les nomme', () => {
  const constats = [c29('v0'), c29('v1'), c29('v0', 'icon'), c29('v1', 'icon')];
  const [carte] = cartesDeCorrections(constats, contexte(constats));
  assert.deepEqual(carte.phrase, ['Lier le stroke weight de container et icon']);
  assert.deepEqual(carte.groupes?.map((ligne) => [ligne.layer, ligne.fois]), [['container', 2], ['icon', 2]]);
});

test('le padding se nomme par sa famille, et un layer qui commence par une voyelle s’élide', () => {
  const constats = [c29('v0', 'icon', 'paddingLeft', 8), c29('v0', 'icon', 'paddingTop', 4)];
  const [carte] = cartesDeCorrections(constats, contexte(constats));
  assert.deepEqual(carte.phrase, ['Lier le padding d’icon']);
  assert.deepEqual(carte.groupes?.map((ligne) => ligne.valeur), [8, 4]);
});
