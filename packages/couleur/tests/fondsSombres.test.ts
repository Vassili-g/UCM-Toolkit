/**
 * Les fonds du thème Dark ([MOT-28]) : les nuances sous le numéro 400 de la
 * courbe Dark perdent de la part, le thème Light et les accents ne changent
 * pas, et « Profils confondus » compte les nuances atténuées.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PROFILS,
  grilleAuPrereglage,
  alertesDePalette,
  ancrageDe,
  boutsDe,
  confusionsDe,
  enveloppeDe,
  facteurSombre,
  fabriquerCran,
  fondsSombresDe,
  garantieDesCourbes,
  intensitesDe,
  partsDe,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  lireHexa,
  teinteA,
  type Palette,
  type Recette,
} from '../src/index';
import { paletteTailwind, recetteAuxPartsDe045, recetteAvec } from './fabrique';

/** La même recette, fonds du thème Dark au facteur 1 : la part de chaque profil partout. */
const sansAttenuation = (recette: Recette): Recette => ({ ...recette, intensiteDesFondsSombres: 1 });

const PALETTES: Palette[] = [
  paletteTailwind('p-000000d1', '#1E6FD9'),
  paletteTailwind('p-000000d2', '#DC2626'),
  paletteTailwind('p-000000d3', '#16A34A', { base: 'soft' }),
  { ...paletteTailwind('p-000000d4', '#A0B599'), intensites: 1 },
];

test('[MOT-28] le facteur vaut 0,30 au numéro 50 de la courbe Dark, remonte linéairement, et vaut 1 dès le 400', () => {
  const fonds = fondsSombresDe(recetteParDefaut());
  assert.deepEqual(fonds, { depart: 0.3, clarteBasse: 0.145, clarteHaute: 0.4 });
  assert.equal(facteurSombre(0.145, fonds), 0.3);
  assert.equal(facteurSombre(0.1, fonds), 0.3);
  assert.ok(Math.abs(facteurSombre(0.2725, fonds) - 0.65) < 1e-12);
  assert.equal(facteurSombre(0.4, fonds), 1);
  assert.equal(facteurSombre(0.93, fonds), 1);
});

test('[MOT-28] W6.4 : passer à treize nuances ne déplace pas la borne des fonds : aucune nuance gardée ne change de couleur', () => {
  const onze = recetteAvec(...PALETTES);
  const treize: Recette = { ...onze, ...grilleAuPrereglage(onze, 13) };
  assert.deepEqual(fondsSombresDe(treize), fondsSombresDe(onze));
  for (const palette of PALETTES) {
    for (const intensite of intensitesDe(palette)) {
      const [avant, apres] = [rampesDe(onze, palette)[intensite]!.dark, rampesDe(treize, palette)[intensite]!.dark];
      onze.crans.forEach((cran, rang) => assert.equal(apres[rang].hexa, avant[rang].hexa, `${palette.reference} ${intensite} ${cran}`));
    }
  }
});

test('[MOT-28] le thème Light est identique à l’octet, et en Dark les nuances 400 à 950 aussi', () => {
  const recette = recetteAvec(...PALETTES);
  const avant = sansAttenuation(recette);
  for (const palette of PALETTES) {
    for (const intensite of intensitesDe(palette)) {
      const [apres, sans] = [rampesDe(recette, palette)[intensite]!, rampesDe(avant, palette)[intensite]!];
      assert.deepEqual(apres.light, sans.light, `${palette.reference} ${intensite} light`);
      recette.crans.forEach((cran, rang) => {
        if (cran >= 400) assert.deepEqual(apres.dark[rang], sans.dark[rang], `${palette.reference} ${intensite} dark ${cran}`);
      });
    }
  }
});

test('[MOT-28] en Dark, les nuances 50 à 300 prennent la part de leur intensité multipliée par le facteur, la référence exacte gardée', () => {
  const recette = recetteAvec(...PALETTES);
  const fonds = fondsSombresDe(recette);
  let atteintes = 0;
  for (const palette of PALETTES) {
    const reference = rgb8VersOklch(lireHexa(palette.reference)!);
    const ancrage = ancrageDe(recette, palette);
    const parts = partsDe(recette, palette);
    for (const intensite of intensitesDe(palette)) {
      const rampe = rampesDe(recette, palette)[intensite]!.dark;
      recette.crans.forEach((cran, rang) => {
        if (cran > 300) return;
        const L = recette.courbes.dark[rang];
        const attendu = fabriquerCran(L, teinteA(L, reference, palette.derive[intensite === 'soft' ? 'soft' : 'vivid'], boutsDe(recette)), parts[intensite]! * facteurSombre(L, fonds), recette.gamut, enveloppeDe(recette, intensite, 'dark')).hexa;
        const ancre = intensite === ancrage.profil && rang === ancrage.rangs.dark;
        assert.equal(rampe[rang].hexa, ancre ? palette.reference : attendu, `${palette.reference} ${intensite} ${cran}`);
        atteintes += 1;
      });
    }
  }
  assert.equal(atteintes, 4 * 7, 'quatre nuances par rampe, trois palettes à deux rampes et une à une');
});

test('[MOT-28] une nuance de fond du thème Dark est moins saturée qu’avant, et la garantie des courbes tient', () => {
  const recette = recetteAvec(...PALETTES);
  const avant = sansAttenuation(recette);
  for (const palette of PALETTES.slice(0, 2)) {
    for (const profil of PROFILS) {
      const [apres, sans] = [rampesDe(recette, palette)[profil]!.dark[1], rampesDe(avant, palette)[profil]!.dark[1]];
      // La borne vers le noir de Soft Dark (b 0,15) plafonne la chroma de ce cran avec ou sans atténuation.
      const moins = profil === 'soft' ? apres.C <= sans.C : apres.C < sans.C;
      assert.ok(moins, `${palette.reference} ${profil} : ${apres.C} contre ${sans.C}`);
    }
  }
  assert.deepEqual(garantieDesCourbes(recette), []);
});

test('[MOT-28] [VER-11] « Profils confondus » compte les fonds du thème Dark atténués, comme le repère ≈', () => {
  // La borne Dark de Soft à 0,15 sépare les fonds atténués : un fond atténué confondu compte pour l'alerte.
  const palette: Palette = { ...paletteTailwind('p-000000d5', '#14B8A6'), parts: { soft: 0.2, vivid: 0.4, origine: 'designer' } };
  const recette = recetteAvec(palette);
  const fonds = fondsSombresDe(recette);
  const attenues = [300, 400, 500].filter((cran) => facteurSombre(recette.courbes.dark[recette.crans.indexOf(cran)], fonds) < 1);
  assert.ok(attenues.length > 0, 'au moins un fond Dark est atténué');
  const confondus = confusionsDe(recette, palette).filter(({ mode }) => mode === 'dark').map(({ cran }) => cran);
  assert.ok(attenues.some((cran) => confondus.includes(cran)), `${attenues} contre ${confondus}`);
  const alerte = alertesDePalette(recette, palette).find((candidate) => candidate.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans, confusionsDe(recette, palette));
});
