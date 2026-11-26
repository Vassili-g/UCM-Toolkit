/**
 * C83 (L3 du plan de la recette du Button) : un composant imbriqué porte un axe que l'hôte n'a pas, et son instance n'est exposée dans
 * aucun variant de l'hôte. Seule la lecture `expose: false` accuse ; `'inconnu'` et l'absence de lecture ne disent rien.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerOublis, type CatalogueDeReference, type LayerLu, type ReleveDeComposant, type WrapperLu } from '../src/controles/index.js';

const dimensions = { x: 0, y: 0, largeur: 125, hauteur: 44 };
const instanceDuWrapper = (id: string): LayerLu => ({
  id, nom: '.sizeWrapperButton', type: 'INSTANCE', parent: null, visible: true, opacite: 1, dimensions, peintures: [], liaisons: [], valeursEnDur: [],
  instanceDe: { cle: 'cle-wrapper', nom: '.sizeWrapperButton', distante: false, pilotee: null },
});
const autreLayer: LayerLu = { id: 'label', nom: 'Label', type: 'TEXT', parent: null, visible: true, opacite: 1, dimensions, peintures: [], liaisons: [], valeursEnDur: [] };

function wrapper(expose: WrapperLu['expose'], axes: string[] = ['Size']): WrapperLu {
  const w: WrapperLu = {
    id: 'jeu-wrapper', cle: 'cle-wrapper', nom: '.sizeWrapperButton',
    proprietes: axes.map((nom) => ({ nom, type: 'VARIANT' as const, valeurs: ['Small', 'Medium'], defaut: 'Medium' })),
    variants: [{ id: 'w1', nom: 'Size=Medium', valeurs: { Size: 'Medium' }, liaisons: [] }],
  };
  if (expose !== undefined) w.expose = expose;
  return w;
}

/** Button porte `Color` et `State` ; ses deux variants posent le wrapper. */
function bouton(wrappers: WrapperLu[], proprietesDeLHote: string[] = ['Color', 'State']): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'button', id: 'button', nom: 'Button' },
    proprietes: proprietesDeLHote.map((nom) => ({ nom, type: 'VARIANT' as const, valeurs: ['A'], defaut: 'A' })),
    variants: ['v0', 'v1'].map((id, rang) => ({
      id, nom: proprietesDeLHote.map((nom) => `${nom}=A`).join(', '), valeurs: Object.fromEntries(proprietesDeLHote.map((nom) => [nom, 'A'])),
      modesEffectifs: {}, layers: [instanceDuWrapper(`wrapper-${rang}`), autreLayer],
    })),
    wrappers, lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}
const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const c83 = (releve: ReleveDeComposant) => controlerOublis(releve, catalogue).filter(({ code }) => code === 'C83');

test('C83 : un wrapper non exposé qui porte Size, absent de l’hôte, donne un constat avec ses instances', () => {
  const constats = c83(bouton([wrapper(false)]));
  assert.equal(constats.length, 1);
  const [constat] = constats;
  assert.deepEqual([constat.type, constat.famille], ['verifier', 'variants']);
  assert.deepEqual(constat.faits, { wrapper: '.sizeWrapperButton', proprietes: 'Size', composant: 'Button' });
  assert.deepEqual(constat.variants, ['v0', 'v1']);
  assert.deepEqual(constat.layers, ['wrapper-0', 'wrapper-1']);
});

test('C83 : plusieurs axes absents de l’hôte se joignent dans faits.proprietes', () => {
  const [constat] = c83(bouton([wrapper(false, ['Size', 'Variant'])]));
  assert.equal(constat.faits.proprietes, 'Size, Variant');
});

test('C83 : un wrapper exposé dans un variant ne donne rien', () => {
  assert.deepEqual(c83(bouton([wrapper(true)])), []);
});

test('C83 : une exposition inconnue ou non lue ne donne rien', () => {
  assert.deepEqual(c83(bouton([wrapper('inconnu')])), []);
  assert.deepEqual(c83(bouton([wrapper(undefined)])), []);
});

test('C83 : un hôte qui a l’axe du wrapper ne donne rien', () => {
  assert.deepEqual(c83(bouton([wrapper(false)], ['Color', 'Size'])), []);
});
