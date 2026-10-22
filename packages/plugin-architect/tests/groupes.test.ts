/** L'arbre des groupes, construit des seuls segments `/` des noms Figma. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { arbreDeCollection, cleDeGroupe, clesDesAncetres, lignesVisibles, segmentsDeGroupe, variableDansLeGroupe } from '../src/groupes';
import { indexer } from '../src/indexation';
import { constructeur, nombre, projetLibre } from './fixtures';

test('un groupe parent contient ses descendants et exclut un voisin au préfixe commun', () => {
  const index = indexer(projetLibre());
  const interfaceCollection = index.collections.get('interface')!;
  const dansCard = interfaceCollection.variables.filter((id) => variableDansLeGroupe(index.variables.get(id)!, ['card']));
  assert.deepEqual(dansCard, ['carte-fond', 'carte-gap', 'entete-fond', 'entete-titre']);
  const dansHeader = interfaceCollection.variables.filter((id) => variableDansLeGroupe(index.variables.get(id)!, ['card', 'header']));
  assert.deepEqual(dansHeader, ['entete-fond', 'entete-titre']);
  assert.equal(dansCard.includes('cardinal'), false);
});

test('le compteur d’un groupe est récursif, et la collection compte toutes ses variables', () => {
  const index = indexer(projetLibre());
  const arbre = arbreDeCollection(index.collections.get('interface')!, index.variables);
  assert.equal(arbre.total, 11);
  const card = arbre.enfants.find((enfant) => enfant.libelle === 'card')!;
  assert.equal(card.total, 4);
  assert.deepEqual(card.variables, ['carte-fond', 'carte-gap']);
  assert.equal(card.enfants[0].libelle, 'header');
  assert.equal(card.enfants[0].total, 2);
});

test('un point, une espace, un accent ou la casse ne créent aucun groupe', () => {
  assert.deepEqual(segmentsDeGroupe('spacing.card'), []);
  assert.deepEqual(segmentsDeGroupe('Élément de liste/Côté Gauche.v2'), ['Élément de liste']);
  const c = constructeur();
  c.collection('x', 'X', ['M']);
  c.variable('a', 'x', 'Card/fill', 'FLOAT', { M: nombre(1) });
  c.variable('b', 'x', 'card/fill', 'FLOAT', { M: nombre(2) });
  const index = indexer(c.releve());
  const arbre = arbreDeCollection(index.collections.get('x')!, index.variables);
  assert.deepEqual(arbre.enfants.map((enfant) => enfant.libelle), ['Card', 'card']);
});

test('un segment vide reste un segment distinct, sans collision de clé', () => {
  const c = constructeur();
  c.collection('x', 'X', ['M']);
  c.variable('a', 'x', 'a//b', 'FLOAT', { M: nombre(1) });
  c.variable('b', 'x', 'a/b', 'FLOAT', { M: nombre(2) });
  const index = indexer(c.releve());
  const arbre = arbreDeCollection(index.collections.get('x')!, index.variables);
  const a = arbre.enfants[0];
  assert.deepEqual(a.enfants.map((enfant) => enfant.segments), [['a', '']]);
  assert.deepEqual(a.variables, ['b']);
  assert.notEqual(cleDeGroupe('x', ['a', '']), cleDeGroupe('x', ['a']));
});

test('deux collections homonymes et deux groupes homonymes restent distincts par identifiant', () => {
  const c = constructeur();
  c.collection('un', 'Tokens', ['M']);
  c.collection('deux', 'Tokens', ['M']);
  c.variable('a', 'un', 'groupe/x', 'FLOAT', { M: nombre(1) });
  c.variable('b', 'deux', 'groupe/x', 'FLOAT', { M: nombre(2) });
  const index = indexer(c.releve());
  const un = arbreDeCollection(index.collections.get('un')!, index.variables);
  const deux = arbreDeCollection(index.collections.get('deux')!, index.variables);
  assert.notEqual(un.cle, deux.cle);
  assert.notEqual(un.enfants[0].cle, deux.enfants[0].cle);
  assert.deepEqual(un.enfants[0].variables, ['a']);
  assert.deepEqual(deux.enfants[0].variables, ['b']);
  // Une concaténation `collection/segments` confondrait ces deux clés.
  assert.notEqual(cleDeGroupe('a/b', ['c']), cleDeGroupe('a', ['b', 'c']));
});

test('replier un nœud cache ses descendants sans changer les autres lignes', () => {
  const index = indexer(projetLibre());
  const arbre = arbreDeCollection(index.collections.get('interface')!, index.variables);
  const toutes = lignesVisibles([arbre], new Set());
  assert.deepEqual(toutes.map((ligne) => ligne.noeud.libelle), ['Interface', 'card', 'header', 'cardinal', 'action', 'badge', 'usage', 'legacy', 'essai']);
  const card = arbre.enfants[0];
  const replie = lignesVisibles([arbre], new Set([card.cle]));
  assert.deepEqual(replie.map((ligne) => ligne.noeud.libelle), ['Interface', 'card', 'cardinal', 'action', 'badge', 'usage', 'legacy', 'essai']);
  assert.equal(replie[1].deplie, false);
  assert.equal(replie[1].aDesEnfants, true);
});

test('les ancêtres d’une variable sont la collection puis chaque groupe', () => {
  const index = indexer(projetLibre());
  assert.deepEqual(clesDesAncetres(index.variables.get('entete-titre')!), [
    cleDeGroupe('interface', []),
    cleDeGroupe('interface', ['card']),
    cleDeGroupe('interface', ['card', 'header']),
  ]);
});
