/** La carte « Ajouter les règles manquantes » : une carte par composant, une ligne cochable par propriété ou par axe. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import { cartesDeCorrections } from '../src/ui/corrections/modele';
import { carteDAFaire } from '../src/ui/ignores/modele';

const correction = (propriete: string) => ({
  id: `regles:ajouter:jeu-Button:${propriete}`, sorte: 'regles' as const, cible: { layer: 'jeu-Button' }, avant: null,
  apres: { cle: 'regles', nom: 'ajouter' }, aRelire: { regle: 'regles', avant: null },
});

const sansRegle: Constat = {
  id: 'regles:C45:sans-regle:disabled', code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [],
  faits: { composant: 'Button', propriete: 'disabled', ecart: 'sans-regle', regles: 1 }, correction: correction('disabled'),
};
const sansValeur: Constat = {
  id: 'regles:C45:sans-valeur:state', code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [],
  faits: { composant: 'Button', propriete: 'state', valeurs: 'hover, focus', ecart: 'sans-valeur', regles: 2 }, correction: correction('state'),
};
const constats = [sansRegle, sansValeur];
const contexte = { composant: 'Button', variants: [], layers: new Map<string, string>(), constats };

test('les constats C45 ajoutables d’un composant font une carte de la section regles, une ligne chacun', () => {
  const cartes = cartesDeCorrections(constats, contexte);
  assert.equal(cartes.length, 1);
  const [carte] = cartes;
  assert.equal(carte.section, 'regles');
  assert.equal(carte.cle, 'regles:ajouter:jeu-Button');
  assert.deepEqual(carte.phrase, ['Ajouter les règles manquantes de Button']);
  assert.deepEqual(carte.meta, ['3 règles marquées [À compléter]. Rédigez-les ensuite dans Figma.']);
  assert.deepEqual(carte.lignes.map((ligne) => ligne.apres), ['disabled', 'state : hover, focus']);
  // Aujourd'hui dit l'absence, en puce et non en chemin.
  assert.deepEqual(carte.lignes.map((ligne) => [ligne.avant, ligne.absence]), [['aucune règle', true], ['aucune règle', true]]);
  assert.deepEqual(carte.lignes.map((ligne) => ligne.id), ['regles:ajouter:jeu-Button:disabled', 'regles:ajouter:jeu-Button:state']);
});

test('le constat par valeur se lit au pluriel ou au singulier', () => {
  const lire = (valeurs: string) => {
    const { correction: _sans, ...nu } = sansValeur;
    return carteDAFaire({ ...nu, faits: { ...nu.faits, valeurs } }, { composant: 'Button', variants: [], layers: new Map() });
  };
  assert.equal(lire('hover, focus').phrase, 'Les valeurs hover, focus de `state` n’ont pas de règle.');
  assert.equal(lire('hover').phrase, 'La valeur hover de `state` n’a pas de règle.');
  assert.equal(lire('hover, focus').statut, 'Ajoutez leurs règles @prop');
  assert.equal(lire('hover').statut, 'Ajoutez sa règle @prop');
});
