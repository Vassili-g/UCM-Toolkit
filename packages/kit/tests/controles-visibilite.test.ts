/** Un layer sous un parent masqué est masqué : accessibilité et typographie ne le jugent pas. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLAccessibilite, controlerLaTypographie, layersVisiblesDuVariant,
  type CatalogueDeReference, type LayerLu, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index';

const dims = { x: 0, y: 0, largeur: 100, hauteur: 48 };
const noir = { r: 0, g: 0, b: 0, a: 1 };
const blanc = { r: 1, g: 1, b: 1, a: 1 };
const solide = (champ: 'fills' | 'strokes', couleur = noir) =>
  ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur });
const layer = (id: string, parent: string | null, over: Partial<LayerLu> = {}): LayerLu => ({
  id, nom: id, type: 'FRAME', parent, visible: true, opacite: 1, dimensions: dims, peintures: [], liaisons: [], valeursEnDur: [], ...over,
});
const racine = layer('r', null, { nom: 'Root', peintures: [solide('fills', blanc)] });
const groupe = (visible: boolean) => layer('g', 'r', { nom: 'Groupe', visible });
const texte = (parent: string, over: Partial<LayerLu> = {}, fontSize = 10): LayerLu => layer('t', parent, {
  nom: 'Label', type: 'TEXT',
  texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize, fontWeight: 400, peintures: [solide('fills')], liaisons: [] }] }, ...over,
});
const anneau = (parent: string): LayerLu => layer('f', parent, { nom: 'Focus ring', type: 'RECTANGLE', peintures: [solide('strokes')], strokeWeight: 2 });
const variant = (layers: LayerLu[], valeurs: Record<string, string> = {}): VariantLu => ({ id: 'v', nom: 'v', valeurs, layers, modesEffectifs: {} });
const releve = (v: VariantLu, etats: string[] = []): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'k', id: '1', nom: 'x-button' },
  proprietes: etats.length ? [{ nom: 'State', type: 'VARIANT', valeurs: etats, defaut: etats[0] }] : [],
  variants: [v], lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});
const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const acces = (r: ReleveDeComposant) => controlerLAccessibilite(r, catalogue, { niveau: 'AA' });

test('layersVisiblesDuVariant : un ancêtre masqué masque ses descendants, un parent absent ou un cycle non', () => {
  const ids = (layers: LayerLu[]) => layersVisiblesDuVariant(variant(layers)).map((l) => l.id);
  assert.deepEqual(ids([racine, groupe(false), texte('g')]), ['r']);
  assert.deepEqual(ids([racine, groupe(true), texte('g')]), ['r', 'g', 't']);
  assert.deepEqual(ids([racine, texte('absent')]), ['r', 't']);
  assert.deepEqual(ids([layer('a', 'b'), layer('b', 'a')]), ['a', 'b']);
});

test('C49 : un texte de 10 px dans un groupe masqué n est pas jugé, visible il l est', () => {
  const masque = acces(releve(variant([racine, groupe(false), texte('g')])));
  assert.equal(masque.filter((c) => c.code === 'C49').length, 0);
  const visible = acces(releve(variant([racine, groupe(true), texte('g')])));
  assert.ok(visible.some((c) => c.code === 'C49'));
});

test('C50 : un anneau dans un groupe masqué ne compte pas, le variant en focus reste sans anneau', () => {
  const masque = acces(releve(variant([racine, groupe(false), anneau('g')], { State: 'focus' }), ['focus']));
  assert.ok(masque.find((c) => c.id === 'C50:sans-anneau'));
  const visible = acces(releve(variant([racine, groupe(true), anneau('g')], { State: 'focus' }), ['focus']));
  assert.equal(visible.find((c) => c.id === 'C50:sans-anneau'), undefined);
});

test('C64 : un texte sans style dans un groupe masqué n est pas signalé, visible il l est', () => {
  const typo = (r: ReleveDeComposant) => controlerLaTypographie(r, catalogue).filter((c) => c.code === 'C64');
  assert.equal(typo(releve(variant([racine, groupe(false), texte('g')]))).length, 0);
  assert.equal(typo(releve(variant([racine, groupe(true), texte('g')]))).length, 1);
});
