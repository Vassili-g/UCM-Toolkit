/**
 * Les règles d'écriture de l'exporteur que le kit tient pour le comparateur.
 * `packages/plugin-exporter/tests/mouvement.test.ts` couvre `courbeDeToken` sur
 * des valeurs `MotionEasing` complètes ; ce fichier tient ce qui ne demande
 * aucun typage de Figma.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { courbeDeToken, dureeDeToken, espaceDuProfil } from '../src/format/index.js';

test('seul le profil DISPLAY_P3 donne display-p3', () => {
  assert.equal(espaceDuProfil('DISPLAY_P3'), 'display-p3');
  assert.equal(espaceDuProfil('SRGB'), 'srgb');
  assert.equal(espaceDuProfil('LEGACY'), 'srgb');
  assert.equal(espaceDuProfil(''), 'srgb');
});

test('une durée garde le nombre de Figma, en secondes', () => {
  assert.deepEqual(dureeDeToken(0.5), { value: 0.5, unit: 's' });
  assert.deepEqual(dureeDeToken(0.20000000298023224), { value: 0.20000000298023224, unit: 's' });
});

test('une courbe se lit sur les champs que l’API de Figma joint', () => {
  assert.deepEqual(courbeDeToken({ type: 'LINEAR' }), { courbe: [0, 0, 1, 1] });
  assert.deepEqual(
    courbeDeToken({ type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: 0.1, y1: 1.5, x2: 0.3, y2: 0.4 } }),
    { courbe: [0.1, 1.5, 0.3, 0.4] },
  );
});

test('une courbe sans points donne la cause de son absence', () => {
  assert.deepEqual(courbeDeToken({ type: 'EASE_IN' }), { cause: 'preregle' });
  assert.deepEqual(courbeDeToken({ type: 'CUSTOM_SPRING' }), { cause: 'ressort' });
  assert.deepEqual(courbeDeToken({ type: 'HOLD' }), { cause: 'tenue' });
  assert.deepEqual(courbeDeToken({ type: 'CUSTOM_CUBIC_BEZIER' }), { cause: 'points' });
  assert.deepEqual(
    courbeDeToken({ type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { x1: 1.1, y1: 0, x2: 0.5, y2: 1 } }),
    { cause: 'abscisse' },
  );
  assert.deepEqual(courbeDeToken(undefined), { cause: 'preregle' });
  assert.deepEqual(courbeDeToken(null), { cause: 'preregle' });
});
