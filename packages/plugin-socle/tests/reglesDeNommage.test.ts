/** Les entrées de l'espace qui changent un nom, lues comme UCM Nomenclature les range. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { lireLesEntreesDeNommage, lireReglesDeNommage } from '../src/reglesDeNommage';

const entree = (contenu: Record<string, unknown>): string => JSON.stringify({ version: 1, ...contenu });
const ECRITURE = entree({ groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const V1 = JSON.stringify({ version: 1, termesUcm: true, conventions: { groupes: { casse: 'initiale', separateur: 'espace' }, variables: { casse: 'minuscules', separateur: 'tiret' } } });

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
