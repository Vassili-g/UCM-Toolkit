/**
 * La jonction des canaux et la couverture du résultat interne, sur des canaux
 * fabriqués et un composant réduit à son nom et à son identifiant.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { couvertureDe, joindreLesCanaux } from '../src/composant/analyse/resultat';
import type { ReleveDesImbriques } from '../src/composant/contract/imbriques';
import { noterSansNode, partiesDe, pousserSansNode } from '../src/composant/contract/localisation';

const COMPOSANT = { name: 'Alert', id: '1:1' } as unknown as ComponentSetNode;

const SANS_IMBRIQUE: ReleveDesImbriques = { auParent: [], sansRegles: [], sansPorteur: [] };

/** Un composant imbriqué sans règles, qui donne un point bloquant à deux instances. */
const UN_IMBRIQUE_SANS_REGLES: ReleveDesImbriques = {
  auParent: [],
  sansRegles: [{ nom: 'Icon', distant: false, cles: [], nodeIds: ['2:1', '2:2'] }],
  sansPorteur: [],
};

const constat = (manque: string) => ({
  famille: 'proprietes' as const,
  manque,
  impact: 'Le développeur ne le saura pas.',
  action: 'Corrigez-le dans Figma, puis réexportez.',
});

test('la couverture dit complète sans bilan et rend les layers lus et non lus avec un bilan', () => {
  assert.deepEqual(couvertureDe(null), { etat: 'complete' });
  assert.deepEqual(couvertureDe(undefined), { etat: 'complete' });
  assert.deepEqual(couvertureDe({ lus: 6, nonLus: 9 }), { etat: 'partielle', lus: 6, nonLus: 9 });
  assert.deepEqual(couvertureDe({ lus: 3, nonLus: 'inconnu' }), { etat: 'partielle', lus: 3, nonLus: 'inconnu' });
});

test('la jonction range les messages en bloquants, canal principal, puis structure, sans doublon', () => {
  const principal: string[] = [];
  const doublon = pousserSansNode(principal, 'Propriété « a »', constat('un manque commun'));
  const propre = pousserSansNode(principal, 'Propriété « b »', constat('un manque du canal principal'));
  const structure: string[] = [];
  pousserSansNode(structure, 'Propriété « a »', constat('un manque commun'));
  const dernier = pousserSansNode(structure, 'Propriété « c »', constat('un manque de structure'));
  noterSansNode(structure, dernier, 'nom-publie');

  const jonction = joindreLesCanaux({
    composant: COMPOSANT,
    imbriques: UN_IMBRIQUE_SANS_REGLES,
    warnings: principal,
    avertissementsDeStructure: structure,
    projectionWarnings: [propre],
  });

  const [bloquant, ...suite] = jonction.warnings;
  assert.match(bloquant, /^Le composant « Alert » intègre « Icon »/);
  assert.deepEqual(suite, [doublon, propre, dernier]);
  assert.deepEqual(jonction.localisations.get(bloquant), ['2:1', '2:2']);
  assert.deepEqual([...jonction.parties.keys()], jonction.warnings);
  assert.equal(partiesDe(jonction.warnings).size, jonction.warnings.length);
  assert.deepEqual([...jonction.localisationsDeclarees], [[dernier, 'nom-publie']]);
});

test('le bloquant des imbriqués et les messages de projection forment l’ensemble qui dégrade la couverture portable', () => {
  const principal: string[] = [];
  const propre = pousserSansNode(principal, 'Propriété « b »', constat('un manque du canal principal'));
  const notice = pousserSansNode(principal, 'Propriété « d »', constat('un manque qui reste une notice'));
  const projection = [propre];

  const jonction = joindreLesCanaux({
    composant: COMPOSANT,
    imbriques: UN_IMBRIQUE_SANS_REGLES,
    warnings: principal,
    avertissementsDeStructure: [],
    projectionWarnings: projection,
  });

  assert.equal(jonction.projectionWarnings.size, 2);
  assert.ok(jonction.projectionWarnings.has(propre));
  assert.ok(jonction.projectionWarnings.has(jonction.warnings[0]));
  assert.ok(!jonction.projectionWarnings.has(notice));
  assert.deepEqual(projection, [propre, jonction.warnings[0]]);
});

test('sans imbriqué à corriger, la jonction n’ajoute aucun bloquant', () => {
  const principal: string[] = [];
  const seul = pousserSansNode(principal, 'Propriété « a »', constat('un manque'));

  const jonction = joindreLesCanaux({
    composant: COMPOSANT,
    imbriques: SANS_IMBRIQUE,
    warnings: principal,
    avertissementsDeStructure: [],
    projectionWarnings: [],
  });

  assert.deepEqual(jonction.warnings, [seul]);
  assert.equal(jonction.projectionWarnings.size, 0);
});
