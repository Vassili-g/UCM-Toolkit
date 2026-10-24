import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerMapping, proposerLesCorrections, type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant, type VariantLu } from '../src/controles/index.js';

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
  const resultat = proposerLesCorrections(r, c, [constat('C15', { axe: 'Severity', valeur: 'success', token: 'alert/color/info/standard/background', champ: 'fills', indice: 0 })]);
  assert.equal(resultat.find(({ code }) => code === 'C15')?.correction, undefined);
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.apres.cle, 'new');
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.cible.layer, 'layer-1');
  // L'écriture d'Architect relit le nom de la variable encore liée, pas sa clé.
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.avant, 'alert/color/info/standard/background');
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.aRelire.avant, 'alert/color/info/standard/background');
});

test('un axe sans cible exacte garde C15 et rend C22 en question', () => {
  const r = releve({ Severity: 'success' }, layer({ token: 'alert/color/info/standard/background' }));
  const c = catalogue([{ cle: 'old', nom: 'alert/color/info/standard/background', collection: 'components', type: 'COLOR', etat: 'presente' }]);
  const resultat = proposerLesCorrections(r, c, [constat('C15', { axe: 'Severity', valeur: 'success', token: 'alert/color/info/standard/background', champ: 'fills', indice: 0 })]);
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
  const resultat = proposerLesCorrections(r, c, [constat('C16', { axe: 'State', valeur: 'hover', token: 'button/color/primary/contained/default/background', champ: 'fills', indice: 0 })]);
  const question = resultat.find(({ code, question: candidat }) => code === 'C16' && !!candidat);
  assert.equal(resultat.filter(({ code }) => code === 'C16').length, 1);
  assert.equal(question?.correction, undefined);
  assert.equal(question?.question?.candidats[0].cle, 'hover');
  assert.equal(question?.question?.indice, '46 des 54 variants State=hover emploient un token hover.');
});

test('un rôle attendu produit une correction sur son unique variable exacte', () => {
  const r = releve({ Severity: 'info', LegacyMode: 'classic' }, layer({ name: 'icon', token: 'alert/color/info/background' }));
  const c = catalogue([
    { cle: 'old', nom: 'alert/color/info/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'icon', nom: 'alert/color/info/icon', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const resultat = proposerLesCorrections(r, c, [constat('C17', { attendu: 'icon', token: 'alert/color/info/background', champ: 'fills', indice: 0 })]);
  assert.equal(resultat.find(({ code }) => code === 'C17')?.correction, undefined);
  assert.equal(resultat.find(({ code }) => code === 'C24')?.correction?.apres.cle, 'icon');
  assert.deepEqual(resultat.find(({ code }) => code === 'C24')?.correction?.aRelire.axes, { Severity: 'info', LegacyMode: 'classic' });
});

test('C22 cible le champ et l’indice de chaque peinture du constat', () => {
  const r = releve({ Severity: 'success' }, layer({ token: 'alert/color/info/standard/background' }));
  r.proprietes[0].valeurs = ['info', 'success'];
  const cible = r.variants[0].layers[0];
  cible.peintures = [
    { champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' },
    { champ: 'strokes', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' },
  ];
  cible.liaisons.push({ ...cible.liaisons[0], champ: 'strokes' });
  const c = catalogue([
    { cle: 'old', nom: 'alert/color/info/standard/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'new', nom: 'alert/color/success/standard/background', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const mapping = controlerMapping(r, c).filter(({ code }) => code === 'C15');
  assert.equal(mapping.length, 2);
  const corrections = proposerLesCorrections(r, c, mapping).filter(({ code }) => code === 'C22');
  assert.deepEqual(corrections.map(({ correction }) => [correction?.cible.champ, correction?.cible.indice]), [['fills', 0], ['strokes', 0]]);
});

test('C24 cible chaque peinture du constat quand deux peintures liées au même token ont des indices différents', () => {
  const r = releve({ Severity: 'info' }, layer({ name: 'label', type: 'TEXT', token: 'alert/color/info/background' }));
  const cible = r.variants[0].layers[0];
  cible.peintures = [0, 1].map((indice) => ({ champ: 'fills', indice, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }));
  cible.liaisons.push({ ...cible.liaisons[0], indice: 1 });
  const c = catalogue([
    { cle: 'old', nom: 'alert/color/info/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'new', nom: 'alert/color/info/foreground', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const mapping = controlerMapping(r, c).filter(({ code }) => code === 'C17');
  assert.equal(mapping.length, 2);
  const corrections = proposerLesCorrections(r, c, mapping).filter(({ code }) => code === 'C24');
  assert.deepEqual(corrections.map(({ correction }) => correction?.cible.indice), [0, 1]);
});

test('C24 cible la plage exacte du constat quand une même variable est liée à plusieurs plages de texte', () => {
  const r = releve({ Severity: 'info' }, layer({ name: 'label', type: 'TEXT', token: 'alert/color/info/background' }));
  const cible = r.variants[0].layers[0];
  cible.liaisons = [0, 1].map((rang) => ({
    ...cible.liaisons[0], indice: undefined, plage: rang === 0 ? { debut: 0, fin: 5 } : { debut: 5, fin: 10 },
  }));
  const c = catalogue([
    { cle: 'old', nom: 'alert/color/info/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'new', nom: 'alert/color/info/foreground', collection: 'components', type: 'COLOR', etat: 'presente' },
  ]);
  const mapping = controlerMapping(r, c).filter(({ code }) => code === 'C17');
  assert.equal(mapping.length, 2);
  const corrections = proposerLesCorrections(r, c, mapping).filter(({ code }) => code === 'C24');
  assert.deepEqual(corrections.map(({ correction }) => correction?.cible.plage), [{ debut: 0, fin: 5 }, { debut: 5, fin: 10 }]);
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

test('C25 ignore un gradient visible et conserve l’indice du SOLID qui le suit', () => {
  const r = releve({ Severity: 'info', Variant: 'standard' }, layer({ name: 'title', type: 'TEXT' }));
  const cible = r.variants[0].layers[0];
  cible.peintures = [
    { champ: 'fills', indice: 0, type: 'GRADIENT_LINEAR', visible: true, opacite: 1, blendMode: 'NORMAL' },
    { champ: 'fills', indice: 1, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' },
  ];
  const c = catalogue([{ cle: 'fg', nom: 'alert/color/info/standard/foreground', collection: 'components', type: 'COLOR', etat: 'presente' }]);
  const resultat = proposerLesCorrections(r, c, []).find(({ code }) => code === 'C25');
  assert.equal(resultat?.faits.indice, 1);
  assert.deepEqual(resultat?.correction?.cible, { layer: 'layer-1', champ: 'fills', indice: 1 });
  assert.equal(resultat?.correction?.apres.cle, 'fg');

  cible.peintures = [cible.peintures[0]];
  assert.equal(proposerLesCorrections(r, c, []).some(({ code }) => code === 'C25'), false);
});

// Depuis le lot K1, C29 cherche dans les tokens `components` du composant, jamais dans `layout`.
const flottant = (cle: string, nom: string, valeurs: Record<string, { valeur: number } | { alias: string }>, collection = 'components'): CatalogueDeReference['variables'][number] =>
  ({ cle, nom, collection, type: 'FLOAT', etat: 'presente', valeurs });
const c29DuCatalogue = (r: ReleveDeComposant, c: CatalogueDeReference) => proposerLesCorrections(r, c, []).find(({ code }) => code === 'C29');

test('C29 propose alert/size/border-width quand ce token du composant vaut la valeur lue', () => {
  const r = releve({ LegacyMode: 'classic' }, layer({ champ: 'strokeWeight', value: 1 }));
  const c = catalogue([
    flottant('bw', 'alert/size/border-width', { Light: { valeur: 1 } }),
    flottant('layout-1', 'layout/stroke/1', { Light: { valeur: 1 } }, 'layout'),
  ], true);
  const resultat = c29DuCatalogue(r, c);
  assert.equal(resultat?.question, undefined);
  assert.deepEqual(resultat?.correction?.apres, { cle: 'bw', nom: 'alert/size/border-width', collection: 'components', valeur: 1 });
  assert.deepEqual(resultat?.correction?.cible, { layer: 'layer-1', champ: 'strokeWeight' });
  assert.deepEqual(resultat?.correction?.aRelire.axes, { LegacyMode: 'classic' });
  assert.equal(resultat?.correction?.aRelire.valeur, 1);
});

test('C29 sans token exact du composant ne propose rien : ni correction ni question, le constat reste', () => {
  const r = releve({ LegacyMode: 'classic' }, layer({ champ: 'paddingTop', value: 8 }));
  const layoutSeul = catalogue([flottant('size-8', 'layout/sizing/8', { Light: { valeur: 8 } }, 'layout')], true);
  const constat = c29DuCatalogue(r, layoutSeul);
  assert.ok(constat, 'le constat reste');
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
  assert.equal(constat.faits.recherche, undefined);
  const sansCandidat: Array<[string, CatalogueDeReference['variables']]> = [
    ['une autre valeur, loin de la valeur lue', [flottant('pad-20', 'alert/size/padding-y', { Light: { valeur: 20 } })]],
    ['une autre propriété', [flottant('radius-8', 'alert/size/radius', { Light: { valeur: 8 } })]],
    ['des modes qui divergent', [flottant('pad-modes', 'alert/size/padding-y', { Light: { valeur: 8 }, Dark: { valeur: 9 } })]],
  ];
  for (const [cas, variables] of sansCandidat) {
    const resultat = c29DuCatalogue(r, catalogue(variables, true));
    assert.equal(resultat?.correction, undefined, cas);
    assert.equal(resultat?.question, undefined, cas);
  }
});

test('C29 avec deux tokens du composant exacts pose une question et ne corrige pas', () => {
  const r = releve({ LegacyMode: 'classic' }, layer({ name: 'container', champ: 'strokeWeight', value: 1 }));
  const multiple = catalogue([
    flottant('bw', 'alert/size/border-width', { Light: { valeur: 1 } }),
    flottant('bw-container', 'alert/size/container/border-width', { Light: { valeur: 1 } }),
  ], true);
  const resultat = c29DuCatalogue(r, multiple);
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats.map(({ cle }) => cle), ['bw', 'bw-container']);
});

test('C29 suit l’alias d’un token du composant vers layout pour trouver sa valeur', () => {
  const r = releve({ LegacyMode: 'classic' }, layer({ champ: 'strokeWeight', value: 1 }));
  const c = catalogue([
    flottant('layout-1', 'layout/stroke/1', { Light: { valeur: 1 } }, 'layout'),
    flottant('bw', 'alert/size/border-width', { Light: { alias: 'layout-1' } }),
  ], true);
  assert.equal(c29DuCatalogue(r, c)?.correction?.apres.cle, 'bw');
});
