/** Le préréglage Tailwind ([MOT-18] à [MOT-20]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RELEVE_TAILWIND,
  deriveTailwind,
  ecartAngulaire,
  lireHexa,
  prereglageTailwind,
  rgb8VersOklch,
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

test('à la teinte claire d’une rampe du relevé, la dérive totale est celle de cette rampe', () => {
  for (const { nom, crans } of RELEVE_TAILWIND) {
    const clair = crans[0][1];
    const sombre = crans[crans.length - 1][1];
    const obtenu = deriveTailwind(clair);
    assert.ok(Math.abs(obtenu - ecartAngulaire(clair, sombre)) < 1e-9, `${nom} : ${obtenu}`);
  }
});

test('entre pink et rose, l’interpolation passe par 0°', () => {
  // pink 343,2° dérive de +20,71 ; rose 12,42° de -0,33.
  const auMilieu = deriveTailwind((343.2 + 12.42 + 360) / 2 % 360);
  assert.ok(Math.abs(auMilieu - (20.71 + -0.33) / 2) < 1e-3, `${auMilieu}`);
});

test('[MOT-18] une couleur sans teinte rend deux dérives nulles, une référence terne garde la sienne', () => {
  assert.deepEqual(prereglageTailwind(rgb8VersOklch(lireHexa('#808080')!), BOUTS), { clair: 0, sombre: 0 });
  // #7C717B et #6B7280, chroma 0,020 et 0,026 : leur teinte se lit à 6° près, leur dérive se calcule.
  for (const reference of ['#7C717B', '#6B7280']) {
    assert.notDeepEqual(prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), BOUTS), { clair: 0, sombre: 0 }, reference);
  }
});

test('[MOT-19] la dérive totale se répartit selon la place de la référence dans la rampe', () => {
  const totale = 20;
  const releve = [rampe('a', 0, 20), rampe('b', 180, 200)];
  const reference = (L: number) => ({ L, C: 0.1, H: 90 });
  // Une référence au bout clair reçoit toute la dérive du côté sombre, et l'inverse.
  assert.deepEqual(prereglageTailwind(reference(0.975), BOUTS, releve), { clair: 0, sombre: totale });
  assert.deepEqual(prereglageTailwind(reference(0.27), BOUTS, releve), { clair: -totale, sombre: 0 });
  assert.deepEqual(prereglageTailwind(reference(0.99), BOUTS, releve), { clair: 0, sombre: totale });
});

test('[MOT-20] un relevé passé en paramètre remplace celui par défaut', () => {
  const reference = { L: 0.6, C: 0.1, H: 90 };
  const releve = [rampe('a', 0, 0), rampe('b', 180, 180)];
  assert.deepEqual(prereglageTailwind(reference, BOUTS, releve), { clair: 0, sombre: 0 });
});
