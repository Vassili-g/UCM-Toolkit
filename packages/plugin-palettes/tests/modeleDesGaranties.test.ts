/** Ce que la carte des garanties montre avant son dessin : sept lignes, quatre colonnes de fonds, un départ d'éventail ([UI-09], M1). */
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

/** Les colonnes remplies d'une ligne, dans l'ordre : `page`, `default`, `hover`, `pressed`. */
const colonnesDe = (ligne: ReturnType<typeof lignesDe>[number]) => ligne.cases.map((cas) => cas.colonne).join(' ');

test('[UI-09] une ligne par garantie : sept lignes, dans deux blocs, textes lisibles puis éléments visibles', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.garantie.numero), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(blocsDeGaranties(lignes).map((bloc) => [bloc.seuil, bloc.lignes.map((ligne) => ligne.garantie.numero)]), [['texte', [1, 3, 5]], ['nonTexte', [2, 4, 6, 7]]]);
});

test('[UI-09] une garantie qui ne vise pas un fond laisse sa case vide', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  const colonnes = Object.fromEntries(lignes.map((ligne) => [ligne.garantie.numero, colonnesDe(ligne)]));
  assert.deepEqual(colonnes, {
    1: 'default hover pressed',
    2: 'page',
    3: 'page default hover pressed',
    4: 'page default hover pressed',
    5: 'page',
    6: 'page',
    7: 'page default',
  });
});

test('[UI-09] l’éventail part d’un seul point : la nuance du premier membre, la case « boutons » pour le texte des boutons', () => {
  const lignes = lignesDe({ ...DEFAUT, palettes: [BLEU] }, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.depart), ['boutons', 700, 800, 800, 700, 700, 600]);
  const [g1, , , , , , g7] = lignes;
  assert.deepEqual(g1.cases.map((cas) => caseDeLaReglette(cas.promesse.second)), [700, 800, 900]);
  assert.deepEqual(g7.cases.map((cas) => caseDeLaReglette(cas.promesse.second)), ['page', 100]);
});

test('[UI-09] les crans suivent la table du sens du thème affiché, et le texte des boutons de ce thème', () => {
  const inverse = avecTexte('light', 'noir');
  const lignes = lignesDe(inverse, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.depart), ['boutons', 700, 900, 900, 800, 800, 700]);
  assert.deepEqual(lignes[0].cases.map((cas) => caseDeLaReglette(cas.promesse.second)), [700, 600, 500], 'solid/hover et solid/pressed vont vers la page');
  assert.equal(lignes[0].cases[0].promesse.premier.nature, 'texteDesBoutons');
  assert.deepEqual(lignes[0].cases[0].promesse.premier.couleur, [0, 0, 0], 'noir pur');
  // L'autre thème garde sa table : Dark reste normal.
  assert.deepEqual(lignesDe(inverse, 'dark').map((ligne) => ligne.depart), ['boutons', 700, 800, 800, 700, 700, 600]);
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

test('[UI-09] une ligne nomme ses fonds : les trois états d’un dossier s’écrivent une fois, une variable seule garde son nom', () => {
  const nom = (cibles: CibleDeGarantie[]) => cibles.map((cible) => ('page' in cible ? 'la page' : cible.code));
  assert.deepEqual(GARANTIES.map((garantie) => nom(ciblesDeLaGarantie(garantie))), [
    ['solid/*'],
    ['la page'],
    ['surface/*', 'la page'],
    ['surface/*', 'la page'],
    ['la page'],
    ['la page'],
    ['la page', 'surface/default'],
  ]);
  assert.deepEqual(GARANTIES.flatMap((garantie) => garantie.fonds.map(colonneDuFond)), [
    'default', 'hover', 'pressed',
    'page',
    'default', 'hover', 'pressed', 'page',
    'default', 'hover', 'pressed', 'page',
    'page', 'page',
    'page', 'default',
  ]);
});

test('[UI-09] une garantie dont un cran manque à la liste n’a pas de ligne', () => {
  const sans700 = { ...DEFAUT, palettes: [BLEU], crans: DEFAUT.crans.filter((cran) => cran !== 700), courbes: { light: DEFAUT.courbes.light.filter((_, rang) => DEFAUT.crans[rang] !== 700), dark: DEFAUT.courbes.dark.filter((_, rang) => DEFAUT.crans[rang] !== 700) } };
  const lignes = lignesDe(sans700, 'light');
  assert.deepEqual(lignes.map((ligne) => ligne.garantie.numero), [3, 4, 7]);
});
