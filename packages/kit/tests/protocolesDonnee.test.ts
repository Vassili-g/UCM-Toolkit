import assert from 'node:assert/strict';
import test from 'node:test';
import { classerLaDonnee, lireLaDonnee, type FenetreDeVersions } from '../src/protocoles/donnee.js';

const FENETRE: FenetreDeVersions = { champ: 'version', courante: 3, premiere: 2 };
const AVEC_DEFAUT: FenetreDeVersions = { ...FENETRE, parDefaut: 3 };

// Une entrée par règle de `classerLaDonnee`, dans l'ordre où elle s'applique.
for (const [regle, texte, fenetre, attendu] of [
  ['1 : undefined est absente', undefined, FENETRE, { etat: 'absente' }],
  ['1 : le texte vide est absent', '', FENETRE, { etat: 'absente' }],
  ['2 : un JSON invalide est illisible', '{"version":', FENETRE, { etat: 'illisible', cause: 'json' }],
  ['2 : un texte qui n\'est pas du JSON est illisible', 'pas du JSON', FENETRE, { etat: 'illisible', cause: 'json' }],
  ['3 : un tableau est illisible', '[3]', FENETRE, { etat: 'illisible', cause: 'forme' }],
  ['3 : un nombre est illisible', '3', FENETRE, { etat: 'illisible', cause: 'forme' }],
  ['3 : null est illisible', 'null', FENETRE, { etat: 'illisible', cause: 'forme' }],
  ['3 : une chaîne JSON est illisible', '"3"', FENETRE, { etat: 'illisible', cause: 'forme' }],
  ['4 : une version absente sans valeur par défaut est illisible', '{}', FENETRE, { etat: 'illisible', cause: 'version' }],
  ['4 : une version en texte sans valeur par défaut est illisible', '{"version":"3"}', FENETRE, { etat: 'illisible', cause: 'version' }],
  ['4 : une version absente prend la valeur par défaut', '{}', AVEC_DEFAUT, { etat: 'courante', version: 3, valeur: {} }],
  ['4 : une version en texte prend la valeur par défaut', '{"version":"2"}', AVEC_DEFAUT, { etat: 'courante', version: 3, valeur: { version: '2' } }],
  ['5 : une version décimale est illisible', '{"version":2.5}', FENETRE, { etat: 'illisible', cause: 'version' }],
  ['5 : une version négative est illisible', '{"version":-1}', FENETRE, { etat: 'illisible', cause: 'version' }],
  ['5 : une version infinie est illisible', '{"version":1e999}', FENETRE, { etat: 'illisible', cause: 'version' }],
  ['5 : une version décimale reste illisible avec une valeur par défaut', '{"version":2.5}', AVEC_DEFAUT, { etat: 'illisible', cause: 'version' }],
  ['6 : une version supérieure est future', '{"version":4}', FENETRE, { etat: 'future', version: 4 }],
  ['6 : une version future ne rend pas son contenu', '{"version":99,"x":1}', FENETRE, { etat: 'future', version: 99 }],
  ['7 : une version sous la première est illisible, avec la version lue', '{"version":1}', FENETRE, { etat: 'illisible', cause: 'version', version: 1 }],
  ['7 : la version 0 est illisible, avec la version lue', '{"version":0}', FENETRE, { etat: 'illisible', cause: 'version', version: 0 }],
  ['8 : une version entre la première et la courante est ancienne', '{"version":2,"x":1}', FENETRE, { etat: 'ancienne', version: 2, valeur: { version: 2, x: 1 } }],
  ['9 : la version courante est courante', '{"version":3,"x":1}', FENETRE, { etat: 'courante', version: 3, valeur: { version: 3, x: 1 } }],
] as const) {
  test(`classerLaDonnee, règle ${regle}`, () => {
    assert.deepEqual(classerLaDonnee(texte, fenetre), attendu);
  });
}

test('classerLaDonnee lit le champ que la fenêtre nomme', () => {
  const fenetre: FenetreDeVersions = { champ: 'formatVersion', courante: 2, premiere: 1 };
  assert.deepEqual(classerLaDonnee('{"formatVersion":2}', fenetre), { etat: 'courante', version: 2, valeur: { formatVersion: 2 } });
  assert.deepEqual(classerLaDonnee('{"version":2}', fenetre), { etat: 'illisible', cause: 'version' });
});

test('classerLaDonnee ne modifie pas le texte ni ne migre la valeur', () => {
  const texte = '{"version":2,"a":[1,2]}';
  const lue = classerLaDonnee(texte, FENETRE);
  assert.equal(lue.etat, 'ancienne');
  if (lue.etat === 'ancienne') assert.deepEqual(lue.valeur, { version: 2, a: [1, 2] });
});

test('classerLaDonnee ne rend jamais refusee', () => {
  for (const texte of [undefined, '', 'x', '[]', '{}', '{"version":1}', '{"version":2}', '{"version":3}', '{"version":4}']) {
    assert.notEqual(classerLaDonnee(texte, FENETRE).etat, 'refusee');
  }
});

test('lireLaDonnee classe le texte que la lecture rend', () => {
  assert.deepEqual(lireLaDonnee(() => '{"version":3}', (texte) => classerLaDonnee(texte, FENETRE)), { etat: 'courante', version: 3, valeur: { version: 3 } });
  assert.deepEqual(lireLaDonnee(() => '', (texte) => classerLaDonnee(texte, FENETRE)), { etat: 'absente' });
});

test('lireLaDonnee rend refusee, jamais absente, quand la lecture lève', () => {
  const lue = lireLaDonnee(() => { throw new Error('lecture refusée'); }, (texte) => classerLaDonnee(texte, FENETRE));
  assert.deepEqual(lue, { etat: 'refusee' });
});

test('lireLaDonnee n\'appelle pas le classement quand la lecture lève', () => {
  let appels = 0;
  lireLaDonnee(() => { throw new Error('lecture refusée'); }, (texte) => { appels += 1; return classerLaDonnee(texte, FENETRE); });
  assert.equal(appels, 0);
});
