/** Le banc simule les variables et collections locales de Figma : chaque affectation de nom est tracée, et une panne peut s'y glisser. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  annulerLeDernierRenommage, appliquerLesRenommages, creerPortEcriture,
  type ObjetModifiable, type PortDeRegles, type RenommageDemande, type SessionEcriture, type VariableModifiable,
} from '../src/ecriture';
import { relireInventaireAvantEcriture, type PortDeLecture } from '../src/lecture';
import { lireLesRegles, lireLeStockage } from '../src/regles';

const HEURE = '2026-10-17T10:00:00.000Z';

type SpecVariable = readonly [id: string, nom: string, collection?: string];
function banc(options: { variables?: readonly SpecVariable[]; collections?: readonly (readonly [string, string])[]; protegees?: readonly string[] } = {}) {
  const noms = new Map<string, string>();
  const ecritures: string[] = [];
  const traces: string[] = [];
  const stock = new Map<string, string>();
  const panne = { apres: Infinity, ecritPuisLeve: false };
  const protegees = [...(options.protegees ?? [])];
  const creer = <T extends object>(id: string, nom: string, extra: T) => {
    noms.set(id, nom);
    return {
      id, remote: false, ...extra,
      get name() { return noms.get(id)!; },
      set name(valeur: string) {
        if (ecritures.length >= panne.apres) throw new Error('panne');
        ecritures.push(`${id}=${valeur}`);
        noms.set(id, valeur);
        if (panne.ecritPuisLeve && ecritures.length === panne.apres) throw new Error('panne après écriture');
      },
    };
  };
  const collections = new Map<string, ObjetModifiable>();
  const variables = new Map<string, VariableModifiable>();
  for (const [id, nom] of options.collections ?? [['c', 'Brand']]) collections.set(id, creer(id, nom, {}));
  for (const [id, nom, collection = 'c'] of options.variables ?? []) variables.set(id, creer(id, nom, { variableCollectionId: collection }));
  const lecture: PortDeLecture = {
    collections: async () => [...collections.values()].map((objet) => ({ id: objet.id, name: objet.name, remote: false })),
    variables: async () => [...variables.values()].map((objet) => ({ id: objet.id, name: objet.name, variableCollectionId: objet.variableCollectionId, remote: false })),
    cibleAlias: () => undefined,
    protegee: (variable) => protegees.includes(variable.id),
  };
  const session: SessionEcriture = {
    collection: (id) => collections.get(id) ?? null,
    variable: (id) => variables.get(id) ?? null,
    commitUndo: () => { traces.push('undo'); },
  };
  const stockage: PortDeRegles = {
    cles: () => [...stock.keys()],
    lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => { traces.push(`ecrire:${cle}`); stock.set(cle, texte); },
    effacer: (cle) => { traces.push(`effacer:${cle}`); stock.delete(cle); },
  };
  const entree = (type: 'variable' | 'collection', id: string) => JSON.stringify([type, id]);
  const b = {
    ecritures, traces, panne, protegees, session, stockage, variables, collections,
    nom: (id: string) => noms.get(id),
    /** Un renommage modifié hors du plugin : rien n'est tracé. */
    changer: (id: string, nom: string) => { noms.set(id, nom); },
    v: (id: string, nouveauNom: string): RenommageDemande => ({
      type: 'variable', id: entree('variable', id), figmaId: id, collectionId: variables.get(id)!.variableCollectionId, ancienNom: noms.get(id)!, nouveauNom,
    }),
    c: (id: string, nouveauNom: string): RenommageDemande => ({ type: 'collection', id: entree('collection', id), figmaId: id, ancienNom: noms.get(id)!, nouveauNom }),
    entree,
    appliquer: async (demandes: readonly RenommageDemande[]) => appliquerLesRenommages({
      demandes, inventaire: await relireInventaireAvantEcriture(lecture), session, stockage, heure: () => HEURE,
    }),
    annuler: async () => annulerLeDernierRenommage({ inventaire: await relireInventaireAvantEcriture(lecture), session, stockage }),
    journal: () => lireLesRegles(lireLeStockage(stockage)).journal,
    lecture,
  };
  return b;
}
const abc = () => banc({ variables: [['v0', 'a'], ['v1', 'b'], ['v2', 'c']] });
const compter = (b: { traces: string[] }, trace: string) => b.traces.filter((item) => item === trace).length;

test('un renommage coché s’écrit sur la variable et la collection, journal rangé avant l’unique point d’annulation', async () => {
  const b = banc({ variables: [['v0', 'Brand Color'], ['v1', 'Text Color']] });
  const resultat = await b.appliquer([b.v('v0', 'brand-color'), b.c('c', 'brand')]);
  assert.equal(b.nom('v0'), 'brand-color');
  assert.equal(b.nom('v1'), 'Text Color');
  assert.equal(b.nom('c'), 'brand');
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual(resultat.sautes, []);
  assert.deepEqual(resultat.renommes, [
    { id: b.entree('variable', 'v0'), type: 'variable', figmaId: 'v0', ancienNom: 'Brand Color', nouveauNom: 'brand-color' },
    { id: b.entree('collection', 'c'), type: 'collection', figmaId: 'c', ancienNom: 'Brand', nouveauNom: 'brand' },
  ]);
  assert.equal(resultat.annulable, true);
  assert.deepEqual(b.journal(), { heure: HEURE, renommages: [
    { type: 'variable', id: 'v0', ancienNom: 'Brand Color', nouveauNom: 'brand-color' },
    { type: 'collection', id: 'c', ancienNom: 'Brand', nouveauNom: 'brand' },
  ] });
  assert.deepEqual(b.traces, ['ecrire:journal:0', 'undo']);
});

test('un nom changé depuis la lecture est sauté, puis relu tel quel', async () => {
  const b = banc({ variables: [['v0', 'Brand Color'], ['v1', 'Text Color']] });
  const demandes = [b.v('v0', 'brand-color'), b.v('v1', 'text-color')];
  b.changer('v0', 'Travail du designer');
  const resultat = await b.appliquer(demandes);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'fichier-modifie' }]);
  assert.equal(resultat.statut, 'partiel');
  assert.equal(b.nom('v0'), 'Travail du designer');
  assert.equal(b.nom('v1'), 'text-color');
  assert.deepEqual(resultat.renommes.map((fait) => fait.figmaId), ['v1']);
});

test('un nom changé sans autre renommage ne laisse rien à écrire ni au journal ni au point d’annulation', async () => {
  const b = banc({ variables: [['v0', 'Brand Color']] });
  const demandes = [b.v('v0', 'brand-color')];
  b.changer('v0', 'Autre');
  const resultat = await b.appliquer(demandes);
  assert.equal(resultat.statut, 'refuse');
  assert.equal(resultat.annulable, false);
  assert.deepEqual(b.ecritures, []);
  assert.deepEqual(b.traces, []);
  assert.equal(b.journal(), undefined);
});

test('un objet disparu ou passé dans une autre collection est sauté', async () => {
  const b = banc({ collections: [['c', 'Brand'], ['d', 'Autre'], ['e', 'Troisième']], variables: [['v0', 'a'], ['v1', 'b'], ['v2', 'c']] });
  const demandes = [b.v('v0', 'a2'), b.v('v1', 'b2'), b.v('v2', 'c2'), b.c('e', 'Troisième2')];
  b.variables.delete('v0');
  (b.variables.get('v1') as { variableCollectionId: string }).variableCollectionId = 'd';
  b.collections.delete('e');
  const resultat = await b.appliquer(demandes);
  assert.deepEqual(resultat.sautes.map(({ id, motif }) => [id, motif]), [
    [b.entree('variable', 'v0'), 'fichier-modifie'], [b.entree('variable', 'v1'), 'fichier-modifie'], [b.entree('collection', 'e'), 'fichier-modifie'],
  ]);
  assert.deepEqual(b.ecritures, ['v2=c2']);
});

test('une variable protégée est sautée même cochée, et occupe son nom', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']], protegees: ['v0'] });
  const resultat = await b.appliquer([b.v('v0', 'a2'), b.v('v1', 'a')]);
  assert.deepEqual(resultat.sautes, [
    { id: b.entree('variable', 'v0'), motif: 'protegee' },
    { id: b.entree('variable', 'v1'), motif: 'collision' },
  ]);
  assert.deepEqual(b.ecritures, []);
  assert.equal(resultat.statut, 'refuse');
});

test('une collection portant une variable protégée se renomme', async () => {
  const b = banc({ variables: [['v0', 'a']], protegees: ['v0'] });
  const resultat = await b.appliquer([b.c('c', 'Primitives')]);
  assert.equal(resultat.statut, 'applique');
  assert.equal(b.nom('c'), 'Primitives');
});

test('un renommage vers le nom d’un occupant non coché est sauté', async () => {
  const b = banc({ variables: [['v0', 'Brand Color'], ['v1', 'brand-color']] });
  const resultat = await b.appliquer([b.v('v0', 'brand-color')]);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'collision' }]);
  assert.equal(b.nom('v0'), 'Brand Color');
  assert.equal(b.nom('v1'), 'brand-color');
  assert.deepEqual(b.ecritures, []);
});

test('deux renommages vers le même nom sont sautés ensemble', async () => {
  const b = banc({ variables: [['v0', 'A'], ['v1', 'a'], ['v2', 'x']] });
  const resultat = await b.appliquer([b.v('v0', 'z'), b.v('v1', 'z'), b.v('v2', 'y')]);
  assert.deepEqual(resultat.sautes.map(({ motif }) => motif), ['collision', 'collision']);
  assert.deepEqual(b.ecritures, ['v2=y']);
});

test('un renommage sauté rend son nom à l’objet, qui peut bloquer un autre : les collisions se propagent', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b'], ['v2', 'z'], ['v3', 'c']] });
  // v0 vise le nom de v2 (non coché) ; v1 prend l'ancien nom de v0, que v0 garde alors.
  const resultat = await b.appliquer([b.v('v1', 'a'), b.v('v0', 'z'), b.v('v3', 'd')]);
  assert.deepEqual(resultat.sautes, [
    { id: b.entree('variable', 'v0'), motif: 'collision' },
    { id: b.entree('variable', 'v1'), motif: 'collision' },
  ]);
  assert.deepEqual(b.ecritures, ['v3=d']);
  assert.equal(resultat.statut, 'partiel');
});

test('le même nom dans deux collections, ou pour une variable et une collection, n’est pas un doublon', async () => {
  const b = banc({ collections: [['c', 'Brand'], ['d', 'Autre']], variables: [['v0', 'a', 'c'], ['v1', 'b', 'd'], ['v2', 'couleur', 'c']] });
  const resultat = await b.appliquer([b.v('v0', 'couleur2'), b.v('v1', 'couleur'), b.c('c', 'couleur')]);
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('c')], ['couleur2', 'couleur', 'couleur']);
});

test('une collection renommée vers le nom d’une autre est sautée', async () => {
  const b = banc({ collections: [['c', 'Brand'], ['d', 'Autre']] });
  const resultat = await b.appliquer([b.c('c', 'Autre')]);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('collection', 'c'), motif: 'collision' }]);
});

test('une demande répétée ou sans effet ne s’écrit qu’une fois', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const resultat = await b.appliquer([b.v('v0', 'a2'), b.v('v0', 'a3'), b.v('v1', 'b')]);
  assert.deepEqual(b.ecritures, ['v0=a2']);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'fichier-modifie' }]);
});

test('une chaîne s’écrit par la fin, dans l’ordre où elle est demandée', async () => {
  for (const sens of [false, true]) {
    const b = abc();
    const demandes = [b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'd')];
    const resultat = await b.appliquer(sens ? [...demandes].reverse() : demandes);
    assert.equal(resultat.statut, 'applique');
    assert.deepEqual(b.ecritures, ['v2=d', 'v1=c', 'v0=b']);
    assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['b', 'c', 'd']);
    assert.equal(compter(b, 'undo'), 1);
  }
});

test('un cycle de deux passe par un nom provisoire absent de la portée', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b'], ['occupant', 'a~ucm']] });
  const resultat = await b.appliquer([b.v('v0', 'b'), b.v('v1', 'a')]);
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual(b.ecritures, ['v0=a~ucm-2', 'v1=a', 'v0=b']);
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('occupant')], ['b', 'a', 'a~ucm']);
  assert.deepEqual(resultat.renommes.map(({ figmaId, ancienNom, nouveauNom }) => [figmaId, ancienNom, nouveauNom]), [['v0', 'a', 'b'], ['v1', 'b', 'a']]);
  assert.equal(compter(b, 'undo'), 1);
});

test('un cycle de trois s’écrit avec un seul nom provisoire', async () => {
  const b = abc();
  const resultat = await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'a')]);
  assert.equal(resultat.statut, 'applique');
  assert.equal(b.ecritures.length, 4);
  assert.equal(b.ecritures.filter((ecriture) => /~ucm/u.test(ecriture)).length, 1);
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['b', 'c', 'a']);
  assert.deepEqual(b.journal()!.renommages.map(({ id, nouveauNom }) => [id, nouveauNom]), [['v0', 'b'], ['v1', 'c'], ['v2', 'a']]);
});

test('un cycle et une chaîne du même lot s’écrivent chacun dans leur ordre', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b'], ['v2', 'c'], ['v3', 'd']] });
  const resultat = await b.appliquer([b.v('v2', 'd'), b.v('v0', 'b'), b.v('v3', 'e'), b.v('v1', 'a')]);
  assert.equal(resultat.statut, 'applique');
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2'), b.nom('v3')], ['b', 'a', 'd', 'e']);
  assert.deepEqual(b.ecritures.filter((ecriture) => /^v[23]=/u.test(ecriture)), ['v3=e', 'v2=d']);
  assert.equal(b.ecritures.length, 5);
  assert.equal(compter(b, 'undo'), 1);
});

test('une panne après la première écriture rend le relevé exact et un seul point d’annulation', async () => {
  const b = abc();
  b.panne.apres = 1;
  const resultat = await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'd')]);
  assert.equal(resultat.statut, 'partiel');
  assert.deepEqual(b.ecritures, ['v2=d']);
  assert.deepEqual(resultat.renommes.map(({ figmaId, nouveauNom }) => [figmaId, nouveauNom]), [['v2', 'd']]);
  assert.deepEqual(resultat.sautes, [
    { id: b.entree('variable', 'v0'), motif: 'ecriture-interrompue' },
    { id: b.entree('variable', 'v1'), motif: 'ecriture-interrompue' },
  ]);
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v2', ancienNom: 'c', nouveauNom: 'd' }]);
  assert.equal(resultat.annulable, true);
  assert.equal(compter(b, 'undo'), 1);
});

test('un setter qui écrit puis lève reste présent dans le relevé', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  b.panne.apres = 1;
  b.panne.ecritPuisLeve = true;
  const resultat = await b.appliquer([b.v('v0', 'a2')]);
  assert.equal(resultat.statut, 'partiel');
  assert.deepEqual(resultat.renommes.map(({ nouveauNom }) => nouveauNom), ['a2']);
  assert.deepEqual(resultat.sautes, []);
  assert.deepEqual(b.journal()!.renommages.map(({ nouveauNom }) => nouveauNom), ['a2']);
});

test('une panne avant toute écriture ne range ni journal ni point d’annulation', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  b.panne.apres = 0;
  const resultat = await b.appliquer([b.v('v0', 'a2')]);
  assert.equal(resultat.statut, 'refuse');
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'ecriture-interrompue' }]);
  assert.equal(resultat.annulable, false);
  assert.deepEqual(b.traces, []);
});

test('une panne au milieu d’un cycle consigne le nom provisoire que l’objet porte', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  b.panne.apres = 1;
  const resultat = await b.appliquer([b.v('v0', 'b'), b.v('v1', 'a')]);
  assert.equal(resultat.statut, 'partiel');
  const provisoire = b.nom('v0')!;
  assert.match(provisoire, /~ucm/u);
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v0', ancienNom: 'a', nouveauNom: provisoire }]);
  b.panne.apres = Infinity;
  const annulation = await b.annuler();
  assert.equal(annulation.statut, 'applique');
  assert.equal(b.nom('v0'), 'a');
});

test('l’annulation remet les anciens noms, efface le journal et ouvre un seul point d’annulation', async () => {
  const b = abc();
  await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'a'), b.c('c', 'Primitives')]);
  b.traces.length = 0;
  b.ecritures.length = 0;
  const resultat = await b.annuler();
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2'), b.nom('c')], ['a', 'b', 'c', 'Brand']);
  assert.equal(resultat.statut, 'applique');
  assert.equal(resultat.renommes.length, 4);
  assert.equal(resultat.annulable, false);
  assert.equal(b.journal(), undefined);
  assert.deepEqual(b.traces, ['effacer:journal:0', 'undo']);
});

test('l’annulation saute l’objet dont le nom a changé depuis', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  await b.appliquer([b.v('v0', 'a2'), b.v('v1', 'b2')]);
  b.changer('v1', 'travail du designer');
  b.traces.length = 0;
  const resultat = await b.annuler();
  assert.equal(b.nom('v0'), 'a');
  assert.equal(b.nom('v1'), 'travail du designer');
  assert.equal(resultat.statut, 'partiel');
  assert.deepEqual(resultat.sautes, [{ id: 'v1', motif: 'fichier-modifie' }]);
  assert.deepEqual(resultat.renommes.map(({ figmaId }) => figmaId), ['v0']);
  assert.equal(b.journal(), undefined);
  assert.equal(compter(b, 'undo'), 1);
});

test('l’annulation saute un objet disparu', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  await b.appliquer([b.v('v0', 'a2'), b.v('v1', 'b2')]);
  b.variables.delete('v0');
  const resultat = await b.annuler();
  assert.deepEqual(resultat.sautes, [{ id: 'v0', motif: 'fichier-modifie' }]);
  assert.equal(b.nom('v1'), 'b');
  assert.equal(resultat.statut, 'partiel');
});

test('l’annulation saute un objet dont l’ancien nom est devenu occupé', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  await b.appliquer([b.v('v0', 'a2')]);
  b.variables.set('x', { id: 'x', name: 'a', remote: false, variableCollectionId: 'c' });
  const resultat = await b.annuler();
  assert.deepEqual(resultat.sautes, [{ id: 'v0', motif: 'collision' }]);
  assert.equal(b.nom('v0'), 'a2');
  assert.equal(resultat.statut, 'refuse');
  assert.equal(compter(b, 'undo'), 1);
});

test('sans journal, l’annulation ne fait rien', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  const resultat = await b.annuler();
  assert.deepEqual(resultat, { statut: 'refuse', renommes: [], sautes: [], annulable: false });
  assert.deepEqual(b.traces, []);
});

test('une panne pendant l’annulation garde au journal les objets non remis', async () => {
  const b = abc();
  await b.appliquer([b.v('v0', 'a2'), b.v('v1', 'b2'), b.v('v2', 'c2')]);
  b.ecritures.length = 0;
  b.panne.apres = 1;
  const resultat = await b.annuler();
  assert.equal(resultat.statut, 'partiel');
  assert.equal(resultat.annulable, true);
  assert.equal(resultat.renommes.length, 1);
  assert.equal(b.journal()!.renommages.length, 2);
  b.panne.apres = Infinity;
  const reprise = await b.annuler();
  assert.equal(reprise.statut, 'applique');
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['a', 'b', 'c']);
});

test('un nouveau lot remplace le journal précédent, et un lot sans écriture le laisse', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  await b.appliquer([b.v('v0', 'a2')]);
  const demandes = [b.v('v1', 'b2')];
  b.changer('v1', 'autre');
  await b.appliquer(demandes);
  assert.deepEqual(b.journal()!.renommages.map(({ id }) => id), ['v0']);
  await b.appliquer([b.v('v1', 'b3')]);
  assert.deepEqual(b.journal()!.renommages.map(({ id }) => id), ['v1']);
});

test('l’adaptateur résout les objets locaux par l’API asynchrone avant les écritures', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  const appels: string[] = [];
  const api = {
    variables: {
      getLocalVariableCollectionsAsync: async () => { appels.push('collections'); return [...b.collections.values()]; },
      getLocalVariablesAsync: async () => { appels.push('variables'); return [...b.variables.values()]; },
    },
    commitUndo: () => { appels.push('undo'); },
  };
  const session = await creerPortEcriture(api as unknown as PluginAPI).ouvrir();
  assert.deepEqual(appels, ['collections', 'variables']);
  assert.equal(session.variable('v0')?.id, 'v0');
  assert.equal(session.variable('absente'), null);
  assert.equal(session.collection('c')?.name, 'Brand');
  assert.equal(session.collection('absente'), null);
  session.commitUndo();
  assert.deepEqual(appels, ['collections', 'variables', 'undo']);
});
