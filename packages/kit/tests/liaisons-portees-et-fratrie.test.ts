/**
 * Lot E5d : une seule carte par liaison (Q-F3-12, Q-F3-16, N-06), le scope d'un fond de forme (N-04, N-05) et le token qui ne se lit
 * pas (N-21). Les variants s'écrivent en toutes lettres (`State=disabled`), les tokens en abrégé (`dis`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerCouches, controlerMapping, proposerLesCorrections,
  type CatalogueDeReference, type Constat, type LayerLu, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const SOLIDE = (champ: 'fills' | 'strokes' = 'fills'): PeintureLue => ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' });

function layer(id: string, nom: string, type: string, parent: string | null, token?: { cle: string; nom: string }, champ: 'fills' | 'strokes' = 'fills'): LayerLu {
  return {
    id, nom, type, parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: token ? [SOLIDE(champ)] : [], valeursEnDur: [],
    liaisons: token ? [{ champ, indice: 0, porteur: id, variable: { id: token.cle, cle: token.cle, nom: token.nom, collection: 'components', distante: false } }] : [],
  };
}

function releve(variants: { id: string; valeurs: Record<string, string>; layers: LayerLu[] }[], proprietes: Record<string, string[]>): ReleveDeComposant {
  const lus: VariantLu[] = variants.map(({ id, valeurs, layers }) => ({ id, nom: Object.entries(valeurs).map(([n, v]) => `${n}=${v}`).join(', '), valeurs, modesEffectifs: {}, layers }));
  return {
    version: 1, jeu: { cle: 'button', id: 'button', nom: 'Button' },
    proprietes: Object.entries(proprietes).map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs, defaut: valeurs[0] })),
    variants: lus, lecture: { layersLus: lus.reduce((n, v) => n + v.layers.length, 0), layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const jeton = (cle: string, nom: string, plus: Partial<CatalogueDeReference['variables'][number]> = {}): CatalogueDeReference['variables'][number] =>
  ({ cle, nom, collection: 'components', type: 'COLOR', etat: 'presente', ...plus });

function catalogue(variables: CatalogueDeReference['variables'], etat: 'lue' | 'inaccessible' = 'lue'): CatalogueDeReference {
  return { version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat }], variables };
}

const verifier = (r: ReleveDeComposant, c: CatalogueDeReference): Constat[] => proposerLesCorrections(r, c, controlerMapping(r, c));
const codes = (constats: readonly Constat[]): string[] => constats.map(({ code }) => code);

const PALETTES = { Palette: ['primary', 'danger'], State: ['default', 'disabled'] };

test('E5.7 : une liaison fausse en palette et en état reçoit une seule carte, vers le token qui corrige les deux segments', () => {
  const r = releve([{ id: 'v1', valeurs: { Palette: 'danger', State: 'disabled' }, layers: [layer('root', 'Root', 'FRAME', null, { cle: 'faux', nom: 'button/color/primary/default/background' })] }], PALETTES);
  const c = catalogue([
    jeton('faux', 'button/color/primary/default/background'), jeton('juste', 'button/color/danger/disabled/background'),
    jeton('palette', 'button/color/danger/default/background'), jeton('etat', 'button/color/primary/disabled/background'),
  ]);
  const constats = verifier(r, c).filter(({ code }) => code === 'C22' || code === 'C16');
  assert.equal(constats.length, 1);
  assert.equal(constats[0].code, 'C22', 'la carte reprend le code du premier segment faux dans le nom du token');
  assert.deepEqual(constats[0].correction?.apres, { cle: 'juste', nom: 'button/color/danger/disabled/background' });
  assert.equal(constats[0].faits.autresEcarts, 'State=disabled');
});

test('E5.7 : sans token qui corrige les deux segments, la carte devient une question sans correction', () => {
  const r = releve([{ id: 'v1', valeurs: { Palette: 'danger', State: 'disabled' }, layers: [layer('root', 'Root', 'FRAME', null, { cle: 'faux', nom: 'button/color/primary/default/background' })] }], PALETTES);
  const c = catalogue([jeton('faux', 'button/color/primary/default/background'), jeton('palette', 'button/color/danger/default/background')]);
  const constats = verifier(r, c).filter(({ code }) => code === 'C22' || code === 'C16');
  assert.equal(constats.length, 1);
  assert.equal(constats[0].correction, undefined);
  assert.deepEqual(constats[0].question?.candidats, []);
});

test('E5.7 : une liaison fausse en palette et en rôle reçoit une seule carte', () => {
  const r = releve([{ id: 'v1', valeurs: { Palette: 'danger', State: 'default' }, layers: [layer('root', 'Root', 'FRAME', null, { cle: 'faux', nom: 'button/color/primary/default/foreground' })] }], PALETTES);
  const c = catalogue([jeton('faux', 'button/color/primary/default/foreground'), jeton('juste', 'button/color/danger/default/background')]);
  const constats = verifier(r, c).filter(({ code }) => code === 'C22' || code === 'C24');
  assert.equal(constats.length, 1);
  assert.deepEqual(constats[0].correction?.apres, { cle: 'juste', nom: 'button/color/danger/default/background' });
});

test('E5.7 : une carte d’axe seul reste telle quelle', () => {
  const r = releve([{ id: 'v1', valeurs: { Palette: 'danger', State: 'default' }, layers: [layer('root', 'Root', 'FRAME', null, { cle: 'faux', nom: 'button/color/primary/default/background' })] }], PALETTES);
  const c = catalogue([jeton('faux', 'button/color/primary/default/background'), jeton('juste', 'button/color/danger/default/background')]);
  const constats = verifier(r, c).filter(({ code }) => code === 'C22');
  assert.equal(constats.length, 1);
  assert.equal(constats[0].faits.autresEcarts, undefined);
  assert.equal(constats[0].correction?.apres.cle, 'juste');
});

test('E5.7 : le C21 d’une liaison dont la carte propose le token se tait', () => {
  const fond = (id: string, cle: string, nom: string) => layer(id, 'Root', 'FRAME', null, { cle, nom });
  const A = 'button/color/default/background';
  const r = releve([
    { id: 'v1', valeurs: { State: 'default' }, layers: [fond('r1', 'def', A)] },
    { id: 'v2', valeurs: { State: 'default' }, layers: [fond('r2', 'def', A)] },
    { id: 'v3', valeurs: { State: 'disabled' }, layers: [fond('r3', 'def2', 'button/color/hover/background')] },
  ], { State: ['default', 'hover', 'disabled'] });
  const c = catalogue([jeton('def', 'button/color/default/background'), jeton('def2', 'button/color/hover/background'), jeton('dis', 'button/color/disabled/background')]);
  const brut = controlerMapping(r, c);
  assert.ok(codes(brut).includes('C21'), 'sans la carte, le C21 vise la même liaison');
  const constats = proposerLesCorrections(r, c, brut);
  assert.deepEqual(codes(constats).filter((code) => code === 'C16' || code === 'C21'), ['C16']);
  assert.equal(constats.find(({ code }) => code === 'C16')?.correction?.apres.cle, 'dis');
});

test('E5.7 : le C21 reste quand aucune carte ne propose de token', () => {
  const fond = (id: string, cle: string) => layer(id, 'Root', 'FRAME', null, { cle, nom: cle === 'def' ? 'button/color/default/background' : 'button/color/hover/background' });
  const r = releve([
    { id: 'v1', valeurs: { State: 'default' }, layers: [fond('r1', 'def')] },
    { id: 'v2', valeurs: { State: 'default' }, layers: [fond('r2', 'def')] },
    { id: 'v3', valeurs: { State: 'disabled' }, layers: [fond('r3', 'def2')] },
  ], { State: ['default', 'disabled'] });
  const c = catalogue([jeton('def', 'button/color/default/background'), jeton('def2', 'button/color/hover/background')]);
  const constats = verifier(r, c);
  assert.deepEqual(codes(constats).filter((code) => code === 'C21'), ['C21']);
});

test('E5.7 : le texte de surface sur un fond mal lié ne double pas la carte de l’axe', () => {
  // Le texte lié au token d'un autre style reçoit la carte d'axe ; le C59 que le thème en tire sur la même liaison se tait.
  const texte = { id: 'C59:v1:t:fills:0', code: 'C59', type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: ['t'], faits: { variable: 'button/color/primary/default/foreground', champ: 'fills', calque: 'Label', indice: 0 } } as const;
  const r = releve([{ id: 'v1', valeurs: { Palette: 'danger', State: 'default' }, layers: [layer('t', 'Label', 'TEXT', null, { cle: 'faux', nom: 'button/color/primary/default/foreground' })] }], PALETTES);
  const c = catalogue([jeton('faux', 'button/color/primary/default/foreground'), jeton('juste', 'button/color/danger/default/foreground')]);
  const constats = proposerLesCorrections(r, c, [...controlerMapping(r, c), { ...texte, variants: [...texte.variants], layers: [...texte.layers], faits: { ...texte.faits } }]);
  assert.deepEqual(codes(constats).filter((code) => code === 'C59' || code === 'C22'), ['C22']);
});

const FORME = (type: string, scopes: string[]) => {
  const jetonDeForme = jeton('t', 'button/color/primary/default/icon', { scopes });
  const r = releve([{ id: 'v1', valeurs: { State: 'default' }, layers: [layer('f', 'Glyph', type, null, { cle: 't', nom: jetonDeForme.nom })] }], { State: ['default'] });
  return controlerMapping(r, catalogue([jetonDeForme])).filter(({ code }) => code === 'C18');
};

test('N-04 : le scope SHAPE_FILL convient au fond d’une icône VECTOR et d’un RECTANGLE', () => {
  assert.deepEqual(FORME('VECTOR', ['SHAPE_FILL']), []);
  assert.deepEqual(FORME('RECTANGLE', ['SHAPE_FILL']), []);
  assert.deepEqual(FORME('ELLIPSE', ['SHAPE_FILL']), []);
});

test('N-05 : FRAME_FILL ne convient pas au fond d’une forme, SHAPE_FILL pas à celui d’un cadre', () => {
  const portees = (type: string, scopes: string[]) => FORME(type, scopes).map(({ faits }) => faits.portee);
  assert.deepEqual(portees('RECTANGLE', ['FRAME_FILL']), ['SHAPE_FILL']);
  assert.deepEqual(portees('VECTOR', ['FRAME_FILL']), ['SHAPE_FILL']);
  assert.deepEqual(portees('FRAME', ['SHAPE_FILL']), ['FRAME_FILL']);
  assert.deepEqual(portees('FRAME', ['FRAME_FILL']), []);
  assert.deepEqual(portees('RECTANGLE', ['ALL_FILLS']), []);
});

test('N-21 : une variable non chargée ou inaccessible, ou une collection inaccessible, ne reçoit ni C15 ni C16 ni C17', () => {
  const r = releve([{ id: 'v1', valeurs: { Palette: 'danger', State: 'disabled' }, layers: [layer('root', 'Root', 'FRAME', null, { cle: 'faux', nom: 'button/color/primary/default/foreground' })] }], PALETTES);
  const nom = 'button/color/primary/default/foreground';
  assert.ok(codes(controlerMapping(r, catalogue([jeton('faux', nom)]))).some((code) => code === 'C15' || code === 'C16' || code === 'C17'), 'témoin : lue, elle est accusée');
  for (const etat of ['non-chargee', 'inaccessible'] as const) {
    assert.deepEqual(codes(controlerMapping(r, catalogue([jeton('faux', nom, { etat })]))).filter((code) => code === 'C15' || code === 'C16' || code === 'C17'), [], etat);
  }
  assert.deepEqual(codes(controlerMapping(r, catalogue([jeton('faux', nom)], 'inaccessible'))).filter((code) => code === 'C15' || code === 'C16' || code === 'C17'), []);
});

test('E5.9 : l’alias d’un token de composant vers un autre token de components est un défaut', () => {
  const r = releve([{ id: 'v1', valeurs: { State: 'default' }, layers: [layer('root', 'Root', 'FRAME', null, { cle: 'a', nom: 'button/color/default/background' })] }], { State: ['default'] });
  const c = catalogue([
    jeton('a', 'button/color/default/background', { valeurs: { m: { alias: 'b' } } }),
    jeton('b', 'icons/color/default/background', { valeurs: { m: { valeur: '#000000' } } }),
  ]);
  c.collections[0].modes = [{ id: 'm', nom: 'Default' }];
  assert.deepEqual(codes(controlerCouches(r, c)), ['C20']);
});
