import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

import { creerChevron } from '../src/ui/Chevron';
import { createFeuille } from '../src/ui/Feuille';

// Le retrait du DOM attend 220 ms : les tests avancent l'horloge au lieu d'attendre.
mock.timers.enable({ apis: ['setTimeout'] });
const REPLI_DE_SORTIE_MS = 220;

class ElementDeTest extends EventTarget {
  children: ElementDeTest[] = [];
  attributs = new Map<string, string>();
  className = '';
  classes = new Set<string>();
  classList = {
    add: (...noms: string[]) => noms.forEach((nom) => this.classes.add(nom)),
    contains: (nom: string) => this.classes.has(nom),
  };
  textContent = '';
  type = '';
  hidden = false;
  inert = false;
  tabIndex = 0;
  disabled = false;
  onclick: ((event: Event) => void) | null = null;
  parent: ElementDeTest | null = null;
  tagName: string;
  espace: string | null = null;
  get parentElement(): ElementDeTest | null { return this.parent; }
  get isConnected(): boolean { return this === documentDeTest.body || this.parent?.isConnected === true; }

  constructor(tagName = 'div', espace: string | null = null) { super(); this.tagName = tagName; this.espace = espace; }
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
  createElementNS: (espace: string, tagName: string) => new ElementDeTest(tagName, espace),
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
  const retour = dialogue.children[0].children[0];
  const fermer = dialogue.children[0].children[2];
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
  assert.equal(documentDeTest.activeElement, declencheur);
  assert.equal(fermetures, 1);
  mock.timers.tick(REPLI_DE_SORTIE_MS);
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
  mock.timers.tick(REPLI_DE_SORTIE_MS);
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

test('[UI-45] la feuille n’a plus de poignée et son retour porte un chevron nommé', () => {
  documentDeTest.body.children = [];
  const feuille = createFeuille({
    titre: 'Terme',
    retour: () => {},
    corps: corps(),
    pied: pied(),
    onFermer: () => {},
    libelles: { retour: 'Back' },
  });
  const dialogue = (feuille.element as unknown as ElementDeTest).children[0];
  const classes = (element: ElementDeTest): string[] => [element.className, ...element.children.flatMap(classes)];
  assert.equal(classes(dialogue).includes('feuille-poignee'), false);
  assert.equal(dialogue.children.length, 3);

  const retour = dialogue.children[0].children[0];
  assert.equal(retour.textContent, '');
  assert.equal(retour.getAttribute('aria-label'), 'Back');
  const chevron = retour.children[0];
  assert.equal(chevron.getAttribute('class'), 'chevron-svg');
  assert.equal(chevron.classList.contains('retour'), true);
  assert.equal(dialogue.children[0].children[2].textContent, '×');
  feuille.fermer();
  mock.timers.tick(REPLI_DE_SORTIE_MS);
});

test('[UI-45] fermer() appelle onFermer et rend le focus tout de suite ; le DOM attend le minuteur de repli', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  let fermetures = 0;
  const feuille = createFeuille({ titre: 'Terme', corps: corps(), pied: pied(), onFermer: () => fermetures++ });
  const voile = feuille.element as unknown as ElementDeTest;

  feuille.fermer();
  assert.equal(fermetures, 1);
  assert.equal(documentDeTest.activeElement, declencheur);
  assert.equal(voile.classList.contains('sortante'), true);
  assert.equal(voile.inert, true);
  assert.equal(voile.isConnected, true);
  assert.equal(focusListeners.size, 0);

  mock.timers.tick(REPLI_DE_SORTIE_MS - 1);
  assert.equal(voile.isConnected, true);
  mock.timers.tick(1);
  assert.equal(voile.isConnected, false);
  assert.deepEqual(documentDeTest.body.children, [declencheur]);
});

test('[UI-45] la fin de l’animation de la feuille retire le voile avant le minuteur', () => {
  documentDeTest.body.children = [];
  const feuille = createFeuille({ titre: 'Terme', corps: corps(), pied: pied(), onFermer: () => {} });
  const voile = feuille.element as unknown as ElementDeTest;
  feuille.fermer();
  voile.children[0].dispatchEvent(new Event('animationend'));
  assert.equal(voile.isConnected, false);
  mock.timers.tick(REPLI_DE_SORTIE_MS);
});

test('[UI-45] une feuille ouverte pendant la sortie d’une autre reste seule à garder le focus', () => {
  documentDeTest.body.children = [];
  const declencheur = new ElementDeTest('button');
  documentDeTest.body.appendChild(declencheur);
  declencheur.focus();
  const premiere = createFeuille({ titre: 'Avant', corps: corps(), pied: pied(), onFermer: () => {} });
  let fermetures = 0;
  premiere.fermer();
  const seconde = createFeuille({ titre: 'Après', corps: corps(), pied: pied(), onFermer: () => fermetures++ });
  const croixSeconde = documentDeTest.activeElement!;
  assert.equal((seconde.element as unknown as ElementDeTest).contains(croixSeconde), true);
  assert.equal(focusListeners.size, 1);

  // Le focus qui sort de la seconde revient dans la seconde, jamais dans la première.
  declencheur.focus();
  assert.equal(documentDeTest.activeElement, croixSeconde);

  mock.timers.tick(REPLI_DE_SORTIE_MS);
  assert.equal(premiere.element.isConnected, false);
  assert.equal(seconde.element.isConnected, true);
  assert.equal(documentDeTest.activeElement, croixSeconde);
  assert.equal(fermetures, 0);

  seconde.fermer();
  assert.equal(documentDeTest.activeElement, declencheur);
  mock.timers.tick(REPLI_DE_SORTIE_MS);
  assert.deepEqual(documentDeTest.body.children, [declencheur]);
});

test('le chevron est un SVG décoratif de 12 px, posé par setAttribute', () => {
  const chevron = creerChevron() as unknown as ElementDeTest;
  assert.equal(chevron.espace, 'http://www.w3.org/2000/svg');
  assert.equal(chevron.getAttribute('class'), 'chevron-svg');
  assert.equal(chevron.getAttribute('aria-hidden'), 'true');
  assert.equal(chevron.getAttribute('viewBox'), '0 0 12 12');
  assert.equal(chevron.getAttribute('width'), '12');
  assert.equal(chevron.getAttribute('height'), '12');
  assert.equal(chevron.children[0].getAttribute('d'), 'M3 4.5 6 7.5 9 4.5');
  assert.equal(chevron.classList.contains('retour'), false);
  for (const sens of ['ouvert', 'suivant', 'retour'] as const) {
    assert.equal((creerChevron(sens) as unknown as ElementDeTest).classList.contains(sens), true);
  }
});
