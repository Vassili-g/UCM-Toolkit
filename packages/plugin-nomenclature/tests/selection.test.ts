/** Le modèle de sélection de l'onglet Renommages : cases, compte, réconciliation. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { GroupeVue, LigneVue } from '../src/messages';
import {
  cocherGroupe,
  cocherLigne,
  compterLesNomsCoches,
  compterLesNomsCochesParSorte,
  creerSelection,
  etatDuGroupe,
  ligneCochee,
  nombreCocheDuGroupe,
  oublierLesInclus,
  reconcilier,
  versSelection,
} from '../src/ui/selection';

const groupe = (cle: string, variables: number, collections = 0): GroupeVue => ({
  cle, regle: { sorte: 'terme', origine: 'ucm', categorie: null }, avant: cle, apres: `${cle}-ok`, autres: 0, variables, collections, aussiDEcriture: 0, nouveau: false, apercu: [],
});
const ligne = (id: string, aussi: readonly string[] = []): LigneVue => ({ id, ancien: `a/${id}/b`, nouveau: `a/${id}/b`, marques: [1], aussi });

const GROUPES = [groupe('press', 3), groupe('disable', 2), groupe('font-size', 4), groupe('Color Brands', 0, 1)];

test('par défaut, tous les groupes sont cochés, sans exclu ni inclus', () => {
  const modele = creerSelection(GROUPES);
  assert.deepEqual(versSelection(modele), { groupes: ['press', 'disable', 'font-size', 'Color Brands'], exclus: [], inclus: [] });
  assert.equal(compterLesNomsCoches(modele), 3 + 2 + 4 + 1);
  assert.equal(etatDuGroupe(modele, 'press'), 'coche');
});

test('un bilan sans groupe donne une sélection vide', () => {
  const modele = creerSelection([]);
  assert.deepEqual(versSelection(modele), { groupes: [], exclus: [], inclus: [] });
  assert.equal(compterLesNomsCoches(modele), 0);
});

test('décocher une ligne exclut son nom et rend le groupe partiel', () => {
  const modele = cocherLigne(creerSelection(GROUPES), ligne('v1'), 'press', false);
  assert.deepEqual(versSelection(modele).exclus, ['v1']);
  assert.equal(etatDuGroupe(modele, 'press'), 'partiel');
  assert.equal(ligneCochee(modele, ligne('v1'), 'press'), false);
  assert.equal(ligneCochee(modele, ligne('v2'), 'press'), true);
  assert.equal(nombreCocheDuGroupe(modele, 'press'), 2);
  assert.equal(compterLesNomsCoches(modele), 9);
});

test('recocher la ligne exclue rend le groupe entier', () => {
  const decoche = cocherLigne(creerSelection(GROUPES), ligne('v1'), 'press', false);
  const recoche = cocherLigne(decoche, ligne('v1'), 'press', true);
  assert.equal(etatDuGroupe(recoche, 'press'), 'coche');
  assert.deepEqual(versSelection(recoche).exclus, []);
});

test('cocher une ligne ne change rien quand elle l’est déjà', () => {
  const modele = creerSelection(GROUPES);
  assert.equal(cocherLigne(modele, ligne('v1'), 'press', true), modele);
});

test('décocher toutes les lignes d’un groupe le décoche', () => {
  let modele = creerSelection(GROUPES);
  for (const id of ['v1', 'v2']) modele = cocherLigne(modele, ligne(id), 'disable', false);
  assert.equal(etatDuGroupe(modele, 'disable'), 'vide');
  assert.deepEqual(versSelection(modele), { groupes: ['press', 'font-size', 'Color Brands'], exclus: [], inclus: [] });
});

test('inclure une ligne d’un groupe décoché rend ce groupe partiel et compte le nom', () => {
  const decoche = cocherGroupe(creerSelection(GROUPES), 'font-size', false);
  assert.equal(etatDuGroupe(decoche, 'font-size'), 'vide');
  assert.equal(compterLesNomsCoches(decoche), 6);
  const modele = cocherLigne(decoche, ligne('f1'), 'font-size', true);
  assert.equal(etatDuGroupe(modele, 'font-size'), 'partiel');
  assert.equal(ligneCochee(modele, ligne('f1'), 'font-size'), true);
  assert.deepEqual(versSelection(modele), { groupes: ['press', 'disable', 'Color Brands'], exclus: [], inclus: ['f1'] });
  assert.equal(compterLesNomsCoches(modele), 7);
});

test('inclure toutes les lignes d’un groupe décoché le coche', () => {
  let modele = cocherGroupe(creerSelection(GROUPES), 'disable', false);
  for (const id of ['d1', 'd2']) modele = cocherLigne(modele, ligne(id), 'disable', true);
  assert.equal(etatDuGroupe(modele, 'disable'), 'coche');
  assert.deepEqual(versSelection(modele).inclus, []);
  assert.ok(versSelection(modele).groupes.includes('disable'));
});

test('cocher un groupe oublie ses exclus, le décocher oublie ses inclus', () => {
  const partiel = cocherLigne(creerSelection(GROUPES), ligne('v1'), 'press', false);
  assert.deepEqual(versSelection(cocherGroupe(partiel, 'press', true)).exclus, []);
  const decoche = cocherGroupe(partiel, 'press', false);
  assert.equal(etatDuGroupe(decoche, 'press'), 'vide');
  assert.equal(versSelection(cocherGroupe(cocherLigne(decoche, ligne('v2'), 'press', true), 'press', false)).inclus.length, 0);
});

test('le compte s’appuie sur les totaux des groupes, variables et collections ensemble', () => {
  const modele = cocherGroupe(creerSelection(GROUPES), 'press', false);
  assert.equal(compterLesNomsCoches(modele), 2 + 4 + 1);
  assert.deepEqual(compterLesNomsCochesParSorte(modele), { variables: 6, collections: 1 });
});

test('les exclus se retirent d’abord des variables d’un groupe, puis de ses collections', () => {
  const mixte = creerSelection([groupe('mixte', 2, 2)]);
  let modele = mixte;
  for (const id of ['a', 'b', 'c']) modele = cocherLigne(modele, ligne(id), 'mixte', false);
  assert.deepEqual(compterLesNomsCochesParSorte(modele), { variables: 0, collections: 1 });
  assert.equal(compterLesNomsCoches(modele), 1);
});

test('la réconciliation fait sortir les groupes disparus et garde les cases des autres', () => {
  const avant = cocherGroupe(creerSelection(GROUPES), 'disable', false);
  const apres = reconcilier(avant, [groupe('press', 3), groupe('disable', 2)]);
  assert.deepEqual(versSelection(apres), { groupes: ['press'], exclus: [], inclus: [] });
  assert.equal(etatDuGroupe(apres, 'disable'), 'vide');
  assert.equal(compterLesNomsCoches(apres), 3);
});

test('un exclu ou un inclus dont le groupe a disparu est oublié', () => {
  let modele = cocherLigne(creerSelection(GROUPES), ligne('v1'), 'press', false);
  modele = cocherGroupe(modele, 'font-size', false);
  modele = cocherLigne(modele, ligne('f1'), 'font-size', true);
  assert.deepEqual([versSelection(modele).exclus, versSelection(modele).inclus], [['v1'], ['f1']]);
  const apres = reconcilier(modele, [groupe('disable', 2)]);
  assert.deepEqual(versSelection(apres), { groupes: ['disable'], exclus: [], inclus: [] });
});

test('un exclu dont le groupe reste est gardé', () => {
  const modele = cocherLigne(creerSelection(GROUPES), ligne('v1'), 'press', false);
  const apres = reconcilier(modele, [groupe('press', 2), groupe('disable', 2)]);
  assert.deepEqual(versSelection(apres).exclus, ['v1']);
  assert.equal(nombreCocheDuGroupe(apres, 'press'), 1);
});

test('un groupe nouveau arrive coché, même quand les autres sont décochés', () => {
  const decoche = cocherGroupe(cocherGroupe(creerSelection(GROUPES), 'press', false), 'disable', false);
  const apres = reconcilier(decoche, [...GROUPES, groupe('outline', 5)]);
  assert.deepEqual(versSelection(apres).groupes, ['font-size', 'Color Brands', 'outline']);
  assert.equal(etatDuGroupe(apres, 'press'), 'vide');
});

test('la réconciliation sans changement garde la sélection à l’identique', () => {
  const modele = cocherLigne(creerSelection(GROUPES), ligne('v1'), 'press', false);
  assert.deepEqual(versSelection(reconcilier(modele, GROUPES)), versSelection(modele));
});

test('un nom présent dans deux groupes est coché partout, son groupe principal en décide', () => {
  const partage = ligne('p1', ['disable']);
  const modele = creerSelection(GROUPES);
  assert.equal(ligneCochee(modele, partage, 'press'), true);
  assert.equal(ligneCochee(modele, ligne('p1', ['press']), 'disable'), true);
  // Décoché depuis le groupe où il apparaît par `aussi`, il l'est dans le groupe principal.
  const decoche = cocherLigne(modele, ligne('p1', ['press']), 'disable', false);
  assert.equal(ligneCochee(decoche, partage, 'press'), false);
  assert.deepEqual(versSelection(decoche).exclus, ['p1']);
  assert.equal(etatDuGroupe(decoche, 'press'), 'partiel');
  assert.equal(etatDuGroupe(decoche, 'disable'), 'coche');
  assert.equal(compterLesNomsCoches(decoche), 9);
});

test('un nom du groupe principal décoché reste décoché sous le groupe où il apparaît par aussi', () => {
  const modele = cocherGroupe(creerSelection(GROUPES), 'press', false);
  assert.equal(ligneCochee(modele, ligne('p1', ['press']), 'disable'), false);
  const inclus = cocherLigne(modele, ligne('p1', ['press']), 'disable', true);
  assert.equal(ligneCochee(inclus, ligne('p1'), 'press'), true);
  assert.deepEqual(versSelection(inclus).inclus, ['p1']);
  assert.equal(etatDuGroupe(inclus, 'press'), 'partiel');
  assert.equal(etatDuGroupe(inclus, 'disable'), 'coche');
});

test('oublier les inclus ramène un groupe décoché à vide', () => {
  const modele = cocherLigne(cocherGroupe(creerSelection(GROUPES), 'press', false), ligne('v1'), 'press', true);
  const apres = oublierLesInclus(modele);
  assert.equal(etatDuGroupe(apres, 'press'), 'vide');
  assert.deepEqual(versSelection(apres).inclus, []);
  assert.equal(oublierLesInclus(apres), apres);
});
