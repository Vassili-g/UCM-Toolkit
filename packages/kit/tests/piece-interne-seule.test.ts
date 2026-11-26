/**
 * D22 (recette du Button, C7) : une pièce interne analysée seule n'a pas de propriétaire de tokens. Les contrôles qui en supposent un
 * se taisent et C85 le dit une fois ; le même composant sous un nom d'hôte garde ses constats.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerCouches, controlerMapping, controlerNommage, controlerOublis, estUnePieceInterne,
  type CatalogueDeReference, type LayerLu, type ReleveDeComposant,
} from '../src/controles/index.js';

const layer: LayerLu = {
  id: 'layer-1', nom: 'container', type: 'FRAME', parent: null, visible: true, opacite: 1,
  dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], valeursEnDur: [],
  liaisons: [{ champ: 'fills', indice: 0, porteur: 'layer-1', variable: { id: 'fond', cle: 'fond', nom: 'button/color/primary/default/background', collection: 'components', distante: false } }],
};

const jeu = (nom: string): ReleveDeComposant => ({
  version: 1, jeu: { cle: `cle-${nom}`, id: `id-${nom}`, nom },
  proprietes: [{ nom: 'Size', type: 'VARIANT', valeurs: ['Medium'], defaut: 'Medium' }],
  variants: [{ id: 'variant-1', nom: 'Size=Medium', valeurs: { Size: 'Medium' }, modesEffectifs: {}, layers: [layer] }],
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'c', nom: 'components', role: 'components', modes: [{ id: 'm', nom: 'Light' }], etat: 'lue' }],
  variables: [{ cle: 'fond', nom: 'button/color/primary/default/background', collection: 'c', type: 'COLOR', etat: 'presente' }],
};

test('D22 : le préfixe « . » ou « _ » du jeu analysé désigne une pièce interne, par sorteDeLImbrique', () => {
  assert.equal(estUnePieceInterne(jeu('.sizeWrapperButton')), true);
  assert.equal(estUnePieceInterne(jeu('_Ring')), true);
  assert.equal(estUnePieceInterne(jeu('Button')), false);
});

test('D22 : la pièce interne seule ne rend ni C19, ni constat de nommage, de couches ou de mapping, et rend un C85', () => {
  const releve = jeu('.sizeWrapperButton');
  assert.deepEqual(controlerMapping(releve, catalogue), []);
  assert.deepEqual(controlerNommage(releve, catalogue), []);
  assert.deepEqual(controlerCouches(releve, catalogue), []);
  const oublis = controlerOublis(releve, catalogue);
  assert.deepEqual(oublis.map(({ code, type, famille }) => [code, type, famille]), [['C85', 'info', 'tokens']]);
  assert.equal(oublis[0].faits.composant, '.sizeWrapperButton');
});

test('D22 : le même relevé sous un nom d’hôte garde les constats d’avant et ne rend pas de C85', () => {
  const releve = jeu('Alert');
  assert.equal(controlerMapping(releve, catalogue).filter(({ code }) => code === 'C19').length, 1);
  assert.ok(!controlerOublis(releve, catalogue).some(({ code }) => code === 'C85'));
});
