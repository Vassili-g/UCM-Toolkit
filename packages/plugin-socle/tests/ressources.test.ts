/** La mémoire des variables et des collections d'une demande : une lecture par identifiant, des refus rangés en faits. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerMemoireDeRessources, type LecturesDeRessources } from '../src/composant/analyse/ressources';
import { VariableNameResolver } from '../src/composant/variables';

type Brut = Record<string, unknown>;

/** Des lectures sur des objets fabriqués, qui notent chaque appel natif. */
function monterLesLectures(variables: Record<string, Brut | Error | null>, collections: Record<string, Brut | Error | null>) {
  const appels: string[] = [];
  const lire = (nom: string, table: Record<string, Brut | Error | null>) => async (id: string) => {
    appels.push(`${nom}(${id})`);
    await Promise.resolve();
    const lue = table[id] ?? null;
    if (lue instanceof Error) throw lue;
    return lue;
  };
  const lectures: LecturesDeRessources = {
    getVariableByIdAsync: lire('variable', variables),
    getVariableCollectionByIdAsync: lire('collection', collections),
  };
  return { appels, lectures };
}

const variable = (id: string, name: string, collection: string, champs: Brut = {}): Brut => ({ id, key: `cle-${id}`, name, variableCollectionId: collection, remote: false, ...champs });

test('deux demandes simultanées pour une même variable ne font qu’un appel natif, refus compris', async () => {
  const { appels, lectures } = monterLesLectures({ a: variable('a', 'couleur/fond', 'c'), cassee: new Error('refus de Figma') }, {});
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  const [un, deux, trois, quatre] = await Promise.all([memoire.variable('a'), memoire.variable('a'), memoire.variable('cassee'), memoire.variable('cassee')]);
  assert.equal(un, deux);
  assert.equal(trois, quatre);
  assert.deepEqual(appels, ['variable(a)', 'variable(cassee)']);
  assert.deepEqual(trois.etat, { etat: 'refuse', raison: 'leve', message: 'refus de Figma' });
});

test('une variable rendue par null est introuvable, et la provenance dit d’où vient la ressource', async () => {
  const { lectures } = monterLesLectures({ locale: variable('locale', 'a', 'c'), distante: variable('distante', 'b', 'c', { remote: true }), sans: variable('sans', 'c', 'c', { remote: undefined }) }, {});
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  const absente = await memoire.variable('absente');
  assert.deepEqual(absente.etat, { etat: 'refuse', raison: 'introuvable' });
  assert.equal(absente.provenance.origine, 'inconnue');
  assert.deepEqual((await memoire.variable('locale')).provenance, { appel: { appel: 'getVariableByIdAsync', id: 'locale' }, origine: 'locale' });
  assert.equal((await memoire.variable('distante')).provenance.origine, 'distante');
  assert.deepEqual((await memoire.variable('sans')).etat, {
    etat: 'acquis',
    valeur: {
      key: { etat: 'acquis', valeur: 'cle-sans' },
      name: { etat: 'acquis', valeur: 'c' },
      variableCollectionId: { etat: 'acquis', valeur: 'c' },
      remote: { etat: 'refuse', raison: 'absent' },
    },
  });
});

test('deux variables de même nom et de même clé dans deux collections restent deux faits', async () => {
  const { appels, lectures } = monterLesLectures({
    x1: variable('x1', 'couleur/fond', 'c1', { key: 'doublon' }),
    x2: variable('x2', 'couleur/fond', 'c2', { key: 'doublon' }),
  }, {});
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  const [un, deux] = await Promise.all([memoire.variable('x1'), memoire.variable('x2')]);
  assert.notEqual(un, deux);
  assert.deepEqual([un.id, deux.id], ['x1', 'x2']);
  const collections = [un, deux].map((fait) => (fait.etat.etat === 'acquis' ? fait.etat.valeur.variableCollectionId : null));
  assert.deepEqual(collections, [{ etat: 'acquis', valeur: 'c1' }, { etat: 'acquis', valeur: 'c2' }]);
  assert.deepEqual(appels, ['variable(x1)', 'variable(x2)']);
});

test('une variable dont la valeur est un alias ne déclenche aucune lecture de l’alias ni de ses valeurs', async () => {
  let valeursLues = 0;
  const alias = Object.defineProperty(variable('a', 'alias', 'c'), 'valuesByMode', { get() { valeursLues += 1; return { m: { type: 'VARIABLE_ALIAS', id: 'a' } }; } });
  const { appels, lectures } = monterLesLectures({ a: alias }, {});
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  assert.equal((await memoire.variable('a')).etat.etat, 'acquis');
  assert.equal(valeursLues, 0);
  assert.deepEqual(appels, ['variable(a)']);
});

test('une ressource refusée dans une demande est lisible dans la suivante', async () => {
  const etat = { disponible: false };
  const lectures: LecturesDeRessources = {
    getVariableByIdAsync: async (id) => {
      if (!etat.disponible) throw new Error('bibliothèque indisponible');
      return variable(id, 'couleur/fond', 'c');
    },
    getVariableCollectionByIdAsync: async () => (etat.disponible ? { name: 'Composants', modes: [] } : null),
  };
  const premiere = creerMemoireDeRessources({ lectures: () => lectures });
  assert.equal((await premiere.variable('v')).etat.etat, 'refuse');
  assert.equal((await premiere.collection('c')).etat.etat, 'refuse');
  etat.disponible = true;
  assert.equal((await premiere.variable('v')).etat.etat, 'refuse', 'la demande en cours garde son refus');
  const seconde = creerMemoireDeRessources({ lectures: () => lectures });
  assert.equal((await seconde.variable('v')).etat.etat, 'acquis');
  assert.equal((await seconde.collection('c')).etat.etat, 'acquis');
});

test('une erreur que le lecteur déclare à propager remonte au lieu de devenir un refus', async () => {
  class Annulee extends Error {}
  const { lectures } = monterLesLectures({ a: new Annulee('stop') }, {});
  const memoire = creerMemoireDeRessources({ lectures: () => lectures, propager: (erreur) => erreur instanceof Annulee });
  await assert.rejects(memoire.variable('a'), Annulee);
});

test('les modes d’une collection se copient avec une cession par mode, et une liste de forme inattendue est mixte', async () => {
  const modes = Array.from({ length: 5 }, (_, rang) => ({ modeId: `m${rang}`, name: `Mode ${rang}`, ...(rang === 1 ? { parentModeId: 'm0' } : {}) }));
  const { lectures } = monterLesLectures({}, { c: { name: 'Composants', remote: true, modes }, forme: { name: 'x', modes: 'pas une liste' } });
  let cessions = 0;
  const cooperation = { verifier() {}, cederSiBesoin() { cessions += 1; }, doitCeder: () => false, restantMs: () => Infinity };
  const memoire = creerMemoireDeRessources({ lectures: () => lectures, cooperation });
  const fait = await memoire.collection('c');
  assert.equal(cessions, 5);
  assert.equal(fait.provenance.origine, 'distante');
  assert.deepEqual(fait.etat.etat === 'acquis' ? fait.etat.valeur.modes : null, { etat: 'acquis', valeur: modes });
  const forme = await memoire.collection('forme');
  assert.deepEqual(forme.etat.etat === 'acquis' ? forme.etat.valeur.modes : null, { etat: 'mixte' });
});

test('le résolveur du moteur lit une collection une fois pour deux variables, et un refus donne null comme avant', async () => {
  const appels: string[] = [];
  const precedent = (globalThis as { figma?: unknown }).figma;
  const etat = { collectionLisible: false };
  (globalThis as { figma?: unknown }).figma = {
    variables: {
      getVariableByIdAsync: async (id: string) => {
        appels.push(`variable(${id})`);
        return id === 'perdue' ? null : { name: id === 'v1' ? 'fond' : 'texte', variableCollectionId: 'c' };
      },
      getVariableCollectionByIdAsync: async (id: string) => {
        appels.push(`collection(${id})`);
        return etat.collectionLisible ? { name: 'Composants' } : null;
      },
    },
  };
  try {
    const refusant = new VariableNameResolver();
    assert.deepEqual(await Promise.all([refusant.resolveById('v1'), refusant.resolveById('v2')]), [null, null]);
    assert.deepEqual(appels.filter((appel) => appel.startsWith('collection')), ['collection(c)']);
    etat.collectionLisible = true;
    appels.length = 0;
    const suivant = new VariableNameResolver();
    const noms = await Promise.all([suivant.resolveById('v1'), suivant.resolveById('v2'), suivant.resolveById('v1')]);
    assert.equal(noms[0], noms[2]);
    assert.equal(noms[0], 'composants.fond');
    assert.deepEqual(appels, ['variable(v1)', 'variable(v2)', 'collection(c)']);
    assert.equal(await suivant.resolveById('perdue'), null);
  } finally {
    (globalThis as { figma?: unknown }).figma = precedent;
  }
});

test('un résolveur qui reçoit la mémoire de la demande ne relit pas ce qu’un autre lecteur y a lu, et la demande suivante relit', async () => {
  const { appels, lectures } = monterLesLectures({ v1: variable('v1', 'fond', 'c') }, { c: { id: 'c', name: 'Composants', remote: false, modes: [] } });
  const demande = () => creerMemoireDeRessources({ lectures: () => lectures, champsDeVariable: ['key', 'name', 'variableCollectionId'], champsDeCollection: ['name', 'modes'] });
  const partagee = demande();
  // Le relevé de la demande a lu la variable et sa collection avant le moteur.
  await partagee.variable('v1');
  await partagee.collection('c');
  const moteur = new VariableNameResolver({ ressources: partagee });
  assert.equal(await moteur.resolveById('v1'), 'composants.fond');
  assert.deepEqual(appels, ['variable(v1)', 'collection(c)'], 'le résolveur n’ajoute aucun appel');
  const suivante = new VariableNameResolver({ ressources: demande() });
  assert.equal(await suivante.resolveById('v1'), 'composants.fond');
  assert.deepEqual(appels, ['variable(v1)', 'collection(c)', 'variable(v1)', 'collection(c)'], 'une autre demande relit');
});

test('un refus rangé par un lecteur de la demande reste un refus pour le résolveur', async () => {
  const { appels, lectures } = monterLesLectures({ perdue: new Error('refus de Figma') }, {});
  const partagee = creerMemoireDeRessources({ lectures: () => lectures });
  assert.equal((await partagee.variable('perdue')).etat.etat, 'refuse');
  assert.equal(await new VariableNameResolver({ ressources: partagee }).resolveById('perdue'), null);
  assert.deepEqual(appels, ['variable(perdue)']);
});

test('la lecture d’un maître se fait une fois par instance, avec l’appel et le signal du lecteur qui la demande', async () => {
  const appels: string[] = [];
  const maitre = { id: 'm', type: 'COMPONENT' };
  const instance = { id: 'i', getMainComponentAsync: async () => { appels.push('natif'); return maitre; } };
  const memoire = creerMemoireDeRessources({ lectures: () => ({ getVariableByIdAsync: async () => null, getVariableCollectionByIdAsync: async () => null }) });
  let reutilisations = 0;
  const premier = await memoire.maitre(instance, { lire: () => { appels.push('mesure'); return instance.getMainComponentAsync(); }, reutilise: () => { reutilisations += 1; } });
  const second = await memoire.maitre(instance, { lire: () => { appels.push('autre'); return undefined; }, reutilise: () => { reutilisations += 1; } });
  const sansOptions = await memoire.maitre(instance);
  assert.equal(premier.etat === 'lu' ? premier.natif : null, maitre);
  assert.equal(second, premier);
  assert.equal(sansOptions, premier);
  assert.deepEqual(appels, ['mesure', 'natif']);
  assert.equal(reutilisations, 1);
});

test('attendreLesImports fait relire après eux un refus rangé, fait attendre toute lecture neuve, et garde les ressources lues', async () => {
  const lisible = { importee: false };
  const appels: string[] = [];
  const lectures: LecturesDeRessources = {
    getVariableByIdAsync: async (id) => { appels.push(`variable(${id})`); return id === 'bonne' || lisible.importee ? variable(id, id, 'c') : null; },
    getVariableCollectionByIdAsync: async (id) => { appels.push(`collection(${id})`); return lisible.importee ? { id, name: 'Lib', remote: true, modes: [] } : null; },
  };
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  assert.equal((await memoire.variable('tard')).etat.etat, 'refuse');
  assert.equal((await memoire.collection('lib')).etat.etat, 'refuse');
  await memoire.variable('bonne');
  let finir!: () => void;
  memoire.attendreLesImports(new Promise<void>((resolve) => { finir = resolve; }));
  const pendant = [memoire.variable('tard'), memoire.collection('lib'), memoire.variable('neuve')];
  const lueAvant = await Promise.race([Promise.all(pendant), new Promise<string>((resolve) => setTimeout(() => resolve('attend'), 20))]);
  assert.equal(lueAvant, 'attend', 'tant que les imports courent, une lecture qui n’a pas eu lieu ne part pas');
  assert.deepEqual(appels, ['variable(tard)', 'collection(lib)', 'variable(bonne)']);
  assert.equal((await memoire.variable('bonne')).etat.etat, 'acquis', 'une ressource déjà acquise se rend sans attendre');
  lisible.importee = true;
  finir();
  const [tard, lib, neuve] = await Promise.all(pendant);
  assert.deepEqual([tard.etat.etat, lib.etat.etat, neuve.etat.etat], ['acquis', 'acquis', 'acquis']);
  await memoire.variable('bonne');
  await memoire.variable('tard');
  assert.deepEqual(appels, ['variable(tard)', 'collection(lib)', 'variable(bonne)', 'variable(tard)', 'collection(lib)', 'variable(neuve)']);
});

test('un refus rendu après attendreLesImports par une lecture partie avant se relit après les imports, comme un refus rangé', async () => {
  const lisible = { importee: false };
  const appels: string[] = [];
  let rendre!: () => void;
  const enVol = new Promise<void>((resolve) => { rendre = resolve; });
  const lectures: LecturesDeRessources = {
    getVariableByIdAsync: async (id) => {
      appels.push(`variable(${id})`);
      // La première lecture part avant les imports et répond après leur début : Figma l'a servie sans eux.
      if (appels.length === 1) {
        await enVol;
        return null;
      }
      return lisible.importee ? variable(id, id, 'c') : null;
    },
    getVariableCollectionByIdAsync: async () => null,
  };
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  const partieAvant = memoire.variable('tard');
  await new Promise((resolve) => setTimeout(resolve, 0));
  let finir!: () => void;
  memoire.attendreLesImports(new Promise<void>((resolve) => { finir = resolve; }));
  rendre();
  await new Promise((resolve) => setTimeout(resolve, 0));
  lisible.importee = true;
  finir();
  assert.equal((await partieAvant).etat.etat, 'acquis', 'la lecture partie avant les imports les attend pour se refaire');
  assert.equal((await memoire.variable('tard')).etat.etat, 'acquis', 'le lecteur suivant, le moteur, lit ce qu’Actualiser lirait');
  assert.deepEqual(appels, ['variable(tard)', 'variable(tard)']);
});

test('sans attendreLesImports pendant la lecture, un refus reste rangé pour toute la demande', async () => {
  const appels: string[] = [];
  const lectures: LecturesDeRessources = { getVariableByIdAsync: async (id) => { appels.push(id); return null; }, getVariableCollectionByIdAsync: async () => null };
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  assert.equal((await memoire.variable('x')).etat.etat, 'refuse');
  assert.equal((await memoire.variable('x')).etat.etat, 'refuse');
  assert.deepEqual(appels, ['x']);
});

test('un rejet de la fin des imports lève l’attente comme une fin normale', async () => {
  const lectures: LecturesDeRessources = { getVariableByIdAsync: async (id) => variable(id, id, 'c'), getVariableCollectionByIdAsync: async () => null };
  const memoire = creerMemoireDeRessources({ lectures: () => lectures });
  memoire.attendreLesImports(Promise.reject(new Error('catalogue annulé')));
  assert.equal((await memoire.variable('a')).etat.etat, 'acquis');
});
