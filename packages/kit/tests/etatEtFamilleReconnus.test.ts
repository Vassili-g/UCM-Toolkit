/** Un état et la famille `color` se lisent par leur terme, quelle que soit l'écriture du segment. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { estLaFamilleCouleur, etatReconnu } from '../src/controles/nommage.js';
import { peintureVisible } from '../src/controles/releve.js';

test('etatReconnu rend l’identifiant du terme, ses formes tolérées comprises', () => {
  assert.equal(etatReconnu('Hovered'), 'hover');
  assert.equal(etatReconnu('Press'), 'pressed');
  assert.equal(etatReconnu('Default'), 'default');
  assert.equal(etatReconnu('Disable'), 'disabled');
  assert.equal(etatReconnu('Loading'), undefined);
  assert.equal(etatReconnu(''), undefined);
});

test('estLaFamilleCouleur reconnaît color, Colors et colour, et rien d’autre', () => {
  for (const segment of ['color', 'Colors', 'colour']) assert.equal(estLaFamilleCouleur(segment), true, segment);
  for (const segment of ['dimension', 'background', '']) assert.equal(estLaFamilleCouleur(segment), false, segment);
});

test('peintureVisible : masquée ou d’opacité nulle, une peinture ne se voit pas', () => {
  assert.equal(peintureVisible({ visible: true, opacite: 1 }), true);
  assert.equal(peintureVisible({}), true);
  assert.equal(peintureVisible({ opacity: 0.2 }), true);
  assert.equal(peintureVisible({ visible: false, opacite: 1 }), false);
  assert.equal(peintureVisible({ visible: true, opacite: 0 }), false);
  assert.equal(peintureVisible({ opacity: 0 }), false);
});
