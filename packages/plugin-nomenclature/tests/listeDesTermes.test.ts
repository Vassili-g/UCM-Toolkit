/** L'état de la liste des termes de l'onglet Règles : pages, recherche, filtre, terme choisi, résumés. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { TermeDeListe } from '../src/messages';
import { LISTE_INITIALE, choisir, debutSuivant, filtrer, recevoir, resteAAfficher, saisir, morceauxDuTerme, nomAccessibleDuTerme, phraseDeRecherche } from '../src/ui/listeDesTermes';

const COMPTES = { tous: 120, avecRegle: 20, sansRegle: 100 };

function termes(depart: number, nombre: number): TermeDeListe[] {
  return Array.from({ length: nombre }, (_, rang) => ({ mot: `terme-${depart + rang}`, origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 1, trouve: null }));
}

test('les pages successives s’ajoutent bout à bout', () => {
  let liste = recevoir(LISTE_INITIALE, { debut: 0, termes: termes(0, 50), total: 120, comptes: COMPTES });
  assert.equal(liste.termes.length, 50);
  assert.equal(resteAAfficher(liste), true);
  assert.equal(debutSuivant(liste), 50);
  liste = recevoir(liste, { debut: 50, termes: termes(50, 50), total: 120, comptes: COMPTES });
  liste = recevoir(liste, { debut: 100, termes: termes(100, 20), total: 120, comptes: COMPTES });
  assert.deepEqual(liste.termes.map(({ mot }) => mot).slice(48, 52), ['terme-48', 'terme-49', 'terme-50', 'terme-51']);
  assert.equal(liste.termes.length, 120);
  assert.equal(resteAAfficher(liste), false);
});

test('une page qui ne suit pas la liste est ignorée', () => {
  const liste = recevoir(LISTE_INITIALE, { debut: 0, termes: termes(0, 50), total: 120, comptes: COMPTES });
  assert.equal(recevoir(liste, { debut: 100, termes: termes(100, 20), total: 120, comptes: COMPTES }), liste);
  assert.equal(recevoir(liste, { debut: 50, termes: termes(50, 50), total: 120, comptes: COMPTES }).termes.length, 100);
});

test('la première page remplace une liste déjà reçue', () => {
  const liste = recevoir(LISTE_INITIALE, { debut: 0, termes: termes(0, 50), total: 120, comptes: COMPTES });
  const relue = recevoir(liste, { debut: 0, termes: termes(0, 3), total: 3, comptes: COMPTES });
  assert.equal(relue.termes.length, 3);
  assert.equal(resteAAfficher(relue), false);
});

test('une nouvelle recherche repart de zéro et garde les comptes', () => {
  const liste = recevoir(LISTE_INITIALE, { debut: 0, termes: termes(0, 50), total: 120, comptes: COMPTES });
  const cherchee = saisir(liste, 'bu');
  assert.equal(cherchee.recherche, 'bu');
  assert.deepEqual(cherchee.termes, []);
  assert.equal(cherchee.total, null);
  assert.equal(debutSuivant(cherchee), 0);
  assert.equal(resteAAfficher(cherchee), false);
  assert.deepEqual(cherchee.comptes, COMPTES);
  assert.equal(saisir(cherchee, 'bu'), cherchee);
});

test('un changement de filtre repart de zéro', () => {
  const liste = recevoir(LISTE_INITIALE, { debut: 0, termes: termes(0, 50), total: 120, comptes: COMPTES });
  const filtree = filtrer(liste, 'sans-regle');
  assert.equal(filtree.filtre, 'sans-regle');
  assert.deepEqual(filtree.termes, []);
  assert.equal(filtree.total, null);
  assert.equal(filtrer(filtree, 'sans-regle'), filtree);
});

test('le terme choisi survit à une page et à une recherche', () => {
  let liste = choisir(LISTE_INITIALE, 'terme-3');
  liste = recevoir(liste, { debut: 0, termes: termes(0, 50), total: 50, comptes: COMPTES });
  assert.equal(liste.choisi, 'terme-3');
  assert.equal(saisir(liste, 'x').choisi, 'terme-3');
  assert.equal(choisir(liste, null).choisi, null);
  assert.equal(choisir(liste, 'terme-3'), liste);
});

test('les morceaux d’une ligne suivent le statut du terme', () => {
  const base: TermeDeListe = { mot: 'pressed', origine: 'ucm', statut: 'regle', remplace: ['press', 'push'], avec: null, nombre: 38, trouve: null };
  assert.deepEqual(morceauxDuTerme(base), [
    { sorte: 'reference', texte: 'pressed' },
    { sorte: 'gris', texte: 'remplace' },
    { sorte: 'variante', texte: 'press', trouvee: false },
    { sorte: 'variante', texte: 'push', trouvee: false },
  ]);
  assert.deepEqual(morceauxDuTerme({ ...base, remplace: [] }), [{ sorte: 'mot', texte: 'pressed' }]);
  assert.deepEqual(morceauxDuTerme({ ...base, statut: 'a-trancher', remplace: [], avec: 'error' }), [
    { sorte: 'mot', texte: 'pressed' },
    { sorte: 'gris', texte: 'ou' },
    { sorte: 'variante', texte: 'error', trouvee: false },
  ]);
  assert.deepEqual(morceauxDuTerme({ ...base, statut: 'a-trancher', remplace: [], avec: null }), [{ sorte: 'mot', texte: 'pressed' }]);
  assert.deepEqual(morceauxDuTerme({ ...base, statut: 'ecart', remplace: [] }), [
    { sorte: 'mot', texte: 'pressed' },
    { sorte: 'gris', texte: 'règle UCM non appliquée dans ce fichier' },
  ]);
  assert.deepEqual(morceauxDuTerme({ ...base, statut: 'sans-regle', remplace: [] }), [{ sorte: 'mot', texte: 'pressed' }]);
});

test('la variante cherchée est marquée dans la ligne de sa référence', () => {
  const ligne: TermeDeListe = { mot: 'pressed', origine: 'ucm', statut: 'regle', remplace: ['press', 'push'], avec: null, nombre: 38, trouve: 'push' };
  const variantes = morceauxDuTerme(ligne).filter((morceau) => morceau.sorte === 'variante');
  assert.deepEqual(variantes.map((morceau) => morceau.sorte === 'variante' && morceau.trouvee), [false, true]);
});

test('la phrase de recherche nomme la variante et la référence de la première ligne trouvée', () => {
  const sans: TermeDeListe = { mot: 'radius', origine: null, statut: 'sans-regle', remplace: [], avec: null, nombre: 9, trouve: null };
  const trouvee: TermeDeListe = { mot: 'color', origine: 'ucm', statut: 'regle', remplace: ['colors'], avec: null, nombre: 435, trouve: 'colors' };
  assert.equal(phraseDeRecherche([sans]), null);
  assert.equal(phraseDeRecherche([]), null);
  assert.deepEqual(phraseDeRecherche([sans, trouvee, { ...trouvee, mot: 'colour' }]), { variante: 'colors', reference: 'color' });
});

test('le nom accessible d’une ligne dit la règle, l’origine et le nombre', () => {
  const base: TermeDeListe = { mot: 'pressed', origine: 'ucm', statut: 'regle', remplace: ['press', 'push'], avec: null, nombre: 38, trouve: null };
  assert.equal(nomAccessibleDuTerme(base), 'pressed, remplace press, push, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...base, origine: null, statut: 'a-trancher', remplace: [], avec: 'error' }), 'pressed, à trancher avec error, À trancher, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...base, statut: 'ecart', remplace: [] }), 'pressed, règle UCM non appliquée dans ce fichier, UCM, 38 noms');
  assert.equal(nomAccessibleDuTerme({ ...base, origine: null, statut: 'sans-regle', remplace: [] }), 'pressed, 38 noms');
});
