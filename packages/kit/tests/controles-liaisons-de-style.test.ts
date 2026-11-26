/** D11, D12 et D21 : la collection d'un champ de texte vient de la référence, et une liaison du style appliqué au calque n'est pas celle du calque. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerCouches, controlerLaTypographie,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const dims = { x: 0, y: 0, largeur: 20, hauteur: 20 };
const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  variables: [
    { cle: 'k:famille', nom: 'font-family/base', collection: 'primitives', type: 'STRING', etat: 'presente' },
    { cle: 'k:taille', nom: 'font-size/base', collection: 'primitives', type: 'FLOAT', etat: 'presente' },
    { cle: 'k:typo', nom: 'body/md/font-size', collection: 'typography', type: 'FLOAT', etat: 'presente' },
    { cle: 'k:fond', nom: 'surface/background', collection: 'theme', type: 'COLOR', etat: 'presente' },
  ],
  collections: [
    { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
    { cle: 'typography', nom: 'typography', role: 'typography', modes: [], etat: 'lue' },
    { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
    { cle: 'primitives', nom: 'primitives', role: 'primitives', modes: [], etat: 'lue' },
  ],
};
const lier = (champ: string, cle: string, provenance?: LiaisonLue['provenance']): LiaisonLue => {
  const v = catalogue.variables.find((x) => x.cle === cle)!;
  return { champ, porteur: 'x', ...(provenance ? { provenance } : {}), variable: { id: cle, cle, nom: v.nom, collection: v.collection, distante: false } };
};
const calque = (liaisons: LiaisonLue[], type: LayerLu['type'] = 'TEXT'): LayerLu => ({
  id: `l${Math.random()}`, nom: 'message', type, parent: 'r', visible: true, opacite: 1, dimensions: dims,
  peintures: [], liaisons, valeursEnDur: [],
  ...(type === 'TEXT' ? { texte: { style: 'Body/Large', plages: [] } } : {}),
});
const variant = (nom: string, layers: LayerLu[]): VariantLu => ({ id: nom, nom, valeurs: { Severity: nom }, layers, modesEffectifs: {} });
const releve = (variants: VariantLu[]): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'k', id: '1', nom: 'x-alert' }, proprietes: [], variants,
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});
const codes = (r: ReleveDeComposant): string[] =>
  [...controlerLaTypographie(r, catalogue), ...controlerCouches(r, catalogue)].map((c) => c.code).filter((c) => c === 'C65' || c === 'C20' || c === 'C80');

test('un texte au style dont fontFamily vise primitives ne reçoit ni C65 ni C20', () => {
  const r = releve([variant('a', [calque([lier('fontFamily', 'k:famille', 'style')])])]);
  assert.deepEqual(codes(r), []);
});

test('un texte sans style qui lie fontFamily à primitives ne reçoit ni C65 ni C20', () => {
  const r = releve([variant('a', [calque([lier('fontFamily', 'k:famille')])])]);
  assert.deepEqual(codes(r), []);
});

test('un texte qui lie fontSize à primitives reçoit C65 et C20', () => {
  const r = releve([variant('a', [calque([lier('fontSize', 'k:taille')])])]);
  assert.deepEqual(codes(r).sort(), ['C20', 'C65']);
  const c65 = controlerLaTypographie(r, catalogue).find((c) => c.code === 'C65')!;
  assert.equal(c65.faits.collectionAttendue, 'typography');
});

test('C65 nomme primitives comme collection attendue pour une famille liée à typography', () => {
  const r = releve([variant('a', [calque([lier('fontFamily', 'k:typo')])])]);
  assert.equal(controlerLaTypographie(r, catalogue).find((c) => c.code === 'C65')?.faits.collectionAttendue, 'primitives');
});

test('un fill lié par un style de couleur vers theme ne reçoit ni C80 ni C20', () => {
  const r = releve([variant('a', [calque([lier('fills', 'k:fond', 'style')], 'RECTANGLE')])]);
  assert.deepEqual(codes(r), []);
  const direct = releve([variant('a', [calque([lier('fills', 'k:fond')], 'RECTANGLE')])]);
  assert.deepEqual(codes(direct), ['C80']);
});

test('C65 sans-liaison ne se déclenche pas quand les liaisons viennent du style', () => {
  const duStyle = () => calque([lier('fontSize', 'k:typo', 'style')]);
  const r = releve([variant('a', [duStyle()]), variant('b', [duStyle()]), variant('c', [calque([])]), variant('d', [duStyle()])]);
  assert.deepEqual(codes(r), []);
  const directs = () => calque([lier('fontSize', 'k:typo')]);
  const sansLiaison = releve([variant('a', [directs()]), variant('b', [directs()]), variant('c', [calque([])])]);
  assert.deepEqual(codes(sansLiaison), ['C65']);
});
