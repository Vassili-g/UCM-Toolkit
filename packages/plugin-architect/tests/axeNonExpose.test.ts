/** La carte de C83 : un composant imbriqué porte un axe que l'hôte n'a pas et son instance n'est exposée dans aucun variant (D8). */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';

const contexte: ContexteDAFaire = { composant: 'Button', variants: [{ id: 'v1', nom: 'State=Default' }], layers: new Map([['w', '.sizeWrapperButton']]) };
const constat = (proprietes: string): Constat => ({
  id: 'C83:jeu-wrapper', code: 'C83', type: 'verifier', famille: 'variants', variants: ['v1'], layers: ['w'],
  faits: { wrapper: '.sizeWrapperButton', proprietes, composant: 'Button' },
});

test('D8 : la carte dit que la propriété ne se choisit pas depuis le composant et demande de l’exposer dans Figma', () => {
  const carte = carteDAFaire(constat('Size'), contexte);
  assert.equal(carte.phrase, 'La propriété `Size` de `.sizeWrapperButton` ne se choisit pas depuis Button.');
  assert.equal(carte.statut, 'Dans Figma, exposez les propriétés de `.sizeWrapperButton` (Expose properties from nested instances)');
});

test('D8 : plusieurs propriétés passent la phrase au pluriel', () => {
  assert.equal(carteDAFaire(constat('Size, Density'), contexte).phrase, 'Les propriétés `Size`, `Density` de `.sizeWrapperButton` ne se choisissent pas depuis Button.');
});
