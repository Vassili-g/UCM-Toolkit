/** La traduction des points du moteur de l'exporteur en constats du kit : un test par code, et le point inconnu. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';
import type { FamilleDePoint } from 'ucm-plugin-socle/src/composant/contract/famillesDePoint';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import { chaineAvecLePointDuMoteur, trouverUneCollisionDEmpreinte } from '../scripts/stress/f8-analyse/operateursMoteur';
import { constatsDuMoteur, sansLesDoublonsDuMoteur } from '../src/constatsDuMoteur';
import { elementDuConstat } from '../src/ui/panneau/elements';

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
  ['C41', point('variables', 'padding : certains côtés utilisent une variable introuvable.'), { code: 'C41', type: 'bloquant', famille: 'tailles' }],
  // Le résolveur ouvre son titre par la majuscule : il tombait en C30.
  ['C41 du résolveur', point('variables', 'Variable introuvable sur le calque « Border » (stroke)'), { code: 'C41', type: 'bloquant', famille: 'liaisons' }],
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

const codeDe = (entree: PointACorriger): string => constatsDuMoteur(moteurAvec([entree]))[0].code;

test('le code d’un point suit son sens, jamais un nom écrit par le designer (N-67)', () => {
  assert.equal(codeDe(point('disposition', 'Layer « masqué » : il n’utilise pas d’auto layout.')), 'C42');
  assert.equal(codeDe(point('disposition', 'Layer « Masqué » : il n’utilise pas d’auto layout.')), 'C42');
  assert.equal(codeDe(point('disposition', 'Layer « Card » : il range 3 calques mais n’utilise pas d’auto layout, dont :', { elements: ['Badge masqué'] })), 'C42');
  assert.equal(codeDe(point('proprietes', 'Component Set « masqué » : une combinaison de valeurs de ses propriétés de variante n’a pas de variant.')), 'C34');
  assert.equal(codeDe(point('proprietes', 'Component Set « Button » : une combinaison de valeurs de ses propriétés de variante n’a pas de variant :', { elements: ['pilote=on'] })), 'C34');
  assert.equal(codeDe(point('variables', 'Layer « Variable introuvable », padding : aucune variable Figma n’est reliée.')), 'C30');
  assert.equal(codeDe(point('variables', 'Layer « Valeur introuvable », gap : aucune variable associée.')), 'C30');
  assert.equal(codeDe(point('variables', 'Layer « Card », padding : certains côtés n’ont pas de variable exploitable :', { elements: ['variable introuvable : padding-left'] })), 'C41');
  assert.equal(codeDe(point('disposition', 'Layer « Badge » : il est masqué, et aucune propriété booléenne ni variable ne pilote sa visibilité.')), 'C35');
});

test('C34 garde les combinaisons manquantes et les états non reconnus ou tolérés ; les autres points de propriétés sont des C42 (Q-F89-10)', () => {
  const dits = (titre: string) => constatsDuMoteur(moteurAvec([point('proprietes', titre)]))[0];
  for (const titre of [
    'Component Set « Button » : 4 combinaisons de valeurs de ses propriétés de variante n’ont pas de variant.',
    'Propriété de variante « State » : l’état « busy » n’est pas reconnu.',
    'Propriété de variante « State » : l’état « active » s’écrit « pressed » dans le vocabulaire UCM.',
  ]) assert.equal(dits(titre).code, 'C34', titre);
  const vide = dits('Component Set sélectionné : il ne contient aucun variant.');
  assert.deepEqual([vide.code, vide.type, vide.famille], ['C42', 'bloquant', 'export']);
  for (const titre of [
    'Component Set « Button » : aucune propriété de composant n’est définie.',
    'Propriétés de composant « Icon Left » et « icon-left » : leurs noms donnent le même nom « iconLeft » dans le contrat.',
    'Propriété de variante « Scale » : ses valeurs sont des tailles, mais une autre propriété de composant porte déjà le nom « size ».',
  ]) {
    const constat = dits(titre);
    assert.deepEqual([constat.code, constat.type, constat.famille], ['C42', 'verifier', 'export'], titre);
  }
});

test('un point de variable va dans l’élément de ce qu’il lie : tailles, texte, tokens ou couleurs (Q-F89-11, E-29)', () => {
  const element = (titre: string, code = 'C30') => {
    const [constat] = constatsDuMoteur(moteurAvec([point('variables', titre)]));
    assert.equal(constat.code, code, titre);
    return elementDuConstat(constat as never);
  };
  for (const titre of ['Layer « Card », padding : aucune variable Figma n’est reliée.', 'Layer « Card », gap : aucune variable associée.', 'Layer « Card », cornerRadius : aucune variable associée.',
    'Layer « Card », stroke weight : aucune variable associée.', 'Layer « Card » : il fixe minWidth sans variable Figma.', 'Layer « Card » : son vertical gap est réglé sur « Auto », donc Figma répartit lui-même l’espace.']) {
    assert.equal(element(titre), 'tailles', titre);
  }
  assert.equal(element('Layer « Card » : son fill n’est relié à aucune variable Figma.'), 'couleurs');
  assert.equal(element('Layer « Card » : son stroke n’est relié à aucune variable Figma.'), 'couleurs');
  assert.equal(element('Layer « Title », font size : aucune variable Figma n’est reliée.'), 'texte');
  assert.equal(element('Layer « Card », opacity : aucune variable associée.'), 'tokens');
  assert.equal(element('Style d’effets « Ombre », blur : aucune variable associée.'), 'tokens');
  assert.equal(element('Layer « Card », padding : certains côtés utilisent une variable introuvable.', 'C41'), 'tailles');
  assert.equal(element('Layer « Card », fill : variable introuvable : fills.', 'C41'), 'couleurs');
});

const idsDe = (points: readonly PointACorriger[], noeuds: Record<number, string[]> = {}): Map<string, string> => new Map(constatsDuMoteur(moteurAvec(points, noeuds)).map((constat) => [String(constat.faits.titre) + String(constat.faits.impact), constat.id]));
const sansRang = (id: string): boolean => !/:[0-9]+$/.test(id.replace(/^moteur:C[0-9]+:/, ''));

test('l’identifiant d’un point ne dépend ni de l’ordre des phrases, ni d’un rang quand les points se distinguent (Q-F89-21)', () => {
  const a = point('disposition', 'Layer « A » : il n’utilise pas d’auto layout.', { impact: 'Impact A.' });
  const b = point('disposition', 'Layer « B » : il n’utilise pas d’auto layout.', { impact: 'Impact B.' });
  const c = point('disposition', 'Layer « C » : il n’utilise pas d’auto layout.', { impact: 'Impact C.' });
  const avant = idsDe([a, b, c]);
  assert.deepEqual(idsDe([c, a, b]), avant);
  assert.ok([...avant.values()].every(sansRang), 'aucun suffixe de rang');
});

test('des phrases de même titre et mêmes nœuds gardent leur identifiant quand l’ordre change (N-84)', () => {
  const a = point('disposition', 'Layer « Card » : il n’utilise pas d’auto layout.', { impact: 'Impact A.' });
  const b = point('disposition', 'Layer « Card » : il n’utilise pas d’auto layout.', { impact: 'Impact B.' });
  const avant = idsDe([a, b]);
  assert.equal(new Set(avant.values()).size, 2);
  assert.deepEqual(idsDe([b, a]), avant);
});

test('deux titres de même empreinte gardent des identifiants uniques et stables d’un ordre à l’autre', () => {
  const collision = trouverUneCollisionDEmpreinte();
  assert.ok(collision, 'la collision se construit en moins de 200 000 essais');
  const [x, y] = collision.titres.map((titre) => point('disposition', titre));
  const avant = idsDe([x, y]);
  assert.equal(new Set(avant.values()).size, 2);
  assert.deepEqual(idsDe([y, x]), avant);
});

test('les éléments du point entrent dans son empreinte : deux listes différentes, deux identifiants sans rang', () => {
  const titre = 'Component Set « Card » : 2 propriétés ne sont pas documentées :';
  const un = point('imbriques', titre, { elements: ['size'], impact: 'Même impact.' });
  const deux = point('imbriques', titre, { elements: ['tone'], impact: 'Même impact.' });
  const ids = constatsDuMoteur(moteurAvec([un, deux])).map((constat) => constat.id);
  assert.equal(new Set(ids).size, 2);
  assert.ok(ids.every(sansRang));
});

const kit = (code: 'C25' | 'C29', champ: string, layer = 'l1'): Constat => ({ id: `${code}:${layer}:${champ}`, code, type: 'corriger', famille: code === 'C25' ? 'liaisons' : 'tailles', variants: ['v1'], layers: [layer], faits: { champ } });
const moteurC30 = (titre: string, layer = 'l1'): Constat => constatsDuMoteur(moteurAvec([point('variables', titre)], { 0: [layer] }))[0];

test('un point C30 tombe quand un C25 ou un C29 porte le même layer et le même champ (Q-F3-17, E5.8)', () => {
  const fond = moteurC30('Layer « Root », fills : aucune variable associée.');
  const marge = moteurC30('Layer « Root », padding : aucune variable Figma n’est reliée.');
  assert.deepEqual(sansLesDoublonsDuMoteur([fond, kit('C25', 'fills')]).map(({ code }) => code), ['C25']);
  assert.deepEqual(sansLesDoublonsDuMoteur([marge, kit('C29', 'paddingLeft')]).map(({ code }) => code), ['C29']);
});

test('le point C30 reste pour un autre layer, un autre champ ou sans équivalent du kit (opacité)', () => {
  const fond = moteurC30('Layer « Root », fills : aucune variable associée.');
  const opacite = moteurC30('Layer « Root », opacity : aucune variable associée.');
  assert.equal(sansLesDoublonsDuMoteur([fond, kit('C25', 'fills', 'l2')]).length, 2, 'autre layer');
  assert.equal(sansLesDoublonsDuMoteur([fond, kit('C25', 'strokes')]).length, 2, 'autre champ');
  assert.equal(sansLesDoublonsDuMoteur([opacite, kit('C25', 'fills')]).length, 2, 'opacité');
});

test('un C44 « aucune instance » tombe devant C43, et reste sans lui (Q-09)', () => {
  const aucune = constatsDuMoteur(moteurAvec([point('regles', 'Layer « .componentRules » : aucune instance de cette page n’écrit « Button » dans son calque « component-name ».')]))[0];
  const c43: Constat = { id: 'regles:C43', code: 'C43', type: 'corriger', famille: 'regles', variants: [], layers: [], faits: {} };
  assert.deepEqual(sansLesDoublonsDuMoteur([c43, aucune]).map(({ code }) => code), ['C43']);
  assert.deepEqual(sansLesDoublonsDuMoteur([aucune]).map(({ code }) => code), ['C44']);
});

test('ignorer le constat du kit ne fait pas revenir le point C30 du moteur (Q-F89-12)', async () => {
  const sortie = await chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, { ignorer: true });
  assert.deepEqual(sortie.constats.filter(({ code }) => code === 'C30'), []);
  const autre = await chaineAvecLePointDuMoteur({ operateur: 'Z1', code: 'C29', description: 'paddingLeft' }, { champ: 'itemSpacing' });
  assert.equal(autre.constats.filter(({ code }) => code === 'C30').length, 1, 'un autre champ du même layer garde son point');
});
