/** La garantie des courbes ([ENT-10]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { atteintLeSeuil, courbesParDefaut, garantieDesCourbes, recetteParDefaut, type Mode, type Recette, type TexteDesBoutons } from '../src/index';

type Texte = { light: TexteDesBoutons; dark: TexteDesBoutons };

/** Les quatre combinaisons de texte des boutons. */
const COMBINAISONS: readonly Texte[] = [
  { light: 'blanc', dark: 'noir' },
  { light: 'noir', dark: 'noir' },
  { light: 'blanc', dark: 'blanc' },
  { light: 'noir', dark: 'blanc' },
];

/** La recette par défaut, courbes comprises, dans le sens que donne chaque texte des boutons. */
function recetteDeTexte(texte: Texte): Recette {
  return { ...recetteParDefaut(), texteDesBoutons: texte, courbes: courbesParDefaut(11, texte) };
}

/** Une recette dont un cran d'une courbe prend la clarté donnée. */
function avecClarte(recette: Recette, mode: Mode, cran: number, clarte: number): Recette {
  const courbe = [...recette.courbes[mode]];
  courbe[recette.crans.indexOf(cran)] = clarte;
  return { ...recette, courbes: { ...recette.courbes, [mode]: courbe } };
}

const NORMAL = recetteDeTexte({ light: 'blanc', dark: 'noir' });
const decrire = (recette: Recette) =>
  garantieDesCourbes(recette).map(({ mode, cran, profil, contre }) => `${mode} ${cran} ${profil} ${contre}`);

test('[ENT-10] les courbes par défaut tiennent la garantie, dans les quatre combinaisons de texte des boutons', () => {
  for (const texte of COMBINAISONS) assert.deepEqual(garantieDesCourbes(recetteDeTexte(texte)), [], `${texte.light}/${texte.dark}`);
});

test('[ENT-10] un cran 700 clair remonté à 0,56 ne tient plus ni 4,5 contre le cran 50 ni 4,5 contre le texte des boutons', () => {
  const manques = garantieDesCourbes(avecClarte(NORMAL, 'light', 700, 0.56));
  assert.deepEqual(manques.map(({ mode, cran, profil, contre }) => `${mode} ${cran} ${profil} ${contre}`), [
    'light 700 soft cranLeger',
    'light 700 vivid cranLeger',
    'light 700 soft texteDesBoutons',
    'light 700 vivid texteDesBoutons',
  ]);
  for (const manque of manques) {
    assert.equal(manque.seuil, 4.5);
    assert.ok(manque.contraste < 4.5);
    assert.ok(!atteintLeSeuil(manque.contraste, manque.seuil));
    assert.ok(Number.isInteger(manque.teinte) && manque.teinte >= 0 && manque.teinte < 360);
  }
});

test('[ENT-10] un cran 600 sombre descendu vers le fond ne tient plus 3 : c’est le cran de page/focus', () => {
  const manques = garantieDesCourbes(avecClarte(NORMAL, 'dark', 600, 0.5));
  assert.deepEqual(manques.map(({ mode, cran, profil, contre }) => `${mode} ${cran} ${profil} ${contre}`), ['dark 600 soft cranLeger', 'dark 600 vivid cranLeger']);
  assert.equal(manques[0].seuil, 3);
});

test('[ENT-10] la table du sens du mode choisit les crans : le 800 est garanti en Light inversé, pas en Light normal', () => {
  assert.deepEqual(decrire(avecClarte(NORMAL, 'light', 800, 0.6)), []);
  const inverse = recetteDeTexte({ light: 'noir', dark: 'noir' });
  assert.deepEqual(decrire(avecClarte(inverse, 'light', 800, 0.6)), ['light 800 soft cranLeger', 'light 800 vivid cranLeger']);
  // Le 600 de page/focus en sens normal n'est plus garanti en sens inversé, où le focus est la 700.
  assert.deepEqual(decrire(avecClarte(inverse, 'light', 600, 0.9)), []);
});

test('[ENT-10] solid/default tient 4,5 contre le texte des boutons du mode, pour les deux profils', () => {
  // Sens inversé : le texte est noir, et le 700 à 0,5 ne le tient plus ; il garde 3 contre le cran 50.
  const inverse = avecClarte(recetteDeTexte({ light: 'noir', dark: 'noir' }), 'light', 700, 0.5);
  const manques = garantieDesCourbes(inverse);
  assert.deepEqual(manques.map(({ mode, cran, profil, contre }) => `${mode} ${cran} ${profil} ${contre}`), [
    'light 700 soft texteDesBoutons',
    'light 700 vivid texteDesBoutons',
  ]);
  assert.equal(manques[0].seuil, 4.5);
  // Le même cran contre le texte blanc d'un thème normal tient.
  assert.deepEqual(decrire(avecClarte(NORMAL, 'light', 700, 0.5)), []);
});

test('[ENT-10] le contrôle du texte des boutons suit la couleur du mode : un 700 sombre clair tient le noir, pas le blanc', () => {
  const sombre = (texte: Texte) => decrire(avecClarte(recetteDeTexte(texte), 'dark', 700, 0.66));
  assert.deepEqual(sombre({ light: 'blanc', dark: 'noir' }), []);
  assert.deepEqual(sombre({ light: 'blanc', dark: 'blanc' }), ['dark 700 soft texteDesBoutons', 'dark 700 vivid texteDesBoutons']);
});

test('[ENT-10] la teinte du pire cas est celle du plus petit contraste sur le cercle', () => {
  const [manque] = garantieDesCourbes(avecClarte(NORMAL, 'light', 700, 0.56));
  // Le jaune et le vert clairs contrastent le moins avec un gris clair à clarté égale.
  assert.ok(manque.teinte > 60 && manque.teinte < 160, String(manque.teinte));
});
