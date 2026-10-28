/**
 * Le corps du mode Composant : la frontière suit la souris sur la fenêtre et finit au relâchement ou à la sortie de la fenêtre, les
 * bornes laissent 500 px à la vue et 640 px au panneau, et la Configuration prend la place de la vue, ou du panneau quand il est ouvert.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { poserLeDom, comme, ElementDeTest } from './domDeTest';

poserLeDom();

type Ecouteur = (evenement: unknown) => void;
const ecouteursDeLaFenetre = new Map<string, Ecouteur[]>();
const ecouteursDuDocument = new Map<string, Ecouteur[]>();
const ajouter = (table: Map<string, Ecouteur[]>) => (type: string, ecouteur: Ecouteur) => { table.set(type, [...(table.get(type) ?? []), ecouteur]); };
const retirer = (table: Map<string, Ecouteur[]>) => (type: string, ecouteur: Ecouteur) => { table.set(type, (table.get(type) ?? []).filter((autre) => autre !== ecouteur)); };
const emettre = (table: Map<string, Ecouteur[]>, type: string, evenement: object): void => { for (const ecouteur of [...(table.get(type) ?? [])]) ecouteur(evenement); };
Object.assign(globalThis, {
  window: { addEventListener: ajouter(ecouteursDeLaFenetre), removeEventListener: retirer(ecouteursDeLaFenetre) },
  MutationObserver: class { observe() {} disconnect() {} },
});
Object.assign((globalThis as unknown as { document: object }).document, {
  documentElement: new ElementDeTest('HTML'),
  addEventListener: ajouter(ecouteursDuDocument),
  removeEventListener: retirer(ecouteursDuDocument),
});

import { creerCorpsDuComposant } from '../src/ui/composant/corps';
import { etatInitial } from '../src/ui/etat';

function monter(largeurDuCorps = 1400) {
  const etat = etatInitial();
  etat.disposition = 'etroite';
  const largeurs: number[] = [];
  const app = {
    etat,
    poserLaLargeurDeLaVue(largeur: number) { largeurs.push(largeur); etat.panneau = { ...etat.panneau, largeurDeLaVue: largeur }; },
    rendre() {},
  };
  const vue = { element: new ElementDeTest('DIV'), mettreAJour() {} };
  vue.element.className = 'vc';
  const preparation = { element: new ElementDeTest('DIV'), panneau: new ElementDeTest('DIV'), ouvrir() {}, ouvrirPourColler() {}, recevoir() {}, retirerLesLiaisons() {} };
  const corps = creerCorpsDuComposant(app as never, vue as never, preparation as never);
  const element = comme(corps.element);
  Object.assign(element, { clientWidth: largeurDuCorps });
  etat.panneau = { ...etat.panneau, ouvert: true };
  corps.mettreAJour();
  const poignee = comme(element.children[1]);
  Object.assign(poignee, { offsetWidth: 7 });
  return { etat, corps, element, poignee, largeurs, vue };
}

const deplacement = (clientX: number, pointerId = 1) => ({ pointerId, clientX, relatedTarget: {} });

test('la frontière suit la souris sur la fenêtre, hors de la poignée, et finit au relâchement', () => {
  const { poignee, largeurs, etat } = monter();
  poignee.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { button: 0, pointerId: 1, clientX: 500 }));
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(540));
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(560));
  assert.deepEqual(largeurs, [540, 560]);
  emettre(ecouteursDeLaFenetre, 'pointerup', deplacement(560));
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(600));
  assert.deepEqual(largeurs, [540, 560]);
  assert.equal(etat.panneau.largeurDeLaVue, 560);
});

test('la frontière finit quand la souris sort de la fenêtre', () => {
  const { poignee, largeurs } = monter();
  poignee.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { button: 0, pointerId: 1, clientX: 500 }));
  emettre(ecouteursDuDocument, 'pointerout', { pointerId: 1, relatedTarget: null });
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(600));
  assert.deepEqual(largeurs, []);
});

test('la vue garde 500 px et le panneau 640 px, même quand la fenêtre ne laisse aucune marge', () => {
  const { poignee, largeurs } = monter(1400);
  poignee.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { button: 0, pointerId: 1, clientX: 500 }));
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(100));
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(900));
  emettre(ecouteursDeLaFenetre, 'pointerup', deplacement(900));
  assert.deepEqual(largeurs, [500, 1400 - 7 - 640]);
  const serre = monter(1144);
  serre.poignee.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { button: 0, pointerId: 1, clientX: 500 }));
  emettre(ecouteursDeLaFenetre, 'pointermove', deplacement(900));
  emettre(ecouteursDeLaFenetre, 'pointerup', deplacement(900));
  assert.deepEqual(serre.largeurs, [500]);
});

test('la Configuration prend la place de la vue panneau fermé, du panneau panneau ouvert, et rend chaque place ensuite', () => {
  const { etat, corps, element, vue } = monter();
  const hote = new ElementDeTest('DIV');
  const zone = comme(element.children[0]);
  const panneau = comme(element.children[2]);
  assert.equal(zone.contains(hote), false);

  corps.poserConfiguration(hote as never);
  assert.equal(panneau.contains(hote), true, 'panneau ouvert : dans le panneau');
  assert.equal(vue.element.style.display, '', 'la vue reste affichée');

  etat.panneau = { ...etat.panneau, ouvert: false };
  corps.mettreAJour();
  assert.equal(zone.contains(hote), true, 'panneau fermé : dans la zone de la vue');
  assert.equal(vue.element.style.display, 'none');
  assert.equal(element.children.length, 1);

  corps.poserConfiguration(null);
  assert.equal(vue.element.style.display, '');
  assert.equal(zone.classes.has('panneau-lateral'), false);
});
