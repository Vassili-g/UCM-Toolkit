/**
 * La clarté selon la teinte ([MOT-36]) : le décalage du bout clair que le
 * relevé Tailwind montre à la teinte de la référence, ajouté à la luminosité
 * du Color shift et gardé par l'ordre des nuances et par les promesses.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLARTE_SELON_LA_TEINTE_MAXIMALE,
  MODES,
  ancrageDe,
  cleDeLaPromesse,
  clarteSelonLaTeinte,
  clarteSelonLaTeinteGardee,
  clartesDe,
  courbesParDefaut,
  ecrireHexa,
  lineaireVersRgb8,
  oklchVersLineaire,
  ordreTenu,
  plafond,
  rampesDe,
  recetteParDefaut,
  verifierPromesses,
  type Palette,
  type Recette,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const neuve = (reference: string, autres: Partial<Palette> = {}, recette: Recette = recetteParDefaut()): { recette: Recette; palette: Palette } => {
  const palette = paletteTailwind('p-000000a1', reference, autres);
  return { recette: { ...recette, palettes: [palette] }, palette };
};

/** La recette dont toutes les rampes du relevé sont celle de la première : aucun écart de clarté, donc aucun décalage. */
const sansDecalage = (recette: Recette): Recette => ({ ...recette, derives: recette.derives.map((rampe) => ({ ...recette.derives[0], nom: rampe.nom })) });

const AVEC_TEXTE_BLANC: Recette = { ...recetteParDefaut(), texteDesBoutons: { light: 'blanc', dark: 'blanc' }, courbes: courbesParDefaut(11, { light: 'blanc', dark: 'blanc' }) };

test('[MOT-36] le décalage de clarté du jaune est positif, celui de l’indigo négatif, celui d’un gris nul', () => {
  const jaune = neuve('#EAB308');
  assert.deepEqual(clarteSelonLaTeinte(jaune.recette, jaune.palette), { clair: 0.025, sombre: 0 });
  const indigo = neuve('#6366F1');
  assert.deepEqual(clarteSelonLaTeinte(indigo.recette, indigo.palette), { clair: -0.023, sombre: 0 });
  for (const gris of ['#808080', '#808081', '#000000', '#FFFFFF']) {
    const { recette, palette } = neuve(gris);
    assert.deepEqual(clarteSelonLaTeinte(recette, palette), { clair: 0, sombre: 0 }, gris);
  }
});

test('[MOT-36] le décalage se borne à ±0,03, se range au millième et vaut 0 quand la liste n’a pas de cran 100', () => {
  let plusGrand = 0;
  for (let H = 0; H < 360; H += 3) {
    const hexa = ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L: 0.6, C: plafond(0.6, H, 'srgb') * 0.7, H })));
    const { recette, palette } = neuve(hexa);
    const { clair, sombre } = clarteSelonLaTeinte(recette, palette);
    assert.equal(sombre, 0);
    assert.ok(Math.abs(clair) <= CLARTE_SELON_LA_TEINTE_MAXIMALE, `${hexa} : ${clair}`);
    assert.equal(Math.round(clair * 1000) / 1000, clair, hexa);
    plusGrand = Math.max(plusGrand, Math.abs(clair));
  }
  assert.ok(plusGrand > 0.02, 'le balayage atteint des décalages notables');
  const { recette, palette } = neuve('#EAB308');
  const sans = (courbe: readonly number[]) => courbe.filter((_, rang) => rang !== 1);
  const sans100: Recette = { ...recette, crans: recette.crans.filter((cran) => cran !== 100), courbes: { light: sans(recette.courbes.light), dark: sans(recette.courbes.dark) } };
  assert.equal(clarteSelonLaTeinte(sans100, palette).clair, 0);
});

test('[MOT-36] une palette libre n’a pas de décalage, une palette à une intensité l’a', () => {
  const libre = neuve('#EAB308', { crans: [100, 200, 400, 600, 800, 900] });
  assert.equal(clarteSelonLaTeinte(libre.recette, libre.palette).clair, 0);
  assert.deepEqual(clarteSelonLaTeinteGardee(libre.recette, libre.palette), { fraction: 1, decalage: 0 });
  // Le cran 50 pèse 1 vers le bout clair : sa clarté fabriquée est celle de la courbe, plus le décalage de l'indigo.
  const unique = neuve('#6366F1', { intensites: 1 });
  assert.equal(clarteSelonLaTeinteGardee(unique.recette, unique.palette).decalage, -0.023);
  assert.ok(Math.abs(clartesDe(unique.recette, unique.palette).unique!.light[0] - (unique.recette.courbes.light[0] - 0.023)) < 1e-9);
});

test('[MOT-36] le décalage s’ajoute à la luminosité du Color shift rangée, qui reste telle qu’elle a été rangée', () => {
  const { recette, palette } = neuve('#6366F1');
  const reglee: Palette = {
    ...palette,
    derive: {
      ...palette.derive,
      soft: { ...palette.derive.soft, clarte: { clair: -0.02, sombre: 0.01 } },
      vivid: { ...palette.derive.vivid, clarte: { clair: -0.02, sombre: 0.01 } },
    },
  };
  const rangee = recetteAvec(reglee);
  const sans = clartesDe(recette, palette);
  const avec = clartesDe(rangee, reglee);
  const decalage = clarteSelonLaTeinteGardee(rangee, reglee).decalage;
  assert.ok(decalage < 0 && decalage >= -0.023, `${decalage}`);
  for (const intensite of ['soft', 'vivid'] as const) {
    assert.ok(Math.abs(sans[intensite]!.light[0] - (recette.courbes.light[0] - 0.023)) < 1e-9, intensite);
    assert.ok(Math.abs(avec[intensite]!.light[0] - (recette.courbes.light[0] - 0.02 + decalage)) < 1e-9, intensite);
  }
  assert.deepEqual(reglee.derive.vivid.clarte, { clair: -0.02, sombre: 0.01 });
  assert.equal(palette.derive.vivid.clarte, undefined);
});

test('[MOT-36] clartesDe et rampesDe lisent la même fraction, mémorisée par recette et par palette', () => {
  for (const reference of ['#EAB308', '#6366F1', '#22C55E', '#EF4444']) {
    const { recette, palette } = neuve(reference);
    const gardee = clarteSelonLaTeinteGardee(recette, palette);
    assert.equal(clarteSelonLaTeinteGardee(recette, palette), gardee, 'le même objet, sans recalcul');
    const clartes = clartesDe(recette, palette);
    const rampes = rampesDe(recette, palette);
    const ancrage = ancrageDe(recette, palette);
    for (const intensite of ['soft', 'vivid'] as const) {
      for (const mode of MODES) {
        rampes[intensite]![mode].forEach((cran, rang) => {
          if (intensite === ancrage.profil && rang === ancrage.rangs[mode]) return;
          // L'arrondi à 8 bits d'une teinte vive déplace la clarté de moins de 0,01.
          assert.ok(Math.abs(cran.L - clartes[intensite]![mode][rang]) < 0.01, `${reference} ${intensite} ${mode} ${recette.crans[rang]}`);
        });
      }
    }
    const autre = { ...recette };
    assert.deepEqual(clarteSelonLaTeinteGardee(autre, palette), gardee, 'une autre recette recalcule le même résultat');
    assert.notEqual(clarteSelonLaTeinteGardee(autre, palette), gardee);
  }
});

test('[MOT-36] la garde réduit le décalage d’un vert foncé en Dark avec texte blanc', () => {
  const { recette, palette } = neuve('#023816', {}, AVEC_TEXTE_BLANC);
  const voulu = clarteSelonLaTeinte(recette, palette).clair;
  assert.equal(voulu, 0.012);
  const gardee = clarteSelonLaTeinteGardee(recette, palette);
  assert.ok(gardee.fraction > 0 && gardee.fraction < 1, `fraction ${gardee.fraction}`);
  assert.equal(gardee.decalage, Math.round(voulu * gardee.fraction * 1000) / 1000);
  assert.equal(gardee.decalage, 0.002);
});

test('[MOT-36] sur un balayage de teintes et de clartés, l’ordre des nuances tient et aucune promesse tenue sans le décalage ne manque', () => {
  const fautes: string[] = [];
  let reduites = 0;
  for (const recetteDeBase of [recetteParDefaut(), AVEC_TEXTE_BLANC]) {
    const references: { H: number; L: number; C: number }[] = [];
    for (let H = 0; H < 360; H += 20) for (const L of [0.3, 0.45, 0.6, 0.8]) references.push({ H, L, C: plafond(L, H, 'srgb') * 0.8 });
    // Les verts foncés, où le décalage de clarté fait manquer des promesses du texte blanc en Dark.
    for (let H = 120; H <= 160; H += 5) for (const L of [0.3, 0.35, 0.4, 0.45]) references.push({ H, L, C: Math.min(0.15, plafond(L, H, 'srgb') * 0.98) });
    for (const { H, L, C } of references) {
      const hexa = ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C, H })));
      const { recette, palette } = neuve(hexa, {}, recetteDeBase);
      if (clarteSelonLaTeinteGardee(recette, palette).fraction < 1) reduites += 1;
      if (!ordreTenu(recette, palette)) fautes.push(`${hexa} : ordre`);
      const tenuesSans = new Set(verifierPromesses(sansDecalage(recette), palette).filter((p) => p.verdict === 'tenue').map(cleDeLaPromesse));
      for (const promesse of verifierPromesses(recette, palette)) {
        if (promesse.verdict === 'manquee' && tenuesSans.has(cleDeLaPromesse(promesse))) fautes.push(`${hexa} : ${cleDeLaPromesse(promesse)}`);
      }
    }
  }
  assert.deepEqual(fautes, []);
  assert.ok(reduites > 0, 'le balayage trouve des décalages que la garde réduit');
});

test('[MOT-36] [MOT-17] l’ancrage garde ses octets sous le décalage gardé, dans les deux modes', () => {
  for (const reference of ['#EAB308', '#6366F1', '#22C55E', '#023816', '#EF4444', '#0EA5E9']) {
    for (const extra of [{}, { intensites: 1 as const }]) {
      const { recette, palette } = neuve(reference, extra);
      const ancrage = ancrageDe(recette, palette);
      const rampes = rampesDe(recette, palette);
      for (const mode of MODES) assert.equal(rampes[ancrage.profil]![mode][ancrage.rangs[mode]].hexa, reference, `${reference} ${mode}`);
    }
  }
});
