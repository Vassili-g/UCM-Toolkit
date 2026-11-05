/**
 * Lot E4b. Une lecture qui n'aboutit pas le dit (E4.2), chaque motif de saut a sa phrase (E4.2), un constat de scopes dont la
 * proposition est retirée garde sa carte et se range sous Ignorés (E4.3), et l'alias de mode d'un C63 du mode Composant s'écrit (E4.5).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogueDeReference, Constat, Correction } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { PluginMessage } from '../src/messages';
import type { Constat as ConstatDeMessage, Correction as CorrectionDeMessage } from '../src/messages/commun';
import type { DemandeDeStructure } from '../src/messages/structure';
import type { Bilan } from '../src/messages/nomenclature';

import { comme, poserLeDom } from './domDeTest';

poserLeDom();

const images: Array<() => void> = [];
Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (texte: string) => texte } });
Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (image: () => void) => images.push(image) });
Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: comme(document.createElement('div')).constructor });
Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: class { observe(): void {} } });
const corps = comme(document.createElement('div'));
Object.assign(document, { body: corps, addEventListener() {}, removeEventListener() {} });

import { commencerUneAnalyse, reinitialiserLAnalyse, retenirLesCorrections } from '../src/sandbox/analyse';
import { traiterAvec as traiterLesCorrectionsAvec, type Ecritures } from '../src/sandbox/corrections';
import type { Contexte } from '../src/sandbox/contexte';
import { ACCES_DE_FIGMA, RefusDeFigma, oublierLaLectureGardee, traiterAvec, type Acces } from '../src/sandbox/structure';
import { monterLesCorrections } from '../src/ui/corrections';
import { cartesDeCorrections, type ContexteDeCartes } from '../src/ui/corrections/modele';
import { recevoirUneAnalyse } from '../src/ui/composant/analyse';
import { etatInitial } from '../src/ui/etat';
import { elementsDuPanneau } from '../src/ui/panneau/elements';
import { monterStructure } from '../src/ui/structure';
import type { Coquille } from '../src/ui/nomenclature/coquille';
import { GROUPES, lireLesConstats, type Noms } from '../src/ui/structure/lecture';
import { SANS_RENOMMAGES } from '../src/ui/tokens/cochage';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';
import { TEXTES } from '../src/ui/textes';
import { annulerLeDernierLotDeStructure, ecrireLaStructure, type ApiDeStructure } from '../src/ecriture/structure';
import { lireLeJournalDeStructure, type PortDeRegles } from '../src/ecriture/journal';
import { atelierDEcriture, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { rienAFaire: Bilan } };

const SANS_NOMS: Noms = { nom: () => null, cle: () => null };
const element = (): HTMLElement => document.createElement('div');

// ---------------------------------------------------------------------------------------------------------------------------
// E4.2 : le sandbox dit pourquoi la lecture n'a pas abouti

function contexteDeTest(figma: unknown = {}) {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: figma as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  const derniere = (): Extract<PluginMessage, { type: 'structure' }> => envoyes.at(-1) as Extract<PluginMessage, { type: 'structure' }>;
  return { contexte, envoyes, derniere };
}

function acces(catalogue: Acces['catalogue'], plus: Partial<Acces> = {}): Acces {
  return {
    catalogue,
    reglages: async () => ({ ecriture: null, cles: [] }),
    ecrire: async () => ({ ecrites: [], sautees: [], sansAnnulation: [] }),
    rangement: () => { throw new Error('inutile'); },
    ...plus,
  };
}

const lire = (a: Acces, contexte: Contexte) => traiterAvec(a)({ type: 'lire-structure', demande: 1 }, contexte);

test('E4.2 : un accès qui lève rend des listes vides avec echec lecture-levee', async () => {
  oublierLaLectureGardee();
  const b = contexteDeTest();
  await lire(acces(async () => { throw new Error('boum'); }), b.contexte);
  assert.deepEqual(b.derniere(), { type: 'structure', demande: 1, constats: [], corrections: [], ignores: { constats: [], roles: [] }, echec: 'lecture-levee' });
});

test('E4.2 : un catalogue null sur un fichier UCM rend echec catalogue-absent, hors UCM aucun échec', async () => {
  oublierLaLectureGardee();
  const ucm = contexteDeTest();
  await lire(acces(async () => null), ucm.contexte);
  assert.equal(ucm.derniere().echec, 'catalogue-absent');
  const hors = contexteDeTest();
  await lire(acces(async () => null, { horsUcm: () => true }), hors.contexte);
  assert.equal(hors.derniere().echec, undefined);
  assert.ok(!('echec' in hors.derniere()));
});

/** Un Figma dont le fichier déclare UCM et dont les variables suivent `variables`. */
const figmaUcm = (variables: unknown) => ({ root: { getSharedPluginData: (espace: string, cle: string) => (espace === ESPACE_ARCHITECT && cle === CLE_ARCHITECTURE_DU_FICHIER ? texteDeLArchitectureDuFichier(true) : '') }, variables });

test('E4.2 : Figma qui refuse la lecture des variables rend echec refus-de-figma', async () => {
  oublierLaLectureGardee();
  const b = contexteDeTest(figmaUcm({ getLocalVariablesAsync: async () => { throw new Error('Figma refuse'); } }));
  await assert.rejects(ACCES_DE_FIGMA.catalogue(b.contexte), RefusDeFigma);
  await traiterAvec({ ...ACCES_DE_FIGMA, reglages: async () => ({ ecriture: null, cles: [] }) })({ type: 'lire-structure', demande: 1 }, b.contexte);
  assert.equal(b.derniere().echec, 'refus-de-figma');
  assert.deepEqual([b.derniere().constats, b.derniere().corrections], [[], []]);
});

test('E4.2 : une variable que Figma refuse de lire garde les constats lus et rend echec refus-de-figma', async () => {
  oublierLaLectureGardee();
  const collections = [collectionFigma('C:1', 'theme', ['light'], ['V:1'])];
  const locales = [variableFigma('V:1', 'C:1', 'primary/surface/default', 'COLOR', { 'C:1:light': { type: 'VARIABLE_ALIAS', id: 'V:9' } })];
  const { port } = portDeTest(collections, locales, [], [], { refusees: new Set(['V:9']) });
  const b = contexteDeTest(figmaUcm(port));
  await traiterAvec({ ...ACCES_DE_FIGMA, reglages: async () => ({ ecriture: null, cles: [] }) })({ type: 'lire-structure', demande: 1 }, b.contexte);
  assert.equal(b.derniere().echec, 'refus-de-figma');
  assert.ok(b.derniere().constats.length > 0, 'les constats lus restent');
});

test('E4.2 : une lecture complète ne porte pas echec', async () => {
  oublierLaLectureGardee();
  const b = contexteDeTest();
  const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
  await lire(acces(async () => catalogue), b.contexte);
  assert.ok(!('echec' in b.derniere()));
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.2 : l'écran

const constatDe = (id: string, faits: ConstatDeMessage['faits'], plus: Partial<ConstatDeMessage> = {}): ConstatDeMessage => ({ id, code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits, ...plus });

function monterLaStructure() {
  const racine = element();
  const tokens = monterLePanneauDesTokens({ racine, nomenclature: { questions: element(), renommages: element(), remises: element() }, auChangement() {} });
  const envoyes: DemandeDeStructure[] = [];
  const structure = monterStructure({ pied: element(), tokens, renommages: () => SANS_RENOMMAGES } as unknown as Coquille, { envoyer: (message) => envoyes.push(message), noms: SANS_NOMS, ouvrirLaFiche() {} });
  tokens.poser({ bilan: bilans.rienAFaire, reglesRecues: 0 });
  structure.demander();
  return { racine: comme(racine), tokens, structure, envoyes, haut: comme(tokens.haut), pied: comme(tokens.pied) };
}

const VIDE = { constats: [], corrections: [], ignores: { constats: [], roles: [] } } as const;

test('E4.2 : une lecture qui échoue dit pourquoi et ne déclare aucune catégorie tenue', () => {
  for (const [echec, phrase] of Object.entries({
    'lecture-levee': 'Le plugin n’a pas pu lire les variables du fichier. Actualisez pour relancer la lecture.',
    'catalogue-absent': 'Le plugin n’a pas pu lire la library de tokens. Vérifiez-la dans la Configuration, puis actualisez.',
    'refus-de-figma': 'Figma a refusé la lecture des variables. Actualisez pour relancer la lecture.',
  })) {
    const banc = monterLaStructure();
    banc.structure.recevoir({ type: 'structure', demande: 1, ...VIDE, echec: echec as 'lecture-levee' });
    assert.ok(banc.haut.textContent.includes(phrase), `${echec} : ${banc.haut.textContent}`);
    assert.equal(banc.racine.querySelectorAll('.bande-element.tenue').length, 0, `${echec} : aucune catégorie tenue`);
  }
});

test('E4.2 : une lecture complète sans constat déclare ses catégories tenues et n’affiche aucun échec', () => {
  const banc = monterLaStructure();
  banc.structure.recevoir({ type: 'structure', demande: 1, ...VIDE });
  assert.ok(banc.racine.querySelectorAll('.bande-element.tenue').length > 0);
  assert.ok(!Object.values(TEXTES.lectureDeStructureEchouee).some((phrase) => banc.haut.textContent.includes(phrase)));
});

test('E4.2 : la lecture qui suit un échec retire l’alerte', () => {
  const banc = monterLaStructure();
  banc.structure.recevoir({ type: 'structure', demande: 1, ...VIDE, echec: 'lecture-levee' });
  banc.structure.demander();
  banc.structure.recevoir({ type: 'structure', demande: 2, ...VIDE });
  assert.ok(!banc.haut.textContent.includes('Le plugin n’a pas pu lire'));
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.2 : le motif de saut

const correctionDeScope = (id: string, variable: string): CorrectionDeMessage => ({
  id, sorte: 'scope', cible: { variable }, avant: 'ALL_SCOPES', apres: { nom: 'FRAME_FILL,SHAPE_FILL' }, aRelire: { regle: 'r', avant: 'ALL_SCOPES' },
});
const scopes = (id: string, variable: string, plus: Partial<ConstatDeMessage> = {}): ConstatDeMessage =>
  constatDe(id, { variable, scopes: 'ALL_SCOPES' }, { correction: correctionDeScope(id, variable), ...plus });

function appliquerUneLigne(sautees: readonly { id: string; motif: string }[], ids: readonly string[] = ['C63:k1:scopes']) {
  const banc = monterLaStructure();
  const constats = ids.map((id, rang) => scopes(id, `primary/ring${rang}`));
  banc.structure.recevoir({ type: 'structure', demande: 1, constats, corrections: constats.flatMap(({ correction }) => (correction ? [correction] : [])), ignores: { constats: [], roles: [] } });
  comme(banc.pied.querySelector('.cocher-global')).clic();
  comme(banc.pied.querySelector('.btn-primary')).clic();
  const envoi = banc.envoyes.find((message) => message.type === 'appliquer-structure') as Extract<DemandeDeStructure, { type: 'appliquer-structure' }>;
  banc.structure.recevoir({ type: 'structure-appliquee', demande: envoi.demande, ecrites: 0, sautees, sansAnnulation: [] });
  return { ...banc, resultat: comme(banc.racine.querySelector('.resultat')).textContent, suites: banc.racine.querySelectorAll('.resultat-suite').map((suite) => suite.textContent) };
}

const MOTIFS: Readonly<Record<string, string>> = {
  occupe: 'Une autre écriture était en cours. Relancez Appliquer.',
  'correction-inconnue': 'Cette correction ne correspond plus au fichier. Actualisez, puis recommencez.',
  'non-pris-en-charge': 'Le plugin ne sait pas écrire cette correction. Faites-la dans la fenêtre Variables.',
  erreur: 'Figma a refusé l’écriture. Recommencez, ou faites-la dans la fenêtre Variables.',
};

for (const [motif, phrase] of Object.entries(MOTIFS)) {
  test(`E4.2 : le motif ${motif} d’une correction de scope sautée se lit à l’écran, avec la variable`, () => {
    const { suites } = appliquerUneLigne([{ id: 'C63:k1:scopes', motif }]);
    assert.equal(TEXTES.motifDeSaut[motif], phrase);
    assert.equal(suites.length, 1, suites.join(' | '));
    assert.ok(suites[0].includes(phrase), suites[0]);
    assert.ok(suites[0].includes('primary/ring0'), 'la ligne cite la variable sautée');
  });
}

test('E4.2 : une ligne que l’écran ne connaît plus dit son motif une fois', () => {
  const { suites } = appliquerUneLigne([{ id: 'fantome-1', motif: 'correction-inconnue' }, { id: 'fantome-2', motif: 'correction-inconnue' }]);
  assert.deepEqual(suites, [MOTIFS['correction-inconnue']]);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.3 : la proposition retirée d'un constat de scopes

test('E4.3 : un constat de scopes sans sa proposition garde une carte avec sa phrase, dans Scopes', () => {
  const c63 = scopes('C63:k1:scopes', 'primary/ring', { correction: undefined });
  const c82 = constatDe('C82:scopes:brands|k2', { genre: 'scopes', variable: 'primary/red/500', scopes: 'ALL_SCOPES,TEXT_FILL' }, { code: 'C82' });
  const lus = lireLesConstats([c63, c82], SANS_NOMS);
  assert.deepEqual(lus.map(({ id, groupe }) => [id, groupe]), [['C63:k1:scopes', 'scopes'], ['C82:scopes:brands|k2', 'scopes']]);
  assert.deepEqual(lus.map(({ phrase }) => phrase), [['Aujourd’hui, son scope est Show in all.'], ['Aujourd’hui, ses scopes sont Show in all, Text fill.']]);
  assert.deepEqual(lus.map(({ variable }) => variable?.nom), ['primary/ring', 'primary/red/500']);
  assert.ok(GROUPES.includes('scopes'));
});

test('E4.3 : avec sa correction, le constat de scopes reste dans la carte de correction, pas dans À faire', () => {
  assert.deepEqual(lireLesConstats([scopes('C63:k1:scopes', 'primary/ring')], SANS_NOMS), []);
});

test('E4.3 : de la clé « Ne plus proposer » à l’écran, le constat de scopes paraît dans Scopes, puis sous Ignorés une fois ignoré', () => {
  const banc = monterLaStructure();
  const sansProposition = scopes('C63:k1:scopes', 'primary/ring', { correction: undefined });
  banc.structure.recevoir({ type: 'structure', demande: 1, constats: [sansProposition], corrections: [], ignores: { constats: [], roles: [] } });
  const section = comme(banc.racine.querySelectorAll('.section-element').find((candidat) => candidat.dataset.element === 'scopes'));
  assert.equal(section.querySelectorAll('.bloc-constat').length, 1);
  assert.equal(comme(section.querySelector('.bande-element .nombre')).textContent, '1');
  banc.structure.demander();
  banc.structure.recevoir({ type: 'structure', demande: 2, constats: [], corrections: [], ignores: { constats: [{ ...sansProposition }], roles: [] } });
  const ignores = banc.racine.querySelectorAll('.bloc-constat').filter((carte) => carte.classes.has('muette'));
  assert.equal(ignores.length, 1, 'le constat ignoré a sa carte muette sous Ignorés');
});

test('E4.3 : retirer la proposition d’un constat de scopes dans le fichier le rend sans correction, toujours visible', async () => {
  oublierLaLectureGardee();
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'C:1', nom: 'theme', role: 'theme', modes: [{ id: 'M:1', nom: 'light' }], etat: 'lue' }],
    variables: [{ cle: 'k-defaut', nom: 'success/surface/default', collection: 'C:1', type: 'COLOR', etat: 'presente', scopes: ['TEXT_FILL'], valeurs: { 'M:1': { valeur: '#ffffff' } } }],
  };
  const b = contexteDeTest();
  await traiterAvec(acces(async () => catalogue, { reglages: async () => ({ ecriture: null, cles: ['proposition:C63:k-defaut:scopes'] }) }))({ type: 'lire-structure', demande: 1 }, b.contexte);
  const constat = b.derniere().constats.find(({ id }) => id === 'C63:k-defaut:scopes');
  assert.ok(constat, 'le constat reste');
  assert.equal(constat.correction, undefined);
  assert.deepEqual(b.derniere().corrections, []);
  const lus = lireLesConstats(b.derniere().constats, SANS_NOMS);
  assert.deepEqual(lus.filter(({ id }) => id === 'C63:k-defaut:scopes').map(({ groupe, phrase }) => [groupe, phrase.join('')]), [['scopes', 'Aujourd’hui, son scope est Text fill.']]);
});

// ---------------------------------------------------------------------------------------------------------------------------
// E4.5 : l'alias de mode d'un C63 du mode Composant

const aliasDeMode = (id = 'C63:k-token:m-dark:theme'): Correction => ({
  id, sorte: 'alias-de-mode', cible: { variable: 'k-token', mode: 'm-dark' }, avant: 'k-brands', apres: { cle: 'k-theme', nom: 'primary/surface/default' },
  aRelire: { axes: { mode: 'Dark' }, regle: 'Un composant UCM vise le thème, pas une primitive à segment de mode.', avant: 'k-brands' },
});
const constatC63 = (correction: Correction, plus: Partial<Constat> = {}): Constat => ({
  id: correction.id, code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [], correction,
  faits: { variable: 'Button/color/background', mode: 'Dark', cible: 'brands/primary/dark/300' }, ...plus,
});

function bancDeComposant(constats: readonly Constat[]) {
  reinitialiserLAnalyse();
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  const analyse = commencerUneAnalyse('Button', ['jeu', 'variant'], contexte);
  retenirLesCorrections(analyse, constats);
  const lots: string[][] = [];
  const structures: Array<{ ids: string[]; noms: Array<[string, string]> }> = [];
  const doubles: Ecritures = {
    async lot(corrections) { lots.push(corrections.map(({ id }) => id)); return { ecrites: corrections.map(({ id }) => id), sautees: [] }; },
    async structure(corrections, nomsLus) {
      structures.push({ ids: corrections.map(({ id }) => id), noms: [...nomsLus] });
      return { ecrites: corrections.map(({ id }) => id), sautees: [], sansAnnulation: [] };
    },
    async selectionner(layers) { return layers; },
  };
  return { envoyes, contexte, analyse, lots, structures, doubles };
}

test('E4.5 : la correction alias-de-mode d’un C63 part à l’écriture de structure, avec le nom que l’analyse a lu', async () => {
  const b = bancDeComposant([constatC63(aliasDeMode())]);
  await traiterLesCorrectionsAvec(b.doubles)({ type: 'appliquer-corrections', analyse: b.analyse, ids: ['C63:k-token:m-dark:theme'] }, b.contexte);
  assert.deepEqual(b.structures, [{ ids: ['C63:k-token:m-dark:theme'], noms: [['C63:k-token:m-dark:theme', 'Button/color/background']] }]);
  assert.deepEqual(b.lots, []);
  const rendu = b.envoyes.find((message) => message.type === 'corrections-appliquees') as Extract<PluginMessage, { type: 'corrections-appliquees' }>;
  assert.equal(rendu.ecrites, 1);
  assert.deepEqual(rendu.sautees, []);
  assert.equal(rendu.resume, '1 correction de structure');
  assert.ok(b.envoyes.some((message) => message.type === 'perime' && message.cause === 'ecriture'));
});

test('E4.5 : un alias-de-mode qui ne vient pas d’un C63 reste sauté non-pris-en-charge', async () => {
  const correction = aliasDeMode('C60:k-token:m-dark');
  const b = bancDeComposant([constatC63(correction, { code: 'C60' })]);
  await traiterLesCorrectionsAvec(b.doubles)({ type: 'appliquer-corrections', analyse: b.analyse, ids: [correction.id] }, b.contexte);
  assert.deepEqual(b.structures, []);
  const rendu = b.envoyes.find((message) => message.type === 'corrections-appliquees') as Extract<PluginMessage, { type: 'corrections-appliquees' }>;
  assert.deepEqual(rendu.sautees, [{ id: correction.id, motif: 'non-pris-en-charge' }]);
});

test('E4.5 : les motifs de l’écriture de structure remontent, et une écriture qui lève saute en erreur', async () => {
  const b = bancDeComposant([constatC63(aliasDeMode())]);
  b.doubles.structure = async () => ({ ecrites: [], sautees: [{ id: 'C63:k-token:m-dark:theme', motif: 'fait-faux' }], sansAnnulation: [] });
  await traiterLesCorrectionsAvec(b.doubles)({ type: 'appliquer-corrections', analyse: b.analyse, ids: ['C63:k-token:m-dark:theme'] }, b.contexte);
  const rendu = b.envoyes.find((message) => message.type === 'corrections-appliquees') as Extract<PluginMessage, { type: 'corrections-appliquees' }>;
  assert.deepEqual(rendu.sautees, [{ id: 'C63:k-token:m-dark:theme', motif: 'fait-faux' }]);
  assert.equal(b.envoyes.some((message) => message.type === 'perime'), false, 'rien d’écrit : l’analyse reste');

  const leve = bancDeComposant([constatC63(aliasDeMode())]);
  leve.doubles.structure = async () => { throw new Error('Figma'); };
  await traiterLesCorrectionsAvec(leve.doubles)({ type: 'appliquer-corrections', analyse: leve.analyse, ids: ['C63:k-token:m-dark:theme'] }, leve.contexte);
  const rendu2 = leve.envoyes.find((message) => message.type === 'corrections-appliquees') as Extract<PluginMessage, { type: 'corrections-appliquees' }>;
  assert.deepEqual(rendu2.sautees, [{ id: 'C63:k-token:m-dark:theme', motif: 'erreur' }]);
});

test('E4.5 : un lot mixte écrit les liaisons d’un côté et l’alias de mode de l’autre', async () => {
  const liaison: Correction = { id: 'l1', sorte: 'liaison', cible: { layer: '1:1', champ: 'paddingLeft' }, avant: null, apres: { cle: 'k', nom: 'n' }, aRelire: { regle: 'r', avant: null } };
  const b = bancDeComposant([constatC63(aliasDeMode()), { ...constatC63(liaison), code: 'C15', faits: {} }]);
  await traiterLesCorrectionsAvec(b.doubles)({ type: 'appliquer-corrections', analyse: b.analyse, ids: ['l1', 'C63:k-token:m-dark:theme'] }, b.contexte);
  assert.deepEqual(b.lots, [['l1']]);
  assert.equal(b.structures.length, 1);
  const rendu = b.envoyes.find((message) => message.type === 'corrections-appliquees') as Extract<PluginMessage, { type: 'corrections-appliquees' }>;
  assert.equal(rendu.ecrites, 2);
  assert.equal(rendu.resume, '1 layer lié, 1 correction de structure');
});

test('E4.5 : la carte de l’alias de mode nomme le token, le mode et la nouvelle cible, et sa ligne se coche', () => {
  const correction = aliasDeMode();
  const cartes = cartesDeCorrections([constatC63(correction)], { composant: 'Button', variants: [], layers: new Map(), constats: [] });
  assert.equal(cartes.length, 1);
  const [carte] = cartes;
  assert.deepEqual(carte.phrase, ['Lier Button/color/background à ', { chemin: 'primary/surface/default' }]);
  assert.deepEqual(carte.meta.filter((morceau) => typeof morceau === 'string'), ['En Dark']);
  assert.equal(carte.lignes[0].avant, 'brands/primary/dark/300');
  assert.equal(carte.lignes[0].apres, 'primary/surface/default');
  assert.notEqual(carte.phrase[0], 'Lier le layer à ', 'pas de layer à lier');
});

test('E4.5 : « Appliquer tout » envoie la ligne alias-de-mode cochée, sans la compter parmi les liaisons', () => {
  const correction = aliasDeMode();
  const constat = constatC63(correction);
  const identite = { sujet: 'Button', generation: 1 };
  const etat = etatInitial();
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: identite });
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: identite, statut: 'complete', constats: [constat], lecture: null, variants: [], sansTokens: false });
  const analyse = etat.analyse!;
  const contexte: ContexteDeCartes = { composant: 'Button', variants: [], layers: new Map(), library: null, constats: analyse.constats };
  const panneau = elementsDuPanneau(analyse.constats, contexte, { reponses: {}, preparee: null, sansTokens: false });
  const cartes = panneau.elements.flatMap((element) => element.corrections);
  const envois: Array<{ ids: readonly string[]; liaisons: number }> = [];
  const corrections = monterLesCorrections({ appliquer: (ids, liaisons) => envois.push({ ids, liaisons }), selectionner() {}, ignorer() {}, ignorerLesConstats() {}, auChangement() {}, redessiner() {} });
  corrections.poser({ analyse, contexte, cartes });
  corrections.commencer();
  assert.equal(cartes.length, 1);
  corrections.cartes(cartes);
  const pied = comme(corrections.pied(null));
  comme(pied.querySelector('.cocher-global')).clic();
  comme(comme(corrections.pied(null)).querySelector('.btn-primary')).clic();
  assert.deepEqual(envois, [{ ids: ['C63:k-token:m-dark:theme'], liaisons: 0 }]);
});

test('E4.5 : l’écriture de structure change l’alias du token pour le mode, garde le journal et se défait', async () => {
  const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
  const a = atelierDEcriture({
    locales: [
      { id: 'V:1', key: 'k-token', name: 'Button/color/background', scopes: [], collection: 'C:1', valuesByMode: { 'm-dark': alias('V:2') } },
      { id: 'V:2', key: 'k-brands', name: 'brands/primary/dark/300', scopes: [], collection: 'C:2', valuesByMode: {} },
      { id: 'V:3', key: 'k-theme', name: 'primary/surface/default', scopes: [], collection: 'C:3', valuesByMode: {} },
    ],
  });
  const donnees = new Map<string, string>();
  const port: PortDeRegles = { cles: () => [...donnees.keys()], lire: (cle) => donnees.get(cle) ?? '', ecrire: (cle, texte) => { donnees.set(cle, texte); }, effacer: (cle) => { donnees.delete(cle); } };
  const choix = { api: a.api as unknown as ApiDeStructure, stockage: port, heure: () => 'h', lot: () => 'lot' };
  const correction = aliasDeMode();
  const rendu = await ecrireLaStructure([correction], { ...choix, nomsLus: new Map([[correction.id, 'Button/color/background']]) });
  assert.deepEqual(rendu, { ecrites: [correction.id], sautees: [], sansAnnulation: [] });
  assert.deepEqual(a.journal.filter((ligne) => ligne.startsWith('mode:')), ['mode:V:1:m-dark:V:3']);
  assert.deepEqual(lireLeJournalDeStructure(port)?.lignes, [{ sorte: 'alias-de-mode', variable: 'V:1', nom: 'Button/color/background', mode: 'm-dark', avant: 'V:2', apres: 'V:3' }]);
  assert.equal(a.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  assert.equal((await annulerLeDernierLotDeStructure(choix)).defaites, 1);
  assert.deepEqual(a.variable('V:1')!.valuesByMode['m-dark'], alias('V:2'));
});
