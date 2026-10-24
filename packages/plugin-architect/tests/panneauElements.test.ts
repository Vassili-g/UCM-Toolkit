/** Le panneau par éléments : rangement par champ puis par famille, ordre des entrées, Bloquants, éléments tenus, nombres. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { ELEMENTS_DU_PANNEAU, elementDuConstat, elementsDuPanneau, sansLesBloquants, type IdDElement } from '../src/ui/panneau/elements';

const { constatsAlert, alertCorrections } = require('../galerie/etats/corrections.cjs') as { constatsAlert: Constat[]; alertCorrections: { sujet: { nom: string; variants: Array<{ id: string; nom: string }> }; calques: Array<{ id: string; nom: string }> } };

const contexte = {
  composant: 'Alert',
  variants: alertCorrections.sujet.variants,
  layers: new Map(alertCorrections.calques.map((calque) => [calque.id, calque.nom])),
  constats: constatsAlert,
};
const constatBrut = (extra: Partial<Constat>): Constat => ({ id: 'X:1', code: 'C25', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {}, ...extra });

test('les éléments suivent l’ordre du panneau', () => {
  assert.deepEqual([...ELEMENTS_DU_PANNEAU], ['couleurs', 'tailles', 'texte', 'tokens', 'variants', 'regles', 'a11y']);
  const { elements, tenus } = elementsDuPanneau(constatsAlert, contexte);
  assert.deepEqual([...elements.map((element) => element.id), ...tenus].sort(), [...ELEMENTS_DU_PANNEAU].sort());
  assert.deepEqual(elements.map((element) => ELEMENTS_DU_PANNEAU.indexOf(element.id)), elements.map((element) => ELEMENTS_DU_PANNEAU.indexOf(element.id)).sort((a, b) => a - b));
});

test('le champ d’un constat le range par sa nature', () => {
  const parChamp = (champ: string, famille: Constat['famille'] = 'liaisons'): IdDElement => elementDuConstat(constatBrut({ famille, faits: { champ } }));
  assert.equal(parChamp('fills'), 'couleurs');
  assert.equal(parChamp('strokes'), 'couleurs');
  for (const champ of ['paddingLeft', 'itemSpacing', 'width', 'cornerRadius', 'strokeWeight', 'opacity']) assert.equal(parChamp(champ), 'tailles', champ);
  for (const champ of ['fontSize', 'lineHeight', 'letterSpacing']) assert.equal(parChamp(champ, 'tokens'), 'texte', champ);
  // Le champ prime sur la famille.
  assert.equal(parChamp('paddingTop', 'liaisons'), 'tailles');
  // Le champ d’une correction prime sur celui des faits.
  const correction = { id: 'c', sorte: 'liaison' as const, cible: { champ: 'itemSpacing' }, avant: null, apres: { nom: 'alert/sizes/gap' }, aRelire: { regle: 'r', avant: null } };
  assert.equal(elementDuConstat(constatBrut({ faits: { champ: 'fills' }, correction })), 'tailles');
});

test('sans champ, la famille range le constat', () => {
  const parFamille: Record<Constat['famille'], IdDElement> = {
    liaisons: 'couleurs', tailles: 'tailles', typographie: 'texte', tokens: 'tokens', export: 'tokens', variants: 'variants', visibilite: 'variants', regles: 'regles', contraste: 'a11y',
  };
  for (const [famille, element] of Object.entries(parFamille)) assert.equal(elementDuConstat(constatBrut({ famille: famille as Constat['famille'] })), element, famille);
  // Un champ hors de la table de natures retombe sur la famille.
  assert.equal(elementDuConstat(constatBrut({ famille: 'tokens', faits: { champ: 'inconnu' } })), 'tokens');
});

test('le contraste va dans l’accessibilité malgré le champ peint qu’il porte', () => {
  assert.equal(elementDuConstat(constatBrut({ code: 'C49', famille: 'contraste', faits: { champ: 'fills' } })), 'a11y');
  assert.equal(elementDuConstat(constatBrut({ code: 'C50', famille: 'contraste', faits: { champ: 'strokes' } })), 'a11y');
});

test('les constats d’Alert : éléments, nombres et entrées', () => {
  const { elements, tenus, bloquants } = elementsDuPanneau(constatsAlert, contexte);
  const par = (id: IdDElement) => elements.find((element) => element.id === id);
  assert.deepEqual(elements.map((element) => [element.id, element.points]), [['couleurs', 18], ['tailles', 2], ['tokens', 3], ['regles', 1]]);
  assert.equal(constatsAlert.length, 24);
  assert.equal(elements.reduce((somme, element) => somme + element.points, 0), constatsAlert.length);
  assert.deepEqual(tenus, ['texte', 'variants', 'a11y']);
  assert.deepEqual(bloquants, []);
  assert.equal(elements.some((element) => element.bloquant), false);

  const couleurs = par('couleurs')!;
  assert.equal(couleurs.corrections.length, 2);
  assert.deepEqual(couleurs.corrections.map((carte) => carte.constats.length), [2, 4]);
  assert.equal(couleurs.questions.length, 3);
  assert.equal(couleurs.aFaire.length, 18 - 6 - 3);
  const tailles = par('tailles')!;
  assert.deepEqual([tailles.corrections.length, tailles.corrections[0].constats.length, tailles.questions.length, tailles.aFaire.length], [1, 2, 0, 0]);
  const regles = par('regles')!;
  assert.deepEqual([regles.corrections.length, regles.questions.length, regles.aFaire.length], [1, 0, 0]);
  const tokens = par('tokens')!;
  assert.deepEqual([tokens.corrections.length, tokens.questions.length, tokens.aFaire.length], [0, 0, 3]);
  assert.deepEqual(tokens.aFaire.map((carte) => carte.constat.code), ['C40', 'C40', 'C40']);
});

test('chaque constat visible est rangé une fois, dans l’ordre des constats', () => {
  const { elements } = elementsDuPanneau(constatsAlert, contexte);
  const ids = elements.flatMap((element) => element.constats.map((constat) => constat.id));
  assert.equal(new Set(ids).size, constatsAlert.length);
  for (const element of elements) {
    const dansLOrdre = element.constats.map((constat) => constatsAlert.indexOf(constat));
    assert.deepEqual(dansLOrdre, [...dansLOrdre].sort((a, b) => a - b));
  }
});

test('les cartes de corrections viennent avant les questions, puis les constats à faire', () => {
  const { elements } = elementsDuPanneau(constatsAlert, contexte);
  const couleurs = elements.find((element) => element.id === 'couleurs')!;
  // Une correction, une question et un constat à faire d’un même élément : la lecture suit les trois listes dans cet ordre.
  const lecture = [...couleurs.corrections.map(() => 'correction'), ...couleurs.questions.map(() => 'question'), ...couleurs.aFaire.map(() => 'a-faire')];
  assert.deepEqual(lecture, [...Array(2).fill('correction'), ...Array(3).fill('question'), ...Array(9).fill('a-faire')]);
  // Les constats à faire gardent l’ordre des constats.
  const rangs = couleurs.aFaire.map((carte) => constatsAlert.indexOf(carte.constat));
  assert.deepEqual(rangs, [...rangs].sort((a, b) => a - b));
  // Aucun constat d’une correction ou d’une question n’est aussi à faire.
  assert.equal(couleurs.aFaire.some((carte) => carte.constat.correction !== undefined || carte.constat.question !== undefined), false);
});

test('une question sans candidat reste à faire dans Figma', () => {
  const sansCandidat = constatBrut({ id: 'Q:1', question: { id: 'q:1', candidats: [] } });
  const { elements } = elementsDuPanneau([sansCandidat], { ...contexte, constats: [sansCandidat] });
  assert.deepEqual(elements.map((element) => [element.id, element.questions.length, element.aFaire.length]), [['couleurs', 0, 1]]);
});

test('un Bloquant compte dans son élément, se lit en tête et se retire des sections de « Tout »', () => {
  const bloquant = constatBrut({ id: 'C63:b', code: 'C63', type: 'bloquant', famille: 'tokens', faits: { genre: 'alias-supprime', variable: 'alert/x' } });
  const jeu = [...constatsAlert, bloquant];
  const { elements, bloquants, enTete, tenus } = elementsDuPanneau(jeu, { ...contexte, constats: jeu });
  const tokens = elements.find((element) => element.id === 'tokens')!;
  assert.deepEqual([tokens.points, tokens.bloquant], [4, true]);
  assert.equal(elements.filter((element) => element.bloquant).length, 1);
  assert.deepEqual(bloquants.map((constat) => constat.id), ['C63:b']);
  assert.deepEqual(enTete.aFaire.map((carte) => carte.constat.id), ['C63:b']);
  assert.deepEqual([enTete.corrections.length, enTete.questions.length], [0, 0]);
  assert.equal(tokens.aFaire.length, 4);
  const dansTout = sansLesBloquants(tokens);
  assert.equal(dansTout.aFaire.length, 3);
  assert.equal(dansTout.points, 4);
  assert.deepEqual(tenus, ['texte', 'variants', 'a11y']);
});

test('un Bloquant seul fait de son élément le seul élément, les autres sont tenus', () => {
  const bloquant = constatBrut({ id: 'C49:b', code: 'C49', type: 'bloquant', famille: 'contraste', faits: { champ: 'fills' } });
  const { elements, tenus, bloquants } = elementsDuPanneau([bloquant], { ...contexte, constats: [bloquant] });
  assert.deepEqual(elements.map((element) => [element.id, element.points, element.bloquant]), [['a11y', 1, true]]);
  assert.deepEqual(tenus, ['couleurs', 'tailles', 'texte', 'tokens', 'variants', 'regles']);
  assert.equal(bloquants.length, 1);
});

test('sans constat, tous les éléments sont tenus', () => {
  const vide = elementsDuPanneau([], { ...contexte, constats: [] });
  assert.deepEqual(vide, { elements: [], bloquants: [], enTete: { corrections: [], questions: [], aFaire: [] }, tenus: [...ELEMENTS_DU_PANNEAU] });
});
