/**
 * Les variants en valeurs seules : la puce de valeur et sa property quand une autre property porte la même valeur, la ligne de lieu des
 * constats (nombre de variants, puces des seules paires partagées), la section Variants sans ligne « Affiché », sans Tableau et sans
 * bouton de copie, et le variant en puces sous la valeur en dur d'une ligne avant / après.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../src/messages/commun';
import { poserLeDom, comme, textes } from './domDeTest';

poserLeDom();

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import { creerPuceDeValeur, creerPuces, creerSectionVariants, lieuDesVariants, pairesCommunes } from '../src/ui/composant/variants';
import { monterLesCorrections } from '../src/ui/corrections';
import { cartesDeCorrections, type ContexteDeCartes } from '../src/ui/corrections/modele';
import { carteDAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';
import { ligneDInformation } from '../src/ui/panneau/informations';
import { monterLesQuestions } from '../src/ui/questions';
import { carteDeQuestion, type ContexteDeQuestions } from '../src/ui/questions/modele';

/** Un jeu où `Default` est une valeur de State et de Size. */
const JEU = [
  { id: 'v1', nom: 'State=Default, Size=Default' },
  { id: 'v2', nom: 'State=Hover, Size=Default' },
  { id: 'v3', nom: 'State=Default, Size=Large' },
];

const constat = (id: string, code: Constat['code'], famille: Constat['famille'], faits: Constat['faits'], variants: string[], reste: Partial<Constat> = {}): Constat =>
  ({ id, code, type: 'verifier', famille, variants, layers: [], faits, ...reste });

test('la puce montre la valeur seule et la paire exacte de Figma en title', () => {
  const puce = comme(creerPuceDeValeur('State', 'Hover', JEU));
  assert.equal(puce.textContent, 'Hover');
  assert.equal(puce.title, 'State=Hover');
  assert.equal(puce.querySelector('.puce-propriete'), null);
});

test('la property reste dans la puce quand une autre property du jeu porte la même valeur', () => {
  const etat = comme(creerPuceDeValeur('State', 'Default', JEU));
  const taille = comme(creerPuceDeValeur('Size', 'Default', JEU));
  assert.equal(etat.textContent, 'State=Default');
  assert.equal(taille.textContent, 'Size=Default');
  assert.equal(comme(etat.querySelector('.puce-propriete')).textContent, 'State=');
  assert.equal(etat.title, 'State=Default');
  // Une valeur qu'une seule property porte reste seule, même dans un jeu qui en partage d'autres.
  assert.equal(comme(creerPuceDeValeur('Size', 'Large', JEU)).textContent, 'Large');
});

test('les puces d’un groupe suivent l’ordre des paires', () => {
  const groupe = comme(creerPuces([['State', 'Default'], ['Size', 'Large']], JEU));
  assert.deepEqual(textes(groupe.querySelectorAll('.puce-valeur')), ['State=Default', 'Large']);
});

test('le lieu donne le nombre de variants, puis les puces des seules paires qu’ils partagent', () => {
  assert.deepEqual(lieuDesVariants([]), ['Tous les variants']);
  assert.deepEqual(lieuDesVariants(['State=Focus, Size=S']), ['1 variant', { puces: [['State', 'Focus'], ['Size', 'S']] }]);
  assert.deepEqual(lieuDesVariants(['State=Focus, Size=S', 'State=Focus, Size=M']), ['2 variants', { puces: [['State', 'Focus']] }]);
  assert.deepEqual(lieuDesVariants(['State=Focus, Size=S', 'State=Hover, Size=M']), ['2 variants']);
  assert.deepEqual(pairesCommunes(['A=1, B=2', 'B=2, A=1']), [['A', '1'], ['B', '2']]);
});

const CONTEXTE_A_FAIRE: ContexteDAFaire = { composant: 'Button', variants: JEU, layers: new Map() };

test('la phrase d’un constat ne nomme plus le variant : la ligne de lieu le donne', () => {
  const contraste = carteDAFaire(constat('c', 'C49', 'contraste', { usage: 'texte', champ: 'fills', calque: 'label', rapport: 3.9, seuil: 4.5, mode: 'intencial en Dark' }, ['v1', 'v2']), CONTEXTE_A_FAIRE);
  assert.equal(contraste.phrase, 'Le texte manque de contraste en Dark.');
  assert.deepEqual(contraste.lieu, ['2 variants', { puces: [['Size', 'Default']] }, ', ', 'layer label']);

  const petit = carteDAFaire(constat('p', 'C49', 'contraste', { calque: 'label', fontSize: 11, seuil: 12 }, ['v3']), CONTEXTE_A_FAIRE);
  assert.equal(petit.phrase, 'Le libellé a un font size de 11 px. UCM recommande au moins 12 px.');
  assert.deepEqual(petit.lieu, ['1 variant', { puces: [['State', 'Default'], ['Size', 'Large']] }, ', ', 'layer label']);
});

const SUR_UN_FOND = { usage: 'stroke', champ: 'strokes', calque: 'container', rapport: 2.7, seuil: 3, mode: 'components en Mode 1, theme en Dark' };

test('un échec sur la page dont la variable est garantie nomme le fond, le mode, la mesure et la garantie', () => {
  const carte = carteDAFaire(constat('g', 'C50', 'contraste', { ...SUR_UN_FOND, fondNomme: 'page', variableDuTheme: 'page/border', garanti: 'oui' }, ['v1'], { type: 'corriger' }), CONTEXTE_A_FAIRE);
  assert.equal(carte.phrase, 'Sur la page, `elevation/page`, le stroke a un contraste de 2,70:1 en Mode 1, Dark, sous le seuil de 3:1. UCM Palettes garantit ce contraste pour `page/border`.');
  assert.equal(carte.statut, 'Vérifiez la palette dans UCM Palettes, ou le token lié');
});

test('un échec sur une carte non garantie demande de vérifier la pose du composant', () => {
  const carte = carteDAFaire(constat('n', 'C50', 'contraste', { ...SUR_UN_FOND, rapport: 2.4, fondNomme: 'carte', variableDuTheme: 'page/border', garanti: 'non' }, ['v1'], { type: 'verifier' }), CONTEXTE_A_FAIRE);
  assert.equal(carte.phrase, 'Sur une carte, `elevation/raised`, le stroke a un contraste de 2,40:1 en Mode 1, Dark, sous le seuil de 3:1. UCM Palettes ne garantit pas ce contraste sur une carte.');
  assert.equal(carte.statut, 'Vérifiez si Button se pose sur une carte');
});

test('la page Figma et une variable hors du thème disent qu’aucune garantie ne s’applique', () => {
  const figma = carteDAFaire(constat('f', 'C50', 'contraste', { ...SUR_UN_FOND, fondNomme: 'page-figma', variableDuTheme: '', garanti: 'non' }, ['v1'], { type: 'verifier' }), CONTEXTE_A_FAIRE);
  assert.equal(figma.phrase, 'Sur le fond de la page Figma, le stroke a un contraste de 2,70:1 en Mode 1, Dark, sous le seuil de 3:1. Aucune garantie d’UCM Palettes ne s’applique au fond de la page Figma.');
  const horsTheme = carteDAFaire(constat('h', 'C50', 'contraste', { ...SUR_UN_FOND, fondNomme: 'page', variableDuTheme: '', garanti: 'non' }, ['v1'], { type: 'verifier' }), CONTEXTE_A_FAIRE);
  assert.match(horsTheme.phrase, /^Sur la page, `elevation\/page`, le stroke .* Aucune garantie d’UCM Palettes ne s’applique : la couleur liée n’est pas une variable du thème UCM\.$/);
});

test('C45 : une règle sans propriété nomme la règle et le composant', () => {
  const carte = carteDAFaire(constat('r', 'C45', 'regles', { composant: 'Button', regle: 'label', ecart: 'sans-propriete' }, []), CONTEXTE_A_FAIRE);
  assert.equal(carte.phrase, 'La règle `label` ne correspond à aucune propriété de Button.');
  assert.equal(carte.statut, 'Donnez-lui le nom exact de la propriété, ou supprimez-la');
  const inverse = carteDAFaire(constat('s', 'C45', 'regles', { composant: 'Button', propriete: 'disabled', ecart: 'sans-regle' }, []), CONTEXTE_A_FAIRE);
  assert.equal(inverse.phrase, 'La propriété `disabled` n’a pas de règle dans l’instance de règles.');
});

test('les variants exclus du contraste n’ont plus de lieu « Tous les variants désactivés »', () => {
  const carte = ligneDInformation(constat('x', 'C53', 'contraste', { variantsExclus: 2 }, ['v1', 'v3'], { type: 'info' }), CONTEXTE_A_FAIRE);
  assert.deepEqual(carte.lieu, ['2 variants', { puces: [['State', 'Default']] }]);
  assert.equal(JSON.stringify(carte).includes('désactivés'), false);
});

test('un constat sans variant garde « Tous les variants » en lieu', () => {
  const carte = carteDAFaire(constat('r', 'C43', 'regles', {}, []), CONTEXTE_A_FAIRE);
  assert.deepEqual(carte.lieu, ['Tous les variants']);
});

test('la section Variants n’a ni ligne Affiché, ni bouton Tableau, ni bouton de copie ; chaque puce porte sa paire en title', () => {
  const section = comme(creerSectionVariants({
    variants: JEU, constats: [], affiche: JEU[0].nom, depliees: new Set(['State', 'Size']), choisir() {}, deplier() {},
  }));
  assert.equal(section.querySelector('.variants-pied'), null);
  assert.equal(section.querySelector('.variants-affiche'), null);
  assert.equal(section.querySelector('.variants-tableau'), null);
  assert.equal(section.querySelector('.tableau-variants'), null);
  assert.equal(section.querySelector('[data-action="copier-les-liaisons"]'), null);
  assert.deepEqual(section.querySelectorAll('.valeur-axe').map((puce) => puce.title), ['State=Default', 'State=Hover', 'Size=Default', 'Size=Large']);
  assert.deepEqual(section.querySelectorAll('.valeur-axe').map((puce) => puce.textContent), ['Default', 'Hover', 'Default', 'Large']);
});

test('la ligne qui lie une couleur en dur dit d’abord la valeur en dur, puis le variant en puces ; la meta donne le nombre de variants et leurs paires', () => {
  const liaison = { id: 'cor:1', sorte: 'liaison' as const, cible: { layer: 'L1', champ: 'fills' }, avant: null, apres: { cle: 'k', nom: 'button/colors/default/foreground' }, aRelire: { regle: 'r', avant: null } };
  const constats = [constat('C59:1', 'C59', 'liaisons', { calque: 'label' }, ['v1'], { type: 'corriger', layers: ['L1'], correction: liaison })];
  const contexte: ContexteDeCartes = { composant: 'Button', variants: JEU, layers: new Map(), library: null, constats };
  const cartes = cartesDeCorrections(constats, contexte);
  assert.equal(cartes.length, 1);
  assert.deepEqual(cartes[0].lignes[0].variant, [['State', 'Default'], ['Size', 'Default']]);
  assert.deepEqual(cartes[0].meta.slice(0, 2), ['1 variant', { puces: [['State', 'Default'], ['Size', 'Default']] }]);

  const corrections = monterLesCorrections({ appliquer() {}, selectionner() {}, ignorer() {}, auChangement() {}, redessiner() {} });
  const analyse = { identite: { sujet: 'Button', generation: 1 }, statut: 'complete', perimee: false, ecriture: null } as never;
  corrections.poser({ analyse, contexte, cartes });
  corrections.commencer();
  const [carte] = corrections.cartes(cartes).map(comme);
  const avant = comme(carte.querySelector('.diff .chemin'));
  assert.equal(comme(avant.childNodes[0]).textContent, 'couleur en dur');
  assert.deepEqual(textes(avant.querySelectorAll('.puce-valeur')), ['State=Default', 'Size=Default']);
  assert.equal(carte.querySelector('.ch-variant'), null);
});

test('la ligne d’une correction de plusieurs variants ne montre pas de puces sous la valeur en dur', () => {
  const liaison = { id: 'cor:2', sorte: 'liaison' as const, cible: { layer: 'L1', champ: 'fills' }, avant: null, apres: { cle: 'k', nom: 'button/colors/default/foreground' }, aRelire: { regle: 'r', avant: null } };
  const constats = [constat('C59:2', 'C59', 'liaisons', { calque: 'label' }, ['v1', 'v2'], { type: 'corriger', layers: ['L1'], correction: liaison })];
  const cartes = cartesDeCorrections(constats, { composant: 'Button', variants: JEU, layers: new Map(), library: null, constats });
  assert.deepEqual(cartes[0].lignes[0].variant, []);
});

test('la ligne de lieu d’une question donne le nombre de variants et leurs puces avant le reste', () => {
  const contexte: ContexteDeQuestions = { composant: 'Button', variants: JEU, layers: new Map([['L1', 'label']]) };
  const question = constat('C15:1', 'C15', 'liaisons', { calque: 'label', champ: 'fills' }, ['v1', 'v3'], {
    type: 'corriger', layers: ['L1'], question: { id: 'q:1', candidats: [{ nom: 'button/colors/default/foreground' }] },
  });
  const carte = carteDeQuestion(question, contexte);
  assert.ok(carte);
  assert.deepEqual(carte.lieu, ['2 variants', { puces: [['State', 'Default']] }]);
  assert.equal(carte.meta, 'layer label sans variable. ');

  const questions = monterLesQuestions({ repondre() {}, annuler() {}, selectionner() {}, redessiner() {} });
  questions.poser({ identite: { sujet: 'Button', generation: 1 }, statut: 'complete', perimee: false, repondues: {}, variants: JEU } as never);
  const [element] = questions.cartes([{ carte, cartes: [carte] }]).map(comme);
  assert.equal(comme(element.querySelector('.meta')).textContent, '2 variantsState=Default, layer label sans variable. ');
  assert.deepEqual(textes(element.querySelectorAll('.meta .puce-valeur')), ['State=Default']);
});
