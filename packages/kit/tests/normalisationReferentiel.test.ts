import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS, collectionUcmReconnue, decouperSegment,
  detecterLesConventions, normaliserLesNoms,
  type CategorieDeNom, type Convention, type NomANormaliser,
} from '../src/referentiel/index.js';

const tiret: Convention = { casse: 'minuscules', separateur: 'tiret' };
const inchange: Convention = { casse: 'inchangee', separateur: 'inchange' };
function nom(nom: string, id = nom, portee = 'collection', categorie: CategorieDeNom = 'variables'): NomANormaliser {
  return { id, nom, portee, categorie };
}

test('les conventions proposent les choix bilingues de la maquette et le soudé', () => {
  for (const registre of [REGISTRE_CASSES, REGISTRE_SEPARATEURS]) {
    assert.equal(registre.extensible, false);
    for (const terme of registre.termes) {
      assert.ok(terme.libelle.fr && terme.libelle.en && terme.definition.fr && terme.definition.en);
    }
  }
  assert.deepEqual(CONVENTIONS.map((choix) => choix.id), ['tiret', 'bas', 'espace', 'camel', 'pascal', 'soude', 'inchange']);
});

test('les frontières des mots gardent acronymes, accents et chiffres', () => {
  for (const segment of ['borderRadius', 'border-radius', 'border_radius', 'Border Radius']) {
    assert.deepEqual(decouperSegment(segment).map((mot) => mot.toLowerCase()), ['border', 'radius']);
  }
  assert.deepEqual(decouperSegment('HTTPServer'), ['HTTP', 'Server']);
  assert.deepEqual(decouperSegment('HTTPServer2Éléments'), ['HTTP', 'Server2', 'Éléments']);
  // Décision T04 : `font-size` est un terme du référentiel ; sa forme soudée se découpe.
  assert.deepEqual(decouperSegment('fontsize'), ['font', 'size']);
  assert.deepEqual(decouperSegment('colorbrands'), ['color', 'brands']);
  assert.deepEqual(decouperSegment('Colorbrands'), ['Color', 'brands']);
});

test('une collection reconnue tolère la casse et les séparateurs', () => {
  assert.equal(collectionUcmReconnue('Color Brands'), 'color-brands');
  assert.equal(collectionUcmReconnue('COLOR_BRANDS'), 'color-brands');
  assert.equal(collectionUcmReconnue('inconnue'), undefined);
});

test('les propositions conservent les groupes et excluent les noms déjà conformes', () => {
  const noms = [nom('colors/Blue/HTTPServer2Éléments'), nom('fontSize/bodyLarge'), nom('fontsize/base')];
  const avant = JSON.stringify(noms);
  const resultat = normaliserLesNoms(noms, { variables: tiret });
  assert.deepEqual(resultat.propositions.map((proposition) => proposition.nouveauNom), ['colors/blue/http-server2-éléments', 'font-size/body-large', 'font-size/base']);
  assert.deepEqual(resultat.propositions[0].raisons, ['casse', 'separateur']);
  assert.equal(JSON.stringify(noms), avant);
  assert.deepEqual(normaliserLesNoms(noms, { variables: inchange }).propositions, []);
  assert.deepEqual(normaliserLesNoms([nom('Colorbrands')], { variables: inchange }).propositions, []);
  assert.deepEqual(normaliserLesNoms([nom('---/___/ /')], { variables: tiret }).propositions, []);
});

test('chaque preset rend sa casse, y compris initiale, camelCase et PascalCase', () => {
  const attendus: Record<string, string> = {
    tiret: 'border-radius', bas: 'border_radius', espace: 'Border radius', camel: 'borderRadius',
    pascal: 'BorderRadius', soude: 'borderradius', inchange: 'border_radius',
  };
  for (const choix of CONVENTIONS) {
    const resultat = normaliserLesNoms([nom('border_radius')], { variables: choix.convention });
    assert.equal(resultat.propositions[0]?.nouveauNom ?? 'border_radius', attendus[choix.id]);
  }
});

test('les termes tolérés restent inchangés sans option et respectent la casse choisie', () => {
  const noms = ['press', 'disable', 'hovered', 'focused'].map((mot) => nom(`button/${mot}/foreground`));
  assert.deepEqual(normaliserLesNoms(noms, { variables: tiret }).propositions, []);
  const resultat = normaliserLesNoms(noms, { variables: tiret }, { termesUcm: true });
  assert.deepEqual(resultat.propositions.map((proposition) => proposition.nouveauNom), [
    'button/pressed/foreground', 'button/disabled/foreground', 'button/hover/foreground', 'button/focus/foreground',
  ]);
  assert.deepEqual(resultat.propositions[0].raisons, ['terme-tolere']);
  assert.equal(normaliserLesNoms([nom('Press')], { variables: { casse: 'initiale', separateur: 'espace' } }, { termesUcm: true }).propositions[0].nouveauNom, 'Pressed');
  assert.equal(normaliserLesNoms([nom('Press')], {}, { termesUcm: true }).propositions[0].nouveauNom, 'Pressed');
});

test('les axes tolérés ne se remplacent que dans les propriétés', () => {
  const noms = ['collections', 'variables', 'proprietes', 'valeurs'].flatMap((categorie) => ['status', 'states'].map((mot) => nom(mot, `${categorie}-${mot}`, 'scope', categorie as CategorieDeNom)));
  const resultat = normaliserLesNoms(noms, {}, { termesUcm: true });
  assert.equal(resultat.propositions.length, 0);
  assert.deepEqual(resultat.collisions, [{ categorie: 'proprietes', portee: 'scope', nom: 'state', ids: ['proprietes-status', 'proprietes-states'] }]);
  assert.equal(normaliserLesNoms([nom('status', 'prop', 'button', 'proprietes')], {}, { termesUcm: true }).propositions[0].nouveauNom, 'state');
});

test('les collisions incluent les noms inchangés et respectent catégorie et portée', () => {
  const noms = [nom('borderRadius', 'a'), nom('border-radius', 'b'), nom('borderRadius', 'c', 'autre'), nom('borderRadius', 'd', 'collection', 'proprietes')];
  const resultat = normaliserLesNoms(noms, { variables: tiret, proprietes: tiret });
  assert.deepEqual(resultat.propositions.map((proposition) => proposition.id), ['c', 'd']);
  assert.deepEqual(resultat.collisions, [{ categorie: 'variables', portee: 'collection', nom: 'border-radius', ids: ['a', 'b'] }]);
  for (const categorie of ['collections', 'proprietes', 'valeurs'] as const) {
    const collision = normaliserLesNoms([nom('Foo', 'a', 'axe', categorie), nom('FOO', 'b', 'axe', categorie)], { [categorie]: tiret });
    assert.deepEqual(collision.propositions, []);
    assert.deepEqual(collision.collisions[0].ids, ['a', 'b']);
  }
});

test('un nom non renommable reste occupant dans le contrôle des collisions', () => {
  const noms = [nom('BorderRadius', 'a'), nom('border-radius', 'b'), nom('FontSize', 'c')];
  const resultat = normaliserLesNoms(noms, { variables: tiret }, { nonRenommables: ['b', 'c'] });
  assert.deepEqual(resultat.propositions, []);
  assert.deepEqual(resultat.collisions, [{ categorie: 'variables', portee: 'collection', nom: 'border-radius', ids: ['a', 'b'] }]);
});

test('les détections comptent chaque catégorie et ignorent les noms ambigus', () => {
  const noms = [
    nom('border-radius', 'a'), nom('font-size', 'b'), nom('border_radius', 'c'),
    ...Array.from({ length: 100 }, (_, rang) => nom('blue', String(rang))),
    nom('Button state', 'prop', 'button', 'proprietes'),
    nom('extraLarge', 'value', 'size', 'valeurs'),
    nom('ColorBrands', 'collection', '', 'collections'),
  ];
  const detection = detecterLesConventions(noms);
  assert.equal(detection.variables.total, 103);
  assert.deepEqual(detection.variables.dominante, tiret);
  assert.deepEqual(detection.variables.comptes.casse, { minuscules: 3, initiale: 0, camelCase: 0, PascalCase: 0, inchangee: 0 });
  assert.equal(detection.variables.comptes.separateur.tiret, 2);
  assert.deepEqual(detection.proprietes.dominante, { casse: 'initiale', separateur: 'espace' });
  assert.deepEqual(detection.valeurs.dominante, { casse: 'camelCase', separateur: 'camelCase' });
  assert.deepEqual(detection.collections.dominante, { casse: 'PascalCase', separateur: 'camelCase' });
  assert.deepEqual(detecterLesConventions([]).variables.dominante, null);
  const egalite = [nom('border_radius'), nom('border-radius')];
  assert.deepEqual(detecterLesConventions(egalite).variables.dominante, tiret);
  assert.deepEqual(detecterLesConventions([...egalite].reverse()), detecterLesConventions(egalite));
});

const pascal: Convention = { casse: 'PascalCase', separateur: 'camelCase' };
function avecSegments(chemin: string, categories: readonly (CategorieDeNom | null)[], id = chemin): NomANormaliser {
  return { ...nom(chemin, id), categoriesDesSegments: categories };
}

const groupes = (chemin: string, id = chemin): NomANormaliser => {
  const segments = chemin.split('/');
  return avecSegments(chemin, segments.map((_, rang) => (rang < segments.length - 1 ? 'groupes' : null)), id);
};

test('les groupes prennent leur écriture et le nom final celle des variables', () => {
  const resultat = normaliserLesNoms([groupes('button/sizes/medium/Padding-x')], { groupes: pascal, variables: tiret });
  assert.deepEqual(resultat.propositions.map((proposition) => proposition.nouveauNom), ['Button/Sizes/Medium/padding-x']);
  assert.deepEqual(normaliserLesNoms([groupes('Button/Sizes/Medium/padding-x')], { groupes: pascal, variables: tiret }).propositions, []);
  assert.deepEqual(normaliserLesNoms([groupes('Button/Sizes/Medium/padding-x')], { variables: tiret }).propositions, []);
});

test('la détection compte les groupes dans leur catégorie', () => {
  const noms = ['Button/Sizes/Medium/padding-x', 'Alert/Colors/Info/border-width', 'TileLink/Sizes/Large/font-size'].map((chemin) => groupes(chemin));
  const detection = detecterLesConventions(noms);
  assert.deepEqual(detection.groupes.dominante, pascal);
  assert.equal(detection.groupes.total, 3);
  assert.deepEqual(detection.variables.dominante, tiret);
  assert.equal(detection.variables.total, 3);
  const seulement = detecterLesConventions([avecSegments('DeepBlue', ['groupes'])]);
  assert.equal(seulement.variables.total, 0);
  assert.equal(seulement.variables.dominante, null);
});

test('les termes UCM se remplacent aussi dans les groupes', () => {
  const resultat = normaliserLesNoms([groupes('Button/Colors/Press/background')], { groupes: pascal, variables: tiret }, { termesUcm: true });
  assert.deepEqual(resultat.propositions.map((proposition) => proposition.nouveauNom), ['Button/Color/Pressed/background']);
  assert.deepEqual(resultat.propositions[0].raisons, ['terme-tolere']);
});

test('les collisions restent comparées sous la catégorie du nom', () => {
  const noms = [groupes('Colors/padding-x', 'a'), groupes('colors/padding-x', 'b')];
  const resultat = normaliserLesNoms(noms, { groupes: pascal, variables: tiret });
  assert.deepEqual(resultat.propositions, []);
  assert.deepEqual(resultat.collisions, [{ categorie: 'variables', portee: 'collection', nom: 'Colors/padding-x', ids: ['a', 'b'] }]);
});

test('l’instantané propose exactement 60 press et 36 disable sans réécrire les données', () => {
  const contexte = { window: {} as { VUE_DONNEES?: { collections: Record<string, Record<string, unknown>> } } };
  vm.runInNewContext(readFileSync(new URL('../../../docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js', import.meta.url), 'utf8'), contexte);
  const noms = Object.keys(contexte.window.VUE_DONNEES!.collections.components).map((chemin) => nom(chemin.split('.').slice(1).join('/'), chemin, 'components'));
  assert.deepEqual(normaliserLesNoms(noms, { variables: tiret }).propositions, []);
  const resultat = normaliserLesNoms(noms, { variables: tiret }, { termesUcm: true });
  assert.deepEqual(resultat.collisions, []);
  // Décisions de nomenclature : colors → color, sizes → size, error → danger, tailles en sm, md, lg.
  assert.equal(resultat.propositions.length, 369);
  assert.equal(resultat.propositions.filter((proposition) => proposition.ancienNom.split('/').includes('colors') && proposition.nouveauNom.split('/').includes('color')).length, 306);
  assert.equal(resultat.propositions.filter((proposition) => proposition.ancienNom.split('/').includes('error') && proposition.nouveauNom.split('/').includes('danger')).length, 48);
  assert.equal(resultat.propositions.filter((proposition) => proposition.ancienNom.split('/').includes('press') && proposition.nouveauNom.split('/').includes('pressed')).length, 60);
  assert.equal(resultat.propositions.filter((proposition) => proposition.ancienNom.split('/').includes('disable') && proposition.nouveauNom.split('/').includes('disabled')).length, 36);
});
