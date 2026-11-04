/** Les glyphes des cartes viennent du kit : chaque nom vise un pictogramme du kit, et chaque rôle de forme a sa règle dans la feuille. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { SIGNES } from '@ucm-kit/core/referentiel';

import { CLASSES_DES_ROLES, SIGNES_DES_GLYPHES } from '../src/ui/glyphes';

const feuille = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'ui', 'styles.css'), 'utf8');

test('chaque glyphe de carte est un pictogramme de la famille pictogramme-palettes du kit', () => {
  assert.equal(SIGNES_DES_GLYPHES.length, 11);
  for (const id of SIGNES_DES_GLYPHES) assert.equal(SIGNES.find((signe) => signe.id === id)?.famille, 'pictogramme-palettes', id);
  assert.deepEqual(
    SIGNES.filter((signe) => signe.famille === 'pictogramme-palettes').map((signe) => signe.id),
    [...SIGNES_DES_GLYPHES],
    'le kit ne porte aucun pictogramme que le plugin ne pose pas',
  );
});

test('les rôles des tracés du kit sont ceux que le plugin déclare, et la feuille peint chacun', () => {
  const posees = new Set<string>();
  for (const signe of SIGNES.filter((candidat) => candidat.famille === 'pictogramme-palettes')) {
    for (const [, classe] of signe.trace.matchAll(/class="([^"]+)"/g)) posees.add(classe!);
  }
  assert.deepEqual([...posees].sort(), [...CLASSES_DES_ROLES].sort());
  for (const classe of CLASSES_DES_ROLES) assert.match(feuille, new RegExp(`\\.${classe}\\b`), classe);
});

test('chaque rôle sans cerne ou à bouts droits annule le trait que le svg du kit pose', () => {
  for (const signe of SIGNES.filter((candidat) => candidat.famille === 'pictogramme-palettes')) {
    for (const [forme] of signe.trace.matchAll(/<[a-z]+ [^>]*\/>/g)) {
      if (/class="glyphe-(aplat|aplat-pale|aplat-marque|losange)"/.test(forme)) assert.match(forme, /stroke="none"/, `${signe.id} : ${forme}`);
      if (/class="glyphe-axe"/.test(forme)) assert.match(forme, /stroke-linecap="butt"/, `${signe.id} : ${forme}`);
    }
  }
});
