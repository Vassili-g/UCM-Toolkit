/**
 * Recette du Button (25 novembre), lot L4 : le constat C24 que le kit rend pour le calque peint d'une icône, dans chaque variant. Une carte
 * par icône (D6), dont Sélectionner vise les calques peints (D5) et dont Ignorer écarte tous les constats ; le lieu donne le chemin du calque
 * (D7) ; les phrases disent « fill » et « stroke ».
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { poserLeDom, comme, type ElementDeTest } from './domDeTest';

poserLeDom();

// Les modules de l'interface lisent `document` à l'appel, pas à l'import : ils se chargent après `poserLeDom`.
import { monterLePanneau, type PanneauDesConstats } from '../src/ui/analyse';
import type { AnalyseRecue } from '../src/ui/composant/analyse';
import { carteDAFaire, cartesDAFaire, regrouperLesConstats, type ContexteDAFaire } from '../src/ui/ignores/modele';

const { alertCorrections } = require('../galerie/etats/corrections.cjs') as { alertCorrections: { sujet: { nom: string; variants: Array<{ id: string; nom: string }> } } };

const VARIANTS = alertCorrections.sujet.variants;
const [V1, V2, V3] = VARIANTS;

const contexte: ContexteDAFaire = { composant: 'Button', variants: VARIANTS, layers: new Map([['sizeWrapper', '.sizeWrapperButton']]) };

/** Le constat que le kit rend pour le remplissage de l'icône `icone`, dans le variant `variant`, avec le token propre à ce variant. */
function constatDIcone(icone: string, variant: { id: string }, rang: number, faits: Constat['faits'] = {}): Constat {
  const id = `C24:${icone}:${rang}`;
  return {
    id, code: 'C24', type: 'corriger', famille: 'liaisons', variants: [variant.id], layers: ['sizeWrapper'],
    faits: {
      token: `Button/Color/${rang}/foreground`, role: 'foreground', attendu: 'background', champ: 'fills',
      surcharge: `I${icone};3:429;1829:9613`, calque: 'Vector', chemin: `${icone} › Vector`, indice: 0, ...faits,
    },
    question: { id, candidats: [] },
  };
}

const gauche1 = constatDIcone('arrow-left-long', V1, 1);
const gauche2 = constatDIcone('arrow-left-long', V2, 2);
const droite1 = constatDIcone('arrow-right-long', V1, 3);

const textesDuLieu = (lieu: readonly unknown[]): string => lieu.filter((morceau): morceau is string => typeof morceau === 'string').join('');

test('deux constats C24 de deux variants pour la même icône forment une seule carte, une autre icône garde la sienne', () => {
  const groupes = regrouperLesConstats([gauche1, droite1, gauche2], contexte);
  assert.deepEqual(groupes.map((groupe) => groupe.map(({ id }) => id)), [[gauche1.id, gauche2.id], [droite1.id]]);
  const cartes = cartesDAFaire([gauche1, droite1, gauche2], contexte);
  assert.equal(cartes.length, 2);
  assert.deepEqual(cartes[0].groupe.map(({ id }) => id), [gauche1.id, gauche2.id]);
  assert.equal(cartes[0].constat, gauche1);
});

test('la carte d’un groupe compte les variants et ne nomme aucun token quand ils diffèrent', () => {
  const [carte] = cartesDAFaire([gauche1, gauche2], contexte);
  assert.match(textesDuLieu(carte.lieu), /^2 variants/);
  assert.doesNotMatch(carte.phrase, /Color\/\d/);
  assert.match(carte.phrase, /fill/);
  assert.equal(carte.statut, 'Créez le token background, puis liez-le');
});

test('un groupe dont tous les constats ont le même token garde la phrase d’un seul constat', () => {
  const memeToken = constatDIcone('arrow-left-long', V2, 1);
  const [carte] = cartesDAFaire([gauche1, memeToken], contexte);
  assert.equal(carte.phrase, 'Le fill est lié à `Color/1/foreground`, un token foreground. Un fill de ce layer attend un token background.');
  assert.match(textesDuLieu(carte.lieu), /^2 variants/);
});

test('le champ, le rôle attendu, le rôle lu et le chemin séparent les groupes ; un constat avec correction ou un modèle reste seul', () => {
  const contour = constatDIcone('arrow-left-long', V2, 2, { champ: 'strokes' });
  const autreRole = constatDIcone('arrow-left-long', V3, 3, { attendu: 'border' });
  const autreRoleLu = constatDIcone('arrow-left-long', V3, 4, { role: 'background' });
  const sansChemin = constatDIcone('arrow-left-long', V3, 5, { chemin: undefined as unknown as string });
  const avecCorrection: Constat = { ...constatDIcone('arrow-left-long', V3, 6), question: undefined, correction: { id: 'cor', sorte: 'liaison', cible: { layer: 'x', champ: 'fills' }, avant: null, apres: { nom: 'n' }, aRelire: { regle: 'r', avant: null } } as Constat['correction'] };
  const modele = constatDIcone('arrow-left-long', V3, 7, { modele: V1.nom });
  const tous = [gauche1, contour, autreRole, autreRoleLu, sansChemin, avecCorrection, modele];
  assert.equal(regrouperLesConstats(tous, contexte).length, tous.length);
});

test('un constat qui n’est ni C17 ni C24 ne se groupe pas, même identique', () => {
  const c20 = (id: string): Constat => ({ id, code: 'C20', type: 'corriger', famille: 'liaisons', variants: [V1.id], layers: ['sizeWrapper'], faits: { token: 't', couche: 'theme', admises: 'components' } });
  assert.equal(regrouperLesConstats([c20('a'), c20('b')], contexte).length, 2);
});

test('Sélectionner d’une carte vise les calques peints, un par constat du groupe, sans doublon', () => {
  const [carte] = cartesDAFaire([gauche1, gauche2, constatDIcone('arrow-left-long', V3, 9)], contexte);
  assert.deepEqual(carte.aSelectionner, ['Iarrow-left-long;3:429;1829:9613']);
  const autre = constatDIcone('arrow-left-long', V2, 8, { surcharge: 'I3:152;3:431;1829:9631', chemin: 'arrow-left-long › Vector' });
  assert.deepEqual(cartesDAFaire([gauche1, autre], contexte)[0].aSelectionner, ['Iarrow-left-long;3:429;1829:9613', 'I3:152;3:431;1829:9631']);
  const sansSurcharge: Constat = { ...gauche1, faits: { ...gauche1.faits, surcharge: undefined as unknown as string } };
  assert.deepEqual(carteDAFaire(sansSurcharge, contexte).aSelectionner, ['sizeWrapper']);
});

test('le lieu d’une surcharge donne le chemin du calque, sous la forme de chaîne comme sous celle de tableau, sinon le nom du calque', () => {
  assert.match(textesDuLieu(carteDAFaire(gauche1, contexte).lieu), /layer arrow-left-long › Vector$/);
  const enTableau: Constat = { ...gauche1, faits: { ...gauche1.faits, chemin: ['arrow-left-long', 'Vector'] as unknown as string } };
  assert.match(textesDuLieu(carteDAFaire(enTableau, contexte).lieu), /layer arrow-left-long › Vector$/);
  const sansChemin: Constat = { ...gauche1, faits: { ...gauche1.faits, chemin: undefined as unknown as string } };
  assert.match(textesDuLieu(carteDAFaire(sansChemin, contexte).lieu), /layer Vector$/);
});

test('les phrases de liaison disent fill et stroke', () => {
  assert.equal(carteDAFaire(gauche1, contexte).phrase, 'Le fill est lié à `Color/1/foreground`, un token foreground. Un fill de ce layer attend un token background.');
  const contour = constatDIcone('arrow-left-long', V2, 2, { champ: 'strokes', attendu: 'border' });
  assert.equal(carteDAFaire(contour, contexte).phrase, 'Le stroke est lié à `Color/2/foreground`, un token foreground. Un stroke de ce layer attend un token border.');
  const sansToken: Constat = { id: 'C25:x', code: 'C25', type: 'corriger', famille: 'liaisons', variants: [V1.id], layers: ['sizeWrapper'], faits: { champ: 'fills', calque: 'container' } };
  assert.equal(carteDAFaire(sansToken, contexte).phrase, 'Le fill du layer container n’est lié à aucun token.');
});

interface Banc {
  racine: ElementDeTest;
  selections: Array<readonly string[]>;
  ignores: Constat[];
  nePlusIgnores: Constat[];
}

function monter(constats: readonly Constat[], ignoresRendus: readonly Constat[] = []): Banc {
  const selections: Banc['selections'] = [];
  const ignores: Constat[] = [];
  const nePlusIgnores: Constat[] = [];
  const analyse = {
    identite: { sujet: 'Button', generation: 1 }, statut: 'complete', constats, tous: [...constats, ...ignoresRendus], ignores: ignoresRendus.map(({ id }) => id), repondues: {}, variants: VARIANTS, lecture: null, sansTokens: false,
    progression: null, perimee: false, cause: null, ecriture: null, lot: null, appliquees: [], liaisons: null, liaisonsDemandees: false, recueA: 0,
  } as unknown as AnalyseRecue;
  const etat = { composant: { lecture: alertCorrections }, analyse, architecture: null, reference: null, panneau: { ouvert: true, largeurDeLaVue: 400, element: 'tout' } };
  const app = {
    etat, selectionner: (layers: readonly string[]) => selections.push(layers),
    appliquer() {}, ignorerLaProposition() {}, repondre() {}, ignorer: (constat: Constat) => ignores.push(constat), nePlusIgnorer: (constat: Constat) => nePlusIgnores.push(constat),
    ouvrirLaConfiguration() {}, rendre() {}, annulerLaReponse() {},
  };
  const panneau: PanneauDesConstats = monterLePanneau(app as never, { poserLaSelectionDuPlugin() {}, poserLesCorrections() {} } as never);
  panneau.mettreAJour();
  return { racine: comme(panneau.element), selections, ignores, nePlusIgnores };
}

const cartes = (banc: Banc): ElementDeTest[] => banc.racine.querySelectorAll('.bloc-constat').filter((carte) => !carte.classes.has('muette'));

test('le panneau montre une carte par icône, et Sélectionner envoie les calques peints, jamais le layer de l’instance', () => {
  const banc = monter([gauche1, droite1, gauche2]);
  assert.equal(cartes(banc).length, 2);
  comme(cartes(banc)[0].querySelector('.bouton-selectionner')).clic();
  assert.deepEqual(banc.selections, [['Iarrow-left-long;3:429;1829:9613']]);
  comme(cartes(banc)[1].querySelector('.bouton-selectionner')).clic();
  assert.deepEqual(banc.selections[1], ['Iarrow-right-long;3:429;1829:9613']);
  assert.ok(banc.selections.every((layers) => !layers.includes('sizeWrapper')));
});

test('Ignorer d’une carte de groupe ignore tous ses constats ; la carte d’un seul constat n’en ignore qu’un', () => {
  const banc = monter([gauche1, droite1, gauche2]);
  const ouvrir = (rang: number): ElementDeTest => comme(cartes(banc)[rang].querySelector('.bloc-bouton'));
  ouvrir(0).clic();
  comme(cartes(banc)[0].querySelector('.constat-actions .btn-texte')).clic();
  assert.deepEqual(banc.ignores.map(({ id }) => id), [gauche1.id, gauche2.id]);
});

test('une carte de groupe ignorée se rend d’un clic : Ne plus ignorer rend tous les constats du groupe', () => {
  const banc = monter([droite1], [gauche1, gauche2]);
  const muettes = banc.racine.querySelectorAll('.muette');
  assert.equal(muettes.length, 1);
  comme(muettes[0].querySelector('.btn-texte')).clic();
  assert.deepEqual(banc.nePlusIgnores.map(({ id }) => id), [gauche1.id, gauche2.id]);
});
