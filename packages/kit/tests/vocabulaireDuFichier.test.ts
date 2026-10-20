import assert from 'node:assert/strict';
import test from 'node:test';
import { indexerVocabulaire, type VocabulaireDuFichier } from '../src/referentiel/index.js';

const vide: VocabulaireDuFichier = { personnalises: [], ecartsUcm: [] };

test('les tailles changent de forme selon la catégorie et gardent le même écart UCM', () => {
  const { index, conflits } = indexerVocabulaire(vide);
  assert.deepEqual(conflits, []);
  const mots = ['SM', 'Md', 'lg', 'big', 'small', 'medium', 'large'];
  assert.deepEqual(index.remplacements(mots, 'groupes').map(({ par }) => par), [['SMALL'], ['Medium'], ['large'], ['large']]);
  assert.deepEqual(index.remplacements(mots, 'variables').map(({ par }) => par), [['lg'], ['sm'], ['md'], ['lg']]);
  const sansLarge = indexerVocabulaire({ ...vide, ecartsUcm: ['lg'] }).index;
  assert.deepEqual(sansLarge.remplacements(['lg', 'large', 'big'], 'groupes'), []);
  assert.deepEqual(sansLarge.remplacements(['lg', 'large', 'big'], 'variables'), []);
});

test('les formes tolérées UCM se remplacent, sans réécrire un identifiant retenu', () => {
  const { index, conflits } = indexerVocabulaire(vide);
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['press', 'pressed', 'disable', 'danger'], 'variables'), [
    { debut: 0, fin: 1, par: ['pressed'], origine: 'ucm', cle: 'terme:pressed' },
    { debut: 2, fin: 3, par: ['disabled'], origine: 'ucm', cle: 'terme:disabled' },
  ]);
  assert.deepEqual(index.remplacements(['status', 'states'], 'variables'), []);
  assert.deepEqual(index.remplacements(['status', 'states'], 'proprietes'), [
    { debut: 0, fin: 1, par: ['state'], origine: 'ucm', cle: 'terme:state' },
    { debut: 1, fin: 2, par: ['state'], origine: 'ucm', cle: 'terme:state' },
  ]);
});

test('un écart UCM retire ses formes tolérées et laisse agir le terme personnalisé', () => {
  const { index, conflits } = indexerVocabulaire({
    ecartsUcm: ['pressed'],
    personnalises: [{ terme: ['held'], remplace: [['press']] }],
  });
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['press'], 'variables'), [
    { debut: 0, fin: 1, par: ['held'], origine: 'personnalise', cle: 'terme:held' },
  ]);
  assert.deepEqual(index.remplacements(['disable'], 'variables')[0]?.par, ['disabled']);
});

test('le terme le plus long gagne, sans chevauchement, et les positions restent ordonnées', () => {
  const { index, conflits } = indexerVocabulaire({
    ...vide,
    personnalises: [
      { terme: ['compact'], remplace: [['mini']] },
      { terme: ['extra', 'compact'], remplace: [['extra', 'mini']] },
    ],
  });
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['mini', 'extra', 'mini', 'mini'], 'variables'), [
    { debut: 0, fin: 1, par: ['compact'], origine: 'personnalise', cle: 'terme:compact' },
    { debut: 1, fin: 3, par: ['extra', 'compact'], origine: 'personnalise', cle: 'terme:extra-compact' },
    { debut: 3, fin: 4, par: ['compact'], origine: 'personnalise', cle: 'terme:compact' },
  ]);
});

test('les remplacements conservent les capitales, la majuscule initiale et les entrées', () => {
  const { index } = indexerVocabulaire({ ...vide, personnalises: [
    { terme: ['stroke', 'weight'], remplace: [['corner', 'size']] },
  ] });
  const mots = ['PRESS', 'Press', 'Corner', 'Size', 'CORNER', 'SIZE'];
  assert.deepEqual(index.remplacements(mots, 'variables').map((remplacement) => remplacement.par), [
    ['PRESSED'], ['Pressed'], ['Stroke', 'Weight'], ['STROKE', 'WEIGHT'],
  ]);
  assert.deepEqual(mots, ['PRESS', 'Press', 'Corner', 'Size', 'CORNER', 'SIZE']);
});

test('remplacer un identifiant ou un alias UCM retenu contredit sa cible', () => {
  const { conflits } = indexerVocabulaire({ ...vide, personnalises: [
    { terme: ['custom'], remplace: [['pressed'], ['press'], ['font', 'family']] },
  ] });
  assert.deepEqual(conflits, [
    { type: 'contredit-ucm', terme: ['custom'], remplace: ['pressed'], termeUcm: ['pressed'] },
    { type: 'contredit-ucm', terme: ['custom'], remplace: ['press'], termeUcm: ['pressed'] },
    { type: 'contredit-ucm', terme: ['custom'], remplace: ['font', 'family'], termeUcm: ['font', 'family'] },
  ]);
});

test('une forme envoyée vers deux termes est signalée et la première règle garde la priorité', () => {
  const { index, conflits } = indexerVocabulaire({ ...vide, personnalises: [
    { terme: ['first'], remplace: [['source'], ['source']] },
    { terme: ['second'], remplace: [['source']] },
    { terme: ['other'], remplace: [['press']] },
  ] });
  assert.deepEqual(conflits, [
    { type: 'deja-remplace', remplace: ['source'], par: ['second'] },
    { type: 'contredit-ucm', terme: ['other'], remplace: ['press'], termeUcm: ['pressed'] },
  ]);
  assert.deepEqual(index.remplacements(['source', 'press'], 'variables').map((remplacement) => remplacement.par), [['first'], ['pressed']]);
});

test('un terme personnalisé peut enrichir la cible UCM sans détourner son alias', () => {
  const { index, conflits } = indexerVocabulaire({ ...vide, personnalises: [
    { terme: ['pressed'], remplace: [['held'], ['press']] },
  ] });
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['held', 'press'], 'variables').map((remplacement) => [remplacement.par, remplacement.origine]), [
    [['pressed'], 'personnalise'], [['pressed'], 'ucm'],
  ]);
});

test('un cycle de termes personnalisés est signalé une fois', () => {
  const { conflits } = indexerVocabulaire({ ...vide, personnalises: [
    { terme: ['alpha'], remplace: [['gamma']] },
    { terme: ['beta'], remplace: [['alpha']] },
    { terme: ['gamma'], remplace: [['beta']] },
  ] });
  assert.deepEqual(conflits, [{ type: 'cycle', termes: [['gamma'], ['alpha'], ['beta']] }]);
});

function paresDe(vocabulaire: VocabulaireDuFichier, mots: readonly string[]): (readonly string[])[] {
  return indexerVocabulaire(vocabulaire).index.remplacements(mots, 'variables').map(({ par }) => par);
}

test('une chaîne de règles se résout en un passage, puis le résultat ne bouge plus', () => {
  const vocabulaire: VocabulaireDuFichier = { ...vide, personnalises: [
    { terme: ['bar'], remplace: [['foo']] },
    { terme: ['baz'], remplace: [['bar']] },
  ] };
  const { index, conflits } = indexerVocabulaire(vocabulaire);
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['foo'], 'variables'), [
    { debut: 0, fin: 1, par: ['baz'], origine: 'personnalise', cle: 'terme:bar' },
  ]);
  assert.deepEqual(paresDe(vocabulaire, ['baz']), []);
});

test('une chaîne de trois règles se résout vers la dernière cible', () => {
  const vocabulaire: VocabulaireDuFichier = { ...vide, personnalises: [
    { terme: ['bar'], remplace: [['foo']] },
    { terme: ['baz'], remplace: [['bar']] },
    { terme: ['zed'], remplace: [['baz']] },
  ] };
  assert.deepEqual(indexerVocabulaire(vocabulaire).conflits, []);
  assert.deepEqual(paresDe(vocabulaire, ['foo', 'bar', 'baz', 'zed']), [['zed'], ['zed'], ['zed']]);
});

test('une cible de plusieurs mots qui contient une source est résolue mot à mot', () => {
  const vocabulaire: VocabulaireDuFichier = { ...vide, personnalises: [
    { terme: ['bar', 'quux'], remplace: [['foo']] },
    { terme: ['zed'], remplace: [['bar']] },
  ] };
  const { index, conflits } = indexerVocabulaire(vocabulaire);
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['foo'], 'variables'), [
    { debut: 0, fin: 1, par: ['zed', 'quux'], origine: 'personnalise', cle: 'terme:bar-quux' },
  ]);
});

test('une cible qui contient une forme tolérée UCM reçoit le terme UCM, avec le cle de la première règle', () => {
  const vocabulaire: VocabulaireDuFichier = { ...vide, personnalises: [{ terme: ['bg', 'color'], remplace: [['foo']] }] };
  const { index, conflits } = indexerVocabulaire(vocabulaire);
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['foo'], 'variables'), [
    { debut: 0, fin: 1, par: ['background', 'color'], origine: 'personnalise', cle: 'terme:bg-color' },
  ]);
});

test('un terme UCM de plusieurs mots dans une cible reste entier', () => {
  const vocabulaire: VocabulaireDuFichier = { ...vide, personnalises: [
    { terme: ['font', 'family'], remplace: [['foo']] },
    { terme: ['typeface'], remplace: [['font']] },
  ] };
  const { index, conflits } = indexerVocabulaire(vocabulaire);
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['foo'], 'variables').map(({ par }) => par), [['font', 'family']]);
  assert.deepEqual(index.remplacements(['font'], 'variables').map(({ par }) => par), [['typeface']]);
});

test('un cycle partiel est signalé et la règle garde sa cible', () => {
  const vocabulaire: VocabulaireDuFichier = { ...vide, personnalises: [
    { terme: ['bar', 'quux'], remplace: [['foo']] },
    { terme: ['foo'], remplace: [['bar']] },
  ] };
  const { index, conflits } = indexerVocabulaire(vocabulaire);
  assert.deepEqual(conflits, [{ type: 'cycle', termes: [['foo'], ['bar']] }]);
  assert.deepEqual(paresDe(vocabulaire, ['foo']), [['bar', 'quux']]);
  assert.deepEqual(index.remplacements(['bar'], 'variables').map(({ par }) => par), [['foo']]);
});

test('une règle dont la cible contient sa propre source est un cycle', () => {
  const { conflits } = indexerVocabulaire({ ...vide, personnalises: [{ terme: ['foo', 'color'], remplace: [['foo']] }] });
  assert.deepEqual(conflits, [{ type: 'cycle', termes: [['foo']] }]);
});

test('une règle qui dépend d’un cycle est refusée sans signaler le cycle deux fois', () => {
  const { conflits } = indexerVocabulaire({ ...vide, personnalises: [
    { terme: ['bar'], remplace: [['alpha']] },
    { terme: ['gamma'], remplace: [['bar']] },
    { terme: ['bar'], remplace: [['gamma']] },
  ] });
  assert.deepEqual(conflits, [{ type: 'cycle', termes: [['bar'], ['gamma']] }]);
});

test('une cible qui est elle-même une forme tolérée UCM prend le terme UCM de la catégorie', () => {
  const { index, conflits } = indexerVocabulaire({ ...vide, personnalises: [{ terme: ['border', 'radius'], remplace: [['corner', 'size']] }] });
  assert.deepEqual(conflits, []);
  assert.deepEqual(index.remplacements(['corner', 'size'], 'variables').map(({ par }) => par), [['radius']]);
});
