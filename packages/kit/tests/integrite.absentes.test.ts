/** C82 : les variables que le thème prévoit et que `theme` n'a pas, et leur création exacte. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLIntegriteUcm, type CatalogueDeReference, type Constat } from '../src/controles/index.js';
import type { VariableDuTheme } from '../src/emplois/index.js';
import {
  MODE_DARK, MODE_LIGHT, avecEcriture, avecUneMarque, catalogueDeStructure, cleDeLaFixture, renommer,
} from './fixtures/catalogueDeStructure.js';

const absentes = (catalogue: CatalogueDeReference, ecriture = avecEcriture('minuscules', 'tiret'), rolesIgnores?: readonly VariableDuTheme[]): Constat[] =>
  controlerLIntegriteUcm(catalogue, { ecriture, ...(rolesIgnores ? { rolesIgnores } : {}) }).filter((constat) => constat.faits.genre === 'variable-absente');

const trouver = (constats: readonly Constat[], groupe: string, variable: string): Constat => {
  const constat = constats.find((entree) => entree.faits.groupe === groupe && entree.faits.variable === variable);
  assert.ok(constat, `${groupe}/${variable}`);
  return constat;
};

const aliasDe = (constat: Constat) => constat.correction?.creation?.alias ?? {};

test('1. la fixture rend 23 constats de variable absente, tous avec une correction', () => {
  const constats = absentes(catalogueDeStructure());
  assert.equal(constats.length, 23);
  assert.ok(constats.every((constat) => constat.code === 'C82' && constat.faits.genre === 'variable-absente' && constat.correction?.sorte === 'variable'));
  assert.equal(new Set(constats.map((constat) => constat.id)).size, 23);
  assert.equal(constats.filter((constat) => constat.faits.variable === 'surface/subtle').length, 11);
  assert.equal(constats.filter((constat) => constat.faits.variable === 'surface/divider').length, 11);
  const reste = constats.filter((constat) => constat.faits.variable !== 'surface/subtle' && constat.faits.variable !== 'surface/divider');
  assert.deepEqual(reste.map((constat) => [constat.faits.groupe, constat.faits.variable]), [['neutral', 'page/foreground']]);
  assert.equal(constats[0].id, 'C82:variable-absente:theme:primary/surface/subtle');
});

test('2. subtle et divider visent le cran de la table dans la rampe de leurs jumelles', () => {
  const constats = absentes(catalogueDeStructure());
  const subtle = aliasDe(trouver(constats, 'primary', 'surface/subtle'));
  assert.deepEqual(subtle[MODE_LIGHT], { cle: cleDeLaFixture('brands', 'primary/light/50'), nom: 'primary/light/50' });
  assert.deepEqual(subtle[MODE_DARK], { cle: cleDeLaFixture('brands', 'primary/dark/100'), nom: 'primary/dark/100' });
  const divider = aliasDe(trouver(constats, 'primary', 'surface/divider'));
  assert.equal(divider[MODE_LIGHT].nom, 'primary/light/300');
  assert.equal(divider[MODE_DARK].nom, 'primary/dark/500');
  const neutre = aliasDe(trouver(constats, 'neutral', 'surface/subtle'));
  assert.equal(neutre[MODE_LIGHT].cle, cleDeLaFixture('utility', 'neutral/light/50'));
  assert.equal(neutre[MODE_DARK].nom, 'neutral/dark/100');
  const statut = aliasDe(trouver(constats, 'success/vivid', 'surface/subtle'));
  assert.equal(statut[MODE_LIGHT].nom, 'success/vivid/light/50');
  const texte = aliasDe(trouver(constats, 'neutral', 'page/foreground'));
  assert.equal(texte[MODE_LIGHT].nom, 'neutral/light/700');
  assert.equal(texte[MODE_DARK].nom, 'neutral/dark/800');
});

test('3. les scopes viennent de SUPPORT_DES_VARIABLES', () => {
  const constats = absentes(catalogueDeStructure());
  const subtle = trouver(constats, 'primary', 'surface/subtle').correction?.creation;
  assert.deepEqual([...subtle?.scopes ?? []].sort(), ['FRAME_FILL', 'SHAPE_FILL']);
  const divider = trouver(constats, 'primary', 'surface/divider').correction?.creation;
  assert.deepEqual([...divider?.scopes ?? []].sort(), ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR']);
  assert.equal(subtle?.type, 'COLOR');
  assert.equal(subtle?.collection, 'theme');
});

test('4. le nom créé suit l’écriture choisie, et un dossier existant garde la sienne', () => {
  const ecriture = avecEcriture('PascalCase', 'soude');
  const pascal = renommer(catalogueDeStructure(), (entree) => (entree.collection === 'theme' && entree.nom.startsWith('primary/')
    ? entree.nom.split('/').map((segment) => segment.replace(/^./, (lettre) => lettre.toUpperCase())).join('/') : entree.nom));
  const ecrit = trouver(absentes(pascal, ecriture), 'Primary', 'surface/subtle');
  assert.equal(ecrit.faits.nom, 'Primary/Surface/Subtle');
  assert.equal(ecrit.correction?.creation?.nom, 'Primary/Surface/Subtle');
  assert.deepEqual(ecrit.correction?.apres, { nom: 'Primary/Surface/Subtle', collection: 'theme' });
  const minuscules = trouver(absentes(catalogueDeStructure(), ecriture), 'primary', 'surface/subtle');
  assert.equal(minuscules.correction?.creation?.nom, 'primary/surface/Subtle');
  const neutre = trouver(absentes(catalogueDeStructure(), ecriture), 'neutral', 'page/foreground');
  assert.equal(neutre.correction?.creation?.nom, 'neutral/page/Foreground');
});

test('5. sans écriture, les 23 constats restent et aucun ne porte de correction', () => {
  for (const options of [{}, { ecriture: null }]) {
    const constats = controlerLIntegriteUcm(catalogueDeStructure(), options).filter((constat) => constat.faits.genre === 'variable-absente');
    assert.equal(constats.length, 23);
    assert.ok(constats.every((constat) => constat.correction === undefined && constat.faits.raison === 'sans-ecriture' && constat.faits.nom === undefined));
  }
});

test('6. deux jumelles qui visent deux rampes ne donnent pas de correction', () => {
  const catalogue = catalogueDeStructure();
  const croisee: CatalogueDeReference = {
    ...catalogue,
    variables: catalogue.variables.map((entree) => (entree.cle === cleDeLaFixture('theme', 'primary/solid/default')
      ? { ...entree, valeurs: { ...entree.valeurs, [MODE_LIGHT]: { alias: cleDeLaFixture('brands', 'secondary/light/700') } } } : entree)),
  };
  const constats = absentes(croisee);
  assert.equal(constats.length, 23);
  const subtle = trouver(constats, 'primary', 'surface/subtle');
  assert.equal(subtle.faits.raison, 'prefixes-multiples');
  assert.equal(subtle.correction, undefined);
  assert.equal(trouver(constats, 'primary', 'surface/divider').faits.raison, 'prefixes-multiples');
  assert.equal(constats.filter((constat) => constat.correction).length, 21);
});

test('7. un cran absent de la rampe est un constat de rampe, sans création', () => {
  const catalogue = catalogueDeStructure();
  const sansCinquante: CatalogueDeReference = { ...catalogue, variables: catalogue.variables.filter((entree) => entree.cle !== cleDeLaFixture('brands', 'primary/light/50')) };
  const constats = controlerLIntegriteUcm(sansCinquante, { ecriture: avecEcriture('minuscules', 'tiret') });
  const rampe = constats.filter((constat) => constat.faits.genre === 'cran-absent');
  assert.equal(rampe.length, 1);
  assert.equal(rampe[0].id, 'C82:cran-absent:primary/light/50');
  assert.equal(rampe[0].faits.rampe, 'primary/light');
  assert.equal(rampe[0].faits.cran, 50);
  assert.equal(rampe[0].faits.variables, 'primary/surface/subtle');
  assert.equal(rampe[0].correction, undefined);
  assert.equal(constats.filter((constat) => constat.faits.genre === 'variable-absente').length, 22);
  assert.ok(constats.every((constat) => constat.faits.variable !== 'surface/subtle' || constat.faits.groupe !== 'primary'));
});

test('8. un rôle ignoré n’est cité par aucun constat', () => {
  const constats = absentes(catalogueDeStructure(), undefined, ['surface/divider']);
  assert.equal(constats.length, 12);
  assert.ok(constats.every((constat) => constat.faits.variable !== 'surface/divider'));
});

test('9. un groupe sans aucun alias n’a pas de jumelle', () => {
  const catalogue = catalogueDeStructure();
  const sansAlias = ['tertiary/solid/default', 'tertiary/ring'].map((nom) => ({
    cle: cleDeLaFixture('theme', nom), nom, collection: 'theme', type: 'COLOR' as const, etat: 'presente' as const,
  }));
  const constats = absentes({ ...catalogue, variables: [...catalogue.variables, ...sansAlias] });
  const subtle = trouver(constats, 'tertiary', 'surface/subtle');
  assert.equal(subtle.faits.raison, 'sans-jumelle');
  assert.equal(subtle.correction, undefined);
  assert.equal(trouver(constats, 'tertiary', 'solid/foreground').faits.raison, 'sens-inconnu');
  assert.ok(constats.filter((constat) => constat.faits.groupe !== 'tertiary').every((constat) => constat.correction));
});

test('10. un catalogue de 3 700 variables se contrôle sans attente', () => {
  let catalogue = catalogueDeStructure();
  for (let marque = 0; catalogue.variables.length < 3700; marque++) catalogue = avecUneMarque(catalogue, `marque${marque}`);
  const debut = performance.now();
  const constats = controlerLIntegriteUcm(catalogue, { ecriture: avecEcriture('minuscules', 'tiret') });
  const duree = performance.now() - debut;
  console.log(`C82 sur ${catalogue.variables.length} variables : ${duree.toFixed(1)} ms, ${constats.length} constats`);
  assert.ok(constats.length > 23);
  assert.ok(constats.every((constat) => constat.correction));
  assert.ok(duree < 1000, `${duree} ms`);
});

test('11. une jumelle qui vise l’autre branche de mode est écartée', () => {
  const catalogue = catalogueDeStructure();
  const mauvaiseBranche: CatalogueDeReference = {
    ...catalogue,
    variables: catalogue.variables.map((entree) => (entree.cle === cleDeLaFixture('theme', 'primary/solid/hover')
      ? { ...entree, valeurs: { ...entree.valeurs, [MODE_LIGHT]: { alias: cleDeLaFixture('brands', 'secondary/dark/800') } } } : entree)),
  };
  const subtle = trouver(absentes(mauvaiseBranche), 'primary', 'surface/subtle');
  assert.equal(subtle.faits.raison, undefined);
  assert.equal(aliasDe(subtle)[MODE_LIGHT].nom, 'primary/light/50');
});

test('12. une rampe de library ne donne jamais de correction', () => {
  const catalogue = catalogueDeStructure();
  const distante: CatalogueDeReference = {
    ...catalogue,
    variables: catalogue.variables.map((entree) => (entree.collection === 'brands' && entree.nom.startsWith('primary/') ? { ...entree, distante: true as const } : entree)),
  };
  const toutes = controlerLIntegriteUcm(distante, { ecriture: avecEcriture('minuscules', 'tiret') });
  const constats = toutes.filter((constat) => constat.faits.genre === 'variable-absente');
  const subtle = trouver(constats, 'primary', 'surface/subtle');
  assert.equal(subtle.faits.raison, 'cible-de-library');
  assert.equal(subtle.correction, undefined);
  assert.equal(toutes.filter((constat) => constat.faits.genre === 'cran-absent').length, 0);
  assert.equal(constats.filter((constat) => constat.correction).length, 21);
});

test('les noms qui redisent la collection se lisent comme les autres', () => {
  const catalogue = catalogueDeStructure();
  const sansRaised = { ...catalogue, variables: catalogue.variables.filter((entree) => entree.cle !== cleDeLaFixture('theme', 'elevation/raised')) };
  const nomsLongs = renommer(sansRaised, (entree) => `${entree.collection}/${entree.nom}`);
  const constats = absentes(nomsLongs);
  assert.equal(constats.length, 24);
  const subtle = trouver(constats, 'primary', 'surface/subtle');
  assert.equal(subtle.correction?.creation?.nom, 'theme/primary/surface/subtle');
  assert.equal(aliasDe(subtle)[MODE_LIGHT].nom, 'brands/primary/light/50');
  assert.equal(subtle.id, 'C82:variable-absente:theme:primary/surface/subtle');
  const globale = trouver(constats, '', 'elevation/raised');
  assert.equal(globale.id, 'C82:variable-absente:theme:elevation/raised');
  assert.equal(globale.correction?.creation?.nom, 'theme/elevation/raised');
});

test('une variable globale absente se crée vers la variable de utility que le kit désigne', () => {
  const catalogue = catalogueDeStructure();
  const sans = new Set([cleDeLaFixture('theme', 'disabled/background'), cleDeLaFixture('theme', 'elevation/raised')]);
  const constats = absentes({ ...catalogue, variables: catalogue.variables.filter((entree) => !sans.has(entree.cle)) });
  const globales = constats.filter((constat) => constat.faits.groupe === '');
  assert.deepEqual(globales.map((constat) => constat.faits.variable), ['disabled/background', 'elevation/raised']);
  assert.equal(aliasDe(globales[0])[MODE_LIGHT].nom, 'neutral/light/200');
  assert.equal(aliasDe(globales[1])[MODE_DARK].nom, 'elevation/dark/raised');
  assert.equal(globales[1].correction?.creation?.nom, 'elevation/raised');
  assert.equal(globales[0].id, 'C82:variable-absente:theme:disabled/background');
});

test('solid/foreground absent prend le sens des autres variables de la palette', () => {
  const catalogue = catalogueDeStructure();
  const sans = cleDeLaFixture('theme', 'primary/solid/foreground');
  const constat = trouver(absentes({ ...catalogue, variables: catalogue.variables.filter((entree) => entree.cle !== sans) }), 'primary', 'solid/foreground');
  assert.equal(aliasDe(constat)[MODE_LIGHT].nom, 'neutral/light/white');
  assert.equal(aliasDe(constat)[MODE_DARK].nom, 'neutral/dark/white');
  assert.equal(constat.faits['cran:light'], 'white');
});

test('un mode de theme que le kit ne reconnaît pas interdit la création', () => {
  const catalogue = catalogueDeStructure();
  const collections = catalogue.collections.map((collection) => (collection.cle === 'theme'
    ? { ...collection, modes: [...collection.modes, { id: 'm-contraste', nom: 'Contraste' }] } : collection));
  const constats = absentes({ ...catalogue, collections });
  assert.equal(constats.length, 23);
  assert.ok(constats.every((constat) => constat.faits.raison === 'mode-sans-cible' && constat.correction === undefined));
});

test('hors collection theme lue, le contrôle ne rend rien', () => {
  const catalogue = catalogueDeStructure();
  assert.deepEqual(controlerLIntegriteUcm({ ...catalogue, collections: catalogue.collections.filter((collection) => collection.role !== 'theme') }), []);
  assert.deepEqual(controlerLIntegriteUcm({ ...catalogue, collections: catalogue.collections.map((collection) => (collection.role === 'theme' ? { ...collection, etat: 'inaccessible' as const } : collection)) }), []);
  assert.deepEqual(controlerLIntegriteUcm({ ...catalogue, collections: catalogue.collections.map((collection) => ({ ...collection, role: null })) }), []);
});
