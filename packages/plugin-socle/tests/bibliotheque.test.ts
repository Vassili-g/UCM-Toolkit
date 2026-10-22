/** La lecture des noms des libraries et le choix de celle que le fichier utilise. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { choisirLaLibrary, lireLesLibraries, type CollectionDeLibrary, type PortDeBibliotheque } from '../src/bibliotheque';

const disponibles = [
  { key: 'c1', name: 'Couleurs', libraryName: 'Lib A' },
  { key: 'c2', name: 'Espaces', libraryName: 'Lib A' },
  { key: 'c3', name: 'Couleurs', libraryName: 'Lib B' },
];
const variables: Record<string, { key: string; name: string; resolvedType: string }[]> = {
  c1: [{ key: 'v1', name: 'bleu/500', resolvedType: 'COLOR' }],
  c2: [{ key: 'v2', name: 'm', resolvedType: 'FLOAT' }],
  c3: [{ key: 'v3', name: 'rouge/500', resolvedType: 'COLOR' }],
};
function port(leve: string[] = []): PortDeBibliotheque {
  return { teamLibrary: {
    getAvailableLibraryVariableCollectionsAsync: async () => disponibles,
    getVariablesInLibraryCollectionAsync: async (cle) => { if (leve.includes(cle)) throw new Error('refusé'); return variables[cle]; },
  } };
}

test('nom, clé et type de chaque variable, par library et collection', async () => {
  const lecture = await lireLesLibraries(port());
  assert.equal(lecture.etat, 'lue');
  if (lecture.etat !== 'lue') return;
  assert.deepEqual(lecture.illisibles, []);
  assert.deepEqual(lecture.collections.map((c) => [c.library, c.nom, c.variables.map((v) => [v.nom, v.cle, v.type])]), [
    ['Lib A', 'Couleurs', [['bleu/500', 'v1', 'COLOR']]],
    ['Lib A', 'Espaces', [['m', 'v2', 'FLOAT']]],
    ['Lib B', 'Couleurs', [['rouge/500', 'v3', 'COLOR']]],
  ]);
});

test('une collection qui lève est illisible avec son motif, les autres se lisent', async () => {
  const lecture = await lireLesLibraries(port(['c2']));
  assert.ok(lecture.etat === 'lue');
  assert.deepEqual(lecture.illisibles, [{ cle: 'c2', nom: 'Espaces', library: 'Lib A', motif: 'refusé' }]);
  assert.equal(lecture.collections.length, 2);
});

test('sans teamLibrary, la lecture est illisible', async () => {
  assert.equal((await lireLesLibraries({})).etat, 'illisible');
});

test('une liste des collections qui lève rend illisible', async () => {
  const lecture = await lireLesLibraries({ teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => { throw new Error('hors ligne'); }, getVariablesInLibraryCollectionAsync: async () => [] } });
  assert.deepEqual(lecture, { etat: 'illisible', motif: 'hors ligne' });
});

const collections: CollectionDeLibrary[] = [
  { cle: 'c1', nom: 'Couleurs', library: 'Lib A', variables: [{ cle: 'v1', nom: 'a', type: 'COLOR' }, { cle: 'v2', nom: 'b', type: 'FLOAT' }] },
  { cle: 'c3', nom: 'Couleurs', library: 'Lib B', variables: [{ cle: 'v3', nom: 'c', type: 'COLOR' }] },
];

test('la library la plus liée est choisie', () => {
  const choix = choisirLaLibrary(collections, new Map([['v1', 2], ['v2', 3], ['v3', 4]]));
  assert.equal(choix.choisie, 'Lib A');
  assert.deepEqual(choix.candidates, [{ library: 'Lib A', liaisons: 5 }, { library: 'Lib B', liaisons: 4 }]);
});

test("à égalité, aucune library n'est choisie et les candidates sont rendues", () => {
  const choix = choisirLaLibrary(collections, new Map([['v1', 2], ['v3', 2]]));
  assert.equal(choix.choisie, null);
  assert.equal(choix.candidates.length, 2);
});

test("sans liaison, aucune library n'est choisie", () => {
  assert.deepEqual(choisirLaLibrary(collections, new Map()), { choisie: null, candidates: [] });
});
