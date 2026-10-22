/** Le catalogue de référence : noms d'abord, valeurs à la demande, état de chaque entrée. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { variableDuCatalogue, collectionDuCatalogue } from '@ucm-kit/core/controles';
import { catalogueDuFichier, chargerLesValeurs, lireLeCatalogueDeLibrary } from '../src/catalogue';
import { convertirCollection, convertirVariable } from '../src/lecture';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const teamLibrary = (collections: { key: string; name: string; libraryName: string; variables?: { key: string; name: string; resolvedType: string }[]; leve?: boolean }[]) => ({
  async getAvailableLibraryVariableCollectionsAsync() { return collections.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
  async getVariablesInLibraryCollectionAsync(cle: string) {
    const trouvee = collections.find((c) => c.key === cle)!;
    if (trouvee.leve) throw new Error('refusée');
    return trouvee.variables ?? [];
  },
});

const figma = {
  teamLibrary: teamLibrary([
    { key: 'ct', name: 'theme', libraryName: 'Intencial', variables: [{ key: 'v-fond', name: 'surface/page', resolvedType: 'COLOR' }] },
    { key: 'cl', name: 'layout', libraryName: 'Intencial', variables: [{ key: 'v-gap', name: 'gap/m', resolvedType: 'FLOAT' }] },
    { key: 'cc', name: 'components', libraryName: 'Intencial', variables: [{ key: 'v-bouton', name: 'bouton/fond', resolvedType: 'COLOR' }] },
    { key: 'cp', name: 'primitives', libraryName: 'Intencial', variables: [{ key: 'v-prim', name: 'bleu/500', resolvedType: 'COLOR' }] },
    { key: 'cx', name: 'Cassée', libraryName: 'Intencial', leve: true },
    { key: 'ca', name: 'theme', libraryName: 'Autre', variables: [{ key: 'v-autre', name: 'x', resolvedType: 'COLOR' }] },
  ]),
};

test('les collections theme, layout et components de la library sont lues par leurs noms, sans valeur', async () => {
  const lecture = await lireLeCatalogueDeLibrary(figma, 'Intencial');
  assert.equal(lecture.etat, 'lu');
  if (lecture.etat !== 'lu') return;
  const { catalogue } = lecture;
  assert.deepEqual(catalogue.library, { nom: 'Intencial', cle: 'Intencial' });
  assert.deepEqual(catalogue.collections.map((c) => [c.nom, c.role, c.etat]), [['theme', 'theme', 'lue'], ['layout', 'layout', 'lue'], ['components', 'components', 'lue']]);
  assert.deepEqual(catalogue.variables.map((v) => [v.cle, v.etat]), [['v-fond', 'non-chargee'], ['v-gap', 'non-chargee'], ['v-bouton', 'non-chargee']]);
  assert.equal(variableDuCatalogue(catalogue, 'v-prim'), 'absente');
});

test('une collection illisible d’une couche lue est inaccessible', async () => {
  const f = { teamLibrary: teamLibrary([{ key: 'ct', name: 'theme', libraryName: 'L', leve: true }, { key: 'cl', name: 'layout', libraryName: 'L', variables: [] }]) };
  const lecture = await lireLeCatalogueDeLibrary(f, 'L');
  assert.equal(lecture.etat === 'lu' && collectionDuCatalogue(lecture.catalogue, 'ct') !== 'absente' && (collectionDuCatalogue(lecture.catalogue, 'ct') as { etat: string }).etat, 'inaccessible');
});

test('une library illisible rend son motif', async () => {
  assert.deepEqual(await lireLeCatalogueDeLibrary({}, 'L'), { etat: 'illisible', motif: 'La permission teamlibrary manque : les libraries ne se lisent pas.' });
});

test('les valeurs s’importent par clé, les clés demandées seulement ; une clé refusée est inaccessible avec son motif', async () => {
  const lecture = await lireLeCatalogueDeLibrary(figma, 'Intencial');
  if (lecture.etat !== 'lu') throw new Error('lecture attendue');
  const importable = { ...variableFigma('v1', 'c1', 'surface/page', 'COLOR', { 'c1:a': { r: 1, g: 0, b: 0, a: 1 } }), key: 'v-fond' };
  const { port, appels } = portDeTest([], [], [], [], { importables: [importable] });
  const { catalogue, motifs } = await chargerLesValeurs(port, lecture.catalogue, ['v-fond', 'v-gap']);
  const fond = variableDuCatalogue(catalogue, 'v-fond');
  assert.ok(fond !== 'absente');
  assert.equal(fond.etat, 'presente');
  assert.deepEqual(fond.scopes, ['ALL_SCOPES']);
  assert.deepEqual(fond.valeurs, { 'c1:a': { valeur: { r: 1, g: 0, b: 0, a: 1 } } });
  assert.equal((variableDuCatalogue(catalogue, 'v-gap') as { etat: string }).etat, 'inaccessible');
  assert.equal(motifs['v-gap'], 'Clé absente de la bibliothèque');
  assert.equal((variableDuCatalogue(catalogue, 'v-bouton') as { etat: string }).etat, 'non-chargee');
  assert.equal(appels.has('import:v-bouton'), false);
  assert.equal((lecture.catalogue.variables[0]).etat, 'non-chargee');
});

test('un nom absent est « absente » ; un nom se trouve sans arbre', async () => {
  const lecture = await lireLeCatalogueDeLibrary(figma, 'Intencial');
  if (lecture.etat !== 'lu') throw new Error('lecture attendue');
  assert.equal(variableDuCatalogue(lecture.catalogue, 'inconnue/jeton'), 'absente');
  assert.equal((variableDuCatalogue(lecture.catalogue, 'bouton/fond', 'cc') as { cle: string }).cle, 'v-bouton');
});

test('les variables locales forment un catalogue sans library, valeurs présentes', () => {
  const col = collectionFigma('c1', 'theme', ['a'], ['v1']);
  const v = { ...variableFigma('v1', 'c1', 'surface/page', 'COLOR', { 'c1:a': { type: 'VARIABLE_ALIAS', id: 'VariableID:9' } }), key: 'k1' };
  const releve = { collections: [convertirCollection(col)], variables: [convertirVariable(v)!] };
  const catalogue = catalogueDuFichier(releve, 'ucm');
  assert.equal(catalogue.library, null);
  assert.equal(catalogue.collections[0].role, 'theme');
  assert.deepEqual(catalogue.variables[0].valeurs, { 'c1:a': { alias: 'VariableID:9' } });
  assert.equal(catalogue.variables[0].etat, 'presente');
});
