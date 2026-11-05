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

test('E10a : chaque écart d’une règle a sa propre phrase, et aucun ne dit qu’une propriété manque de règle', () => {
  const lire = (faits: Constat['faits']) => carteDAFaire({ id: 'regles:C45:x', code: 'C45', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: { composant: 'Button', ...faits } }, { composant: 'Button', variants: [], layers: new Map() });
  const renommee = lire({ propriete: 'show_icon', regle: 'show_icn', ecart: 'regle-renommee' });
  assert.equal(renommee.phrase, 'La règle `show_icn` ressemble à la propriété `show_icon`.');
  assert.equal(renommee.statut, 'Renommez la règle en show_icon');
  assert.equal(lire({ propriete: 'Size', regle: 'size.xxl', ecart: 'valeur-inconnue' }).phrase, 'La règle `size.xxl` vise une valeur que `Size` n’a pas.');
  assert.equal(lire({ regle: 'Size', ecart: 'sans-propriete', surUnAxe: 1 }).phrase, '`Size` est un axe de variants. Une règle @boolean ne le pilote pas.');
  assert.equal(lire({ regle: '', ecart: 'sans-propriete', regles: 2 }).phrase, 'Une règle de l’instance de règles ne nomme aucune propriété.');
});
