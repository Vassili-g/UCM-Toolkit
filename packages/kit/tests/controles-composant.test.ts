import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axeDePropriete, controlerNommage, controlerMapping, controlerCouches,
  type CatalogueDeReference, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

function releve(nom: string, proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: nom, id: nom, nom }, proprietes, variants: [],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

function catalogue(...noms: string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'composants', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: noms.map((nom, rang) => ({ cle: `v${rang}`, nom, collection: 'composants', type: 'COLOR', etat: 'presente' })),
  };
}

const axe = (nom: string, valeurs: string[]): ReleveDeComposant['proprietes'][number] => ({
  nom, type: 'VARIANT', valeurs, defaut: valeurs[0],
});

test('C7 signale une valeur d’axe absente, mais ignore un axe que les tokens ne portent pas', () => {
  const composant = releve('Button', [axe('Palette', ['primary', 'secondary'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/primary/background')).map(({ code, faits }) => [code, faits.valeur]),
    [['C7', 'secondary']]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/gap')), []);
});

test('C8 distingue la forme tolérée colors de la famille canonique color', () => {
  const composant = releve('Alert');
  assert.deepEqual(controlerNommage(composant, catalogue('alert/colors/info/standard/background')).map(({ code }) => code), ['C8']);
  assert.deepEqual(controlerNommage(composant, catalogue('alert/color/info/standard/background')), []);
});

test('C9 compare casse et séparateur sans confondre deux valeurs différentes', () => {
  const composant = releve('Button', [axe('Style', ['IconLeft'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/icon-left/background')).map(({ code }) => code), ['C9']);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/IconLeft/background')), []);
});

test('C10 reconnaît medium comme forme tolérée de md et accepte md', () => {
  const composant = releve('Button', [axe('Size', ['medium'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/medium/padding-x')).map(({ code }) => code), ['C10']);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/md/padding-x')), []);
});

test('C11 reconnaît les noms de l’axe d’état sans attribuer ce rôle à Variant', () => {
  assert.equal(axeDePropriete('States'), 'etat');
  assert.equal(axeDePropriete('STATE'), 'etat');
  assert.equal(axeDePropriete('Variant'), 'style');
  assert.equal(axeDePropriete('Label'), undefined);
});

function catalogueEtendu(...variables: { nom: string; collection: string; scopes?: string[]; type?: 'COLOR' | 'FLOAT'; alias?: string }[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: ['components', 'theme', 'layout', 'primitives'].map((role) => ({
      cle: role, nom: role, role: role as 'components' | 'theme' | 'layout' | 'primitives', modes: [], etat: 'lue' as const,
    })),
    variables: variables.map(({ nom, collection, scopes, type, alias }, rang) => ({
      cle: `v${rang}`, nom, collection, type: type ?? 'COLOR', etat: 'presente' as const, scopes,
      ...(alias ? { valeurs: { light: { alias } } } : {}),
    })),
  };
}

function variante(id: string, valeurs: Record<string, string>, cle: string, options: {
  champ?: string; nom?: string; type?: string;
} = {}): VariantLu {
  const champ = options.champ ?? 'fills';
  return {
    id, nom: id, valeurs, modesEffectifs: {}, layers: [{
      id: `layer-${id}`, nom: options.nom ?? 'container', type: options.type ?? 'FRAME', parent: null,
      visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
      peintures: [], valeursEnDur: [], liaisons: [{
        champ, indice: champ === 'fills' || champ === 'strokes' ? 0 : undefined, porteur: `layer-${id}`,
        variable: { id: cle, cle, nom: cle, collection: 'components', distante: false },
      }],
    }],
  };
}

const codes = (constats: ReturnType<typeof controlerMapping>): string[] => constats.map(({ code }) => code);

test('C15 compare la palette du token à la valeur du variant', () => {
  const r = releve('Alert', [axe('Severity', ['info', 'success'])]);
  r.variants = [variante('success', { Severity: 'success' }, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'alert/color/info/standard/background', collection: 'components' }))).includes('C15'));
  r.variants = [variante('info', { Severity: 'info' }, 'v0')];
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'alert/color/info/standard/background', collection: 'components' }))).includes('C15'));
});

test('C16 distingue un état erroné d’un token partagé entre états', () => {
  const r = releve('Button', [axe('State', ['default', 'hover'])]);
  r.variants = [variante('hover', { State: 'hover' }, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/default/background', collection: 'components' }))).includes('C16'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C16'));
});

test('C17 refuse un token background sur un texte, mais accepte foreground', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { nom: 'label', type: 'TEXT' })];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C17'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/foreground', collection: 'components' }))).includes('C17'));
});

test('C18 juge la portée seulement quand le catalogue la connaît', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components', scopes: ['TEXT_FILL'] }))).includes('C18'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components', scopes: ['FRAME_FILL'] }))).includes('C18'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C18'));
});

test('C19 signale un token d’un autre composant et garde celui du composant courant', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0')];
  assert.ok(codes(controlerMapping(r, catalogueEtendu({ nom: 'alert/color/background', collection: 'components' }))).includes('C19'));
  assert.ok(!codes(controlerMapping(r, catalogueEtendu({ nom: 'button/color/background', collection: 'components' }))).includes('C19'));
});

test('C20 juge la couche d’une dimension et C61 celle d’une couleur primitive', () => {
  const r = releve('Button');
  r.variants = [variante('default', {}, 'v0', { champ: 'paddingLeft' })];
  assert.ok(codes(controlerCouches(r, catalogueEtendu({ nom: 'dimension/14', collection: 'primitives', type: 'FLOAT' }))).includes('C20'));
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'sizing/14', collection: 'layout', type: 'FLOAT' }))), []);
  r.variants = [variante('default', {}, 'v0')];
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'color/blue/500', collection: 'primitives' }))), ['C20', 'C61']);
  assert.deepEqual(codes(controlerCouches(r, catalogueEtendu({ nom: 'primary/solid/background', collection: 'theme' }))), []);
});

test('C21 repère une liaison isolée parmi trois frères et tait un partage égal', () => {
  const r = releve('Button');
  r.variants = [variante('a', {}, 'v0'), variante('b', {}, 'v0'), variante('c', {}, 'v1')];
  const c = catalogueEtendu(
    { nom: 'button/color/background', collection: 'components' },
    { nom: 'button/color/foreground', collection: 'components' },
  );
  assert.equal(controlerMapping(r, c).filter(({ code }) => code === 'C21').length, 1);
  r.variants = [variante('a', {}, 'v0'), variante('b', {}, 'v1')];
  assert.equal(controlerMapping(r, c).filter(({ code }) => code === 'C21').length, 0);
});
