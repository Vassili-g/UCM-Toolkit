/** Les nouveaux états de liens gardent les cibles réelles de la fixture anonymisée et les questions sans correction. */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import type { Constat } from '../src/messages/commun';
import type { Releve } from '../src/modele';

const liens = require('../galerie/structure/liens.cjs') as Record<string, { releve: Releve; constats: Constat[] }>;
const etats = fs.readFileSync(path.resolve(__dirname, '../galerie/etats/structure.cjs'), 'utf8');

test('la galerie montre chaque carte de lien sur le vrai catalogue anonymisé', () => {
  const attendus = [
    ['lienManquant', 't-lien-manquant', 'lien-manquant'],
    ['modeManquant', 't-lien-mode-manquant', 'lien-manquant'],
    ['lienACorriger', 't-lien-a-corriger', 'lien-a-corriger'],
    ['paletteAChoisir', 't-palette-a-choisir', 'palette-a-choisir'],
    ['charteAChoisir', 't-charte-a-choisir', 'charte-a-choisir'],
    ['rampeACompleter', 't-rampe-a-completer', 'rampe-a-completer'],
    ['paletteACreer', 't-palette-a-creer', 'rampe-a-completer'],
  ];
  for (const [nom, id, genre] of attendus) {
    const cas = liens[nom];
    assert.ok(cas.constats.length > 0, nom);
    assert.ok(etats.includes(`'${id}'`), id);
    assert.ok(cas.constats.every((constat) => constat.code === 'C82' && constat.faits.genre === genre), nom);
    const variables = new Set(cas.releve.variables.map((variable) => variable.id));
    for (const constat of cas.constats) {
      for (const cible of Object.values(constat.correction?.creation?.alias ?? {})) assert.ok(variables.has(cible.cle), cible.cle);
      if (constat.question) {
        assert.equal(constat.correction, undefined);
        assert.equal(constat.question.indice, undefined);
      }
      if (genre === 'rampe-a-completer') {
        assert.equal(constat.correction, undefined);
        assert.equal(constat.question, undefined);
      }
    }
  }
  assert.ok(liens.rampeACompleter.constats.every((constat) => constat.faits.manque === 'light/300'));
  assert.ok(liens.paletteACreer.constats.every((constat) => constat.faits.manque === 'palette'));
});
