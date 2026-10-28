/** Les entrées de l'espace qui changent un nom, lues comme UCM Architect les range, et les clés que les deux côtés construisent. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { cleDeRegleDuTerme } from '../src/referentiel/harmonisation.js';
import {
  CLE_ECRITURE, CLE_EXCLUES, PREFIXES_DE_NOMMAGE, cleEcart, cleOrdinaire, cleTerme, entreeDeNommage, estCleDeNommage, lireEntree, lireLesEntreesDeNommage, lireReglesDeNommage, rangerLesEcritures, type RegleDeNommage,
} from '../src/protocoles/nommage.js';

const entree = (contenu: Record<string, unknown>): string => JSON.stringify({ version: 1, ...contenu });
const ECRITURE = entree({ groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const V1 = JSON.stringify({ version: 1, termesUcm: true, conventions: { groupes: { casse: 'initiale', separateur: 'espace' }, variables: { casse: 'minuscules', separateur: 'tiret' } } });

test('les cinq sortes de règles passent de leur entrée écrite à la même règle lue', () => {
  const regles: readonly RegleDeNommage[] = [
    { type: 'ecriture', ecriture: { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } } },
    { type: 'terme', terme: { terme: ['font', 'size'], remplace: [['taille'], ['police']], definition: 'Taille du texte.' } },
    { type: 'ecart', id: 'ucm-etat-hover' },
    { type: 'ordinaire', cle: 'dark' },
    { type: 'exclues', ids: ['c1', 'c9'] },
  ];
  for (const regle of regles) {
    const entree = entreeDeNommage(regle);
    const lue = lireLesEntreesDeNommage(new Map([[entree.cle, entree.texte]]));
    switch (regle.type) {
      case 'ecriture': assert.deepEqual(lue.ecriture, regle.ecriture); break;
      case 'terme': assert.deepEqual(lue.termes, [regle.terme]); break;
      case 'ecart': assert.deepEqual(lue.ecartsUcm, [regle.id]); break;
      case 'ordinaire': assert.deepEqual(lue.ordinaires, [regle.cle]); break;
      case 'exclues': assert.deepEqual(lue.collectionsExclues, regle.ids); break;
    }
  }
});

test('les textes des règles conservent la version, l’ordre des champs et les ids triés', () => {
  assert.deepEqual(entreeDeNommage({ type: 'ecriture', ecriture: { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } } }), { cle: 'ecriture', texte: '{"version":1,"groupes":{"casse":"PascalCase","separateur":"camelCase"},"variables":{"casse":"minuscules","separateur":"tiret"}}' });
  assert.deepEqual(entreeDeNommage({ type: 'terme', terme: { terme: ['font', 'size'], remplace: [['taille']], definition: 'Taille.' } }), { cle: 'terme:font size', texte: '{"version":1,"terme":["font","size"],"remplace":[["taille"]],"definition":"Taille."}' });
  assert.deepEqual(entreeDeNommage({ type: 'ecart', id: 'x' }), { cle: 'ecart:x', texte: '{"version":1}' });
  assert.deepEqual(entreeDeNommage({ type: 'ordinaire', cle: 'dark' }), { cle: 'ordinaire:dark', texte: '{"version":1}' });
  assert.deepEqual(entreeDeNommage({ type: 'exclues', ids: ['c9', 'c1', 'c9'] }), { cle: 'exclues', texte: '{"version":1,"ids":["c1","c9"]}' });
});

test('le rangement suit l’ordre et remet les textes d’avant après un échec', () => {
  const table = new Map([['a', 'A0'], ['b', 'B0']]);
  const ordre: string[] = [];
  const stockage = {
    cles: () => [...table.keys()],
    lire: (cle: string) => table.get(cle) ?? '',
    ecrire: (cle: string, texte: string) => { ordre.push(cle); table.set(cle, texte); if (cle === 'b' && texte === 'B1') throw Error('plein'); },
    effacer: (cle: string) => { ordre.push(cle); table.delete(cle); },
  };
  assert.throws(() => rangerLesEcritures(stockage, [{ cle: 'a', texte: 'A1' }, { cle: 'b', texte: 'B1' }]), /plein/u);
  assert.deepEqual(ordre, ['a', 'b', 'a', 'b']);
  assert.deepEqual([...table], [['a', 'A0'], ['b', 'B0']]);
});

test('sans écriture rangée, il n’y a pas de règles de nommage', () => {
  assert.equal(lireReglesDeNommage([]), null);
  assert.equal(lireReglesDeNommage([['terme:color', entree({ terme: ['color'], remplace: [['colors']] })]]), null);
  assert.equal(lireReglesDeNommage([['ecriture', 'pas du json']]), null);
  assert.equal(lireReglesDeNommage([['ecriture', JSON.stringify({ version: 2, groupes: {}, variables: {} })]]), null);
});

test('la convention de la v1 se lit mais ne vaut pas une écriture rangée', () => {
  assert.equal(lireReglesDeNommage([['conventions', V1]]), null);
  const lues = lireLesEntreesDeNommage(new Map([['conventions', V1]]));
  assert.equal(lues.ecritureDeLaV1, true);
  assert.deepEqual(lues.ecriture?.groupes, { casse: 'initiale', separateur: 'espace' });
  assert.equal(lireLesEntreesDeNommage(new Map([['conventions', V1], ['ecriture', ECRITURE]])).ecritureDeLaV1, false);
});

test('l’écriture, les termes, les écarts, les ordinaires et les exclues sont lus, triés et dédoublés', () => {
  const regles = lireReglesDeNommage([
    ['ecriture', ECRITURE],
    ['terme:color', entree({ terme: ['color'], remplace: [['colors']], definition: 'La couleur.' })],
    ['terme:bg', entree({ terme: ['autre'], remplace: [] })],
    ['ecart:ucm-etat-hover', entree({})],
    ['ordinaire:dark', entree({})],
    ['ordinaire:a b', entree({})],
    ['exclues', entree({ ids: ['c9', 'c1', 'c9'] })],
    ['distinct:a|b', entree({})],
    ['plus-tard:q', entree({})],
  ])!;
  assert.deepEqual(regles.ecriture, { groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
  assert.deepEqual(regles.vocabulaire, {
    personnalises: [{ terme: ['color'], remplace: [['colors']], definition: 'La couleur.' }],
    ecartsUcm: ['ucm-etat-hover'],
  });
  assert.deepEqual(regles.ordinaires, ['dark']);
  assert.deepEqual(regles.collectionsExclues, ['c1', 'c9']);
});

// Les clés

test('cleTerme joint les mots par une espace et garde la casse, cleDeRegleDuTerme par un tiret en minuscules', () => {
  assert.equal(cleTerme(['font', 'size']), 'terme:font size');
  assert.equal(cleTerme(['Font', 'Size']), 'terme:Font Size');
  assert.equal(cleDeRegleDuTerme(['Font', 'Size']), 'terme:font-size');
  assert.equal(cleDeRegleDuTerme(['font', 'size']), 'terme:font-size');
});

test('les constructeurs de clés et estCleDeNommage emploient les mêmes préfixes', () => {
  assert.equal(PREFIXES_DE_NOMMAGE.terme, 'terme:');
  assert.equal(cleEcart('ucm-etat-hover'), 'ecart:ucm-etat-hover');
  assert.equal(cleOrdinaire('dark'), 'ordinaire:dark');
  for (const cle of [cleTerme(['bg']), cleEcart('x'), cleOrdinaire('x'), CLE_ECRITURE, CLE_EXCLUES]) assert.equal(estCleDeNommage(cle), true, cle);
  for (const cle of ['distinct:a|b', 'plus-tard:q', 'vus', 'journal', 'terme:', 'ecart:', 'ordinaire:']) assert.equal(estCleDeNommage(cle), false, cle);
});

// Les entrées d'une version future

const FUTURE = JSON.stringify({ version: 2, groupes: {}, variables: {}, terme: ['color'], remplace: [['colors']], ids: ['c1'] });

test('une entrée de version 1 se lit, une de version 2 n’est pas une entrée courante', () => {
  assert.deepEqual(lireEntree(entree({ a: 1 })), { version: 1, a: 1 });
  assert.equal(lireEntree(FUTURE), undefined);
  assert.equal(lireEntree(JSON.stringify({ version: 0 })), undefined);
  assert.equal(lireEntree(JSON.stringify({ version: 1.5 })), undefined);
  assert.equal(lireEntree(JSON.stringify({ version: '1' })), undefined);
  assert.equal(lireEntree(JSON.stringify({})), undefined);
  assert.equal(lireEntree('[1]'), undefined);
  assert.equal(lireEntree('pas du json'), undefined);
  assert.equal(lireEntree(''), undefined);
});

test('une entrée de version 2 sous chaque clé de nommage est rangée dans futures, triée, et absente du calcul', () => {
  const lues = lireLesEntreesDeNommage(new Map([
    ['ordinaire:dark', FUTURE], ['ecart:ucm-etat-hover', FUTURE], ['terme:color', FUTURE], [CLE_EXCLUES, FUTURE], [CLE_ECRITURE, FUTURE],
    ['distinct:a|b', FUTURE], ['plus-tard:q', FUTURE],
  ]));
  assert.deepEqual(lues.futures, ['ecart:ucm-etat-hover', 'ecriture', 'exclues', 'ordinaire:dark', 'terme:color']);
  assert.equal(lues.ecriture, undefined);
  assert.deepEqual(lues.termes, []);
  assert.deepEqual(lues.ecartsUcm, []);
  assert.deepEqual(lues.ordinaires, []);
  assert.deepEqual(lues.collectionsExclues, []);
});

test('sans entrée future, futures est vide', () => {
  assert.deepEqual(lireLesEntreesDeNommage(new Map([[CLE_ECRITURE, ECRITURE], ['terme:color', entree({ terme: ['color'], remplace: [] })]])).futures, []);
  assert.deepEqual(lireLesEntreesDeNommage(new Map([[CLE_ECRITURE, 'pas du json'], [CLE_EXCLUES, '[]']])).futures, []);
});

test('une écriture ou des exclues futures donnent null à lireReglesDeNommage', () => {
  const termes = [['terme:color', entree({ terme: ['color'], remplace: [['colors']] })]] as const;
  assert.equal(lireReglesDeNommage([...termes, [CLE_ECRITURE, FUTURE]]), null);
  assert.equal(lireReglesDeNommage([...termes, [CLE_ECRITURE, ECRITURE], [CLE_EXCLUES, FUTURE]]), null);
  assert.notEqual(lireReglesDeNommage([...termes, [CLE_ECRITURE, ECRITURE]]), null);
});

test('un terme, un écart ou un ordinaire futur ne change pas les règles que lit Palettes', () => {
  const base: [string, string][] = [[CLE_ECRITURE, ECRITURE], ['terme:color', entree({ terme: ['color'], remplace: [['colors']] })]];
  const avecFutures: [string, string][] = [...base, ['terme:size', FUTURE], ['ecart:ucm-etat-hover', FUTURE], ['ordinaire:dark', FUTURE]];
  assert.deepEqual(lireReglesDeNommage(avecFutures), lireReglesDeNommage(base));
  assert.notEqual(lireReglesDeNommage(avecFutures), null);
});

test('une convention de la v1 de version 2 est rangée dans futures sans valoir une écriture', () => {
  const lues = lireLesEntreesDeNommage(new Map([['conventions', JSON.stringify({ version: 2 })]]));
  assert.deepEqual(lues.futures, ['conventions']);
  assert.equal(lues.ecriture, undefined);
});
