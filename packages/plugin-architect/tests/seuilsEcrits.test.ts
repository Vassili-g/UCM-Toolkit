/** S5 : les textes d'Architect écrivent les seuils du référentiel, sans arrondi, et gardent leur texte à seuils égaux. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';
import { TEXTES } from '../src/ui/textes/nomenclature';

const contexte: ContexteDAFaire = { composant: 'Button', variants: [], layers: new Map() };

const stroke = (seuil: number): Constat => ({
  id: 'g', code: 'C50', type: 'corriger', famille: 'contraste', variants: [], layers: [],
  faits: { usage: 'stroke', champ: 'strokes', calque: 'container', rapport: 2.7, seuil, mode: 'components en Mode 1, theme en Dark', fondNomme: 'page', variableDuTheme: 'page/border', garanti: 'oui' },
});

test('S5 : le niveau AA de Nomenclature garde son texte aux seuils du référentiel', () => {
  assert.equal(TEXTES.seuilAa, 'AA demande 4,5:1 pour un texte et 3:1 pour un stroke.');
});

test('S5 : la phrase d\'un échec écrit son seuil entier, sans l\'arrondir', () => {
  assert.match(carteDAFaire(stroke(3), contexte).phrase, /sous le seuil de 3:1\./);
  assert.match(carteDAFaire(stroke(4.25), contexte).phrase, /sous le seuil de 4,25:1\./);
});
