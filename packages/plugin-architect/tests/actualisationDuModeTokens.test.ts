/**
 * Actualiser dans le mode Tokens, de la barre au panneau des constats. Le clic relance la lecture des variables, les constats de structure
 * et, quand le fichier a un bilan, l'analyse des noms ; le message de lecture prend la place des constats dans l'onglet Constats (et plus
 * dans la table) ; la durée de l'analyse paraît à sa fin, sous la forme du mode Composant.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { UiRequest } from '../src/messages';
import type { Bilan, DemandeDeNomenclature, MessageDeNomenclature } from '../src/messages/nomenclature';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

import { creerApplication } from '../src/ui/application';
import { creerBarre } from '../src/ui/barre';
import { etatInitial, type Lecture } from '../src/ui/etat';
import { creerCoquille } from '../src/ui/nomenclature/coquille';
import { creerFrontiere, type MessageAAfficher } from '../src/ui/nomenclature/frontiere';
import { monterStructure } from '../src/ui/structure';
import { creerActualisation, texteDeLaLecture } from '../src/ui/tokens/actualisation';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';
import { TEXTES } from '../src/ui/textes';

const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { rienAFaire: Bilan } };
const BILAN = bilans.rienAFaire;

const bilanDe = (demande: number, generation: number): MessageDeNomenclature => ({ type: 'bilan', demande, bilan: { ...BILAN, generation } });
const lu = (vrai: unknown): ElementDeTest => comme(vrai);
const ATTENTE: Lecture = { statut: 'attente' };

// Le suivi, sur un faux panneau qui garde le dernier chargement et la dernière ligne de durée.
function suivi(options: { noms?: boolean; lecture?: () => Lecture } = {}) {
  const panneau = { chargement: undefined as string | null | undefined, resume: undefined as string | null | undefined, poserLeChargement(texte: string | null) { this.chargement = texte; }, poserLeResume(texte: string | null) { this.resume = texte; } };
  let temps = 1_000;
  const actualisation = creerActualisation({
    panneau, lecture: options.lecture ?? (() => ATTENTE), relancerLesNoms: () => options.noms === true, horloge: () => temps, maintenant: () => new Date(2026, 10, 5, 14, 32).getTime(),
  });
  return { actualisation, panneau, avancer: (ms: number) => { temps += ms; } };
}

test('le chargement dure jusqu’à la dernière part, puis la durée prend sa place', () => {
  const { actualisation, panneau, avancer } = suivi({ noms: true });
  actualisation.commencer();
  assert.equal(panneau.chargement, TEXTES.lectureEnCours);
  actualisation.recevoir('releve');
  actualisation.recevoir('structure');
  assert.equal(panneau.chargement, TEXTES.lectureEnCours, 'les noms manquent encore');
  assert.equal(panneau.resume, null);
  avancer(3_400);
  actualisation.recevoir('noms');
  assert.equal(panneau.chargement, null);
  assert.equal(panneau.resume, 'analysé à 14:32 en 3 s', 'le texte du mode Composant');
});

test('sans bilan, les noms ne sont pas attendus ; une part inattendue ou répétée ne change rien', () => {
  const { actualisation, panneau } = suivi({ noms: false });
  actualisation.recevoir('structure');
  assert.equal(panneau.chargement, undefined, 'rien n’a commencé');
  actualisation.commencer();
  actualisation.recevoir('noms');
  actualisation.recevoir('releve');
  assert.equal(panneau.chargement, TEXTES.lectureEnCours);
  actualisation.recevoir('structure');
  assert.equal(panneau.chargement, null);
  const resume = panneau.resume;
  actualisation.recevoir('structure');
  assert.equal(panneau.resume, resume);
});

test('une analyse des noms demandée pendant l’actualisation est attendue aussi', () => {
  const { actualisation, panneau } = suivi();
  actualisation.commencer();
  actualisation.attendreLesNoms();
  actualisation.recevoir('releve');
  actualisation.recevoir('structure');
  assert.equal(panneau.chargement, TEXTES.lectureEnCours);
  actualisation.recevoir('noms');
  assert.equal(panneau.chargement, null);
  actualisation.attendreLesNoms();
  assert.equal(actualisation.enCours(), false, 'hors actualisation, la demande des noms ne rouvre pas le chargement');
});

test('une lecture échouée ou annulée rend les constats sans durée, et un nouvel Actualiser efface la durée précédente', () => {
  const { actualisation, panneau } = suivi();
  actualisation.commencer();
  actualisation.abandonner();
  assert.equal(panneau.chargement, null);
  assert.equal(panneau.resume, null);
  actualisation.commencer();
  actualisation.recevoir('releve');
  actualisation.recevoir('structure');
  assert.notEqual(panneau.resume, null);
  actualisation.commencer();
  assert.equal(panneau.resume, null, 'la durée de l’analyse précédente ne reste pas pendant la suivante');
  assert.equal(panneau.chargement, TEXTES.lectureEnCours);
});

test('le texte de chargement reprend celui de la lecture : la phase et son compte, sinon « Lecture des variables… »', () => {
  assert.equal(texteDeLaLecture({ statut: 'en-cours', demande: 1, phase: 'variables', fait: 0, total: 1 }), TEXTES.lectureEnCours);
  assert.equal(texteDeLaLecture({ statut: 'en-cours', demande: 1, phase: 'variables', fait: 12, total: 40 }), TEXTES.progression(TEXTES.phase.variables, 12, 40));
  assert.equal(texteDeLaLecture(ATTENTE), TEXTES.lectureEnCours);
  const lecture: { courante: Lecture } = { courante: { statut: 'en-cours', demande: 1, phase: 'variables', fait: 0, total: 1 } };
  const { actualisation, panneau } = suivi({ lecture: () => lecture.courante });
  actualisation.commencer();
  lecture.courante = { statut: 'en-cours', demande: 1, phase: 'variables', fait: 12, total: 40 };
  actualisation.rafraichir();
  assert.equal(panneau.chargement, TEXTES.progression(TEXTES.phase.variables, 12, 40));
});

// Le panneau : le message remplace les constats sans les démonter, la durée est la ligne `.arch-resume` du mode Composant.
function panneau() {
  const racine = document.createElement('div');
  const nomenclature = { questions: document.createElement('div'), renommages: document.createElement('div'), remises: document.createElement('div') };
  const tokens = monterLePanneauDesTokens({ racine, nomenclature, auChangement: () => {} });
  tokens.poser({ bilan: BILAN, reglesRecues: 0 });
  tokens.poserLaStructure({ constats: [], corrections: [], noms: { nom: () => null, cle: () => null } });
  return { tokens, racine: lu(racine) };
}

test('le message de chargement remplace les constats dans l’onglet, et les constats reviennent avec lui', () => {
  const { tokens, racine } = panneau();
  const [resume, chargement, ...zones] = racine.children;
  assert.equal(chargement.hidden, true);
  assert.ok(zones.every((zone) => !zone.hidden), 'sommaire, haut, liste et pied sont visibles');
  tokens.poserLeChargement(TEXTES.lectureEnCours);
  assert.equal(chargement.hidden, false);
  assert.equal(chargement.textContent, TEXTES.lectureEnCours);
  assert.ok(zones.every((zone) => zone.hidden), 'aucun constat, aucun pied d’Appliquer pendant la lecture');
  assert.equal(resume.hidden, true);
  tokens.poserLeChargement(null);
  assert.equal(chargement.hidden, true);
  assert.ok(zones.every((zone) => !zone.hidden));
});

test('la durée est la ligne du mode Composant, en tête de l’onglet, et ne paraît pas sous le chargement', () => {
  const { tokens, racine } = panneau();
  const [resume] = racine.children;
  assert.equal(resume.hidden, true, 'rien avant la première analyse');
  tokens.poserLeResume('analysé à 14:32 en 3 s');
  assert.equal(resume.hidden, false);
  assert.equal(racine.children[0], resume, 'en tête, avant le sommaire');
  const ligne = lu(resume.querySelector('.arch-resume .arch-resume-ligne .arch-resume-titre .meta'));
  assert.equal(ligne.textContent, 'analysé à 14:32 en 3 s');
  tokens.poserLeChargement(TEXTES.lectureEnCours);
  assert.equal(resume.hidden, true);
  tokens.poserLeChargement(null);
  assert.equal(resume.hidden, false);
  tokens.poserLeResume(null);
  assert.equal(resume.hidden, true);
  assert.equal(resume.childNodes.length, 0);
});

// La frontière : une relance sans écran de lecture.
test('rafraichir relance l’analyse des noms sans prévenir l’écran ni afficher sa progression, mais rend son bilan', () => {
  const envoyees: DemandeDeNomenclature[] = [];
  const affichees: MessageAAfficher[] = [];
  const frontiere = creerFrontiere({ envoyer: (demande) => envoyees.push(demande), afficher: (message) => affichees.push(message) });
  const premiere = frontiere.analyser();
  frontiere.recevoir(bilanDe(premiere, 1));
  affichees.length = 0;
  const demande = frontiere.rafraichir();
  assert.deepEqual(envoyees.map(({ type }) => type), ['noms-analyser', 'noms-analyser']);
  assert.deepEqual(affichees, [], 'ni analyse-demandee');
  frontiere.recevoir({ type: 'lecture', demande, lues: 3, total: 10 });
  assert.deepEqual(affichees, [], 'ni progression');
  frontiere.recevoir(bilanDe(demande, 2));
  assert.deepEqual(affichees.map(({ type }) => type), ['bilan']);
  assert.equal(frontiere.calculEnCours(), false);
  const visible = frontiere.analyser();
  frontiere.recevoir({ type: 'lecture', demande: visible, lues: 3, total: 10 });
  assert.deepEqual(affichees.map(({ type }) => type), ['bilan', 'analyse-demandee', 'lecture'], 'une analyse demandée garde sa progression');
});

// La coquille : la relance attend un bilan et laisse les onglets en place.
test('la coquille ne relance rien tant que le fichier n’a pas de bilan, puis relance sans passer par l’écran de lecture', () => {
  const envoyes: unknown[] = [];
  const coquille = creerCoquille(document.createElement('div') as unknown as HTMLElement, (message) => envoyes.push(message), { poignee: false });
  assert.equal(coquille.rafraichir(), false);
  assert.deepEqual(envoyes, []);
  const demande = coquille.frontiere.analyser();
  coquille.frontiere.recevoir(bilanDe(demande, 1));
  assert.equal(coquille.etat().bilan?.generation, 1);
  envoyes.length = 0;
  assert.equal(coquille.rafraichir(), true);
  assert.deepEqual(envoyes, [{ type: 'noms-analyser', demande: demande + 1 }]);
  assert.equal(coquille.etat().analyse, null, 'pas d’écran de lecture');
  assert.equal(coquille.etat().ecran, 'travail');
  coquille.frontiere.recevoir({ type: 'lecture', demande: demande + 1, lues: 1, total: 2 });
  assert.equal(coquille.etat().analyse, null);
  coquille.frontiere.recevoir(bilanDe(demande + 1, 2));
  assert.equal(coquille.etat().bilan?.generation, 2, 'le bilan neuf remplace l’ancien');
});

/**
 * La chaîne de l'interface (`src/ui/index.ts`) : le bouton Actualiser de la barre, l'application, la coquille, le domaine structure et le
 * suivi, montés comme l'entrée les monte, avec un sandbox qui répond à la main.
 */
function chaine() {
  const envois: UiRequest[] = [];
  (globalThis as unknown as { parent: unknown }).parent = { postMessage: (message: { pluginMessage: UiRequest }) => envois.push(message.pluginMessage) };
  const etat = etatInitial();
  const coquille = creerCoquille(document.createElement('div') as unknown as HTMLElement, (message) => envois.push(message as UiRequest), { poignee: false });
  let temps = 0;
  const actualisation = creerActualisation({
    panneau: coquille.tokens, lecture: () => etat.lecture, relancerLesNoms: () => coquille.rafraichir(), horloge: () => temps, maintenant: () => new Date(2026, 10, 5, 14, 32).getTime(),
  });
  coquille.abonner((message) => {
    if (message.type === 'analyse-demandee') actualisation.attendreLesNoms();
    else if (message.type === 'bilan' || message.type === 'erreur') actualisation.recevoir('noms');
  });
  const structure = monterStructure(coquille, {
    envoyer: (message) => envois.push(message as UiRequest), noms: { nom: () => null, cle: () => null }, ouvrirLaFiche: () => {},
    apresLaStructure: () => actualisation.recevoir('structure'),
  });
  const app = creerApplication(etat, () => ({ rendre() {}, actualiser: () => actualisation.commencer() }) as never);
  const barre = creerBarre(app);
  const actualiser = lu(comme(barre.element).querySelector('.barre-lecture .bouton-discret'));
  const racineDesConstats = lu(coquille.panneaux.constats.contenu);
  return {
    envois, coquille, actualisation, etat, racineDesConstats, actualiser,
    avancer: (ms: number) => { temps += ms; },
    /** Le sandbox rend le relevé de la dernière demande, comme `case 'releve'` de l'entrée : la structure part en réponse. */
    releveRendu() {
      const { demande } = envois.filter((message) => message.type === 'lire-releve').at(-1) as Extract<UiRequest, { type: 'lire-releve' }>;
      etat.lecture = ATTENTE;
      structure.demander();
      actualisation.recevoir('releve');
      return demande;
    },
    structureRendue() {
      const { demande } = envois.filter((message) => message.type === 'lire-structure').at(-1) as Extract<UiRequest, { type: 'lire-structure' }>;
      structure.recevoir({ type: 'structure', demande, constats: [], corrections: [], ignores: { constats: [], roles: [] } });
    },
    types: () => envois.map(({ type }) => type),
  };
}

test('Actualiser relance les variables, la structure et les noms : le bilan neuf redessine les constats, la durée suit la dernière réponse', () => {
  const banc = chaine();
  const premier = banc.coquille.frontiere.analyser();
  banc.coquille.frontiere.recevoir(bilanDe(premier, 1));
  banc.envois.length = 0;

  banc.actualiser.clic();
  assert.deepEqual(banc.types(), ['lire-releve', 'noms-analyser'], 'la lecture part d’abord, l’analyse des noms pendant elle');
  assert.equal(banc.coquille.etat().ecran, 'travail', 'les onglets restent');
  const chargement = lu(banc.racineDesConstats.querySelector('.accueil'));
  assert.equal(chargement.hidden, false);
  assert.equal(chargement.textContent, TEXTES.lectureEnCours);

  banc.avancer(2_000);
  banc.releveRendu();
  assert.deepEqual(banc.types(), ['lire-releve', 'noms-analyser', 'lire-structure']);
  banc.structureRendue();
  assert.equal(chargement.hidden, false, 'le bilan des noms manque encore');
  banc.avancer(1_000);
  const demandeDesNoms = (banc.envois.find((message) => message.type === 'noms-analyser') as { demande: number }).demande;
  banc.coquille.frontiere.recevoir(bilanDe(demandeDesNoms, 2));
  assert.equal(chargement.hidden, true);
  assert.equal(banc.coquille.etat().bilan?.generation, 2);
  assert.equal(lu(banc.racineDesConstats.querySelector('.arch-resume .meta')).textContent, 'analysé à 14:32 en 3 s');
});

test('au premier lancement, sans bilan, Actualiser ne lance pas l’analyse des noms et se termine sur la structure', () => {
  const banc = chaine();
  banc.actualiser.clic();
  assert.deepEqual(banc.types(), ['lire-releve']);
  banc.releveRendu();
  banc.structureRendue();
  assert.equal(lu(banc.racineDesConstats.querySelector('.accueil')).hidden, true);
  assert.notEqual(banc.racineDesConstats.querySelector('.arch-resume .meta'), null);
});
