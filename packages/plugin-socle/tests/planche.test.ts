/** La galerie du socle : une planche des signaux, en clair, en sombre et sans variable servie. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { TYPES_D_ALERTE } from '@ucm-kit/core/referentiel';
// L'import de type met la source de la planche sous le contrôle de `npm run typecheck`.
import type { montrerLaPlanche } from '../galerie/planche/contenu';

const { construirePlanche } = require('../galerie/planche.cjs') as { construirePlanche: (racine: string) => void };

const _hote: Parameters<typeof montrerLaPlanche>[0] | null = null;
void _hote;

test('la planche est construite dans les trois modes, à la taille du cadre s-planche, avec le langage et les mots du kit', () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-planche-'));
  try {
    construirePlanche(racine);
    const sortie = path.join(racine, 'dist', 'galerie');
    for (const mode of ['clair', 'sombre', 'replis']) {
      const page = fs.readFileSync(path.join(sortie, mode, 'planche.html'), 'utf8');
      assert.ok(page.includes('.alerte {'), `${mode} : la feuille du langage`);
      assert.ok(page.includes('.planche-rangee'), `${mode} : les coques de la planche`);
      assert.ok(page.includes(mode === 'clair' ? '<html lang="fr" class="">' : '<html lang="fr" class="figma-dark">'), mode);
      for (const { libelle } of TYPES_D_ALERTE) assert.ok(page.includes(libelle), `${mode} : « ${libelle} » vient du kit`);
      assert.ok(fs.readFileSync(path.join(sortie, mode, 'planche-1.html'), 'utf8').includes('width: 640px; height: 1900px'), mode);
    }
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
});
