/**
 * Les données que la vue illustrée tire du référentiel sont commitées dans
 * `donnees-referentiel.js`. Ce test les compare à ce que le référentiel rend
 * aujourd'hui : un changement du référentiel sans régénération laisse la page
 * montrer l'ancienne table.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { genererDonneesReferentiel } from '../docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel';

const dossier = path.resolve(__dirname, '..', 'docs', 'notes', 'Recherches', 'Archi Tokens Multi-marques');

test('donnees-referentiel.js suit le référentiel', () => {
  const commite = fs.readFileSync(path.join(dossier, 'donnees-referentiel.js'), 'utf8');
  assert.equal(
    commite,
    genererDonneesReferentiel(),
    'donnees-referentiel.js est périmé. Le régénérer : npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts"',
  );
});

test('la page ne recopie plus la table des crans', () => {
  const page = fs.readFileSync(path.join(dossier, 'VUE-ILLUSTREE-MULTIMARQUES.html'), 'utf8');
  assert.doesNotMatch(page, /<td class="n">\d{3}/, 'une cellule de cran est écrite en dur dans la page');
  assert.match(page, /donnees-referentiel\.js/);
});
