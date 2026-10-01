/** Les alertes de la section 11.3 ([VER-08], [VER-10], [VER-11], [ENT-06], [ENT-09]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CRANS_DES_EMPLOIS,
  aDesProfilsTernes,
  alertesDePalette,
  alertesDeRecette,
  confusionsDe,
  distanceDePalettes,
  rangsDesEmplois,
  recetteParDefaut,
  severiteDeLAlerte,
  type Alerte,
  type Palette,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-0000000a', '#1E6FD9');
const codes = (alertes: Alerte[]) => alertes.map((a) => a.code);
const dePalette = (palette: Palette) => alertesDePalette(recetteAvec(palette), palette);

test('[VER-08] profils confondus : sonne au cran 100 clair de #1E6FD9, avec la mesure et le seuil', () => {
  const alerte = dePalette(BLEU).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans.map(({ mode, cran }) => `${mode} ${cran}`), ['light 100']);
  assert.ok(alerte.crans[0].distance < alerte.seuil);
  assert.equal(alerte.seuil, 0.02);
});

test('[VER-11] profils confondus : ne regarde que les crans de la table des emplois, états +1 et +2 compris', () => {
  const recette = recetteParDefaut();
  // Le quatrième rang vise 400, que `surface+2` n'atteint pas, et 950, où les profils se confondent comme à la 50.
  assert.deepEqual(rangsDesEmplois(recette).map((rang) => recette.crans[rang]), CRANS_DES_EMPLOIS.filter((cran) => cran !== 400 && cran !== 950));
});

test('[ENT-09] profils confondus : se tait pour des profils ternes par construction, sonne pour les mêmes parts du designer', () => {
  // #78716C, sous la part commune de Soft : ses deux profils se confondent sur dix nuances sur onze.
  const terne = paletteTailwind('p-0000000c', '#78716C');
  const recette = recetteAvec(terne);
  assert.ok(aDesProfilsTernes(recette, terne));
  assert.deepEqual(confusionsDe(recette, terne), []);
  assert.ok(!codes(dePalette(terne)).includes('profils-confondus'));
  const choisies = { ...terne, parts: { soft: 0.088, vivid: 0.185, origine: 'designer' as const } };
  assert.ok(!aDesProfilsTernes(recetteAvec(choisies), choisies));
  assert.ok(codes(dePalette(choisies)).includes('profils-confondus'));
});

test('[VER-08] aucune alerte pour un gris, un noir, un blanc ou une référence hors de l’étendue', () => {
  // Une palette peut partir de `#000000` ou de `#FFFFFF` : rien ne le signale (réponse Q4 du plan des palettes désaturées).
  for (const reference of ['#808080', '#000000', '#FFFFFF', '#060605', '#6B7280', '#FFFCF5']) {
    assert.deepEqual(codes(dePalette(paletteTailwind('p-0000000f', reference))), [], reference);
  }
});

test('[VER-08] référence plus terne que soft : sonne pour des parts du designer au-dessus de #5B6B7A, jamais sans elles', () => {
  const sansParts = paletteTailwind('p-0000000d', '#5B6B7A');
  assert.ok(!codes(dePalette(sansParts)).includes('reference-plus-terne'), 'Soft porte la référence et prend sa part');
  const alerte = dePalette({ ...sansParts, parts: { soft: 0.45, vivid: 0.95, origine: 'designer' } }).find((a) => a.code === 'reference-plus-terne');
  assert.ok(alerte && alerte.code === 'reference-plus-terne');
  assert.deepEqual([alerte.part, alerte.partSoft], [0.226, 0.45]);
  assert.ok(!codes(dePalette(BLEU)).includes('reference-plus-terne'));
});

test('[VER-10] référence plus vive que vivid : une notice pour des parts du designer sous #F2A900, jamais sans elles', () => {
  const sansParts = paletteTailwind('p-0000000e', '#F2A900');
  assert.ok(!codes(dePalette(sansParts)).includes('reference-plus-vive'), 'Vivid porte la référence et prend sa part');
  const alerte = dePalette({ ...sansParts, parts: { soft: 0.45, vivid: 0.95, origine: 'designer' } }).find((a) => a.code === 'reference-plus-vive');
  assert.ok(alerte && alerte.code === 'reference-plus-vive' && alerte.part > alerte.partVivid);
  assert.equal(severiteDeLAlerte(alerte), 'notice');
  assert.ok(!codes(dePalette(BLEU)).includes('reference-plus-vive'));
});

test('[VER-08] palettes proches : sonne pour deux bleus voisins, se tait pour un bleu et un ambre', () => {
  const voisin = paletteTailwind('p-00000010', '#1D6DDB');
  const ambre = paletteTailwind('p-00000011', '#F2A900');
  const alerte = alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).find((a) => a.code === 'palettes-proches');
  assert.ok(alerte && alerte.code === 'palettes-proches');
  assert.deepEqual(alerte.palettes, [BLEU.id, voisin.id]);
  assert.ok(alerte.distance < alerte.seuil);
  assert.equal(alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).filter((a) => a.code === 'palettes-proches').length, 1);
});

test('palettes proches : sans l’un des crans 500, 600 et 700, la distance ne se calcule pas', () => {
  const recette = { ...recetteAvec(BLEU), crans: [50, 100, 200, 300, 400, 550, 600, 700, 800, 900, 950] };
  assert.equal(distanceDePalettes(recette, BLEU, BLEU), null);
});

test('[ENT-06] fond hors de la courbe : se tait pour les fonds par défaut, #121212 compris', () => {
  assert.deepEqual(alertesDeRecette(recetteParDefaut()), []);
});

test('[ENT-06] fond hors de la courbe : sonne pour un fond clair trop sombre ou un fond sombre trop clair', () => {
  const recette = { ...recetteParDefaut(), fonds: { light: '#EEEEEE', dark: '#1A1A1A' } };
  const alertes = alertesDeRecette(recette);
  assert.deepEqual(alertes.map((a) => a.code === 'fond-hors-courbe' && a.mode), ['light', 'dark']);
});
