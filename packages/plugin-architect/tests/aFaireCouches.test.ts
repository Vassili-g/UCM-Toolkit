/** La carte C20 d'À faire dans Figma : la phrase dit quelle liaison franchit quelle collection, le lieu ne répète pas le variant. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';

const contexte: ContexteDAFaire = {
  composant: 'TileLink',
  variants: [{ id: 'v1', nom: 'Variant=Info, State=Default' }],
  layers: new Map([['v1', 'Variant=Info, State=Default'], ['l2', 'icon']]),
};

const c20 = (faits: Constat['faits'], layer = 'v1'): Constat => ({ id: 'C20:x', code: 'C20', type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: [layer], faits });

test('un token de components qui vise une primitive nomme sa cible et demande de la changer', () => {
  const carte = carteDAFaire(c20({ token: 'TileLink/Size/width', couche: 'primitives', nature: 'dimension', admises: 'theme,layout,typography', cible: 'dimension/40' }), contexte);
  assert.equal(carte.phrase, '`TileLink/Size/width` vise `dimension/40`, de la collection `primitives`.');
  assert.equal(carte.statut, 'Dans la fenêtre Variables, faites-le viser un token de theme, layout ou typography');
});

test('un layer lié hors de components demande un token de components', () => {
  const carte = carteDAFaire(c20({ token: 'color/blue/500', couche: 'primitives', nature: 'couleur', admises: 'theme' }, 'l2'), contexte);
  assert.equal(carte.phrase, 'Ce layer est lié à `color/blue/500`, de la collection `primitives`.');
  assert.equal(carte.statut, 'Liez-le à un token de components, ou de theme');
  assert.equal(carte.lieu, 'Variant=Info, State=Default, layer icon');
});

test('le layer racine d’un variant ne répète pas son nom dans le lieu', () => {
  assert.equal(carteDAFaire(c20({ token: 'dimension/40', couche: 'primitives', nature: 'dimension', admises: 'layout' }), contexte).lieu, 'Variant=Info, State=Default');
});
