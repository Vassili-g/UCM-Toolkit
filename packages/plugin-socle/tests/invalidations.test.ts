/** Les raisons d'invalider une entrée de session, lues dans le journal et le suivi retenu. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerLeJournal, type ChangementAJournaliser } from '../src/composant/analyse/journal';
import { raisonsDInvalidation } from '../src/composant/analyse/invalidations';
import type { SuiviRetenu } from '../src/composant/analyse/session';

const suivi = (parents: Array<[string, string]> = []): SuiviRetenu => ({
  curseur: 0, noeuds: new Set(['jeu', 'variant', 'calque']), admis: new Set(['jeu', 'variant']), parents: new Map([['variant', 'jeu'], ['calque', 'variant'], ...parents]),
  pages: new Set(['page']), couverture: { instances: 'descendues', complete: true },
});
const noeud = (type: string, id: string, parent: string | null, properties?: string[]): ChangementAJournaliser => ({
  nature: 'noeud', type, id, ...(properties ? { properties } : {}), node: parent === null ? { id, removed: true } : { id, parent: { id: parent, parent: null } },
});
const raisons = (changements: ChangementAJournaliser[], retenu = suivi(), borne = 50) => {
  const journal = creerLeJournal({ borne });
  journal.enregistrer(changements);
  return raisonsDInvalidation(retenu, 0, journal);
};

test('un journal sans changement, ou avec des nœuds d’ailleurs, n’invalide rien', () => {
  assert.deepEqual(raisons([]), []);
  assert.deepEqual(raisons([noeud('PROPERTY_CHANGE', 'autre', 'page'), noeud('CREATE', 'ailleurs', 'autre')]), []);
});

test('un nœud de l’inventaire, ou un calque créé sous lui, touche le sujet', () => {
  assert.deepEqual(raisons([noeud('PROPERTY_CHANGE', 'calque', 'variant')]), ['sujet-touche']);
  assert.deepEqual(raisons([noeud('CREATE', 'neuf', 'variant')]), ['sujet-touche']);
  assert.deepEqual(raisons([noeud('CREATE', 'a', 'page'), noeud('CREATE', 'b', 'a'), noeud('PROPERTY_CHANGE', 'a', 'jeu', ['parent'])]), ['sujet-touche']);
});

test('un nœud déplacé hors du sujet, ou supprimé, se situe par ses anciens parents', () => {
  const retenu = suivi([['voisin', 'variant']]);
  assert.deepEqual(raisons([noeud('DELETE', 'voisin', null)], retenu), ['sujet-touche']);
  assert.deepEqual(raisons([noeud('PROPERTY_CHANGE', 'voisin', 'page', ['parent'])], retenu), ['sujet-touche']);
  assert.deepEqual(raisons([noeud('DELETE', 'inconnu', null)]), [], 'un nœud jamais vu dans le sujet est hors du sujet');
});

test('un nœud apparu depuis le curseur puis supprimé a un ancien parent que le journal a vu avant lui', () => {
  assert.deepEqual(raisons([noeud('CREATE', 'a', 'page'), noeud('DELETE', 'a', null)]), []);
  assert.deepEqual(raisons([noeud('CREATE', 'a', 'page'), noeud('PROPERTY_CHANGE', 'a', 'page', ['parent']), noeud('DELETE', 'a', null)]), []);
});

test('un type inconnu, un nœud supprimé sans parent lisible ou un style donnent une portée inconnue ou un style', () => {
  assert.deepEqual(raisons([noeud('AUTRE', 'x', 'page')]), ['portee-inconnue']);
  assert.deepEqual(raisons([noeud('PROPERTY_CHANGE', 'x', null)]), ['portee-inconnue']);
  assert.deepEqual(raisons([{ nature: 'style', type: 'STYLE_PROPERTY_CHANGE', id: 'S:1' }]), ['style']);
});

test('une écriture, une page quittée et un journal débordé invalident, chacun sous sa raison', () => {
  const journal = creerLeJournal({ borne: 2 });
  journal.signalerUneEcriture('ecriture');
  assert.deepEqual(raisonsDInvalidation(suivi(), 0, journal), ['ecriture']);
  journal.signaler('page', 'page-quittee');
  assert.deepEqual(raisonsDInvalidation(suivi(), 0, journal), ['page-interrompue', 'ecriture']);
  journal.signaler('autre-page', 'page-quittee');
  assert.deepEqual(raisonsDInvalidation(suivi(), 0, journal), ['journal-deborde', 'page-interrompue', 'ecriture']);
});

test('un point d’évaluation plus récent n’examine que ce qui suit', () => {
  const journal = creerLeJournal({ borne: 10 });
  journal.enregistrer([noeud('PROPERTY_CHANGE', 'calque', 'variant')]);
  const point = journal.marquer();
  assert.deepEqual(raisonsDInvalidation(suivi(), 0, journal), ['sujet-touche']);
  assert.deepEqual(raisonsDInvalidation(suivi(), point, journal), []);
  journal.signalerUneEcriture('configuration');
  assert.deepEqual(raisonsDInvalidation(suivi(), point, journal), ['ecriture']);
});
