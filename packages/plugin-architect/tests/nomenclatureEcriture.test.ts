/** Le banc simule les variables et collections locales de Figma : chaque affectation de nom est tracée, et une panne peut s'y glisser. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  annulerLeDernierRenommage, appliquerLesRenommages, classerLeRenommage, creerPortEcriture, reglesFuturesDuStockage,
  type LecteursDuJournal, type ObjetModifiable, type PortDeRegles, type RenommageDemande, type SessionEcriture, type VariableModifiable,
} from '../src/ecriture/noms';
import { inventaireDeLectures, type CollectionLue, type LecteurDeVariable, type VariableLue } from '../src/nomenclature/lecture';
import { lireLesRegles, lireLeStockage } from '../src/nomenclature/regles';

const HEURE = '2026-10-17T10:00:00.000Z';

type SpecVariable = readonly [id: string, nom: string, collection?: string];
function banc(options: { variables?: readonly SpecVariable[]; collections?: readonly (readonly [id: string, nom: string, modes?: number])[]; protegees?: readonly string[] } = {}) {
  const noms = new Map<string, string>();
  const ecritures: string[] = [];
  const traces: string[] = [];
  const stock = new Map<string, string>();
  const panne = { apres: Infinity, ecritPuisLeve: false };
  /** Une panne du stockage : une clé refusée, ou une taille au-delà de laquelle (espace, clé, valeur en octets UTF-8) l'écriture lève. */
  const panneStock = { si: (_cle: string): boolean => false, taille: Infinity, ecritPuisLeve: false };
  const lots = { injecte: true, numero: 0 };
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
  /** Le nombre de modes d'une collection, quand le banc en donne un ; sans lui, la collection n'expose pas ses modes. */
  const modes = new Map<string, number>();
  for (const [id, nom, nombre] of options.collections ?? [['c', 'Brand']]) {
    collections.set(id, creer(id, nom, {}));
    if (nombre !== undefined) modes.set(id, nombre);
  }
  for (const [id, nom, collection = 'c'] of options.variables ?? []) variables.set(id, creer(id, nom, { variableCollectionId: collection }));
  const lectures = (): [readonly CollectionLue[], readonly VariableLue[]] => [
    [...collections.values()].map((objet) => ({ id: objet.id, name: objet.name, remote: false, ...(modes.has(objet.id) ? { modes: Array.from({ length: modes.get(objet.id)! }, () => ({})) } : {}) })),
    [...variables.values()].map((objet) => ({ id: objet.id, name: objet.name, variableCollectionId: objet.variableCollectionId, remote: false })),
  ];
  const lecture: LecteurDeVariable = {
    cibleAlias: () => undefined,
    protegee: (variable) => protegees.includes(variable.id),
    palette: () => undefined,
  };
  const session: SessionEcriture = {
    get inventaire() { return inventaireDeLectures(...lectures(), lecture); },
    collection: (id) => collections.get(id) ?? null,
    variable: (id) => variables.get(id) ?? null,
    commitUndo: () => { traces.push('undo'); },
  };
  const stockage: PortDeRegles = {
    cles: () => [...stock.keys()],
    lire: (cle) => stock.get(cle) ?? '',
    ecrire: (cle, texte) => {
      traces.push(`ecrire:${cle}`);
      const trop = Buffer.byteLength(`ucm_architect${cle}${texte}`, 'utf8') > panneStock.taille;
      if (trop || (panneStock.si(cle) && !panneStock.ecritPuisLeve)) throw new Error('stockage interrompu');
      stock.set(cle, texte);
      if (panneStock.si(cle)) throw new Error('stockage interrompu après écriture');
    },
    effacer: (cle) => { traces.push(`effacer:${cle}`); stock.delete(cle); },
  };
  const entree = (type: 'variable' | 'collection', id: string) => JSON.stringify([type, id]);
  const b = {
    ecritures, traces, panne, panneStock, lots, stock, protegees, session, stockage, variables, collections,
    nom: (id: string) => noms.get(id),
    /** Un renommage modifié hors du plugin : rien n'est tracé. */
    changer: (id: string, nom: string) => { noms.set(id, nom); },
    v: (id: string, nouveauNom: string): RenommageDemande => ({
      type: 'variable', id: entree('variable', id), figmaId: id, collectionId: variables.get(id)!.variableCollectionId, ancienNom: noms.get(id)!, nouveauNom,
    }),
    c: (id: string, nouveauNom: string): RenommageDemande => ({ type: 'collection', id: entree('collection', id), figmaId: id, ancienNom: noms.get(id)!, nouveauNom }),
    entree,
    appliquer: async (demandes: readonly RenommageDemande[]) => appliquerLesRenommages({
      demandes, session, stockage, heure: () => HEURE,
      ...(lots.injecte ? { lot: () => `l${++lots.numero}` } : {}),
    }),
    annuler: async () => annulerLeDernierRenommage({
      session, stockage,
      ...(lots.injecte ? { lot: () => `l${++lots.numero}` } : {}),
    }),
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
  assert.deepEqual(b.traces, ['ecrire:journal:l1:0', 'ecrire:journal', 'undo']);
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
  const b = banc({ collections: [['c', 'Brand'], ['d', 'Autre']], variables: [['v0', 'a', 'd'], ['v1', 'b', 'd'], ['v2', 'couleur', 'c']] });
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

test('une panne avant toute écriture ne garde ni journal ni point d’annulation, et laisse le journal précédent', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const resultat = await b.appliquer([b.v('v1', 'b2')]);
  assert.equal(resultat.statut, 'applique');
  const cles = [...b.stock.keys()].sort();
  const journalAvant = b.journal();
  b.traces.length = 0;
  b.panne.apres = 0;
  const refus = await b.appliquer([b.v('v0', 'a2')]);
  assert.equal(refus.statut, 'refuse');
  assert.equal(refus.cause, undefined);
  assert.deepEqual(refus.sautes, [{ id: b.entree('variable', 'v0'), motif: 'ecriture-interrompue' }]);
  assert.equal(refus.annulable, false);
  assert.equal(compter(b, 'undo'), 0);
  assert.deepEqual([...b.stock.keys()].sort(), cles);
  assert.deepEqual(b.journal(), journalAvant);
  const seul = banc({ variables: [['v0', 'a']] });
  seul.panne.apres = 0;
  await seul.appliquer([seul.v('v0', 'a2')]);
  assert.equal(seul.stock.size, 0);
  assert.equal(seul.journal(), undefined);
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
  assert.deepEqual(b.traces, ['effacer:journal', 'effacer:journal:l1:0', 'undo']);
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
  assert.equal(resultat.annulable, true);
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v1', ancienNom: 'b', nouveauNom: 'b2' }], 'l’entrée sautée reste, avec le nom attendu d’origine');
  assert.equal(compter(b, 'undo'), 1);
  b.changer('v1', 'b2');
  const reprise = await b.annuler();
  assert.equal(reprise.statut, 'applique');
  assert.equal(b.nom('v1'), 'b');
  assert.equal(b.journal(), undefined);
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

test('AI4 : une annulation bloquée par une collision garde l’entrée, qui se rétablit une fois le nom libéré', async () => {
  const b = banc({ variables: [['v0', 'a'], ['occupant', 'libre']] });
  await b.appliquer([b.v('v0', 'b')]);
  b.changer('occupant', 'a');
  const bloquee = await b.annuler();
  assert.equal(bloquee.statut, 'refuse');
  assert.equal(bloquee.annulable, true);
  assert.equal(b.nom('v0'), 'b');
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v0', ancienNom: 'a', nouveauNom: 'b' }]);
  b.changer('occupant', 'libre');
  const reprise = await b.annuler();
  assert.equal(reprise.statut, 'applique');
  assert.equal(reprise.annulable, false);
  assert.equal(b.nom('v0'), 'a');
  assert.equal(b.journal(), undefined);
  assert.equal(b.stock.size, 0);
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
      getLocalVariablesAsync: async () => { appels.push('variables'); return [...b.variables.values()].map((objet) => Object.assign(objet, { getSharedPluginData: () => '' })); },
    },
    root: { getSharedPluginData: (espace: string, cle: string) => { appels.push(`racine:${espace}/${cle}`); return ''; } },
    commitUndo: () => { appels.push('undo'); },
  };
  const session = await creerPortEcriture(api as unknown as PluginAPI).ouvrir();
  assert.deepEqual(appels, ['collections', 'variables', 'racine:ucm_palettes/variables', 'racine:ucm_palettes/nommage']);
  assert.equal(session.inventaire.entrees.length, 2, 'la collection et la variable');
  assert.equal(session.variable('v0')?.id, 'v0');
  assert.equal(session.variable('absente'), null);
  assert.equal(session.collection('c')?.name, 'Brand');
  assert.equal(session.collection('absente'), null);
  session.commitUndo();
  assert.deepEqual(appels.slice(-1), ['undo']);
});

/** Une API factice dont les variables portent la donnée `palette` voulue et dont la racine rend `suivi`. */
function apiAvecSuivi(b: ReturnType<typeof banc>, suivi: string, palettes: Record<string, string> = {}) {
  return {
    variables: {
      getLocalVariableCollectionsAsync: async () => [...b.collections.values()],
      getLocalVariablesAsync: async () => [...b.variables.values()].map((objet) => Object.assign(objet, { getSharedPluginData: () => palettes[objet.id] ?? '' })),
    },
    root: { getSharedPluginData: () => suivi },
    commitUndo: () => {},
  } as unknown as PluginAPI;
}
const suiviDe = (...ids: string[]): string => JSON.stringify({ version: 2, palettes: { p1: { collection: 'c', variables: Object.fromEntries(ids.map((id, rang) => [`cle${rang}`, { id, ecrite: true }])) } } });

test('AC7 : une variable listée seulement dans le suivi racine de Palettes est protégée à l’écriture', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const session = await creerPortEcriture(apiAvecSuivi(b, suiviDe('v0'))).ouvrir();
  const protegees = session.inventaire.entrees.filter((entree) => entree.protegee).map((entree) => entree.cible.type === 'variable' ? entree.cible.variableId : 'collection');
  assert.deepEqual(protegees, ['v0']);
  const resultat = appliquerLesRenommages({ demandes: [b.v('v0', 'a2'), b.v('v1', 'b2')], session, stockage: b.stockage });
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'protegee' }]);
  assert.deepEqual(b.ecritures, ['v1=b2']);
});

test('AC7 : la donnée palette de la variable protège toujours, avec ou sans suivi racine', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  const session = await creerPortEcriture(apiAvecSuivi(b, '', { v0: 'Brand' })).ouvrir();
  const resultat = appliquerLesRenommages({ demandes: [b.v('v0', 'a2')], session, stockage: b.stockage });
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'protegee' }]);
  assert.deepEqual(b.ecritures, []);
});

test('AC7 : un suivi racine illisible ou d’une autre forme ne lève pas et n’ajoute aucune protection', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  const textes = ['{pas du json', 'null', '[]', '"v0"', '{"palettes":"v0"}', '{"palettes":{"p":null}}', '{"palettes":{"p":{"variables":[1,null,{"id":3}]}}}', '{"palettes":{"p":{"variables":{"k":null}}}}'];
  for (const texte of textes) {
    const session = await creerPortEcriture(apiAvecSuivi(b, texte)).ouvrir();
    assert.deepEqual(session.inventaire.entrees.filter((entree) => entree.protegee), [], texte);
  }
});

/** Une API dont la racine refuse toute lecture : le suivi de Palettes et la marque `nommage` sont illisibles. */
function apiQuiRefuse(b: ReturnType<typeof banc>, palettes: Record<string, string> = {}): PluginAPI {
  const api = apiAvecSuivi(b, '', palettes);
  (api.root as unknown as { getSharedPluginData: () => string }).getSharedPluginData = () => { throw new Error('refus'); };
  return api;
}

test('T4.1 : une racine qui refuse la lecture suspend la variable de couleur sans marqueur, qui n’est pas écrite (non-verifiee)', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  const session = await creerPortEcriture(apiQuiRefuse(b)).ouvrir();
  assert.deepEqual(session.inventaire.entrees.filter((entree) => entree.indecidable === true).map((entree) => entree.nom.nom), ['a']);
  assert.equal(session.inventaire.marque, 'refusee');
  const resultat = appliquerLesRenommages({ demandes: [b.v('v0', 'a2')], session, stockage: b.stockage });
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'non-verifiee' }]);
  assert.equal(resultat.statut, 'refuse');
  assert.deepEqual(b.ecritures, []);
  assert.equal(b.nom('v0'), 'a');
});

test('T4.1 : une racine qui refuse la lecture rend aussi non-verifiee la variable à marqueur lisible, dont la marque de Palettes est inconnue', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const session = await creerPortEcriture(apiQuiRefuse(b, { v0: 'Brand' })).ouvrir();
  const resultat = appliquerLesRenommages({ demandes: [b.v('v0', 'a2'), b.v('v1', 'b2')], session, stockage: b.stockage });
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'non-verifiee' }, { id: b.entree('variable', 'v1'), motif: 'non-verifiee' }]);
  assert.deepEqual(b.ecritures, []);
});

test('T4.1 : l’annulation saute une restitution devenue indécidable (non-verifiee) et le journal garde la ligne', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const lisible = await creerPortEcriture(apiAvecSuivi(b, '')).ouvrir();
  const lot = appliquerLesRenommages({ demandes: [b.v('v0', 'a2'), b.v('v1', 'b2')], session: lisible, stockage: b.stockage, heure: () => HEURE });
  assert.equal(lot.statut, 'applique');
  const journal = b.journal();
  const refusee = await creerPortEcriture(apiQuiRefuse(b)).ouvrir();
  const annulation = annulerLeDernierRenommage({ session: refusee, stockage: b.stockage });
  assert.deepEqual(annulation.sautes, [{ id: 'v0', motif: 'non-verifiee' }, { id: 'v1', motif: 'non-verifiee' }], 'les identifiants d’une annulation sont ceux de Figma');
  assert.deepEqual(annulation.renommes, []);
  assert.equal(annulation.annulable, true);
  assert.deepEqual([b.nom('v0'), b.nom('v1')], ['a2', 'b2']);
  assert.deepEqual(b.journal(), journal, 'le journal garde les deux lignes');
  const reprise = annulerLeDernierRenommage({ session: await creerPortEcriture(apiAvecSuivi(b, '')).ouvrir(), stockage: b.stockage });
  assert.equal(reprise.statut, 'applique');
  assert.deepEqual([b.nom('v0'), b.nom('v1')], ['a', 'b']);
});

// Le journal durable : reprises des cas AI1 à AI5 du banc d'intégrité, avec l'attente inverse.

const gros = (i: number): string => `${'x'.repeat(40_000)}${i}`;
const lotDeGros = (n: number): SpecVariable[] => Array.from({ length: n }, (_, i) => [`g${i}`, gros(i)] as const);
const cles = (b: { stock: Map<string, string> }): string[] => [...b.stock.keys()].sort();

test('AI1 : un journal qui ne s’écrit pas arrête le lot avant le premier nom, pour chaque entrée et pour la référence', async () => {
  for (const ecritPuisLeve of [false, true]) {
    for (const cible of ['journal:l2:0', 'journal:l2:1', 'journal:l2:2', 'journal']) {
      const b = banc({ variables: [['z', 'z'], ...lotDeGros(5)] });
      await b.appliquer([b.v('z', 'z2')]);
      const clesAvant = cles(b);
      const journalAvant = b.journal();
      b.ecritures.length = 0;
      b.traces.length = 0;
      b.panneStock.si = (cle) => cle === cible;
      b.panneStock.ecritPuisLeve = ecritPuisLeve;
      const resultat = await b.appliquer(lotDeGros(5).map(([id]) => b.v(id, `court-${id}`)));
      const contexte = `${cible}${ecritPuisLeve ? ' (écrit puis lève)' : ''}`;
      assert.equal(resultat.statut, 'refuse', contexte);
      assert.equal(resultat.cause, 'journal-impossible', contexte);
      assert.equal(resultat.annulable, false, contexte);
      assert.deepEqual(resultat.renommes, [], contexte);
      assert.deepEqual(b.ecritures, [], `${contexte} : aucun nom n’a changé`);
      assert.equal(compter(b, 'undo'), 0, contexte);
      assert.deepEqual(cles(b), clesAvant, `${contexte} : les clés du lot raté sont effacées`);
      assert.deepEqual(b.journal(), journalAvant, contexte);
      b.panneStock.si = () => false;
      const annulation = await b.annuler();
      assert.equal(annulation.statut, 'applique', contexte);
      assert.equal(b.nom('z'), 'z', contexte);
    }
  }
});

test('AI1 : sans journal précédent, une écriture du journal qui échoue ne laisse aucune clé', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  b.panneStock.si = (cle) => cle === 'journal';
  const resultat = await b.appliquer([b.v('v0', 'a2')]);
  assert.equal(resultat.cause, 'journal-impossible');
  assert.equal(b.nom('v0'), 'a');
  assert.equal(b.stock.size, 0);
});

test('AI1 : les renommages sautés par les contrôles restent dans le résultat d’un lot refusé faute de journal', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const demandes = [b.v('v0', 'a2'), b.v('v1', 'b2')];
  b.changer('v1', 'autre');
  b.panneStock.si = () => true;
  const resultat = await b.appliquer(demandes);
  assert.equal(resultat.cause, 'journal-impossible');
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v1'), motif: 'fichier-modifie' }]);
});

test('AI1 : une panne de chaque setter d’un cycle laisse un journal qui remet tous les noms d’origine', async () => {
  for (const apres of [0, 1, 2, 3]) {
    const b = abc();
    b.panne.apres = apres;
    const resultat = await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'a')]);
    assert.equal(resultat.statut, apres === 0 ? 'refuse' : 'partiel', `panne après ${apres}`);
    b.panne.apres = Infinity;
    if (apres === 0) { assert.equal(b.stock.size, 0); continue; }
    const annulation = await b.annuler();
    assert.equal(annulation.statut, 'applique', `panne après ${apres}`);
    assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['a', 'b', 'c'], `panne après ${apres}`);
    assert.equal(b.stock.size, 0);
  }
});

test('AI1 : si la réécriture du journal échoue après les noms, le journal prévu reste valide et l’annulation le suit', async () => {
  for (const apres of [1, 2, Infinity]) {
    const b = abc();
    b.panneStock.si = (cle) => cle.startsWith('journal:l2:');
    b.panne.apres = apres;
    const resultat = await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'a')]);
    assert.ok(resultat.renommes.length > 0, `panne après ${apres}`);
    assert.equal(resultat.annulable, true);
    assert.deepEqual(b.journal()!.renommages.map(({ id }) => id), ['v0', 'v1', 'v2'], 'le journal prévu est resté');
    assert.deepEqual(cles(b), ['journal', 'journal:l1:0'], 'les clés du lot de réécriture sont effacées');
    b.panne.apres = Infinity;
    b.panneStock.si = () => false;
    const annulation = await b.annuler();
    assert.equal(annulation.statut, 'applique', `panne après ${apres}`);
    assert.deepEqual(annulation.sautes, []);
    assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['a', 'b', 'c'], `panne après ${apres}`);
    assert.equal(b.stock.size, 0);
  }
});

test('AI5 : une annulation de cycle interrompue à chaque setter se reprend, nom provisoire compris', async () => {
  for (const apres of [1, 2]) {
    const b = abc();
    await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'a')]);
    b.ecritures.length = 0;
    b.panne.apres = apres;
    const interrompue = await b.annuler();
    assert.equal(interrompue.statut, 'partiel', `panne après ${apres}`);
    assert.equal(interrompue.annulable, true);
    assert.ok([b.nom('v0'), b.nom('v1'), b.nom('v2')].some((nom) => /~ucm/u.test(nom!)), 'un objet porte son nom provisoire');
    assert.ok(b.journal()!.renommages.some(({ nouveauNom }) => /~ucm/u.test(nouveauNom)), 'le journal note le nom provisoire lu');
    b.panne.apres = Infinity;
    const reprise = await b.annuler();
    assert.equal(reprise.statut, 'applique', `panne après ${apres}`);
    assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['a', 'b', 'c'], `panne après ${apres}`);
    assert.equal(b.journal(), undefined);
    assert.equal(b.stock.size, 0);
  }
});

test('AI5 : si le journal d’une annulation interrompue ne se réécrit pas, une seconde annulation reconnaît encore le nom provisoire', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  await b.appliquer([b.v('v0', 'b'), b.v('v1', 'a')]);
  b.ecritures.length = 0;
  b.panne.apres = 1;
  b.panneStock.si = (cle) => cle.startsWith('journal:l');
  const interrompue = await b.annuler();
  assert.equal(interrompue.statut, 'partiel');
  assert.match(b.nom('v0')!, /~ucm/u);
  b.panne.apres = Infinity;
  b.panneStock.si = () => false;
  assert.equal((await b.annuler()).statut, 'applique');
  assert.deepEqual([b.nom('v0'), b.nom('v1')], ['a', 'b']);
});

test('AI2 : des noms en é, en idéogrammes et en emoji se rangent sans dépasser 102 400 octets par entrée', async () => {
  const alphabets = { 'é': 'éèêëàâîïôûùç', 'idéogrammes': '漢字色彩背景前景', 'emoji': '😀🎨🌈🔥' };
  for (const [nom, lettres] of Object.entries(alphabets)) {
    const specs = Array.from({ length: 700 }, (_, i) => [`v${i}`, `${lettres.repeat(Math.ceil(24 / lettres.length) * 2)}${i}`] as const);
    const b = banc({ variables: specs });
    b.panneStock.taille = 102_400;
    const resultat = await b.appliquer(specs.map(([id, ancien]) => b.v(id, `新${ancien}`)));
    assert.equal(resultat.statut, 'applique', nom);
    assert.equal(resultat.annulable, true, nom);
    assert.equal(b.journal()!.renommages.length, 700, nom);
    assert.ok(cles(b).length > 2, `${nom} : le journal tient en plusieurs entrées`);
    for (const [cle, texte] of b.stock) assert.ok(Buffer.byteLength(`ucm_architect${cle}${texte}`, 'utf8') <= 102_400, `${nom} ${cle}`);
    const annulation = await b.annuler();
    assert.equal(annulation.statut, 'applique', nom);
    assert.deepEqual(specs.map(([id]) => b.nom(id)), specs.map(([, ancien]) => ancien), nom);
  }
});

test('AI2 : un renommage trop gros pour une entrée refuse tout le lot avant le premier nom', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', '😀'.repeat(30_000)]] });
  b.panneStock.taille = 102_400;
  const resultat = await b.appliquer([b.v('v0', 'a2'), b.v('v1', 'b')]);
  assert.equal(resultat.statut, 'refuse');
  assert.equal(resultat.cause, 'journal-impossible');
  assert.deepEqual(b.ecritures, []);
  assert.equal(b.nom('v0'), 'a');
  assert.equal(b.stock.size, 0);
  assert.equal(compter(b, 'undo'), 0);
});

test('AI3 : un second lot qui échoue en route laisse le journal du premier intact, sans mélange', async () => {
  for (const cible of ['journal:l2:0', 'journal:l2:1', 'journal:l2:2', 'journal']) {
    const b = banc({ variables: [...lotDeGros(5), ['z0', 'z0'], ['z1', 'z1']] });
    const premier = await b.appliquer(lotDeGros(5).map(([id]) => b.v(id, `court-${id}`)));
    assert.equal(premier.statut, 'applique');
    const clesAvant = cles(b);
    const journalAvant = b.journal()!;
    assert.deepEqual(journalAvant.renommages.map(({ id }) => id), ['g0', 'g1', 'g2', 'g3', 'g4']);
    b.panneStock.si = (cle) => cle === cible;
    const second = await b.appliquer([b.v('z0', gros(1)), b.v('z1', gros(2)), b.v('g0', gros(3)), b.v('g1', gros(4)), b.v('g2', gros(5)), b.v('g3', gros(6))]);
    assert.equal(second.statut, 'refuse', cible);
    assert.equal(second.cause, 'journal-impossible', cible);
    assert.deepEqual(cles(b), clesAvant, cible);
    assert.deepEqual(b.journal(), journalAvant, cible);
    assert.deepEqual([b.nom('z0'), b.nom('z1'), b.nom('g0')], ['z0', 'z1', 'court-g0'], cible);
    b.panneStock.si = () => false;
    const annulation = await b.annuler();
    assert.equal(annulation.statut, 'applique', cible);
    assert.deepEqual(lotDeGros(5).map(([id]) => b.nom(id)), lotDeGros(5).map(([, nom]) => nom), cible);
  }
});

test('un lot par défaut reçoit un identifiant neuf et efface les clés du précédent', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  b.lots.injecte = false;
  await b.appliquer([b.v('v0', 'b')]);
  const premieres = cles(b);
  await b.appliquer([b.v('v0', 'c')]);
  const secondes = cles(b);
  assert.equal(secondes.length, premieres.length);
  assert.notDeepEqual(secondes, premieres);
  assert.ok(secondes.every((cle) => /^journal(:[0-9a-z]+:\d+)?$/u.test(cle)), secondes.join());
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v0', ancienNom: 'b', nouveauNom: 'c' }]);
});

test('un journal de l’ancienne forme se lit et s’annule, puis ses clés partent', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  b.changer('v0', 'a2');
  b.stock.set('journal:0', JSON.stringify({ version: 1, heure: HEURE, morceaux: 2, renommages: [{ type: 'variable', id: 'v0', ancienNom: 'a', nouveauNom: 'a2' }] }));
  b.stock.set('journal:1', JSON.stringify({ version: 1, renommages: [{ type: 'variable', id: 'v1', ancienNom: 'b0', nouveauNom: 'b' }] }));
  assert.equal(b.journal()!.renommages.length, 2);
  const annulation = await b.annuler();
  assert.equal(annulation.statut, 'applique');
  assert.deepEqual([b.nom('v0'), b.nom('v1')], ['a', 'b0']);
  assert.equal(b.stock.size, 0);
});

test('un nouveau lot efface les clés de l’ancienne forme après avoir publié sa référence', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  b.stock.set('journal:0', JSON.stringify({ version: 1, heure: HEURE, morceaux: 1, renommages: [] }));
  await b.appliquer([b.v('v1', 'b2')]);
  assert.deepEqual(cles(b), ['journal', 'journal:l1:0']);
  const ordre = b.traces.filter((trace) => /^(ecrire|effacer):/u.test(trace));
  assert.ok(ordre.indexOf('ecrire:journal') < ordre.indexOf('effacer:journal:0'));
});

test('un journal illisible refuse l’annulation sans rien effacer', async () => {
  const b = banc({ variables: [['v0', 'a']] });
  await b.appliquer([b.v('v0', 'b')]);
  b.stock.delete('journal:l1:0');
  const clesAvant = cles(b);
  b.traces.length = 0;
  const resultat = await b.annuler();
  assert.deepEqual(resultat, { statut: 'refuse', renommes: [], sautes: [], annulable: false });
  assert.equal(b.nom('v0'), 'b');
  assert.deepEqual(cles(b), clesAvant);
  assert.deepEqual(b.traces, []);
});

test('un renommage prévu que le lot n’a pas écrit compte comme rétabli à l’annulation', async () => {
  const b = abc();
  b.panne.apres = 1;
  b.panneStock.si = (cle) => cle.startsWith('journal:l2:');
  await b.appliquer([b.v('v0', 'b'), b.v('v1', 'c'), b.v('v2', 'd')]);
  assert.equal(b.nom('v2'), 'd');
  assert.deepEqual(b.journal()!.renommages.map(({ id }) => id), ['v0', 'v1', 'v2'], 'le journal prévu garde deux renommages jamais écrits');
  b.panne.apres = Infinity;
  b.panneStock.si = () => false;
  const annulation = await b.annuler();
  assert.equal(annulation.statut, 'applique');
  assert.deepEqual(annulation.sautes, []);
  assert.deepEqual(annulation.renommes.map(({ figmaId }) => figmaId), ['v2']);
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('v2')], ['a', 'b', 'c']);
  assert.equal(b.stock.size, 0);
});

// Le nom final : chemins de tokens.json et noms que Figma refuse

test('AC1 : un chemin qui ne se rejoint que dans le document relu est sauté, et rien ne s’écrit pour lui', async () => {
  const b = banc({ variables: [['v0', 'bg/primary'], ['v1', 'Libre'], ['v2', 'colors'], ['v3', 'Autre']] });
  const demandes = [b.v('v0', 'background/primary'), b.v('v2', 'color'), b.v('v3', 'Autre bis')];
  b.changer('v1', 'Background/primary');
  const resultat = await b.appliquer(demandes);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'collision' }]);
  assert.equal(b.nom('v0'), 'bg/primary');
  assert.deepEqual(b.ecritures, ['v2=color', 'v3=Autre bis']);
  assert.equal(resultat.statut, 'partiel');
});

test('AC2 : un token qui devient le groupe d’un autre, vu seulement dans le document relu, est sauté', async () => {
  const b = banc({ variables: [['v0', 'colors'], ['v1', 'Libre']] });
  const demandes = [b.v('v0', 'color')];
  b.changer('v1', 'color/primary');
  const resultat = await b.appliquer(demandes);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('variable', 'v0'), motif: 'collision' }]);
  assert.deepEqual(b.ecritures, []);
  assert.equal(resultat.statut, 'refuse');
  assert.equal(b.journal(), undefined);
});

test('AI10 : une collection renommée dont les variables rejoignent les chemins d’une autre est sautée', async () => {
  const b = banc({ collections: [['c', 'Colors'], ['d', 'Theme']], variables: [['v0', 'foo', 'c'], ['v1', 'foo', 'd']] });
  const resultat = await b.appliquer([b.c('c', 'theme')]);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('collection', 'c'), motif: 'collision' }]);
  assert.equal(b.nom('c'), 'Colors');
  assert.deepEqual(b.ecritures, []);
});

test('AUD-E2 : une collection à modes renommée du nom, à la casse près, d’une autre collection à modes est sautée, et rien ne s’écrit', async () => {
  const b = banc({ collections: [['c', 'Zorglub', 2], ['d', 'Primitives', 2]], variables: [['a', 'primary', 'c'], ['x', 'secondary', 'd']] });
  const resultat = await b.appliquer([b.c('c', 'primitives'), b.v('a', 'main')]);
  assert.deepEqual(resultat.sautes, [{ id: b.entree('collection', 'c'), motif: 'collision' }]);
  assert.equal(b.nom('c'), 'Zorglub');
  assert.deepEqual(b.ecritures, ['a=main'], 'la variable renommée avec elle reste écrite');
  const seule = banc({ collections: [['c', 'Zorglub', 2], ['d', 'Primitives', 2]] });
  const refuse = await seule.appliquer([seule.c('c', 'primitives')]);
  assert.equal(refuse.statut, 'refuse');
  assert.deepEqual(seule.ecritures, []);
  assert.equal(seule.journal(), undefined);
});

test('AUD-E2 : une collection à un seul mode, ou dont les modes ne sont pas lus, se renomme comme avant', async () => {
  const unMode = banc({ collections: [['c', 'Zorglub', 2], ['d', 'Primitives', 1]] });
  assert.equal((await unMode.appliquer([unMode.c('c', 'primitives')])).statut, 'applique');
  const sansModes = banc({ collections: [['c', 'Zorglub'], ['d', 'Primitives']] });
  assert.equal((await sansModes.appliquer([sansModes.c('c', 'primitives')])).statut, 'applique');
});

test('AUD-E2 : une annulation ne rétablit pas un nom de collection qui rejoindrait la clé d’axe d’une autre', async () => {
  const b = banc({ collections: [['c', 'Zorglub', 2], ['d', 'Autre', 2]] });
  assert.equal((await b.appliquer([b.c('c', 'Nouveau')])).statut, 'applique');
  b.changer('d', 'zorglub');
  const annulation = await b.annuler();
  assert.deepEqual(annulation.sautes, [{ id: 'c', motif: 'collision' }]);
  assert.equal(b.nom('c'), 'Nouveau');
});

test('un renommage sauté pour son chemin rend son nom à l’objet, qui peut bloquer un doublon de nom', async () => {
  const b = banc({ variables: [['v0', 'x'], ['v1', 'b'], ['v2', 'c'], ['v3', 'y']] });
  // v0 vise le chemin de v3 et est sauté ; v2 vise alors le nom `x` que v0 garde.
  const resultat = await b.appliquer([b.v('v0', 'Y'), b.v('v1', 'b2'), b.v('v2', 'x')]);
  assert.deepEqual(b.ecritures, ['v1=b2']);
  assert.deepEqual(resultat.sautes, [
    { id: b.entree('variable', 'v0'), motif: 'collision' },
    { id: b.entree('variable', 'v2'), motif: 'collision' },
  ]);
});

test('un nom que Figma refuse est sauté en nom-invalide, chaque forme, sans rien écrire pour lui', async () => {
  const noms = ['', '/a', 'a/', 'a//b', 'a.b', 'a{b', 'a}b', '$a', 'x/$a'];
  const b = banc({ variables: [...noms.map((_, rang): SpecVariable => [`v${rang}`, `ancien ${rang}`]), ['ok', 'ancien ok']] });
  const demandes = [...noms.map((nom, rang) => b.v(`v${rang}`, nom)), b.v('ok', 'nouveau/ok')];
  const resultat = await b.appliquer(demandes);
  assert.deepEqual(resultat.sautes, noms.map((_, rang) => ({ id: b.entree('variable', `v${rang}`), motif: 'nom-invalide' })));
  assert.deepEqual(b.ecritures, ['ok=nouveau/ok']);
  assert.deepEqual(b.journal()?.renommages.map(({ id }) => id), ['ok']);
});

test('un nom de collection vide est sauté en nom-invalide ; un point y reste permis', async () => {
  const vide = banc();
  const refuse = await vide.appliquer([vide.c('c', ' ')]);
  assert.deepEqual(refuse.sautes, [{ id: vide.entree('collection', 'c'), motif: 'nom-invalide' }]);
  const point = banc();
  const accepte = await point.appliquer([point.c('c', 'Brand 2.0')]);
  assert.deepEqual(accepte.renommes.map(({ nouveauNom }) => nouveauNom), ['Brand 2.0']);
});

test('le `$` qui n’est pas en tête d’un segment, et les noms à plusieurs segments, restent permis', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'b']] });
  const resultat = await b.appliquer([b.v('v0', 'prix$/net'), b.v('v1', 'x y/z')]);
  assert.deepEqual(resultat.sautes, []);
  assert.deepEqual(b.ecritures, ['v0=prix$/net', 'v1=x y/z']);
});

test('une annulation restitue un conflit de chemin qui existait avant le lot, sans refaire le contrôle du nom', async () => {
  const b = banc({ variables: [['v0', 'Foo'], ['v1', 'foo/bar']] });
  const applique = await b.appliquer([b.v('v0', 'baz')]);
  assert.equal(applique.statut, 'applique');
  assert.deepEqual(b.journal()!.dejaEnConflit, [['v0', 'v1']], 'le lot range la paire déjà en conflit, en identifiants Figma');
  const annule = await b.annuler();
  assert.equal(annule.statut, 'applique', 'Foo et foo/bar se rejoignaient déjà avant le lot');
  assert.equal(b.nom('v0'), 'Foo');
});

test('N01 : une restitution qui créerait un token et son groupe est sautée, garde sa ligne, et passe une fois le conflit levé', async () => {
  const b = banc({ variables: [['v0', 'a'], ['v1', 'c']] });
  await b.appliquer([b.v('v0', 'b')]);
  assert.equal(b.journal()!.dejaEnConflit, undefined, 'aucune paire en conflit avant le lot : le champ est omis');
  b.changer('v1', 'a/x');
  const bloquee = await b.annuler();
  assert.equal(bloquee.statut, 'refuse');
  assert.deepEqual(bloquee.sautes, [{ id: 'v0', motif: 'collision' }]);
  assert.equal(bloquee.annulable, true);
  assert.equal(b.nom('v0'), 'b');
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v0', ancienNom: 'a', nouveauNom: 'b' }]);
  assert.equal(compter(b, 'undo'), 1, 'seule l’application a ouvert un point d’annulation');
  b.changer('v1', 'c');
  const reprise = await b.annuler();
  assert.equal(reprise.statut, 'applique');
  assert.equal(b.nom('v0'), 'a');
  assert.equal(b.journal(), undefined);
});

test('N01 : un journal de l’ancienne forme, sans paire, refuse la restitution qui crée un conflit de chemin et rétablit le reste', async () => {
  const b = banc({ variables: [['v0', 'baz'], ['v1', 'foo/bar'], ['v2', 'x2']] });
  b.stock.set('journal:0', JSON.stringify({ version: 1, heure: HEURE, morceaux: 1, renommages: [
    { type: 'variable', id: 'v0', ancienNom: 'Foo', nouveauNom: 'baz' },
    { type: 'variable', id: 'v2', ancienNom: 'x', nouveauNom: 'x2' },
  ] }));
  const resultat = await b.annuler();
  assert.deepEqual(resultat.sautes, [{ id: 'v0', motif: 'collision' }]);
  assert.deepEqual(resultat.renommes.map(({ figmaId }) => figmaId), ['v2']);
  assert.equal(resultat.statut, 'partiel');
  assert.deepEqual([b.nom('v0'), b.nom('v2')], ['baz', 'x']);
  assert.deepEqual(b.journal()!.renommages, [{ type: 'variable', id: 'v0', ancienNom: 'Foo', nouveauNom: 'baz' }]);
});

test('N01 : une collection restituée dont les variables rejoindraient celles d’une autre est sautée, sauf si le lot les trouvait déjà jointes', async () => {
  const neuf = banc({ collections: [['c', 'Colors']], variables: [['v0', 'foo', 'c']] });
  await neuf.appliquer([neuf.c('c', 'Couleurs')]);
  neuf.collections.set('e', { id: 'e', name: 'colors', remote: false });
  neuf.variables.set('v1', { id: 'v1', name: 'foo', remote: false, variableCollectionId: 'e' });
  const bloquee = await neuf.annuler();
  assert.deepEqual(bloquee.sautes, [{ id: 'c', motif: 'collision' }]);
  assert.equal(neuf.nom('c'), 'Couleurs');
  assert.equal(neuf.journal()!.renommages.length, 1);

  const ancien = banc({ collections: [['c', 'Colors'], ['e', 'colors']], variables: [['v0', 'foo', 'c'], ['v1', 'foo', 'e']] });
  await ancien.appliquer([ancien.c('c', 'Couleurs')]);
  assert.deepEqual(ancien.journal()!.dejaEnConflit, [['v0', 'v1']]);
  const rendue = await ancien.annuler();
  assert.equal(rendue.statut, 'applique');
  assert.equal(ancien.nom('c'), 'Colors');
});

// Une collection exclue de l'analyse n'est pas touchée, annulation comprise

const exclure = (b: ReturnType<typeof banc>, ...ids: string[]): void => { b.stock.set('exclues', JSON.stringify({ version: 1, ids })); };

test('N09 : l’annulation saute les objets d’une collection exclue, qui restent au journal et se rétablissent une fois la collection réincluse', async () => {
  const b = banc({ collections: [['c', 'Brand'], ['d', 'Texte']], variables: [['v0', 'a', 'c'], ['v1', 'b', 'd']] });
  await b.appliquer([b.v('v0', 'a2'), b.v('v1', 'b2'), b.c('d', 'Texte2')]);
  exclure(b, 'd');
  const partielle = await b.annuler();
  assert.deepEqual([b.nom('v0'), b.nom('v1'), b.nom('d')], ['a', 'b2', 'Texte2']);
  assert.equal(partielle.statut, 'partiel');
  assert.deepEqual(partielle.sautes, [{ id: 'v1', motif: 'exclue' }, { id: 'd', motif: 'exclue' }]);
  assert.deepEqual(partielle.renommes.map(({ figmaId }) => figmaId), ['v0']);
  assert.equal(partielle.annulable, true);
  assert.deepEqual(b.journal()!.renommages, [
    { type: 'variable', id: 'v1', ancienNom: 'b', nouveauNom: 'b2' },
    { type: 'collection', id: 'd', ancienNom: 'Texte', nouveauNom: 'Texte2' },
  ]);
  const toujours = await b.annuler();
  assert.equal(toujours.statut, 'refuse', 'rien ne change tant que la collection reste exclue');
  assert.deepEqual(toujours.sautes.map(({ motif }) => motif), ['exclue', 'exclue']);
  assert.equal(compter(b, 'undo'), 2, 'ni la seconde annulation ni les lignes sautées n’ouvrent de point d’annulation');
  b.stock.delete('exclues');
  const reprise = await b.annuler();
  assert.equal(reprise.statut, 'applique');
  assert.deepEqual([b.nom('v1'), b.nom('d')], ['b', 'Texte']);
  assert.equal(b.journal(), undefined);
});

/** Un document minimal pour le classement : des noms par type et identifiant, et la collection de chaque variable. */
function lecteursDe(noms: Readonly<Record<string, string>>, options: { remote?: readonly string[]; collections?: Readonly<Record<string, string>>; exclues?: readonly string[] } = {}): LecteursDuJournal {
  return {
    objet: (type, figmaId) => {
      const cle = `${type}:${figmaId}`;
      return cle in noms ? { nom: noms[cle], remote: (options.remote ?? []).includes(cle) } : null;
    },
    collectionDeLaVariable: (figmaId) => options.collections?.[figmaId],
    exclues: new Set(options.exclues),
  };
}
const entreeDuJournal = { type: 'variable', id: 'v1', ancienNom: 'a', nouveauNom: 'b' } as const;

test('classer : chaque sort d’une entrée du journal', () => {
  const sort = (noms: Record<string, string>, options?: Parameters<typeof lecteursDe>[1]) => classerLeRenommage(entreeDuJournal, lecteursDe(noms, options));
  assert.equal(sort({ 'variable:v1': 'a' }), 'retabli', 'l’objet porte déjà son ancien nom');
  assert.equal(sort({ 'variable:v1': 'b' }), 'revient');
  assert.equal(sort({ 'variable:v1': 'b~ucm' }), 'revient', 'un nom provisoire du lot compte comme le nom du lot');
  assert.equal(sort({ 'variable:v1': 'a~ucm-2' }), 'revient', 'un nom provisoire d’une annulation interrompue aussi');
  assert.equal(sort({ 'variable:v1': 'autre' }), 'change-depuis');
  assert.equal(sort({}), 'change-depuis', 'l’objet a disparu');
  assert.equal(sort({ 'variable:v1': 'b' }, { remote: ['variable:v1'] }), 'change-depuis', 'un objet distant ne se renomme pas');
  assert.equal(sort({ 'variable:v1': 'b' }, { collections: { v1: 'c1' }, exclues: ['c1'] }), 'exclue');
  assert.equal(sort({ 'variable:v1': 'b' }, { collections: { v1: 'c2' }, exclues: ['c1'] }), 'revient');
});

test('classer : l’ordre des contrôles est celui de l’annulation', () => {
  const exclue = { collections: { v1: 'c1' }, exclues: ['c1'] };
  assert.equal(classerLeRenommage(entreeDuJournal, lecteursDe({ 'variable:v1': 'a' }, exclue)), 'retabli', 'rétabli avant exclue');
  assert.equal(classerLeRenommage(entreeDuJournal, lecteursDe({ 'variable:v1': 'autre' }, exclue)), 'change-depuis', 'changé depuis avant exclue');
  assert.equal(classerLeRenommage(entreeDuJournal, lecteursDe({}, exclue)), 'change-depuis');
});

test('classer : une entrée de collection est exclue quand sa propre collection l’est', () => {
  const collection = { type: 'collection', id: 'c1', ancienNom: 'a', nouveauNom: 'b' } as const;
  assert.equal(classerLeRenommage(collection, lecteursDe({ 'collection:c1': 'b' })), 'revient');
  assert.equal(classerLeRenommage(collection, lecteursDe({ 'collection:c1': 'b' }, { exclues: ['c1'] })), 'exclue');
  assert.equal(classerLeRenommage(collection, lecteursDe({ 'variable:c1': 'b' })), 'change-depuis', 'le type compte : une variable du même identifiant n’est pas la collection');
});

// Les règles d'une version plus récente du plugin

const FUTURE = JSON.stringify({ version: 2 });
const CLES_FUTURES = ['ecriture', 'exclues', 'terme:quux', 'ecart:ucm-etat-hover', 'ordinaire:dark'];

for (const cle of CLES_FUTURES) {
  test(`L12 : une entrée ${cle} de version 2 refuse l’application avant toute écriture`, async () => {
    const b = banc({ variables: [['v1', 'Button/Fill Hover']] });
    b.stock.set(cle, FUTURE);
    const avant = new Map(b.stock);
    const resultat = await b.appliquer([b.v('v1', 'button/fill-hover')]);
    assert.equal(resultat.statut, 'refuse');
    assert.equal(resultat.cause, 'regles-futures');
    assert.deepEqual(resultat.renommes, []);
    assert.equal(resultat.annulable, false);
    assert.equal(b.nom('v1'), 'Button/Fill Hover');
    assert.deepEqual(b.ecritures, [], 'aucun nom écrit');
    assert.deepEqual(b.traces, [], 'ni journal ni point d’annulation');
    assert.deepEqual(b.stock, avant);
  });
}

test('L12 : sans entrée future, la même application renomme', async () => {
  const b = banc({ variables: [['v1', 'Button/Fill Hover']] });
  b.stock.set('terme:quux', JSON.stringify({ version: 1, terme: ['quux'], remplace: [['quuxed']] }));
  const resultat = await b.appliquer([b.v('v1', 'button/fill-hover')]);
  assert.equal(resultat.statut, 'applique');
  assert.equal(b.nom('v1'), 'button/fill-hover');
});

test('L12 : une entrée de version 2 refuse aussi l’annulation, journal et noms intacts', async () => {
  const b = banc({ variables: [['v1', 'Button/Fill Hover']] });
  assert.equal((await b.appliquer([b.v('v1', 'button/fill-hover')])).statut, 'applique');
  b.stock.set('terme:quux', FUTURE);
  const avant = new Map(b.stock);
  b.traces.length = 0;
  const resultat = await b.annuler();
  assert.equal(resultat.statut, 'refuse');
  assert.equal(resultat.cause, 'regles-futures');
  assert.equal(b.nom('v1'), 'button/fill-hover');
  assert.deepEqual(b.traces, []);
  assert.deepEqual(b.stock, avant);
});

test('L12 : reglesFuturesDuStockage nomme les clés futures, et rend une liste vide quand le stockage ne se lit pas', () => {
  const b = banc();
  assert.deepEqual(reglesFuturesDuStockage(b.stockage), []);
  b.stock.set('terme:quux', FUTURE);
  b.stock.set('ecart:x', JSON.stringify({ version: 1 }));
  b.stock.set('distinct:a|b', FUTURE);
  assert.deepEqual(reglesFuturesDuStockage(b.stockage), ['terme:quux']);
  assert.deepEqual(reglesFuturesDuStockage({ ...b.stockage, cles: () => { throw new Error('illisible'); } }), []);
});
