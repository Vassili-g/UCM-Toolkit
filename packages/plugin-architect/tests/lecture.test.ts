/** Les doubles reproduisent ce que Figma rend : collections et variables locales, alias et donnée partagée. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lireInventaire, relireInventaireAvantEcriture, TAILLE_DU_LOT, type AvancementLecture, type PortDeLecture, type VariableLue } from '../src/lecture';
import { creerPortDeLecture } from '../src/lectureFigma';

function portDeTest(variables: readonly VariableLue[], extras: { alias?: Record<string, string>; protegees?: readonly string[]; traces?: string[] } = {}): PortDeLecture {
  return {
    collections: async () => [{ id: 'local', name: 'Local', remote: false }, { id: 'remote', name: 'Remote', remote: true }],
    variables: async () => variables,
    cibleAlias: (variable) => { extras.traces?.push(`alias:${variable.id}`); return extras.alias?.[variable.id]; },
    protegee: (variable) => extras.protegees?.includes(variable.id) ?? false,
  };
}
const variable = (id: string, name = id, variableCollectionId = 'local', remote = false): VariableLue => ({ id, name, variableCollectionId, remote });

test('les variables et collections distantes sont ignorées', async () => {
  const inventaire = await lireInventaire(portDeTest([
    variable('v1', 'Button color'), variable('v2', 'Distant', 'local', true), variable('v3', 'Collection distante', 'remote'),
  ]), { pause: async () => {} });
  assert.deepEqual(inventaire.entrees.map((entree) => entree.cible), [
    { type: 'collection', collectionId: 'local' },
    { type: 'variable', variableId: 'v1', collectionId: 'local' },
  ]);
  const nom = inventaire.entrees[1].nom;
  assert.equal(nom.categorie, 'variables');
  assert.equal(nom.portee, 'local');
  assert.equal(inventaire.entrees[0].nom.categorie, 'collections');
  assert.deepEqual(JSON.parse(JSON.stringify(inventaire)), inventaire);
});

test('la protection et l’alias du premier mode se lisent sur chaque variable', async () => {
  const inventaire = await lireInventaire(portDeTest([variable('a'), variable('b'), variable('c')], { alias: { b: 'VariableID:1:2' }, protegees: ['c'] }), { pause: async () => {} });
  const parNom = Object.fromEntries(inventaire.entrees.filter((entree) => entree.cible.type === 'variable').map((entree) => [entree.nom.nom, entree]));
  assert.equal(parNom.a.nom.cibleAlias, undefined);
  assert.equal(parNom.a.protegee, false);
  assert.equal(parNom.b.nom.cibleAlias, 'VariableID:1:2');
  assert.equal(parNom.c.protegee, true);
  assert.equal(inventaire.entrees.find((entree) => entree.cible.type === 'collection')?.protegee, false);
});

test('les segments avant le nom final d’une variable sont ses groupes', async () => {
  const inventaire = await lireInventaire(portDeTest(['Button/Sizes/Medium/padding-x', 'opacity'].map((name, rang) => variable(`v${rang}`, name))), { pause: async () => {} });
  const categories = Object.fromEntries(inventaire.entrees.filter((entree) => entree.cible.type === 'variable')
    .map((entree) => [entree.nom.nom, entree.nom.categoriesDesSegments]));
  assert.deepEqual(categories, { 'Button/Sizes/Medium/padding-x': ['groupes', 'groupes', 'groupes', null], opacity: undefined });
});

test('la lecture se fait par lots de cinq cents avec une pause entre deux', async () => {
  const traces: string[] = [];
  const progression: AvancementLecture[] = [];
  const total = TAILLE_DU_LOT * 2 + 1;
  const variables = Array.from({ length: total }, (_, rang) => variable(`v${rang}`));
  await lireInventaire(portDeTest(variables, { traces }), { pause: async () => { traces.push('pause'); }, avancement: (etat) => progression.push(etat) });
  assert.equal(TAILLE_DU_LOT, 500);
  assert.deepEqual(progression, [{ lues: 0, total }, { lues: 500, total }, { lues: 1000, total }, { lues: 1001, total }]);
  assert.equal(traces.filter((trace) => trace === 'pause').length, 2);
  assert.equal(traces.indexOf('pause'), TAILLE_DU_LOT);
  assert.equal(traces.lastIndexOf('pause'), TAILLE_DU_LOT * 2 + 1);
});

test('la relecture avant écriture rend le même modèle sans pause', async () => {
  const variables = [variable('a', 'Brand/color'), ...Array.from({ length: 600 }, (_, rang) => variable(`x${rang}`))];
  const port = portDeTest(variables, { alias: { a: 'VariableID:9:9' } });
  const lue = await lireInventaire(port, { pause: async () => {} });
  let lectures = 0;
  const relue = await relireInventaireAvantEcriture({ ...port, variables: async () => { lectures++; return variables; } });
  assert.deepEqual(relue, lue);
  assert.equal(lectures, 1);
});

test('une erreur de lecture ne retourne aucun inventaire partiel', async () => {
  const port = { ...portDeTest([]), variables: async () => { throw new Error('refus'); } };
  await assert.rejects(lireInventaire(port, { pause: async () => {} }), /refus/);
});

test('l’adaptateur Figma lit l’alias du premier mode et la donnée partagée palette', async () => {
  const lectures: string[] = [];
  const fabrique = (id: string, valeur: unknown, palette: string) => ({ id, name: id, remote: false, variableCollectionId: 'local',
    valuesByMode: { m1: valeur, m2: 'autre' }, getSharedPluginData: (espace: string, cle: string) => { lectures.push(`${espace}/${cle}`); return palette; } });
  const brutes = [fabrique('a', { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' }, ''), fabrique('b', { r: 0, g: 0, b: 0 }, 'Brand'), fabrique('c', 3, '')];
  const api = { variables: { getLocalVariableCollectionsAsync: async () => [{ id: 'local', name: 'Local', remote: false }], getLocalVariablesAsync: async () => brutes } };
  const inventaire = await lireInventaire(creerPortDeLecture(api as unknown as PluginAPI), { pause: async () => {} });
  const variablesLues = inventaire.entrees.filter((entree) => entree.cible.type === 'variable');
  assert.deepEqual(variablesLues.map((entree) => [entree.nom.cibleAlias, entree.protegee]), [['VariableID:1:2', false], [undefined, true], [undefined, false]]);
  assert.ok(lectures.length === 3 && lectures.every((lecture) => lecture === 'ucm_palettes/palette'));
});
