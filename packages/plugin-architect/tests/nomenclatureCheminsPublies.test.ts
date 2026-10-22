/** Les chemins de tokens.json : le contrôle pur, puis les deux parcours de l'audit et leur affichage dans la session. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { axesDeLExport, cheminsEnConflit, inventairePublie, pairesDejaEnConflit, type CollectionPubliee, type InventairePublie } from '@ucm-kit/core/nommage';
import type { PortDeRegles } from '../src/ecriture/noms';
import { inventaireDeLectures, type PortDeLecture } from '../src/nomenclature/lecture';
import type { DemandeArchitect, GesteSurLesRegles, PluginMessage } from '../src/nomenclature/messages';
import { creerSession } from '../src/nomenclature/session';
import { TEXTES } from '../src/ui/nomenclature/textes';

/** Les variables s'écrivent `[id, nom, collection]` ; la collection est `c` par défaut. */
type Spec = readonly [id: string, nom: string, collection?: string];
function inventaire(collections: readonly (readonly [string, string])[], variables: readonly Spec[]): InventairePublie {
  return {
    collections: collections.map(([id, nom]) => ({ id, nom })),
    variables: variables.map(([id, nom, collection = collections[0][0]]) => ({ id, nom, collection })),
  };
}
const renommer = (...paires: readonly (readonly [string, string])[]): ReadonlyMap<string, string> => new Map(paires);
const ids = (causes: readonly { readonly id: string }[]): string[] => causes.map(({ id }) => id);

test('deux noms qui ne diffèrent que par la casse donnent le même chemin : seul le renommage est en cause', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'bg/primary'], ['v2', 'Background/primary']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['v1', 'background/primary'])), [
    { id: 'v1', motif: 'meme-token', apres: 'components/background/primary', autre: 'components/Background/primary' },
  ]);
});

test('une espace avant le séparateur donne le même chemin', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'bg/primary'], ['v2', 'background /primary']]);
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['v1', 'background/primary']))), ['v1']);
});

test('un renommage sans conflit de chemin ne rend rien', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'bg/primary'], ['v2', 'Background/secondary']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['v1', 'background/primary'])), []);
  assert.deepEqual(cheminsEnConflit(doc, renommer()), []);
});

test('renommer une collection met le renommage de la collection en cause quand ses variables convergent avec les siennes', () => {
  const doc = inventaire([['c', 'Colors']], [['v1', 'foo'], ['v2', 'theme/foo']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'theme'])), [
    { id: 'c', motif: 'meme-token', apres: 'theme/foo', autre: 'theme/theme/foo' },
  ]);
});

test('renommer une collection du nom d\'une autre fait converger leurs variables', () => {
  const doc = inventaire([['t', 'Theme'], ['c', 'Colors']], [['v1', 'foo', 't'], ['v2', 'foo', 'c']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'theme'])), [
    { id: 'c', motif: 'meme-token', apres: 'theme/foo', autre: 'Theme/foo' },
  ]);
});

test('un renommage de variable et celui de sa collection sont en cause ensemble quand la variable entre en conflit', () => {
  const doc = inventaire([['t', 'Theme'], ['c', 'Colors']], [['v1', 'foo', 't'], ['v2', 'bar', 'c'], ['v3', 'baz', 'c']]);
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['v2', 'foo']))), [], 'Colors/foo et Theme/foo restent deux chemins');
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['c', 'theme'], ['v2', 'foo']))), ['v2', 'c']);
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['c', 'theme'], ['v3', 'qux']))), [], 'une variable renommée hors conflit n’est pas en cause');
});

test('un token qui devient le groupe d\'un autre est en cause, avec le token en premier', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'colors'], ['v2', 'color/primary']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['v1', 'color'])), [
    { id: 'v1', motif: 'token-et-groupe', apres: 'components/color', autre: 'components/color/primary' },
  ]);
  const autre = inventaire([['c', 'components']], [['v1', 'ink'], ['v2', 'paint/detail']]);
  assert.deepEqual(ids(cheminsEnConflit(autre, renommer(['v1', 'paint']))), ['v1']);
});

test('un token qui entre dans le groupe d\'un autre token est en cause, avec le token groupe en premier', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'color'], ['v2', 'other/primary']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['v2', 'color/primary'])), [
    { id: 'v2', motif: 'token-et-groupe', apres: 'components/color', autre: 'components/color/primary' },
  ]);
});

test('deux renommages qui se rejoignent sont en cause ensemble', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'a'], ['v2', 'b']]);
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['v1', 'z'], ['v2', 'Z']))), ['v1', 'v2']);
});

test('un conflit déjà présent avant les renommages ne bloque rien', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'Foo'], ['v2', 'foo'], ['v3', 'color'], ['v4', 'color/primary'], ['v5', 'x']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['v1', 'FOO'], ['v2', 'foo ']), ), []);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['v5', 'y'])), []);
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['v5', 'foo']))), ['v5'], 'un conflit neuf reste vu à côté des anciens');
});

test('un renommage retiré rend son nom à l\'objet, qui peut bloquer un autre : le contrôle recommence', () => {
  const doc = inventaire([['k', 'k']], [['a', 'a'], ['b', 'b'], ['c', 'c']]);
  // a et b se rejoignent et sont retirés ; c visait le nom que a reprend.
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['a', 'z'], ['b', 'Z'], ['c', 'a']))), ['a', 'b', 'c']);
});

test('un nom qui ne donne aucun chemin ne se publie pas', () => {
  const doc = inventaire([['c', 'k']], [['a', 'a'], ['b', '$']]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['a', '$x'])), []);
});

test('une paire donnée comme déjà en conflit ne compte pas comme un conflit nouveau, dans les deux ordres', () => {
  const doc = inventaire([['c', 'components']], [['v1', 'b'], ['v2', 'a/x'], ['v3', 'a/y']]);
  const retour = renommer(['v1', 'a']);
  assert.deepEqual(ids(cheminsEnConflit(doc, retour)), ['v1'], 'sans le paramètre, le comportement ne change pas');
  assert.deepEqual(ids(cheminsEnConflit(doc, retour, [])), ['v1']);
  assert.deepEqual(ids(cheminsEnConflit(doc, retour, [['v1', 'v2']])), ['v1'], 'v3 reste un conflit nouveau');
  assert.deepEqual(ids(cheminsEnConflit(doc, retour, [['v2', 'v1'], ['v3', 'v1']])), []);
  assert.deepEqual(ids(cheminsEnConflit(doc, retour, [['v2', 'v3']])), ['v1'], 'une paire étrangère à la variable renommée n’exempte rien');
});

test('pairesDejaEnConflit rend les paires déjà en conflit dont une variable est touchée, directement ou par sa collection', () => {
  const doc = inventaire([['c', 'colors'], ['d', 'Colors'], ['e', 'autre']], [
    ['v1', 'foo', 'c'], ['v2', 'foo', 'd'], ['v3', 'foo/bar', 'c'], ['v4', 'seul', 'e'], ['v5', 'foo', 'e'],
  ]);
  assert.deepEqual(pairesDejaEnConflit(doc, new Set(['v4'])), [], 'une variable sans conflit n’a aucune paire');
  assert.deepEqual(pairesDejaEnConflit(doc, new Set(['v1'])), [['v1', 'v2'], ['v1', 'v3']], 'même chemin que v2, et groupe de v3');
  assert.deepEqual(pairesDejaEnConflit(doc, new Set(['v3'])), [['v1', 'v3'], ['v2', 'v3']], 'v3 est le groupe de v1 et de v2');
  assert.deepEqual(pairesDejaEnConflit(doc, new Set(['e'])), [], 'une collection touchée compte par ses variables');
  assert.deepEqual(pairesDejaEnConflit(doc, new Set(['d'])), [['v1', 'v2'], ['v2', 'v3']], 'chaque paire sort une fois, triée');
  assert.deepEqual(pairesDejaEnConflit(doc, new Set()), []);
});

test('dix mille variables et mille renommages se contrôlent sans balayage de paires', () => {
  const collections: (readonly [string, string])[] = Array.from({ length: 20 }, (_, rang) => [`c${rang}`, `Collection ${rang}`]);
  const variables: Spec[] = Array.from({ length: 10_000 }, (_, rang) => [`v${rang}`, `groupe ${rang % 50}/sous-groupe ${rang % 7}/nom ${rang}`, `c${rang % 20}`]);
  const doc = inventaire(collections, variables);
  const renommages = new Map<string, string>();
  for (let rang = 0; rang < 1_000; rang++) renommages.set(`v${rang * 10}`, `Groupe ${rang % 50}/sous-groupe ${rang % 7}/Nom ${rang * 10}-bis`);
  // Un conflit réel : v1 prend le nom de v21, qui est dans la même collection (21 % 20 = 1).
  renommages.set('v1', variables[21][1]);
  const debut = performance.now();
  const causes = cheminsEnConflit(doc, renommages);
  const duree = performance.now() - debut;
  assert.deepEqual(ids(causes), ['v1']);
  assert.ok(duree < 500, `le contrôle a pris ${Math.round(duree)} ms`);
});

// Les axes de modes (N02)

/** Un document sans variable : les collections suffisent au contrôle des axes. */
const collectionsSeules = (...collections: readonly CollectionPubliee[]): InventairePublie => ({ collections, variables: [] });
const axe = (id: string, nom: string, nombreDeModes = 2): CollectionPubliee => ({ id, nom, nombreDeModes });
const etendue = (id: string, nom: string, racine: string): CollectionPubliee => ({ id, nom, nombreDeModes: 2, extension: true, racine });

test('N02 : renommer une collection à modes du nom d’une autre fait perdre les deux axes, et le renommage est en cause', () => {
  const doc = collectionsSeules(axe('c', 'Zorglub'), axe('d', 'Primitives'));
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'primitives'])), [
    { id: 'c', motif: 'meme-axe', apres: 'primitives', autre: 'Primitives' },
  ]);
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'Primitives '])), [
    { id: 'c', motif: 'meme-axe', apres: 'Primitives ', autre: 'Primitives' },
  ], 'les espaces de bord et la casse ne distinguent pas deux clés');
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'Nouveau'])), []);
});

test('N02 : deux renommages qui donnent la même clé d’axe sont en cause ensemble, chacun avec le nom de l’autre', () => {
  const doc = collectionsSeules(axe('c', 'Un'), axe('d', 'Deux'));
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'zorglub'], ['d', 'Zorglub'])), [
    { id: 'c', motif: 'meme-axe', apres: 'zorglub', autre: 'Zorglub' },
    { id: 'd', motif: 'meme-axe', apres: 'Zorglub', autre: 'zorglub' },
  ]);
});

test('N02 : une collision d’axes déjà présente ne bloque rien, une nouvelle reste vue à côté', () => {
  const doc = collectionsSeules(axe('c', 'primitives'), axe('d', 'Primitives'), axe('e', 'Autre'));
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'PRIMITIVES'])), [], 'les deux collections se rejoignaient déjà');
  assert.deepEqual(cheminsEnConflit(doc, renommer(['e', 'Primitives'])), [{ id: 'e', motif: 'meme-axe', apres: 'Primitives', autre: 'primitives' }],
    'la troisième collection rejoint le groupe : sa paire est neuve');
});

test('N02 : un renommage retiré rend son nom à la collection, et le contrôle recommence', () => {
  const doc = collectionsSeules(axe('c', 'Zorglub'), axe('d', 'Primitives'), axe('e', 'Autre'));
  // c prend le nom de d ; e prend celui que c libère. Une fois c retiré, c reprend Zorglub et bloque e.
  assert.deepEqual(ids(cheminsEnConflit(doc, renommer(['c', 'primitives'], ['e', 'zorglub']))), ['c', 'e']);
});

test('N02 : une collection à un seul mode n’est pas un axe', () => {
  assert.deepEqual(cheminsEnConflit(collectionsSeules(axe('c', 'Zorglub'), axe('d', 'Primitives', 1)), renommer(['c', 'primitives'])), []);
  assert.deepEqual(cheminsEnConflit(collectionsSeules(axe('c', 'Zorglub', 1), axe('d', 'Primitives')), renommer(['c', 'primitives'])), []);
  assert.deepEqual(cheminsEnConflit(collectionsSeules(axe('c', 'Zorglub', 1), axe('d', 'Primitives', 1)), renommer(['c', 'primitives'])), []);
});

test('N02 : un inventaire qui ne porte pas les modes n’a aucun axe', () => {
  const doc = collectionsSeules({ id: 'c', nom: 'Zorglub' }, { id: 'd', nom: 'Primitives' });
  assert.deepEqual(cheminsEnConflit(doc, renommer(['c', 'primitives'])), []);
  assert.equal(axesDeLExport(doc.collections).size, 0);
});

test('N02 : une collection à un seul mode que des extensions locales étendent est un axe', () => {
  const doc = collectionsSeules(axe('b', 'Brand', 1), etendue('e', 'Brand dark', 'b'), axe('d', 'Zorglub'));
  assert.deepEqual(cheminsEnConflit(doc, renommer(['d', 'brand'])), [{ id: 'd', motif: 'meme-axe', apres: 'brand', autre: 'Brand' }]);
  const sansExtension = collectionsSeules(axe('b', 'Brand', 1), axe('d', 'Zorglub'));
  assert.deepEqual(cheminsEnConflit(sansExtension, renommer(['d', 'brand'])), []);
});

test('N02 : une collection étendue n’est pas un axe, et une extension dont la racine est absente du document ne fait d’aucune collection un axe', () => {
  const doc = collectionsSeules(axe('b', 'Brand'), etendue('e', 'Brand dark', 'b'), axe('d', 'Zorglub'));
  assert.deepEqual(cheminsEnConflit(doc, renommer(['e', 'zorglub'])), [], 'renommer une extension ne change aucune clé d’axe');
  assert.deepEqual(cheminsEnConflit(doc, renommer(['d', 'brand dark'])), [], 'une extension n’a pas de clé d’axe à partager');
  const distante = collectionsSeules(axe('d', 'Zorglub', 1), etendue('e', 'Brand dark', 'ailleurs'), axe('b', 'Brand', 1));
  assert.equal(axesDeLExport(distante.collections).has('b'), false, 'seule une extension locale désigne une racine');
});

test('N02 : le nom que l’export réserve aux extensions d’un axe est un conflit nouveau, sans le perdre pour lui-même', () => {
  const doc = collectionsSeules(axe('b', 'Brand'), etendue('e', 'Brand dark', 'b'), axe('d', 'Zorglub'));
  assert.deepEqual(cheminsEnConflit(doc, renommer(['d', 'Brand Extensions'])), [
    { id: 'd', motif: 'axe-et-extensions', apres: 'Brand', autre: 'Brand Extensions' },
  ]);
  const inverse = collectionsSeules(axe('b', 'Zorglub'), etendue('e', 'Brand dark', 'b'), axe('d', 'Brand extensions'));
  assert.deepEqual(cheminsEnConflit(inverse, renommer(['b', 'Brand'])), [
    { id: 'b', motif: 'axe-et-extensions', apres: 'Brand', autre: 'Brand extensions' },
  ], 'renommer la collection étendue crée le même conflit');
  const sansExtension = collectionsSeules(axe('b', 'Brand'), axe('d', 'Zorglub'));
  assert.deepEqual(cheminsEnConflit(sansExtension, renommer(['d', 'Brand Extensions'])), []);
  const dejaLa = collectionsSeules(axe('b', 'Brand'), etendue('e', 'Brand dark', 'b'), axe('d', 'Brand extensions'));
  assert.deepEqual(cheminsEnConflit(dejaLa, renommer(['d', 'BRAND EXTENSIONS'])), [], 'le conflit existait avant le renommage');
});

test('N02 : axesDeLExport rend les axes retenus et ceux qui perdent leurs extensions', () => {
  const doc = collectionsSeules(axe('b', 'Brand'), etendue('e', 'Brand dark', 'b'), axe('d', 'Brand extensions'), axe('p', 'primitives'), axe('q', 'Primitives'), axe('v', '$'), axe('s', 'Seul', 1));
  assert.deepEqual([...axesDeLExport(doc.collections)], [
    ['b', { cle: 'brand', extensions: false }],
    ['d', { cle: 'brand-extensions', extensions: false }],
  ]);
  const libre = collectionsSeules(axe('b', 'Brand'), etendue('e', 'Brand dark', 'b'));
  assert.deepEqual([...axesDeLExport(libre.collections)], [['b', { cle: 'brand', extensions: true }]]);
});

test('N02 : inventairePublie reporte les modes, l’extension et la racine, sous l’identifiant du document', () => {
  const lectures = inventaireDeLectures(
    [
      { id: 'b', name: 'Brand', remote: false, modes: [{}, {}] },
      { id: 'e', name: 'Brand dark', remote: false, modes: [{}], isExtension: true, rootVariableCollectionId: 'b' },
      { id: 'p', name: 'Plain', remote: false },
    ],
    [],
    { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined },
  );
  assert.deepEqual(inventairePublie(lectures, (entree) => `doc:${entree.cible.collectionId}`).collections, [
    { id: 'doc:b', nom: 'Brand', nombreDeModes: 2 },
    { id: 'doc:e', nom: 'Brand dark', nombreDeModes: 1, extension: true, racine: 'doc:b' },
    { id: 'doc:p', nom: 'Plain' },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(lectures)), lectures, 'l’inventaire reste sérialisable');
});

// Les parcours de l'audit, dans la session

type Collections = readonly (readonly [id: string, nom: string])[];
function session(collections: Collections, variables: readonly Spec[]) {
  const stock = new Map<string, string>();
  const messages: PluginMessage[] = [];
  const lecture: PortDeLecture = {
    collections: async () => collections.map(([id, name]) => ({ id, name, remote: false })),
    variables: async () => variables.map(([id, name, variableCollectionId = collections[0][0]]) => ({ id, name, variableCollectionId, remote: false })),
    cibleAlias: () => undefined,
    protegee: () => false,
    palette: () => undefined,
  };
  const regles: PortDeRegles = {
    cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { stock.set(cle, texte); }, effacer: (cle) => { stock.delete(cle); },
  };
  const creee = creerSession({
    port: { lecture, ecriture: { ouvrir: async () => { throw new Error('pas d\'écriture'); } }, regles },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
  });
  let numero = 0;
  const envoyer = async (demande: object) => { messages.length = 0; await creee.recevoir({ ...demande, demande: ++numero } as DemandeArchitect); };
  const bilan = () => {
    const message = messages.find((candidat) => candidat.type === 'bilan');
    assert.ok(message && message.type === 'bilan', `un bilan était attendu, reçu : ${messages.map((m) => m.type).join(',')}`);
    return message.bilan;
  };
  const geste = (g: GesteSurLesRegles) => envoyer({ type: 'regle', geste: g });
  return { envoyer, bilan, geste, messages };
}
const INCHANGEE = { casse: 'inchangee', separateur: 'inchange' } as const;
const ecritureInchangee: GesteSurLesRegles = { type: 'ecriture', ecriture: { groupes: INCHANGEE, variables: INCHANGEE } };

test('AC1 : bg/primary à côté de Background/primary est bloqué avec le motif meme-token', async () => {
  const s = session([['c', 'components']], [['v1', 'bg/primary'], ['v2', 'Background/primary']]);
  await s.envoyer({ type: 'analyser' });
  await s.geste(ecritureInchangee);
  await s.geste({ type: 'remplacer-par', terme: 'bg', par: 'background' });
  const bilan = s.bilan();
  assert.deepEqual(bilan.bloques, [{
    avant: 'bg/primary', apres: 'background/primary', collection: 'components',
    chemin: { motif: 'meme-token', apres: 'components/background/primary', autre: 'components/Background/primary' },
  }]);
  assert.equal(bilan.groupes.some((groupe) => groupe.regle.sorte === 'terme'), false, 'plus aucun renommage de terme');
});

test('AC2 : colors renommé color à côté de color/primary est bloqué avec le motif token-et-groupe', async () => {
  const s = session([['c', 'components']], [['v1', 'colors'], ['v2', 'color/primary']]);
  await s.envoyer({ type: 'analyser' });
  await s.geste(ecritureInchangee);
  await s.geste({ type: 'remplacer-par', terme: 'colors', par: 'color' });
  assert.deepEqual(s.bilan().bloques, [{
    avant: 'colors', apres: 'color', collection: 'components',
    chemin: { motif: 'token-et-groupe', apres: 'components/color', autre: 'components/color/primary' },
  }]);
});

test('AI10 : ink renommé paint à côté de paint/detail est bloqué', async () => {
  const s = session([['c', 'components']], [['v1', 'ink'], ['v2', 'paint/detail']]);
  await s.envoyer({ type: 'analyser' });
  await s.geste(ecritureInchangee);
  await s.geste({ type: 'remplacer-par', terme: 'ink', par: 'paint' });
  const [bloque] = s.bilan().bloques;
  assert.equal(bloque?.avant, 'ink');
  assert.deepEqual(bloque?.chemin, { motif: 'token-et-groupe', apres: 'components/paint', autre: 'components/paint/detail' });
});

test('AI10 : une collection renommée theme à côté de ses variables theme/foo est bloquée', async () => {
  const s = session([['c', 'Colors']], [['v1', 'foo'], ['v2', 'theme/foo']]);
  await s.envoyer({ type: 'analyser' });
  await s.geste(ecritureInchangee);
  const question = s.bilan().questions.find((q) => q.type === 'collection');
  assert.ok(question);
  await s.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'theme' } });
  const bilan = s.bilan();
  assert.deepEqual(bilan.bloques, [{
    avant: 'Colors', apres: 'theme', collection: '',
    chemin: { motif: 'meme-token', apres: 'theme/foo', autre: 'theme/theme/foo' },
  }]);
  assert.equal(bilan.groupes.some((groupe) => groupe.regle.sorte === 'collection'), false);
});

test('AI10 : une collection renommée theme à côté d\'une collection Theme qui a les mêmes noms est bloquée', async () => {
  const s = session([['t', 'Theme'], ['c', 'Colors']], [['v1', 'foo', 't'], ['v2', 'foo', 'c'], ['v3', 'bar', 'c']]);
  await s.envoyer({ type: 'analyser' });
  await s.geste(ecritureInchangee);
  await s.envoyer({ type: 'configurer', collectionsExclues: ['t'] });
  const question = s.bilan().questions.find((q) => q.type === 'collection' && q.nom === 'Colors');
  assert.ok(question);
  await s.envoyer({ type: 'repondre', question: question.cle, reponse: { type: 'collection', cible: 'theme' } });
  assert.deepEqual(s.bilan().bloques, [{
    avant: 'Colors', apres: 'theme', collection: '',
    chemin: { motif: 'meme-token', apres: 'theme/foo', autre: 'Theme/foo' },
  }]);
});

test('un renommage sans conflit de chemin reste proposé', async () => {
  const s = session([['c', 'components']], [['v1', 'bg/primary'], ['v2', 'Background/secondary']]);
  await s.envoyer({ type: 'analyser' });
  await s.geste(ecritureInchangee);
  await s.geste({ type: 'remplacer-par', terme: 'bg', par: 'background' });
  const bilan = s.bilan();
  assert.deepEqual(bilan.bloques, []);
  assert.equal(bilan.groupes.some((groupe) => groupe.regle.sorte === 'terme'), true);
});

test('les deux textes de l’écran nomment les deux variables', () => {
  assert.equal(TEXTES.memeToken('components/a', 'components/A'), '`components/a` et `components/A` donneraient le même token dans tokens.json : renommez l’une des deux dans Figma.');
  assert.equal(TEXTES.tokenEtGroupe('components/color', 'components/color/primary'),
    '`components/color` serait à la fois un token et le groupe de `components/color/primary` dans tokens.json : renommez l’une des deux dans Figma.');
});

test('N02 : les textes des axes disent la conséquence à l’export et nomment les deux collections', () => {
  assert.equal(TEXTES.memeAxe('primitives', 'Primitives'),
    '`primitives` et `Primitives` donneraient le même nom dans l’export des tokens : les modes de ces deux collections ne pourraient plus être générés. Gardez un nom différent pour l’une des deux.');
  assert.equal(TEXTES.axeEtExtensions('Brand', 'Brand extensions'),
    '`Brand extensions` aurait le nom que l’export des tokens réserve aux collections étendues de `Brand` : les extensions de `Brand` ne pourraient plus être générées. Gardez un nom différent pour l’une des deux.');
});
