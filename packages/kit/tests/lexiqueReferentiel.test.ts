import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {
  commencerLexique, indexerVocabulaire, normaliserLeLexique, normaliserLesNoms, normaliserParEtapes, porteesTouchees,
  type ConventionsParCategorie, type Lexique, type NomLu,
} from '../src/referentiel/index.js';
import { assembler } from '../src/referentiel/ecriture-des-mots.js';

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

test('les dossiers développent les tailles et les variables les abrègent', () => {
  const cas = [
    ['Display/Large/FontSize', 'Display/Large/font-size'],
    ['Button/Sizes/Big/Border-radius', 'Button/Size/Large/radius'],
    ['Display/lg/large', 'Display/Large/lg'],
    ['Display/md/medium', 'Display/Medium/md'],
    ['Display/sm/small', 'Display/Small/sm'],
    ['Display/Medium/md', 'Display/Medium/md'],
    ['Display/Small/sm', 'Display/Small/sm'],
    ['Display/Large/lg', 'Display/Large/lg'],
    ['Display/big/big', 'Display/Large/lg'],
  ];
  for (const [source, cible] of cas) {
    const categories = source.split('/').map((_, rang, segments) => rang < segments.length - 1 ? 'groupes' as const : null);
    const noms = [variable(source, source, 'components', categories)];
    equivalenceV1(noms);
    const resultat = normaliserLeLexique(preparer(noms), conventions, indexUcm);
    assert.equal(resultat.renommages[0]?.nouveauNom ?? source, cible);
    assert.deepEqual(normaliserLeLexique(preparer([variable(source, cible, 'components', categories)]), conventions, indexUcm).renommages, []);
  }
});

test('un dossier de taille et son abréviation produisent une collision', () => {
  const noms = [variable('a', 'Display/lg/font-size', 'type', ['groupes', 'groupes', null]),
    variable('b', 'Display/Large/font-size', 'type', ['groupes', 'groupes', null])];
  equivalenceV1(noms);
  const resultat = normaliserLeLexique(preparer(noms), conventions, indexUcm);
  assert.deepEqual(resultat.renommages, []);
  assert.equal(resultat.collisions[0]?.nom, 'Display/Large/font-size');
});

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

test('un terme de longueur différente garde le séparateur du segment sous la convention inchangée', () => {
  const inchange: ConventionsParCategorie = { ...conventions, variables: { casse: 'inchangee', separateur: 'inchange' } };
  const vers = indexerVocabulaire({ personnalises: [{ terme: ['qux'], remplace: [['icon', 'gap']] }], ecartsUcm: [] }).index;
  const retour = indexerVocabulaire({ personnalises: [{ terme: ['icon', 'gap'], remplace: [['qux']] }], ecartsUcm: [] }).index;
  const renommer = (nom: string, index: typeof vers) =>
    normaliserLeLexique(preparer([variable('a', nom)]), inchange, index).renommages[0]?.nouveauNom ?? nom;
  // Les mots d'un bloc doivent être connus pour que le bloc se coupe : `foo` ferait de `fooBarBaz` un nom propre.
  assert.equal(renommer('text/primary-icon-gap', vers), 'text/primary-qux');
  assert.equal(renommer('text/primary_icon_gap', vers), 'text/primary_qux');
  assert.equal(renommer('text/primary icon gap', vers), 'text/primary qux');
  assert.equal(renommer('text/primaryIconGap', vers), 'text/primaryQux');
  assert.equal(renommer('text/primary-qux-x', retour), 'text/primary-icon-gap-x');
});

test('un bloc dont un mot est inconnu est un nom propre : une règle sur ses morceaux ne le change pas', () => {
  const inchange: ConventionsParCategorie = { ...conventions, variables: { casse: 'inchangee', separateur: 'inchange' } };
  const vers = indexerVocabulaire({ personnalises: [{ terme: ['qux'], remplace: [['bar', 'baz']] }], ecartsUcm: [] }).index;
  const renommer = (nom: string) => normaliserLeLexique(preparer([variable('a', nom)]), inchange, vers).renommages[0]?.nouveauNom ?? nom;
  assert.equal(renommer('text/fooBarBaz'), 'text/fooBarBaz');
  assert.equal(renommer('text/foo-bar-baz'), 'text/foo-qux');
});

function primitive(id: string, nom: string, portee = 'primitives'): NomLu {
  const segments = nom.split('/');
  return variable(id, nom, portee, segments.map((_, rang) => rang < segments.length - 1 ? 'groupes' as const : null));
}

function nomsApres(noms: readonly NomLu[], nonRenommables: readonly string[], portees?: readonly string[]): Record<string, string> {
  const resultat = normaliserLeLexique(preparer(noms), conventions, indexUcm, { nonRenommables, ...(portees ? { portees } : {}) });
  return Object.fromEntries(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
}

test('un groupe partagé avec un nom non renommable garde son écriture pour tout son chemin', () => {
  const noms = [primitive('l50', 'colors/Titanium/light/50'), primitive('d950', 'colors/Titanium/dark/950'),
    primitive('blanc', 'colors/Titanium/white'), primitive('noir', 'colors/Titanium/black')];
  assert.deepEqual(nomsApres(noms, ['l50', 'd950']), {});
  // Sans protection, la règle UCM renomme le dossier : c'est le défaut que la règle évite.
  assert.equal(nomsApres(noms, [])['blanc'], 'Color/Titanium/white');
});

test('un groupe sans nom protégé dans sa portée est renommé comme avant', () => {
  assert.equal(nomsApres([primitive('a', 'colors/Grass/white')], [])['a'], 'Color/Grass/white');
  // Le premier segment est partagé avec le nom protégé : il garde `colors`, rien d'autre ne change.
  assert.deepEqual(nomsApres([primitive('a', 'colors/Titanium/light/50'), primitive('b', 'colors/Grass/white')], ['a']), {});
});

test('un chemin partagé seulement jusqu\'à son premier segment ne fige que ce segment', () => {
  const noms = [primitive('l50', 'colors/Titanium/light/50'), primitive('ciel', 'colors/sky/white')];
  assert.deepEqual(nomsApres(noms, ['l50']), { ciel: 'colors/Sky/white' });
});

test('une portée hors du calcul ne fige rien', () => {
  const noms = [primitive('l50', 'colors/Titanium/light/50', 'autre'), primitive('blanc', 'colors/Titanium/white')];
  assert.equal(nomsApres(noms, ['l50'], ['primitives'])['blanc'], 'Color/Titanium/white');
  assert.deepEqual(nomsApres(noms, ['l50'], ['autre']), {});
});

test('assembler joint par le premier séparateur du segment quand le nombre de mots change', () => {
  assert.equal(assembler('foo-bar-baz', ['foo', 'qux'], 'inchange'), 'foo-qux');
  assert.equal(assembler('foo_bar_baz', ['foo', 'qux'], 'inchange'), 'foo_qux');
  assert.equal(assembler('foo bar baz', ['foo', 'qux'], 'inchange'), 'foo qux');
  assert.equal(assembler('foo-qux-x', ['foo', 'bar', 'baz', 'x'], 'inchange'), 'foo-bar-baz-x');
  assert.equal(assembler('fooBarBaz', ['foo', 'Qux'], 'inchange'), 'fooQux');
  assert.equal(assembler('foo-bar-baz', ['foo', 'qux'], 'tiret-bas'), 'foo_qux');
});
