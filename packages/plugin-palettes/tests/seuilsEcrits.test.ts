/** S5 et S6 : Palettes écrit les seuils sans arrondi et lit ceux du référentiel. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { recetteParDefaut } from 'ucm-couleur';

import { legendeDesContrastes as legendeEn } from '../src/i18n/en';
import { legendeDesContrastes } from '../src/i18n/fr';

const seuils = (texte: number, nonTexte: number) => ({ ...recetteParDefaut().seuils, texte, nonTexte });

test('S5 : la légende des grilles garde son texte à seuils égaux, en français et en anglais', () => {
  assert.equal(legendeDesContrastes(seuils(4.5, 3)), 'Ligne : fond · colonne : texte · gras dès 4,5:1 · maigre dès 3:1 · effacé en dessous · AA dès 4,5:1 · AAA dès 7:1');
  assert.equal(legendeEn(seuils(4.5, 3)), 'Row: background · column: text · bold from 4.5:1 · regular from 3:1 · faded below · AA from 4.5:1 · AAA from 7:1');
});

test('S5 : un minimum de 4,25 s\'écrit 4,25, jamais 4,3', () => {
  assert.match(legendeDesContrastes(seuils(4.25, 3)), /gras dès 4,25:1 · maigre dès 3:1/);
  assert.match(legendeEn(seuils(4.25, 3)), /bold from 4\.25:1 · regular from 3:1/);
});

test('S6 : la planche compare l\'encre seconde au seuil du texte du référentiel, sans nombre écrit', () => {
  const source = readFileSync(new URL('../src/planche/modele.ts', import.meta.url), 'utf8');
  assert.match(source, /contraste\(attenuee, fond\) >= SEUILS_PAR_USAGE\.texte/);
  assert.doesNotMatch(source, />=\s*4\.5\b/);
});
