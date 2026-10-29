/** Ce que la carte des garanties montre avant son dessin : neuf lignes, six colonnes de fonds, un départ d'éventail ([UI-09], M1). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { GARANTIES, recetteAvecTexteDesBoutons, recetteParDefaut, verifierPromesses, type Mode, type Recette, type TexteDesBoutons } from 'ucm-couleur';

import { changerReference } from '../src/edition';
import {
  GARANTIE_PAR_DEFAUT,
  blocsDeGaranties,
  caseDeLaReglette,
  ciblesDeLaGarantie,
  colonneDuFond,
  garantieParDefaut,
  lignesDesGaranties,
  type CibleDeGarantie,
} from '../src/ui/modeleDesGaranties';

const DEFAUT = recetteParDefaut();
const BLEU = changerReference(DEFAUT, {
  id: 'p-0000000a',
  reference: '#000000',
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'tailwind' }, vivid: { clair: 0, sombre: 0, origine: 'tailwind' } },
}, '#1E6FD9')!;

/** La recette par défaut avec le texte des boutons d'un thème changé, par le geste du plugin. */
function avecTexte(mode: Mode, texte: TexteDesBoutons): Recette {
  const changee = recetteAvecTexteDesBoutons({ ...DEFAUT, palettes: [BLEU] }, mode, texte);
  if ('refus' in changee) throw new Error('courbe refusée');
  return changee.recette;
}

const lignesDe = (recette: Recette, mode: Mode) =>
  lignesDesGaranties(verifierPromesses(recette, BLEU).filter((promesse) => promesse.mode === mode && promesse.profil === 'vivid'));

/** Les colonnes remplies d'une ligne, dans l'ordre : `page`, `carte`, `subtle`, `default`, `hover`, `pressed`. */
const colonnesDe = (ligne: ReturnType<typeof lignesDe>[number]) => ligne.cases.map((cas) => cas.colonne).join(' ');

test('[UI-09] une ligne par garantie : neuf lignes, dans deux blocs, textes lisibles puis éléments visibles', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.garantie.numero), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(blocsDeGaranties(lignes).map((bloc) => [bloc.seuil, bloc.lignes.map((ligne) => ligne.garantie.numero)]), [['texte', [1, 3, 5, 9]], ['nonTexte', [2, 4, 6, 7, 8]]]);
});

test('[UI-09] une garantie qui ne vise pas un fond laisse sa case vide', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  const colonnes = Object.fromEntries(lignes.map((ligne) => [ligne.garantie.numero, colonnesDe(ligne)]));
  assert.deepEqual(colonnes, {
    1: 'default hover pressed',
    2: 'page carte',
    3: 'page carte subtle default hover',
    4: 'page carte subtle default hover pressed',
    5: 'page carte',
    6: 'page carte',
    7: 'page carte',
    8: 'pressed',
    9: 'default hover',
  });
});

test('[UI-09] l’éventail part d’un seul point : la nuance du premier membre, la case « boutons » pour le texte des boutons', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.depart), ['boutons', 700, 700, 700, 700, 700, 600, 700, 700]);
  const [g1, , , , , , g7] = lignes;
  assert.deepEqual(g1.cases.map((cas) => caseDeLaReglette(cas.promesse.second)), [700, 800, 900]);
  assert.deepEqual(g7.cases.map((cas) => caseDeLaReglette(cas.promesse.second)), ['page', 'carte']);
});

test('[UI-09] les crans suivent la table du sens du thème affiché, et le texte des boutons de ce thème', () => {
  const inverse = avecTexte('light', 'noir');
  const lignes = lignesDe(inverse, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.depart), ['boutons', 700, 900, 900, 800, 800, 700, 900, 800]);
  assert.deepEqual(lignes[0].cases.map((cas) => caseDeLaReglette(cas.promesse.second)), [700, 600, 500], 'solid/hover et solid/pressed vont vers la page');
  assert.equal(lignes[0].cases[0].promesse.premier.nature, 'texteDesBoutons');
  assert.deepEqual(lignes[0].cases[0].promesse.premier.couleur, [0, 0, 0], 'noir pur');
  // L'autre thème garde sa table : Dark reste normal, avec ses surfaces plus hautes (texte au 950).
  assert.deepEqual(lignesDe(inverse, 'dark').map((ligne) => ligne.depart), ['boutons', 700, 950, 950, 700, 700, 600, 950, 700]);
});

test('[UI-09] la garantie choisie à l’ouverture est la première ligne manquée de la carte, sinon le texte sur fond teinté', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  assert.equal(garantieParDefaut(lignes), GARANTIE_PAR_DEFAUT);
  assert.equal(GARANTIE_PAR_DEFAUT, 3);
  const manque = (numeros: readonly number[]) => lignes.map((ligne) => (numeros.includes(ligne.garantie.numero)
    ? { ...ligne, cases: ligne.cases.map((cas) => ({ ...cas, promesse: { ...cas.promesse, verdict: 'manquee' as const } })) }
    : ligne));
  assert.equal(garantieParDefaut(manque([5, 2])), 5, 'le bloc des textes précède celui des éléments visibles');
  assert.equal(garantieParDefaut(manque([7, 4])), 4);
  assert.equal(garantieParDefaut(manque([1, 3])), 1);
});

test('[UI-09] [VER-21] une ligne nomme ses fonds : les trois états d’un dossier s’écrivent une fois, une variable seule garde son nom', () => {
  const nom = (cibles: CibleDeGarantie[]) => cibles.map((cible) => ('page' in cible ? 'la page' : 'carte' in cible ? 'la carte' : cible.code));
  assert.deepEqual(GARANTIES.map((garantie) => nom(ciblesDeLaGarantie(garantie))), [
    ['solid/*'],
    ['la page', 'la carte'],
    ['surface/subtle', 'surface/default', 'surface/hover', 'la page', 'la carte'],
    ['surface/*', 'la page', 'la carte'],
    ['la page', 'la carte'],
    ['la page', 'la carte'],
    ['la page', 'la carte'],
    ['surface/pressed'],
    ['surface/default', 'surface/hover'],
  ]);
  assert.deepEqual(GARANTIES.flatMap((garantie) => garantie.fonds.map(colonneDuFond)), [
    'default', 'hover', 'pressed',
    'page', 'carte',
    'subtle', 'default', 'hover', 'page', 'carte',
    'subtle', 'default', 'hover', 'pressed', 'page', 'carte',
    'page', 'carte',
    'page', 'carte',
    'page', 'carte',
    'pressed',
    'default', 'hover',
  ]);
});

test('[UI-09] une garantie dont un cran manque à la liste n’a pas de ligne', () => {
  const sans700 = { ...DEFAUT, palettes: [BLEU], crans: DEFAUT.crans.filter((cran) => cran !== 700), courbes: { light: DEFAUT.courbes.light.filter((_, rang) => DEFAUT.crans[rang] !== 700), dark: DEFAUT.courbes.dark.filter((_, rang) => DEFAUT.crans[rang] !== 700) } };
  const lignes = lignesDe(sans700, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.garantie.numero), [7]);
});

test('[UI-09] une liste sans 50 laisse sans ligne les garanties qui jugent `surface/subtle`', () => {
  const sans50 = { ...DEFAUT, palettes: [BLEU], crans: DEFAUT.crans.filter((cran) => cran !== 50), courbes: { light: DEFAUT.courbes.light.slice(1), dark: DEFAUT.courbes.dark.slice(1) } };
  assert.deepEqual(lignesDe(sans50, 'light').map((ligne) => ligne.garantie.numero), [1, 2, 5, 6, 7, 8, 9], 'les garanties 3 et 4 manquent, la 8 ne juge que `surface/pressed`');
});

test('[UI-09] les garanties 8 et 9 ont un ou deux fonds, sous les colonnes `pressed` pour la 8, `default` et `hover` pour la 9', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'dark');
  const [g8, g9] = [8, 9].map((numero) => lignes.find((ligne) => ligne.garantie.numero === numero)!);
  assert.deepEqual([g8.garantie.premier.variable, g8.garantie.seuil, colonnesDe(g8)], ['surface/foreground', 'nonTexte', 'pressed']);
  assert.deepEqual([g9.garantie.premier.variable, g9.garantie.seuil, colonnesDe(g9)], ['page/foreground', 'texte', 'default hover']);
  assert.deepEqual(g9.cases.map((cas) => caseDeLaReglette(cas.promesse.second)), [200, 300], 'surface/default et surface/hover en Dark');
});

/** La recette par défaut où la nuance `cran` de la courbe Dark vaut `luminosite`. */
function avecLaCourbeDark(cran: number, luminosite: number): Recette {
  const dark = [...DEFAUT.courbes.dark];
  dark[DEFAUT.crans.indexOf(cran)] = luminosite;
  return { ...DEFAUT, palettes: [BLEU], courbes: { ...DEFAUT.courbes, dark } };
}

test('[UI-09] une promesse manquée sur la carte seule se range dans sa colonne', () => {
  const verdicts = (lignes: ReturnType<typeof lignesDe>, numero: number) =>
    lignes.find((ligne) => ligne.garantie.numero === numero)!.cases.map((cas) => `${cas.colonne} ${cas.promesse.verdict}`);
  // Le moteur éloigne le texte coloré des fonds teintés : à 0,60, la 700 du Dark tient la page et la carte.
  assert.deepEqual(verdicts(lignesDe(avecLaCourbeDark(700, 0.6), 'dark'), 5), ['page tenue', 'carte tenue']);
  // La 600 à 0,50 ne manque la carte qu'en Soft : l'anneau reste tenu en Vivid.
  const recette = avecLaCourbeDark(600, 0.5);
  const anneau = lignesDesGaranties(verifierPromesses(recette, BLEU).filter((promesse) => promesse.mode === 'dark' && promesse.profil === 'soft'));
  assert.deepEqual(verdicts(anneau, 7), ['page tenue', 'carte manquee']);
  assert.equal(garantieParDefaut(anneau), 7);
  assert.equal(caseDeLaReglette(anneau.find((ligne) => ligne.garantie.numero === 7)!.cases[1].promesse.second), 'carte');
});
