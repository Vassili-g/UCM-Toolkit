/**
 * Recette d'Alert, D10 : une lecture fausse des axes ne donne qu'un constat C84. Quand la moitié au moins des tokens de couleur lus du
 * composant ne correspond à aucun variant, C7, C13, C33 et C32 `sans-variant` n'en sont que la cascade et se taisent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerNommage, controlerOublis, sansLaCascadeDesVariants,
  type CatalogueDeReference, type Constat, type ReleveDeComposant, type VariableDuCatalogue,
} from '../src/controles/index.js';

type Axe = readonly [nom: string, valeurs: readonly string[]];

function releve(composant: string, axes: readonly Axe[]): ReleveDeComposant {
  const combinaisons = axes.reduce<Record<string, string>[]>((debut, [nom, valeurs]) => debut.flatMap((partiel) => valeurs.map((valeur) => ({ ...partiel, [nom]: valeur }))), [{}]);
  return {
    version: 1, jeu: { cle: composant.toLowerCase(), id: composant.toLowerCase(), nom: composant },
    proprietes: axes.map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs: [...valeurs], defaut: valeurs[0] })),
    variants: combinaisons.map((valeurs, rang) => ({ id: `v${rang}`, nom: `v${rang}`, valeurs, modesEffectifs: {}, layers: [] })),
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const jeton = (nom: string): VariableDuCatalogue => ({ cle: nom, nom, collection: 'components', type: 'COLOR', etat: 'presente' });

function catalogue(noms: readonly string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [{ id: 'l', nom: 'Light' }], etat: 'lue' }],
    variables: noms.map(jeton),
  };
}

const ROLES = ['foreground', 'background', 'border', 'icon'];
const tokens = (palettes: readonly string[], styles: readonly string[]): string[] =>
  palettes.flatMap((palette) => styles.flatMap((style) => ROLES.map((role) => `Alert/Color/${palette}/${style}/${role}`)));

const constatsDe = (r: ReleveDeComposant, c: CatalogueDeReference): Constat[] => [...controlerNommage(r, c), ...controlerOublis(r, c)];
const codes = (constats: readonly Constat[]): string[] => constats.map(({ code }) => code);
const cascade = (constats: readonly Constat[]): Constat[] => constats.filter(({ code, faits }) => ['C7', 'C13', 'C33'].includes(code) || (code === 'C32' && faits.motif === 'sans-variant'));

// Un axe `Style` (un nom de style) dont les valeurs sont écrites à la place de la palette : Info, Success, Warning, Danger.
const STYLE_A_LA_PLACE_DE_LA_PALETTE: readonly Axe[] = [['Style', ['Info', 'Success', 'Warning', 'Danger']], ['Variant', ['Filled', 'Outlined']]];
const PALETTES = ['Info', 'Success', 'Warning', 'Danger'];

test('D10 : sans le silence, la lecture fausse des axes donne la cascade de C7, C32 sans-variant et C33', () => {
  const brut = constatsDe(releve('Alert', STYLE_A_LA_PLACE_DE_LA_PALETTE), catalogue(tokens(PALETTES, ['Filled', 'Outlined'])));
  assert.equal(brut.filter(({ code }) => code === 'C7').length, 4);
  assert.equal(brut.filter(({ code, faits }) => code === 'C32' && faits.motif === 'sans-variant').length, 32);
  assert.equal(brut.filter(({ code }) => code === 'C33').length, 8);
});

test('D10 : la moitié des tokens de couleur sans variant donne un seul C84, et la cascade se tait', () => {
  const brut = constatsDe(releve('Alert', STYLE_A_LA_PLACE_DE_LA_PALETTE), catalogue(tokens(PALETTES, ['Filled', 'Outlined'])));
  assert.equal(brut.filter(({ code }) => code === 'C84').length, 1);
  const rendus = sansLaCascadeDesVariants(brut);
  assert.equal(rendus.filter(({ code }) => code === 'C84').length, 1);
  assert.deepEqual(cascade(rendus), []);
  // C63 des deux axes de style n'est pas dans la cascade.
  assert.ok(rendus.some(({ code }) => code === 'C63'));
});

test('D10 : C84 est un constat du composant, famille variants, type verifier, avec n et total', () => {
  const r = releve('Alert', STYLE_A_LA_PLACE_DE_LA_PALETTE);
  const [c84] = controlerOublis(r, catalogue(tokens(PALETTES, ['Filled', 'Outlined']))).filter(({ code }) => code === 'C84');
  assert.equal(c84.famille, 'variants');
  assert.equal(c84.type, 'verifier');
  assert.equal(c84.id, 'C84:alert');
  assert.equal(c84.faits.n, 32);
  assert.equal(c84.faits.total, 32);
});

test('D10 : le fait axe nomme la propriété dont les valeurs sont écrites à la place d’un autre rôle', () => {
  const [c84] = controlerOublis(releve('Alert', STYLE_A_LA_PLACE_DE_LA_PALETTE), catalogue(tokens(PALETTES, ['Filled', 'Outlined']))).filter(({ code }) => code === 'C84');
  assert.equal(c84.faits.axe, 'Style');
  assert.equal(c84.faits.role, 'palette');
});

test('D10 : sans position qui donne un autre rôle aux valeurs, C84 n’a ni axe ni role', () => {
  // Variant=Filled|Outlined, mais les tokens écrivent Solid et Line à la position du style : la position est bien celle du style.
  const r = releve('Alert', [['Variant', ['Filled', 'Outlined']]]);
  const noms = ['Solid', 'Line'].flatMap((style) => ROLES.map((role) => `Alert/Color/Info/${style}/${role}`));
  const brut = constatsDe(r, catalogue(noms));
  const [c84] = brut.filter(({ code }) => code === 'C84');
  assert.deepEqual(c84.faits, { n: 8, total: 8 });
  assert.ok(cascade(brut).length > 0, 'la cascade existe avant le silence');
  assert.deepEqual(cascade(sansLaCascadeDesVariants(brut)), []);
});

test('D10 : sous la moitié, les constats d’avant restent et aucun C84 ne naît', () => {
  const r = releve('Alert', [['Variant', ['Filled', 'Outlined']]]);
  // 2 tokens sur 10 écrivent un style absent des variants.
  const noms = [...ROLES.flatMap((role) => ['Filled', 'Outlined'].map((style) => `Alert/Color/Info/${style}/${role}`)), 'Alert/Color/Info/Solid/foreground', 'Alert/Color/Info/Solid/icon'];
  const brut = constatsDe(r, catalogue(noms));
  assert.ok(!codes(brut).includes('C84'));
  const rendus = sansLaCascadeDesVariants(brut);
  assert.deepEqual(rendus, brut);
  assert.equal(rendus.filter(({ code, faits }) => code === 'C32' && faits.motif === 'sans-variant').length, 2);
});

test('D10 : la moitié exactement suffit', () => {
  const r = releve('Alert', [['Variant', ['Filled', 'Outlined']]]);
  // 4 tokens sur 8 écrivent un style absent des variants.
  const noms = [...ROLES.map((role) => `Alert/Color/Info/Filled/${role}`), ...ROLES.map((role) => `Alert/Color/Info/Solid/${role}`)];
  const [c84] = controlerOublis(r, catalogue(noms)).filter(({ code }) => code === 'C84');
  assert.equal(c84.faits.n, 4);
  assert.equal(c84.faits.total, 8);
});

test('D10 : Alert bien lu (Type=palette, Variant=style) ne donne pas de C84', () => {
  const r = releve('Alert', [['Type', ['Info', 'Success', 'Warning', 'Danger']], ['Variant', ['Filled', 'Outlined']]]);
  const brut = constatsDe(r, catalogue(tokens(PALETTES, ['Filled', 'Outlined'])));
  assert.ok(!codes(brut).includes('C84'));
});

test('D10 : sans variant lu, rien ne se compare et aucun C84 ne naît', () => {
  const r = { ...releve('Alert', [['Variant', ['Filled', 'Outlined']]]), variants: [] };
  assert.ok(!codes(controlerOublis(r, catalogue(tokens(['Info'], ['Filled'])))).includes('C84'));
});

test('D10 : le silence garde C32 inutilise et nom-illisible, et les codes voisins', () => {
  const constat = (code: Constat['code'], faits: Constat['faits'] = {}): Constat => ({ id: `${code}:${JSON.stringify(faits)}`, code, type: 'verifier', famille: 'tokens', variants: [], layers: [], faits });
  const brut = [
    constat('C84', { n: 4, total: 8 }), constat('C7'), constat('C13'), constat('C33'), constat('C12'), constat('C31'),
    constat('C32', { motif: 'sans-variant' }), constat('C32', { motif: 'inutilise' }), constat('C32', { motif: 'nom-illisible' }),
  ];
  assert.deepEqual(sansLaCascadeDesVariants(brut).map(({ code, faits }) => `${code}${faits.motif ? `:${faits.motif}` : ''}`), ['C84', 'C12', 'C31', 'C32:inutilise', 'C32:nom-illisible']);
});
