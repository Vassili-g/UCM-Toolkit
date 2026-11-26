/**
 * « Aucun fill ni stroke n'est relié » (C30 sur un variant) : une cause, un point. Un variant sans peinture visible n'a rien à relier,
 * une peinture visible non reliée a déjà son message de calque, et une liaison dont la variable n'a pas pu être lue s'abstient.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { extractVariantTokens } from '../src/composant/contract/extractVariantTokens';

const ALIAS = { type: 'VARIABLE_ALIAS', id: 'couleur' } as VariableAlias;
const AUCUN_FILL = 'aucun fill ni stroke n’est relié à une variable';

const solide = (extra: Record<string, unknown> = {}) => ({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 }, ...extra });

function racine(fills: unknown[], boundVariables: Record<string, unknown> = {}): ComponentNode {
  return { id: 'v', type: 'COMPONENT', name: 'State=Default', visible: true, fills, strokes: [], boundVariables, findAll: () => [] } as unknown as ComponentNode;
}

async function lire(component: ComponentNode, resolu: string | null = null) {
  const warnings: string[] = [];
  const notices: string[] = [];
  const arbres = await extractVariantTokens(
    { axes: ['state'], variants: [{ values: { state: 'default' }, component }] },
    { resolve: async (alias: VariableAlias | null | undefined) => (alias ? resolu : null) },
    warnings,
    new Map(),
    new Set(),
    notices,
  );
  return { warnings, notices, arbres };
}

const dit = (canal: string[], texte: string): boolean => canal.some((message) => message.includes(texte));

test('G1, G2 : un fill visible non relié sur la racine d’un variant ne donne que le message du calque', async () => {
  const { warnings, notices } = await lire(racine([solide()]));
  assert.equal(warnings.filter((message) => message.includes('son fill n’est relié à aucune variable Figma')).length, 1);
  assert.equal(dit(notices, AUCUN_FILL), false);
});

test('G5, G6 : une racine sans aucune peinture visible n’est pas accusée de n’avoir rien relié', async () => {
  for (const fills of [[], [solide({ visible: false })], [solide({ opacity: 0 })]]) {
    const { warnings, notices } = await lire(racine(fills));
    assert.deepEqual([...warnings, ...notices], []);
  }
});

test('G7 : une liaison dont la variable n’a pas pu être lue ne devient pas « aucun fill ni stroke relié »', async () => {
  const { warnings, notices } = await lire(racine([solide({ boundVariables: { color: ALIAS } })], { fills: [ALIAS] }));
  assert.deepEqual([...warnings, ...notices], []);
});

test('garde : une couleur reliée et lue ne produit ni point de variant ni point de calque', async () => {
  const { warnings, notices, arbres } = await lire(racine([solide({ boundVariables: { color: ALIAS } })], { fills: [ALIAS] }), 'components.button.colors.fond');
  assert.deepEqual([...warnings, ...notices], []);
  assert.equal(arbres.tokensByComponent.size, 1);
});

test('garde : une peinture visible qu’aucune variable ne peut porter (dégradé) garde « aucun fill ni stroke relié »', async () => {
  const { notices } = await lire(racine([{ type: 'GRADIENT_LINEAR', visible: true, opacity: 1, blendMode: 'NORMAL', gradientStops: [] }]));
  assert.equal(dit(notices, AUCUN_FILL), true);
});
