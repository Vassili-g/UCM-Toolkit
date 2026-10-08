/**
 * Le nuancier des palettes : ordre, aplats, point d'état, carte atténuée, rappel
 * au clic et nom accessible. Les tests de l'unité tournent sans navigateur : un
 * DOM réduit à ce que le composant touche tient lieu de `document`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ancrageDe, grilleDe, rampeDe, rampesDe, recetteParDefaut, type Palette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { creerLocalisation } from '../src/ui/localisation';
import { aplatsDeLaCarte, creerVuesNuancierDesPalettes } from '../src/ui/nuancierDesPalettes';

class Noeud {
  children: Noeud[] = [];
  attributs = new Map<string, string>();
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  classes = new Set<string>();
  ecouteurs = new Map<string, (() => void)[]>();
  childNodes: Noeud[] = [];
  parentNode: Noeud | null = null;
  textContent = '';
  title = '';
  type = '';
  className = '';
  classList = { add: (nom: string) => { this.classes.add(nom); } };
  constructor(readonly balise: string) {}
  append(...enfants: Noeud[]): void { this.children.push(...enfants); }
  replaceChildren(...enfants: Noeud[]): void { this.children = [...enfants]; }
  setAttribute(nom: string, valeur: string): void { this.attributs.set(nom, valeur); }
  getAttribute(nom: string): string | null { return this.attributs.get(nom) ?? null; }
  addEventListener(type: string, ecouteur: () => void): void { this.ecouteurs.set(type, [...(this.ecouteurs.get(type) ?? []), ecouteur]); }
  clic(): void { for (const ecouteur of this.ecouteurs.get('click') ?? []) ecouteur(); }
  querySelectorAll(): Noeud[] { return []; }
  a(classe: string): boolean { return this.className.split(' ').includes(classe) || this.classes.has(classe); }
}

const monde = globalThis as unknown as Record<string, unknown>;
monde.document = { createElement: (balise: string) => new Noeud(balise), documentElement: new Noeud('html') };
monde.MutationObserver = class { observe(): void {} };

const RECETTE_VIDE = recetteParDefaut();
const DEUX = nouvellePalette(RECETTE_VIDE, 'p-0000000a', '#1E6FD9', 2)!;
const UNE = { ...nouvellePalette(RECETTE_VIDE, 'p-0000000b', '#D94F1E', 1)!, nom: 'Orange' };
const FIGEE: Palette = {
  ...UNE,
  id: 'p-0000000c',
  nom: 'Un nom de palette bien trop long pour la carte',
  reference: '#336699',
  crans: [100, 300, 500],
  figees: { light: ['#EEEEEE', '#336699', '#112233'] },
};
const RECETTE = ajouter(ajouter(ajouter(RECETTE_VIDE, DEUX), UNE), FIGEE);

const i18n = creerLocalisation('fr');
const { nuancierDesPalettes } = creerVuesNuancierDesPalettes(i18n);

function cartes(nuancier: { element: unknown }): Noeud[] {
  return (nuancier.element as Noeud).children;
}

test('les cartes suivent l’ordre donné, une par palette', () => {
  const ouverts: string[] = [];
  const nuancier = nuancierDesPalettes((id) => ouverts.push(id));
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: UNE }, { palette: DEUX }, { palette: FIGEE }] });
  assert.deepEqual(cartes(nuancier).map((carte) => carte.dataset.palette), [UNE.id, DEUX.id, FIGEE.id]);
  const conteneur = nuancier.element;
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: FIGEE }, { palette: UNE }] });
  assert.equal(nuancier.element, conteneur, 'le conteneur n’est pas recréé');
  assert.deepEqual(cartes(nuancier).map((carte) => carte.dataset.palette), [FIGEE.id, UNE.id]);
});

test('une palette à une intensité montre les nuances 200, d’ancrage et 800 de sa rampe unique, en Light', () => {
  const rampe = rampeDe(rampesDe(RECETTE, UNE), 'unique').light;
  const { crans } = grilleDe(RECETTE, UNE);
  const ancrage = ancrageDe(RECETTE, UNE).rangs.light;
  assert.deepEqual(aplatsDeLaCarte(RECETTE, UNE), [rampe[crans.indexOf(200)].hexa, rampe[ancrage].hexa, rampe[crans.indexOf(800)].hexa]);
  const nuancier = nuancierDesPalettes(() => {});
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: UNE }] });
  assert.deepEqual(cartes(nuancier)[0].children.slice(0, 3).map((aplat) => aplat.style.background.toUpperCase()), aplatsDeLaCarte(RECETTE, UNE).map((hexa) => hexa.toUpperCase()));
});

test('une palette à deux intensités prend la rampe Vivid', () => {
  const rampe = rampeDe(rampesDe(RECETTE, DEUX), 'vivid').light;
  const { crans } = grilleDe(RECETTE, DEUX);
  const ancrage = ancrageDe(RECETTE, DEUX).rangs.light;
  assert.deepEqual(aplatsDeLaCarte(RECETTE, DEUX), [rampe[crans.indexOf(200)].hexa, rampe[ancrage].hexa, rampe[crans.indexOf(800)].hexa]);
  const soft = rampeDe(rampesDe(RECETTE, DEUX), 'soft').light;
  assert.notEqual(aplatsDeLaCarte(RECETTE, DEUX)[0], soft[crans.indexOf(200)].hexa, 'Vivid et Soft diffèrent à la nuance 200');
});

test('une palette figée lit ses couleurs figées ; sans 200 ni 800, la deuxième et l’avant-dernière', () => {
  const [a, b, c] = aplatsDeLaCarte(RECETTE, FIGEE).map((hexa) => hexa.toUpperCase());
  assert.equal(b, '#336699', 'l’ancrage est la référence figée');
  assert.equal(a, '#336699', 'la deuxième nuance, faute de 200');
  assert.equal(c, '#336699', 'l’avant-dernière nuance, faute de 800');
  const quatre: Palette = { ...FIGEE, crans: [100, 300, 500, 900], figees: { light: ['#111111', '#222222', '#333333', '#444444'] }, reference: '#444444' };
  assert.deepEqual(aplatsDeLaCarte(RECETTE, quatre).map((hexa) => hexa.toUpperCase()), ['#222222', '#444444', '#333333']);
});

test('le point d’état pose la couleur de l’état à droite du nom', () => {
  const nuancier = nuancierDesPalettes(() => {});
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: UNE, etat: 'rouge' }, { palette: DEUX, etat: 'ambre' }, { palette: FIGEE }] });
  const [rouge, ambre, sans] = cartes(nuancier);
  const bande = (carte: Noeud) => carte.children[3];
  assert.equal(bande(rouge).children[1].dataset.etat, 'rouge');
  assert.equal(bande(ambre).children[1].dataset.etat, 'ambre');
  assert.equal(bande(sans).children.length, 1, 'sans état, le nom seul');
  assert.equal(bande(rouge).children[0].textContent, 'Orange');
});

test('une carte atténuée porte la classe qui l’atténue et reste cliquable', () => {
  const ouverts: string[] = [];
  const nuancier = nuancierDesPalettes((id) => ouverts.push(id));
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: UNE, attenuee: true }, { palette: DEUX }] });
  const [eteinte, normale] = cartes(nuancier);
  assert.equal(eteinte.a('attenuee'), true);
  assert.equal(normale.a('attenuee'), false);
  eteinte.clic();
  assert.deepEqual(ouverts, [UNE.id]);
});

test('le clic rappelle ouvrir avec l’identifiant de la palette', () => {
  const ouverts: string[] = [];
  const nuancier = nuancierDesPalettes((id) => ouverts.push(id));
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: DEUX }, { palette: UNE }] });
  cartes(nuancier)[1].clic();
  cartes(nuancier)[0].clic();
  assert.deepEqual(ouverts, [UNE.id, DEUX.id]);
});

test('chaque carte est un bouton dont le nom accessible dit la palette et son état, le nom entier en title', () => {
  const nuancier = nuancierDesPalettes(() => {});
  nuancier.afficher({ recette: RECETTE, palettes: [{ palette: UNE, etat: 'rouge' }, { palette: DEUX, etat: 'ambre' }, { palette: FIGEE }] });
  const [rouge, ambre, sans] = cartes(nuancier);
  for (const carte of [rouge, ambre, sans]) {
    assert.equal(carte.balise, 'button');
    assert.equal(carte.type, 'button');
  }
  assert.equal(rouge.getAttribute('aria-label'), 'Orange, à corriger');
  assert.equal(ambre.getAttribute('aria-label'), `${DEUX.reference}, à vérifier`);
  assert.equal(sans.getAttribute('aria-label'), FIGEE.nom);
  assert.equal(sans.title, FIGEE.nom);

  const anglais = creerLocalisation('en');
  const { nuancierDesPalettes: enAnglais } = creerVuesNuancierDesPalettes(anglais);
  const traduit = enAnglais(() => {});
  traduit.afficher({ recette: RECETTE, palettes: [{ palette: UNE, etat: 'rouge' }, { palette: UNE, etat: 'ambre' }] });
  assert.deepEqual(cartes(traduit).map((carte) => carte.getAttribute('aria-label')), ['Orange, to fix', 'Orange, to check']);
});
