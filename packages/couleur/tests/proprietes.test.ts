/**
 * Les propriétés du moteur, éprouvées sur un balayage plutôt que sur un cas.
 *
 * Le balayage est déterministe : un générateur à congruence linéaire, graine
 * fixe, choisit les dérives et les références. Un échec se rejoue donc à
 * l'identique.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODES,
  ancrageDe,
  boutsDe,
  dansLeGamut,
  estPaletteGrise,
  fabriquerCran,
  fabriquerPalette,
  fabriquerRampe,
  facteurSombre,
  fondsSombresDe,
  intensitesDe,
  oklchVersLineaire,
  plafond,
  poidsA,
  rampeDe,
  rampesDe,
  teinteA,
  type Courbes,
  type Derive,
  type Rgb8,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const COURBES: Courbes = {
  light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
  dark: [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93],
};
const BOUTS = boutsDe({ crans: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950], courbes: COURBES });

/** Générateur à congruence linéaire (constantes de Numerical Recipes), valeurs dans `[0, 1)`. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (Math.imul(1664525, etat) + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

test('[MOT-17] à la clarté de la référence, la teinte vaut la sienne, quelle que soit la dérive', () => {
  const tirer = generateur(20260923);
  const ecarts: string[] = [];
  for (let essai = 0; essai < 20000; essai += 1) {
    const reference = {
      L: BOUTS.sombre + tirer() * (BOUTS.clair - BOUTS.sombre),
      C: 0.1,
      H: tirer() * 360,
    };
    const derive = { clair: -90 + tirer() * 180, sombre: -90 + tirer() * 180 };
    const teinte = teinteA(reference.L, reference, derive, BOUTS);
    if (Math.abs(teinte - reference.H) > 1e-9) ecarts.push(`${JSON.stringify({ reference, derive })} : ${teinte}`);
  }
  assert.deepEqual(ecarts.slice(0, 5), []);
});

/** Un Color shift tiré dans les bornes de [MOT-15], aux deux bouts et pour les trois grandeurs. */
function colorShift(tirer: () => number): Derive {
  const bouts = (borne: number) => ({ clair: (2 * tirer() - 1) * borne, sombre: (2 * tirer() - 1) * borne });
  return { ...bouts(90), saturation: bouts(1), clarte: bouts(0.15) };
}

test('[MOT-30] à la clarté du pivot, le poids est nul : ni la teinte, ni la part, ni la clarté ne bougent', () => {
  const tirer = generateur(20261001);
  const sombre = fondsSombresDe(recetteAvec());
  const ecarts: string[] = [];
  for (let essai = 0; essai < 20000; essai += 1) {
    const reference = { L: BOUTS.sombre + tirer() * (BOUTS.clair - BOUTS.sombre), C: 0.1, H: tirer() * 360 };
    const commun = { courbe: [reference.L], bouts: BOUTS, reference, part: tirer(), gamut: 'srgb' as const, decalage: -0.05 + tirer() * 0.07, sombre: tirer() < 0.5 ? sombre : undefined };
    const derive = colorShift(tirer);
    const avec = fabriquerRampe({ ...commun, derive })[0].hexa;
    const sans = fabriquerRampe({ ...commun, derive: { clair: 0, sombre: 0 } })[0].hexa;
    const { poids } = poidsA(reference.L, reference, BOUTS);
    if (poids !== 0 || avec !== sans) ecarts.push(`${JSON.stringify({ reference, derive })} : poids ${poids}, ${avec} pour ${sans}`);
  }
  assert.deepEqual(ecarts.slice(0, 5), []);
});

test('[MOT-30] sans saturation ni luminosité, chaque cran est celui de la teinte seule, à l’octet', () => {
  const tirer = generateur(11);
  const sombre = fondsSombresDe(recetteAvec());
  const fautes: string[] = [];
  for (let essai = 0; essai < 500; essai += 1) {
    const reference = { L: tirer(), C: 0.1, H: tirer() * 360 };
    const teinte = { clair: -90 + tirer() * 180, sombre: -90 + tirer() * 180 };
    const part = tirer();
    const decalage = -0.05 + tirer() * 0.07;
    for (const mode of MODES) {
      const commun = { courbe: COURBES[mode], bouts: BOUTS, reference, part, gamut: 'srgb' as const, decalage, sombre: mode === 'dark' ? sombre : undefined };
      // La formule de la teinte seule, d'avant le Color shift.
      const attendus = COURBES[mode].map((L) =>
        fabriquerCran(Math.min(1, Math.max(0, L + decalage)), teinteA(L, reference, teinte, BOUTS), mode === 'dark' ? part * facteurSombre(L, sombre) : part, 'srgb').hexa);
      const nuls = { ...teinte, saturation: { clair: 0, sombre: 0 }, clarte: { clair: 0, sombre: 0 } };
      for (const derive of [teinte, nuls]) {
        const obtenus = fabriquerRampe({ ...commun, derive }).map((cran) => cran.hexa);
        if (obtenus.join() !== attendus.join()) fautes.push(`${JSON.stringify({ reference, derive, mode })} : ${obtenus} pour ${attendus}`);
      }
    }
  }
  assert.deepEqual(fautes.slice(0, 3), []);
});

test('[MOT-30] [DER-15] une palette grise reste grise sous toute saturation et toute luminosité, hors du cran de la référence', () => {
  const tirer = generateur(42);
  const fautes: string[] = [];
  for (let essai = 0; essai < 1000; essai += 1) {
    const gris = ['#808080', '#7F7F80', '#060605', '#F7F7F7'][essai % 4];
    const derive = colorShift(tirer);
    const palette = paletteTailwind('p-000000b1', gris, { ...(essai % 8 < 4 ? { intensites: 1 as const } : {}), derive: { lien: true, soft: { ...derive, origine: 'libre' }, vivid: { ...derive, origine: 'libre' } } });
    const recette = recetteAvec(palette);
    const rampes = rampesDe(recette, palette);
    const ancrage = ancrageDe(recette, palette);
    for (const intensite of intensitesDe(palette)) {
      for (const mode of MODES) {
        rampeDe(rampes, intensite)[mode].forEach(({ couleur, hexa }, rang) => {
          const reference = intensite === ancrage.profil && rang === ancrage.rangs[mode];
          if (!reference && (couleur[0] !== couleur[1] || couleur[1] !== couleur[2])) fautes.push(`${gris} ${JSON.stringify(derive)} ${intensite} ${mode} : ${hexa}`);
        });
      }
    }
    if (!estPaletteGrise(recette, palette)) fautes.push(`${gris} ${JSON.stringify(derive)} : la palette n’est plus grise`);
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});

test('[MOT-12] un cran clair et un cran sombre de même clarté rendent le même hexa', () => {
  const tirer = generateur(7);
  // Clair 500 et sombre 700 partagent 0,670 ; clair 400 et sombre 800, 0,760.
  const paires: [number, number][] = [[5, 7], [4, 8]];
  for (let essai = 0; essai < 300; essai += 1) {
    const reference: Rgb8 = [Math.floor(tirer() * 256), Math.floor(tirer() * 256), Math.floor(tirer() * 256)];
    const derive = { clair: -90 + tirer() * 180, sombre: -90 + tirer() * 180 };
    const rampes = fabriquerPalette({
      reference,
      courbes: COURBES,
      bouts: BOUTS,
      parts: { soft: 0.45, vivid: 0.95 },
      derives: { soft: derive, vivid: derive },
      gamut: 'srgb',
    });
    for (const profil of ['soft', 'vivid'] as const) {
      for (const [clair, sombre] of paires) {
        assert.equal(
          rampes[profil].light[clair].hexa,
          rampes[profil].dark[sombre].hexa,
          `${reference}, ${profil}, crans ${clair} et ${sombre}`,
        );
      }
    }
  }
});

test('[MOT-06] le plafond n’est jamais hors du gamut, et 1e-3 de chroma de plus en sort, sur 360 teintes', () => {
  const clartes = [...new Set([0.5, ...COURBES.light, ...COURBES.dark])];
  const fautes: string[] = [];
  for (const L of clartes) {
    for (let H = 0; H < 360; H += 1) {
      const C = plafond(L, H);
      if (!dansLeGamut(oklchVersLineaire({ L, C, H }))) fautes.push(`L ${L}, H ${H} : ${C} hors du gamut`);
      if (dansLeGamut(oklchVersLineaire({ L, C: C + 1e-3, H }))) fautes.push(`L ${L}, H ${H} : ${C} + 1e-3 dans le gamut`);
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});
