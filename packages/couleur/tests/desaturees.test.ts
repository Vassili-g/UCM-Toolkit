/**
 * Les palettes désaturées et grises ([MOT-18], [ENT-11], [DER-15]) : le gris
 * pur, la part mesurée à la clarté bornée, le porteur figé sous la part
 * commune de soft, et la palette grise que l'interface lit.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODES,
  PROFILS,
  ancrageDe,
  arrondir,
  estGrisPur,
  estPaletteGrise,
  intensitesDe,
  lireHexa,
  partDeChroma,
  partDeLaReference,
  partsDe,
  profilPorteur,
  rampeDe,
  rampesDe,
  rgb8VersOklch,
  type Palette,
  type Rgb8,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const RAPPORT = 0.95 / 0.45;

const estGris = ([r, v, b]: Rgb8): boolean => r === v && v === b;

/** Les couleurs calculées d'une palette, hors du cran de la référence. */
function nuancesCalculees(palette: Palette): Rgb8[] {
  const recette = recetteAvec(palette);
  const ancrage = ancrageDe(recette, palette);
  const rampes = rampesDe(recette, palette);
  return intensitesDe(palette).flatMap((intensite) => MODES.flatMap((mode) =>
    rampeDe(rampes, intensite)[mode].filter((_, rang) => intensite !== ancrage.profil || rang !== ancrage.rangs[mode]).map(({ couleur }) => couleur)));
}

test('[MOT-18] un gris pur : R, G et B à une unité près ; deux unités gardent la teinte', () => {
  for (const hexa of ['#808080', '#7F7F80', '#060605', '#000000', '#FFFFFF']) assert.equal(estGrisPur(lireHexa(hexa)!), true, hexa);
  for (const hexa of ['#0C0A09', '#FAFAF5', '#F8FAFC', '#7C717B']) assert.equal(estGrisPur(lireHexa(hexa)!), false, hexa);
});

test('[MOT-18] #060605 et #7F7F80 donnent des gris purs dans les deux profils et les deux thèmes, référence gardée à son cran', () => {
  for (const reference of ['#060605', '#7F7F80', '#808080', '#000000', '#FFFFFF']) {
    const palette = paletteTailwind('p-000000d1', reference);
    const recette = recetteAvec(palette);
    assert.equal(partDeLaReference(recette, palette), 0, reference);
    assert.deepEqual(partsDe(recette, palette), { soft: 0, vivid: 0 }, reference);
    assert.ok(nuancesCalculees(palette).every(estGris), reference);
    const ancrage = ancrageDe(recette, palette);
    for (const mode of MODES) assert.equal(rampesDe(recette, palette).soft![mode][ancrage.rangs[mode]].hexa, reference, `${reference} ${mode}`);
    assert.equal(estPaletteGrise(recette, palette), true, reference);
  }
});

test('[MOT-18] les gris teintés de Tailwind gardent leur teinte', () => {
  // stone-950, slate-950, slate-50 et un blanc cassé : leur teinte tient à moins de 40° près d'un octet à l'autre.
  for (const reference of ['#0C0A09', '#020617', '#F8FAFC', '#FAFAF5']) {
    const palette = paletteTailwind('p-000000d2', reference);
    const recette = recetteAvec(palette);
    assert.ok(partDeLaReference(recette, palette) > 0, reference);
    assert.ok(!nuancesCalculees(palette).every(estGris), reference);
    assert.equal(estPaletteGrise(recette, palette), false, reference);
    const teinte = rgb8VersOklch(lireHexa(reference)!).H;
    const cinqCents = rgb8VersOklch(rampesDe(recette, palette).soft!.light[5].couleur).H;
    const ecart = Math.abs(((cinqCents - teinte + 540) % 360) - 180);
    assert.ok(ecart < 20, `${reference} : ${cinqCents} contre ${teinte}`);
  }
});

test('[MOT-18] depuis slate-950, la chroma du Soft 500 reste à 0,01 près de celle de slate-500 : la part se mesure à la clarté bornée', () => {
  const palette = paletteTailwind('p-000000d3', '#020617');
  const recette = recetteAvec(palette);
  // À sa propre clarté, 0,13, le plafond est minuscule : la part brute vaut plus du double.
  assert.ok(partDeChroma(lireHexa('#020617')!) > 2 * partDeLaReference(recette, palette));
  const soft500 = rgb8VersOklch(rampesDe(recette, palette).soft!.light[5].couleur).C;
  const slate500 = rgb8VersOklch(lireHexa('#64748B')!).C;
  assert.ok(Math.abs(soft500 - slate500) <= 0.01, `${soft500} contre ${slate500}`);
});

test('[MOT-18] une référence dans l’étendue de la liste garde sa part brute', () => {
  for (const reference of ['#897288', '#7C717B', '#1E6FD9', '#A0B599']) {
    const palette = paletteTailwind('p-000000d4', reference);
    assert.equal(partDeLaReference(recetteAvec(palette), palette), arrondir(partDeChroma(lireHexa(reference)!), 3), reference);
  }
});

test('[ENT-11] un porteur figé suit la règle du porteur : Vivid figé sous la part commune de Soft, Soft garde le rapport', () => {
  const palette: Palette = { ...paletteTailwind('p-000000d5', '#897288'), reglages: { porteur: 'vivid' } };
  const recette = recetteAvec(palette);
  const part = arrondir(partDeChroma(lireHexa('#897288')!), 3);
  assert.equal(profilPorteur(recette, palette), 'vivid');
  assert.deepEqual(partsDe(recette, palette), { soft: arrondir(part / RAPPORT, 3), vivid: part });
});

test('[DER-15] une palette terne n’est pas grise ; un gris pur saturé par le designer cesse de l’être', () => {
  for (const reference of ['#7C717B', '#897288', '#6B7280']) {
    const palette = paletteTailwind('p-000000d6', reference);
    assert.equal(estPaletteGrise(recetteAvec(palette), palette), false, reference);
  }
  const gris = paletteTailwind('p-000000d7', '#808080');
  for (const profil of PROFILS) {
    const saturee: Palette = { ...gris, parts: { soft: profil === 'soft' ? 0.3 : 0, vivid: 0.3, origine: 'designer' } };
    assert.equal(estPaletteGrise(recetteAvec(saturee), saturee), false, profil);
  }
  // Des parts si faibles que chaque nuance calculée tombe sur un gris : seule la référence, hors de l'examen, a une teinte.
  const presque: Palette = { ...paletteTailwind('p-000000d8', '#7F7F80'), parts: { soft: 0.001, vivid: 0.001, origine: 'designer' } };
  assert.ok(nuancesCalculees(presque).every(estGris));
  assert.equal(estPaletteGrise(recetteAvec(presque), presque), true);
});
