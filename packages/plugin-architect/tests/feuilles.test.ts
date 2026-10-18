/** Les choix de la fiche d'un terme : sa forme, les termes envoyés et la proposition faite à UCM. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { FicheVue } from '../src/messages';
import { motsSaisis, sorteDeFiche, termeProposeAUcm, termesDuReferentiel, termesRemplaces, texteDeLaProposition } from '../src/ui/feuilles';

const FICHE: FicheVue = {
  mot: 'outlined',
  origine: 'personnalise',
  categorieUcm: null,
  definition: 'Bordure sans fond.',
  remplace: [
    { mot: 'outline', nombre: 8, ucm: false },
    { mot: 'stroked', nombre: 2, ucm: false },
  ],
  emploi: { nombre: 24, exemples: [] },
  ecart: false,
  voulu: false,
  distincts: [],
  question: null,
};

test('la fiche suit l’origine du terme, et un terme remplacé ne se modifie pas', () => {
  assert.equal(sorteDeFiche({ avec: null }, { origine: 'ucm' }), 'ucm');
  assert.equal(sorteDeFiche({ avec: null }, { origine: 'personnalise' }), 'personnalise');
  assert.equal(sorteDeFiche({ avec: null }, { origine: null }), 'sans-regle');
  assert.equal(sorteDeFiche({ avec: 'pressed' }, { origine: 'ucm' }), 'remplace');
  assert.equal(sorteDeFiche({ avec: 'outlined' }, { origine: 'personnalise' }), 'remplace');
});

test('la saisie se découpe en termes en minuscules, sans doublon', () => {
  assert.deepEqual(motsSaisis('Press, pressing ;press  Tap'), ['press', 'pressing', 'tap']);
  assert.deepEqual(motsSaisis('  , ; '), []);
});

test('les termes envoyés gardent ceux que le fichier a ajoutés et laissent ceux d’UCM', () => {
  const ucm = { remplace: [{ mot: 'press', nombre: 60, ucm: true }, { mot: 'tapped', nombre: 1, ucm: false }] };
  assert.deepEqual(termesRemplaces(ucm, ['pressing', 'tapped']), ['tapped', 'pressing']);
  assert.deepEqual(termesRemplaces({ remplace: [] }, ['bg']), ['bg']);
});

test('la proposition à UCM a la forme d’un terme du référentiel', () => {
  assert.deepEqual(termeProposeAUcm(FICHE), {
    id: 'outlined',
    toleres: ['outline', 'stroked'],
    libelle: { fr: 'outlined', en: 'outlined' },
    definition: { fr: 'Bordure sans fond.', en: '' },
  });
  assert.deepEqual(JSON.parse(texteDeLaProposition(FICHE)), termeProposeAUcm(FICHE));
});

test('un terme sans définition ni terme remplacé garde un texte complet, sans clé `toleres`', () => {
  const terme = termeProposeAUcm({ mot: 'tile-link', definition: null, remplace: [] });
  assert.deepEqual(terme, { id: 'tile-link', libelle: { fr: 'tile-link', en: 'tile-link' }, definition: { fr: '', en: '' } });
  assert.equal('toleres' in terme, false);
});

test('les suggestions de « Remplacer par… » sont les termes du référentiel, sans les crans', () => {
  const termes = termesDuReferentiel();
  assert.ok(termes.includes('pressed') && termes.includes('background'));
  assert.ok(!termes.includes('500'));
  assert.deepEqual(termes, [...new Set(termes)].sort());
});
