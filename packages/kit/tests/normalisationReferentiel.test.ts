import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  CONVENTIONS, REGISTRE_CASSES, REGISTRE_SEPARATEURS, decouperSegment,
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
  assert.deepEqual(decouperSegment('fontsize'), ['fontsize']);
  assert.deepEqual(decouperSegment('colorbrands'), ['color', 'brands']);
  assert.deepEqual(decouperSegment('Colorbrands'), ['Color', 'brands']);
});

test('les propositions conservent les groupes et excluent les noms déjà conformes', () => {
  const noms = [nom('colors/Blue/HTTPServer2Éléments'), nom('fontSize/bodyLarge'), nom('fontsize/base')];
  const avant = JSON.stringify(noms);
  const resultat = normaliserLesNoms(noms, { variables: tiret });
  assert.deepEqual(resultat.propositions.map((proposition) => proposition.nouveauNom), ['colors/blue/http-server2-éléments', 'font-size/body-large']);
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

test('l’instantané propose exactement 60 press et 36 disable sans réécrire les données', () => {
  const contexte = { window: {} as { VUE_DONNEES?: { collections: Record<string, Record<string, unknown>> } } };
  vm.runInNewContext(readFileSync(new URL('../../../docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js', import.meta.url), 'utf8'), contexte);
  const noms = Object.keys(contexte.window.VUE_DONNEES!.collections.components).map((chemin) => nom(chemin.split('.').slice(1).join('/'), chemin, 'components'));
  assert.deepEqual(normaliserLesNoms(noms, { variables: tiret }).propositions, []);
  const resultat = normaliserLesNoms(noms, { variables: tiret }, { termesUcm: true });
  assert.deepEqual(resultat.collisions, []);
  assert.equal(resultat.propositions.length, 96);
  assert.equal(resultat.propositions.filter((proposition) => proposition.ancienNom.split('/').includes('press') && proposition.nouveauNom.split('/').includes('pressed')).length, 60);
  assert.equal(resultat.propositions.filter((proposition) => proposition.ancienNom.split('/').includes('disable') && proposition.nouveauNom.split('/').includes('disabled')).length, 36);
});
