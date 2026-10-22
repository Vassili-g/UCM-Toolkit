import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  AXES_DES_COLLECTIONS, CONVENTIONS, CIBLES_DES_COLLECTIONS, CIBLES_DES_COULEURS_DE_COMPOSANT,
  COLLECTIONS, COLLECTIONS_SANS_PORTEE, DESTINATION_DES_PALETTES, FORMES_ANCIENNES_DES_COLLECTIONS, FORMES_DES_CHEMINS,
  REGISTRES, REGISTRES_ARCHITECTURE, cheminConforme, ciblesAdmises, estNeutre, normaliserLesNoms, type Collection,
} from '../src/referentiel/index.js';

test('seules les couleurs des composants restreignent leurs cibles au thème', () => {
  assert.deepEqual(ciblesAdmises('components', 'couleur'), ['theme']);
  for (const nature of ['dimension', 'typographie'] as const) {
    assert.deepEqual(ciblesAdmises('components', nature), ['theme', 'layout', 'typography']);
  }
  for (const collection of COLLECTIONS.filter((collection) => collection !== 'components')) {
    for (const nature of ['couleur', 'dimension', 'typographie'] as const) {
      assert.deepEqual(ciblesAdmises(collection, nature), CIBLES_DES_COLLECTIONS[collection]);
    }
  }
});

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
  assert.deepEqual(FORMES_DES_CHEMINS.components.map((forme) => forme.id), ['components:color', 'components:size']);
});

test('les positions extensibles acceptent d’autres palettes, marques et tailles', () => {
  for (const [collection, chemin] of [
    ['primitives', 'color.nouvelle-palette.light.500'],
    ['primitives', 'color.nouvelle-palette.soft.dark.700'],
    ['brands', 'tertiary.dark.500'],
    ['layout', 'icon.xl'],
    ['typography', 'body.format-special.font-size'],
  ] as const) assert.ok(cheminConforme(collection, chemin.split('.')), chemin);
  const marques = REGISTRES_ARCHITECTURE.find((registre) => registre.id === 'marques')!;
  assert.equal(marques.extensible, true);
  assert.deepEqual(marques.termes, []);
});

/** Écrit les segments selon une convention, comme le ferait le renommage de Nomenclature. */
function ecritsSelon(convention: (typeof CONVENTIONS)[number]['convention'], segments: readonly string[]): string[] {
  const nom = segments.join('/');
  const { propositions } = normaliserLesNoms([{ id: 'a', nom, portee: 'p', categorie: 'variables' }], { variables: convention });
  return (propositions[0]?.nouveauNom ?? nom).split('/');
}

const CHEMINS_A_RENOMMER = [
  ['primitives', ['color', 'ocean', 'soft', 'light', '500']],
  ['primitives', ['color', 'ocean', 'soft', 'dark', '950']],
  ['primitives', ['font-size', 'base']],
  ['theme', ['primary', 'solid', 'default']],
  ['theme', ['neutral', 'page', 'foreground-main']],
  ['typography', ['body', 'medium', 'font-size']],
] as const;

test('un chemin conforme le reste sous chaque convention d’écriture des segments', () => {
  for (const choix of CONVENTIONS) for (const [collection, segments] of CHEMINS_A_RENOMMER) {
    const ecrits = ecritsSelon(choix.convention, segments);
    assert.ok(cheminConforme(collection, ecrits), `${choix.id} : ${collection}/${ecrits.join('/')}`);
  }
});

test('la sonde Color/Ocean/Soft/Light/500 est conforme en primitives', () => {
  assert.ok(cheminConforme('primitives', ['Color', 'Ocean', 'Soft', 'Light', '500']));
  assert.ok(cheminConforme('primitives', ['COLOR', 'OCEAN', 'SOFT', 'LIGHT', '500']));
});

test('la comparaison des valeurs et des exclusions suit la forme reconnue', () => {
  assert.ok(cheminConforme('theme', ['Primary', 'Solid', 'default']));
  assert.ok(cheminConforme('theme', ['PRIMARY', 'SOLID', 'DEFAULT']));
  assert.equal(cheminConforme('theme', ['Identity', 'Solid', 'default']), false, 'identity est exclue de la palette de marque du thème');
  assert.equal(cheminConforme('theme', ['Primary', 'Solid', 'Border']), false);
  assert.equal(cheminConforme('theme', ['Primary', 'Identity']), false);
  assert.equal(cheminConforme('primitives', ['Color', 'Ocean', 'Soft', 'Light', '500', 'suite']), false);
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
  const identifiants = Object.values(FORMES_DES_CHEMINS).flatMap((formes) => formes.map((forme) => forme.id));
  assert.equal(new Set(identifiants).size, identifiants.length, 'deux formes ne portent jamais le même identifiant');
  for (const [collection, formes] of Object.entries(FORMES_DES_CHEMINS)) for (const forme of formes) {
    assert.ok(forme.id.startsWith(`${collection}:`), forme.id);
    assert.ok(forme.positions.length > 0);
    for (const position of forme.positions) {
      assert.ok(position.registre.id);
      assert.ok(position.role);
    }
  }
});

test('seul neutral désigne le neutre après retrait des espaces et normalisation de casse', () => {
  for (const nom of ['neutral', ' Neutral ', '\tNEUTRAL\n']) assert.equal(estNeutre(nom), true);
  for (const nom of ['', 'neutre', 'gray', 'neutral-blue']) assert.equal(estNeutre(nom), false);
});
