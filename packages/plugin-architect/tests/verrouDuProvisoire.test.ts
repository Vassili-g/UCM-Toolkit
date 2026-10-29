/**
 * Tant que le résultat final manque, l'interface n'envoie aucune demande d'écriture et désactive cases et boutons d'écriture, sans DOM
 * de navigateur. Au passage au final, les identifiants des constats se conservent.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import type { PluginMessage } from '../src/messages';
import { creerApplication } from '../src/ui/application';
import { analyseApplicable, calculEnCours, recevoirUneAnalyse, type AnalyseRecue } from '../src/ui/composant/analyse';
import { monterLesCorrections } from '../src/ui/corrections';
import type { ContexteDeCartes } from '../src/ui/corrections/modele';
import { etatInitial } from '../src/ui/etat';
import { monterAFaire } from '../src/ui/ignores';
import { elementsDuPanneau } from '../src/ui/panneau/elements';
import { monterLesQuestions } from '../src/ui/questions';

const { constatsAlert, alertCorrections } = require('../galerie/etats/corrections.cjs') as { constatsAlert: Constat[]; alertCorrections: { sujet: { nom: string; variants: Array<{ id: string; nom: string }> } } };

const IDENTITE = { sujet: 'Alert', generation: 1 };
const variants = alertCorrections.sujet.variants;

type Phase = 'provisoire' | 'complete' | 'partielle' | 'annulee' | 'arretee';

/** Une analyse retenue comme l'interface la retient : par les messages du sandbox. */
function analyseEn(phase: Phase) {
  const etat = etatInitial();
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: IDENTITE });
  if (phase === 'provisoire') {
    recevoirUneAnalyse(etat, { type: 'analyse-provisoire', analyse: IDENTITE, constats: constatsAlert, ignores: [], lecture: null as never, variants });
  } else {
    recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: phase, constats: constatsAlert, lecture: null, variants, sansTokens: false });
  }
  return etat;
}

function envoisDe(etat: ReturnType<typeof etatInitial>): PluginMessage[] {
  const envois: PluginMessage[] = [];
  (globalThis as unknown as { parent: unknown }).parent = { postMessage: (message: { pluginMessage: PluginMessage }) => envois.push(message.pluginMessage) };
  const app = creerApplication(etat, () => ({ rendre() {} }) as never);
  const constat = constatsAlert[0];
  app.appliquer(['a'], 1);
  app.ignorerLaProposition([constat]);
  app.repondre('q', 'r');
  app.annulerLaReponse('q');
  app.servirDeModele('v');
  app.ignorer(constat);
  app.nePlusIgnorer(constat);
  return envois;
}

test('pendant le provisoire, aucune action d’écriture de l’interface n’envoie de demande', () => {
  assert.deepEqual(envoisDe(analyseEn('provisoire')), []);
  for (const phase of ['annulee', 'arretee'] as const) assert.deepEqual(envoisDe(analyseEn(phase)), [], phase);
});

test('après le final, les mêmes actions envoient leur demande', () => {
  for (const phase of ['complete', 'partielle'] as const) {
    const envois = envoisDe(analyseEn(phase));
    assert.deepEqual(envois.map(({ type }) => type), ['appliquer-corrections', 'ignorer', 'repondre', 'annuler-reponse', 'servir-de-modele', 'ignorer', 'ne-plus-ignorer'], phase);
  }
});

// Une prélecture peut remplacer l'analyse courante du sandbox dès que l'analyse affichée est périmée (`sandbox/analyse.ts`) :
// aucun geste de l'écran périmé ne doit alors partir, sélection des calques comprise.
test('après `perime`, aucune action de l’analyse affichée n’envoie de demande au sandbox', () => {
  for (const phase of ['complete', 'partielle'] as const) {
    const etat = analyseEn(phase);
    recevoirUneAnalyse(etat, { type: 'perime', analyse: IDENTITE, cause: 'document' });
    const envois = envoisDe(etat);
    creerApplication(etat, () => ({ rendre() {} }) as never).selectionner(['a']);
    assert.deepEqual(envois, [], phase);
  }
});

test('seul un final non périmé est applicable', () => {
  assert.equal(analyseApplicable(null), false);
  assert.equal(analyseApplicable(analyseEn('provisoire').analyse), false);
  assert.equal(analyseApplicable(analyseEn('complete').analyse), true);
  assert.equal(analyseApplicable(analyseEn('partielle').analyse), true);
  const etat = analyseEn('complete');
  recevoirUneAnalyse(etat, { type: 'perime', analyse: IDENTITE, cause: 'document' });
  assert.equal(analyseApplicable(etat.analyse), false);
});

test('une réponse, un modèle ou des liaisons préparées qui arrivent avant le final ne sont pas retenus', () => {
  const etat = analyseEn('provisoire');
  const correction = { id: 'c', sorte: 'liaison', cible: { layer: 'l', champ: 'fills' }, avant: null, apres: { cle: 'k', nom: 'n' }, aRelire: { regle: 'r', avant: null } } as never;
  recevoirUneAnalyse(etat, { type: 'question-repondue', analyse: IDENTITE, question: 'q', correction });
  recevoirUneAnalyse(etat, { type: 'modele-propose', analyse: IDENTITE, variant: 'v', constats: [constatsAlert[0]], retires: [] });
  recevoirUneAnalyse(etat, { type: 'liaisons-preparees', analyse: IDENTITE, preparation: 'p', corrections: [correction], enAttente: [], ecartees: 0, refus: null });
  assert.deepEqual(etat.analyse?.repondues, {});
  assert.equal(etat.analyse?.tous.length, constatsAlert.length);
  assert.equal(etat.analyse?.liaisons, null);
});

test('au passage au final, les constats du provisoire gardent leurs identifiants et leur ordre', () => {
  const etat = analyseEn('provisoire');
  const avant = etat.analyse!.tous.map(({ id }) => id);
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsAlert, lecture: null, variants, sansTokens: false });
  assert.deepEqual(etat.analyse!.tous.map(({ id }) => id), avant);
  assert.equal(etat.analyse!.identite, IDENTITE);
  assert.equal(analyseApplicable(etat.analyse), true);
});

/** Tout ce qui écrit ou écarte, hors repli et dépliage. */
const actions = (racine: readonly ElementDeTest[]): ElementDeTest[] => racine.flatMap((element) => [...element.querySelectorAll('input'), ...element.querySelectorAll('button')])
  .filter((action) => !action.classes.has('bloc-bouton') && !action.classes.has('bloc-replier'));

function monterLesModules(phase: Phase) {
  const { analyse } = analyseEn(phase);
  const contexte: ContexteDeCartes = {
    composant: alertCorrections.sujet.nom, variants, layers: new Map(), library: null, constats: analyse!.constats,
  };
  const panneau = elementsDuPanneau(analyse!.constats, contexte, { reponses: {}, preparee: null, sansTokens: false });
  const cartes = panneau.elements.flatMap((element) => element.corrections);
  const corrections = monterLesCorrections({ appliquer() {}, selectionner() {}, ignorer() {}, auChangement() {}, redessiner() {} });
  corrections.poser({ analyse: analyse!, contexte, cartes });
  corrections.commencer();
  const questions = monterLesQuestions({ repondre() {}, annuler() {}, selectionner() {}, redessiner() {} });
  questions.poser(analyse!);
  const aFaire = monterAFaire({ selectionner() {}, ignorer() {}, nePlusIgnorer() {}, redessiner() {} });
  aFaire.poser({ analyse: analyse!, contexte });
  return {
    corrections: corrections.cartes(cartes).map(comme),
    pied: comme(corrections.pied(null)),
    questions: panneau.elements.flatMap((element) => questions.cartes(element.questions)).map(comme),
    aFaire: panneau.elements.flatMap((element) => aFaire.cartes(element.aFaire)).map(comme),
  };
}

test('pendant le provisoire, cases et boutons d’écriture des modules sont désactivés ; replier et déplier restent permis', () => {
  const provisoire = monterLesModules('provisoire');
  const final = monterLesModules('complete');
  for (const module of ['corrections', 'questions', 'aFaire'] as const) {
    const cibles = actions(provisoire[module]);
    assert.ok(actions(final[module]).length > 0, `${module} : le final a des actions`);
    assert.ok(actions(final[module]).some((action) => !action.disabled), `${module} : le final en laisse d'actives`);
    assert.deepEqual(cibles.filter((action) => !action.disabled).map((action) => action.className), [], module);
  }
  assert.ok(provisoire.corrections.length > 0);
  assert.ok(actions(provisoire.corrections).length > 0, 'des cases et des boutons sont présents');
  assert.ok(provisoire.corrections.some((carte) => carte.querySelector('.bloc-bouton')), 'le dépliage reste présent');
  assert.ok(actions([provisoire.pied]).every((action) => action.disabled), 'Tout appliquer est désactivé');
});

test('après Annuler pendant le provisoire, le final annulé retire les constats provisoires', () => {
  const etat = analyseEn('provisoire');
  assert.ok(etat.analyse!.constats.length > 0);
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'annulee', constats: [], lecture: null, variants: [], sansTokens: false });
  assert.equal(etat.analyse!.statut, 'annulee');
  assert.deepEqual([etat.analyse!.constats, etat.analyse!.tous], [[], []]);
});

test('une analyse annulée, arrêtée ou finale refuse tout provisoire et tout final tardif de la même identité', () => {
  for (const fin of ['annulee', 'arretee', 'complete', 'partielle'] as const) {
    const etat = analyseEn('provisoire');
    recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: fin, constats: fin === 'complete' || fin === 'partielle' ? constatsAlert : [], lecture: null, variants, sansTokens: false });
    const avant = JSON.stringify(etat.analyse);
    recevoirUneAnalyse(etat, { type: 'analyse-provisoire', analyse: IDENTITE, constats: constatsAlert, ignores: [], lecture: null as never, variants });
    recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsAlert, lecture: null, variants, sansTokens: false });
    recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'partielle', constats: [], lecture: null, variants: [], sansTokens: false });
    assert.equal(JSON.stringify(etat.analyse), avant, fin);
    assert.equal(etat.analyse!.statut, fin);
  }
});

test('après l’arrêt du moteur, le final arrêté retire les constats provisoires et aucune action n’envoie de demande', () => {
  const etat = analyseEn('provisoire');
  assert.ok(etat.analyse!.constats.length > 0);
  const bloquant = { id: 'C0:0', code: 'C0', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message: 'boum' } } as Constat;
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'arretee', constats: [bloquant], lecture: null, variants: [], sansTokens: false });
  assert.equal(etat.analyse!.statut, 'arretee');
  assert.deepEqual(etat.analyse!.constats.map(({ id }) => id), ['C0:0']);
  assert.equal(analyseApplicable(etat.analyse), false);
  assert.deepEqual(envoisDe(etat), []);
});

test('le final partielle remplace le provisoire, garde les identifiants et rend les actions permises', () => {
  const etat = analyseEn('provisoire');
  const ids = etat.analyse!.constats.map(({ id }) => id);
  const lecture = { layersLus: 2000, layersNonLus: 640, variantsNonLus: ['Severity=warning'], manquees: [{ layer: 'texte', champ: 'dimensions', motif: 'boîte illisible' }] };
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'partielle', constats: constatsAlert, lecture, variants, sansTokens: false });
  assert.equal(etat.analyse!.statut, 'partielle');
  assert.deepEqual(etat.analyse!.lecture, lecture);
  assert.deepEqual(etat.analyse!.constats.map(({ id }) => id), ids);
  assert.equal(analyseApplicable(etat.analyse), true);
  assert.ok(envoisDe(etat).length > 0, 'les mêmes actions envoient leur demande');
});

test('une péremption pendant le provisoire garde les constats, sort du calcul et refuse tout final tardif', () => {
  const etat = analyseEn('provisoire');
  const ids = etat.analyse!.constats.map(({ id }) => id);
  recevoirUneAnalyse(etat, { type: 'perime', analyse: IDENTITE, cause: 'document' });
  assert.equal(etat.analyse!.perimee, true);
  assert.equal(calculEnCours(etat.analyse!), false, 'Analyser redevient possible');
  assert.deepEqual(etat.analyse!.constats.map(({ id }) => id), ids);
  const avant = JSON.stringify(etat.analyse);
  for (const statut of ['complete', 'partielle', 'annulee', 'arretee'] as const) recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut, constats: [], lecture: null, variants: [], sansTokens: false });
  recevoirUneAnalyse(etat, { type: 'analyse-provisoire', analyse: IDENTITE, constats: [], ignores: [], lecture: null as never, variants });
  assert.equal(JSON.stringify(etat.analyse), avant);
  assert.equal(analyseApplicable(etat.analyse), false);
  assert.deepEqual(envoisDe(etat), []);
});

test('une péremption pendant en-cours sort du calcul sans constat et refuse le final tardif', () => {
  const etat = etatInitial();
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: IDENTITE });
  assert.equal(calculEnCours(etat.analyse!), true);
  recevoirUneAnalyse(etat, { type: 'perime', analyse: IDENTITE, cause: 'selection' });
  assert.equal(calculEnCours(etat.analyse!), false);
  recevoirUneAnalyse(etat, { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsAlert, lecture: null, variants, sansTokens: false });
  assert.equal(etat.analyse!.statut, 'en-cours');
  assert.deepEqual(etat.analyse!.constats, []);
  assert.equal(analyseApplicable(etat.analyse), false);
  assert.deepEqual(envoisDe(etat), []);
});
