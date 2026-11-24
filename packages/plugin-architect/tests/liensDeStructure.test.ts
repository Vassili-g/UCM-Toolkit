/** Les cartes de liens C82, les réponses préparées et leur écriture annulable dans brands et utility. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLIntegriteUcm, corrigerLaQuestionDeLien, type CatalogueDeReference, type Constat, type Correction } from '@ucm-kit/core/controles';
import { catalogueDeLiens } from '../../kit/tests/fixtures/tokensDeLiens';
import { avecEcriture } from '../../kit/tests/fixtures/catalogueDeStructure';
import { lireLesCategories } from '../src/ui/tokens/categories';
import { lireLesConstats, lireLesCorrections, type Noms } from '../src/ui/structure/lecture';
import { annulerLeDernierLotDeStructure, ecrireLaStructure, type ApiDeStructure, type VariableEcrivable } from '../src/ecriture/structure';
import { lireLeJournalDeStructure, type PortDeRegles } from '../src/ecriture/journal';
import { traiterAvec, oublierLaLectureGardee, type Acces } from '../src/sandbox/structure';
import type { Contexte } from '../src/sandbox/contexte';
import type { PluginMessage } from '../src/messages';
import { atelierDEcriture } from './figmaDeTest';
import { poserLeDom, comme } from './domDeTest';
import { monterStructure } from '../src/ui/structure';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';
import { SANS_RENOMMAGES } from '../src/ui/tokens/cochage';
import type { Coquille } from '../src/ui/nomenclature/coquille';
import type { DemandeDeStructure } from '../src/messages/structure';

const ecriture = avecEcriture('minuscules', 'tiret');
const noms: Noms = { nom: () => null, cle: () => null, mode: (_collection, mode) => mode };
const sansSecondaire = (): CatalogueDeReference => {
  const catalogue = catalogueDeLiens();
  return { ...catalogue, variables: catalogue.variables.filter(({ collection, nom }) => collection !== 'brands' || !nom.startsWith('secondary/')) };
};
const constater = (faits: Constat['faits'], question?: Constat['question']): Constat => ({ id: 'C82:test', code: 'C82', type: 'verifier', famille: 'tokens', variants: [], layers: [], faits, ...(question ? { question } : {}) });
const texte = (phrase: ReturnType<typeof lireLesConstats>[number]['phrase']) => phrase.map((morceau) => typeof morceau === 'string' ? morceau : morceau.chemin).join('');

for (const [genre, faits, attendu, statut, groupe] of [
  ['lien-manquant', { collection: 'brands', variable: 'primary/light/300', raison: 'sans-palette' }, 'brands n’a pas la variable primary/light/300. Ses voisines ne visent aucune palette.', 'Créez primary/light/300 dans la fenêtre Variables', 'manquantes'],
  ['lien-a-corriger', { mode: 'marque-1', attendu: 'light/300', avant: 'light/400' }, 'En marque-1, UCM attend light/300. Aujourd’hui elle vise light/400.', 'Changez sa cible dans la fenêtre Variables', 'crans'],
  ['palette-a-choisir', { collection: 'brands', groupe: 'secondary', mode: 'marque-1' }, 'En marque-1, brands/secondary ne vise aucune palette.', 'Choisissez sa palette. Architect créera ses variables', 'manquantes'],
  ['charte-a-choisir', { variable: 'identity/primary', palette: 'cobalt', mode: 'marque-1' }, 'En marque-1, la couleur de charte identity/primary ne vise aucune nuance de la palette cobalt.', 'Choisissez la nuance de votre couleur de charte', 'manquantes'],
  ['rampe-a-completer', { collection: 'brands', palette: 'cobalt', manque: 'light/300', variables: 1 }, 'cobalt n’a pas la nuance light/300. 1 variable de brands en a besoin.', 'Complétez cette palette avec UCM Palettes', 'manquantes'],
] as const) {
  test(`${genre} lit la phrase validée, le statut et le groupe sans sélection`, () => {
    const question = ['palette-a-choisir', 'charte-a-choisir'].includes(genre) ? { id: 'q', candidats: [{ nom: 'cobalt' }, { nom: 'ambre' }] } : undefined;
    const [carte] = lireLesConstats([constater({ ...faits, genre }, question)], noms);
    assert.equal(texte(carte.phrase), attendu);
    assert.equal(carte.statut, statut);
    assert.equal(carte.groupe, groupe);
    assert.equal(carte.choix.length, question ? 2 : 0);
    assert.ok(carte.choix.every((choix) => !('checked' in choix) && choix.lien?.constat === 'C82:test'));
  });
}

test('une valeur de mode absente, une autre palette et une palette absente gardent leurs textes et gestes', () => {
  const cas = [
    constater({ genre: 'lien-manquant', mode: 'marque-2', raison: 'cible-de-library' }),
    constater({ genre: 'lien-a-corriger', raison: 'autre-palette' }),
    constater({ genre: 'rampe-a-completer', collection: 'utility', groupe: 'warning', manque: 'palette' }),
  ];
  const cartes = lireLesConstats(cas, noms);
  assert.ok(cartes.some((carte) => texte(carte.phrase) === 'Cette variable n’a pas de valeur en marque-2. La nuance visée est dans une library.'));
  assert.ok(cartes.some((carte) => texte(carte.phrase) === 'Cette variable vise une autre palette que ses voisines.'));
  assert.ok(cartes.some((carte) => carte.statut === 'Créez sa palette avec UCM Palettes' && carte.choix.length === 0));
});

function atelier(catalogue: CatalogueDeReference) {
  const collections = catalogue.collections.map(({ cle, nom, modes }) => ({ id: cle, name: nom, modes: modes.map(({ id }) => id) }));
  const a = atelierDEcriture({ collections, locales: catalogue.variables.map((variable) => ({
    id: variable.cle, key: variable.cle, name: variable.nom, collection: variable.collection, scopes: [], type: variable.type,
    valuesByMode: Object.fromEntries(Object.entries(variable.valeurs ?? {}).map(([mode, valeur]) => [mode, 'alias' in valeur ? { type: 'VARIABLE_ALIAS', id: valeur.alias } : valeur])),
  })) });
  // L'atelier nomme ses modes collection:mode ; le catalogue utilise déjà les identifiants Figma.
  const api = { ...a.api, variables: { ...a.api.variables, getLocalVariableCollectionsAsync: async () => catalogue.collections.map(({ cle, nom, modes }) => ({ id: cle, name: nom, modes: modes.map(({ id, nom }) => ({ modeId: id, name: nom })) })) } } as unknown as ApiDeStructure;
  const donnees = new Map<string, string>();
  const stockage: PortDeRegles = { cles: () => [...donnees.keys()], lire: (cle) => donnees.get(cle) ?? '', ecrire: (cle, valeur) => { donnees.set(cle, valeur); }, effacer: (cle) => { donnees.delete(cle); } };
  let lot = 0;
  const options = { api, stockage, heure: () => 'h', lot: () => `lot${lot++}` };
  return { a: { ...a, locales: () => a.locales() as unknown as VariableEcrivable[] }, stockage, options };
}

test('deux palettes candidates donnent une question sans correction ; sa réponse prépare 22 alias du seul mode choisi', async () => {
  const catalogue = sansSecondaire();
  const messages: PluginMessage[] = [];
  const appels: Correction[][] = [];
  const acces: Acces = { catalogue: async () => catalogue, reglages: async () => ({ ecriture, cles: [] }),
    ecrire: async (corrections) => { appels.push([...corrections]); return { ecrites: corrections.map(({ id }) => id), sautees: [], sansAnnulation: [] }; },
    rangement: () => { throw new Error('aucun rangement attendu'); },
  };
  const contexte = { figma: {}, envoyer: (message: PluginMessage) => messages.push(message), surveillerLeDocument: () => {} } as unknown as Contexte;
  oublierLaLectureGardee();
  const traiter = traiterAvec(acces);
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  const premier = messages.at(-1);
  assert.equal(premier?.type, 'structure');
  if (premier?.type !== 'structure') return;
  const question = premier.constats.find(({ id }) => id === 'C82:palette-a-choisir:brands:marque-1:secondary')!;
  assert.ok(question.question!.candidats.length >= 2);
  assert.equal(question.correction, undefined);
  await traiter({ type: 'repondre-au-lien', demande: 2, constat: question.id, choix: 'ambre' }, contexte);
  assert.equal(appels.length, 0);
  const reponse = messages.at(-1);
  assert.equal(reponse?.type, 'structure');
  if (reponse?.type !== 'structure') return;
  const corrections = reponse.corrections.filter(({ creation }) => creation?.collection === 'brands');
  assert.equal(corrections.length, 22);
  assert.ok(corrections.every(({ creation }) => Object.keys(creation!.alias).join() === 'marque-1'));
  const lues = lireLesCorrections(corrections, noms, reponse.constats);
  assert.equal(lues.variables.length, 22);
  assert.ok(lues.variables.every(({ lignes, scopes }) => scopes.length === 0 && lignes[0].cibles.length === 1));
  await traiter({ type: 'appliquer-structure', demande: 3, ids: corrections.map(({ id }) => id) }, contexte);
  assert.equal(appels[0].length, 22);
});

for (const collection of ['brands', 'utility']) test(`la création dans ${collection} écrit des alias sans couleur, sans scope et sans toucher primitives ; l'Historique défait le lot`, async () => {
  const catalogue = catalogueDeLiens();
  const cle = collection === 'brands' ? 'brands|primary/light/300' : 'utility|success/vivid/light/300';
  const incomplet = { ...catalogue, variables: catalogue.variables.filter((variable) => variable.cle !== cle) };
  const constat = controlerLIntegriteUcm(incomplet, { ecriture }).find(({ faits }) => faits.genre === 'lien-manquant')!;
  const m = atelier(incomplet);
  const primitives = JSON.stringify(m.a.locales().filter(({ variableCollectionId }) => variableCollectionId === 'primitives'));
  const resultat = await ecrireLaStructure([constat.correction!], m.options);
  assert.deepEqual(resultat.ecrites, [constat.id]);
  const creee = m.a.locales().at(-1)!;
  assert.deepEqual(creee.scopes, []);
  assert.equal(creee.variableCollectionId, collection);
  assert.ok(Object.values(creee.valuesByMode).every((valeur) => (valeur as { type: string }).type === 'VARIABLE_ALIAS'));
  assert.equal(JSON.stringify(m.a.locales().filter(({ variableCollectionId }) => variableCollectionId === 'primitives')), primitives);
  assert.equal(lireLeJournalDeStructure(m.stockage)?.lignes.length, 1);
  assert.equal((await annulerLeDernierLotDeStructure(m.options)).defaites, 1);
  assert.ok(!m.a.locales().includes(creee));
});

test('le lien corrigé reste dans Crans et le mode absent dans Variables manquantes ; Figma ne permet pas de rétablir son absence', async () => {
  const catalogue = catalogueDeLiens();
  const cle = 'brands|secondary/dark/700';
  const incomplet = { ...catalogue, variables: catalogue.variables.map((variable) => variable.cle === cle ? { ...variable, valeurs: { 'marque-1': variable.valeurs!['marque-1'] } } : variable) };
  const constat = controlerLIntegriteUcm(incomplet, { ecriture }).find(({ faits }) => faits.genre === 'lien-manquant')!;
  const categories = lireLesCategories({ nomenclature: null, constats: [constat], corrections: [constat.correction!], noms, partielle: false });
  assert.equal(categories.find(({ id }) => id === 'manquantes')?.nombre, 1);
  const corrige = { ...constat, faits: { ...constat.faits, genre: 'lien-a-corriger' } };
  assert.equal(lireLesCategories({ nomenclature: null, constats: [corrige], corrections: [constat.correction!], noms, partielle: false }).find(({ id }) => id === 'crans')?.nombre, 1);
  const m = atelier(incomplet);
  assert.equal((await ecrireLaStructure([constat.correction!], m.options)).ecrites.length, 1);
  assert.ok('marque-2' in m.a.variable(cle)!.valuesByMode);
  const annulation = await annulerLeDernierLotDeStructure(m.options);
  assert.equal(annulation.defaites, 0);
  assert.equal(annulation.sautees[0].motif, 'erreur');
  assert.equal(annulation.restantes, 1);
  assert.ok('marque-2' in m.a.variable(cle)!.valuesByMode);
});

test('une création visant primitives comme destination ou portant un scope est refusée', async () => {
  const catalogue = sansSecondaire();
  const question = controlerLIntegriteUcm(catalogue, { ecriture }).find(({ faits }) => faits.genre === 'palette-a-choisir')!;
  const [correction] = corrigerLaQuestionDeLien(catalogue, question, 'ambre', { ecriture });
  for (const creation of [{ ...correction.creation!, collection: 'primitives' }, { ...correction.creation!, scopes: ['ALL_SCOPES'] }]) {
    const m = atelier(catalogue);
    assert.equal((await ecrireLaStructure([{ ...correction, creation }], m.options)).ecrites.length, 0);
    assert.ok(!m.a.journal.some((ligne) => ligne.startsWith('creer:')));
  }
});

test('deux réponses de marque avant Appliquer créent une variable par nom et deux alias ; un seul lot les défait', async () => {
  const catalogue = sansSecondaire();
  const m = atelier(catalogue);
  const messages: PluginMessage[] = [];
  const acces: Acces = { catalogue: async () => catalogue, reglages: async () => ({ ecriture, cles: [] }), ecrire: (corrections, nomsLus) => ecrireLaStructure(corrections, { ...m.options, nomsLus }), rangement: () => { throw new Error('aucun rangement attendu'); } };
  const contexte = { figma: {}, envoyer: (message: PluginMessage) => messages.push(message), surveillerLeDocument: () => {} } as unknown as Contexte;
  oublierLaLectureGardee();
  const traiter = traiterAvec(acces);
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  for (const [mode, choix] of [['marque-1', 'ambre'], ['marque-2', 'sapin']]) {
    await traiter({ type: 'repondre-au-lien', demande: 2, constat: `C82:palette-a-choisir:brands:${mode}:secondary`, choix }, contexte);
  }
  const reponse = messages.at(-1);
  assert.equal(reponse?.type, 'structure');
  if (reponse?.type !== 'structure') return;
  const corrections = reponse.corrections.filter(({ creation }) => creation?.collection === 'brands');
  assert.equal(corrections.length, 44);
  await traiter({ type: 'appliquer-structure', demande: 3, ids: corrections.map(({ id }) => id) }, contexte);
  const creations = m.a.locales().filter(({ name, variableCollectionId }) => variableCollectionId === 'brands' && name.startsWith('secondary/'));
  assert.equal(creations.length, 22);
  assert.equal(new Set(creations.map(({ name }) => name)).size, 22);
  assert.ok(creations.every(({ valuesByMode }) => Object.keys(valuesByMode).length === 2));
  assert.equal(messages.at(-1)?.type, 'structure-appliquee');
  assert.equal(lireLeJournalDeStructure(m.stockage)?.lignes.length, 22);
  assert.equal((await annulerLeDernierLotDeStructure(m.options)).defaites, 22);
});

test('la réponse suivante complète le seul mode vide sans réécrire celui déjà choisi', async () => {
  const catalogue = sansSecondaire();
  const question = controlerLIntegriteUcm(catalogue, { ecriture }).find(({ id }) => id === 'C82:palette-a-choisir:brands:marque-1:secondary')!;
  const m = atelier(catalogue);
  await ecrireLaStructure(corrigerLaQuestionDeLien(catalogue, question, 'ambre', { ecriture }), m.options);
  const creees = m.a.locales().filter(({ variableCollectionId, name }) => variableCollectionId === 'brands' && name.startsWith('secondary/'));
  const apres: CatalogueDeReference = { ...catalogue, variables: [...catalogue.variables, ...creees.map((variable) => ({
    cle: variable.key, nom: variable.name, collection: 'brands', type: 'COLOR' as const, etat: 'presente' as const,
    valeurs: Object.fromEntries(Object.entries(variable.valuesByMode).map(([mode, valeur]) => [mode, { alias: (valeur as { id: string }).id }])),
  }))] };
  const suivante = controlerLIntegriteUcm(apres, { ecriture }).find(({ id }) => id === 'C82:palette-a-choisir:brands:marque-2:secondary')!;
  assert.ok(suivante);
  const corrections = corrigerLaQuestionDeLien(apres, suivante, 'sapin', { ecriture });
  assert.equal(corrections.length, 22);
  assert.ok(corrections.every(({ sorte, cible }) => sorte === 'alias-de-mode' && cible.mode === 'marque-2'));
  const mode1 = creees.map(({ valuesByMode }) => JSON.stringify(valuesByMode['marque-1']));
  assert.equal((await ecrireLaStructure(corrections, m.options)).ecrites.length, 22);
  assert.deepEqual(creees.map(({ valuesByMode }) => JSON.stringify(valuesByMode['marque-1'])), mode1);
  const annulation = await annulerLeDernierLotDeStructure(m.options);
  assert.equal(annulation.defaites, 0);
  assert.equal(annulation.restantes, 22);
  assert.ok(annulation.sautees.every(({ motif }) => motif === 'erreur'));
  assert.ok(creees.every(({ valuesByMode }) => 'marque-2' in valuesByMode));
});

test('le bouton de palette prépare les aperçus dans Constats avec toutes les cases décochées et aucune ligne de scopes', () => {
  poserLeDom();
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (texte: string) => texte } });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: () => {} });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: comme(document.createElement('div')).constructor });
  Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: class { observe(): void {} } });
  Object.assign(document, { body: comme(document.createElement('div')), addEventListener() {}, removeEventListener() {} });
  const element = () => document.createElement('div');
  const racine = element();
  const tokens = monterLePanneauDesTokens({ racine, nomenclature: { questions: element(), renommages: element(), remises: element() }, auChangement() {} });
  const envoyes: DemandeDeStructure[] = [];
  const structure = monterStructure({ pied: element(), tokens, renommages: () => SANS_RENOMMAGES } as unknown as Coquille, { envoyer: (message) => envoyes.push(message), noms, ouvrirLaFiche() {} });
  const catalogue = sansSecondaire();
  const question = controlerLIntegriteUcm(catalogue, { ecriture }).find(({ id }) => id === 'C82:palette-a-choisir:brands:marque-1:secondary')!;
  structure.demander();
  structure.recevoir({ type: 'structure', demande: 1, constats: [question], corrections: [], ignores: { constats: [], roles: [] } });
  const choix = comme(racine).querySelectorAll('.constat-choix-ligne');
  assert.equal(comme(racine).querySelectorAll('input').length, 0);
  comme(choix[0].querySelector('button')).clic();
  assert.deepEqual(envoyes.at(-1), { type: 'repondre-au-lien', demande: 2, constat: question.id, choix: 'ambre' });
  const corrections = corrigerLaQuestionDeLien(catalogue, question, 'ambre', { ecriture });
  const constats = corrections.map((correction) => ({ ...question, id: correction.id, question: undefined, correction, faits: { genre: 'lien-manquant', collection: 'brands', variable: correction.creation!.nom } }));
  structure.recevoir({ type: 'structure', demande: 2, constats, corrections, ignores: { constats: [], roles: [] } });
  const cases = comme(racine).querySelectorAll('input');
  assert.ok(cases.length > 0);
  assert.ok(cases.every(({ checked }) => !checked));
  assert.ok(comme(racine).textContent.includes('Créer secondary/'));
  assert.ok(!comme(racine).textContent.includes('Scopes :'));
  assert.ok(comme(racine).textContent.includes('marque-1 :'));
});
