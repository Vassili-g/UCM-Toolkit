import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLE_NOMMAGE_DE_PALETTES, CLE_RECETTE, CLES_PARTAGEES_DE_PALETTES, ESPACE_PARTAGE,
  FENETRE_DE_LA_RECETTE, FENETRE_DU_SUIVI, VERSION_DE_LA_MARQUE, VERSION_DU_SUIVI_DES_VARIABLES,
  classerLEnveloppeDeLaRecette, classerLaMarqueDeNommage, identifiantsDuSuivi, lireLaMarqueDeNommage,
  lireLeSuiviComplet, marqueurDePaletteLu, texteDeLaMarque,
} from '../src/protocoles/palettes.js';
import { lireLaDonnee } from '../src/protocoles/donnee.js';
import * as produits from '../src/referentiel/produits.js';

const leve = (): string => { throw new Error('lecture refusée'); };

test('la porte republie les adresses du registre', () => {
  assert.equal(ESPACE_PARTAGE, produits.ESPACE_PARTAGE);
  assert.equal(CLE_NOMMAGE_DE_PALETTES, produits.CLE_NOMMAGE_DE_PALETTES);
  assert.equal(CLE_RECETTE, produits.CLE_RECETTE);
  assert.equal(CLES_PARTAGEES_DE_PALETTES, produits.CLES_PARTAGEES_DE_PALETTES);
});

// La recette

test('la fenêtre de la recette lit les formats 8 à 12 et ne tolère pas une version absente', () => {
  assert.deepEqual(FENETRE_DE_LA_RECETTE, { champ: 'formatVersion', courante: 12, premiere: 8 });
  assert.equal(FENETRE_DE_LA_RECETTE.parDefaut, undefined);
});

test('recette : absence', () => {
  assert.deepEqual(classerLEnveloppeDeLaRecette(undefined), { etat: 'absente' });
  assert.deepEqual(classerLEnveloppeDeLaRecette(''), { etat: 'absente' });
});

test('recette : JSON invalide, forme inattendue et version illisible', () => {
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":'), { etat: 'illisible', cause: 'json' });
  assert.deepEqual(classerLEnveloppeDeLaRecette('[]'), { etat: 'illisible', cause: 'forme' });
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"crans":[50]}'), { etat: 'illisible', cause: 'version' });
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":"12"}'), { etat: 'illisible', cause: 'version' });
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":12.5}'), { etat: 'illisible', cause: 'version' });
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":-1}'), { etat: 'illisible', cause: 'version' });
});

test('recette : lecture refusée', () => {
  assert.deepEqual(lireLaDonnee(leve, classerLEnveloppeDeLaRecette), { etat: 'refusee' });
});

test('recette : version ancienne, courante et future', () => {
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":7}'), { etat: 'illisible', cause: 'version', version: 7 });
  for (const version of [8, 9, 10, 11]) {
    assert.deepEqual(classerLEnveloppeDeLaRecette(`{"formatVersion":${version},"a":1}`), { etat: 'ancienne', version, valeur: { formatVersion: version, a: 1 } });
  }
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":12,"a":1}'), { etat: 'courante', version: 12, valeur: { formatVersion: 12, a: 1 } });
  assert.deepEqual(classerLEnveloppeDeLaRecette('{"formatVersion":13,"a":1}'), { etat: 'future', version: 13 });
});

// Le suivi des variables

// Les octets de `texteDuSuivi` (plugin-palettes/src/variables/suivi.ts) pour un suivi vide, puis pour deux palettes dont une reprise.
const SUIVI_VIDE_ECRIT = '{"version":1,"destination":{"collection":{"nom":"primitives"},"groupe":"color","themes":"chemin"},"confirmee":false,"palettes":{}}';
const SUIVI_ECRIT = '{"version":1,"destination":{"collection":{"nom":"primitives"},"groupe":"color","themes":"chemin"},"confirmee":true,"palettes":{"p-00000001":{"collection":"VariableCollectionId:1:2","groupe":"color","modes":{"light":"m1","dark":"m2"},"variables":{"soft/light/500":{"id":"VariableID:1:3","ecrite":"#3366FF"},"soft/dark/500":{"id":"VariableID:1:4","ecrite":"#99BBFF"}},"liaison":"destination"},"p-00000002":{"collection":"VariableCollectionId:1:2","groupe":"color/orange","modes":{"unique":"m3"},"variables":{"500":{"id":"VariableID:1:5","ecrite":"#FF8800"}},"liaison":"reprise","chemin":"color/orange","intensite":"vivid","sortieAnterieureDe":"p-00000001"}}}';

test('la fenêtre du suivi lit la version 1 et prend la version 1 pour un suivi sans version', () => {
  assert.equal(VERSION_DU_SUIVI_DES_VARIABLES, 1);
  assert.deepEqual(FENETRE_DU_SUIVI, { champ: 'version', courante: 1, premiere: 1, parDefaut: 1 });
});

test('suivi : les octets de Palettes sont lus par la lecture complète', () => {
  const vide = lireLeSuiviComplet(SUIVI_VIDE_ECRIT);
  assert.equal(vide.etat, 'courante');
  if (vide.etat === 'courante') {
    assert.equal(vide.version, 1);
    assert.deepEqual(vide.valeur, { destination: { collection: { nom: 'primitives' }, groupe: 'color', themes: 'chemin' }, confirmee: false, palettes: {} });
  }
  const lu = lireLeSuiviComplet(SUIVI_ECRIT);
  assert.equal(lu.etat, 'courante');
  if (lu.etat !== 'courante') return;
  assert.equal(lu.valeur.confirmee, true);
  assert.deepEqual(lu.valeur.palettes, {
    'p-00000001': {
      collection: 'VariableCollectionId:1:2', groupe: 'color', modes: { light: 'm1', dark: 'm2' }, liaison: 'destination',
      variables: { 'soft/light/500': { id: 'VariableID:1:3', ecrite: '#3366FF' }, 'soft/dark/500': { id: 'VariableID:1:4', ecrite: '#99BBFF' } },
    },
    'p-00000002': {
      collection: 'VariableCollectionId:1:2', groupe: 'color/orange', modes: { unique: 'm3' }, liaison: 'reprise',
      variables: { 500: { id: 'VariableID:1:5', ecrite: '#FF8800' } }, chemin: 'color/orange', intensite: 'vivid', sortieAnterieureDe: 'p-00000001',
    },
  });
});

test('suivi : les octets de Palettes sont lus par le relevé conservateur', () => {
  assert.deepEqual([...identifiantsDuSuivi(SUIVI_VIDE_ECRIT)], []);
  assert.deepEqual([...identifiantsDuSuivi(SUIVI_ECRIT)].sort(), ['VariableID:1:3', 'VariableID:1:4', 'VariableID:1:5']);
});

test('suivi : absence', () => {
  assert.deepEqual(lireLeSuiviComplet(''), { etat: 'absente' });
  assert.deepEqual([...identifiantsDuSuivi('')], []);
});

test('suivi : JSON invalide et forme inattendue', () => {
  assert.deepEqual(lireLeSuiviComplet('{"version":'), { etat: 'illisible', cause: 'json' });
  assert.deepEqual(lireLeSuiviComplet('[]'), { etat: 'illisible', cause: 'forme' });
  assert.deepEqual(lireLeSuiviComplet('null'), { etat: 'illisible', cause: 'forme' });
  for (const texte of ['{"version":', '[]', 'null', '3', '{"palettes":[]}', '{"palettes":{"p":{"variables":"x"}}}']) {
    assert.deepEqual([...identifiantsDuSuivi(texte)], [], texte);
  }
});

test('suivi : lecture refusée', () => {
  assert.deepEqual(lireLaDonnee(leve, lireLeSuiviComplet), { etat: 'refusee' });
});

test('suivi : un suivi sans version ou à version non numérique se lit comme la version 1', () => {
  for (const texte of ['{}', '{"palettes":{}}', '{"version":"2","palettes":{}}']) {
    const lu = lireLeSuiviComplet(texte);
    assert.equal(lu.etat, 'courante', texte);
    if (lu.etat === 'courante') assert.equal(lu.version, 1, texte);
  }
});

test('suivi : une version sous la première ou invalide est illisible', () => {
  assert.deepEqual(lireLeSuiviComplet('{"version":0}'), { etat: 'illisible', cause: 'version', version: 0 });
  assert.deepEqual(lireLeSuiviComplet('{"version":1.5}'), { etat: 'illisible', cause: 'version' });
  assert.deepEqual(lireLeSuiviComplet('{"version":-1}'), { etat: 'illisible', cause: 'version' });
});

test('suivi : aucune version ancienne n\'existe encore', () => {
  assert.equal(FENETRE_DU_SUIVI.premiere, FENETRE_DU_SUIVI.courante);
});

test('suivi : un suivi de version 2 est future pour la lecture complète, et garde ses identifiants dans le relevé', () => {
  const texte = JSON.stringify({ version: 2, palettes: { p1: { collection: 'c', variables: { a: { id: 'v1', ecrite: '#000000' }, b: { id: 'v2' } } } } });
  assert.deepEqual(lireLeSuiviComplet(texte), { etat: 'future', version: 2 });
  assert.deepEqual([...identifiantsDuSuivi(texte)].sort(), ['v1', 'v2']);
});

test('relevé : les identifiants de toute version, sans lever', () => {
  const suivi = JSON.stringify({ version: 3, palettes: { p1: { variables: { a: { id: 'v1', ecrite: true }, b: { id: 'v2' }, c: { id: '' }, d: { id: 4 } } }, p2: { variables: { c: { id: 'v3' } } } } });
  assert.deepEqual([...identifiantsDuSuivi(suivi)].sort(), ['v1', 'v2', 'v3']);
});

test('suivi : la lecture complète écarte une entrée mal formée sans écarter les autres', () => {
  const texte = JSON.stringify({
    version: 1,
    palettes: {
      sansCollection: { groupe: 'x', variables: {} },
      pasUnObjet: 'x',
      bonne: {
        collection: 'c', groupe: 3, liaison: 'inconnue', chemin: 4, intensite: 'neutre', sortieAnterieureDe: 5,
        modes: { light: 'm1', dark: 7, sombre: 'm2', unique: 'm3' },
        variables: { a: { id: 'v1', ecrite: '#aabbcc' }, b: { id: 'v2' }, c: 'x', d: { id: 3, ecrite: '#000000' } },
      },
    },
  });
  const lu = lireLeSuiviComplet(texte);
  assert.equal(lu.etat, 'courante');
  if (lu.etat !== 'courante') return;
  assert.deepEqual(Object.keys(lu.valeur.palettes), ['bonne']);
  assert.deepEqual(lu.valeur.palettes.bonne, {
    collection: 'c', groupe: '', liaison: 'destination', modes: { unique: 'm3', light: 'm1' }, variables: { a: { id: 'v1', ecrite: '#AABBCC' } },
  });
});

test('suivi : la lecture complète rend la destination et la confirmation brutes', () => {
  const lu = lireLeSuiviComplet('{"version":1,"destination":"x","confirmee":"oui","palettes":[]}');
  assert.equal(lu.etat, 'courante');
  if (lu.etat === 'courante') assert.deepEqual(lu.valeur, { destination: 'x', confirmee: 'oui', palettes: {} });
});

test('suivi : lire ne modifie rien', () => {
  const avant = SUIVI_ECRIT;
  lireLeSuiviComplet(avant);
  identifiantsDuSuivi(avant);
  assert.equal(avant, SUIVI_ECRIT);
});

// La marque `nommage`

test('marque : les octets de Palettes sont lus comme courants', () => {
  assert.equal(VERSION_DE_LA_MARQUE, 1);
  assert.equal(texteDeLaMarque(), '{"version":1}');
  assert.equal(classerLaMarqueDeNommage(texteDeLaMarque()), 'courante');
  assert.equal(lireLaMarqueDeNommage(() => texteDeLaMarque()), 'courante');
});

for (const [texte, attendu] of [
  ['', 'absente'], ['{"version":1}', 'courante'], ['{"version":1,"autre":true}', 'courante'],
  ['{"version":2}', 'future'], ['{"version":99}', 'future'],
  ['pas du json', 'illisible'], ['{', 'illisible'], ['[]', 'illisible'], ['null', 'illisible'], ['3', 'illisible'],
  ['{}', 'illisible'], ['{"version":0}', 'illisible'], ['{"version":-1}', 'illisible'], ['{"version":1.5}', 'illisible'],
  ['{"version":2.5}', 'illisible'], ['{"version":"1"}', 'illisible'], ['{"version":null}', 'illisible'],
] as const) {
  test(`marque : ${JSON.stringify(texte)} se lit ${attendu}`, () => {
    assert.equal(classerLaMarqueDeNommage(texte), attendu);
    assert.equal(lireLaMarqueDeNommage(() => texte), attendu);
  });
}

test('marque : une lecture qui lève donne refusee', () => {
  assert.equal(lireLaMarqueDeNommage(leve), 'refusee');
});

// Les marqueurs d'une variable

test('marqueur palette : un texte non vide prouve le suivi, un texte vide non', () => {
  assert.equal(marqueurDePaletteLu('p-00000001'), 'p-00000001');
  assert.equal(marqueurDePaletteLu('x'), 'x');
  assert.equal(marqueurDePaletteLu(''), null);
});
