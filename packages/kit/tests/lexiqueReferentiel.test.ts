import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  commencerLexique, indexerVocabulaire, normaliserLeLexique, normaliserLesNoms, normaliserParEtapes, porteesTouchees,
  type ConventionsParCategorie, type Lexique, type NomLu,
} from '../src/referentiel/index.js';

const conventions: ConventionsParCategorie = {
  variables: { casse: 'minuscules', separateur: 'tiret' },
  groupes: { casse: 'PascalCase', separateur: 'camelCase' },
  collections: { casse: 'minuscules', separateur: 'tiret' },
};
const indexUcm = indexerVocabulaire({ personnalises: [], ecartsUcm: [] }).index;

function preparer(noms: readonly NomLu[]): Lexique {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

function variable(id: string, nom: string, portee = 'components', categoriesDesSegments?: NomLu['categoriesDesSegments']): NomLu {
  return { id, nom, portee, categorie: 'variables', ...(categoriesDesSegments ? { categoriesDesSegments } : {}) };
}

function equivalenceV1(noms: readonly NomLu[]): void {
  const ancien = normaliserLesNoms(noms, conventions, { termesUcm: true });
  const nouveau = normaliserLeLexique(preparer(noms), conventions, indexUcm);
  assert.deepEqual(nouveau.renommages.map(({ id, ancienNom, nouveauNom }) => ({ id, ancienNom, nouveauNom })),
    ancien.propositions.map(({ id, ancienNom, nouveauNom }) => ({ id, ancienNom, nouveauNom })));
  assert.deepEqual(nouveau.collisions, ancien.collisions);
}

test('la vue illustrée rend les renommages et collisions de la v1', () => {
  const contexte = { window: {} as { VUE_DONNEES?: { collections: Record<string, Record<string, unknown>> } } };
  vm.runInNewContext(readFileSync(new URL('../../../docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js', import.meta.url), 'utf8'), contexte);
  const noms = Object.entries(contexte.window.VUE_DONNEES!.collections)
    .flatMap(([collection, entrees]) => Object.keys(entrees)
      .map((chemin) => variable(chemin, chemin.split('.').slice(1).join('/'), collection)));
  equivalenceV1(noms);
});

test('huit mille noms gardent les blocages en cascade et les collisions de la v1', () => {
  const noms: NomLu[] = [];
  for (let rang = 0; rang < 2666; rang++) {
    noms.push(variable(`fixe-${rang}`, `alpha${rang}`));
    noms.push(variable(`premier-${rang}`, `Alpha${rang}`));
    noms.push(variable(`second-${rang}`, `alpha${rang}`, 'components', ['groupes']));
  }
  noms.push(variable('dernier-a', 'press'));
  noms.push(variable('dernier-b', 'disable'));
  equivalenceV1(noms);
});

test('les collections inconnues restent inchangées et les reconnues prennent leur nom canonique', () => {
  const noms: NomLu[] = [
    { id: 'a', nom: 'Color Brands', categorie: 'collections', portee: 'fichier' },
    { id: 'b', nom: 'Brand Colors', categorie: 'collections', portee: 'fichier' },
  ];
  const resultat = normaliserLeLexique(preparer(noms), conventions, indexUcm);
  assert.deepEqual(resultat.renommages.map(({ id, nouveauNom, regles }) => ({ id, nouveauNom, regles })), [
    { id: 'a', nouveauNom: 'color-brands', regles: ['collection:a'] },
  ]);
});

test('les règles sont rangées UCM, personnalisée, puis écriture', () => {
  const index = indexerVocabulaire({ personnalises: [{ terme: ['outlined'], remplace: [['outline']] }], ecartsUcm: [] }).index;
  const resultat = normaliserLeLexique(preparer([variable('a', 'disable/outline/BoldValue')]), conventions, index);
  assert.deepEqual(resultat.renommages[0].regles, ['terme:disabled', 'terme:outlined', 'ecriture:variables']);
  assert.deepEqual(resultat.renommages[0].termes.map(({ avant, apres }) => [avant, apres]), [
    [['disable'], ['disabled']], [['outline'], ['outlined']],
  ]);
});

test('les portées touchées comprennent la suite de mots dans un seul segment', () => {
  const lexique = preparer([
    variable('a', 'extra-small/base', 'un'), variable('b', 'extra/small', 'deux'),
    variable('c', 'EXTRA_small/base', 'trois'),
  ]);
  assert.deepEqual(porteesTouchees(lexique, [['extra', 'small']]), ['un', 'trois']);
});

test('la détection préparée compte chaque catégorie de segment une seule fois par nom', () => {
  const lexique = preparer([
    variable('a', 'Button/Sizes/Medium/padding-x', 'components', ['groupes', 'groupes', 'groupes', null]),
    variable('b', 'Alert/Colors/Info/border-width', 'components', ['groupes', 'groupes', 'groupes', null]),
    variable('e', 'TileLink/Sizes/Large/font-size', 'components', ['groupes', 'groupes', 'groupes', null]),
    { id: 'c', nom: 'ColorBrands', categorie: 'collections', portee: 'fichier' },
    { id: 'd', nom: 'Button state', categorie: 'proprietes', portee: 'button' },
  ]);
  assert.equal(lexique.detection.groupes.total, 3);
  assert.deepEqual(lexique.detection.groupes.dominante, { casse: 'PascalCase', separateur: 'camelCase' });
  assert.equal(lexique.detection.variables.total, 3);
  assert.deepEqual(lexique.detection.variables.dominante, { casse: 'minuscules', separateur: 'tiret' });
  assert.deepEqual(lexique.detection.collections.dominante, { casse: 'PascalCase', separateur: 'camelCase' });
  assert.deepEqual(lexique.detection.proprietes.dominante, { casse: 'initiale', separateur: 'espace' });
});

test('un recalcul par portée garde ses occupants inchangés et le résultat global', () => {
  const noms = [
    variable('a', 'BorderRadius', 'un'), variable('b', 'border-radius', 'un'),
    variable('c', 'FontSize', 'deux'), variable('d', 'font-size', 'deux'),
    variable('e', 'ColorBrands', 'trois'),
  ];
  const lexique = preparer(noms);
  let lecturesDeDetection = 0;
  const surveille: Lexique = { ...lexique, get detection() { lecturesDeDetection++; return lexique.detection; } };
  const complet = normaliserLeLexique(surveille, conventions, indexUcm);
  const partiel = normaliserLeLexique(surveille, conventions, indexUcm, { portees: ['un', 'deux'] });
  assert.deepEqual(partiel.renommages, complet.renommages.filter(({ portee }) => portee !== 'trois'));
  assert.deepEqual(partiel.collisions, complet.collisions.filter(({ portee }) => portee !== 'trois'));
  assert.equal(lecturesDeDetection, 0);
});

test('la préparation et la normalisation cèdent après au plus deux cents noms', () => {
  const vus = new Set<string>();
  const noms: NomLu[] = Array.from({ length: 450 }, (_, rang) => ({
    id: `${rang}`, categorie: 'variables' as const, portee: 'components',
    get nom() { vus.add(`${rang}`); return `SomeName${rang}`; },
  }));
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let precedent = 0;
  let etape = calcul.next();
  while (!etape.done) {
    assert.ok(vus.size - precedent <= 200);
    precedent = vus.size;
    etape = calcul.next();
  }
  assert.ok(vus.size - precedent <= 200);
  const lexique = etape.value;
  let remplacements = 0;
  const index = { remplacements: (...args: Parameters<typeof indexUcm.remplacements>) => {
    remplacements++;
    return indexUcm.remplacements(...args);
  } };
  const normalisation = normaliserParEtapes(lexique, conventions, index);
  let appels = 0;
  let pas = normalisation.next();
  while (!pas.done) {
    assert.ok(remplacements - appels <= 200);
    appels = remplacements;
    pas = normalisation.next();
  }
  assert.ok(remplacements - appels <= 200);
  assert.equal(lexique.detection.variables.total, 450);
});

test('un grand groupe de collision cède aussi pendant la lecture de ses identifiants', () => {
  const lus = new Set<string>();
  const noms: NomLu[] = Array.from({ length: 1000 }, (_, rang) => ({
    get id() { lus.add(`${rang}`); return `${rang}`; },
    nom: 'Alpha', portee: 'components', categorie: 'variables',
  }));
  const lexique = preparer(noms);
  lus.clear();
  const calcul = normaliserParEtapes(lexique, conventions, indexUcm);
  let etape = calcul.next();
  let cessions = 0;
  while (!etape.done) {
    assert.ok(lus.size <= 200);
    lus.clear();
    cessions++;
    etape = calcul.next();
  }
  assert.ok(lus.size <= 200);
  assert.ok(cessions > 15);
  assert.equal(etape.value.collisions[0].ids.length, 1000);
});
