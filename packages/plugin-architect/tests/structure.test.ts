/**
 * L'écriture des corrections de structure du mode Tokens (scopes, cible d'alias par mode), leur journal et leur annulation, la
 * défaite d'une création de variable, et le domaine `structure` du sandbox qui les aiguille.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogueDeReference, Correction } from '@ucm-kit/core/controles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { catalogueDuFichier } from '../src/catalogue';
import { annulerLeDernierLotDeStructure, ecrireLaStructure, type ApiDeStructure } from '../src/ecriture/structure';
import { CLE_JOURNAL_DE_STRUCTURE, journaliserLesCreations, lireLeJournalDeStructure, rangerLeJournalDeStructure, type PortDeRegles } from '../src/ecriture/journal';
import type { PluginMessage } from '../src/messages';
import type { VariableRelevee } from '../src/modele';
import { commencerUneAnalyse, prendreLaPlaceDUneEcriture, reinitialiserLAnalyse } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { traiterAvec, type Acces } from '../src/sandbox/structure';
import { atelierDEcriture, type OptionsDeLEcriture, type VariableDEcriture } from './figmaDeTest';

const COLLECTION = 'C:1';
const CLAIR = 'C:1:light';
const SOMBRE = 'C:1:dark';
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

const defaut = (): VariableDEcriture => ({
  id: 'V:1', key: 'k-defaut', name: 'success/surface/default', scopes: ['TEXT_FILL'], collection: COLLECTION,
  valuesByMode: { [CLAIR]: alias('V:10'), [SOMBRE]: alias('V:10') },
});
const primitive = (id: string, nom: string): VariableDEcriture => ({ id, key: `k-${id.slice(2)}`, name: nom, scopes: [], valuesByMode: {}, collection: 'C:2' });
const clair = (): VariableDEcriture => primitive('V:10', 'brands/success/light/600');
const sombre = (): VariableDEcriture => primitive('V:11', 'brands/success/dark/600');

const scope = (extras: Partial<Correction> = {}): Correction => ({
  id: 'C63:k-defaut:scopes', sorte: 'scope', cible: { variable: 'k-defaut' }, avant: 'TEXT_FILL', apres: { nom: 'FRAME_FILL,SHAPE_FILL' },
  aRelire: { regle: 'Le chemin success/surface/default déclare les scopes.', avant: 'TEXT_FILL' }, ...extras,
});
const versLeSombre = (extras: Partial<Correction> = {}): Correction => ({
  id: `C60:k-defaut:${SOMBRE}`, sorte: 'alias-de-mode', cible: { variable: 'k-defaut', mode: SOMBRE }, avant: 'k-10', apres: { cle: 'k-11', nom: 'brands/success/dark/600' },
  aRelire: { axes: { mode: 'dark' }, regle: 'La cible suit le mode.', avant: 'k-10' }, ...extras,
});

/** Un stockage en mémoire ; `refuser` fait lever l'écriture des clés qu'il retient. */
function stockageEnMemoire(refuser: (cle: string) => boolean = () => false) {
  const donnees = new Map<string, string>();
  const port: PortDeRegles = {
    cles: () => [...donnees.keys()],
    lire: (cle) => donnees.get(cle) ?? '',
    ecrire: (cle, texte) => {
      if (refuser(cle)) throw new Error('Figma refuse');
      donnees.set(cle, texte);
    },
    effacer: (cle) => { donnees.delete(cle); },
  };
  return { donnees, port };
}

function monde(options: OptionsDeLEcriture = {}, refuser?: (cle: string) => boolean) {
  const a = atelierDEcriture({ locales: [defaut(), clair(), sombre()], ...options });
  const { port, donnees } = stockageEnMemoire(refuser);
  const api = a.api as unknown as ApiDeStructure;
  let rang = 0;
  const choix = { api, stockage: port, heure: () => 'h', lot: () => `lot${rang++}` };
  return {
    a, port, donnees,
    ecrire: (corrections: readonly Correction[]) => ecrireLaStructure(corrections, choix),
    annuler: () => annulerLeDernierLotDeStructure(choix),
    ecritures: () => a.journal.filter((ligne) => /^(scopes|mode|supprimer):/u.test(ligne)),
    points: () => a.journal.filter((ligne) => ligne === 'commitUndo').length,
  };
}

// L'écriture : scopes

test('scope : les scopes attendus s’écrivent, le journal garde les scopes d’avant, un seul point d’annulation', async () => {
  const m = monde();
  assert.deepEqual(await m.ecrire([scope()]), { ecrites: ['C63:k-defaut:scopes'], sautees: [] });
  assert.deepEqual(m.a.variable('V:1')!.scopes, ['FRAME_FILL', 'SHAPE_FILL']);
  assert.deepEqual(m.ecritures(), ['scopes:V:1:FRAME_FILL,SHAPE_FILL']);
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes, [{ sorte: 'scopes', variable: 'V:1', nom: 'success/surface/default', avant: ['TEXT_FILL'], apres: ['FRAME_FILL', 'SHAPE_FILL'] }]);
  assert.equal(m.points(), 1);
});

test('scope : des scopes qui ont changé depuis l’analyse sont sautés en fait-faux, sans écriture ni journal', async () => {
  const m = monde({ locales: [{ ...defaut(), scopes: ['ALL_SCOPES'] }, clair(), sombre()] });
  assert.deepEqual(await m.ecrire([scope()]), { ecrites: [], sautees: [{ id: 'C63:k-defaut:scopes', motif: 'fait-faux' }] });
  assert.deepEqual(m.ecritures(), []);
  assert.equal(m.points(), 0);
  assert.deepEqual(m.port.cles(), []);
});

test('scope : une variable disparue est sautée en objet-change', async () => {
  const m = monde();
  const rendu = await m.ecrire([scope({ cible: { variable: 'k-absente' } })]);
  assert.deepEqual(rendu.sautees, [{ id: 'C63:k-defaut:scopes', motif: 'objet-change' }]);
  assert.deepEqual(m.ecritures(), []);
});

test('scope : une écriture que Figma refuse saute erreur, les autres s’écrivent et seules elles entrent au journal', async () => {
  const autre: VariableDEcriture = { id: 'V:5', key: 'k-autre', name: 'success/surface/foreground', scopes: ['TEXT_FILL'], valuesByMode: {}, collection: COLLECTION };
  const m = monde({ locales: [defaut(), autre], refusees: new Set(['V:1']) });
  const rendu = await m.ecrire([scope(), scope({ id: 'C63:k-autre:scopes', cible: { variable: 'k-autre' } })]);
  assert.deepEqual(rendu, { ecrites: ['C63:k-autre:scopes'], sautees: [{ id: 'C63:k-defaut:scopes', motif: 'erreur' }] });
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes.map((ligne) => ligne.variable), ['V:5']);
  assert.equal(m.points(), 1);
});

test('scope : sans écriture, le journal précédent reste en place et aucun point d’annulation n’est posé', async () => {
  const m = monde({ refusees: new Set(['V:1']) });
  rangerLeJournalDeStructure(m.port, { heure: 'avant', lignes: [{ sorte: 'creation', variable: 'V:99', nom: 'x', collection: 'C:2' }] }, 'ancien');
  const rendu = await m.ecrire([scope()]);
  assert.deepEqual(rendu.sautees, [{ id: 'C63:k-defaut:scopes', motif: 'erreur' }]);
  assert.equal(lireLeJournalDeStructure(m.port)?.heure, 'avant');
  assert.equal(m.points(), 0);
});

// L'écriture : cible d'alias par mode

test('alias-de-mode : le mode pointe vers la nouvelle cible, le journal garde l’ancienne', async () => {
  const m = monde();
  assert.deepEqual(await m.ecrire([versLeSombre()]), { ecrites: [`C60:k-defaut:${SOMBRE}`], sautees: [] });
  assert.deepEqual(m.a.variable('V:1')!.valuesByMode[SOMBRE], alias('V:11'));
  assert.deepEqual(m.a.variable('V:1')!.valuesByMode[CLAIR], alias('V:10'), 'l’autre mode ne bouge pas');
  assert.deepEqual(m.ecritures(), [`mode:V:1:${SOMBRE}:V:11`]);
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes, [{ sorte: 'alias-de-mode', variable: 'V:1', nom: 'success/surface/default', mode: SOMBRE, avant: 'V:10', apres: 'V:11' }]);
  assert.equal(m.points(), 1);
});

test('alias-de-mode : un alias qui a changé depuis l’analyse est sauté en fait-faux', async () => {
  const m = monde();
  const rendu = await m.ecrire([versLeSombre({ aRelire: { axes: { mode: 'dark' }, regle: 'r', avant: 'k-autre' } })]);
  assert.deepEqual(rendu.sautees, [{ id: `C60:k-defaut:${SOMBRE}`, motif: 'fait-faux' }]);
  assert.deepEqual(m.ecritures(), []);
});

test('alias-de-mode : une valeur qui n’est plus un alias exact est sautée en fait-faux', async () => {
  const brute: VariableDEcriture = { ...defaut(), valuesByMode: { [CLAIR]: alias('V:10'), [SOMBRE]: { r: 1, g: 0, b: 0, a: 1 } } };
  const m = monde({ locales: [brute, clair(), sombre()] });
  assert.deepEqual((await m.ecrire([versLeSombre()])).sautees, [{ id: `C60:k-defaut:${SOMBRE}`, motif: 'fait-faux' }]);
});

test('alias-de-mode : un mode disparu est sauté en objet-change, une cible absente en cible-introuvable', async () => {
  const m = monde();
  assert.deepEqual((await m.ecrire([versLeSombre({ cible: { variable: 'k-defaut', mode: 'C:1:disparu' } })])).sautees[0]?.motif, 'objet-change');
  assert.deepEqual((await m.ecrire([versLeSombre({ apres: { cle: 'k-absente', nom: 'brands/success/dark/600' } })])).sautees[0]?.motif, 'cible-introuvable');
  assert.deepEqual(m.ecritures(), []);
});

// L'écriture : garde-fous

test('hors UCM, rien ne s’écrit : chaque correction saute non-ucm', async () => {
  const m = monde({ declaration: texteDeLArchitectureDuFichier(false) });
  const rendu = await m.ecrire([scope(), versLeSombre()]);
  assert.deepEqual(rendu.sautees.map(({ motif }) => motif), ['non-ucm', 'non-ucm']);
  assert.deepEqual(m.ecritures(), []);
  assert.deepEqual(m.port.cles(), []);
});

test('un fichier qui ne peut pas garder le journal : aucune écriture, journal-impossible', async () => {
  const m = monde({}, () => true);
  const rendu = await m.ecrire([scope(), versLeSombre()]);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'C63:k-defaut:scopes', motif: 'journal-impossible' }, { id: `C60:k-defaut:${SOMBRE}`, motif: 'journal-impossible' }] });
  assert.deepEqual(m.ecritures(), []);
  assert.equal(m.points(), 0);
});

test('un lot de scopes et d’alias pose un seul point d’annulation, et les autres sortes sont ignorées', async () => {
  const m = monde();
  const liaison: Correction = { id: 'L', sorte: 'liaison', cible: { layer: '1:1' }, avant: null, apres: { nom: 'x' }, aRelire: { regle: 'r', avant: null } };
  const rendu = await m.ecrire([scope(), versLeSombre(), liaison]);
  assert.equal(rendu.ecrites.length, 2);
  assert.deepEqual(rendu.sautees, []);
  assert.equal(m.points(), 1);
  assert.equal(lireLeJournalDeStructure(m.port)?.lignes.length, 2);
});

// L'annulation : scopes

test('annuler des scopes : les scopes d’avant reviennent, le journal s’efface, un point d’annulation de plus', async () => {
  const m = monde();
  await m.ecrire([scope()]);
  const rendu = await m.annuler();
  assert.deepEqual(rendu, { journal: 'lu', defaites: 1, sautees: [], restantes: 0, limiteDesUsages: false });
  assert.deepEqual(m.a.variable('V:1')!.scopes, ['TEXT_FILL']);
  assert.deepEqual(m.port.cles(), []);
  assert.equal(m.points(), 2);
});

test('annuler des scopes changés depuis : la ligne est sautée en objet-change et reste au journal', async () => {
  const m = monde();
  await m.ecrire([scope()]);
  m.a.variable('V:1')!.scopes = ['ALL_SCOPES'];
  const rendu = await m.annuler();
  assert.deepEqual(rendu.sautees, [{ variable: 'V:1', sorte: 'scopes', motif: 'objet-change' }]);
  assert.equal(rendu.defaites, 0);
  assert.equal(rendu.restantes, 1);
  assert.deepEqual(m.a.variable('V:1')!.scopes, ['ALL_SCOPES']);
  assert.equal(lireLeJournalDeStructure(m.port)?.lignes.length, 1);
  assert.equal(m.points(), 1, 'sans défaite, pas de point d’annulation');
});

// L'annulation : cible d'alias par mode

test('annuler une cible d’alias : le mode reprend l’alias d’avant', async () => {
  const m = monde();
  await m.ecrire([versLeSombre()]);
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 1);
  assert.deepEqual(m.a.variable('V:1')!.valuesByMode[SOMBRE], alias('V:10'));
  assert.deepEqual(m.port.cles(), []);
});

test('annuler une cible d’alias changée depuis : la ligne est sautée', async () => {
  const m = monde();
  await m.ecrire([versLeSombre()]);
  m.a.variable('V:1')!.setValueForMode(SOMBRE, alias('V:12'));
  const rendu = await m.annuler();
  assert.deepEqual(rendu.sautees, [{ variable: 'V:1', sorte: 'alias-de-mode', motif: 'objet-change' }]);
  assert.deepEqual(m.a.variable('V:1')!.valuesByMode[SOMBRE], alias('V:12'));
});

// L'annulation : création

const creation = { variable: 'V:20', nom: 'button/size/md', collection: 'C:2' };
const creee = (extras: Partial<VariableDEcriture> = {}): VariableDEcriture => ({ id: 'V:20', key: 'k-20', name: 'button/size/md', scopes: [], valuesByMode: {}, collection: 'C:2', ...extras });

test('annuler une création : la variable sans usage est supprimée, la limite des autres fichiers est dite', async () => {
  const m = monde({ locales: [defaut(), clair(), creee()] });
  assert.equal(journaliserLesCreations(m.port, [creation], { heure: () => 'h', lot: () => 'creation' }), true);
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 1);
  assert.equal(rendu.limiteDesUsages, true);
  assert.equal(m.a.variable('V:20'), undefined);
  assert.deepEqual(m.ecritures(), ['supprimer:V:20']);
  assert.deepEqual(m.port.cles(), []);
});

test('annuler une création : une variable qui a gagné un alias n’est pas supprimée', async () => {
  const autre: VariableDEcriture = { ...defaut(), valuesByMode: { [CLAIR]: alias('V:10'), [SOMBRE]: alias('V:20') } };
  const m = monde({ locales: [autre, clair(), creee()] });
  journaliserLesCreations(m.port, [creation]);
  const rendu = await m.annuler();
  assert.deepEqual(rendu.sautees, [{ variable: 'V:20', sorte: 'creation', motif: 'usage-ajoute' }]);
  assert.equal(rendu.limiteDesUsages, true);
  assert.ok(m.a.variable('V:20'));
  assert.deepEqual(m.ecritures(), []);
  assert.equal(lireLeJournalDeStructure(m.port)?.lignes.length, 1);
});

test('annuler une création : une variable qu’un layer du fichier utilise n’est pas supprimée', async () => {
  const m = monde({ locales: [defaut(), creee()] });
  m.a.layer('1:1', 'FRAME', { boundVariables: { paddingLeft: alias('V:20') } });
  journaliserLesCreations(m.port, [creation]);
  const rendu = await m.annuler();
  assert.deepEqual(rendu.sautees.map(({ motif }) => motif), ['usage-ajoute']);
  assert.ok(m.a.variable('V:20'));
});

test('annuler une création : un texte illisible conserve la variable et le journal', async () => {
  const m = monde({ locales: [defaut(), creee()] });
  const texte = m.a.layer('1:1', 'TEXT');
  texte.getStyledTextSegments = () => { throw new Error('segments illisibles'); };
  journaliserLesCreations(m.port, [creation]);

  const rendu = await m.annuler();

  assert.deepEqual(rendu.sautees, [{ variable: 'V:20', sorte: 'creation', motif: 'usage-illisible' }]);
  assert.ok(m.a.variable('V:20'));
  assert.equal(lireLeJournalDeStructure(m.port)?.lignes.length, 1);
  assert.deepEqual(m.ecritures(), []);
});

test('annuler une création : une peinture liée compte comme un usage', async () => {
  const m = monde({ locales: [defaut(), creee()] });
  m.a.layer('1:1', 'FRAME', { fills: [{ type: 'SOLID', boundVariables: { color: alias('V:20') } }] });
  journaliserLesCreations(m.port, [creation]);
  assert.deepEqual((await m.annuler()).sautees.map(({ motif }) => motif), ['usage-ajoute']);
});

test('annuler une création : une variable renommée depuis est sautée en objet-change', async () => {
  const m = monde({ locales: [defaut(), creee({ name: 'button/size/lg' })] });
  journaliserLesCreations(m.port, [creation]);
  assert.deepEqual((await m.annuler()).sautees.map(({ motif }) => motif), ['objet-change']);
  assert.ok(m.a.variable('V:20'));
});

test('annuler une création : une variable déjà supprimée sort du journal sans écriture', async () => {
  const m = monde({ locales: [defaut()] });
  journaliserLesCreations(m.port, [creation]);
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 0);
  assert.equal(rendu.restantes, 0);
  assert.deepEqual(m.port.cles(), []);
  assert.equal(m.points(), 0);
});

test('annuler un lot : l’alias revient avant que la variable créée soit retirée, et seule la ligne sautée reste', async () => {
  const visant: VariableDEcriture = { ...defaut(), valuesByMode: { [CLAIR]: alias('V:10'), [SOMBRE]: alias('V:20') } };
  const m = monde({ locales: [visant, clair(), creee()] });
  rangerLeJournalDeStructure(m.port, {
    heure: 'h',
    lignes: [{ sorte: 'creation', ...creation }, { sorte: 'alias-de-mode', variable: 'V:1', nom: 'success/surface/default', mode: SOMBRE, avant: 'V:10', apres: 'V:20' }],
  }, 'lot-b8');
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 2);
  assert.deepEqual(m.ecritures(), [`mode:V:1:${SOMBRE}:V:10`, 'supprimer:V:20']);
  assert.deepEqual(m.port.cles(), []);
});

test('annuler un lot dont une ligne est sautée : les autres sont défaites et le journal ne garde que celle-là', async () => {
  const autre: VariableDEcriture = { ...defaut(), scopes: ['FRAME_FILL', 'SHAPE_FILL'], valuesByMode: { [CLAIR]: alias('V:10'), [SOMBRE]: alias('V:20') } };
  const m = monde({ locales: [autre, creee()] });
  rangerLeJournalDeStructure(m.port, {
    heure: 'h',
    lignes: [{ sorte: 'creation', ...creation }, { sorte: 'scopes', variable: 'V:1', nom: 'success/surface/default', avant: ['TEXT_FILL'], apres: ['FRAME_FILL', 'SHAPE_FILL'] }],
  }, 'lot-b8');
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 1);
  assert.equal(rendu.restantes, 1);
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes.map(({ sorte }) => sorte), ['creation']);
  assert.deepEqual(m.a.variable('V:1')!.scopes, ['TEXT_FILL']);
});

test('sans journal rien ne bouge ; un journal illisible reste tel quel', async () => {
  const m = monde();
  assert.equal((await m.annuler()).journal, 'absent');
  m.port.ecrire(CLE_JOURNAL_DE_STRUCTURE, 'pas du json');
  assert.equal((await m.annuler()).journal, 'illisible');
  assert.equal(m.port.lire(CLE_JOURNAL_DE_STRUCTURE), 'pas du json');
  assert.equal(m.points(), 0);
});

// Le domaine du sandbox

function contexteDeTest() {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  return { contexte, envoyes };
}

const catalogueAvecUnScopeFaux = (): CatalogueDeReference => ({
  version: 1,
  library: null,
  collections: [{ cle: COLLECTION, nom: 'theme', role: 'theme', modes: [{ id: CLAIR, nom: 'light' }], etat: 'lue' }],
  variables: [{ cle: 'k-defaut', nom: 'success/surface/default', collection: COLLECTION, type: 'COLOR', etat: 'presente', scopes: ['TEXT_FILL'], valeurs: { [CLAIR]: { valeur: '#ffffff' } } }],
});

function acces(catalogue: CatalogueDeReference | null, ecrire: Acces['ecrire'] = async () => ({ ecrites: [], sautees: [] })): Acces & { appels: Correction[][] } {
  const appels: Correction[][] = [];
  return { appels, catalogue: async () => catalogue, ecrire: async (corrections) => { appels.push([...corrections]); return ecrire(corrections); } };
}

test('lire-structure rend les constats du kit et leurs corrections ; hors UCM, des listes vides', async () => {
  const { contexte, envoyes } = contexteDeTest();
  await traiterAvec(acces(catalogueAvecUnScopeFaux()))({ type: 'lire-structure', demande: 3 }, contexte);
  const message = envoyes[0] as Extract<PluginMessage, { type: 'structure' }>;
  assert.equal(message.demande, 3);
  assert.deepEqual(message.constats.map(({ code }) => code), ['C63']);
  assert.deepEqual(message.corrections.map(({ id, sorte }) => [id, sorte]), [['C63:k-defaut:scopes', 'scope']]);
  const hors = contexteDeTest();
  await traiterAvec(acces(null))({ type: 'lire-structure', demande: 4 }, hors.contexte);
  assert.deepEqual(hors.envoyes, [{ type: 'structure', demande: 4, constats: [], corrections: [] }]);
});

test('appliquer-structure n’écrit que les corrections du dernier constat lu, puis les oublie', async () => {
  const { contexte, envoyes } = contexteDeTest();
  const double = acces(catalogueAvecUnScopeFaux(), async (corrections) => ({ ecrites: corrections.map(({ id }) => id), sautees: [] }));
  const traiter = traiterAvec(double);
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  await traiter({ type: 'appliquer-structure', demande: 2, ids: ['C63:k-defaut:scopes', 'inconnue', 'C63:k-defaut:scopes'] }, contexte);
  assert.deepEqual(envoyes[1], { type: 'structure-appliquee', demande: 2, ecrites: 1, sautees: [{ id: 'inconnue', motif: 'correction-inconnue' }] });
  assert.equal(double.appels.length, 1);
  assert.deepEqual(double.appels[0]!.map(({ id }) => id), ['C63:k-defaut:scopes']);
  await traiter({ type: 'appliquer-structure', demande: 3, ids: ['C63:k-defaut:scopes'] }, contexte);
  assert.deepEqual(envoyes[2], { type: 'structure-appliquee', demande: 3, ecrites: 0, sautees: [{ id: 'C63:k-defaut:scopes', motif: 'correction-inconnue' }] });
  assert.equal(double.appels.length, 1, 'une correction oubliée n’est pas écrite');
});

test('appliquer-structure : une écriture qui lève saute tout en erreur, une opération en cours rend occupe', async () => {
  const { contexte, envoyes } = contexteDeTest();
  const traiter = traiterAvec(acces(catalogueAvecUnScopeFaux(), async () => { throw new Error('Figma'); }));
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  await traiter({ type: 'appliquer-structure', demande: 2, ids: ['C63:k-defaut:scopes'] }, contexte);
  assert.deepEqual(envoyes[1], { type: 'structure-appliquee', demande: 2, ecrites: 0, sautees: [{ id: 'C63:k-defaut:scopes', motif: 'erreur' }] });

  await traiter({ type: 'lire-structure', demande: 3 }, contexte);
  const place = prendreLaPlaceDUneEcriture({ sujet: 'autre', generation: 1 });
  assert.ok('liberer' in place);
  await traiter({ type: 'appliquer-structure', demande: 4, ids: ['C63:k-defaut:scopes'] }, contexte);
  assert.deepEqual(envoyes.at(-1), { type: 'structure-appliquee', demande: 4, ecrites: 0, sautees: [{ id: 'C63:k-defaut:scopes', motif: 'occupe' }] });
  place.liberer();
});

test('appliquer-structure périme l’analyse du composant quand une correction s’écrit', async () => {
  reinitialiserLAnalyse();
  const { contexte, envoyes } = contexteDeTest();
  const traiter = traiterAvec(acces(catalogueAvecUnScopeFaux(), async (corrections) => ({ ecrites: corrections.map(({ id }) => id), sautees: [] })));
  commencerUneAnalyse('jeu', ['1:1'], contexte);
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  await traiter({ type: 'appliquer-structure', demande: 2, ids: ['C63:k-defaut:scopes'] }, contexte);
  assert.ok(envoyes.some((message) => message.type === 'perime' && message.cause === 'ecriture'));
  reinitialiserLAnalyse();
});

test('le catalogue du fichier nomme la cible d’un alias par sa clé, comme les corrections du kit', () => {
  const lues: VariableRelevee[] = [
    { id: 'V:1', nom: 'success/surface/default', description: '', cle: 'k-defaut', distante: false, masqueeALaPublication: false, collection: COLLECTION, type: 'COLOR', portees: ['TEXT_FILL'], syntaxe: {}, valeurs: { [CLAIR]: { nature: 'alias' as const, cible: 'V:10' } } },
    { id: 'V:10', nom: 'brands/success/light/600', description: '', cle: 'k-10', distante: false, masqueeALaPublication: false, collection: 'C:2', type: 'COLOR', portees: [], syntaxe: {}, valeurs: {} },
  ];
  const catalogue = catalogueDuFichier({ collections: [], variables: lues }, 'ucm');
  assert.deepEqual(catalogue.variables[0]!.valeurs, { [CLAIR]: { alias: 'k-10' } });
});
