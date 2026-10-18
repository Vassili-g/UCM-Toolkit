import assert from 'node:assert/strict';
import test from 'node:test';

import { createFeuille } from '../src/ui/Feuille';

class ElementDeTest extends EventTarget {
  children: ElementDeTest[] = [];
  attributs = new Map<string, string>();
  className = '';
  textContent = '';
  type = '';
  hidden = false;
  inert = false;
  tabIndex = 0;
  disabled = false;
  onclick: ((event: Event) => void) | null = null;
  parent: ElementDeTest | null = null;
  tagName: string;
  get parentElement(): ElementDeTest | null { return this.parent; }
  get isConnected(): boolean { return this === documentDeTest.body || this.parent?.isConnected === true; }

  constructor(tagName = 'div') { super(); this.tagName = tagName; }
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  getAttribute(nom: string): string | null { return this.attributs.get(nom) ?? null; }
  append(...enfants: ElementDeTest[]): void { enfants.forEach((enfant) => this.appendChild(enfant)); }
  appendChild(enfant: ElementDeTest): void { enfant.parent = this; this.children.push(enfant); }
  replaceChildren(...enfants: ElementDeTest[]): void { this.children = []; this.append(...enfants); }
  remove(): void { this.parent?.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  focus(): void { documentDeTest.activeElement = this; documentDeTest.focusFrom(this); }
  contains(cible: unknown): boolean {
    return this === cible || this.children.some((enfant) => enfant.contains(cible));
  }
  querySelectorAll<T extends Element>(selecteur: string): NodeListOf<T> {
    const elements: ElementDeTest[] = [];
    const visiter = (parent: ElementDeTest) => parent.children.forEach((enfant) => {
      if (enfant.tagName === 'button' && !enfant.disabled && !enfant.hidden) elements.push(enfant);
      visiter(enfant);
    });
    visiter(this);
    return elements as unknown as NodeListOf<T>;
  }
}

const corps = () => new ElementDeTest('div') as unknown as HTMLElement;
const pied = () => new ElementDeTest('footer') as unknown as HTMLElement;
const focusListeners = new Set<(event: FocusEvent) => void>();
const documentDeTest = {
  activeElement: null as ElementDeTest | null,
  body: new ElementDeTest('body'),
  createElement: (tagName: string) => new ElementDeTest(tagName),
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
    if (type === 'focusin' && typeof listener === 'function') focusListeners.add(listener as (event: FocusEvent) => void);
  },
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
    if (type === 'focusin' && typeof listener === 'function') focusListeners.delete(listener as (event: FocusEvent) => void);
  },
  focusFrom: (target: ElementDeTest) => {
    for (const listener of [...focusListeners]) listener({ target } as unknown as FocusEvent);
  },
};
Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: ElementDeTest });
Object.defineProperty(globalThis, 'document', { configurable: true, value: documentDeTest as unknown as Document });

test('[UI-45] la feuille ouvre le focus, remplace son étape et revient à son déclencheur', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  let fermetures = 0;
  const feuille = createFeuille({ titre: 'Terme', corps: corps(), pied: pied(), onFermer: () => fermetures++ });
  assert.equal(documentDeTest.body.children[1], feuille.element);
  const dialogue = feuille.element.children[0];
  assert.equal(dialogue.getAttribute('role'), 'dialog');
  assert.equal(dialogue.getAttribute('aria-modal'), 'true');
  assert.equal(documentDeTest.activeElement?.getAttribute('aria-label'), 'Fermer');

  let retours = 0;
  feuille.remplacer({
    titre: 'Remplacer par',
    retour: () => retours++,
    corps: corps(),
    pied: pied(),
    libelles: { retour: 'Back', fermer: 'Close' },
  });
  const retour = dialogue.children[1].children[0];
  const fermer = dialogue.children[1].children[2];
  assert.equal(retour.getAttribute('aria-label'), 'Back');
  assert.equal(fermer.getAttribute('aria-label'), 'Close');
  retour.dispatchEvent(new Event('click'));
  assert.equal(retours, 1);
  assert.equal(documentDeTest.activeElement, retour);

  feuille.remplacer({ titre: 'Étape suivante', retour: () => retours++, corps: corps(), pied: pied() });
  assert.equal(retour.getAttribute('aria-label'), 'Back');
  assert.equal(fermer.getAttribute('aria-label'), 'Close');

  const escape = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
  feuille.element.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, true);
  assert.deepEqual(documentDeTest.body.children, [declencheur]);
  assert.equal(documentDeTest.activeElement, declencheur);
  assert.equal(fermetures, 1);
  feuille.fermer();
  assert.equal(fermetures, 1);
});

test('[UI-45] un clic sur le voile ferme la feuille', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  let fermetures = 0;
  const feuille = createFeuille({ titre: 'Terme', corps: corps(), pied: pied(), onFermer: () => fermetures++ });
  feuille.element.dispatchEvent(new Event('click'));
  assert.deepEqual(documentDeTest.body.children, [declencheur]);
  assert.equal(documentDeTest.activeElement, declencheur);
  assert.equal(fermetures, 1);
});

test('[UI-45] Maj+Tab depuis le premier contrôle reste dans la feuille', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  const action = new ElementDeTest('button');
  const contenu = corps() as unknown as ElementDeTest;
  contenu.appendChild(action);
  const feuille = createFeuille({ titre: 'Terme', corps: contenu as unknown as HTMLElement, pied: pied(), onFermer: () => {} });
  const premier = documentDeTest.activeElement;
  const evenement = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab', shiftKey: true });
  feuille.element.dispatchEvent(evenement);
  assert.equal(evenement.defaultPrevented, true);
  assert.equal(documentDeTest.activeElement, action);
  assert.notEqual(documentDeTest.activeElement, declencheur);
  assert.notEqual(documentDeTest.activeElement, premier);
  feuille.fermer();
});

test('[UI-45] le focus programmatique extérieur revient dans la feuille et ignore les ancêtres masqués ou inertes', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  const contenu = corps() as unknown as ElementDeTest;
  const cache = new ElementDeTest('div');
  cache.hidden = true;
  const boutonCache = new ElementDeTest('button');
  cache.appendChild(boutonCache);
  const inerte = new ElementDeTest('div');
  inerte.inert = true;
  const boutonInerte = new ElementDeTest('button');
  inerte.appendChild(boutonInerte);
  const boutonVisible = new ElementDeTest('button');
  contenu.append(cache, inerte, boutonVisible);

  const feuille = createFeuille({ titre: 'Terme', corps: contenu as unknown as HTMLElement, pied: pied(), onFermer: () => {} });
  const focusInitial = documentDeTest.activeElement;
  const exterieur = new ElementDeTest('button');
  documentDeTest.body.appendChild(exterieur);
  exterieur.focus();
  assert.equal(documentDeTest.activeElement, focusInitial);

  const shiftTab = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab', shiftKey: true });
  feuille.element.dispatchEvent(shiftTab);
  assert.equal(documentDeTest.activeElement, boutonVisible);
  assert.notEqual(documentDeTest.activeElement, boutonCache);
  assert.notEqual(documentDeTest.activeElement, boutonInerte);
  feuille.fermer();
});

test('[UI-45] la fermeture ne rend pas le focus à un déclencheur détaché', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  const feuille = createFeuille({ titre: 'Terme', corps: corps(), pied: pied(), onFermer: () => {} });
  declencheur.remove();
  feuille.fermer();
  assert.notEqual(documentDeTest.activeElement, declencheur);
});

test('[UI-45] Tab boucle au premier contrôle ; seul le voile ou la croix ferment', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  const contenu = new ElementDeTest('div');
  const dernier = new ElementDeTest('button');
  const horsTabulation = new ElementDeTest('button');
  horsTabulation.tabIndex = -1;
  contenu.append(dernier, horsTabulation);
  let fermetures = 0;
  const feuille = createFeuille({ titre: 'Terme', corps: contenu as unknown as HTMLElement, pied: pied(), onFermer: () => fermetures++ });
  const croix = documentDeTest.activeElement!;
  dernier.focus();
  const tab = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab', shiftKey: false });
  feuille.element.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, true);
  assert.equal(documentDeTest.activeElement, croix);
  const clicInterieur = new Event('click');
  Object.defineProperty(clicInterieur, 'target', { value: contenu });
  feuille.element.dispatchEvent(clicInterieur);
  assert.equal(fermetures, 0);
  croix.dispatchEvent(new Event('click'));
  assert.equal(fermetures, 1);
  assert.equal(documentDeTest.activeElement, declencheur);
});
