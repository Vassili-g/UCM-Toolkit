import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLeTheme as fondsDuComposant, controlerLesModes } from '../src/controles/theme.js';
import type { CatalogueDeReference, LayerLu, ReleveDeComposant } from '../src/controles/index.js';

const modes = [{ id: 'light', nom: 'Light' }, { id: 'dark', nom: 'Dark' }];
function cat(collections: CatalogueDeReference['collections'], variables: CatalogueDeReference['variables']): CatalogueDeReference {
  return { version: 1, library: null, collections, variables };
}
function releve(layer: LayerLu): ReleveDeComposant {
  return { version: 1, jeu: { cle: 'Alert', id: 'Alert', nom: 'Alert' }, proprietes: [],
    variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [layer] }],
    lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb' };
}
function layer(id: string, parent: string | null, name: string, variable?: { key: string; name: string; collection: string }, background?: { key: string; name: string; collection: string }): LayerLu {
  return {
    id, nom: name, type: 'TEXT', parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 10, hauteur: 10 },
    peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }], valeursEnDur: [],
    liaisons: [
      ...(variable ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: variable.key, cle: variable.key, nom: variable.name, collection: variable.collection, distante: false } }] : []),
      ...(background ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: background.key, cle: background.key, nom: background.name, collection: background.collection, distante: false } }] : []),
    ],
  };
}
const collection = (cle: string, role: 'theme' | 'brands', ms = modes) => ({ cle, nom: cle, role, modes: ms, etat: 'lue' as const });

const controlerLeTheme = (r: Parameters<typeof fondsDuComposant>[0], c: Parameters<typeof fondsDuComposant>[1]) => [...fondsDuComposant(r, c), ...controlerLesModes(c)];

test('C59 propose page/foreground si surface/foreground n’a aucun fond de surface', () => {
  const r = releve(layer('text', null, 'message', { key: 'fg-surface', name: 'success/surface/foreground', collection: 'themes' }));
  const c = cat([collection('themes', 'theme')], [
    { cle: 'fg-surface', nom: 'success/surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page', nom: 'success/page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
  ]);
  const resultat = controlerLeTheme(r, c).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction?.apres.cle, 'fg-page');
  assert.equal(resultat?.correction?.avant, 'fg-surface');
});

test('C59 disparaît quand un ancestor peint un fond surface visible', () => {
  const fond = layer('root', null, 'container', undefined, { key: 'bg', name: 'success/surface/default', collection: 'themes' });
  const texte = layer('text', 'root', 'message', { key: 'fg-surface', name: 'success/surface/foreground', collection: 'themes' });
  const r = releve(fond);
  r.variants[0].layers.push(texte);
  const c = cat([collection('themes', 'theme')], [
    { cle: 'fg-surface', nom: 'success/surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page', nom: 'success/page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'bg', nom: 'success/surface/default', collection: 'themes', type: 'COLOR', etat: 'presente' },
  ]);
  assert.equal(controlerLeTheme(r, c).some(({ code }) => code === 'C59'), false);
});

test('C60 corrige un alias Dark vers Light selon TABLE_DES_DOSSIERS', () => {
  const c = cat([collection('themes', 'theme'), collection('brands', 'brands')], [
    { cle: 'theme-ring', nom: 'success/vivid/ring', collection: 'themes', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-light' }, dark: { alias: 'brand-light' } } },
    { cle: 'brand-light', nom: 'success/vivid/light/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { valeur: '#000000' }, dark: { valeur: '#000000' } } },
    { cle: 'brand-dark', nom: 'success/vivid/dark/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { valeur: '#000000' }, dark: { valeur: '#000000' } } },
  ]);
  const resultat = controlerLeTheme(releve(layer('text', null, 'message')), c).find(({ code }) => code === 'C60');
  assert.equal(resultat?.correction?.avant, 'brand-light');
  assert.equal(resultat?.correction?.apres.cle, 'brand-dark');
  assert.equal(resultat?.correction?.cible.mode, 'dark');
});

test('C60 pose une question si l’alias mode boucle ou si la cible calculée manque', () => {
  const c = cat([collection('themes', 'theme'), collection('brands', 'brands')], [
    { cle: 'theme-ring', nom: 'success/vivid/ring', collection: 'themes', type: 'COLOR', etat: 'presente', valeurs: { dark: { alias: 'brand-light' } } },
    { cle: 'brand-light', nom: 'success/vivid/light/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-light' } } },
  ]);
  const resultat = controlerLeTheme(releve(layer('text', null, 'message')), c).find(({ code }) => code === 'C60');
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats, []);
});
