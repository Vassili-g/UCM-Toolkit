/** Les transitions des onglets s'exercent sur un DOM réduit, sans navigateur. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createOnglets } from '../src/ui/Onglets';

class ElementDeTest extends EventTarget {
  children: ElementDeTest[] = [];
  attributs = new Map<string, string>();
  disabled = false;
  hidden = false;
  tabIndex = 0;
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  getAttribute(nom: string): string | null { return this.attributs.get(nom) ?? null; }
  appendChild(enfant: ElementDeTest): void { this.children.push(enfant); }
  focus(): void { documentDeTest.activeElement = this; }
}

const documentDeTest = {
  activeElement: null as ElementDeTest | null,
  createElement: () => new ElementDeTest(),
};
Object.defineProperty(globalThis, 'document', { configurable: true, value: documentDeTest });

function creer() {
  documentDeTest.activeElement = null;
  const ids = ['creation', 'verification', 'harmonisation', 'gestion'] as const;
  const panneaux = ids.map(() => new ElementDeTest());
  const selections: string[] = [];
  const ui = createOnglets('Navigation', ids.map((id, index) => ({
    id, libelle: id, panneau: panneaux[index] as unknown as HTMLElement,
  })), (id) => selections.push(id));
  const liste = ui.liste as unknown as ElementDeTest;
  function touche(key: string) {
    const evenement = Object.assign(new Event('keydown', { cancelable: true }), { key });
    liste.dispatchEvent(evenement);
    return evenement.defaultPrevented;
  }
  return { ui, boutons: liste.children, panneaux, selections, touche };
}

test('[UI-45] un onglet indisponible ne s’active ni au clic, ni aux flèches, ni par programme', () => {
  const { ui, boutons, panneaux, selections, touche } = creer();
  ui.definirDisponible('verification', false);
  assert.equal(boutons[1].disabled, true);
  assert.equal(boutons[1].getAttribute('aria-disabled'), 'true');
  assert.equal(boutons[1].tabIndex, -1);
  boutons[1].dispatchEvent(new Event('click'));
  ui.selectionner('verification');
  assert.equal(ui.actif(), 'creation');
  assert.deepEqual(selections, ['creation']);
  assert.equal(touche('ArrowRight'), true);
  assert.equal(ui.actif(), 'harmonisation');
  assert.equal(documentDeTest.activeElement, boutons[2]);
  assert.deepEqual(panneaux.map((panneau) => panneau.hidden), [true, true, false, true]);
  touche('ArrowLeft');
  assert.equal(ui.actif(), 'creation');
  assert.equal(documentDeTest.activeElement, boutons[0]);
});

test('[UI-45] Début, Fin et les flèches bouclent sur les seuls onglets disponibles', () => {
  const { ui, boutons, touche } = creer();
  ui.definirDisponible('creation', false);
  ui.definirDisponible('gestion', false);
  touche('End');
  assert.equal(ui.actif(), 'harmonisation');
  touche('ArrowRight');
  assert.equal(ui.actif(), 'verification');
  touche('ArrowLeft');
  assert.equal(ui.actif(), 'harmonisation');
  touche('Home');
  assert.equal(ui.actif(), 'verification');
  assert.equal(documentDeTest.activeElement, boutons[1]);
  assert.equal(touche('Tab'), false);
});

test('[UI-45] rendre l’onglet actif indisponible sélectionne le premier disponible et y reporte son focus', () => {
  const { ui, boutons, panneaux, selections } = creer();
  ui.selectionner('gestion');
  boutons[3].focus();
  ui.definirDisponible('creation', false);
  assert.equal(ui.actif(), 'gestion');
  ui.definirDisponible('gestion', false);
  assert.equal(ui.actif(), 'verification');
  assert.deepEqual(selections, ['creation', 'gestion', 'verification']);
  assert.equal(documentDeTest.activeElement, boutons[1]);
  assert.deepEqual(boutons.map((bouton) => bouton.tabIndex), [-1, 0, -1, -1]);
  assert.deepEqual(boutons.map((bouton) => bouton.getAttribute('aria-selected')), ['false', 'true', 'false', 'false']);
  assert.deepEqual(panneaux.map((panneau) => panneau.hidden), [true, false, true, true]);
});

test('[UI-45] le repli conserve le focus extérieur et réactiver un onglet conserve la sélection', () => {
  const { ui, boutons, selections } = creer();
  const saisie = new ElementDeTest();
  saisie.focus();
  ui.definirDisponible('creation', false);
  assert.equal(ui.actif(), 'verification');
  assert.equal(documentDeTest.activeElement, saisie);
  ui.definirDisponible('creation', true);
  ui.definirDisponible('creation', true);
  assert.equal(ui.actif(), 'verification');
  assert.equal(boutons[0].disabled, false);
  assert.equal(boutons[0].getAttribute('aria-disabled'), 'false');
  assert.equal(boutons[0].tabIndex, -1);
  assert.deepEqual(selections, ['creation', 'verification']);
  boutons[0].dispatchEvent(new Event('click'));
  assert.equal(ui.actif(), 'creation');
});

test('[UI-45] sans onglet disponible, aucun panneau ne reste actif ; une réactivation rétablit la sélection', () => {
  const { ui, boutons, panneaux, selections, touche } = creer();
  ui.definirDisponible('verification', false);
  ui.definirDisponible('harmonisation', false);
  ui.definirDisponible('gestion', false);
  ui.definirDisponible('creation', false);
  assert.equal(ui.actif(), undefined);
  assert.ok(panneaux.every((panneau) => panneau.hidden));
  assert.ok(boutons.every((bouton) => bouton.tabIndex === -1 && bouton.getAttribute('aria-selected') === 'false'));
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) touche(key);
  ui.selectionner('creation');
  assert.equal(ui.actif(), undefined);
  assert.deepEqual(selections, ['creation']);
  ui.definirDisponible('gestion', true);
  assert.equal(ui.actif(), 'gestion');
  assert.deepEqual(selections, ['creation', 'gestion']);
  assert.equal(boutons[3].tabIndex, 0);
  assert.equal(panneaux[3].hidden, false);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    touche(key);
    assert.equal(ui.actif(), 'gestion');
  }
});

test('[UI-45] une liste vide et un identifiant inconnu ne créent aucune sélection', () => {
  const selections: string[] = [];
  const ui = createOnglets<string>('Navigation', [], (id) => selections.push(id));
  ui.selectionner('absent');
  ui.definirDisponible('absent', true);
  assert.equal(ui.actif(), undefined);
  assert.deepEqual(selections, []);
});
