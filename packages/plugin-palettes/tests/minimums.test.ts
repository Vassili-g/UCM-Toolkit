/** L'aide des minimums de contraste dit ce que le minimum du texte fait aux rampes (PP-403). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { intensitesDe, rampeDe, rampesDe, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { nouvellePalette } from '../src/edition';
import { TEXTES_DE_CONFIGURATION as aideEn } from '../src/i18n/en';
import { TEXTES_DE_CONFIGURATION as aideFr } from '../src/i18n/fr';

/** Les couleurs de chaque rampe de la palette, par intensité, thème et numéro. */
function couleursDesRampes(recette: Recette, palette: Palette): string[] {
  const rampes = rampesDe(recette, palette);
  return intensitesDe(palette).flatMap((intensite) => (['light', 'dark'] as const)
    .flatMap((mode) => rampeDe(rampes, intensite)[mode].map((cran, rang) => `${intensite}/${mode}/${recette.crans[rang]}:${cran.hexa}`)));
}

test('Y3 : quand le minimum du texte déplace des nuances, l’aide le dit en français et en anglais', () => {
  const vide = recetteParDefaut();
  let nuancesChangees = 0;
  for (const [rang, reference] of ['#1E6FD9', '#64748B', '#16A34A'].entries()) {
    const palette = nouvellePalette(vide, `p-0000000${rang}`, reference, 2)!;
    const base: Recette = { ...vide, palettes: [palette] };
    const avant = couleursDesRampes(base, palette);
    const apres = couleursDesRampes({ ...base, seuils: { ...base.seuils, texte: 7 } }, palette);
    nuancesChangees += avant.filter((couleur, place) => couleur !== apres[place]).length;
  }
  assert.ok(nuancesChangees > 0, 'le minimum du texte à 7 déplace des nuances');
  assert.match(aideFr.aideMinimums, /Le minimum du texte déplace les nuances de texte jusqu’à ce qu’elles l’atteignent\./);
  assert.match(aideFr.aideMinimums, /Le minimum des éléments graphiques ne change que le résultat des garanties\./);
  assert.match(aideFr.aideMinimums, /Aucun minimum ne descend sous le niveau AA\.$/);
  assert.equal(
    aideEn.aideMinimums,
    'The text minimum moves text shades until they reach it. The graphics minimum only changes guarantee results. No minimum goes below the AA level.',
  );
});
