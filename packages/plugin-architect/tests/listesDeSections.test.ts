/**
 * Les sections de plus de 50 cartes (lot D6b) : leurs cartes vont dans une liste virtuelle, le DOM reste borné, et les compteurs, les
 * cases, Ignorer, Tout cocher et Appliquer comptent les cartes qui ne sont pas dans le DOM. Les hauteurs ne se mesurent pas sur le
 * faux DOM : la liste prête 72 px à chaque carte et le conteneur en mesure 400.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat, Correction } from '../src/messages/commun';
import type { DemandeDeStructure } from '../src/messages/structure';
import type { Bilan } from '../src/messages/nomenclature';

import { comme, poserLeDom, type ElementDeTest } from './domDeTest';

poserLeDom();

const images: Array<() => void> = [];
Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (texte: string) => texte } });
Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (image: () => void) => images.push(image) });
Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: comme(document.createElement('div')).constructor });
Object.defineProperty(globalThis, 'MutationObserver', { configurable: true, value: class { observe(): void {} } });
const corps = comme(document.createElement('div'));
Object.assign(document, { body: corps, addEventListener() {}, removeEventListener() {} });

import { creerHoteDeCartes, SEUIL_DE_LISTE, type CarteDeSection } from '../src/ui/virtualisation';
import { monterStructure } from '../src/ui/structure';
import { monterAAppliquer } from '../src/ui/nomenclature/aAppliquer';
import { monterATrancher } from '../src/ui/nomenclature/aTrancher';
import type { Coquille } from '../src/ui/nomenclature/coquille';
import type { MessageAAfficher } from '../src/ui/nomenclature/frontiere';
import { SANS_RENOMMAGES, monterLePied, type PontDesRenommages } from '../src/ui/tokens/cochage';
import { monterLePanneauDesTokens } from '../src/ui/tokens/panneau';
import type { Noms } from '../src/ui/structure/lecture';
import { TEXTES } from '../src/ui/textes';
import { TEXTES as TEXTES_DE_NOMS } from '../src/ui/textes/nomenclature';

const { bilans } = require('../galerie/nomenclature/donnees.cjs') as { bilans: { travail: Bilan } };

const HAUTEUR = 72;
const SANS_NOMS: Noms = { nom: () => null, cle: () => null };
const element = (): HTMLElement => document.createElement('div');

/** Donne au conteneur de la liste la hauteur que le navigateur lui donnerait : le faux DOM ne met rien en page. */
function mettreEnPage(liste: ElementDeTest): ElementDeTest {
  Object.assign(liste, { clientHeight: 400, scrollTop: 0 });
  Object.assign(liste.children[0], { offsetTop: 0 });
  return liste;
}

/** Fait défiler la liste jusqu'à `haut` pixels, comme un geste du designer, et laisse la liste se redessiner. */
function defiler(liste: ElementDeTest, haut: number): void {
  Object.assign(liste, { scrollTop: haut });
  liste.dispatchEvent(new Event('scroll'));
  images.splice(0).forEach((image) => image());
}

const rang = (rangDeLaCarte: number): number => rangDeLaCarte * HAUTEUR;

/** Le nombre de nœuds `selecteur` que la liste montre. */
const dansLeDom = (conteneur: ElementDeTest, selecteur: string): number => conteneur.querySelectorAll(selecteur).length;

// ---------------------------------------------------------------------------------------------------------------------------
// Le conteneur de cartes

function cartesDeTest(nombre: number, creees: string[], plus: Partial<CarteDeSection> = {}): CarteDeSection[] {
  return Array.from({ length: nombre }, (_vide, i) => ({
    cle: `c${i}`,
    ...plus,
    creer: () => {
      creees.push(`c${i}`);
      const carte = element();
      carte.className = 'carte-de-test';
      carte.setAttribute('data-rang', String(i));
      return carte;
    },
  }));
}

test(`jusqu’à ${SEUIL_DE_LISTE} cartes, l’hôte les pose telles quelles ; un intertitre ne compte pas`, () => {
  const hote = element();
  const creees: string[] = [];
  const liste = creerHoteDeCartes(hote);
  liste.poser([{ cle: 'titre', intertitre: true, creer: () => element() }, ...cartesDeTest(SEUIL_DE_LISTE, creees)]);
  assert.equal(liste.virtuelle(), false);
  assert.equal(liste.rendues(), SEUIL_DE_LISTE + 1);
  assert.equal(creees.length, SEUIL_DE_LISTE);
  assert.equal(dansLeDom(comme(hote), '.liste-de-cartes'), 0);
});

test(`au-delà de ${SEUIL_DE_LISTE} cartes, l’hôte contient une liste, et une carte n’est créée qu’à son arrivée à l’écran`, () => {
  const hote = element();
  const creees: string[] = [];
  const liste = creerHoteDeCartes(hote);
  liste.poser(cartesDeTest(2000, creees));
  assert.equal(liste.virtuelle(), true);
  const conteneur = mettreEnPage(comme(comme(hote).querySelector('.liste-de-cartes')));
  defiler(conteneur, 0);
  const borne = Math.ceil(400 / HAUTEUR) + 2 * 8 + 1;
  assert.ok(liste.rendues() > 0 && liste.rendues() <= borne, `${liste.rendues()} cartes rendues`);
  assert.ok(creees.length <= 1440 / HAUTEUR + 8, `${creees.length} cartes créées avant la mise en page`);
  const avant = creees.length;
  defiler(conteneur, rang(1000));
  assert.ok(liste.rendues() <= borne, `${liste.rendues()} cartes rendues au milieu`);
  assert.ok(creees.length - avant <= borne, 'seules les cartes entrées dans la portion sont créées');
  assert.equal(creees.length < 100, true, 'la liste n’a pas créé les 2000 cartes');
});

test('une carte qui sort puis revient est la même, avec son état', () => {
  const hote = element();
  const liste = creerHoteDeCartes(hote);
  liste.poser(cartesDeTest(300, []));
  const conteneur = mettreEnPage(comme(comme(hote).querySelector('.liste-de-cartes')));
  defiler(conteneur, 0);
  const carte = comme(conteneur.querySelector('[data-rang="2"]'));
  carte.setAttribute('data-deplie', 'oui');
  defiler(conteneur, rang(200));
  assert.equal(conteneur.querySelector('[data-rang="2"]'), null, 'la carte est sortie du DOM');
  defiler(conteneur, 0);
  const revenue = comme(conteneur.querySelector('[data-rang="2"]'));
  assert.equal(revenue, carte, 'la même carte revient');
  assert.equal(revenue.getAttribute('data-deplie'), 'oui');
});

test('la liste atteint une carte par sa clé', () => {
  const hote = element();
  const liste = creerHoteDeCartes(hote);
  liste.poser(cartesDeTest(300, []));
  const conteneur = mettreEnPage(comme(comme(hote).querySelector('.liste-de-cartes')));
  liste.montrer('c250');
  assert.ok(conteneur.querySelector('[data-rang="250"]'));
});

test('sous la puce Questions, la liste ne garde que les cartes à question, et les retrouve après', () => {
  const hote = element();
  let questionsSeules = false;
  const liste = creerHoteDeCartes(hote, () => questionsSeules);
  const cartes = cartesDeTest(300, []).map((carte, i) => ({ ...carte, question: i % 100 === 0 }));
  liste.poser(cartes);
  const conteneur = mettreEnPage(comme(comme(hote).querySelector('.liste-de-cartes')));
  defiler(conteneur, 0);
  assert.ok(liste.rendues() > 3);
  questionsSeules = true;
  liste.poser(cartes);
  assert.equal(liste.virtuelle(), true);
  defiler(conteneur, 0);
  assert.deepEqual(conteneur.querySelectorAll('[data-rang]').map((carte) => carte.getAttribute('data-rang')), ['0', '100', '200']);
  questionsSeules = false;
  liste.poser(cartes);
  defiler(conteneur, 0);
  assert.ok(liste.rendues() > 3);
});

test('une section qui retombe à 50 cartes ou moins quitte la liste', () => {
  const hote = element();
  const liste = creerHoteDeCartes(hote);
  liste.poser(cartesDeTest(80, []));
  assert.equal(liste.virtuelle(), true);
  liste.poser(cartesDeTest(SEUIL_DE_LISTE, []));
  assert.equal(liste.virtuelle(), false);
  assert.equal(comme(hote).children.length, SEUIL_DE_LISTE);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Constats à régler et corrections de structure

const constatDe = (id: string, faits: Constat['faits'], plus: Partial<Constat> = {}): Constat => ({ id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits, ...plus });

/** Un rôle absent d'une palette : sa carte offre Ignorer. `avecQuestion` donne une question aux constats dont le rang y est. */
const constatsManquants = (nombre: number, avecQuestion: (rang: number) => boolean = () => false): Constat[] => Array.from({ length: nombre }, (_vide, i) => constatDe(
  `C82:variable-absente:${i}`, { genre: 'variable-absente', variable: 'surface/subtle', groupe: `p${i}` },
  avecQuestion(i) ? { question: { id: `C82:variable-absente:${i}`, candidats: [] } } : {},
));

/** Une correction de mode : une carte à elle seule, dans la catégorie Modes. */
const correctionsDeModes = (nombre: number): Correction[] => Array.from({ length: nombre }, (_vide, i) => ({
  id: `mode:${i}`, sorte: 'alias-de-mode', cible: { variable: `theme:v${i}`, mode: 'dark' }, avant: `brands:a${i}`,
  apres: { cle: `brands:b${i}`, nom: `b${i}` }, aRelire: { axes: { mode: 'Dark' }, regle: 'En Dark, UCM attend le cran 600.', avant: `brands:a${i}` },
}));

function monterLaStructure(constats: readonly Constat[], corrections: readonly Correction[]) {
  const racine = element();
  const tokens = monterLePanneauDesTokens({ racine, nomenclature: { questions: element(), renommages: element(), remises: element() }, auChangement() {} });
  const envoyes: DemandeDeStructure[] = [];
  const structure = monterStructure({ pied: element(), tokens, renommages: () => SANS_RENOMMAGES } as unknown as Coquille, { envoyer: (message) => envoyes.push(message), noms: SANS_NOMS, ouvrirLaFiche() {} });
  structure.demander();
  structure.recevoir({ type: 'structure', demande: 1, constats: [...constats], corrections: [...corrections], ignores: { constats: [], roles: [] } });
  const section = (id: string): ElementDeTest => comme(comme(racine).querySelectorAll('.section-element').find((candidate) => candidate.dataset.element === id));
  const liste = (id: string): ElementDeTest => mettreEnPage(comme(section(id).querySelector('.liste-de-cartes')));
  const listeEnPlace = (id: string): ElementDeTest => comme(section(id).querySelector('.liste-de-cartes'));
  return { racine: comme(racine), tokens, envoyes, section, liste, listeEnPlace, pied: comme(tokens.pied) };
}

const nombreDe = (section: ElementDeTest): string => comme(section.querySelector('.bande-element .nombre')).textContent;
const lePiedDit = (pied: ElementDeTest): string => comme(pied.querySelector('.corrections-resume')).textContent;
const casesDe = (liste: ElementDeTest): ElementDeTest[] => liste.querySelectorAll('.diff input').filter((caseACocher) => caseACocher.type === 'checkbox');

test('120 corrections de modes : la bande, la puce et le total comptent les 120 cartes, et le DOM n’en porte que la portion visible', () => {
  const banc = monterLaStructure([], correctionsDeModes(120));
  const liste = banc.liste('modes');
  defiler(liste, 0);
  assert.equal(nombreDe(banc.section('modes')), '120');
  assert.equal(comme(banc.racine.querySelectorAll('.puce-element').find((puce) => puce.dataset.element === 'modes')).querySelector('.nombre')?.textContent, '120');
  assert.equal(banc.tokens.total(), 120);
  const dansLaPortion = dansLeDom(liste, '.bloc');
  assert.ok(dansLaPortion > 0 && dansLaPortion < 40, `${dansLaPortion} cartes dans le DOM`);
});

test('Tout cocher du pied coche aussi les cartes hors du DOM, et Appliquer envoie les 120 identifiants', () => {
  const banc = monterLaStructure([], correctionsDeModes(120));
  const liste = banc.liste('modes');
  defiler(liste, 0);
  assert.equal(lePiedDit(banc.pied), TEXTES.correctionsDuComposant.aucuneCochee);
  comme(banc.pied.querySelector('.cocher-global')).clic();
  assert.equal(lePiedDit(banc.pied), 'Appliquer écrit 120 corrections de structure.');
  assert.ok(casesDe(liste).every((caseACocher) => caseACocher.checked), 'les cartes du DOM sont cochées');
  defiler(liste, rang(110));
  assert.ok(casesDe(liste).length > 0 && casesDe(liste).every((caseACocher) => caseACocher.checked), 'une carte créée après coup arrive cochée');
  comme(banc.pied.querySelector('.btn-primary')).clic();
  const envoi = banc.envoyes.find((message) => message.type === 'appliquer-structure') as Extract<DemandeDeStructure, { type: 'appliquer-structure' }>;
  assert.deepEqual(envoi.ids, correctionsDeModes(120).map(({ id }) => id), 'toutes les lignes cochées partent, dans l’ordre de la lecture');
});

test('une case cochée ou décochée après un défilement garde son état quand la carte sort puis revient', () => {
  const banc = monterLaStructure([], correctionsDeModes(120));
  const liste = banc.liste('modes');
  defiler(liste, 0);
  comme(casesDe(liste)[0]).clic();
  assert.equal(lePiedDit(banc.pied), 'Appliquer écrit 1 correction de structure.');
  defiler(liste, rang(100));
  const loin = casesDe(liste);
  assert.ok(loin.length > 0);
  comme(loin[loin.length - 1]).clic();
  assert.equal(lePiedDit(banc.pied), 'Appliquer écrit 2 corrections de structure.');
  defiler(liste, 0);
  assert.equal(casesDe(liste)[0].checked, true, 'la première carte reste cochée');
  assert.equal(casesDe(liste).filter((caseACocher) => caseACocher.checked).length, 1);
  defiler(liste, rang(100));
  assert.equal(casesDe(liste).filter((caseACocher) => caseACocher.checked).length, 1, 'la dernière carte cochée reste cochée');
  comme(casesDe(liste).find((caseACocher) => caseACocher.checked)).clic();
  assert.equal(lePiedDit(banc.pied), 'Appliquer écrit 1 correction de structure.');
  comme(banc.pied.querySelector('.btn-primary')).clic();
  const envoi = banc.envoyes.find((message) => message.type === 'appliquer-structure') as Extract<DemandeDeStructure, { type: 'appliquer-structure' }>;
  assert.deepEqual(envoi.ids, ['mode:0'], 'Appliquer n’envoie que la ligne restée cochée');
});

test('Tout décocher d’une catégorie longue décoche aussi les cartes hors du DOM', () => {
  const banc = monterLaStructure([], correctionsDeModes(120));
  const liste = banc.liste('modes');
  defiler(liste, 0);
  comme(banc.pied.querySelector('.cocher-global')).clic();
  const [, toutDecocher] = comme(banc.section('modes').querySelector('.section-actions')).querySelectorAll('button');
  toutDecocher.clic();
  assert.equal(lePiedDit(banc.pied), TEXTES.correctionsDuComposant.aucuneCochee);
  defiler(liste, rang(110));
  assert.ok(casesDe(liste).every((caseACocher) => !caseACocher.checked));
});

test('120 constats à régler : Ignorer d’une carte atteinte par défilement envoie le bon constat', () => {
  const banc = monterLaStructure(constatsManquants(120), []);
  const liste = banc.liste('manquantes');
  defiler(liste, 0);
  assert.equal(nombreDe(banc.section('manquantes')), '120');
  assert.ok(dansLeDom(liste, '.bloc-constat') < 40);
  defiler(liste, rang(100));
  const cartes = liste.querySelectorAll('.bloc-constat');
  assert.ok(cartes.length > 0 && cartes.length < 40);
  const carte = comme(cartes.find((candidate) => candidate.textContent.includes('p100')));
  assert.ok(carte, 'la carte 100 est dans le DOM');
  comme(carte.querySelector('.ignorer-hote button')).clic();
  const [pourLaPalette] = carte.querySelectorAll('.menu-ignorer button');
  assert.equal(pourLaPalette.textContent, TEXTES.ignorerPourLaPalette);
  pourLaPalette.clic();
  const envoi = banc.envoyes.find((message) => message.type === 'ignorer-constat-de-structure');
  assert.deepEqual({ type: envoi?.type, constat: (envoi as { constat?: string } | undefined)?.constat }, { type: 'ignorer-constat-de-structure', constat: 'C82:variable-absente:100' });
});

test('une carte de constat dépliée garde son état quand elle sort de l’écran puis revient', () => {
  const banc = monterLaStructure(constatsManquants(120), []);
  const liste = banc.liste('manquantes');
  defiler(liste, 0);
  const premiere = comme(liste.querySelector('.bloc-constat'));
  const bouton = comme(premiere.querySelector('.bloc-bouton'));
  bouton.clic();
  assert.equal(bouton.getAttribute('aria-expanded'), 'true');
  defiler(liste, rang(100));
  defiler(liste, 0);
  assert.equal(comme(liste.querySelector('.bloc-constat .bloc-bouton')).getAttribute('aria-expanded'), 'true');
});

test('sous la puce Questions, la liste longue de constats ne montre que ceux qui posent une question', () => {
  const banc = monterLaStructure(constatsManquants(120, (i) => i === 3 || i === 90), []);
  defiler(banc.liste('manquantes'), 0);
  comme(banc.racine.querySelectorAll('.puce-element').find((puce) => puce.dataset.element === 'questions')).clic();
  const liste = banc.liste('manquantes');
  defiler(liste, 0);
  assert.equal(dansLeDom(liste, '.bloc-constat'), 2, 'les deux constats à question, et aucun autre');
  comme(banc.racine.querySelectorAll('.puce-element').find((puce) => puce.dataset.element === 'tout')).clic();
  const retour = banc.liste('manquantes');
  defiler(retour, 0);
  assert.ok(dansLeDom(retour, '.bloc-constat') > 10, 'Tout retrouve la liste entière');
});

test(`une section de ${SEUIL_DE_LISTE} constats reste en cartes dans le DOM, une de ${SEUIL_DE_LISTE + 1} passe en liste`, () => {
  const courte = monterLaStructure(constatsManquants(SEUIL_DE_LISTE), []);
  assert.equal(dansLeDom(courte.section('manquantes'), '.liste-de-cartes'), 0);
  assert.equal(dansLeDom(courte.section('manquantes'), '.bloc-constat'), SEUIL_DE_LISTE);
  const longue = monterLaStructure(constatsManquants(SEUIL_DE_LISTE + 1), []);
  assert.equal(dansLeDom(longue.section('manquantes'), '.liste-de-cartes'), 1);
  defiler(longue.liste('manquantes'), 0);
  assert.ok(dansLeDom(longue.section('manquantes'), '.bloc-constat') < SEUIL_DE_LISTE);
});

test('replier la section puis la rouvrir retrouve la position de la liste', () => {
  const banc = monterLaStructure([], correctionsDeModes(120));
  const liste = banc.liste('modes');
  defiler(liste, rang(60));
  comme(banc.section('modes').querySelector('.bande-element')).clic();
  assert.equal(dansLeDom(banc.section('modes'), '.liste-de-cartes'), 0);
  // Le navigateur remet à zéro la position d'un élément détaché ; le faux DOM ne le fait pas.
  Object.assign(liste, { scrollTop: 0 });
  comme(banc.section('modes').querySelector('.bande-element')).clic();
  const rouverte = banc.listeEnPlace('modes');
  assert.equal(rouverte, liste, 'la même liste revient');
  assert.equal((rouverte as unknown as { scrollTop: number }).scrollTop, rang(60), 'à la position où elle était');
  assert.ok(dansLeDom(rouverte, '.bloc') > 0);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Renommages de Noms

interface BancDeNoms {
  readonly liste: ElementDeTest;
  readonly pont: () => PontDesRenommages;
  readonly demandes: { groupes: readonly string[]; exclus: readonly string[]; inclus: readonly string[] }[];
  recevoir(message: MessageAAfficher): void;
}

function monterLesRenommages(groupes: Bilan['groupes']): BancDeNoms {
  const demandes: BancDeNoms['demandes'] = [];
  let ecouteur: (message: MessageAAfficher) => void = () => {};
  let pont: PontDesRenommages = SANS_RENOMMAGES;
  const contenu = element();
  const frontiere = {
    generation: () => 1, analyser: () => 1, annulerLeDernier: () => 1, lignes: () => null, selection: () => null,
    appliquer: (selection: { groupes: string[]; exclus: string[]; inclus: string[] }) => { demandes.push(selection); return 2; },
  };
  const coquille = {
    frontiere,
    panneaux: { aAppliquer: { contenu } },
    tokens: { poserLesGestes() {} },
    filtre: () => null,
    poserLeCompteDesCorrections() {},
    abonner: (fonction: (message: MessageAAfficher) => void) => { ecouteur = fonction; return () => {}; },
    surCarteDemandee() {},
    surChangement() {},
    etat: () => ({ onglet: 'a-appliquer', carteDemandee: null, bilan: null }),
    lierLesRenommages: (lie: PontDesRenommages) => { pont = lie; },
  };
  monterAAppliquer(coquille as unknown as Coquille, { appartient: () => true });
  ecouteur({ type: 'bilan', demande: 1, bilan: { ...bilans.travail, groupes, bloques: [], protections: [], proteges: 0 } });
  return { liste: comme(contenu.querySelector('.liste')), pont: () => pont, demandes, recevoir: ecouteur };
}

const groupesDeNoms = (nombre: number): Bilan['groupes'] => Array.from({ length: nombre }, (_vide, i) => ({
  ...bilans.travail.groupes[0], cle: `terme:t${i}`, avant: `t${i}`, apres: `terme-${i}`, variables: 4, collections: 0, aussiDEcriture: 0, nouveau: false,
}));

const casesDesGroupes = (liste: ElementDeTest): ElementDeTest[] => liste.querySelectorAll('.carte .tete input').filter((caseACocher) => caseACocher.type === 'checkbox');

test('120 renommages : les compteurs comptent les 120 groupes, le DOM n’en porte que la portion visible', () => {
  const banc = monterLesRenommages(groupesDeNoms(120));
  const liste = mettreEnPage(comme(banc.liste.querySelector('.liste-de-cartes')));
  defiler(liste, 0);
  assert.equal(banc.pont().groupes(), 120);
  const dansLaPortion = dansLeDom(liste, '.carte');
  assert.ok(dansLaPortion > 0 && dansLaPortion < 40, `${dansLaPortion} cartes dans le DOM`);
});

test('Tout cocher des renommages compte les noms des cartes hors du DOM ; cocher et décocher après défilement tient', () => {
  const banc = monterLesRenommages(groupesDeNoms(120));
  const liste = mettreEnPage(comme(banc.liste.querySelector('.liste-de-cartes')));
  defiler(liste, 0);
  assert.deepEqual(banc.pont().compte(), { etat: 'pret', variables: 0, collections: 0, filtre: null });
  banc.pont().toutCocher();
  assert.deepEqual(banc.pont().compte(), { etat: 'pret', variables: 480, collections: 0, filtre: null }, '120 groupes de 4 noms');
  defiler(liste, rang(110));
  assert.ok(casesDesGroupes(liste).length > 0 && casesDesGroupes(liste).every((caseACocher) => caseACocher.checked), 'une carte créée après coup arrive cochée');
  comme(casesDesGroupes(liste)[0]).clic();
  assert.equal(banc.pont().compte().etat === 'pret' && (banc.pont().compte() as { variables: number }).variables, 476);
  defiler(liste, 0);
  defiler(liste, rang(110));
  assert.equal(casesDesGroupes(liste)[0].checked, false, 'la case décochée le reste au retour de la carte');
  assert.equal((banc.pont().compte() as { variables: number }).variables, 476);
});

test('Appliquer des renommages envoie les groupes cochés, ceux qui sont hors du DOM comme les autres', () => {
  const banc = monterLesRenommages(groupesDeNoms(120));
  const liste = mettreEnPage(comme(banc.liste.querySelector('.liste-de-cartes')));
  defiler(liste, 0);
  banc.pont().toutCocher();
  defiler(liste, rang(100));
  comme(casesDesGroupes(liste)[0]).clic();
  banc.pont().appliquer(() => {});
  const confirmer = comme(corps.querySelector('.feuille-actions .btn-primary'));
  assert.ok(confirmer, 'la confirmation est ouverte');
  confirmer.clic();
  assert.equal(banc.demandes.length, 1);
  assert.equal(banc.demandes[0].groupes.length, 119, 'les 120 groupes cochés moins celui qui a été décoché');
  assert.equal(new Set(banc.demandes[0].groupes).size, 119);
});

test(`${SEUIL_DE_LISTE} renommages restent en cartes dans le DOM`, () => {
  const banc = monterLesRenommages(groupesDeNoms(SEUIL_DE_LISTE));
  assert.equal(dansLeDom(banc.liste, '.liste-de-cartes'), 0);
  assert.equal(dansLeDom(banc.liste, '.carte'), SEUIL_DE_LISTE);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Questions de Noms

const questionsDeNoms = (nombre: number): Bilan['questions'] => Array.from({ length: nombre }, (_vide, i) => ({
  ...bilans.travail.questions[1], cle: `ecriture:mot${i}`, terme: { ...(bilans.travail.questions[1] as { terme: object }).terme, mot: `mot${i}` },
})) as unknown as Bilan['questions'];

test('120 questions : le DOM reste borné, et répondre à une carte atteinte par défilement envoie sa réponse', () => {
  const reponses: { cle: string; reponse: unknown }[] = [];
  let ecouteur: (message: MessageAAfficher) => void = () => {};
  const contenu = element();
  const coquille = {
    frontiere: { repondre: (cle: string, reponse: unknown) => { reponses.push({ cle, reponse }); return 5; }, regle: () => 6 },
    panneaux: { aTrancher: { contenu, element: element() }, remises: { contenu: element() } },
    abonner: (fonction: (message: MessageAAfficher) => void) => { ecouteur = fonction; return () => {}; },
    etat: () => ({ bilan: null }),
    poserLeCompteDesReglesRecues() {},
    choisirOnglet() {},
  };
  monterATrancher(coquille as unknown as Coquille);
  ecouteur({ type: 'bilan', demande: 1, bilan: { ...bilans.travail, questions: questionsDeNoms(120), plusTard: [], autresPistes: 0 } });
  const liste = mettreEnPage(comme(comme(contenu).querySelector('.liste-de-cartes')));
  defiler(liste, 0);
  const dansLaPortion = dansLeDom(liste, '.carte.question');
  assert.ok(dansLaPortion > 0 && dansLaPortion < 40, `${dansLaPortion} cartes dans le DOM`);
  defiler(liste, rang(100));
  const carte = comme(liste.querySelectorAll('.carte.question').find((candidate) => candidate.textContent.includes('mot100')));
  assert.ok(carte, 'la carte de mot100 est dans le DOM');
  comme(carte.querySelectorAll('button').find((bouton) => bouton.textContent === TEXTES_DE_NOMS.corriger)).clic();
  assert.deepEqual(reponses.map(({ cle }) => cle), ['ecriture:mot100']);
});
