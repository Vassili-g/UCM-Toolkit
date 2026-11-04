/** Ignorer une question : trois gestes (Ignorer, Ne plus proposer, Plus tard) pour trois durées (le fichier, la proposition, la session). */
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';

import type { CatalogueDeReference, Constat, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';
import { atelierDEcriture } from './figmaDeTest';

poserLeDom();

import type { PluginMessage } from '../src/messages';
import { lireLesIgnores, type PortDIgnores } from '../src/ecriture/ignores';
import { reinitialiserLAnalyse, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { rangementDeFigma, traiterAvec as traiterLesIgnores } from '../src/sandbox/ignores';
import { monterLePanneau } from '../src/ui/analyse';
import { recevoirUneAnalyse, type AnalyseRecue } from '../src/ui/composant/analyse';
import { monterLesQuestions } from '../src/ui/questions';
import { carteDeQuestion, regrouperLesCartes, type ContexteDeQuestions } from '../src/ui/questions/modele';

const { constatsDeQuestions } = require('../galerie/etats/questions.cjs') as { constatsDeQuestions: Constat[] };
const { alertCorrections } = require('../galerie/etats/corrections.cjs');
const identite = { sujet: 'Alert', generation: 1 };
const liaison = constatsDeQuestions.find(({ id }) => id === 'C15:title') as Constat;
const nom = constatsDeQuestions.find(({ id }) => id === 'C12:outlined') as Constat;
const autre: Constat = { id: 'autre', code: 'C31', type: 'verifier', famille: 'variants', variants: [], layers: [], faits: {} };

beforeEach(() => reinitialiserLAnalyse());
afterEach(() => reinitialiserLAnalyse());

const contexteDeQuestions: ContexteDeQuestions = { composant: 'Alert', variants: alertCorrections.sujet.variants, layers: new Map([['alert:l:title', 'title']]) };
const libelles = (racine: ElementDeTest): string[] => racine.querySelectorAll('button').map((candidat) => candidat.textContent);
const bouton = (racine: ElementDeTest, libelle: string): ElementDeTest => {
  const trouve = racine.querySelectorAll('button').find((candidat) => candidat.textContent === libelle);
  assert.ok(trouve, `bouton ${libelle}`);
  return trouve;
};

function analyseRecue(identiteDeLAnalyse: { sujet: string; generation: number }, constats: readonly Constat[]): AnalyseRecue {
  return {
    identite: identiteDeLAnalyse, statut: 'complete', constats, tous: constats, ignores: [], repondues: {}, variants: alertCorrections.sujet.variants,
    lecture: null, causes: [], sansTokens: false, progression: null, perimee: false, cause: null, ecriture: null, refusPendantEcriture: false, lot: null, appliquees: [], liaisons: null,
    liaisonsDemandees: false, recueA: 0,
  };
}

/** Le montage des cartes de questions seul, avec les demandes qu'il envoie. */
function monterLesCartes() {
  const demandes: string[] = [];
  let redessins = 0;
  const questions = monterLesQuestions({
    repondre() {}, annuler() {}, selectionner() {}, redessiner: () => { redessins += 1; },
    ignorer: (constats) => demandes.push(`ignorer:${constats.map(({ id }) => id).join(',')}`),
    nePlusProposer: (constats) => demandes.push(`proposition:${constats.map(({ id }) => id).join(',')}`),
  });
  const cartes = [liaison, nom].map((constat) => carteDeQuestion(constat, contexteDeQuestions)!);
  const groupes = regrouperLesCartes(cartes, {});
  const dessiner = (generation: number): ElementDeTest[] => {
    questions.poser(analyseRecue({ sujet: 'Alert', generation }, [liaison, nom]));
    return questions.cartes(groupes).map(comme);
  };
  return { demandes, dessiner, redessins: () => redessins };
}

test('une carte de question propose Ignorer, « Ne plus proposer » puis « Plus tard », dans cet ordre', () => {
  const { dessiner } = monterLesCartes();
  for (const carte of dessiner(1)) {
    const gestes = libelles(carte).filter((libelle) => ['Ignorer', 'Ne plus proposer', 'Plus tard'].includes(libelle));
    assert.deepEqual(gestes, ['Ignorer', 'Ne plus proposer', 'Plus tard']);
  }
});

test('Ignorer vaut pour le fichier, « Ne plus proposer » pour la proposition, « Plus tard » ne demande rien au sandbox', () => {
  const { demandes, dessiner, redessins } = monterLesCartes();
  const [premiere] = dessiner(1);
  bouton(premiere, 'Ignorer').clic();
  bouton(premiere, 'Ne plus proposer').clic();
  assert.deepEqual(demandes, ['ignorer:C15:title', 'proposition:C15:title']);
  bouton(premiere, 'Plus tard').clic();
  assert.deepEqual(demandes, ['ignorer:C15:title', 'proposition:C15:title']);
  assert.equal(redessins(), 1);
});

test('« Plus tard » ne dure que la session : la carte repart en fin de liste, puis revient à sa place à l’analyse suivante', () => {
  const { dessiner } = monterLesCartes();
  const titre = (carte: ElementDeTest): string => comme(carte.querySelector('.question-titre')).textContent;
  const [premiere, seconde] = dessiner(1);
  const ordre = [titre(premiere), titre(seconde)];
  bouton(premiere, 'Plus tard').clic();
  assert.deepEqual(dessiner(1).map(titre), [ordre[1], ordre[0]]);
  assert.deepEqual(dessiner(2).map(titre), ordre);
});

/** Le panneau entier, avec les demandes d'Ignorer et de « Ne plus proposer » que les cartes envoient. */
function monterLePanneauDeQuestions(constats: readonly Constat[]) {
  const analyse = analyseRecue(identite, [...constats, autre]);
  const etat = { composant: { lecture: alertCorrections }, analyse, architecture: null, reference: null, panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' } };
  const demandes: Array<{ portee: string; constats: string[] }> = [];
  const app = {
    etat, selectionner() {}, appliquer() {}, repondre() {}, ouvrirLaConfiguration() {}, rendre() {}, annulerLaReponse() {},
    ignorer: (constat: Constat) => demandes.push({ portee: 'constat', constats: [constat.id] }),
    ignorerLaProposition: (cibles: readonly Constat[]) => demandes.push({ portee: 'proposition', constats: cibles.map(({ id }) => id) }),
    nePlusIgnorer: (constat: Constat) => demandes.push({ portee: 'retablir', constats: [constat.id] }),
  };
  const panneau = monterLePanneau(app as never, { poserLesCorrections() {}, poserLaSelectionDuPlugin() {} } as never);
  panneau.mettreAJour();
  return {
    etat, demandes, racine: comme(panneau.element),
    recevoir(message: Parameters<typeof recevoirUneAnalyse>[1]) {
      recevoirUneAnalyse(etat as never, message);
      panneau.mettreAJour();
    },
  };
}
const cartesDeQuestions = (racine: ElementDeTest): ElementDeTest[] => racine.querySelectorAll('.question');

test('Ignorer écarte la question dans le fichier : elle rejoint les Ignorés, et Ne plus ignorer la rend', () => {
  const banc = monterLePanneauDeQuestions([liaison, nom]);
  assert.equal(cartesDeQuestions(banc.racine).length, 2);
  bouton(cartesDeQuestions(banc.racine)[0], 'Ignorer').clic();
  assert.deepEqual(banc.demandes, [{ portee: 'constat', constats: [liaison.id] }]);
  banc.recevoir({ type: 'ignores', analyse: identite, constats: [liaison.id] });
  assert.equal(cartesDeQuestions(banc.racine).length, 1);
  assert.equal(banc.racine.querySelectorAll('.muette').length, 1);
  bouton(banc.racine, 'Ne plus ignorer').clic();
  assert.deepEqual(banc.demandes.at(-1), { portee: 'retablir', constats: [liaison.id] });
  banc.recevoir({ type: 'ignores', analyse: identite, constats: [] });
  assert.equal(cartesDeQuestions(banc.racine).length, 2);
  assert.equal(banc.racine.querySelector('.muette'), null);
});

test('« Ne plus proposer » retire la proposition sans retirer le constat', () => {
  const banc = monterLePanneauDeQuestions([liaison, nom]);
  bouton(cartesDeQuestions(banc.racine)[0], 'Ne plus proposer').clic();
  assert.deepEqual(banc.demandes, [{ portee: 'proposition', constats: [liaison.id] }]);
  banc.recevoir({ type: 'ignores', analyse: identite, constats: [], propositions: [liaison.id] });
  assert.equal(cartesDeQuestions(banc.racine).length, 1);
  assert.equal(banc.racine.querySelector('.muette'), null);
  const reste = banc.etat.analyse.constats.find(({ id }) => id === liaison.id);
  assert.ok(reste, 'le constat reste dans l’analyse');
  assert.equal(reste.question, undefined);
});

test('un constat ignoré qui porte une question garde le titre de sa question dans les Ignorés', () => {
  const banc = monterLePanneauDeQuestions([nom]);
  banc.recevoir({ type: 'ignores', analyse: identite, constats: [nom.id] });
  const texte = comme(banc.racine.querySelector('.muette')).textContent;
  assert.ok(texte.includes('Renommer Outlined en outline'), texte);
  assert.ok(!texte.includes('Constat C12'), texte);
});

/** Un relevé et un catalogue où le rayon 13 appelle une question C29 : deux tokens de rayon proches. */
function lecteursAvecQuestion(ignores: Lecteurs['ignores']): Lecteurs {
  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' }, proprietes: [],
    variants: [{
      id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, modesEffectifs: {},
      layers: [{
        id: 'root', nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1,
        dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], liaisons: [], valeursEnDur: [{ champ: 'cornerRadius', valeur: 13 }],
      }],
    }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }] }],
    variables: [
      { cle: 'r12', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 12 }, Dark: { valeur: 12 } } },
      { cle: 'r14', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 14 }, Dark: { valeur: 14 } } },
    ],
  };
  return {
    async sujet() { return { cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert', 'v-Alert'] } satisfies SujetAAnalyser; },
    releve: async () => ({ statut: 'lu' as const, releve }),
    catalogue: async () => catalogue,
    moteur: async (): Promise<ResultatSansPublication> => ({
      etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne,
    }),
    // Une carte de règles : le composant n'a aucune règle d'usage.
    regles: async () => ({
      composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false,
      modele: { nom: 'Alert', sections: [{ tag: 'prop', elements: [{ genre: 'regle', tag: 'prop', cible: 'severity.info' }] }] },
      proprietes: ['severity'], documentees: [], presentes: [], manquantes: { nom: 'Alert', sections: [] },
    }),
    ignores,
  };
}

/** Un fichier UCM et ses analyses successives : chacune lit les clés d'Ignorer que les demandes ont rangées. */
function bancDeFichier() {
  const atelier = atelierDEcriture();
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: atelier.api as never, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  const lectures = lecteursAvecQuestion(async () => lireLesIgnores(atelier.api as unknown as PortDIgnores));
  const ignorer = traiterLesIgnores(() => rangementDeFigma(atelier.api as unknown as PortDIgnores));
  const analyser = async (): Promise<{ analyse: Extract<PluginMessage, { type: 'analyse' }>; ignores: Extract<PluginMessage, { type: 'ignores' }> | undefined }> => {
    envoyes.length = 0;
    await traiterAvec(lectures)({ type: 'analyser' }, contexte);
    const analyse = envoyes.find((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse');
    assert.ok(analyse);
    return { analyse, ignores: envoyes.find((message): message is Extract<PluginMessage, { type: 'ignores' }> => message.type === 'ignores') };
  };
  return { atelier, contexte, ignorer, analyser };
}

/** Ce que le panneau retient d'une analyse et de ses ignorés, comme le fait l'interface. */
function recevoirLesMessages(analyse: Extract<PluginMessage, { type: 'analyse' }>, ignores: Extract<PluginMessage, { type: 'ignores' }> | undefined): AnalyseRecue {
  const etat = { analyse: { ...analyseRecue(analyse.analyse, []), statut: 'en-cours' as const }, demande: null };
  recevoirUneAnalyse(etat as never, analyse);
  if (ignores) recevoirUneAnalyse(etat as never, ignores);
  return etat.analyse;
}

test('une question ignorée ne revient pas à l’analyse suivante, et Ne plus ignorer la rend', async () => {
  const b = await bancDeFichier();
  const premiere = await b.analyser();
  const question = premiere.analyse.constats.find(({ code }) => code === 'C29');
  assert.ok(question?.question, 'le rayon 13 pose une question');
  assert.ok(recevoirLesMessages(premiere.analyse, premiere.ignores).constats.some(({ id }) => id === question.id));

  await b.ignorer({ type: 'ignorer', analyse: premiere.analyse.analyse, constat: question.id, portee: 'constat' }, b.contexte);
  const seconde = await b.analyser();
  assert.deepEqual(seconde.ignores?.constats, [question.id]);
  const visible = recevoirLesMessages(seconde.analyse, seconde.ignores);
  assert.equal(visible.constats.some(({ id }) => id === question.id), false, 'la question ne revient pas');
  assert.equal(visible.tous.some(({ id }) => id === question.id), true, 'le constat reste dans l’analyse, ignoré');

  await b.ignorer({ type: 'ne-plus-ignorer', analyse: seconde.analyse.analyse, constat: question.id }, b.contexte);
  const troisieme = await b.analyser();
  assert.equal(recevoirLesMessages(troisieme.analyse, troisieme.ignores).constats.find(({ id }) => id === question.id)?.question?.id, question.id);
});

test('une proposition retirée reste retirée après une nouvelle analyse, pour une question et pour une carte de règles', async () => {
  const b = await bancDeFichier();
  const premiere = await b.analyser();
  const question = premiere.analyse.constats.find(({ code }) => code === 'C29');
  const regle = premiere.analyse.constats.find(({ code }) => code === 'C43' || code === 'C45');
  assert.ok(question?.question && regle?.correction, 'une question et une carte de règles');
  assert.equal(premiere.ignores?.propositions, undefined, 'rien n’est encore retiré');

  await b.ignorer({ type: 'ignorer', analyse: premiere.analyse.analyse, constat: question.id, portee: 'proposition' }, b.contexte);
  await b.ignorer({ type: 'ignorer', analyse: premiere.analyse.analyse, constat: regle.id, portee: 'proposition' }, b.contexte);
  const seconde = await b.analyser();
  assert.deepEqual(seconde.ignores, { type: 'ignores', analyse: seconde.analyse.analyse, constats: [], propositions: [question.id, regle.id] });
  const visible = recevoirLesMessages(seconde.analyse, seconde.ignores);
  for (const retiree of [question, regle]) {
    const reste = visible.constats.find(({ id }) => id === retiree.id);
    assert.ok(reste, `le constat ${retiree.id} reste`);
    assert.equal(reste.question, undefined);
    assert.equal(reste.correction, undefined);
  }
  assert.equal(visible.ignores.length, 0, 'aucun constat n’est ignoré');
});
