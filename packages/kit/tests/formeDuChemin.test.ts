/** `formeDuChemin` est la forme qu'on compare pour un chemin de variable : chaque segment passe par `formeReconnue`. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { formeDuChemin, formeReconnue } from '../src/referentiel/index.js';

test('deux écritures du même chemin ont la même forme', () => {
  assert.equal(formeDuChemin('Primary/Solid/Default'), formeDuChemin('primary/solid/default'));
  assert.equal(formeDuChemin('Neutral/Page/ForegroundMain'), 'neutral/page/foreground-main');
  assert.equal(formeDuChemin('neutral/page/foreground_main'), 'neutral/page/foreground-main');
});

test('un tableau de segments donne la forme du nom joint', () => {
  const segments = ['Primary', 'Solid', 'Default'];
  assert.equal(formeDuChemin(segments), formeDuChemin(segments.join('/')));
  assert.equal(formeDuChemin([]), '');
});

test('un nom d’un segment est la forme de ce segment', () => {
  assert.equal(formeDuChemin('Icon-Button'), formeReconnue('Icon-Button'));
  assert.equal(formeDuChemin(['Icon-Button']), 'icon-button');
});

test('un segment vide ou sans mot reste en place', () => {
  assert.equal(formeDuChemin(''), '');
  assert.equal(formeDuChemin('a//b'), 'a//b');
  assert.equal(formeDuChemin('a/-_ /b'), 'a//b');
});
