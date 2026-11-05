/**
 * Lot E4c. La fusion de deux variables du même rôle (Q-F2-6, option C) : chaque token et chaque layer du fichier qui visaient la variable
 * retirée visent la gardée, la retirée devient un alias de la gardée et porte la marque `a-retirer`. Le journal de structure garde chaque
 * ligne, un seul point d'annulation est posé, et l'Historique défait le lot. Le second constat qui propose de retirer la variable n'existe pas
 * encore : son critère attend la preuve du mainteneur.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { collectionsDeReference, type CatalogueDeReference, type VariableDuCatalogue } from '@ucm-kit/core/controles';
import { ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

import { CLE_A_RETIRER, annulerLeDernierLotDeStructure, fusionnerLesVariables, type ApiDeStructure, type DemandeDeFusion, type ResultatDeFusion } from '../src/ecriture/structure';
import { lireLeJournalDeStructure, type PortDeRegles } from '../src/ecriture/journal';
import type { PluginMessage } from '../src/messages';
import type { Contexte } from '../src/sandbox/contexte';
import { commencerUneAnalyse, prendreLaPlaceDUneEcriture, reinitialiserLAnalyse } from '../src/sandbox/analyse';
import { oublierLaLectureGardee, traiterAvec, type Acces } from '../src/sandbox/structure';
import { atelierDEcriture, type OptionsDeLEcriture, type VariableDEcriture } from './figmaDeTest';

const CLAIR = 'm-light';
const SOMBRE = 'm-dark';
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const aliasPartout = (id: string) => ({ [CLAIR]: alias(id), [SOMBRE]: alias(id) });

const theme = (id: string, nom: string, vers: string, plus: Partial<VariableDEcriture> = {}): VariableDEcriture =>
  ({ id, key: `k-${id.slice(2)}`, name: nom, scopes: [], collection: 'C:3', valuesByMode: aliasPartout(vers), ...plus });

/** Le fichier : `background` est gardée, `bg` retirée ; un token de composant vise `bg` dans les deux modes, un autre vise déjà `background`. */
const locales = (): VariableDEcriture[] => [
  theme('V:1', 'primary/surface/background', 'V:10'),
  theme('V:2', 'primary/surface/bg', 'V:11'),
  { id: 'V:20', key: 'k-20', name: 'Alert/color/background', scopes: [], collection: 'C:4', valuesByMode: aliasPartout('V:2') },
  { id: 'V:21', key: 'k-21', name: 'Alert/color/border', scopes: [], collection: 'C:4', valuesByMode: aliasPartout('V:1') },
  { id: 'V:10', key: 'k-10', name: 'brands/primary/light/50', scopes: [], collection: 'C:2', valuesByMode: {} },
  { id: 'V:11', key: 'k-11', name: 'brands/primary/light/100', scopes: [], collection: 'C:2', valuesByMode: {} },
];

const DEMANDE: DemandeDeFusion = { garde: { cle: 'k-1', nom: 'primary/surface/background' }, autres: [{ cle: 'k-2', nom: 'primary/surface/bg' }] };

const peinture = (id: string) => ({ type: 'SOLID', boundVariables: { color: alias(id) } });

function monde(options: OptionsDeLEcriture = {}, refuserLeJournal = false) {
  const a = atelierDEcriture({ locales: locales(), ...options });
  const donnees = new Map<string, string>();
  const port: PortDeRegles = {
    cles: () => [...donnees.keys()],
    lire: (cle) => donnees.get(cle) ?? '',
    ecrire: (cle, texte) => {
      if (refuserLeJournal) throw new Error('Figma refuse');
      donnees.set(cle, texte);
    },
    effacer: (cle) => { donnees.delete(cle); },
  };
  let rang = 0;
  const choix = { api: a.api as unknown as ApiDeStructure, stockage: port, heure: () => 'h', lot: () => `lot${rang++}` };
  /** Un cadre lié à `bg` par un champ et par une peinture, un texte dont une plage est peinte en `bg`, une ombre, et un cadre sans rapport. */
  const poserLesLayers = () => {
    a.layer('L1', 'FRAME', { name: 'Fond', fills: [peinture('V:2')], boundVariables: { paddingLeft: alias('V:2') } });
    a.layer('L2', 'TEXT', { name: 'Titre', segments: [{ start: 0, end: 5, fills: [peinture('V:2')] }] });
    a.layer('L3', 'FRAME', { name: 'Ombre', effects: [{ type: 'DROP_SHADOW', boundVariables: { color: alias('V:2') } }] });
    a.layer('L4', 'FRAME', { name: 'Autre', strokes: [peinture('V:1')] });
  };
  return {
    a, port, donnees, poserLesLayers,
    fusionner: (demande: DemandeDeFusion = DEMANDE) => fusionnerLesVariables(demande, choix),
    annuler: () => annulerLeDernierLotDeStructure(choix),
    ecritures: () => a.journal.filter((ligne) => /^(mode|marque|lier|peinture|effet|plage|strokes|fills|effects|supprimer):/u.test(ligne)),
    points: () => a.journal.filter((ligne) => ligne === 'commitUndo').length,
  };
}

const MARQUE = JSON.stringify({ garde: 'k-1' });

test('E4.4 : tokens, layers, alias et marque s’écrivent dans cet ordre, avec un seul point d’annulation', async () => {
  const m = monde();
  m.poserLesLayers();
  const rendu = await m.fusionner();
  assert.deepEqual(rendu, { ecrite: true, touchee: true, tokens: 2, layers: 4 });
  assert.deepEqual(m.ecritures(), [
    `mode:V:20:${CLAIR}:V:1`, `mode:V:20:${SOMBRE}:V:1`,
    'lier:L1.paddingLeft:k-1', 'peinture:k-1', 'fills:L1',
    'peinture:k-1', 'plage:L2[0-5]',
    'effet:k-1', 'effects:L3',
    `mode:V:2:${CLAIR}:V:1`, `mode:V:2:${SOMBRE}:V:1`,
    `marque:V:2:${MARQUE}`,
  ]);
  assert.equal(m.points(), 1);
  assert.deepEqual(m.a.variable('V:20')!.valuesByMode, aliasPartout('V:1'));
  assert.deepEqual(m.a.variable('V:2')!.valuesByMode, aliasPartout('V:1'), 'la retirée est un alias de la gardée');
  assert.equal((m.a.variable('V:2') as unknown as { getSharedPluginData(e: string, c: string): string }).getSharedPluginData(ESPACE_ARCHITECT, CLE_A_RETIRER), MARQUE);
  assert.deepEqual(m.a.variable('V:21')!.valuesByMode, aliasPartout('V:1'), 'un token déjà sur la gardée ne bouge pas');
});

test('E4.4 : les layers liés à la retirée visent la gardée, ceux qui n’y étaient pas liés ne bougent pas', async () => {
  const m = monde();
  m.poserLesLayers();
  await m.fusionner();
  const layer = (id: string) => m.a.api.root.findAll((noeud) => (noeud as { id: string }).id === id)[0] as Record<string, any>;
  assert.deepEqual(layer('L1').boundVariables.paddingLeft, alias('V:1'));
  assert.deepEqual(layer('L1').fills[0].boundVariables.color, alias('V:1'));
  assert.deepEqual(layer('L2').segments[0].fills[0].boundVariables.color, alias('V:1'));
  assert.deepEqual(layer('L3').effects[0].boundVariables.color, alias('V:1'));
  assert.deepEqual(layer('L4').strokes[0].boundVariables.color, alias('V:1'), 'L4 était déjà sur la gardée');
  assert.equal(m.a.journal.filter((ligne) => ligne.endsWith(':L4')).length, 0, 'aucune écriture sur L4');
});

test('E4.4 : le journal garde chaque ligne, dans l’ordre de l’écriture', async () => {
  const m = monde();
  m.poserLesLayers();
  await m.fusionner();
  const lignes = lireLeJournalDeStructure(m.port)?.lignes ?? [];
  assert.deepEqual(lignes.map((ligne) => ligne.sorte), [
    'alias-de-mode', 'alias-de-mode', 'lien-de-layer', 'lien-de-layer', 'lien-de-layer', 'lien-de-layer', 'alias-de-mode', 'alias-de-mode', 'marque',
  ]);
  assert.deepEqual(lignes[0], { sorte: 'alias-de-mode', variable: 'V:20', nom: 'Alert/color/background', mode: CLAIR, avant: 'V:2', apres: 'V:1' });
  assert.deepEqual(lignes[2], { sorte: 'lien-de-layer', variable: 'L1', nom: 'Fond', emplacement: 'champ:paddingLeft', avant: 'V:2', apres: 'V:1' });
  assert.deepEqual(lignes.filter((ligne) => ligne.sorte === 'lien-de-layer').map((ligne) => ligne.sorte === 'lien-de-layer' && `${ligne.variable}.${ligne.emplacement}`), ['L1.champ:paddingLeft', 'L1.fills:0', 'L2.plage:0-5:0', 'L3.effets:0:color']);
  assert.deepEqual(lignes.at(-1), { sorte: 'marque', variable: 'V:2', nom: 'primary/surface/bg' });
});

test('E4.4 : l’Historique défait la fusion en ordre inverse : marque, alias, layers, tokens', async () => {
  const m = monde();
  m.poserLesLayers();
  await m.fusionner();
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 9);
  assert.deepEqual(rendu.sautees, []);
  assert.deepEqual(m.a.variable('V:20')!.valuesByMode, aliasPartout('V:2'));
  assert.deepEqual(m.a.variable('V:2')!.valuesByMode, aliasPartout('V:11'));
  assert.equal((m.a.variable('V:2') as unknown as { getSharedPluginData(e: string, c: string): string }).getSharedPluginData(ESPACE_ARCHITECT, CLE_A_RETIRER), '');
  const layer = (id: string) => m.a.api.root.findAll((noeud) => (noeud as { id: string }).id === id)[0] as Record<string, any>;
  assert.deepEqual(layer('L1').boundVariables.paddingLeft, alias('V:2'));
  assert.deepEqual(layer('L1').fills[0].boundVariables.color, alias('V:2'));
  assert.deepEqual(layer('L3').effects[0].boundVariables.color, alias('V:2'));
  assert.deepEqual(m.port.cles(), []);
});

test('E4.4 : une fusion refaite ne double rien', async () => {
  const m = monde();
  m.poserLesLayers();
  await m.fusionner();
  const avant = m.ecritures().length;
  const rendu = await m.fusionner();
  assert.deepEqual(rendu, { ecrite: false, motif: 'deja-la', touchee: false, tokens: 0, layers: 0 });
  assert.equal(m.ecritures().length, avant);
});

test('E4.4 : trois variables du même rôle se fondent dans la gardée', async () => {
  const m = monde({ locales: [...locales(), theme('V:3', 'primary/surface/Bg', 'V:11')] });
  const rendu = await m.fusionner({ ...DEMANDE, autres: [...DEMANDE.autres, { cle: 'k-3', nom: 'primary/surface/Bg' }] });
  assert.equal(rendu.ecrite, true);
  assert.deepEqual(m.a.variable('V:3')!.valuesByMode, aliasPartout('V:1'));
  assert.deepEqual(m.ecritures().filter((ligne) => ligne.startsWith('marque:')), [`marque:V:2:${MARQUE}`, `marque:V:3:${MARQUE}`]);
});

// Les refus : rien n'est écrit

async function refus(m: ReturnType<typeof monde>, motif: string, demande?: DemandeDeFusion) {
  const rendu = await m.fusionner(demande);
  assert.deepEqual(rendu, { ecrite: false, motif, touchee: false, tokens: 0, layers: 0 });
  assert.deepEqual(m.ecritures(), []);
  assert.equal(m.points(), 0);
  assert.deepEqual(m.port.cles(), []);
}

test('E4.4 : un fichier qui ne déclare plus UCM n’est pas touché', async () => {
  await refus(monde({ declaration: '' }), 'non-ucm');
});

test('E4.4 : une variable renommée ou disparue depuis la lecture saute objet-change', async () => {
  await refus(monde(), 'objet-change', { ...DEMANDE, autres: [{ cle: 'k-2', nom: 'primary/surface/bgg' }] });
  await refus(monde(), 'objet-change', { ...DEMANDE, garde: { cle: 'k-absente', nom: 'primary/surface/background' } });
  await refus(monde(), 'objet-change', { ...DEMANDE, autres: [] });
});

test('E4.4 : deux variables de collections différentes, de types différents ou distantes saute objet-change', async () => {
  await refus(monde({ locales: [...locales().filter(({ id }) => id !== 'V:2'), theme('V:2', 'primary/surface/bg', 'V:11', { collection: 'C:9' })] }), 'objet-change');
  await refus(monde({ locales: [...locales().filter(({ id }) => id !== 'V:2'), theme('V:2', 'primary/surface/bg', 'V:11', { type: 'FLOAT' })] }), 'objet-change');
  await refus(monde({ locales: [...locales().filter(({ id }) => id !== 'V:2'), theme('V:2', 'primary/surface/bg', 'V:11', { remote: true })] }), 'objet-change');
});

test('E4.4 : une gardée qui vise la retirée, ou une retirée à valeur directe, saute fait-faux', async () => {
  await refus(monde({ locales: [theme('V:1', 'primary/surface/background', 'V:2'), ...locales().slice(1)] }), 'fait-faux');
  await refus(monde({ locales: [...locales().filter(({ id }) => id !== 'V:2'), theme('V:2', 'primary/surface/bg', 'V:11', { valuesByMode: { [CLAIR]: alias('V:11'), [SOMBRE]: { r: 1, g: 1, b: 1 } } })] }), 'fait-faux');
});

test('E4.4 : un layer lié à un endroit que la fusion ne sait pas réécrire refuse tout, tokens compris', async () => {
  const m = monde();
  m.a.layer('L9', 'FRAME', { name: 'Composant', boundVariables: { componentProperties: { fond: [alias('V:2')] } } });
  await refus(m, 'non-pris-en-charge');
});

test('E4.4 : un parcours du fichier qui lève refuse la fusion, un usage inconnu resterait lié', async () => {
  const m = monde();
  (m.a.api as unknown as { loadAllPagesAsync: () => Promise<void> }).loadAllPagesAsync = async () => { throw new Error('Figma refuse'); };
  await refus(m, 'erreur');
});

test('E4.4 : un journal que le fichier ne garde pas empêche toute écriture', async () => {
  const m = monde({}, true);
  m.poserLesLayers();
  const rendu = await m.fusionner();
  assert.deepEqual(rendu, { ecrite: false, motif: 'journal-impossible', touchee: false, tokens: 0, layers: 0 });
  assert.deepEqual(m.ecritures(), []);
  assert.equal(m.points(), 0);
});

// L'écriture partielle

test('E4.4 : un layer que Figma refuse laisse la fusion en erreur, ses autres lignes écrites et au journal, et un nouvel essai finit', async () => {
  const refusees = new Set(['L1']);
  const m = monde({ refusees });
  m.poserLesLayers();
  const rendu = await m.fusionner();
  assert.deepEqual(rendu, { ecrite: false, motif: 'erreur', touchee: true, tokens: 2, layers: 2 });
  assert.equal(m.points(), 1);
  const lignes = lireLeJournalDeStructure(m.port)?.lignes ?? [];
  assert.equal(lignes.filter((ligne) => ligne.sorte === 'lien-de-layer').length, 2, 'seuls les liens écrits restent au journal');
  assert.ok(!lignes.some((ligne) => ligne.sorte === 'lien-de-layer' && ligne.variable === 'L1'));
  assert.equal(lignes.at(-1)?.sorte, 'marque', 'la variable retirée est quand même un alias marqué');
  refusees.delete('L1');
  const reprise = await m.fusionner();
  assert.deepEqual(reprise, { ecrite: true, touchee: true, tokens: 0, layers: 2 });
  const layer = m.a.api.root.findAll((noeud) => (noeud as { id: string }).id === 'L1')[0] as Record<string, any>;
  assert.deepEqual(layer.boundVariables.paddingLeft, alias('V:1'));
});

test('E4.4 : une variable retirée que Figma refuse d’écrire laisse tout en erreur sans point d’annulation', async () => {
  const m = monde({ refusees: new Set(['V:2', 'V:20', 'marque:V:2']) });
  const rendu = await m.fusionner();
  assert.deepEqual(rendu, { ecrite: false, motif: 'erreur', touchee: false, tokens: 0, layers: 0 });
  assert.equal(m.points(), 0);
  assert.deepEqual(m.port.cles(), []);
});

// Le sandbox

/** Un thème dont la palette `primary` écrit `surface/default` deux fois : le kit pose la question `role-en-double`. */
const catalogueEnDouble = (): CatalogueDeReference => {
  const variable = (nom: string, cle: string): VariableDuCatalogue => ({ cle, nom, collection: 'theme', type: 'COLOR', etat: 'presente', valeurs: { 'M:light': { valeur: '#ffffff' }, 'M:dark': { valeur: '#000000' } } });
  const collections = collectionsDeReference([{ cle: 'theme', nom: 'theme', modes: [{ id: 'M:light', nom: 'light' }, { id: 'M:dark', nom: 'dark' }], etat: 'lue' }], 'ucm');
  return { version: 1, library: null, collections, variables: [variable('primary/surface/default', 'k-a'), variable('primary/surface/Default', 'k-b')] };
};
const ID_DU_CONSTAT = 'C82:role-en-double:theme:primary/surface/default';

function bancDuSandbox(fusion?: (demande: DemandeDeFusion) => Promise<ResultatDeFusion>) {
  reinitialiserLAnalyse();
  oublierLaLectureGardee();
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  const appels: DemandeDeFusion[] = [];
  const acces: Acces = {
    catalogue: async () => catalogueEnDouble(),
    reglages: async () => ({ ecriture: null, cles: [] }),
    ecrire: async () => ({ ecrites: [], sautees: [], sansAnnulation: [] }),
    rangement: () => { throw new Error('inutile'); },
    ...(fusion ? { fusionner: async (demande: DemandeDeFusion) => { appels.push(demande); return fusion(demande); } } : {}),
  };
  const traiter = traiterAvec(acces);
  const fusionner = (garder: string, constat = ID_DU_CONSTAT) => traiter({ type: 'fusionner-variables', demande: 5, constat, garder }, contexte);
  const reponse = () => [...envoyes].reverse().find((message) => message.type === 'structure-appliquee') as Extract<PluginMessage, { type: 'structure-appliquee' }>;
  return { envoyes, contexte, traiter, appels, fusionner, reponse, lire: () => traiter({ type: 'lire-structure', demande: 1 }, contexte) };
}

const ECRITE: ResultatDeFusion = { ecrite: true, touchee: true, tokens: 3, layers: 2 };

test('E4.4 : le sandbox fusionne les autres candidates du constat lu dans celle que le designer garde, puis périme l’analyse', async () => {
  const b = bancDuSandbox(async () => ECRITE);
  const identite = commencerUneAnalyse('jeu', ['1:1'], b.contexte);
  void identite;
  await b.lire();
  b.envoyes.length = 0;
  await b.fusionner('k-a');
  assert.deepEqual(b.appels, [{ garde: { cle: 'k-a', nom: 'primary/surface/default' }, autres: [{ cle: 'k-b', nom: 'primary/surface/Default' }] }]);
  assert.deepEqual(b.envoyes[0], { type: 'structure-appliquee', demande: 5, ecrites: 1, sautees: [], sansAnnulation: [] });
  assert.ok(b.envoyes.some((message) => message.type === 'perime' && message.cause === 'ecriture'));
});

test('E4.4 : le motif d’une fusion non écrite remonte sous l’identifiant du constat, sans périmer quand rien n’a changé', async () => {
  const b = bancDuSandbox(async () => ({ ecrite: false, motif: 'fait-faux', touchee: false, tokens: 0, layers: 0 }));
  commencerUneAnalyse('jeu', ['1:1'], b.contexte);
  await b.lire();
  b.envoyes.length = 0;
  await b.fusionner('k-b');
  assert.deepEqual(b.reponse(), { type: 'structure-appliquee', demande: 5, ecrites: 0, sautees: [{ id: ID_DU_CONSTAT, motif: 'fait-faux' }], sansAnnulation: [] });
  assert.ok(!b.envoyes.some((message) => message.type === 'perime'));
});

test('E4.4 : une fusion partielle ou une écriture qui lève saute en erreur, et périme l’analyse', async () => {
  const partielle = bancDuSandbox(async () => ({ ecrite: false, motif: 'erreur', touchee: true, tokens: 1, layers: 0 }));
  commencerUneAnalyse('jeu', ['1:1'], partielle.contexte);
  await partielle.lire();
  partielle.envoyes.length = 0;
  await partielle.fusionner('k-a');
  assert.deepEqual(partielle.reponse().sautees, [{ id: ID_DU_CONSTAT, motif: 'erreur' }]);
  assert.ok(partielle.envoyes.some((message) => message.type === 'perime'));

  const leve = bancDuSandbox(async () => { throw new Error('Figma'); });
  commencerUneAnalyse('jeu', ['1:1'], leve.contexte);
  await leve.lire();
  leve.envoyes.length = 0;
  await leve.fusionner('k-a');
  assert.deepEqual(leve.reponse().sautees, [{ id: ID_DU_CONSTAT, motif: 'erreur' }]);
  assert.ok(leve.envoyes.some((message) => message.type === 'perime'));
});

test('E4.4 : la demande ne décide de rien : un constat inconnu, une clé qui n’est pas candidate ou un accès sans fusion saute correction-inconnue', async () => {
  const b = bancDuSandbox(async () => ECRITE);
  await b.lire();
  await b.fusionner('k-a', 'C82:role-en-double:theme:autre');
  assert.deepEqual(b.reponse().sautees, [{ id: 'C82:role-en-double:theme:autre', motif: 'correction-inconnue' }]);
  await b.fusionner('k-inconnue');
  assert.deepEqual(b.reponse().sautees, [{ id: ID_DU_CONSTAT, motif: 'correction-inconnue' }]);
  assert.deepEqual(b.appels, []);
  const sansFusion = bancDuSandbox();
  await sansFusion.lire();
  await sansFusion.fusionner('k-a');
  assert.deepEqual(sansFusion.reponse().sautees, [{ id: ID_DU_CONSTAT, motif: 'correction-inconnue' }]);
});

test('E4.4 : une autre écriture en cours rend occupe, sans fusionner', async () => {
  const b = bancDuSandbox(async () => ECRITE);
  await b.lire();
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'autre', generation: 1 });
  assert.ok('liberer' in place);
  await b.fusionner('k-a');
  assert.deepEqual(b.reponse().sautees, [{ id: ID_DU_CONSTAT, motif: 'occupe' }]);
  assert.deepEqual(b.appels, []);
  place.liberer();
});
