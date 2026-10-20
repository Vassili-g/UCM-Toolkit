// Chaque porte publique du kit (clé de `exports`) apparaît dans son README, sous la forme `@ucm-kit/core/<porte>`.
// `./package.json` est exclue : elle n'est pas une API, elle sert aux outils qui lisent la version du paquet.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');

test('chaque porte publique du kit est décrite dans son README', () => {
  const { exports: portes } = JSON.parse(lire('../packages/kit/package.json'));
  const readme = lire('../packages/kit/README.md');
  const attendues = Object.keys(portes).filter((cle) => cle !== './package.json');
  assert.ok(attendues.length > 0);
  const absentes = attendues.filter((cle) => !readme.includes(`@ucm-kit/core/${cle.slice(2)}`));
  assert.deepEqual(absentes, [], `portes absentes du README du kit : ${absentes.join(', ')}`);
});
