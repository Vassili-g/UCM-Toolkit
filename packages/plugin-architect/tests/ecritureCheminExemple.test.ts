/** La carte d'écriture montre le nom que la convention donne, pas le nom actuel de la variable. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { poserLeDom } from './domDeTest';

poserLeDom();

import { creerCarteDEcriture } from '../src/ui/nomenclature/ecriture';
import type { LigneDEcriture } from '../src/messages/nomenclature';

const PASCAL = { casse: 'PascalCase', separateur: 'camelCase' } as const;

test('le chemin d\'exemple d\'une rangée affiche le nom de la convention', () => {
  const carte = creerCarteDEcriture();
  const ligne: LigneDEcriture = {
    convention: PASCAL, suivent: 0, total: 1,
    exemple: { id: 'v', ancien: 'Color/Deep/light/50', nouveau: 'Color/Deep/Light/50', marques: [0, 1, 2], aussi: [] },
  };
  carte.poserLesLignes(ligne, ligne);
  const texte = carte.element.textContent;
  assert.ok(texte.includes('Color/Deep/Light/50'), texte);
  assert.ok(!texte.includes('Color/Deep/light/50'), texte);
});
