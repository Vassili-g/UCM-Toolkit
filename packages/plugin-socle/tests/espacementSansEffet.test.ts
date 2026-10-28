/**
 * `espacementSansEffet` : un espacement que Figma garde sans l'appliquer (gap « Auto », grille, vertical gap
 * sans wrap ou « Auto », hors auto layout), sur des nœuds fabriqués.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { espacementSansEffet } from '../src/composant/contract/nodeBindings';

const noeud = (champs: Record<string, unknown>): SceneNode => ({ type: 'FRAME', ...champs }) as unknown as SceneNode;

test('itemSpacing est sans effet sous un gap Auto ou une grille, et compte sinon', () => {
  const rangee = { layoutMode: 'HORIZONTAL', itemSpacing: 10 };
  assert.equal(espacementSansEffet(noeud({ ...rangee, primaryAxisAlignItems: 'MIN' }), 'itemSpacing'), false);
  assert.equal(espacementSansEffet(noeud({ ...rangee, primaryAxisAlignItems: 'SPACE_BETWEEN' }), 'itemSpacing'), true);
  assert.equal(espacementSansEffet(noeud({ layoutMode: 'GRID', itemSpacing: 10 }), 'itemSpacing'), true);
});

test('counterAxisSpacing est sans effet sans wrap ou sous un vertical gap Auto', () => {
  const lignes = { layoutMode: 'HORIZONTAL', layoutWrap: 'WRAP', counterAxisSpacing: 8 };
  assert.equal(espacementSansEffet(noeud({ ...lignes, counterAxisAlignContent: 'AUTO' }), 'counterAxisSpacing'), false);
  assert.equal(espacementSansEffet(noeud({ ...lignes, counterAxisAlignContent: 'SPACE_BETWEEN' }), 'counterAxisSpacing'), true);
  assert.equal(espacementSansEffet(noeud({ ...lignes, layoutWrap: 'NO_WRAP' }), 'counterAxisSpacing'), true);
});

test('un espacement hors auto layout est sans effet ; un champ qui n’est pas un espacement ne l’est jamais', () => {
  assert.equal(espacementSansEffet(noeud({ layoutMode: 'NONE', paddingLeft: 8 }), 'paddingLeft'), true);
  assert.equal(espacementSansEffet(noeud({ layoutMode: 'HORIZONTAL', paddingLeft: 8 }), 'paddingLeft'), false);
  assert.equal(espacementSansEffet(noeud({ layoutMode: 'NONE', cornerRadius: 4 }), 'cornerRadius'), false);
});
