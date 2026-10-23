/** La traduction des points du moteur de l'exporteur en constats du kit : un test par code, et le point inconnu. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { FamilleDePoint } from 'ucm-plugin-socle/src/composant/contract/famillesDePoint';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import { constatsDuMoteur } from '../src/constatsDuMoteur';

function moteurAvec(points: readonly PointACorriger[], noeuds: Record<number, string[]> = {}) {
  const phrases = points.map(phraseDe);
  return {
    warnings: phrases,
    parties: new Map(points.map((point, rang) => [phrases[rang], point])),
    localisations: new Map(Object.entries(noeuds).map(([rang, ids]) => [phrases[Number(rang)], ids])),
  };
}

const point = (famille: FamilleDePoint, titre: string, plus: Partial<PointACorriger> = {}): PointACorriger => ({ famille, titre, impact: 'Impact.', action: 'Action.', ...plus });

const cas: ReadonlyArray<[string, PointACorriger, { code: string; type: string; famille: string }]> = [
  ['C30', point('variables', 'Layer « Border » : son stroke n’est relié à aucune variable.'), { code: 'C30', type: 'corriger', famille: 'liaisons' }],
  ['C34', point('proprietes', 'Component Set « Alert » : une combinaison de valeurs n’a pas de variant.'), { code: 'C34', type: 'verifier', famille: 'variants' }],
  ['C35 calque masqué', point('disposition', 'Layer « icon-close » : il est masqué, et aucune propriété ne pilote sa visibilité.'), { code: 'C35', type: 'verifier', famille: 'visibilite' }],
  ['C35 propriété', point('proprietes', 'Component Set « Alert » : la propriété « Show » ne pilote aucun calque.'), { code: 'C35', type: 'verifier', famille: 'visibilite' }],
  ['C41', point('variables', 'padding : certains côtés utilisent une variable introuvable.'), { code: 'C41', type: 'bloquant', famille: 'liaisons' }],
  ['C42', point('non-exportes', 'Layer « Border » : l’alignement du stroke est illisible.'), { code: 'C42', type: 'verifier', famille: 'export' }],
  ['C44', point('regles', 'Règles : le marqueur « À compléter » est resté.'), { code: 'C44', type: 'corriger', famille: 'regles' }],
];

for (const [nom, entree, attendu] of cas) {
  test(`le point du moteur ${nom} devient un constat ${attendu.code}`, () => {
    const [constat, ...autres] = constatsDuMoteur(moteurAvec([entree], { 0: ['1:1'] }));
    assert.equal(autres.length, 0);
    assert.equal(constat.code, attendu.code);
    assert.equal(constat.type, attendu.type);
    assert.equal(constat.famille, attendu.famille);
    assert.equal(constat.faits.titre, entree.titre);
    assert.deepEqual(constat.layers, ['1:1']);
  });
}

test('un nœud qui est un variant du relevé va dans variants, les autres dans layers', () => {
  const [constat] = constatsDuMoteur(moteurAvec([cas[0][1]], { 0: ['v1', 'l1'] }), new Set(['v1']));
  assert.deepEqual(constat.variants, ['v1']);
  assert.deepEqual(constat.layers, ['l1']);
});

test('un point que la table ne connaît pas devient un constat export à vérifier, avec ses faits', () => {
  const inconnu = point('styles', 'Layer « Title » : le style de texte appliqué est introuvable.');
  const [constat] = constatsDuMoteur(moteurAvec([inconnu]));
  assert.equal(constat.famille, 'export');
  assert.equal(constat.type, 'verifier');
  assert.equal(constat.faits.titre, inconnu.titre);
  assert.equal(constat.faits.geste, 'styles');
});

test('un message du moteur sans parties garde sa phrase, et un point de sévérité danger est bloquant', () => {
  const danger = point('imbriques', 'Instance : contrat déjà faux.', { severite: 'danger' });
  const moteur = moteurAvec([danger]);
  const constats = constatsDuMoteur({ ...moteur, warnings: [...moteur.warnings, 'phrase sans parties'] });
  assert.equal(constats[0].type, 'bloquant');
  assert.deepEqual(constats[1].faits, { message: 'phrase sans parties' });
  assert.equal(new Set(constats.map((constat) => constat.id)).size, 2);
});
