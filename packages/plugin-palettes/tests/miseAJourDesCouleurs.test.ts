/** Les couleurs d'une mise à jour et leurs groupes : l'encart d'office de [UI-31] et la grille de [UI-32]. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { couleursAMettreAJour, groupesDeCouleurs, type CouleurDUneMiseAJour } from '../src/variables/gestion';

type Tokens = Parameters<typeof couleursAMettreAJour>[0];

const COULEUR = { cle: 'soft/light/50', nom: 'color/Jaune/soft/light/50', ecrite: '#FFFFFF', plugin: '#FAFAFA' };
const SEULES: Tokens = {
  etat: 'a-mettre-a-jour',
  reprise: false,
  refus: null,
  destinationChangee: false,
  aCreer: [],
  existantes: [],
  aRenommer: [],
  modifiees: [],
  aEcrire: [COULEUR, { ...COULEUR, cle: 'soft/light/100', nom: 'color/Jaune/soft/light/100' }],
};

test('[UI-31] des couleurs seules rendent la liste à écrire', () => {
  assert.deepEqual(couleursAMettreAJour(SEULES), SEULES.aEcrire);
});

const AUTRES: readonly (readonly [string, Partial<Tokens>])[] = [
  ['une création', { aCreer: ['color/Jaune/soft/light/950'] }],
  ['une variable existante', { existantes: ['color/Jaune/soft/light/950'] }],
  ['un renommage', { aRenommer: [{ id: 'v', de: 'a', vers: 'b', cause: 'forme' }] }],
  ['une destination changée', { destinationChangee: true }],
  ['une reprise', { reprise: true }],
  ['un refus', { refus: { nom: 'color/Jaune/soft/light/50', palette: 'Autre' } }],
  ['une couleur modifiée dans Figma', { modifiees: [{ cle: 'soft/light/50', nom: 'color/Jaune/soft/light/50', figma: '#000000', plugin: '#FAFAFA' }] }],
  ['une entrée jamais écrite', { aEcrire: [{ ...COULEUR, ecrite: null }] }],
  ['l\'état à jour', { etat: 'a-jour' }],
  ['aucune couleur à écrire', { aEcrire: [] }],
];
for (const [nom, ecart] of AUTRES) {
  test(`[UI-31] ${nom} rend une liste vide`, () => {
    assert.deepEqual(couleursAMettreAJour({ ...SEULES, ...ecart }), []);
  });
}

function couleurs(entrees: readonly (readonly [string, string])[]): CouleurDUneMiseAJour[] {
  return entrees.map(([cle, nom]) => ({ cle, nom, avant: '#111111', apres: '#222222' }));
}

test('[UI-32] les thèmes dans le chemin rangent Light puis Dark, intensité par intensité', () => {
  const groupes = groupesDeCouleurs(couleurs([
    ['soft/light/50', 'color/Jaune/soft/light/50'],
    ['soft/light/100', 'color/Jaune/soft/light/100'],
    ['soft/dark/50', 'color/Jaune/soft/dark/50'],
    ['vivid/light/50', 'color/Jaune/vivid/light/50'],
    ['vivid/dark/50', 'color/Jaune/vivid/dark/50'],
  ]));
  assert.deepEqual(groupes.map((groupe) => groupe.chemin), [
    'color/Jaune/soft/light/', 'color/Jaune/vivid/light/', 'color/Jaune/soft/dark/', 'color/Jaune/vivid/dark/',
  ]);
  assert.deepEqual(groupes.map((groupe) => groupe.theme), [null, null, null, null]);
  assert.deepEqual(groupes[0].lignes.map((ligne) => ligne.nuance), ['50', '100']);
});

test('[UI-32] les thèmes en modes donnent deux groupes de même chemin, Light puis Dark', () => {
  const groupes = groupesDeCouleurs(couleurs([
    ['soft/dark/50', 'color/Jaune/soft/50'],
    ['soft/light/50', 'color/Jaune/soft/50'],
  ]));
  assert.deepEqual(groupes.map((groupe) => [groupe.chemin, groupe.theme]), [
    ['color/Jaune/soft/', 'light'], ['color/Jaune/soft/', 'dark'],
  ]);
});

test('[UI-32] un avant à null (alias dans Figma) est gardé', () => {
  const [groupe] = groupesDeCouleurs([{ cle: 'soft/light/50', nom: 'color/Jaune/soft/light/50', avant: null, apres: '#222222' }]);
  assert.deepEqual(groupe.lignes, [{ nuance: '50', avant: null, apres: '#222222' }]);
});

test('[UI-32] une intensité unique forme un seul groupe', () => {
  const groupes = groupesDeCouleurs(couleurs([
    ['unique/light/50', 'color/Jaune/light/50'],
    ['unique/light/100', 'color/Jaune/light/100'],
  ]));
  assert.equal(groupes.length, 1);
  assert.equal(groupes[0].chemin, 'color/Jaune/light/');
  assert.equal(groupes[0].theme, null);
});

test('[UI-32] la nuance se lit sur la clé, pas sur le nom', () => {
  const [groupe] = groupesDeCouleurs(couleurs([['soft/light/50', 'color/Jaune/soft/light/050-bis']]));
  assert.equal(groupe.lignes[0].nuance, '50');
});
