import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  AXES_DES_COLLECTIONS, CIBLES_DES_COLLECTIONS, CIBLES_DES_COULEURS_DE_COMPOSANT,
  COLLECTIONS, COLLECTIONS_SANS_PORTEE, DESTINATION_DES_PALETTES, FORMES_ANCIENNES_DES_COLLECTIONS, FORMES_DES_CHEMINS,
  REGISTRES, REGISTRES_ARCHITECTURE, cheminConforme, estNeutre, type Collection,
} from '../src/referentiel/index.js';

test('les collections suivent l’ordre de la vue et séparent les cibles de couleur des composants', () => {
  assert.deepEqual(COLLECTIONS, ['components', 'theme', 'brands', 'utility', 'primitives', 'layout', 'typography']);
  assert.deepEqual(CIBLES_DES_COLLECTIONS, {
    components: ['theme', 'layout', 'typography'], theme: ['brands', 'utility'],
    brands: ['primitives'], utility: ['primitives'], primitives: [],
    layout: ['primitives'], typography: ['primitives'],
  });
  assert.deepEqual(CIBLES_DES_COULEURS_DE_COMPOSANT, ['theme']);
  assert.equal(AXES_DES_COLLECTIONS.marque.collection, 'brands');
  assert.equal(AXES_DES_COLLECTIONS.marque.attribut, 'data-brands');
  assert.equal(AXES_DES_COLLECTIONS.theme.collection, 'theme');
  assert.deepEqual(COLLECTIONS_SANS_PORTEE, ['primitives', 'brands', 'utility']);
  assert.deepEqual(DESTINATION_DES_PALETTES, { collection: 'primitives', groupe: 'color', themes: 'chemin' });
});

// L'instantané est un export d'avant les décisions de nomenclature : chaque chemin doit devenir conforme une fois ses formes tolérées remplacées.
test('chaque chemin de l’instantané hors components respecte une forme du référentiel après ses renommages UCM', () => {
  const retenus = new Map([...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes.flatMap((terme) => (terme.toleres ?? []).map((forme) => [forme, terme.id] as const))));
  const contexte = { window: {} as { VUE_DONNEES?: { collections: Record<string, Record<string, unknown>> } } };
  vm.runInNewContext(readFileSync(new URL('../../../docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js', import.meta.url), 'utf8'), contexte);
  const collections = contexte.window.VUE_DONNEES!.collections;
  for (const [nomDeCollection, variables] of Object.entries(collections)) {
    if (nomDeCollection === 'components') continue;
    // L'instantané porte encore les noms d'avant le renommage de la décision D8.
    const collection = FORMES_ANCIENNES_DES_COLLECTIONS[nomDeCollection] ?? nomDeCollection;
    assert.ok(COLLECTIONS.includes(collection as Collection), nomDeCollection);
    assert.ok(Object.keys(variables).length > 0, nomDeCollection);
    for (const chemin of Object.keys(variables)) {
      const [prefixe, ...segments] = chemin.split('.');
      assert.equal(prefixe, nomDeCollection);
      assert.ok(cheminConforme(collection as Collection, segments.map((segment) => retenus.get(segment) ?? segment)), chemin);
    }
  }
  assert.ok(!('components' in FORMES_DES_CHEMINS));
});

test('les positions extensibles acceptent d’autres palettes, marques et tailles', () => {
  for (const [collection, chemin] of [
    ['primitives', 'color.nouvelle-palette.light.500'],
    ['primitives', 'color.nouvelle-palette.soft.dark.700'],
    ['brands', 'tertiary.dark.500'],
    ['layout', 'sizing.format-special'],
    ['typography', 'body.format-special.font-size'],
  ] as const) assert.ok(cheminConforme(collection, chemin.split('.')), chemin);
  const marques = REGISTRES_ARCHITECTURE.find((registre) => registre.id === 'marques')!;
  assert.equal(marques.extensible, true);
  assert.deepEqual(marques.termes, []);
});

test('les formes refusent les chemins incomplets, les positions déplacées et les croisements de familles', () => {
  for (const [collection, chemin] of [
    ['primitives', 'color.palette.500'],
    ['primitives', 'color.palette.light.soft.500'],
    ['primitives', 'color.palette.soft.dark.0'],
    ['primitives', 'color.palette.soft.dark.500.suite'],
    ['primitives', 'inconnue.valeur'],
    ['brands', 'identity.light.500'],
    ['utility', 'neutral.soft.light.500'],
    ['utility', 'elevation.dark.500'],
    ['theme', 'primary.solid.border'],
    ['theme', 'primary.scale.1000'],
    ['theme', 'success.ring'],
    ['theme', 'primary.solid.inconnu'],
    ['theme', 'neutral.scale.'],
    ['layout', 'sizing. '],
    ['typography', 'body.medium.background'],
  ] as const) assert.equal(cheminConforme(collection, chemin.split('.')), false, chemin);
  assert.equal(cheminConforme('components', ['button', 'colors']), false);
  assert.equal(cheminConforme('layout', ['sizing', 'a/b']), false);
});

test('les formes et registres portent des identifiants distincts et des positions documentées', () => {
  assert.equal(new Set(REGISTRES_ARCHITECTURE.map((registre) => registre.id)).size, REGISTRES_ARCHITECTURE.length);
  for (const registre of REGISTRES_ARCHITECTURE) {
    assert.equal(new Set(registre.termes.map((terme) => terme.id)).size, registre.termes.length);
    for (const terme of registre.termes) for (const langue of ['fr', 'en'] as const) {
      assert.ok(terme.libelle[langue]);
      assert.ok(terme.definition[langue]);
    }
  }
  for (const formes of Object.values(FORMES_DES_CHEMINS)) for (const forme of formes) {
    assert.ok(forme.length > 0);
    for (const position of forme) assert.ok(position.registre.id);
  }
});

test('seul neutral désigne le neutre après retrait des espaces et normalisation de casse', () => {
  for (const nom of ['neutral', ' Neutral ', '\tNEUTRAL\n']) assert.equal(estNeutre(nom), true);
  for (const nom of ['', 'neutre', 'gray', 'neutral-blue']) assert.equal(estNeutre(nom), false);
});
