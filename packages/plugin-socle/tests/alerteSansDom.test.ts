/** Le rendu SVG d'une alerte se lit sans document : le hub n'en a pas. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { TYPES_D_ALERTE } from '@ucm-kit/core/referentiel';
import { svgDeLAlerte } from '../src/ui/Alerte';

test('svgDeLAlerte rend un SVG de 12 px pour chaque type, sans document', () => {
  assert.equal(typeof document, 'undefined');
  for (const { id } of TYPES_D_ALERTE) {
    const svg = svgDeLAlerte(id);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">/u, id);
    assert.ok(svg.endsWith('</svg>'), id);
    assert.match(svg, /<(path|circle) /u, id);
  }
});

test('chaque type a sa forme : l\'octogone, le triangle et les ronds ne se confondent pas', () => {
  const formes = new Set(TYPES_D_ALERTE.map(({ id }) => svgDeLAlerte(id)));
  assert.equal(formes.size, TYPES_D_ALERTE.length);
  assert.match(svgDeLAlerte('bloquant'), /M4 \.5h4L11\.5 4v4L8 11\.5H4L\.5 8V4z/u);
  assert.match(svgDeLAlerte('corriger'), /M6 \.6l5\.6 10\.4H\.4z/u);
});

test('l\'encre du trait et du point se pose en style, comme dans creerIcone', () => {
  assert.match(svgDeLAlerte('info'), /style="stroke:var\(--texte-sur-ton\);fill:none"/u);
  assert.match(svgDeLAlerte('info'), /style="fill:var\(--texte-sur-ton\)"/u);
  assert.doesNotMatch(svgDeLAlerte('verifier'), /--texte-sur-ton/u);
});
