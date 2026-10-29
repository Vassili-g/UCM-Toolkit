/** Le relevé ne marque visible qu'une peinture que le designer voit, et n'écrit l'épaisseur que d'un contour qui se voit. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, portDeTest } from './figmaDeTest';

const boite = { x: 0, y: 0, width: 40, height: 40 };

test('une peinture masquée ou d’opacité nulle n’est pas visible dans le relevé', async () => {
  const a = atelierDeCalques();
  const variant = a.calque('v', 'COMPONENT', {
    name: 'State=default', absoluteBoundingBox: boite, strokeWeight: 1,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }, { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: false }],
    strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }],
  });
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Button', key: 'k', defaultVariant: variant,
    componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'default', variantOptions: ['default'] } },
  }, [variant]);
  const { port } = portDeTest([], []);
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const racine = issue.releve.variants[0].layers[0];
  assert.deepEqual(racine.peintures.filter((p) => p.champ === 'fills').map((p) => p.visible), [true, false, false]);
  assert.equal(racine.peintures.find((p) => p.champ === 'strokes')?.visible, false);
  assert.equal(racine.valeursEnDur.some((v) => v.champ === 'strokeWeight'), false);
});
