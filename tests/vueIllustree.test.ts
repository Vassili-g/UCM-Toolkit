/**
 * Les données que la vue illustrée tire du kit sont commitées : `donnees-referentiel.js` (table des rôles, libellés),
 * `tokens-reference.json` (la référence complète, que `generer-reference.ts` écrit) et `donnees-vue-illustree.js` (le panneau,
 * que `generer-vue-illustree.ts` en tire). Ce test les compare à ce que le kit rend aujourd'hui : un changement du référentiel
 * sans régénération laisse la page montrer l'ancienne table, et un ancien nom de collection n'y reste pas.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { FORMES_ANCIENNES_DES_COLLECTIONS } from '@ucm-kit/core/referentiel';
import { genererDonneesReferentiel } from '../docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel';
import { genererReference } from '../docs/notes/Recherches/Archi Tokens Multi-marques/generer-reference';
import { genererDonneesVue } from '../docs/notes/Recherches/Archi Tokens Multi-marques/generer-vue-illustree';

const dossier = path.resolve(__dirname, '..', 'docs', 'notes', 'Recherches', 'Archi Tokens Multi-marques');

test('donnees-referentiel.js suit le référentiel', () => {
  const commite = fs.readFileSync(path.join(dossier, 'donnees-referentiel.js'), 'utf8');
  assert.equal(
    commite,
    genererDonneesReferentiel(),
    "La vue n'est plus à jour. Lancez `npm run vues`.",
  );
});

const SANS_RETOUR_CHARIOT = (texte: string): string => texte.replace(/\r\n/g, '\n');
const lire = (fichier: string): string => SANS_RETOUR_CHARIOT(fs.readFileSync(path.join(dossier, fichier), 'utf8'));

test('tokens-reference.json suit la référence du kit', () => {
  assert.equal(lire('tokens-reference.json'), genererReference(), "La vue n'est plus à jour. Lancez `npm run vues`.");
});

test('donnees-vue-illustree.js suit tokens-reference.json', () => {
  assert.equal(
    lire('donnees-vue-illustree.js'),
    genererDonneesVue(JSON.parse(lire('tokens-reference.json'))),
    "La vue n'est plus à jour. Lancez `npm run vues`.",
  );
});

test("aucun ancien nom de collection ni d'état ne reste dans la référence ni dans les données du panneau", () => {
  // Les noms d'avant la décision D8, plus les deux de l'ancien export : `colors` (groupe de couleurs) et `press` (état).
  const anciens = [...Object.keys(FORMES_ANCIENNES_DES_COLLECTIONS), 'colors', 'press'];
  for (const fichier of ['tokens-reference.json', 'donnees-vue-illustree.js', 'VUE-ILLUSTREE-MULTIMARQUES.html']) {
    const texte = lire(fichier);
    for (const ancien of anciens) {
      assert.doesNotMatch(texte, new RegExp(`(?<![\\w-])${ancien}(?![\\w-])`), `${fichier} contient l'ancien nom ${ancien}`);
    }
  }
});

test('la page ne recopie plus la table des crans', () => {
  const page = fs.readFileSync(path.join(dossier, 'VUE-ILLUSTREE-MULTIMARQUES.html'), 'utf8');
  assert.doesNotMatch(page, /<td class="n">\d{3}/, 'une cellule de cran est écrite en dur dans la page');
  assert.match(page, /donnees-referentiel\.js/);
});
