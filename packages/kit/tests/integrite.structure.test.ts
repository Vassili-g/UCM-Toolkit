/** C82 : les couches, les valeurs directes, les scopes, les modes du thème, le type et le rangement des variables. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type CollectionDuCatalogue, type Constat, type VariableDuCatalogue,
} from '../src/controles/index.js';
import type { Collection } from '../src/referentiel/architecture.js';
import { catalogueDeStructure, cleDeLaFixture } from './fixtures/catalogueDeStructure.js';

const GENRES = ['couche', 'valeur-directe', 'scopes', 'mode-du-theme', 'type', 'mal-rangee'];
const structure = (catalogue: CatalogueDeReference): Constat[] => controlerLIntegriteUcm(catalogue).filter((constat) => GENRES.includes(String(constat.faits.genre)));

const collection = (role: Collection, modes = ['M']): CollectionDuCatalogue => ({
  cle: role, nom: role, role, etat: 'lue', modes: modes.map((nom) => ({ id: `${role}:${nom}`, nom })),
});

type Valeur = { alias: string } | { valeur: unknown };

function variable(role: Collection, nom: string, valeurs: Valeur | Record<string, Valeur> = { valeur: null }, autres: Partial<VariableDuCatalogue> = {}): VariableDuCatalogue {
  const parMode = 'alias' in valeurs || 'valeur' in valeurs ? { [`${role}:M`]: valeurs as Valeur } : valeurs as Record<string, Valeur>;
  return { cle: `${role}|${nom}`, nom, collection: role, type: 'COLOR', etat: 'presente', valeurs: parMode, ...autres };
}

const alias = (role: Collection, nom: string): Valeur => ({ alias: `${role}|${nom}` });

/** Un fichier minimal : `theme` aux deux modes reconnus, et les collections que le cas demande. */
function fichier(roles: readonly Collection[], variables: readonly VariableDuCatalogue[]): CatalogueDeReference {
  const collections = [collection('theme', ['Light', 'Dark']), ...roles.map((role) => collection(role))];
  return { version: 1, library: null, collections, variables: [...variables] };
}

test('1. la fixture complète ne rend aucun constat de structure', () => {
  assert.deepEqual(structure(catalogueDeStructure()), []);
});

test('2. couche : une couleur dont l’alias vise une couche hors de ses cibles', () => {
  const constats = structure(fichier(['components', 'brands', 'primitives', 'layout', 'typography'], [
    variable('components', 'button/color', alias('layout', 'radius/color')),
    variable('components', 'button/border', alias('typography', 'font/color')),
    variable('components', 'button/fill', alias('primitives', 'colors/blue/700')),
    variable('components', 'button/bg', alias('brands', 'primary/light/700')),
    variable('components', 'button/ok', alias('brands', 'primary/light/700')),
    variable('layout', 'radius/color', { valeur: 4 }, { type: 'FLOAT' }),
    variable('typography', 'font/color', { valeur: '#112233' }),
    variable('brands', 'primary/light/700', alias('primitives', 'colors/blue/700')),
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }),
  ])).filter((constat) => constat.faits.genre === 'couche');
  assert.deepEqual(constats.map((constat) => constat.faits.variable), ['button/color', 'button/border', 'button/fill', 'button/bg', 'button/ok']);
  assert.deepEqual(constats.map((constat) => constat.faits.coucheCible), ['layout', 'typography', 'primitives', 'brands', 'brands']);
  assert.ok(constats.every((constat) => constat.code === 'C82' && constat.type === 'corriger' && constat.famille === 'liaisons' && constat.correction === undefined));
  assert.equal(constats[0].id, 'C82:couche:components|button/color:components:M');
  assert.equal(constats[0].faits.mode, 'M');
  assert.equal(constats[0].faits.cible, 'radius/color');
});

test('3. couche : une couleur de composant vers theme, et un thème vers brands ou utility, restent muets', () => {
  const constats = structure(fichier(['components', 'brands', 'primitives'], [
    variable('components', 'button/bg', alias('theme', 'primary/solid/default')),
    variable('theme', 'primary/solid/default', { 'theme:Light': alias('brands', 'primary/light/700'), 'theme:Dark': alias('brands', 'primary/dark/700') }),
    variable('brands', 'primary/light/700', alias('primitives', 'colors/blue/700')),
    variable('brands', 'primary/dark/700', alias('primitives', 'colors/blue/700')),
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }),
  ])).filter((constat) => constat.faits.genre === 'couche');
  assert.deepEqual(constats, []);
});

test('4. couche : un alias vers une variable absente ou une collection sans rôle ne rend rien', () => {
  const sans = fichier(['components'], [variable('components', 'button/bg', alias('components', 'absent')), variable('components', 'button/b', alias('components', 'button/bg'))]);
  const autre: CatalogueDeReference = { ...sans, collections: [...sans.collections, { cle: 'libre', nom: 'Libre', role: null, etat: 'lue', modes: [{ id: 'libre:M', nom: 'M' }] }], variables: [...sans.variables, variable('components', 'button/c', { alias: 'libre|x' }), { cle: 'libre|x', nom: 'x', collection: 'libre', type: 'COLOR', etat: 'presente' }] };
  assert.deepEqual(structure(autre).filter((constat) => constat.faits.genre === 'couche').map((constat) => constat.faits.variable), ['button/b']);
});

test('5. valeur directe : une couleur sans alias hors de primitives et de components', () => {
  const constats = structure(fichier(['components', 'brands', 'primitives', 'typography'], [
    variable('theme', 'primary/page/foreground', { 'theme:Light': { valeur: '#000000' }, 'theme:Dark': alias('brands', 'primary/dark/700') }),
    variable('brands', 'primary/dark/700', alias('primitives', 'colors/blue/700')),
    variable('components', 'button/bg', { valeur: '#112233' }),
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }),
    variable('typography', 'font/size', { valeur: 12 }, { type: 'FLOAT' }),
  ])).filter((constat) => constat.faits.genre === 'valeur-directe');
  assert.deepEqual(constats.map((constat) => [constat.id, constat.faits.mode]), [['C82:valeur-directe:theme|primary/page/foreground:theme:Light', 'Light']]);
  assert.equal(constats[0].correction, undefined);
  assert.equal(constats[0].type, 'corriger');
});

test('6. scopes : une variable de primitives, brands ou utility qui porte un scope, ALL_SCOPES compris', () => {
  const constats = structure(fichier(['brands', 'utility', 'primitives', 'layout'], [
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }, { scopes: ['ALL_SCOPES'] }),
    variable('brands', 'primary/light/700', alias('primitives', 'colors/blue/700'), { scopes: ['FRAME_FILL', 'SHAPE_FILL'] }),
    variable('utility', 'neutral/light/100', alias('primitives', 'colors/blue/700'), { scopes: [] }),
    variable('utility', 'neutral/light/200', alias('primitives', 'colors/blue/700')),
    variable('layout', 'color/x', { valeur: '#000000' }, { scopes: ['ALL_SCOPES'] }),
  ])).filter((constat) => constat.faits.genre === 'scopes');
  assert.deepEqual(constats.map((constat) => constat.id), ['C82:scopes:primitives|colors/blue/700', 'C82:scopes:brands|primary/light/700']);
  const [tout, deux] = constats;
  assert.deepEqual(tout.correction, {
    id: tout.id, sorte: 'scope', cible: { variable: 'primitives|colors/blue/700' }, avant: 'ALL_SCOPES', apres: { nom: '' },
    aRelire: { regle: tout.correction?.aRelire.regle, avant: 'ALL_SCOPES' },
  });
  assert.equal(deux.correction?.avant, 'FRAME_FILL,SHAPE_FILL');
  assert.equal(deux.correction?.apres.nom, '');
});

test('7. mode du thème : un thème sans light, sans dark, ou sans aucun des deux', () => {
  const avecModes = (...noms: string[]): CatalogueDeReference => {
    const base = fichier([], []);
    return { ...base, collections: [collection('theme', noms)] };
  };
  const manques = (...noms: string[]) => structure(avecModes(...noms)).filter((constat) => constat.faits.genre === 'mode-du-theme');
  assert.deepEqual(manques('Light', 'Dark'), []);
  assert.deepEqual(manques('Light', 'Contraste').map((constat) => [constat.id, constat.faits.manque]), [['C82:mode-du-theme:theme:dark', 'dark']]);
  assert.deepEqual(manques('Jour', 'Dark').map((constat) => constat.faits.manque), ['light']);
  const aucun = manques('Mode 1');
  assert.deepEqual(aucun.map((constat) => [constat.id, constat.faits.manque]), [['C82:mode-du-theme:theme:les-deux', 'les-deux']]);
  assert.ok(aucun.every((constat) => constat.code === 'C82' && constat.type === 'corriger' && constat.correction === undefined));
});

test('8. type : une variable de theme reconnue qui n’est pas une couleur', () => {
  const constats = structure(fichier([], [
    variable('theme', 'primary/solid/default', { valeur: 4 }, { type: 'FLOAT' }),
    variable('theme', 'primary/solid/hover', { valeur: null }),
    variable('theme', 'primary/identity', { valeur: 'x' }, { type: 'STRING' }),
  ])).filter((constat) => constat.faits.genre === 'type');
  assert.deepEqual(constats.map((constat) => [constat.id, constat.faits.type]), [['C82:type:theme|primary/solid/default', 'FLOAT']]);
  assert.equal(constats[0].correction, undefined);
});

test('9. mal rangée : une variable de palette à deux segments ailleurs que dans theme', () => {
  const constats = structure(fichier(['brands', 'utility', 'primitives', 'layout', 'typography', 'components'], [
    variable('brands', 'primary/surface/default', alias('primitives', 'colors/blue/700')),
    variable('utility', 'neutral/solid/hover', alias('primitives', 'colors/blue/700')),
    variable('primitives', 'ring', { valeur: '#000000' }),
    variable('primitives', 'colors/page/foreground', { valeur: '#000000' }),
    variable('layout', 'surface/default', { valeur: 4 }, { type: 'FLOAT' }),
    variable('typography', 'font/surface/divider', { valeur: 1 }, { type: 'FLOAT' }),
    variable('brands', 'primary/light/700', alias('primitives', 'colors/blue/700')),
    variable('components', 'button/surface/default', alias('theme', 'primary/surface/default')),
  ])).filter((constat) => constat.faits.genre === 'mal-rangee');
  assert.deepEqual(constats.map((constat) => constat.faits.variable), ['primary/surface/default', 'neutral/solid/hover', 'colors/page/foreground', 'surface/default', 'font/surface/divider']);
  assert.deepEqual(constats.map((constat) => constat.faits.collection), ['brands', 'utility', 'primitives', 'layout', 'typography']);
  assert.equal(constats[0].id, 'C82:mal-rangee:brands|primary/surface/default');
  assert.ok(constats.every((constat) => constat.correction === undefined));
});

/** Le fichier de `integrationsUcm.test.ts` (fichierAssocie) : mêmes variables, mêmes alias, mêmes scopes. */
function fichierAssocie(): CatalogueDeReference {
  return fichier(['components', 'brands', 'primitives'], [
    variable('components', 'button/bg', alias('theme', 'primary/solid/default')),
    variable('components', 'button/border', alias('primitives', 'colors/blue/700')),
    variable('theme', 'primary/solid/default', { 'theme:Light': alias('brands', 'primary/light/700'), 'theme:Dark': alias('brands', 'primary/light/700') }, { scopes: ['FRAME_FILL', 'SHAPE_FILL'] }),
    variable('theme', 'primary/page/foreground', { 'theme:Light': { valeur: '#000000' }, 'theme:Dark': { valeur: '#000000' } }, { scopes: ['ALL_SCOPES'] }),
    variable('brands', 'primary/light/700', alias('primitives', 'colors/blue/700'), { scopes: [] }),
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }, { scopes: ['ALL_SCOPES'] }),
  ]);
}

test('10. sur le fichier du profil, les règles couche, valeur-directe et portée rendent le même verdict', () => {
  const verdicts = structure(fichierAssocie()).map((constat) => `${constat.faits.genre}:${constat.faits.variable}`);
  assert.deepEqual(verdicts, ['couche:button/border', 'valeur-directe:primary/page/foreground', 'valeur-directe:primary/page/foreground', 'scopes:colors/blue/700']);
  assert.deepEqual(controlerLIntegriteUcm(fichierAssocie()).filter((constat) => constat.faits.variable === 'primary/solid/default'), []);
});

test('11. le profil et C82 jugent une couleur de composant comme une autre nature de cible', () => {
  const catalogue = fichier(['components', 'layout', 'typography', 'primitives'], [
    variable('components', 'button/color', alias('layout', 'radius/button')),
    variable('components', 'vers-typography', alias('typography', 'font/color')),
    variable('components', 'vers-primitives', alias('primitives', 'colors/blue/700')),
    variable('layout', 'radius/button', { valeur: 4 }, { type: 'FLOAT' }),
    variable('typography', 'font/color', { valeur: '#112233' }),
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }),
  ]);
  const couches = structure(catalogue).filter((constat) => constat.faits.genre === 'couche');
  assert.deepEqual(couches.map((constat) => [constat.faits.variable, constat.faits.coucheCible]), [
    ['button/color', 'layout'], ['vers-typography', 'typography'], ['vers-primitives', 'primitives'],
  ]);
});

test('12. les identifiants sont uniques, et la clé d’une variable de la fixture reste celle du catalogue', () => {
  const catalogue = catalogueDeStructure();
  const sale: CatalogueDeReference = {
    ...catalogue,
    variables: [...catalogue.variables, variable('theme', 'primary/solid/default', { valeur: 4 }, { cle: cleDeLaFixture('theme', 'extra'), type: 'FLOAT' })],
  };
  const constats = structure(sale);
  assert.equal(constats.length, 1);
  assert.equal(constats[0].id, `C82:type:${cleDeLaFixture('theme', 'extra')}`);
});

test('13. une couleur sans alias n’a qu’un juge par collection : C63 pour components, C82 pour le reste', () => {
  const catalogue = fichier(['components', 'brands', 'primitives'], [
    variable('components', 'button/color/bg', { valeur: '#112233' }),
    variable('theme', 'primary/page/foreground', { 'theme:Light': { valeur: '#000000' }, 'theme:Dark': { valeur: '#FFFFFF' } }),
    variable('brands', 'primary/dark/700', { valeur: '#112233' }),
    variable('primitives', 'colors/blue/700', { valeur: '#1E40AF' }),
  ]);
  const jugees = (constats: Constat[], genre: string): string[] => constats.filter((constat) => constat.faits.genre === genre).map((constat) => String(constat.faits.variable));
  const sansAlias = jugees(controlerLeCatalogue(catalogue), 'couleur-sans-alias');
  const directes = jugees(controlerLIntegriteUcm(catalogue), 'valeur-directe');
  assert.deepEqual(sansAlias, ['button/color/bg']);
  assert.deepEqual([...new Set(directes)].sort(), ['primary/dark/700', 'primary/page/foreground']);
  assert.deepEqual(sansAlias.filter((variable) => directes.includes(variable)), [], 'aucune variable n’est jugée deux fois');
});
