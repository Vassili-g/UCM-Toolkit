/** Les doubles reproduisent ce que Figma rend : collections et variables locales, alias et donnée partagée. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { inventaireDeLectures, lireInventaire, TAILLE_DU_LOT, variablesSuiviesParPalettes, type AvancementLecture, type PortDeLecture, type VariableLue } from '../src/lecture';
import { creerPortDeLecture } from '../src/lectureFigma';

function portDeTest(variables: readonly VariableLue[], extras: { alias?: Record<string, string>; protegees?: readonly string[]; palettes?: Record<string, string>; traces?: string[] } = {}): PortDeLecture {
  return {
    collections: async () => [{ id: 'local', name: 'Local', remote: false }, { id: 'remote', name: 'Remote', remote: true }],
    variables: async () => variables,
    cibleAlias: (variable) => { extras.traces?.push(`alias:${variable.id}`); return extras.alias?.[variable.id]; },
    protegee: (variable) => extras.protegees?.includes(variable.id) ?? false,
    palette: (variable) => extras.palettes?.[variable.id],
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
  assert.equal(nom.portee, inventaire.entrees[0].nom.id, 'la portée d\'une variable est l\'identifiant du nom de sa collection');
  assert.equal(inventaire.entrees[0].nom.categorie, 'collections');
  assert.deepEqual(JSON.parse(JSON.stringify(inventaire)), inventaire);
});

test('la protection et l’alias du premier mode se lisent sur chaque variable', async () => {
  const inventaire = await lireInventaire(portDeTest([variable('a'), variable('b'), variable('c')], { alias: { b: 'a', c: 'VariableID:1:2' }, protegees: ['c'] }), { pause: async () => {} });
  const parNom = Object.fromEntries(inventaire.entrees.filter((entree) => entree.cible.type === 'variable').map((entree) => [entree.nom.nom, entree]));
  assert.equal(parNom.a.nom.cibleAlias, undefined);
  assert.equal(parNom.a.protegee, false);
  assert.equal(parNom.b.nom.cibleAlias, parNom.a.nom.id, 'N08 : la cible locale porte l’identifiant de son nom, celui que le lexique indexe');
  assert.equal(parNom.c.nom.cibleAlias, undefined, 'une cible qui n’est pas une variable locale lue reste sans cible');
  assert.equal(parNom.c.protegee, true);
  assert.equal(inventaire.entrees.find((entree) => entree.cible.type === 'collection')?.protegee, false);
});

test('l’identifiant de palette d’une variable entre dans son nom lu, et seulement quand il n’est pas vide', async () => {
  const inventaire = await lireInventaire(portDeTest([variable('a', 'colors/Poppy/50'), variable('b', 'colors/Poppy/100')], { palettes: { a: 'poppy-id' } }), { pause: async () => {} });
  const [a, b] = inventaire.entrees.filter((entree) => entree.cible.type === 'variable');
  assert.equal(a.nom.palette, 'poppy-id');
  assert.equal('palette' in b.nom, false);
  assert.equal(inventaire.entrees[0].nom.palette, undefined);
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

test('l’inventaire construit sans attente est le même modèle que la lecture par lots', async () => {
  const variables = [variable('a', 'Brand/color'), variable('b', 'Distant', 'local', true), ...Array.from({ length: 600 }, (_, rang) => variable(`x${rang}`))];
  const port = portDeTest(variables, { alias: { a: 'VariableID:9:9' }, protegees: ['x3'] });
  const lue = await lireInventaire(port, { pause: async () => {} });
  const construite = inventaireDeLectures(await port.collections(), await port.variables(), port);
  assert.deepEqual(construite, lue);
});

test('AC7 : le suivi racine de Palettes donne les identifiants de variables reprises, sans jamais lever', () => {
  const suivi = JSON.stringify({ version: 3, palettes: { p1: { variables: { a: { id: 'v1', ecrite: true }, b: { id: 'v2' } } }, p2: { variables: { c: { id: 'v3' } } } } });
  assert.deepEqual([...variablesSuiviesParPalettes(suivi)].sort(), ['v1', 'v2', 'v3']);
  for (const texte of ['', '{', 'null', '3', '{"palettes":[]}', '{"palettes":{"p":{"variables":"x"}}}']) {
    assert.deepEqual([...variablesSuiviesParPalettes(texte)], [], texte);
  }
});

test('une erreur de lecture ne retourne aucun inventaire partiel', async () => {
  const port = { ...portDeTest([]), variables: async () => { throw new Error('refus'); } };
  await assert.rejects(lireInventaire(port, { pause: async () => {} }), /refus/);
});

test('l’adaptateur Figma lit l’alias du premier mode et la donnée partagée palette', async () => {
  const lectures: string[] = [];
  const fabrique = (id: string, valeur: unknown, palette: string) => ({ id, name: id, remote: false, variableCollectionId: 'local',
    valuesByMode: { m1: valeur, m2: 'autre' }, getSharedPluginData: (espace: string, cle: string) => { lectures.push(`${espace}/${cle}`); return palette; } });
  const brutes = [fabrique('a', { type: 'VARIABLE_ALIAS', id: 'c' }, ''), fabrique('b', { r: 0, g: 0, b: 0 }, 'Brand'), fabrique('c', 3, '')];
  const api = { variables: { getLocalVariableCollectionsAsync: async () => [{ id: 'local', name: 'Local', remote: false }], getLocalVariablesAsync: async () => brutes },
    root: { getSharedPluginData: () => '' } };
  const inventaire = await lireInventaire(creerPortDeLecture(api as unknown as PluginAPI), { pause: async () => {} });
  const variablesLues = inventaire.entrees.filter((entree) => entree.cible.type === 'variable');
  assert.deepEqual(variablesLues.map((entree) => [entree.nom.cibleAlias, entree.protegee]), [['["variable","c"]', false], [undefined, true], [undefined, false]]);
  assert.deepEqual(variablesLues.map((entree) => entree.nom.palette), [undefined, 'Brand', undefined]);
  assert.ok(lectures.length === 3 && lectures.every((lecture) => lecture === 'ucm_palettes/palette'), 'la donnée de chaque variable se lit une seule fois');
});

test('AC7 : l’analyse ne propose pas une variable reprise que Palettes suit, et lit la racine une fois', async () => {
  const racine: string[] = [];
  const brutes = ['a', 'b', 'c'].map((id) => ({ id, name: id, remote: false, variableCollectionId: 'local', valuesByMode: {}, getSharedPluginData: () => '' }));
  const suivi = JSON.stringify({ palettes: { p: { variables: { k: { id: 'b' } } } } });
  const api = { variables: { getLocalVariableCollectionsAsync: async () => [{ id: 'local', name: 'Local', remote: false }], getLocalVariablesAsync: async () => brutes },
    root: { getSharedPluginData: (espace: string, cle: string) => { racine.push(`${espace}/${cle}`); return suivi; } } };
  const inventaire = await lireInventaire(creerPortDeLecture(api as unknown as PluginAPI), { pause: async () => {} });
  assert.deepEqual(inventaire.entrees.filter((entree) => entree.protegee).map((entree) => entree.cible.type === 'variable' ? entree.cible.variableId : ''), ['b']);
  assert.deepEqual(racine, ['ucm_palettes/variables', 'ucm_palettes/nommage'], 'le suivi et la marque de Palettes, chacun une fois');
});
