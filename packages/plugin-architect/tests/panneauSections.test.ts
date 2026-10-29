/**
 * Le panneau des constats du mode Composant, monté sur un DOM réduit avec les constats d'Alert : le sommaire, le filtre par élément,
 * l'en-tête des Bloquants, les bandes, les éléments tenus, Appliquer par carte, Appliquer tout et son résumé quand une partie est cachée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { poserLeDom, textes, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import { monterLePanneau, type PanneauDesConstats } from '../src/ui/analyse';
import type { AnalyseRecue } from '../src/ui/composant/analyse';
import type { ElementChoisi } from '../src/ui/etat';

const { constatsAlert, alertCorrections } = require('../galerie/etats/corrections.cjs') as { constatsAlert: Constat[]; alertCorrections: { sujet: { nom: string; variants: Array<{ id: string; nom: string }> } } };

const IDENTITE = { sujet: 'Alert', generation: 1 };

interface Banc {
  panneau: PanneauDesConstats;
  etat: { analyse: AnalyseRecue; panneau: { ouvert: boolean; largeurDeLaVue: number; element: ElementChoisi } };
  envois: { appliquer: Array<{ ids: readonly string[]; liaisons: number }>; annulees: string[]; selections: Array<readonly string[]> };
  racine: ElementDeTest;
  /** Relit l'état : une nouvelle analyse, ou un changement du panneau, puis redessine comme l'application le fait. */
  actualiser(surcharge?: Partial<AnalyseRecue>): void;
}

function monter(constats: readonly Constat[] = constatsAlert, surcharge: Partial<AnalyseRecue> = {}): Banc {
  const envois: Banc['envois'] = { appliquer: [], annulees: [], selections: [] };
  const analyse = {
    identite: IDENTITE, statut: 'complete', constats, tous: constats, ignores: [], repondues: {}, variants: alertCorrections.sujet.variants, lecture: null, sansTokens: false,
    progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: 0, ...surcharge,
  } as unknown as AnalyseRecue;
  const etat = { composant: { lecture: alertCorrections }, analyse, architecture: null, reference: null, panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' as ElementChoisi } };
  const app = {
    etat,
    appliquer: (ids: readonly string[], liaisons: number) => envois.appliquer.push({ ids, liaisons }),
    selectionner: (layers: readonly string[]) => envois.selections.push(layers), ignorerLaProposition() {}, repondre() {}, ignorer() {}, nePlusIgnorer() {}, ouvrirLaConfiguration() {}, rendre() {},
    annulerLaReponse: (question: string) => envois.annulees.push(question),
  };
  const vue = { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} };
  const panneau = monterLePanneau(app as never, vue as never);
  panneau.mettreAJour();
  return {
    panneau, etat, envois, racine: comme(panneau.element),
    actualiser(suite) {
      if (suite) etat.analyse = { ...etat.analyse, ...suite } as AnalyseRecue;
      panneau.mettreAJour();
    },
  };
}

const puces = (banc: Banc): ElementDeTest[] => banc.racine.querySelectorAll('.puce-element');
const puceDe = (banc: Banc, id: string): ElementDeTest => puces(banc).find((puce) => puce.dataset.element === id) as ElementDeTest;
const sections = (banc: Banc): ElementDeTest[] => banc.racine.querySelectorAll('.section-element');
const sectionDe = (banc: Banc, id: string): ElementDeTest => sections(banc).find((section) => section.dataset.element === id) as ElementDeTest;
const bande = (section: ElementDeTest): ElementDeTest => comme(section.querySelector('.bande-element'));
const nombre = (element: ElementDeTest): string => comme(element.querySelector('.nombre')).textContent;
const pied = (banc: Banc): ElementDeTest => comme(banc.racine.querySelector('.corrections-pied'));
const boutonDePied = (banc: Banc): ElementDeTest => comme(pied(banc).querySelector('.btn-primary'));
const boutonsDeCartes = (racine: ElementDeTest): ElementDeTest[] => racine.querySelectorAll('.appliquer-carte');
const choisir = (banc: Banc, id: string): void => {
  puceDe(banc, id).clic();
};

const bloquant = (extra: Partial<Constat> = {}): Constat => ({
  id: 'C63:b', code: 'C63', type: 'bloquant', famille: 'tokens', variants: [], layers: [], faits: { genre: 'alias-supprime', variable: 'alert/x' }, ...extra,
} as Constat);

test('le sommaire commence par Tout, puis une puce par élément qui a des points, avec son nombre', () => {
  const banc = monter();
  assert.deepEqual(puces(banc).map((puce) => [puce.dataset.element, comme(puce.querySelector('.nombre')).textContent]), [['tout', '24'], ['couleurs', '18'], ['tailles', '2'], ['tokens', '3'], ['regles', '1']]);
  assert.deepEqual(puces(banc).map((puce) => puce.getAttribute('aria-pressed')), ['true', 'false', 'false', 'false', 'false']);
  // Les éléments tenus n'ont pas de puce.
  assert.equal(puceDe(banc, 'texte'), undefined);
  assert.equal(banc.racine.querySelector('.onglets'), null);
});

test('chaque puce d’élément porte un signe de 14 px en couleur', () => {
  const banc = monter();
  assert.equal(puceDe(banc, 'tout').querySelector('.signe'), null);
  for (const [id, teinte] of [['couleurs', 'signe-teinte-couleurs'], ['tailles', 'signe-teinte-tailles'], ['tokens', 'signe-teinte-tokens'], ['regles', 'signe-teinte-regles']] as const) {
    const signe = comme(puceDe(banc, id).querySelector('.signe'));
    assert.ok(signe.classes.has('signe-14'), id);
    assert.ok(signe.classes.has(teinte), id);
  }
});

test('« Tout » montre une section par élément qui a des points, puis les éléments tenus', () => {
  const banc = monter();
  assert.deepEqual(sections(banc).map((section) => section.dataset.element), ['couleurs', 'tailles', 'tokens', 'regles', 'texte', 'variants', 'a11y']);
  assert.deepEqual(sections(banc).map((section) => bande(section).classes.has('tenue')), [false, false, false, false, true, true, true]);
  assert.deepEqual(sections(banc).slice(0, 4).map((section) => nombre(section)), ['18', '2', '3', '1']);
});

test('la bande d’une section porte un signe de 24 px en couleur, le titre, le nombre de points et le chevron', () => {
  const banc = monter();
  const tailles = bande(sectionDe(banc, 'tailles'));
  const signe = comme(tailles.querySelector('.signe'));
  assert.ok(signe.classes.has('signe-24') && signe.classes.has('signe-teinte-tailles'));
  assert.equal(comme(tailles.querySelector('.titre')).textContent, 'Tailles et forme');
  assert.equal(nombre(tailles), '2');
  assert.ok(tailles.querySelector('.chevron-svg'));
  assert.equal(tailles.tagName, 'BUTTON');
});

test('un élément tenu : signe gris, titre, coche Tenu seule, ni chevron ni bouton', () => {
  const banc = monter();
  const texte = bande(sectionDe(banc, 'texte'));
  assert.equal(texte.tagName, 'DIV');
  assert.equal(texte.querySelector('.chevron-svg'), null);
  assert.equal(texte.querySelector('button'), null);
  const signe = comme(texte.querySelector('.signe'));
  assert.ok(signe.classes.has('signe-24'));
  assert.equal(signe.classes.has('signe-informe'), false);
  assert.ok(comme(texte.querySelector('.ico')).classes.has('ton-tenu'));
  assert.equal(texte.getAttribute('aria-label'), 'Texte, Tenu');
  assert.equal(texte.textContent.trim(), 'Texte');
});

test('une section s’ouvre d’elle-même jusqu’à cinq points et se replie au-delà', () => {
  const banc = monter();
  assert.deepEqual(['couleurs', 'tailles', 'tokens', 'regles'].map((id) => bande(sectionDe(banc, id)).getAttribute('aria-expanded')), ['false', 'true', 'true', 'true']);
  // Une section fermée ne dessine pas ses cartes.
  assert.equal(sectionDe(banc, 'couleurs').children.length, 1);
  assert.ok(sectionDe(banc, 'tailles').children.length > 1);
});

test('un clic sur la bande bascule la section, et le choix survit à une nouvelle analyse du même sujet', () => {
  const banc = monter();
  bande(sectionDe(banc, 'couleurs')).clic();
  assert.equal(bande(sectionDe(banc, 'couleurs')).getAttribute('aria-expanded'), 'true');
  bande(sectionDe(banc, 'tailles')).clic();
  assert.equal(bande(sectionDe(banc, 'tailles')).getAttribute('aria-expanded'), 'false');
  banc.actualiser({ identite: { sujet: 'Alert', generation: 2 } });
  assert.deepEqual(['couleurs', 'tailles'].map((id) => bande(sectionDe(banc, id)).getAttribute('aria-expanded')), ['true', 'false']);
  // Un autre sujet oublie le choix.
  banc.actualiser({ identite: { sujet: 'Button', generation: 3 } });
  assert.deepEqual(['couleurs', 'tailles'].map((id) => bande(sectionDe(banc, id)).getAttribute('aria-expanded')), ['false', 'true']);
});

test('dans une section : les cartes de corrections, puis les questions, puis ce qui reste à faire dans Figma', () => {
  const banc = monter();
  bande(sectionDe(banc, 'couleurs')).clic();
  const enfants = sectionDe(banc, 'couleurs').children.slice(1);
  const genre = (enfant: ElementDeTest): string => (enfant.classes.has('question') ? 'question' : enfant.classes.has('bloc-constat') ? 'a-faire' : 'correction');
  const lecture = enfants.map(genre);
  assert.deepEqual([...new Set(lecture)], ['correction', 'question', 'a-faire']);
  assert.equal(lecture.indexOf('question') > lecture.lastIndexOf('correction'), true);
  assert.equal(lecture.indexOf('a-faire') > lecture.lastIndexOf('question'), true);
  assert.deepEqual(['correction', 'question', 'a-faire'].map((sorte) => lecture.filter((vue) => vue === sorte).length), [2, 3, 9]);
  // Les cartes n'ajoutent aucun signe de sorte : un seul par bande. Le bouton Sélectionner porte le signe de la sélection de Figma.
  assert.equal(sectionDe(banc, 'couleurs').querySelectorAll('.signe').filter((signe) => !comme(signe.parent).classes.has('bouton-selectionner')).length, 1);
});

test('une puce choisie ne montre que son élément ; « Tout » le rend', () => {
  const banc = monter();
  choisir(banc, 'tailles');
  assert.deepEqual(sections(banc).map((section) => section.dataset.element), ['tailles']);
  assert.deepEqual(puces(banc).map((puce) => puce.getAttribute('aria-pressed')), ['false', 'false', 'true', 'false', 'false']);
  assert.equal(banc.etat.panneau.element, 'tailles');
  choisir(banc, 'tout');
  assert.equal(sections(banc).length, 7);
  assert.equal(banc.etat.panneau.element, 'tout');
});

test('le clavier reste sur la puce choisie et sur la bande basculée, que le dessin remplace', () => {
  const banc = monter();
  const actif = (): ElementDeTest => (globalThis as unknown as { document: { activeElement: ElementDeTest } }).document.activeElement;
  choisir(banc, 'tailles');
  assert.equal(actif().dataset.element, 'tailles');
  assert.ok(actif().classes.has('puce-element'));
  assert.ok(banc.racine.contains(actif()));
  choisir(banc, 'tout');
  bande(sectionDe(banc, 'couleurs')).clic();
  assert.ok(actif().classes.has('bande-element'));
  assert.equal(comme(actif().parent).dataset.element, 'couleurs');
  assert.ok(banc.racine.contains(actif()));
});

test('un élément choisi qui n’a plus de point retombe sur « Tout »', () => {
  const banc = monter();
  choisir(banc, 'regles');
  banc.actualiser({ constats: constatsAlert.filter((constat) => constat.famille !== 'regles') });
  assert.equal(sections(banc).length, 7);
  assert.equal(puceDe(banc, 'tout').getAttribute('aria-pressed'), 'true');
});

test('l’élément choisi s’ouvre même au-delà de cinq points', () => {
  const banc = monter();
  choisir(banc, 'couleurs');
  assert.equal(bande(sectionDe(banc, 'couleurs')).getAttribute('aria-expanded'), 'true');
});

test('les Bloquants viennent en tête de « Tout », hors des sections, et la puce de leur élément porte l’icône Bloquant', () => {
  const jeu = [...constatsAlert, bloquant()];
  const banc = monter(jeu);
  const enfants = comme(banc.panneau.liste).children;
  assert.ok(enfants[0].classes.has('en-tete-bloquants'));
  assert.equal(enfants[0].querySelectorAll('.bloc').length, 1);
  assert.ok(comme(enfants[0].querySelector('.bloc')).classes.has('ton-bloquant'));
  // La section de l'élément ne répète pas la carte Bloquant ; ses points la comptent.
  const tokens = sectionDe(banc, 'tokens');
  assert.equal(nombre(tokens), '4');
  assert.equal(tokens.querySelectorAll('.bloc').length, 3);
  assert.ok(puceDe(banc, 'tokens').querySelector('.ico.ton-bloquant'));
  assert.equal(puceDe(banc, 'couleurs').querySelector('.ico'), null);
  assert.equal(comme(puceDe(banc, 'tout').querySelector('.nombre')).textContent, '25');
  // La vue d'un élément garde ses Bloquants.
  choisir(banc, 'tokens');
  assert.equal(banc.racine.querySelector('.en-tete-bloquants'), null);
  assert.equal(banc.racine.querySelectorAll('.bloc.ton-bloquant').length, 1);
});

test('sans Bloquant, « Tout » n’a pas d’en-tête', () => {
  assert.equal(monter().racine.querySelector('.en-tete-bloquants'), null);
});

test('le résumé donne le nombre de points', () => {
  const banc = monter();
  assert.match(comme(banc.racine.querySelector('.arch-resume-titre')).textContent, /24 points/);
});

test('Appliquer sur une carte n’envoie que les lignes cochées de cette carte', () => {
  const banc = monter();
  const tailles = sectionDe(banc, 'tailles');
  assert.equal(boutonsDeCartes(tailles).length, 1);
  boutonsDeCartes(tailles)[0].clic();
  assert.deepEqual(banc.envois.appliquer, [{ ids: ['cor:padding-x', 'cor:padding-y'], liaisons: 2 }]);
  // Une ligne décochée ne part pas.
  const cases = tailles.querySelectorAll('.diff input');
  cases[0].clic();
  boutonsDeCartes(tailles)[0].clic();
  assert.deepEqual(banc.envois.appliquer[1], { ids: ['cor:padding-y'], liaisons: 1 });
});

test('Appliquer sur la carte des règles n’envoie que l’instance de règles, sans compter de liaison', () => {
  const banc = monter();
  boutonsDeCartes(sectionDe(banc, 'regles'))[0].clic();
  assert.deepEqual(banc.envois.appliquer, [{ ids: ['cor:regles'], liaisons: 0 }]);
});

test('Appliquer d’une carte est inactif quand rien n’y est coché, sans toucher aux autres cartes', () => {
  const banc = monter();
  const tailles = sectionDe(banc, 'tailles');
  const carte = comme(tailles.querySelector('.bloc'));
  comme(carte.querySelector('.bloc-tete input')).clic();
  assert.equal(boutonsDeCartes(tailles)[0].disabled, true);
  assert.equal(boutonsDeCartes(sectionDe(banc, 'regles'))[0].disabled, false);
  boutonsDeCartes(tailles)[0].clic();
  assert.deepEqual(banc.envois.appliquer, []);
});

test('chaque carte de corrections a son Appliquer, entre la phrase et le chevron', () => {
  const banc = monter();
  bande(sectionDe(banc, 'couleurs')).clic();
  const cartes = sectionDe(banc, 'couleurs').querySelectorAll('.bloc').filter((carte) => carte.querySelector('input.case'));
  assert.equal(cartes.length >= 2, true);
  for (const carte of cartes.filter((candidate) => candidate.querySelector('.appliquer-carte'))) {
    const tete = comme(carte.querySelector('.bloc-tete'));
    const rangs = ['.bloc-bouton', '.appliquer-carte', '.bloc-replier'].map((selecteur) => tete.children.indexOf(comme(tete.querySelector(selecteur))));
    assert.deepEqual(rangs, [...rangs].sort((a, b) => a - b));
    assert.equal(rangs.every((rang) => rang >= 0), true);
  }
});

test('le chevron d’une carte est un bouton qui déplie comme la phrase, sous aria-expanded', () => {
  const banc = monter();
  const tailles = sectionDe(banc, 'tailles');
  const tete = comme(comme(tailles.querySelector('.bloc')).querySelector('.bloc-tete'));
  const replier = comme(tete.querySelector('.bloc-replier'));
  const phrase = comme(tete.querySelector('.bloc-bouton'));
  assert.ok(replier.querySelector('.chevron-svg'));
  assert.equal(phrase.querySelector('.chevron-svg'), null);
  const avant = replier.getAttribute('aria-expanded');
  comme(tailles.querySelector('.bloc-replier')).clic();
  const apres = comme(comme(sectionDe(banc, 'tailles').querySelector('.bloc')).querySelector('.bloc-replier')).getAttribute('aria-expanded');
  assert.notEqual(apres, avant);
});

test('« Appliquer tout » envoie toutes les corrections cochées, de tous les éléments', () => {
  const banc = monter();
  assert.equal(boutonDePied(banc).textContent, 'Appliquer tout');
  boutonDePied(banc).clic();
  assert.equal(banc.envois.appliquer.length, 1);
  assert.deepEqual([...banc.envois.appliquer[0].ids].sort(), ['cor:container', 'cor:icon', 'cor:padding-x', 'cor:padding-y', 'cor:regles', 'cor:texte:error', 'cor:texte:info', 'cor:texte:success', 'cor:texte:warning']);
  assert.equal(banc.envois.appliquer[0].liaisons, 8);
});

test('« Appliquer tout » écrit aussi ce que l’élément choisi ne montre pas, et le résumé le dit', () => {
  const banc = monter();
  choisir(banc, 'tailles');
  const resume = comme(pied(banc).querySelector('.corrections-resume'));
  assert.match(resume.textContent, /^4 corrections cochées, dont 1 dans Tailles et forme/);
  boutonDePied(banc).clic();
  assert.equal(banc.envois.appliquer[0].ids.length, 9);
  assert.equal(banc.envois.appliquer[0].ids.includes('cor:icon'), true);
});

test('le résumé ne parle de part cachée que si une carte cochée n’est pas visible', () => {
  const banc = monter();
  assert.doesNotMatch(comme(pied(banc).querySelector('.corrections-resume')).textContent, /dont/);
  choisir(banc, 'couleurs');
  assert.match(comme(pied(banc).querySelector('.corrections-resume')).textContent, /^4 corrections cochées, dont 2 dans Couleurs/);
  // Les cartes des autres éléments décochées : plus rien de caché, plus de « dont ».
  choisir(banc, 'tailles');
  comme(sectionDe(banc, 'tailles').querySelector('.bloc-tete input')).clic();
  choisir(banc, 'regles');
  comme(sectionDe(banc, 'regles').querySelector('.bloc-tete input')).clic();
  choisir(banc, 'couleurs');
  assert.doesNotMatch(comme(pied(banc).querySelector('.corrections-resume')).textContent, /dont/);
  assert.match(comme(pied(banc).querySelector('.corrections-resume')).textContent, /^2 corrections cochées/);
});

test('un élément sans carte cochée visible dit « aucune », jamais « dont 0 »', () => {
  const banc = monter();
  choisir(banc, 'tokens');
  const texte = comme(pied(banc).querySelector('.corrections-resume')).textContent;
  assert.match(texte, /^4 corrections cochées, aucune dans Tokens du composant/);
  assert.doesNotMatch(texte, /dont 0/);
});

test('une case décochée dans une vue reste décochée dans l’autre', () => {
  const banc = monter();
  choisir(banc, 'regles');
  comme(sectionDe(banc, 'regles').querySelector('.bloc-tete input')).clic();
  choisir(banc, 'tout');
  boutonDePied(banc).clic();
  assert.equal(banc.envois.appliquer[0].ids.includes('cor:regles'), false);
});

test('le pied se recompte quand une case change et « Appliquer tout » s’éteint à zéro', () => {
  const banc = monter();
  for (const id of ['tailles', 'regles']) {
    comme(sectionDe(banc, id).querySelector('.bloc-tete input')).clic();
  }
  bande(sectionDe(banc, 'couleurs')).clic();
  for (const carte of sectionDe(banc, 'couleurs').querySelectorAll('.bloc').filter((candidate) => candidate.querySelector('.bloc-tete input'))) comme(carte.querySelector('.bloc-tete input')).clic();
  assert.equal(comme(pied(banc).querySelector('.corrections-resume')).textContent, 'Aucune correction cochée.');
  assert.equal(boutonDePied(banc).disabled, true);
});

test('une question répondue garde sa ligne de réponse avec Annuler la réponse, dans la section de son élément', () => {
  const question = constatsAlert.find((constat) => constat.question);
  assert.ok(question?.question);
  const reponse = { id: 'rep:1', sorte: 'liaison' as const, cible: { layer: question.layers[0], champ: 'fills' }, avant: null, apres: { nom: 'alert/colors/info/standard/title' }, aRelire: { regle: 'r', avant: null } };
  const banc = monter(constatsAlert, { repondues: { [question.question.id]: reponse } });
  bande(sectionDe(banc, 'couleurs')).clic();
  const ligne = sectionDe(banc, 'couleurs').querySelectorAll('.resultat');
  assert.equal(ligne.length, 1);
  assert.match(ligne[0].textContent, /Appliquez-le avec les corrections de cette section\./);
  const annuler = sectionDe(banc, 'couleurs').querySelectorAll('.constat-actions .btn-texte').filter((bouton) => bouton.textContent.startsWith('Annuler'));
  assert.deepEqual(textes(annuler), ['Annuler la réponse']);
  annuler[0].clic();
  assert.deepEqual(banc.envois.annulees, [question.question.id]);
  // Sa correction est une carte de corrections de plus, et les points ne changent pas.
  assert.equal(nombre(sectionDe(banc, 'couleurs')), '18');
});

test('une correction déjà écrite n’est plus un point', () => {
  const banc = monter(constatsAlert, { appliquees: ['cor:regles'] });
  assert.equal(bande(sectionDe(banc, 'regles')).classes.has('tenue'), true);
  assert.equal(puceDe(banc, 'regles'), undefined);
  assert.equal(comme(puceDe(banc, 'tout').querySelector('.nombre')).textContent, '23');
  assert.deepEqual(sections(banc).map((section) => section.dataset.element).slice(-4), ['texte', 'variants', 'regles', 'a11y']);
});

test('les constats ignorés se rangent sous « Ignorés », en fin de « Tout » et dans la vue de leur élément', () => {
  const ignore = constatsAlert.find((constat) => constat.famille === 'tokens') as Constat;
  const banc = monter(constatsAlert.filter((constat) => constat !== ignore), { tous: constatsAlert, ignores: [ignore.id] });
  const intertitre = banc.racine.querySelectorAll('.intertitre-structure h2');
  assert.deepEqual(textes(intertitre), ['Ignorés']);
  assert.equal(banc.racine.querySelectorAll('.bloc.muette').length, 1);
  choisir(banc, 'couleurs');
  assert.equal(banc.racine.querySelectorAll('.bloc.muette').length, 0);
  choisir(banc, 'tokens');
  assert.equal(banc.racine.querySelectorAll('.bloc.muette').length, 1);
});

test('le composant sans token est un point de « Tokens du composant », avec sa carte en tête de ce qui reste à faire', () => {
  const banc = monter([], { sansTokens: true });
  assert.deepEqual(puces(banc).map((puce) => [puce.dataset.element, comme(puce.querySelector('.nombre')).textContent]), [['tout', '1'], ['tokens', '1']]);
  const tokens = sectionDe(banc, 'tokens');
  assert.equal(tokens.querySelectorAll('.bloc-constat').length, 1);
  assert.equal(bande(sectionDe(banc, 'couleurs')).classes.has('tenue'), true);
});

test('les liaisons d’une préparation sont une carte de corrections de « Tokens du composant », avec son Appliquer', () => {
  const correction = { id: 'prep:1', sorte: 'liaison' as const, cible: { layer: 'alert:l:gauche', champ: 'paddingLeft' }, avant: null, apres: { nom: 'alert/sizes/padding-x' }, aRelire: { regle: 'r', avant: null } };
  const banc = monter([], { liaisons: { preparation: 'p', corrections: [correction], enAttente: [] } });
  assert.deepEqual(puces(banc).map((puce) => puce.dataset.element), ['tout', 'tokens']);
  const tokens = sectionDe(banc, 'tokens');
  assert.match(comme(tokens.querySelector('.bloc-phrase')).textContent, /^Lier les layers de Alert à leurs tokens/);
  boutonsDeCartes(tokens)[0].clic();
  assert.deepEqual(banc.envois.appliquer, [{ ids: ['prep:1'], liaisons: 1 }]);
});

test('une analyse périmée ne montre ni sommaire ni section : la note du changement, ou la ligne du lot', () => {
  const banc = monter(constatsAlert, { perimee: true, cause: 'document' });
  assert.equal(banc.racine.querySelector('.sommaire-elements'), null);
  assert.equal(sections(banc).length, 0);
  assert.equal(comme(banc.panneau.liste).textContent, 'Les constats datent d’avant le changement.');
  banc.actualiser({ lot: { resume: '8 layers liés', ecrites: 8, appliquees: [] } });
  assert.match(comme(banc.panneau.liste).textContent, /8 layers liés/);
  assert.match(comme(banc.panneau.liste).textContent, /Ctrl\+Z/);
});

test('pendant une écriture, la note et un pied inactif remplacent la liste', () => {
  const banc = monter(constatsAlert, { ecriture: { liaisons: 8, ids: [] } });
  assert.equal(sections(banc).length, 0);
  assert.match(comme(banc.panneau.liste).textContent, /Écriture de 8 liaisons en cours\./);
  assert.equal(boutonDePied(banc).disabled, true);
});

test('le sommaire et la liste sont deux hôtes durables que corps.ts peut masquer', () => {
  const banc = monter();
  const { sommaire, liste } = banc.panneau;
  comme(sommaire).hidden = true;
  comme(liste).hidden = true;
  banc.actualiser();
  assert.equal(banc.panneau.sommaire, sommaire);
  assert.equal(banc.panneau.liste, liste);
  assert.equal(comme(sommaire).hidden, true);
  assert.equal(comme(liste).hidden, true);
});

test('le passage par un résultat provisoire puis au final garde les sections ouvertes ou fermées par le designer', () => {
  const banc = monter();
  bande(sectionDe(banc, 'couleurs')).clic();
  bande(sectionDe(banc, 'tailles')).clic();
  banc.actualiser({ statut: 'provisoire' });
  banc.actualiser({ statut: 'complete' });
  assert.deepEqual(['couleurs', 'tailles'].map((id) => bande(sectionDe(banc, id)).getAttribute('aria-expanded')), ['true', 'false']);
});

test('le défilement du panneau se rend après le redessin, même quand le redessin le ramène à zéro', () => {
  const banc = monter();
  const pile = comme(banc.racine.children[0]);
  const remplacer = pile.replaceChildren.bind(pile);
  pile.replaceChildren = (...enfants) => {
    (banc.racine as unknown as { scrollTop: number }).scrollTop = 0;
    remplacer(...enfants);
  };
  (banc.racine as unknown as { scrollTop: number; scrollLeft: number }).scrollTop = 240;
  (banc.racine as unknown as { scrollLeft: number }).scrollLeft = 12;
  banc.actualiser({ statut: 'complete' });
  assert.equal((banc.racine as unknown as { scrollTop: number }).scrollTop, 240);
  assert.equal((banc.racine as unknown as { scrollLeft: number }).scrollLeft, 12);
});

test('pendant le provisoire, le panneau montre les constats avec la barre, Annuler et la mention, sans section tenue ni pied', () => {
  const banc = monter(constatsAlert, { statut: 'provisoire', progression: { lus: 11, total: 11, phase: 'imbriques', fraction: 0.35 } });
  assert.ok(sections(banc).length > 0, 'les constats provisoires sont rangés par section');
  assert.equal(sections(banc).some((section) => bande(section).classes.has('tenue')), false, 'aucune section tenue');
  assert.equal(banc.racine.querySelector('.corrections-pied'), null, 'le pied des corrections est masqué');
  assert.notEqual(banc.racine.querySelector('.progression-analyse'), null);
  assert.match(banc.racine.textContent, /Lecture des composants imbriqués, 24 points/);
  assert.match(banc.racine.textContent, /Annuler/);
  assert.match(banc.racine.textContent, /L’analyse des composants imbriqués est en cours\. D’autres points peuvent s’ajouter\./);
  assert.doesNotMatch(banc.racine.textContent, /s’afficheront à la fin/);
});

test('au final, la mention, la barre, Annuler, les sections tenues et le pied reviennent ou disparaissent', () => {
  const banc = monter(constatsAlert, { statut: 'provisoire', progression: { lus: 11, total: 11, phase: 'imbriques', fraction: 0.35 } });
  banc.actualiser({ statut: 'complete', progression: null });
  assert.equal(banc.racine.querySelector('.progression-analyse'), null);
  assert.doesNotMatch(banc.racine.textContent, /composants imbriqués est en cours/);
  assert.doesNotMatch(banc.racine.textContent, /Annuler/);
  assert.equal(sections(banc).some((section) => bande(section).classes.has('tenue')), true);
  assert.notEqual(banc.racine.querySelector('.corrections-pied'), null);
});

test('après Annuler pendant le provisoire, le panneau montre l’écran annulé et plus les constats provisoires', () => {
  const banc = monter(constatsAlert, { statut: 'provisoire', progression: { lus: 11, total: 11, phase: 'imbriques', fraction: 0.35 } });
  banc.actualiser({ statut: 'annulee', constats: [], tous: [], variants: [], progression: null });
  assert.equal(sections(banc).length, 0);
  assert.equal(banc.racine.querySelector('.progression-analyse'), null);
  assert.match(banc.racine.textContent, /L’analyse a été annulée\./);
  assert.match(banc.racine.textContent, /Aucun constat n’a été rendu\./);
  assert.doesNotMatch(banc.racine.textContent, /composants imbriqués est en cours/);
});

test('après l’arrêt du moteur pendant le provisoire, le panneau montre l’écran arrêté et plus les constats provisoires', () => {
  const banc = monter(constatsAlert, { statut: 'provisoire', progression: { lus: 11, total: 11, phase: 'imbriques', fraction: 0.35 } });
  const bloquantDuMoteur = { id: 'C0:0', code: 'C0', type: 'bloquant', famille: 'export', variants: [], layers: [], faits: { message: 'boum' } } as Constat;
  banc.actualiser({ statut: 'arretee', constats: [bloquantDuMoteur], tous: [bloquantDuMoteur], variants: [], progression: null });
  assert.equal(sections(banc).length, 0);
  assert.equal(banc.racine.querySelector('.progression-analyse'), null);
  assert.equal(banc.racine.querySelector('.corrections-pied'), null);
  assert.match(banc.racine.textContent, /L’analyse s’est arrêtée\./);
  assert.match(banc.racine.textContent, /Message de l’exporteur : boum/);
  assert.match(banc.racine.textContent, /Aucun autre contrôle n’a été fait\./);
  assert.doesNotMatch(banc.racine.textContent, /composants imbriqués est en cours/);
});

test('le final partielle après le provisoire montre l’alerte de couverture, les sections tenues et le pied', () => {
  const banc = monter(constatsAlert, { statut: 'provisoire', progression: { lus: 11, total: 11, phase: 'imbriques', fraction: 0.35 } });
  banc.actualiser({ statut: 'partielle', progression: null, lecture: { layersLus: 2000, layersNonLus: 640, variantsNonLus: ['Severity=warning'], manquees: [] } as never });
  assert.match(banc.racine.textContent, /Analyse partielle : 2 000 layers lus sur 2 640\./);
  assert.match(banc.racine.textContent, /Les variants non lus ne sont pas contrôlés\./);
  assert.equal(banc.racine.querySelector('.progression-analyse'), null);
  assert.doesNotMatch(banc.racine.textContent, /composants imbriqués est en cours/);
  assert.equal(sections(banc).some((section) => bande(section).classes.has('tenue')), true);
  assert.notEqual(banc.racine.querySelector('.corrections-pied'), null);
});

test('une péremption pendant le provisoire garde les constats consultables sous l’alerte périmée, sans barre, mention, tenue ni pied', () => {
  const banc = monter(constatsAlert, { statut: 'provisoire', progression: { lus: 11, total: 11, phase: 'imbriques', fraction: 0.35 } });
  banc.actualiser({ perimee: true, cause: 'document' });
  assert.ok(sections(banc).length > 0);
  assert.equal(sections(banc).some((section) => bande(section).classes.has('tenue')), false);
  assert.equal(banc.racine.querySelector('.corrections-pied'), null);
  assert.equal(banc.racine.querySelector('.progression-analyse'), null);
  assert.match(banc.racine.textContent, /Le composant a changé depuis l’analyse\./);
  assert.match(banc.racine.textContent, /Cliquez Actualiser pour relire\./);
  assert.match(banc.racine.textContent, /24 points/);
  assert.doesNotMatch(banc.racine.textContent, /composants imbriqués est en cours|Annuler|analysé à/);
  assert.ok(boutonsDeCartes(banc.racine).length > 0);
  assert.equal(boutonsDeCartes(banc.racine).every((bouton) => bouton.disabled), true, 'aucune écriture possible');
});

test('une péremption pendant en-cours remplace la progression par l’alerte périmée', () => {
  const banc = monter([], { statut: 'en-cours', progression: { lus: 5, total: 11, phase: 'releve', fraction: 0.14 } });
  banc.actualiser({ perimee: true, cause: 'selection' });
  assert.equal(banc.racine.querySelector('.progression-analyse'), null);
  assert.match(banc.racine.textContent, /Le composant a changé depuis l’analyse\./);
  assert.doesNotMatch(banc.racine.textContent, /Annuler|s’afficheront à la fin/);
});

/* ---------- La section Informations (U5) ---------- */

const LAYER = (alertCorrections as unknown as { calques: Array<{ id: string; nom: string }> }).calques[0];
const NOM_DES_VARIANTS = alertCorrections.sujet.variants.map((variant) => variant.nom);
const informations = (): Constat[] => [
  { id: 'C53', code: 'C53', type: 'info', famille: 'contraste', variants: [NOM_DES_VARIANTS[0]], layers: [], faits: { variantsExclus: 1 } },
  { id: 'C49:degrade', code: 'C49', type: 'info', famille: 'contraste', variants: NOM_DES_VARIANTS.slice(0, 2), layers: [LAYER.id], limite: true, faits: { cause: 'degrade', champ: 'fills', usage: 'texte', calque: LAYER.nom } },
  { id: 'C49:borne', code: 'C49', type: 'info', famille: 'contraste', variants: [], layers: [], limite: true, faits: { borne: 5000, combinaisonsMesurees: 5000, combinaisonsNonMesurees: 12 } },
];
const sectionDesInformations = (banc: Banc): ElementDeTest => comme(banc.racine.querySelector('.section-informations'));
const lignes = (banc: Banc): ElementDeTest[] => sectionDesInformations(banc).querySelectorAll('.info-ligne');

test('la section Informations vient en dernier, repliée, avec son nombre et un signe gris', () => {
  const banc = monter([...constatsAlert, ...informations()]);
  const toutes = sections(banc);
  assert.equal(toutes[toutes.length - 1], sectionDesInformations(banc));
  const laBande = bande(sectionDesInformations(banc));
  assert.equal(laBande.tagName, 'BUTTON');
  assert.equal(laBande.getAttribute('aria-expanded'), 'false');
  assert.equal(comme(laBande.querySelector('.titre')).textContent, 'Informations');
  assert.equal(nombre(laBande), '3');
  assert.ok(laBande.querySelector('.chevron-svg'));
  const signe = comme(laBande.querySelector('.signe'));
  assert.ok(signe.classes.has('signe-24'));
  assert.equal(signe.classes.has('signe-informe'), false);
  // Repliée, elle ne dessine pas ses lignes.
  assert.equal(lignes(banc).length, 0);
});

test('une information ne compte ni dans « Tout », ni dans le sommaire, ni dans le résumé, ni dans les cartes', () => {
  const banc = monter([...constatsAlert, ...informations()]);
  assert.deepEqual(puces(banc).map((puce) => [puce.dataset.element, comme(puce.querySelector('.nombre')).textContent]), [['tout', '24'], ['couleurs', '18'], ['tailles', '2'], ['tokens', '3'], ['regles', '1']]);
  assert.match(comme(banc.racine.querySelector('.arch-resume-titre')).textContent, /24 points/);
  bande(sectionDesInformations(banc)).clic();
  assert.equal(banc.racine.querySelectorAll('.bloc.ton-info').length, 0);
  assert.equal(banc.racine.querySelectorAll('.bloc.muette').length, 0);
});

test('ouverte, la section montre une ligne par information : phrase, lieu, sans liseré ni mot de sévérité ni chevron', () => {
  const banc = monter([...constatsAlert, ...informations()]);
  bande(sectionDesInformations(banc)).clic();
  assert.equal(bande(sectionDesInformations(banc)).getAttribute('aria-expanded'), 'true');
  const toutes = lignes(banc);
  assert.equal(toutes.length, 3);
  assert.match(toutes[0].textContent, /^Contraste non mesuré sur Disabled, que WCAG exempte\./);
  assert.match(toutes[1].textContent, new RegExp(`^Contraste non mesuré : le fill du layer ${LAYER.nom} est un dégradé\.`));
  assert.match(toutes[2].textContent, /^12 paires de couleurs non mesurées sur 5012\.$/);
  assert.ok(toutes[0].querySelector('.info-lieu'));
  assert.equal(toutes[2].querySelector('.info-lieu'), null);
  for (const ligne of toutes) {
    assert.equal(ligne.classes.has('bloc'), false);
    assert.equal(ligne.querySelector('.ico'), null);
    assert.equal(ligne.querySelector('.chevron-svg'), null);
    assert.equal(ligne.querySelector('.bloc-replier'), null);
  }
});

test('Sélectionner n’existe que sur une information qui vise des layers, et sélectionne ces layers', () => {
  const banc = monter([...constatsAlert, ...informations()]);
  bande(sectionDesInformations(banc)).clic();
  const [exclus, degrade, borne] = lignes(banc);
  assert.equal(exclus.querySelector('.bouton-selectionner'), null);
  assert.equal(borne.querySelector('.bouton-selectionner'), null);
  const bouton = comme(degrade.querySelector('.bouton-selectionner'));
  assert.equal(bouton.textContent.trim(), 'Sélectionner');
  bouton.clic();
  assert.deepEqual(banc.envois.selections, [[LAYER.id]]);
  // Les layers sont sélectionnés par le plugin : le bouton le dit, et la section reste ouverte.
  const apres = comme(lignes(banc)[1].querySelector('.bouton-selectionner'));
  assert.equal(apres.textContent.trim(), 'Sélectionnés');
  assert.equal(apres.disabled, true);
  assert.equal(bande(sectionDesInformations(banc)).getAttribute('aria-expanded'), 'true');
});

test('la section Informations reste ouverte à une nouvelle analyse du même sujet et se replie quand le sujet change', () => {
  const banc = monter([...constatsAlert, ...informations()]);
  bande(sectionDesInformations(banc)).clic();
  banc.actualiser({ identite: { sujet: 'Alert', generation: 2 } });
  assert.equal(bande(sectionDesInformations(banc)).getAttribute('aria-expanded'), 'true');
  banc.actualiser({ identite: { sujet: 'Button', generation: 3 } });
  assert.equal(bande(sectionDesInformations(banc)).getAttribute('aria-expanded'), 'false');
});

test('sans information, la section n’existe pas ; une puce d’élément ne la montre pas', () => {
  const banc = monter();
  assert.equal(banc.racine.querySelector('.section-informations'), null);
  const avec = monter([...constatsAlert, ...informations()]);
  choisir(avec, 'tailles');
  assert.equal(avec.racine.querySelector('.section-informations'), null);
});

test('des informations seules : tous les éléments sont tenus, la section Informations suit, le sommaire est vide', () => {
  const banc = monter(informations());
  assert.equal(banc.racine.querySelector('.sommaire-elements'), null);
  assert.deepEqual(sections(banc).map((section) => section.dataset.element), ['couleurs', 'tailles', 'texte', 'tokens', 'variants', 'regles', 'a11y', 'informations']);
  assert.equal(nombre(bande(sectionDesInformations(banc))), '3');
});

test('un constat info déjà ignoré n’apparaît pas sous « Ignorés »', () => {
  const infos = informations();
  const banc = monter(constatsAlert, { tous: [...constatsAlert, ...infos], ignores: [infos[0].id] });
  assert.equal(banc.racine.querySelectorAll('.intertitre-structure').length, 0);
  assert.equal(banc.racine.querySelector('.section-informations'), null);
});
