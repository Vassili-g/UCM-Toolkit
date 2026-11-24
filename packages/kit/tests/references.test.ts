/**
 * La forme d'une référence de token.
 *
 * Ces cas vivaient dans `tokensUsed.test.ts` du plugin, à côté de la copie de
 * la regex qui s'y trouvait. Ils suivent la définition : elle est maintenant
 * unique, et son test avec elle. Les deux autres copies (le validateur du kit,
 * le `tokenVar` du repo consommateur) se contentaient de la même forme sans
 * qu'aucun test ne le vérifie ; c'est cette absence de test d'accord qui rendait
 * la divergence possible sans qu'elle se voie.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REFERENCE_DE_PREMIER_NIVEAU,
  cheminDeReference,
  isTokenReference,
  referencesDansUnTexte,
  refPath,
  toRef,
} from '../src/format/references';

test('une référence se reconnaît à la chaîne entière, jamais dans une phrase', () => {
  assert.equal(isTokenReference('{components.button.sizes.medium.gap}'), true);
  // Un avertissement cite des tokens : il ne devient pas une référence pour autant.
  assert.equal(isTokenReference('Icône « star » : taille {a.base} puis {a.lg}.'), false);
  // Un nom de style de texte reste une chaîne nue, hors de l'index.
  assert.equal(isTokenReference('heading.large'), false);
  // Un seul segment ne suffit pas : une référence désigne un chemin.
  assert.equal(isTokenReference('{sansPoint}'), false);
  // Ni espace ni accolade interne, sans quoi une phrase courte passerait.
  assert.equal(isTokenReference('{a.b c}'), false);
  assert.equal(isTokenReference('{a.{b}}'), false);
  assert.equal(isTokenReference(42), false);
  assert.equal(isTokenReference(undefined), false);
});

test('toRef et refPath sont exactement inverses, et refPath ne déballe rien d’autre', () => {
  const chemin = 'components.button.default.background';
  assert.equal(toRef(chemin), `{${chemin}}`);
  assert.equal(refPath(toRef(chemin)), chemin);
  // Ce qui n'est pas une référence traverse intact : sans cette clause,
  // « border} » deviendrait le dernier segment d'un token qui n'existe pas.
  assert.equal(refPath('heading.large'), 'heading.large');
  assert.equal(refPath('{sansPoint}'), '{sansPoint}');
});

test('T1 : une chaîne reçoit la même réponse de la référence complète, du texte et du chemin', () => {
  const attendu: [string, boolean, string | null][] = [
    ['{a b.c}', false, null],
    ['{a.b }', false, null],
    ['{$a.b}', true, '$a.b'],
    ['{a.`b}', true, 'a.`b'],
    ['{a.b$}', true, 'a.b$'],
    ['{marque}', false, 'marque'],
    ['{a.b}', true, 'a.b'],
  ];
  for (const [chaine, complete, chemin] of attendu) {
    assert.equal(isTokenReference(chaine), complete, chaine);
    assert.equal(referencesDansUnTexte().exec(chaine)?.[0] === chaine, complete, `${chaine} dans un texte`);
    assert.equal(cheminDeReference(chaine), chemin, `${chaine} comme chemin`);
  }
  assert.equal(REFERENCE_DE_PREMIER_NIVEAU.test('{marque}'), true);
  assert.equal(REFERENCE_DE_PREMIER_NIVEAU.test('{a.b}'), false);
});

test('T1 : dans un texte, `${a.b}` ouvre l’interpolation d’un gabarit et ne cite aucun token', () => {
  assert.deepEqual('un {a.b} puis `${c.d}` puis {e.f}'.match(referencesDansUnTexte()), ['{a.b}', '{e.f}']);
  const globale = referencesDansUnTexte();
  assert.equal(globale.global, true);
  assert.notEqual(globale, referencesDansUnTexte());
});
