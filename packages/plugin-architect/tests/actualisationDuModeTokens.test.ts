/**
 * Actualiser dans le mode Tokens, de la barre au panneau des constats. Le clic relance la lecture des variables, les constats de structure
 * et, quand le fichier a un bilan, l'analyse des noms. Le panneau des constats reste visible pendant l'analyse : les cartes de structure
 * paraissent dès leur réception, Noms reste en cours jusqu'au bilan, Appliquer reste désactivé jusqu'à la fin de l'analyse complète et
 * les corrections de la révision précédente sont désactivées. La durée de l'analyse paraît à sa fin, sous la forme du mode Composant.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { UiRequest } from '../src/messages';
import type { Constat, Correction } from '../src/messages/commun';
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
import { monterLePanneauDesTokens, type AttenteDeLAnalyse } from '../src/ui/tokens/panneau';
import { TEXTES } from '../src/ui/textes';

const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { rienAFaire: Bilan; travail: Bilan } };
const BILAN = bilans.rienAFaire;
const integrite = require('../galerie/structure/integrite.cjs') as { manquantes: readonly Constat[]; sansEcriture: readonly Constat[]; reponse(constats: readonly Constat[], demande?: number): { constats: readonly Constat[]; corrections: readonly Correction[] } };
const { structure: reponseDeGalerie } = require('../galerie/structure/donnees.cjs') as { structure(demande: number): { constats: readonly Constat[]; corrections: readonly Correction[] } };

const bilanDe = (demande: number, generation: number): MessageDeNomenclature => ({ type: 'bilan', demande, bilan: { ...BILAN, generation } });
const lu = (vrai: unknown): ElementDeTest => comme(vrai);
const ATTENTE: Lecture = { statut: 'attente' };

// Le suivi, sur un faux panneau qui garde la dernière attente et la dernière ligne de durée.
function suivi(options: { noms?: boolean; lecture?: () => Lecture } = {}) {
  const panneau = { attente: undefined as AttenteDeLAnalyse | null | undefined, resume: undefined as string | null | undefined, poserLAttente(attente: AttenteDeLAnalyse | null) { this.attente = attente; }, poserLeResume(texte: string | null) { this.resume = texte; } };
  let temps = 1_000;
  const actualisation = creerActualisation({
    panneau, lecture: options.lecture ?? (() => ATTENTE), relancerLesNoms: () => options.noms === true, horloge: () => temps, maintenant: () => new Date(2026, 10, 5, 14, 32).getTime(),
  });
  return { actualisation, panneau, avancer: (ms: number) => { temps += ms; } };
}

test('l’attente dit à chaque part reçue ce qui manque encore, jusqu’à la dernière ; la durée prend alors sa place', () => {
  const { actualisation, panneau, avancer } = suivi({ noms: true });
  actualisation.commencer();
  assert.deepEqual(panneau.attente, { structure: true, noms: true, texte: TEXTES.lectureEnCours, enTete: true });
  actualisation.recevoir('releve');
  assert.deepEqual(panneau.attente, { structure: true, noms: true, texte: TEXTES.lectureEnCours, enTete: true }, 'la structure suit le relevé');
  actualisation.recevoir('structure');
  assert.deepEqual(panneau.attente, { structure: false, noms: true, texte: TEXTES.lectureEnCours, enTete: true }, 'les noms manquent encore');
  assert.equal(panneau.resume, null);
  avancer(3_400);
  actualisation.recevoir('noms');
  assert.equal(panneau.attente, null);
  assert.equal(panneau.resume, 'analysé à 14:32 en 3 s', 'le texte du mode Composant');
});

test('sans bilan, les noms ne sont pas attendus ; une part inattendue ou répétée ne change rien', () => {
  const { actualisation, panneau } = suivi({ noms: false });
  actualisation.recevoir('structure');
  assert.equal(panneau.attente, undefined, 'rien n’a commencé');
  actualisation.commencer();
  actualisation.recevoir('noms');
  actualisation.recevoir('releve');
  assert.deepEqual(panneau.attente, { structure: true, noms: false, texte: TEXTES.lectureEnCours, enTete: true });
  actualisation.recevoir('structure');
  assert.equal(panneau.attente, null);
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
  assert.equal(panneau.attente?.noms, true);
  actualisation.recevoir('noms');
  assert.equal(panneau.attente, null);
  actualisation.attendreLesNoms();
  assert.equal(actualisation.enCours(), false, 'hors actualisation, la demande des noms ne rouvre pas l’attente');
  assert.equal(panneau.attente, null);
});

test('une lecture échouée ou annulée lève l’attente sans durée, et un nouvel Actualiser efface la durée précédente', () => {
  const { actualisation, panneau } = suivi();
  actualisation.commencer();
  actualisation.abandonner();
  assert.equal(panneau.attente, null);
  assert.equal(panneau.resume, null);
  actualisation.commencer();
  actualisation.recevoir('releve');
  actualisation.recevoir('structure');
  assert.notEqual(panneau.resume, null);
  actualisation.commencer();
  assert.equal(panneau.resume, null, 'la durée de l’analyse précédente ne reste pas pendant la suivante');
  assert.equal((panneau.attente as AttenteDeLAnalyse | null)?.texte, TEXTES.lectureEnCours);
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
  assert.equal(panneau.attente?.texte, TEXTES.progression(TEXTES.phase.variables, 12, 40));
});

test('à l’ouverture, l’attente est suivie sans que son texte paraisse en tête des constats', () => {
  const { actualisation, panneau } = suivi({ noms: true });
  actualisation.commencer(false);
  assert.deepEqual(panneau.attente, { structure: true, noms: true, texte: TEXTES.lectureEnCours, enTete: false });
});

// Le panneau : le message de lecture reste en tête sans cacher les constats, la durée est la ligne `.arch-resume` du mode Composant.
const SANS_NOMS = { nom: () => null, cle: () => null };
function panneau() {
  const racine = document.createElement('div');
  const nomenclature = { questions: document.createElement('div'), renommages: document.createElement('div'), remises: document.createElement('div') };
  const tokens = monterLePanneauDesTokens({ racine, nomenclature, auChangement: () => {} });
  tokens.poser({ bilan: BILAN, reglesRecues: 0 });
  tokens.poserLaStructure({ constats: [], corrections: [], noms: SANS_NOMS });
  return { tokens, racine: lu(racine) };
}

const ATTENTE_DE_STRUCTURE: AttenteDeLAnalyse = { structure: true, noms: false, texte: TEXTES.lectureEnCours, enTete: true };

test('G2.1 : le message de lecture paraît en tête tant que la structure manque, et les constats restent visibles', () => {
  const { tokens, racine } = panneau();
  const [resume, chargement, ...zones] = racine.children;
  assert.equal(chargement.hidden, true);
  assert.ok(zones.every((zone) => !zone.hidden), 'sommaire, haut, liste et pied sont visibles');
  tokens.poserLAttente(ATTENTE_DE_STRUCTURE);
  assert.equal(chargement.hidden, false);
  assert.equal(chargement.textContent, TEXTES.lectureEnCours);
  assert.ok(zones.every((zone) => !zone.hidden), 'le panneau reste visible pendant l’analyse');
  assert.equal(resume.hidden, true);
  tokens.poserLAttente({ ...ATTENTE_DE_STRUCTURE, structure: false });
  assert.equal(chargement.hidden, true, 'la structure est reçue : le message de tête se retire');
  tokens.poserLAttente(null);
  assert.equal(chargement.hidden, true);
  assert.ok(zones.every((zone) => !zone.hidden));
});

test('la durée est la ligne du mode Composant, en tête de l’onglet, et ne paraît pas sous le message de lecture', () => {
  const { tokens, racine } = panneau();
  const [resume] = racine.children;
  assert.equal(resume.hidden, true, 'rien avant la première analyse');
  tokens.poserLeResume('analysé à 14:32 en 3 s');
  assert.equal(resume.hidden, false);
  assert.equal(racine.children[0], resume, 'en tête, avant le sommaire');
  const ligne = lu(resume.querySelector('.arch-resume .arch-resume-ligne .arch-resume-titre .meta'));
  assert.equal(ligne.textContent, 'analysé à 14:32 en 3 s');
  tokens.poserLAttente(ATTENTE_DE_STRUCTURE);
  assert.equal(resume.hidden, true);
  tokens.poserLAttente(null);
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

const sectionDe = (racine: ElementDeTest, id: string): ElementDeTest | undefined => racine.querySelectorAll('.section-element').find((section) => section.dataset.element === id);

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
  const app = creerApplication(etat, () => ({ rendre() {}, actualiser: (auDemarrage: boolean) => actualisation.commencer(!auDemarrage) }) as never);
  const barre = creerBarre(app);
  const demarrer = () => app.actualiser(true);
  const actualiser = lu(comme(barre.element).querySelector('.barre-lecture .bouton-discret'));
  const racineDesConstats = lu(coquille.panneaux.constats.contenu);
  return {
    envois, coquille, actualisation, etat, racineDesConstats, actualiser, demarrer,
    avancer: (ms: number) => { temps += ms; },
    /** Le sandbox rend le relevé de la dernière demande, comme `case 'releve'` de l'entrée : la structure part en réponse. */
    releveRendu() {
      const { demande } = envois.filter((message) => message.type === 'lire-releve').at(-1) as Extract<UiRequest, { type: 'lire-releve' }>;
      etat.lecture = ATTENTE;
      structure.demander();
      actualisation.recevoir('releve');
      return demande;
    },
    structureRendue(reponse: { readonly constats?: readonly Constat[]; readonly corrections?: readonly Correction[] } = {}) {
      const { demande } = envois.filter((message) => message.type === 'lire-structure').at(-1) as Extract<UiRequest, { type: 'lire-structure' }>;
      structure.recevoir({ type: 'structure', demande, constats: reponse.constats ?? [], corrections: reponse.corrections ?? [], ignores: { constats: [], roles: [] } });
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
  assert.equal(chargement.hidden, true, 'la structure est là : le message de tête se retire');
  assert.notEqual(sectionDe(banc.racineDesConstats, 'noms')?.querySelector('.bande-element.en-cours'), null, 'le bilan des noms manque encore : Noms est en cours');
  banc.avancer(1_000);
  const demandeDesNoms = (banc.envois.find((message) => message.type === 'noms-analyser') as { demande: number }).demande;
  banc.coquille.frontiere.recevoir(bilanDe(demandeDesNoms, 2));
  assert.equal(banc.racineDesConstats.querySelector('.bande-element.en-cours'), null);
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

test('à l’ouverture, la durée paraît après la première analyse sans message de lecture en tête des constats', () => {
  const banc = chaine();
  banc.demarrer();
  assert.deepEqual(banc.types(), ['lire-releve']);
  assert.equal(lu(banc.racineDesConstats.querySelector('.accueil')).hidden, true, 'le chargement de l’ouverture reste celui d’avant');
  banc.avancer(2_000);
  banc.releveRendu();
  assert.equal(banc.racineDesConstats.querySelector('.arch-resume .meta'), null);
  banc.avancer(1_000);
  banc.structureRendue();
  assert.equal(lu(banc.racineDesConstats.querySelector('.arch-resume .meta')).textContent, 'analysé à 14:32 en 3 s');
});

test('à l’ouverture, une analyse des noms demandée par l’ouverture est attendue avant la durée', () => {
  const banc = chaine();
  banc.demarrer();
  banc.releveRendu();
  banc.coquille.frontiere.analyser();
  banc.structureRendue();
  assert.equal(banc.racineDesConstats.querySelector('.arch-resume .meta'), null);
  banc.coquille.frontiere.recevoir(bilanDe(1, 1));
  assert.notEqual(banc.racineDesConstats.querySelector('.arch-resume .meta'), null);
});

// ---------------------------------------------------------------------------------------------------------------------------
// G2 : la structure s'affiche sans attendre les noms.

const parent = (element: ElementDeTest): ElementDeTest => element.parent as ElementDeTest;
const sectionsDe = (racine: ElementDeTest): string[] => racine.querySelectorAll('.section-element').map((section) => section.dataset.element);
const casesDe = (racine: ElementDeTest): ElementDeTest[] => racine.querySelectorAll('input').filter((caseACocher) => caseACocher.type === 'checkbox');
const appliquerDe = (racine: ElementDeTest): ElementDeTest => lu(racine.querySelectorAll('.corrections-pied button').find((bouton) => bouton.textContent === TEXTES.appliquer));
const MANQUANTES = integrite.reponse(integrite.manquantes);
const derniereDemandeDesNoms = (banc: ReturnType<typeof chaine>): number => (banc.envois.filter((message) => message.type === 'noms-analyser').at(-1) as { demande: number }).demande;

test('G2.1 : la structure reçue pendant l’analyse des noms remplace la page de lecture par les onglets, avec ses cartes et Noms en cours', () => {
  const banc = chaine();
  banc.demarrer();
  banc.coquille.frontiere.analyser();
  const onglets = parent(lu(banc.coquille.panneaux.constats.element));
  assert.equal(banc.coquille.etat().ecran, 'lecture', 'rien n’est encore reçu');
  assert.equal(onglets.hidden, true);
  banc.avancer(2_000);
  banc.releveRendu();
  assert.equal(onglets.hidden, true, 'le relevé seul ne montre pas de constat');

  banc.structureRendue(MANQUANTES);
  assert.equal(banc.coquille.etat().bilan, null, 'le bilan des noms n’est pas là');
  assert.equal(banc.coquille.etat().ecran, 'travail');
  assert.equal(onglets.hidden, false, 'le panneau des constats est visible');
  assert.ok(banc.racineDesConstats.querySelectorAll('.structure-liste .bloc').length > 0, 'les cartes de structure sont affichées');
  const noms = lu(sectionDe(banc.racineDesConstats, 'noms'));
  assert.notEqual(noms.querySelector('.bande-element.en-cours'), null, 'Noms reste en cours');
  assert.equal(noms.querySelector('.accueil-texte')?.textContent, TEXTES.lectureEnCours, 'avec le texte de chargement existant');
  assert.equal(noms.querySelector('.nombre'), null, 'sans nombre de cartes');
  assert.equal(sectionsDe(banc.racineDesConstats)[0], 'noms', 'Noms garde sa place en tête');

  banc.coquille.frontiere.recevoir(bilanDe(derniereDemandeDesNoms(banc), 1));
  assert.equal(banc.racineDesConstats.querySelector('.bande-element.en-cours'), null, 'le bilan arrive : Noms n’est plus en cours');
});

test('G2.1 : une analyse des noms que l’actualisation ne suit pas laisse aussi les onglets, Noms en cours jusqu’au bilan', () => {
  const banc = chaine();
  banc.demarrer();
  banc.releveRendu();
  banc.structureRendue(MANQUANTES);
  assert.equal(banc.coquille.etat().ecran, 'premier-lancement');
  const demande = banc.coquille.frontiere.analyser();
  assert.equal(banc.coquille.etat().ecran, 'travail', 'la structure est déjà là : pas de page de lecture');
  assert.notEqual(banc.racineDesConstats.querySelector('.bande-element.en-cours'), null);
  banc.coquille.frontiere.recevoir(bilanDe(demande, 1));
  assert.equal(banc.racineDesConstats.querySelector('.bande-element.en-cours'), null);
});

test('G2.1 : l’ordre des catégories et l’état des cartes sont, à la fin, ceux d’une analyse reçue d’un seul coup', () => {
  const { constats, corrections } = reponseDeGalerie(1);
  const monter = () => {
    const racine = document.createElement('div');
    const nomenclature = { questions: document.createElement('div'), renommages: document.createElement('div'), remises: document.createElement('div') };
    return { tokens: monterLePanneauDesTokens({ racine, nomenclature, auChangement: () => {} }), racine: lu(racine) };
  };
  const lue = { constats, corrections, noms: SANS_NOMS };
  const direct = monter();
  direct.tokens.poser({ bilan: bilans.travail, reglesRecues: 0 });
  direct.tokens.poserLaStructure(lue);

  const progressif = monter();
  progressif.tokens.poserLAttente({ structure: true, noms: true, texte: TEXTES.lectureEnCours, enTete: true });
  progressif.tokens.poserLaStructure(lue);
  assert.ok(sectionsDe(progressif.racine).length > 1, 'les sections de structure paraissent avant le bilan');
  progressif.tokens.poserLAttente({ structure: false, noms: true, texte: TEXTES.lectureEnCours, enTete: true });
  progressif.tokens.poser({ bilan: bilans.travail, reglesRecues: 0 });
  progressif.tokens.poserLAttente(null);

  assert.deepEqual(sectionsDe(progressif.racine), sectionsDe(direct.racine));
  assert.equal(progressif.racine.textContent, direct.racine.textContent, 'sommaire, bandes, nombres et catégories tenues sont identiques');
  assert.equal(progressif.tokens.total(), direct.tokens.total());
});

test('G2.2 : aucune catégorie ne se déclare tenue avant la fin de l’analyse, quelle que soit la part qui manque', () => {
  const tenues = (racine: ElementDeTest): number => racine.querySelectorAll('.bande-element.tenue').length;
  const monter = () => {
    const racine = document.createElement('div');
    const nomenclature = { questions: document.createElement('div'), renommages: document.createElement('div'), remises: document.createElement('div') };
    const tokens = monterLePanneauDesTokens({ racine, nomenclature, auChangement: () => {} });
    tokens.poser({ bilan: BILAN, reglesRecues: 0 });
    tokens.poserLaStructure({ constats: [], corrections: [], noms: SANS_NOMS });
    return { tokens, racine: lu(racine) };
  };
  const fini = monter();
  const toutes = tenues(fini.racine);
  assert.ok(toutes > 0, 'sans attente, les catégories sans carte sont tenues');

  const structureAttendue = monter();
  structureAttendue.tokens.poserLAttente({ structure: true, noms: false, texte: TEXTES.lectureEnCours, enTete: true });
  assert.equal(tenues(structureAttendue.racine), 0, 'la structure affichée est celle de la révision précédente');

  const nomsAttendus = monter();
  nomsAttendus.tokens.poserLAttente({ structure: false, noms: true, texte: TEXTES.lectureEnCours, enTete: true });
  assert.equal(tenues(nomsAttendus.racine), 0, 'la structure est reçue mais les noms manquent');
  nomsAttendus.tokens.poserLAttente(null);
  assert.equal(tenues(nomsAttendus.racine), toutes, 'la fin de l’analyse déclare les catégories tenues');

  const nomsDemandes = monter();
  nomsDemandes.tokens.poser({ bilan: BILAN, reglesRecues: 0, nomsEnCours: true });
  assert.equal(tenues(nomsDemandes.racine), 0, 'une analyse des noms que l’écran a demandée compte aussi');
});

test('G2.3 : Appliquer reste désactivé tant que les noms manquent, même avec une correction cochée, puis se rouvre au bilan', () => {
  const banc = chaine();
  const premier = banc.coquille.frontiere.analyser();
  banc.coquille.frontiere.recevoir(bilanDe(premier, 1));
  banc.actualiser.clic();
  banc.releveRendu();
  banc.structureRendue(MANQUANTES);
  const [premiereCase] = casesDe(banc.racineDesConstats);
  assert.ok(premiereCase, 'une correction est proposée');
  assert.equal(premiereCase.disabled, false, 'la structure est celle de cette révision : ses cases sont ouvertes');
  premiereCase.clic();
  assert.equal(premiereCase.checked, true);
  assert.equal(appliquerDe(banc.racineDesConstats).disabled, true, 'les noms manquent encore');

  banc.coquille.frontiere.recevoir(bilanDe(derniereDemandeDesNoms(banc), 2));
  assert.equal(appliquerDe(banc.racineDesConstats).disabled, false, 'l’analyse est complète');
});

test('G2.3 : pendant Actualiser, les corrections de la révision précédente sont désactivées, la nouvelle structure les rouvre', () => {
  const banc = chaine();
  const premier = banc.coquille.frontiere.analyser();
  banc.coquille.frontiere.recevoir(bilanDe(premier, 1));
  banc.actualiser.clic();
  banc.releveRendu();
  banc.structureRendue(MANQUANTES);
  banc.coquille.frontiere.recevoir(bilanDe(derniereDemandeDesNoms(banc), 2));
  const cochee = casesDe(banc.racineDesConstats)[0];
  cochee.clic();
  assert.ok(casesDe(banc.racineDesConstats).every((caseACocher) => !caseACocher.disabled), 'hors analyse, les cases sont ouvertes');
  assert.equal(appliquerDe(banc.racineDesConstats).disabled, false);

  banc.actualiser.clic();
  const cases = casesDe(banc.racineDesConstats);
  assert.ok(cases.length > 1);
  assert.ok(cases.every((caseACocher) => caseACocher.disabled), 'toutes les cases de la révision précédente sont désactivées');
  assert.equal(cochee.checked, true, 'la coche reste visible');
  const gestes = banc.racineDesConstats.querySelectorAll('.section-actions button');
  assert.ok(gestes.length > 0 && gestes.every((bouton) => bouton.disabled), '« Tout cocher » et « Tout décocher » des sections aussi');
  assert.equal(lu(banc.racineDesConstats.querySelector('.cocher-global')).disabled, true);
  assert.equal(appliquerDe(banc.racineDesConstats).disabled, true);
  assert.equal(lu(banc.racineDesConstats.querySelector('.accueil')).hidden, false, 'le message de lecture est en tête');

  banc.releveRendu();
  assert.ok(casesDe(banc.racineDesConstats).every((caseACocher) => caseACocher.disabled), 'le relevé seul ne rouvre rien');
  banc.structureRendue(MANQUANTES);
  assert.ok(casesDe(banc.racineDesConstats).every((caseACocher) => !caseACocher.disabled), 'la structure neuve rouvre ses cases');
  assert.equal(appliquerDe(banc.racineDesConstats).disabled, true, 'mais les noms manquent encore');
});

test('G2.3 : pendant Actualiser, les gestes d’Ignorer des cartes de la révision précédente sont désactivés', () => {
  const banc = chaine();
  banc.actualiser.clic();
  banc.releveRendu();
  banc.structureRendue({ constats: integrite.sansEcriture.slice(0, 3) });
  const gestes = () => banc.racineDesConstats.querySelectorAll('[data-geste]');
  assert.ok(gestes().length > 0, 'les cartes ont un menu Ignorer');
  assert.ok(gestes().every((bouton) => !bouton.disabled));
  banc.actualiser.clic();
  assert.ok(gestes().every((bouton) => bouton.disabled));
  banc.releveRendu();
  banc.structureRendue({ constats: integrite.sansEcriture.slice(0, 3) });
  assert.ok(gestes().every((bouton) => !bouton.disabled));
});
