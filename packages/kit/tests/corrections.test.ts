import assert from 'node:assert/strict';
import test from 'node:test';
import { proposerLesCorrections, type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant, type VariantLu } from '../src/controles/index.js';

function releve(variantValeurs: Record<string, string>, layer: VariantLu['layers'][number]): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' },
    proprietes: Object.entries(variantValeurs).map(([nom, valeur]) => ({ nom, type: 'VARIANT', valeurs: [valeur], defaut: valeur })),
    variants: [{ id: 'variant-1', nom: 'Alert', valeurs: variantValeurs, modesEffectifs: {}, layers: [layer] }],
    lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

function layer(options: { name?: string; type?: string; token?: string; champ?: string; painted?: boolean; value?: number } = {}): LayerLu {
  const champ = options.champ ?? 'fills';
  return {
    id: 'layer-1', nom: options.name ?? 'container', type: options.type ?? 'FRAME', parent: null, visible: true, opacite: 1,
    dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: options.painted ? [{ champ: champ as 'fills' | 'strokes', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }] : [],
    valeursEnDur: options.value === undefined ? [] : [{ champ, valeur: options.value }],
    liaisons: options.token ? [{ champ, indice: 0, porteur: 'layer-1', variable: { id: 'old', cle: 'old', nom: options.token, collection: 'components', distante: false } }] : [],
  };
}

function catalogue(variables: CatalogueDeReference['variables'], extraCollections = false): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [
      { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
      ...(extraCollections ? [{ cle: 'layout', nom: 'layout', role: 'layout' as const, modes: [], etat: 'lue' as const }] : []),
    ], variables,
  };
}

function constat(code: string, faits: Constat['faits']): Constat {
  return { id: `${code}:test`, code: code as `C${number}`, type: 'corriger', famille: 'liaisons', variants: ['variant-1'], layers: ['layer-1'], faits };
}

test('un axe produit une correction quand le nom cible existe une seule fois', () => {
  const r = releve({ Severity: 'success' }, layer({ token: 'alert/color/info/standard/background' }));
  const c = catalogue([
    { cle: 'old', nom: 'alert/color/info/standard/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'new', nom: 'alert/color/success/standard/background', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const resultat = proposerLesCorrections(r, c, [constat('C15', { axe: 'Severity', valeur: 'success', token: 'alert/color/info/standard/background' })]);
  assert.equal(resultat.find(({ code }) => code === 'C15')?.correction, undefined);
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.apres.cle, 'new');
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.cible.layer, 'layer-1');
});

test('un axe sans cible exacte garde C15 et rend C22 en question', () => {
  const r = releve({ Severity: 'success' }, layer({ token: 'alert/color/info/standard/background' }));
  const c = catalogue([{ cle: 'old', nom: 'alert/color/info/standard/background', collection: 'components', type: 'COLOR', etat: 'presente' }]);
  const resultat = proposerLesCorrections(r, c, [constat('C15', { axe: 'Severity', valeur: 'success', token: 'alert/color/info/standard/background' })]);
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction, undefined);
  assert.deepEqual(resultat.find(({ code }) => code === 'C22')?.question?.candidats, []);
});

test('State=hover lié au token default devient une question avec son indice', () => {
  const r = releve({ State: 'hover' }, layer({ token: 'button/color/primary/contained/default/background' }));
  r.jeu.nom = 'Button';
  for (let i = 0; i < 54; i += 1) {
    const token = i < 46 ? 'button/color/primary/contained/hover/background' : 'button/color/primary/contained/default/background';
    r.variants.push({ id: `variant-${i + 2}`, nom: `Button ${i + 2}`, valeurs: { State: 'hover' }, modesEffectifs: {}, layers: [{ ...layer({ token }), id: `layer-${i + 2}` }] });
  }
  const c = catalogue([
    { cle: 'old', nom: 'button/color/primary/contained/default/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'hover', nom: 'button/color/primary/contained/hover/background', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const resultat = proposerLesCorrections(r, c, [constat('C16', { axe: 'State', valeur: 'hover', token: 'button/color/primary/contained/default/background' })]);
  const question = resultat.find(({ code, question: candidat }) => code === 'C16' && !!candidat);
  assert.equal(resultat.filter(({ code }) => code === 'C16').length, 1);
  assert.equal(question?.correction, undefined);
  assert.equal(question?.question?.candidats[0].cle, 'hover');
  assert.equal(question?.question?.indice, '46 des 54 variants State=hover emploient un token hover.');
});

test('un rôle attendu produit une correction sur son unique variable exacte', () => {
  const r = releve({ Severity: 'info' }, layer({ name: 'icon', token: 'alert/color/info/background' }));
  const c = catalogue([
    { cle: 'old', nom: 'alert/color/info/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'icon', nom: 'alert/color/info/icon', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const resultat = proposerLesCorrections(r, c, [constat('C17', { attendu: 'icon', token: 'alert/color/info/background' })]);
  assert.equal(resultat.find(({ code }) => code === 'C17')?.correction, undefined);
  assert.equal(resultat.find(({ code }) => code === 'C24')?.correction?.apres.cle, 'icon');
});

test('un layer title avec title et foreground possibles reste une question', () => {
  const r = releve({ Severity: 'info', Variant: 'standard' }, layer({ name: 'title', type: 'TEXT', painted: true }));
  const c = catalogue([
    { cle: 'fg', nom: 'alert/color/info/standard/foreground', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'title', nom: 'alert/color/info/standard/title', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const resultat = proposerLesCorrections(r, c, []);
  const c25 = resultat.find(({ code }) => code === 'C25');
  assert.deepEqual(c25?.question?.candidats.map(({ cle }) => cle), ['fg', 'title']);
  assert.equal(c25?.correction, undefined);
});

test('un layer title reçoit une correction si une seule des deux cibles existe', () => {
  const r = releve({ Severity: 'info', Variant: 'standard' }, layer({ name: 'title', type: 'TEXT', painted: true }));
  const c = catalogue([{ cle: 'fg', nom: 'alert/color/info/standard/foreground', collection: 'components', type: 'COLOR', etat: 'presente' }]);
  const resultat = proposerLesCorrections(r, c, []).find(({ code }) => code === 'C25');
  assert.equal(resultat?.correction?.apres.cle, 'fg');
  assert.equal(resultat?.correction?.cible.layer, 'layer-1');
});

test('C29 ne propose que si le catalogue porte exactement la valeur lue en pixels', () => {
  const r = releve({}, layer({ champ: 'paddingTop', value: 8 }));
  const c = catalogue([{ cle: 'size-8', nom: 'layout/sizing/8', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 8 } } }], true);
  const resultat = proposerLesCorrections(r, c, [])[0];
  assert.equal(resultat.correction?.apres.cle, 'size-8');
  const faux = catalogue([{ cle: 'size-9', nom: 'layout/sizing/9', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 9 } } }], true);
  const sansCandidat = proposerLesCorrections(r, faux, []).find(({ code }) => code === 'C29');
  assert.equal(sansCandidat?.correction, undefined);
  assert.deepEqual(sansCandidat?.question?.candidats, []);
  const mauvaisChamp = catalogue([{ cle: 'radius-8', nom: 'layout/radius/8', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 8 } } }], true);
  const incompatible = proposerLesCorrections(r, mauvaisChamp, []).find(({ code }) => code === 'C29');
  assert.deepEqual(incompatible?.question?.candidats, []);
  const modesDivergents = catalogue([{ cle: 'size-modes', nom: 'layout/sizing/8', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 8 }, Dark: { valeur: 9 } } }], true);
  assert.equal(proposerLesCorrections(r, modesDivergents, []).find(({ code }) => code === 'C29')?.correction, undefined);
  const multiple = catalogue([
    { cle: 'size-8a', nom: 'layout/sizing/8a', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 8 } } },
    { cle: 'size-8b', nom: 'layout/sizing/8b', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 8 } } },
  ], true);
  const questionMultiple = proposerLesCorrections(r, multiple, []).find(({ code }) => code === 'C29');
  assert.deepEqual(questionMultiple?.question?.candidats.map(({ cle }) => cle), ['size-8a', 'size-8b']);
});
