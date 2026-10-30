/**
 * La couleur de Figma en octets et en hexadécimal (D-24), et le contraste
 * tronqué et écrit (D-08) : une seule écriture, que les plugins, les lecteurs
 * et les contrôles partagent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { contraste, contrasteTronque, ecrireContraste, encreLisible, hexaDeFigma, versOctet, versRgb8, type Rgb8 } from '../src/emplois/index';

test('une composante à 1,002 rend FF, jamais 100', () => {
  assert.equal(versOctet(1.002), 255);
  assert.deepEqual(versRgb8({ r: 1.002, g: -0.2, b: 0.5 }), [255, 0, 128]);
  assert.equal(hexaDeFigma({ r: 1.002, g: 1.002, b: 1.002 }), '#FFFFFF');
  assert.equal(hexaDeFigma({ r: 1.002, g: -1, b: 0 }, { alpha: true }), '#FF0000');
});

test('l\'hexa de Figma s\'écrit en majuscules, l\'alpha seulement sur demande et quand la couleur n\'est pas opaque', () => {
  const couleur = { r: 0.11764705926179886, g: 0.43529412150382996, b: 0.8509804010391235 };
  assert.equal(hexaDeFigma(couleur), '#1E6FD9');
  assert.equal(hexaDeFigma({ ...couleur, a: 0.5 }), '#1E6FD9');
  assert.equal(hexaDeFigma({ ...couleur, a: 0.5 }, { alpha: true }), '#1E6FD980');
  assert.equal(hexaDeFigma({ ...couleur, a: 1 }, { alpha: true }), '#1E6FD9');
  assert.equal(hexaDeFigma(couleur, { alpha: true }), '#1E6FD9');
  assert.equal(hexaDeFigma({ r: 0.4999, g: 0.5001, b: 0 }), '#7F8000');
});

test('un contraste s\'écrit tronqué à deux décimales sur son écriture à dix décimales', () => {
  assert.equal(ecrireContraste(4.4999), '4,49');
  assert.equal(ecrireContraste(4.499999999999), '4,50');
  assert.equal(ecrireContraste(4.35), '4,35');
  assert.equal(ecrireContraste(3), '3,00');
  assert.equal(ecrireContraste(4.499999999999, '.'), '4.50');
});

test('contrasteTronque rend le nombre que ecrireContraste écrit', () => {
  for (const x of [4.4999, 4.499999999999, 4.35, 3, 7.0000000001, 21, 1.0049]) {
    assert.equal(String(contrasteTronque(x)), String(Number(ecrireContraste(x, '.'))), `${x}`);
  }
  assert.equal(contrasteTronque(4.499999999999), 4.5);
  assert.equal(contrasteTronque(4.4999), 4.49);
  assert.equal(contrasteTronque(12.9, 0), 12);
  assert.equal(contrasteTronque(5.7656, 3), 5.765);
});

test('encreLisible rend le noir ou le blanc, le noir à égalité', () => {
  assert.equal(encreLisible([255, 255, 255]), 'noir');
  assert.equal(encreLisible([0, 0, 0]), 'blanc');
  assert.equal(encreLisible([30, 64, 175]), 'blanc');
  assert.equal(encreLisible([250, 204, 21]), 'noir');
  for (let r = 0; r < 256; r += 51) {
    for (let g = 0; g < 256; g += 51) {
      for (let b = 0; b < 256; b += 51) {
        const fond: Rgb8 = [r, g, b];
        const attendu = contraste(fond, [0, 0, 0]) >= contraste(fond, [255, 255, 255]) ? 'noir' : 'blanc';
        assert.equal(encreLisible(fond), attendu, `${r},${g},${b}`);
      }
    }
  }
});
