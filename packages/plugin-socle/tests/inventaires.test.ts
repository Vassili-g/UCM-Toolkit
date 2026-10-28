/** Les inventaires d'une demande : une lecture par demande et par inventaire, partagée entre ses lecteurs. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerInventairesDeLaDemande } from '../src/composant/analyse/inventaires';
import { abandonnerLaMesure, fermerLaMesure, ouvrirLaMesure } from '../src/composant/contract/mesure';

/** Une lecture native qui compte ses appels et rend une valeur par appel. */
function lecture<T>(valeur: T) {
  const etat = { appels: 0 };
  return { etat, lire: async () => { etat.appels += 1; return valeur; } };
}

test('le local se lit une fois par demande : les deux lecteurs reçoivent la même liste', async () => {
  const inventaires = creerInventairesDeLaDemande();
  const collections = lecture(['c1']);
  const variables = lecture(['v1', 'v2']);
  const [premieres, secondes] = await Promise.all([inventaires.variablesLocales(variables.lire), inventaires.variablesLocales(variables.lire)]);
  const apres = await inventaires.variablesLocales(variables.lire);
  assert.equal(variables.etat.appels, 1);
  assert.equal(premieres, secondes);
  assert.equal(secondes, apres);
  assert.deepEqual(await inventaires.collectionsLocales(collections.lire), ['c1']);
  await inventaires.collectionsLocales(collections.lire);
  assert.equal(collections.etat.appels, 1);
});

test('les collections et les variables locales sont deux lectures distinctes', async () => {
  const inventaires = creerInventairesDeLaDemande();
  const collections = lecture('collections');
  const variables = lecture('variables');
  assert.equal(await inventaires.collectionsLocales(collections.lire), 'collections');
  assert.equal(await inventaires.variablesLocales(variables.lire), 'variables');
  assert.deepEqual([collections.etat.appels, variables.etat.appels], [1, 1]);
});

test('le scan des règles se lit une fois par page et par composant', async () => {
  const inventaires = creerInventairesDeLaDemande();
  const scan = lecture({ conteneur: true });
  const page = { id: 'page-1' };
  const composant = { id: 'jeu' };
  const [a, b] = await Promise.all([inventaires.reglesDeLaPage(page, composant, scan.lire), inventaires.reglesDeLaPage(page, composant, scan.lire)]);
  assert.equal(a, b);
  assert.equal(scan.etat.appels, 1);
  await inventaires.reglesDeLaPage({ id: 'page-2' }, composant, scan.lire);
  await inventaires.reglesDeLaPage(page, { id: 'autre-jeu' }, scan.lire);
  assert.equal(scan.etat.appels, 3, 'une autre page ou un autre composant relit');
});

test('sans identifiant de page ou de composant, chaque lecteur lit', async () => {
  const inventaires = creerInventairesDeLaDemande();
  const scan = lecture('scan');
  await inventaires.reglesDeLaPage({}, { id: 'jeu' }, scan.lire);
  await inventaires.reglesDeLaPage({ id: 'page' }, {}, scan.lire);
  assert.equal(scan.etat.appels, 2);
});

test('les libraries se lisent une fois par demande', async () => {
  const inventaires = creerInventairesDeLaDemande();
  const libraries = lecture({ etat: 'lue' });
  const premiere = inventaires.libraries(libraries.lire);
  const seconde = inventaires.libraries(libraries.lire);
  assert.equal(await premiere, await seconde);
  assert.equal(libraries.etat.appels, 1);
});

test('un refus se partage aussi : le second lecteur reçoit le refus du premier, sans relire', async () => {
  const inventaires = creerInventairesDeLaDemande();
  let appels = 0;
  const refuser = async (): Promise<string> => { appels += 1; throw new Error('refusé'); };
  await assert.rejects(inventaires.variablesLocales(refuser), /refusé/);
  await assert.rejects(inventaires.variablesLocales(refuser), /refusé/);
  assert.equal(appels, 1);
});

test('chaque inventaire rend sa lecture sans l’emprunter à un autre', async () => {
  const inventaires = creerInventairesDeLaDemande();
  assert.equal(await inventaires.libraries(async () => 'libraries'), 'libraries');
  assert.equal(await inventaires.variablesLocales(async () => 'variables'), 'variables');
  assert.equal(await inventaires.reglesDeLaPage({ id: 'p' }, { id: 'c' }, async () => 'regles'), 'regles');
  assert.equal(await inventaires.collectionsLocales(async () => 'collections'), 'collections');
});

test('une nouvelle demande relit : rien ne survit à l’objet de la demande', async () => {
  const lectures = { appels: 0 };
  let contenu = ['avant'];
  const lire = async () => { lectures.appels += 1; return contenu; };
  const premiere = creerInventairesDeLaDemande();
  assert.deepEqual(await premiere.variablesLocales(lire), ['avant']);
  // Une écriture entre deux demandes change le fichier : la demande suivante lit l'état écrit.
  contenu = ['apres'];
  assert.deepEqual(await premiere.variablesLocales(lire), ['avant'], 'la demande en cours garde sa lecture');
  const seconde = creerInventairesDeLaDemande();
  assert.deepEqual(await seconde.variablesLocales(lire), ['apres']);
  assert.equal(lectures.appels, 2);
});

test('la trace compte les lectures reprises, et se tait hors d’une trace', async () => {
  const inventaires = creerInventairesDeLaDemande();
  const variables = lecture('v');
  await inventaires.variablesLocales(variables.lire);
  await inventaires.variablesLocales(variables.lire);
  ouvrirLaMesure();
  try {
    await inventaires.variablesLocales(variables.lire);
    await inventaires.variablesLocales(variables.lire);
    assert.equal(fermerLaMesure('')?.compteurs.inventairesReutilises, 2);
  } finally { abandonnerLaMesure(); }
});

test('les noms d’une page se lisent une fois par page et par demande, une page sans identifiant se relit', () => {
  const inventaires = creerInventairesDeLaDemande();
  const lectures: string[] = [];
  const noms = (page: string) => () => { lectures.push(page); return new Set([page]); };
  const premiere = inventaires.nomsDeLaPage({ id: 'p1' }, noms('p1'));
  assert.equal(inventaires.nomsDeLaPage({ id: 'p1' }, noms('p1')), premiere);
  inventaires.nomsDeLaPage({ id: 'p2' }, noms('p2'));
  inventaires.nomsDeLaPage({}, noms('sans'));
  inventaires.nomsDeLaPage({}, noms('sans'));
  assert.deepEqual(lectures, ['p1', 'p2', 'sans', 'sans']);
  const suivante = creerInventairesDeLaDemande();
  assert.notEqual(suivante.nomsDeLaPage({ id: 'p1' }, noms('p1')), premiere, 'une autre demande relit la page');
  assert.deepEqual(lectures, ['p1', 'p2', 'sans', 'sans', 'p1']);
});

test('une page dont la lecture lève lève pour tous les lecteurs de la demande, sans relire', () => {
  const inventaires = creerInventairesDeLaDemande();
  let lectures = 0;
  const lire = () => { lectures += 1; throw new Error('page illisible'); };
  assert.throws(() => inventaires.nomsDeLaPage({ id: 'p' }, lire), /page illisible/);
  assert.throws(() => inventaires.nomsDeLaPage({ id: 'p' }, lire), /page illisible/);
  assert.equal(lectures, 1);
});

test('la mémoire de ressources n’existe que pour une demande qui en donne les lectures, et ne survit pas à elle', async () => {
  assert.equal(creerInventairesDeLaDemande().ressources, undefined);
  const appels: string[] = [];
  const options = { lectures: () => ({ getVariableByIdAsync: async (id: string) => { appels.push(id); return { key: id, name: id, variableCollectionId: 'c' }; }, getVariableCollectionByIdAsync: async () => null }) };
  const premiere = creerInventairesDeLaDemande({ ressources: options });
  await premiere.ressources!.variable('v');
  await premiere.ressources!.variable('v');
  assert.deepEqual(appels, ['v']);
  await creerInventairesDeLaDemande({ ressources: options }).ressources!.variable('v');
  assert.deepEqual(appels, ['v', 'v'], 'la demande suivante relit');
});

test('un nœud se demande une fois par identifiant et par demande, refus compris ; la demande suivante le redemande', async () => {
  const appels: string[] = [];
  const lire = (id: string) => async () => {
    appels.push(id);
    if (id === 'I1;2') throw new Error('Nœud illisible');
    return { id };
  };
  const inventaires = creerInventairesDeLaDemande();
  const [premier, second] = await Promise.all([inventaires.noeudParIdentifiant('1:2', lire('1:2')), inventaires.noeudParIdentifiant('1:2', lire('1:2'))]);
  assert.equal(premier, second, 'deux lecteurs simultanés reçoivent le même nœud');
  await assert.rejects(inventaires.noeudParIdentifiant('I1;2', lire('I1;2')), /illisible/);
  await assert.rejects(inventaires.noeudParIdentifiant('I1;2', lire('I1;2')), /illisible/, 'le refus se partage sans relire');
  assert.deepEqual(appels, ['1:2', 'I1;2']);
  await creerInventairesDeLaDemande().noeudParIdentifiant('1:2', lire('1:2'));
  assert.deepEqual(appels, ['1:2', 'I1;2', '1:2']);
});
