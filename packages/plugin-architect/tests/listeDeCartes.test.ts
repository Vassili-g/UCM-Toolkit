/** La liste virtuelle de cartes dépliables : nœuds bornés, état et focus rendus quand une carte revient. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { creerListeDeCartes } from '../src/ui/virtualisation';
import { comme, type ElementDeTest, poserLeDom } from './domDeTest';

interface EtatDeCarte {
  deplie: boolean;
  coche: boolean;
}

const HAUTEUR = 40;
const HAUTEUR_DEPLIEE = 120;

function monter(total: number) {
  poserLeDom();
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { escape: (texte: string) => texte } });
  const images: Array<() => void> = [];
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (image: () => void) => images.push(image) });
  const creer = (balise: string): ElementDeTest => comme(document.createElement(balise));
  const liste = creerListeDeCartes<EtatDeCarte>(HAUTEUR, 'list', (carte) => {
    const element = comme(carte);
    return { deplie: element.getAttribute('aria-expanded') === 'true', coche: element.querySelector('input')?.checked ?? false };
  });
  const element = comme(liste.element);
  Object.assign(element, { scrollTop: 0, clientHeight: 400 });
  Object.assign(element.children[0], { offsetTop: 0 });
  let rendus = 0;
  const cles = Array.from({ length: total }, (_vide, rang) => `carte-${rang}`);
  liste.poser(cles, (rang, etat) => {
    rendus += 1;
    const carte = creer('div');
    carte.setAttribute('aria-expanded', String(etat?.deplie ?? false));
    carte.setAttribute('data-rang', String(rang));
    Object.defineProperty(carte, 'offsetHeight', { get: () => (carte.getAttribute('aria-expanded') === 'true' ? HAUTEUR_DEPLIEE : HAUTEUR) });
    const case_ = creer('input');
    case_.type = 'checkbox';
    case_.checked = etat?.coche ?? false;
    const bouton = creer('button');
    bouton.setAttribute('data-focus', 'plier');
    bouton.dataset.focus = 'plier';
    carte.append(case_, bouton);
    return carte as unknown as HTMLElement;
  });
  const defiler = (haut: number) => {
    element.scrollTop = haut;
    element.dispatchEvent(new Event('scroll'));
    images.splice(0).forEach((image) => image());
  };
  const carte = (rang: number) => element.querySelector(`[data-rang="${rang}"]`);
  return { liste, element, defiler, carte, rendus: () => rendus };
}

test('2 000 cartes ne créent qu’une portion de nœuds, au sommet comme au milieu de la liste', () => {
  const { liste, defiler, element } = monter(2000);
  const borne = Math.ceil(400 / HAUTEUR) + 2 * 8 + 1;
  assert.ok(liste.rendues() > 0 && liste.rendues() <= borne, `${liste.rendues()} cartes rendues`);
  defiler(HAUTEUR * 1000);
  assert.ok(liste.rendues() <= borne, `${liste.rendues()} cartes rendues au milieu`);
  assert.equal(element.querySelectorAll('input').length, liste.rendues());
});

test('une carte dépliée qui sort puis revient garde son état déplié', () => {
  const { liste, defiler, carte } = monter(2000);
  carte(2)?.setAttribute('aria-expanded', 'true');
  defiler(HAUTEUR * 1000);
  assert.equal(carte(2), null);
  defiler(0);
  assert.equal(carte(2)?.getAttribute('aria-expanded'), 'true');
  assert.ok(liste.rendues() > 0);
});

test('une case cochée garde son état quand la carte revient', () => {
  const { defiler, carte } = monter(2000);
  carte(3)!.querySelector('input')!.clic();
  defiler(HAUTEUR * 1000);
  defiler(0);
  assert.equal(carte(3)!.querySelector('input')!.checked, true);
  assert.equal(carte(4)!.querySelector('input')!.checked, false);
});

test('une carte qui reste visible n’est pas recréée et garde le focus', () => {
  const { defiler, carte, rendus } = monter(2000);
  carte(1)!.querySelector('button')!.focus();
  const avant = rendus();
  defiler(HAUTEUR * 2);
  assert.equal(document.activeElement, carte(1)!.querySelector('button'));
  assert.ok(rendus() - avant < 6, 'seules les cartes entrantes sont rendues');
});

test('le focus d’une carte qui sort est rendu à la même carte quand elle revient', () => {
  const { defiler, carte } = monter(2000);
  carte(0)!.querySelector('button')!.focus();
  defiler(HAUTEUR * 1000);
  assert.equal(carte(0), null);
  defiler(0);
  assert.equal(document.activeElement, carte(0)!.querySelector('button'));
});

test('la hauteur mesurée d’une carte dépliée décale celles qui la suivent', () => {
  const { carte, element, defiler } = monter(100);
  carte(0)?.setAttribute('aria-expanded', 'true');
  defiler(0);
  defiler(1200);
  // première carte visible : rang 28 ; marge de 8 ; la carte 0 mesure 120, les 19 autres 40
  assert.equal(element.children[0].style.paddingTop, `${HAUTEUR_DEPLIEE + 19 * HAUTEUR}px`);
});
