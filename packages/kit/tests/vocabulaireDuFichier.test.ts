import assert from 'node:assert/strict';
import test from 'node:test';
import { indexerVocabulaire, type VocabulaireDuFichier } from '../src/referentiel/index.js';

const vide: VocabulaireDuFichier = { personnalises: [], ecartsUcm: [] };

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
    { terme: ['border', 'radius'], remplace: [['corner', 'size']] },
  ] });
  const mots = ['PRESS', 'Press', 'Corner', 'Size', 'CORNER', 'SIZE'];
  assert.deepEqual(index.remplacements(mots, 'variables').map((remplacement) => remplacement.par), [
    ['PRESSED'], ['Pressed'], ['Border', 'Radius'], ['BORDER', 'RADIUS'],
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
