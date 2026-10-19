/** L'état de la liste des termes de l'onglet Règles : pages, recherche, filtre, terme choisi, résumés. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { TermeDeListe } from '../src/messages';
import { LISTE_INITIALE, choisir, debutSuivant, filtrer, recevoir, resteAAfficher, resumeDuTerme, saisir } from '../src/ui/listeDesTermes';

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

test('le résumé d’une ligne dit la règle du terme', () => {
  const base: TermeDeListe = { mot: 'pressed', origine: 'ucm', statut: 'regle', remplace: ['press', 'push'], avec: null, nombre: 38, trouve: null };
  assert.equal(resumeDuTerme(base), 'remplace press, push');
  assert.equal(resumeDuTerme({ ...base, statut: 'a-trancher', avec: 'error' }), 'à trancher avec error');
  assert.equal(resumeDuTerme({ ...base, statut: 'a-trancher', avec: null }), 'à trancher');
  assert.equal(resumeDuTerme({ ...base, statut: 'ecart' }), 'non appliqué dans ce fichier');
  assert.equal(resumeDuTerme({ ...base, statut: 'sans-regle', remplace: [] }), '');
  assert.equal(resumeDuTerme({ ...base, remplace: [] }), '');
});
