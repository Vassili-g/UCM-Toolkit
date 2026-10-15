/** La palette figée posée sur les réglages que la reprise trouve : la liste de la recette ne se range pas. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { clarteSelonLaTeinte, rampesDe, reconstruireLesReglages, recetteParDefaut, type Palette } from 'ucm-couleur';

import { paletteReglee } from '../src/ui/paletteReglee';

const RECETTE = recetteParDefaut();
const CONSTANTE = { clair: 0, sombre: 0, origine: 'constante' as const };

/** Une palette à deux intensités sans réglage, dont la teinte reçoit une clarté selon la teinte non nulle. */
const ORIGINALE: Palette = { id: 'p-0000000a', nom: 'Poppy', reference: '#8D6127', derive: { lien: true, soft: CONSTANTE, vivid: CONSTANTE } };

function figee(palette: Palette, crans: readonly number[]): Palette {
  const rampes = rampesDe(RECETTE, palette);
  const couleurs = (profil: 'soft' | 'vivid') => ({
    light: rampes[profil]!.light.map((cran) => cran.hexa),
    dark: rampes[profil]!.dark.map((cran) => cran.hexa),
  });
  return { id: palette.id, nom: palette.nom, reference: palette.reference, crans, derive: palette.derive, figees: { soft: couleurs('soft'), vivid: couleurs('vivid') } };
}

test('une liste identique à celle de la recette rend la palette sans crans, et ses rampes sont les couleurs reprises', async () => {
  assert.notEqual(clarteSelonLaTeinte(RECETTE, ORIGINALE).clair, 0, 'la palette ne montre pas la clarté selon la teinte');
  const reprise = figee(ORIGINALE, RECETTE.crans);
  const trouve = await reconstruireLesReglages(RECETTE, { crans: reprise.crans!, figees: reprise.figees!, reference: reprise.reference });
  assert.ok(trouve);
  assert.equal(trouve.ecart, 0);

  const reglee = paletteReglee(RECETTE, reprise, trouve.reglages);
  assert.equal(reglee.crans, undefined);
  assert.equal(reglee.figees, undefined);
  assert.equal(reglee.id, ORIGINALE.id);
  assert.equal(reglee.nom, ORIGINALE.nom);
  const rampes = rampesDe(RECETTE, reglee);
  const voulues = rampesDe(RECETTE, reprise);
  for (const profil of ['soft', 'vivid'] as const) {
    for (const mode of ['light', 'dark'] as const) {
      assert.deepEqual(rampes[profil]![mode].map((cran) => cran.hexa), voulues[profil]![mode].map((cran) => cran.hexa), `${profil} ${mode}`);
    }
  }
});

test('une autre liste de nuances reste sur la palette', () => {
  const crans = [100, 300, 500, 700, 900];
  const reprise: Palette = { ...ORIGINALE, crans };
  const reglee = paletteReglee(RECETTE, reprise, { reference: '#8D6127', derive: ORIGINALE.derive });
  assert.deepEqual(reglee.crans, crans);
  assert.equal(reglee.figees, undefined);
});
