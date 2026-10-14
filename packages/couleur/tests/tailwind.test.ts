/** Le préréglage Tailwind ([MOT-18] à [MOT-20], [MOT-36]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RELEVE_TAILWIND,
  ecartAngulaire,
  lireHexa,
  prereglageTailwind,
  rgb8VersOklch,
  teinteA,
  type RampeDeDerive,
} from '../src/index';

const BOUTS = { clair: 0.975, sombre: 0.27 };

/** Une rampe à deux crans, dont les teintes sont celles du premier et du dernier cran. */
const rampe = (nom: string, teinteClaire: number, teinteSombre: number): RampeDeDerive => ({ nom, crans: [[0.9, teinteClaire], [0.3, teinteSombre]] });

test('le relevé par défaut porte les dix-sept rampes colorées de Tailwind, onze crans chacune', () => {
  assert.equal(RELEVE_TAILWIND.length, 17);
  assert.equal(new Set(RELEVE_TAILWIND.map(({ nom }) => nom)).size, 17);
  for (const { nom, crans } of RELEVE_TAILWIND) {
    assert.equal(crans.length, 11, nom);
    assert.ok(crans.every(([L, H], rang) => L > 0 && L < 1 && H >= 0 && H < 360 && (rang === 0 || L < crans[rang - 1][0])), nom);
  }
  assert.equal(RELEVE_TAILWIND.some(({ nom }) => ['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(nom)), false);
});

test('l’écart angulaire prend le plus court chemin', () => {
  assert.equal(ecartAngulaire(343.198, 3.907).toFixed(3), '20.709');
  assert.equal(ecartAngulaire(10, 350), -20);
  assert.equal(ecartAngulaire(0, 180), -180);
});

test('[MOT-18] une couleur sans teinte rend deux dérives nulles, une référence terne garde la sienne', () => {
  assert.deepEqual(prereglageTailwind(rgb8VersOklch(lireHexa('#808080')!), BOUTS), { clair: 0, sombre: 0 });
  // #7C717B et #6B7280, chroma 0,020 et 0,026 : leur teinte se lit à 6° près, leur dérive se calcule.
  for (const reference of ['#7C717B', '#6B7280']) {
    assert.notDeepEqual(prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), BOUTS), { clair: 0, sombre: 0 }, reference);
  }
});

test('[MOT-36] la dérive se lit aux deux bouts des rampes voisines', () => {
  // Valeurs de `deriveAuxBouts` du prototype de la recette critique, sur le relevé par défaut et ces bouts.
  const attendu: Record<string, { clair: number; sombre: number }> = {
    '#F59E0B': { clair: 25.36, sombre: -24.44 }, // amber-500
    '#EAB308': { clair: 17, sombre: -32.24 }, // yellow-500
    '#3B82F6': { clair: -5.21, sombre: 8.13 }, // blue-500
    '#EC4899': { clair: -11.11, sombre: 9.6 }, // pink-500
    '#10B981': { clair: 3.17, sombre: 9.82 }, // emerald-500
  };
  for (const [reference, derive] of Object.entries(attendu)) {
    assert.deepEqual(prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), BOUTS), derive, reference);
  }
});

test('[MOT-36] une référence au cran 500 d’une rampe en suit la teinte à 12,5° près, sur les onze crans', () => {
  for (const { nom, crans } of RELEVE_TAILWIND) {
    const [L, H] = crans[5];
    const reference = { L, C: 0.15, H };
    const derive = prereglageTailwind(reference, BOUTS);
    for (const [clarte, teinte] of crans) {
      const ecart = Math.abs(ecartAngulaire(teinteA(clarte, reference, derive, BOUTS), teinte));
      assert.ok(ecart <= 12.5, `${nom} à L ${clarte} : ${ecart.toFixed(2)}°`);
    }
  }
});

test('[MOT-20] un relevé passé en paramètre remplace celui par défaut', () => {
  const reference = { L: 0.6, C: 0.1, H: 90 };
  const releve = [rampe('a', 0, 0), rampe('b', 180, 180)];
  assert.deepEqual(prereglageTailwind(reference, BOUTS, releve), { clair: 0, sombre: 0 });
});
