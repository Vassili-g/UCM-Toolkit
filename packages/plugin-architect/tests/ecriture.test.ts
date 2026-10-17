/** Les doubles n'exposent que les écritures permises et simulent les effets d'un renommage d'axe. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { appliquerNoms, creerPortEcriture, type SessionEcriture } from '../src/ecriture';
import { lireInventaire, nomDePropriete, type ComposantLu, type PortDeLecture } from '../src/lecture';
import { lireChoix, estConventions } from '../src/conventions';
import { CATEGORIES_DE_NOM, detecterLesConventions, normaliserLesNoms, type Convention, type ConventionsParCategorie } from '@ucm-kit/core/referentiel';
import type { Inventaire } from '../src/lecture';

const convention = { casse: 'minuscules', separateur: 'tiret' } as const;
const choix = { collections: convention, variables: convention, proprietes: convention, valeurs: convention };
/** Le calcul que `appliquerNoms` reçoit : conventions fournies ou détectées, cibles gelées occupant leur nom. */
function analyserInventaire(inventaire: Inventaire, preferences: ConventionsParCategorie = {}, termesUcm = false) {
  const noms = inventaire.entrees.map((entree) => entree.nom);
  const detection = detecterLesConventions(noms);
  const inchangee: Convention = { casse: 'inchangee', separateur: 'inchange' };
  const conventions = Object.fromEntries(CATEGORIES_DE_NOM.map((categorie) => [categorie, preferences[categorie] ?? detection[categorie].dominante ?? inchangee]));
  return { inventaire, conventions, termesUcm, normalisation: normaliserLesNoms(noms, conventions, {
    termesUcm,
    nonRenommables: inventaire.entrees.filter((entree) => !entree.renommable).map((entree) => entree.nom.id),
  }) };
}
const copier = <T>(valeur: T): T => JSON.parse(JSON.stringify(valeur));
function banc(noms = ['Brand Color', 'Text Color']) {
  const collections = [{ id: 'c', name: 'Brand Tokens', remote: false }];
  const variables = noms.map((name, rang) => ({ id: `v${rang}`, name, variableCollectionId: 'c', remote: false }));
  const composants: ComposantLu[] = [];
  const traces: string[] = [];
  let conventions = '';
  const idsEdites: string[] = [];
  const lecture: PortDeLecture = { collections: async () => copier(collections), variables: async () => copier(variables),
    pages: () => [{ id: 'page', name: 'Composants', charger: async () => {}, composants: () => copier(composants) }] };
  const session: SessionEcriture = {
    collection: (id) => collections.find((node) => node.id === id) ?? null,
    variable: (id) => variables.find((node) => node.id === id) ?? null,
    composant: (id) => {
      const node = composants.find((item) => item.id === id);
      if (!node) return null;
      return Object.assign(node, { parent: node.parentId ? { id: node.parentId } : null,
        editComponentProperty: (ancienId: string, { name }: { name: string }) => {
          idsEdites.push(ancienId);
          const definition = node.componentPropertyDefinitions[ancienId];
          assert.ok(definition);
          const nouvelId = name + (ancienId.match(/#[^#]+$/u)?.[0] ?? '');
          const definitions = { ...node.componentPropertyDefinitions, [nouvelId]: definition };
          delete definitions[ancienId];
          Object.assign(node, { componentPropertyDefinitions: definitions });
          if (definition.type === 'VARIANT') for (const enfant of composants.filter((item) => item.parentId === node.id)) {
            const paires = Object.entries(enfant.variantProperties ?? {}).map(([axe, valeur]) => [axe === nomDePropriete(ancienId) ? name : axe, valeur]);
            Object.assign(enfant, { variantProperties: Object.fromEntries(paires), name: paires.map(([axe, valeur]) => `${axe}=${valeur}`).join(', ') });
          }
          return nouvelId;
        } });
    },
    lireConventions: () => conventions,
    rangerConventions: (texte) => { traces.push('conventions'); conventions = texte; },
    commitUndo: () => traces.push('undo'),
  };
  const lire = () => lireInventaire(lecture, { pause: async () => {} });
  return { collections, variables, composants, traces, idsEdites, session, lecture, lire,
    setConventions: (texte: string) => { conventions = texte; } };
}
function avecVariants() {
  const b = banc([]);
  b.composants.push({ id: 'set', name: 'Button', remote: false, type: 'COMPONENT_SET', parentId: null,
    componentPropertyDefinitions: { 'State#1:2': { type: 'VARIANT' }, 'Size#1:3': { type: 'VARIANT' }, 'Label#1:4': { type: 'TEXT' } }, variantProperties: null });
  for (const [id, state, size] of [['a', 'Idle State', 'Small'], ['b', 'Idle State', 'Large'], ['c2', 'Hover State', 'Small']]) b.composants.push({
    id, name: `State=${state}, Size=${size}`, remote: false, type: 'COMPONENT', parentId: 'set', componentPropertyDefinitions: {}, variantProperties: { State: state, Size: size },
  });
  return b;
}

test('seuls les noms cochés sont écrits, puis la convention et un seul point d’annulation', async () => {
  const b = banc();
  const analyse = analyserInventaire(await b.lire(), choix);
  const id = analyse.normalisation.propositions.find((p) => p.categorie === 'variables')!.id;
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: [id], session: b.session, conventionsLues: '' });
  assert.equal(b.variables[0].name, 'brand-color');
  assert.equal(b.variables[1].name, 'Text Color');
  assert.equal(b.collections[0].name, 'Brand Tokens');
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual(resultat.renommages, [{ type: 'variable', id: 'v0', ancienNom: 'Brand Color', nouveauNom: 'brand-color' }]);
  assert.deepEqual(b.traces, ['conventions', 'undo']);
  assert.equal(lireChoix(b.session.lireConventions())?.version, 1);
});

test('un identifiant falsifié ou dupliqué refuse tout le lot sans écriture', async () => {
  const b = banc();
  const analyse = analyserInventaire(await b.lire(), choix);
  const id = analyse.normalisation.propositions[0].id;
  for (const ids of [[id, 'faux'], [id, id]]) {
    const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids, session: b.session, conventionsLues: '' });
    assert.equal(resultat.statut, 'refuse');
    assert.deepEqual(resultat.renommages, []);
  }
  assert.deepEqual(b.traces, []);
});

test('un nom modifié, supprimé ou devenu distant depuis l’aperçu est sauté', async () => {
  for (const changement of ['modifie', 'supprime', 'remote']) {
    const b = banc();
    const analyse = analyserInventaire(await b.lire(), choix);
    const id = analyse.normalisation.propositions.find((p) => p.categorie === 'variables')!.id;
    if (changement === 'modifie') b.variables[0].name = 'Travail utilisateur';
    if (changement === 'supprime') b.variables.shift();
    if (changement === 'remote') b.variables[0].remote = true;
    const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: [id], session: b.session, conventionsLues: '' });
    assert.equal(resultat.ignores[0].motif, 'fichier-modifie');
    assert.equal(resultat.renommages.length, 0);
    assert.deepEqual(b.traces, []);
  }
});

test('un occupant créé après l’aperçu bloque le nouveau nom', async () => {
  const b = banc(['Brand Color']);
  const analyse = analyserInventaire(await b.lire(), choix);
  const id = analyse.normalisation.propositions.find((p) => p.categorie === 'variables')!.id;
  b.variables.push({ id: 'nouveau', name: 'brand-color', remote: false, variableCollectionId: 'c' });
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: [id], session: b.session, conventionsLues: '' });
  assert.deepEqual(resultat.ignores, [{ id, motif: 'collision' }]);
  assert.equal(b.variables[0].name, 'Brand Color');
});

test('le moteur garde les propositions non cochées comme occupants', async () => {
  const b = banc();
  const analyse = analyserInventaire(await b.lire(), choix);
  const variables = analyse.normalisation.propositions.filter((p) => p.categorie === 'variables');
  assert.equal(variables.length, 2);
  b.variables[1].name = variables[0].nouveauNom;
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: [variables[0].id], session: b.session, conventionsLues: '' });
  assert.equal(resultat.renommages.length, 0);
  assert.equal(resultat.ignores[0].motif, 'collision');
  assert.equal(b.variables[1].name, 'brand-color');
});

test('axes et valeurs du même lot conservent les autres axes et les suffixes de propriétés', async () => {
  const b = avecVariants();
  const analyse = analyserInventaire(await b.lire(), choix);
  const ids = analyse.normalisation.propositions.filter((p) => p.categorie === 'proprietes' || (p.categorie === 'valeurs' && p.ancienNom === 'Idle State')).map((p) => p.id);
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids, session: b.session, conventionsLues: '' });
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual(Object.keys(b.composants[0].componentPropertyDefinitions), ['state#1:2', 'size#1:3', 'label#1:4']);
  assert.deepEqual(b.idsEdites, ['State#1:2', 'Size#1:3', 'Label#1:4']);
  assert.equal(b.composants[1].name, 'state=idle-state, size=Small');
  assert.equal(b.composants[2].name, 'state=idle-state, size=Large');
  assert.equal(b.composants[3].name, 'state=Hover State, size=Small');
  assert.equal(resultat.renommages.filter((r) => r.type === 'valeur').length, 2);
  assert.equal(resultat.renommages[0].nouvelId, 'state#1:2');
  assert.deepEqual(b.traces, ['conventions', 'undo']);
});

test('un nouveau variant retire le groupe complet de valeurs et son axe de la sélection', async () => {
  const b = avecVariants();
  const analyse = analyserInventaire(await b.lire(), choix);
  const ids = analyse.normalisation.propositions.filter((p) => p.categorie !== 'collections').map((p) => p.id);
  b.composants.push({ ...copier(b.composants[1]), id: 'nouveau' });
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids, session: b.session, conventionsLues: '' });
  assert.equal(b.composants[1].name, 'State=Idle State, Size=Small');
  assert.equal(b.composants.at(-1)!.name, 'State=Idle State, Size=Small');
  assert.equal(resultat.renommages.some((r) => r.type === 'valeur'), false);
  assert.equal(resultat.renommages.some((r) => r.nouveauNom === 'state'), false);
});

test('une combinaison finale dupliquée ou une syntaxe ambiguë refuse les variants avant mutation', async () => {
  for (const cas of ['doublon', 'syntaxe']) {
    const b = avecVariants();
    if (cas === 'doublon') b.composants.push({ ...copier(b.composants[1]), id: 'doublon' });
    else Object.assign(b.composants[2], { variantProperties: { State: 'Idle State', Size: 'a=b,c' } });
    const analyse = analyserInventaire(await b.lire(), choix);
    const ids = analyse.normalisation.propositions.filter((p) => p.categorie === 'valeurs').map((p) => p.id);
    const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids, session: b.session, conventionsLues: '' });
    assert.equal(resultat.renommages.length, 0);
    assert.deepEqual(b.traces, []);
  }
});

test('une convention concurrente refuse toute écriture et garde sa valeur', async () => {
  const b = banc();
  const analyse = analyserInventaire(await b.lire(), choix);
  b.setConventions('concurrente');
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: analyse.normalisation.propositions.map((p) => p.id), session: b.session, conventionsLues: '' });
  assert.equal(resultat.statut, 'refuse');
  assert.equal(b.session.lireConventions(), 'concurrente');
  assert.deepEqual(b.traces, []);
});

test('une panne après une écriture rend son relevé exact et un seul point d’annulation', async () => {
  const b = banc();
  const analyse = analyserInventaire(await b.lire(), choix);
  const ancienneCollection = b.collections[0].name;
  // La panne survient dans le setter après le contrôle de tous les objets.
  Object.defineProperty(b.variables[0], 'name', { get: () => 'Brand Color', set: () => { throw new Error('panne'); } });
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: analyse.normalisation.propositions.map((p) => p.id), session: b.session, conventionsLues: '' });
  assert.equal(resultat.statut, 'partiel');
  assert.equal(resultat.erreur, true);
  assert.deepEqual(resultat.renommages, [{ type: 'collection', id: 'c', ancienNom: ancienneCollection, nouveauNom: 'brand-tokens' }]);
  assert.equal(resultat.ignores.some((r) => r.id === analyse.normalisation.propositions[0].id), false);
  assert.deepEqual(b.traces, ['undo']);
  assert.equal(resultat.annulationPossible, true);
});

test('un setter qui écrit puis lève reste présent dans le relevé partiel', async () => {
  const b = banc(['Brand Color']);
  const analyse = analyserInventaire(await b.lire(), choix);
  let nom = b.variables[0].name;
  Object.defineProperty(b.variables[0], 'name', { get: () => nom, set: (valeur) => { nom = valeur; throw new Error('panne après écriture'); } });
  const id = analyse.normalisation.propositions.find((p) => p.categorie === 'variables')!.id;
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: [id], session: b.session, conventionsLues: '' });
  assert.equal(resultat.statut, 'partiel');
  assert.equal(resultat.renommages[0].nouveauNom, 'brand-color');
  assert.equal(resultat.ignores.length, 0);
  assert.deepEqual(b.traces, ['undo']);
});

test('une panne au milieu d’un groupe de valeurs ne relève que le variant écrit', async () => {
  const b = avecVariants();
  const analyse = analyserInventaire(await b.lire(), choix);
  const id = analyse.normalisation.propositions.find((p) => p.categorie === 'valeurs' && p.ancienNom === 'Idle State')!.id;
  const nomRefuse = b.composants[2].name;
  Object.defineProperty(b.composants[2], 'name', { get: () => nomRefuse, set: () => { throw new Error('refus'); } });
  const resultat = appliquerNoms({ analyse, inventaire: await b.lire(), ids: [id], session: b.session, conventionsLues: '' });
  assert.equal(resultat.statut, 'partiel');
  assert.deepEqual(resultat.renommages, [{ type: 'valeur', id: 'a', ownerId: 'set', ancienNom: 'State=Idle State, Size=Small', nouveauNom: 'State=idle-state, Size=Small' }]);
  assert.deepEqual(resultat.ignores, [{ id, motif: 'ecriture-interrompue' }]);
  assert.deepEqual(b.traces, ['undo']);
});

test('les records de l’inventaire restent des copies après modification du port', async () => {
  const b = avecVariants();
  const lecture = { ...b.lecture, pages: () => [{ id: 'p', name: 'Page', charger: async () => {}, composants: () => b.composants }] };
  const inventaire = await lireInventaire(lecture, { pause: async () => {} });
  Object.assign(b.composants[1].variantProperties!, { State: 'Modifie' });
  Object.assign(b.composants[0].componentPropertyDefinitions['State#1:2'], { type: 'TEXT' });
  assert.equal(inventaire.composants![1].variantProperties!.State, 'Idle State');
  assert.equal(inventaire.composants![0].componentPropertyDefinitions['State#1:2'].type, 'VARIANT');
});

test('le contexte lisible associe chaque nom à sa collection ou à son composant', async () => {
  const b = avecVariants();
  b.variables.push({ id: 'couleur', name: 'Brand Color', remote: false, variableCollectionId: 'c' });
  const inventaire = await b.lire();
  assert.deepEqual(inventaire.entrees.find((e) => e.cible.type === 'variable')!.contexte, { collection: 'Brand Tokens' });
  assert.deepEqual(inventaire.entrees.find((e) => e.cible.type === 'propriete')!.contexte, { composant: 'Button', page: 'Composants' });
  assert.deepEqual(inventaire.entrees.find((e) => e.cible.type === 'valeur')!.contexte, { composant: 'Button', page: 'Composants', axe: 'State' });
});

test('la validation de la convention suit les registres et refuse les versions inconnues', () => {
  assert.equal(estConventions({ variables: convention }), true);
  assert.equal(estConventions({ variables: { casse: 'inventee', separateur: 'tiret' } }), false);
  assert.equal(estConventions({ inconnue: convention }), false);
  assert.equal(lireChoix('{'), undefined);
  assert.equal(lireChoix(JSON.stringify({ version: 2, conventions: choix, termesUcm: false })), undefined);
});

test('l’adaptateur résout les composants par l’API asynchrone avant les écritures', async () => {
  const b = avecVariants();
  const inventaire = await b.lire();
  const api = { variables: { getLocalVariableCollectionsAsync: async () => b.collections, getLocalVariablesAsync: async () => b.variables },
    getNodeByIdAsync: async (id: string) => b.session.composant(id),
    root: { getSharedPluginData: (espace: string, cle: string) => { assert.equal(espace, 'ucm_architect'); assert.equal(cle, 'conventions'); return ''; },
      setSharedPluginData: (espace: string, cle: string, texte: string) => { assert.equal(espace, 'ucm_architect'); assert.equal(cle, 'conventions'); b.session.rangerConventions(texte); } },
    commitUndo: () => b.session.commitUndo(),
  };
  const session = await creerPortEcriture(api as unknown as PluginAPI).ouvrir(inventaire);
  assert.equal(session.composant('set')?.id, 'set');
  assert.equal(session.composant('absent'), null);
  assert.equal(session.lireConventions(), '');
  session.rangerConventions('convention');
  session.commitUndo();
  assert.deepEqual(b.traces, ['conventions', 'undo']);
});
