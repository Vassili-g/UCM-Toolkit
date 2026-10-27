/** Le journal des changements : ordre, curseurs, entrées sans objet Figma, parent illisible, débordement, oubli. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerLeJournal, type ChangementAJournaliser } from '../src/composant/analyse/journal';

const noeud = (id: string, parent?: string): ChangementAJournaliser => ({
  nature: 'noeud', type: 'CREATE', id, node: { id, parent: parent === undefined ? null : { id: parent, parent: null } },
});

test('les entrées gardent l’ordre de réception et un numéro croissant', () => {
  const journal = creerLeJournal({ borne: 10 });
  journal.enregistrer([noeud('a', 'p'), noeud('b', 'p')]);
  journal.enregistrer([{ nature: 'style', type: 'STYLE_DELETE', id: 'S:1' }]);
  const entrees = journal.depuis(0);
  assert.deepEqual(entrees.map((e) => e.id), ['a', 'b', 'S:1']);
  assert.deepEqual(entrees.map((e) => e.revision), [1, 2, 3]);
});

test('depuis(curseur) ne rend que les entrées postérieures au marquage', () => {
  const journal = creerLeJournal({ borne: 10 });
  journal.enregistrer([noeud('a')]);
  const curseur = journal.marquer();
  assert.deepEqual(journal.depuis(curseur), []);
  journal.enregistrer([noeud('b'), noeud('c')]);
  assert.deepEqual(journal.depuis(curseur).map((e) => e.id), ['b', 'c']);
  assert.equal(journal.marquer(), 3);
});

test('une entrée ne porte aucun objet Figma : le parent est un identifiant', () => {
  const journal = creerLeJournal({ borne: 10 });
  journal.enregistrer([{ nature: 'noeud', type: 'PROPERTY_CHANGE', id: 'x', properties: ['fills'], node: { id: 'x', parent: { id: 'cadre', parent: null } } }]);
  const [entree] = journal.depuis(0);
  assert.deepEqual(entree, { revision: 1, nature: 'noeud', type: 'PROPERTY_CHANGE', id: 'x', properties: ['fills'], parent: 'cadre' });
  assert.doesNotThrow(() => JSON.stringify(entree));
});

test('un parent illisible, un nœud supprimé ou un nœud sans parent donnent null', () => {
  const journal = creerLeJournal({ borne: 10 });
  const illisible = { id: 'i', get parent(): never { throw new Error('nœud supprimé'); } };
  journal.enregistrer([
    { nature: 'noeud', type: 'CREATE', id: 'i', node: illisible },
    { nature: 'noeud', type: 'DELETE', id: 'd', node: { id: 'd', removed: true, parent: { id: 'p', parent: null } } },
    { nature: 'noeud', type: 'CREATE', id: 'n' },
    noeud('racine'),
  ]);
  assert.deepEqual(journal.depuis(0).map((e) => e.parent), [null, null, null, null]);
});

test('au-delà de la borne, les changements ne sont plus gardés et le débordement se lit par curseur', () => {
  const journal = creerLeJournal({ borne: 2 });
  const avant = journal.marquer();
  journal.enregistrer([noeud('a'), noeud('b')]);
  assert.equal(journal.debordeDepuis(avant), false);
  const apres = journal.marquer();
  journal.enregistrer([noeud('c')]);
  assert.deepEqual(journal.depuis(0).map((e) => e.id), ['a', 'b']);
  assert.equal(journal.debordeDepuis(avant), true);
  assert.equal(journal.debordeDepuis(apres), true, 'le changement perdu suit ce curseur');
  assert.equal(journal.debordeDepuis(journal.marquer()), false, 'un curseur postérieur à la perte ne manque de rien');
});

test('oublierAvant retire les entrées que plus aucun curseur ne lit, et rend de la place', () => {
  const journal = creerLeJournal({ borne: 2 });
  journal.enregistrer([noeud('a'), noeud('b'), noeud('c')]);
  assert.equal(journal.debordeDepuis(0), true);
  journal.oublierAvant(journal.marquer());
  assert.deepEqual(journal.depuis(0), []);
  assert.equal(journal.debordeDepuis(0), false);
  journal.enregistrer([noeud('d')]);
  assert.deepEqual(journal.depuis(0).map((e) => e.id), ['d']);
  journal.oublierAvant(3);
  assert.deepEqual(journal.depuis(0).map((e) => e.id), ['d'], 'une entrée postérieure au curseur reste');
});

test('une interruption de page est une entrée sans objet Figma ; la couverture ne dépend que des pages voulues', () => {
  const journal = creerLeJournal({ borne: 10 });
  const avant = journal.marquer();
  assert.deepEqual(journal.couvertureDepuis(avant, ['A']), { etat: 'continue' });
  journal.signaler('B', 'page-quittee');
  assert.deepEqual(journal.couvertureDepuis(avant, ['A']), { etat: 'continue' }, 'une autre page');
  journal.signaler('A', 'page-quittee');
  journal.signaler('A', 'page-non-ecoutee');
  assert.deepEqual(journal.couvertureDepuis(avant, ['A']), { etat: 'interrompue', raisons: ['page-quittee', 'page-non-ecoutee'] });
  assert.deepEqual(journal.couvertureDepuis(journal.marquer(), ['A']), { etat: 'continue' }, 'un curseur postérieur');
  assert.deepEqual(journal.depuis(0).map((e) => [e.nature, e.page, e.raison]), [['interruption', 'B', 'page-quittee'], ['interruption', 'A', 'page-quittee'], ['interruption', 'A', 'page-non-ecoutee']]);
});

test('un débordement interrompt la couverture de tout curseur antérieur à la perte', () => {
  const journal = creerLeJournal({ borne: 1 });
  const avant = journal.marquer();
  journal.enregistrer([noeud('a'), noeud('b')]);
  assert.deepEqual(journal.couvertureDepuis(avant, []), { etat: 'interrompue', raisons: ['journal-deborde'] });
  assert.deepEqual(journal.couvertureDepuis(journal.marquer(), []), { etat: 'continue' });
});

test('une écriture s’inscrit avec son origine ; un débordement la rend invisible mais ecritureDepuis le dit', () => {
  const journal = creerLeJournal({ borne: 1 });
  const curseur = journal.marquer();
  assert.equal(journal.ecritureDepuis(curseur), false);
  journal.signalerUneEcriture('configuration');
  assert.deepEqual(journal.depuis(curseur).map((entree) => [entree.nature, entree.origine]), [['ecriture', 'configuration']]);
  assert.equal(journal.ecritureDepuis(curseur), true);
  assert.equal(journal.ecritureDepuis(journal.marquer()), false);
  const plein = journal.marquer();
  journal.signalerUneEcriture('ecriture');
  assert.equal(journal.ecritureDepuis(plein), true, 'perdue à la borne : on suppose une écriture');
});
