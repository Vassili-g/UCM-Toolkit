/**
 * La clarté commune des crans clairs du Light : le 50, le 100 et le 200 prennent la clarté de la courbe, le 300
 * deux tiers du chemin, le 400 un tiers. Le réglage de luminosité de la carte et le décalage selon la teinte
 * ne les écartent plus de la courbe. Le Dark ne change pas.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  POIDS_DES_CRANS_COMMUNS,
  MODES,
  ancrageDe,
  arrondir,
  boutsDe,
  clartesDe,
  contraste,
  lireHexa,
  plafond,
  rampesDe,
  rgb8VersOklch,
  validerRecette,
  verifierPromesses,
  viseesDeLaRampe,
  type Palette,
  type ParametresRampe,
  type Recette,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const brute: unknown = JSON.parse(readFileSync(new URL('./fixtures/palettes-et-reglages.json', import.meta.url), 'utf8'));
const validee = validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette du mainteneur refusée : ${JSON.stringify(validee.refus)}`);
const RECETTE: Recette = validee.recette;
const palette = (nom: string): Palette => {
  const trouvee = RECETTE.palettes.find((autre) => autre.nom === nom);
  if (!trouvee) throw new Error(`Palette ${nom} absente de la configuration.`);
  return trouvee;
};

const rangDe = (cran: number): number => RECETTE.crans.indexOf(cran);

test('la table des poids : 50, 100 et 200 en entier, 300 aux deux tiers, 400 au tiers', () => {
  assert.deepEqual(POIDS_DES_CRANS_COMMUNS, { 50: 1, 100: 1, 200: 1, 300: 2 / 3, 400: 1 / 3 });
});

test('sur la configuration du mainteneur, le 50, le 100 et le 200 ont la même clarté dans toutes les palettes, à 0,002 près', () => {
  for (const cran of [50, 100, 200]) {
    const rang = rangDe(cran);
    const fabriquees: number[] = [];
    const lues: number[] = [];
    for (const autre of RECETTE.palettes) {
      const rampes = rampesDe(RECETTE, autre);
      const ancrage = ancrageDe(RECETTE, autre);
      for (const [intensite, parMode] of Object.entries(rampes)) {
        // Le cran de la référence garde ses octets : il n'entre pas dans la comparaison.
        if (intensite === ancrage.profil && ancrage.rangs.light === rang) continue;
        fabriquees.push(clartesDe(RECETTE, autre)[intensite as 'soft']!.light[rang]);
        lues.push(parMode!.light[rang].L);
      }
    }
    assert.ok(fabriquees.length >= 12, `${cran} : ${fabriquees.length} rampes`);
    // La clarté fabriquée est celle de la courbe, au bit près.
    for (const L of fabriquees) assert.equal(L, RECETTE.courbes.light[rang], String(cran));
    // Les octets la rendent à l'arrondi à 8 bits près : l'écart, au millième, vaut 0,002 au plus.
    const ecart = arrondir(Math.max(...lues) - Math.min(...lues), 3);
    assert.ok(ecart <= 0.002, `${cran} : écart ${ecart}`);
  }
});

test("Ocean Vivid, réglé à −0,06 de luminosité, a son 50 à la clarté de la courbe, 0,975", () => {
  const ocean = palette('Ocean');
  assert.equal(ocean.reglages?.clarte?.vivid, -0.06);
  const rampes = rampesDe(RECETTE, ocean);
  const rang = rangDe(50);
  assert.equal(clartesDe(RECETTE, ocean).vivid!.light[rang], 0.975);
  assert.ok(Math.abs(rampes.vivid!.light[rang].L - 0.975) < 0.002, `${rampes.vivid!.light[rang].L}`);
  // Le réglage garde son effet sur le reste de la rampe : le Dark et le 600 qui porte la référence.
  assert.ok(Math.abs(clartesDe(RECETTE, ocean).vivid!.dark[rang] - (RECETTE.courbes.dark[rang] - 0.06)) < 1e-9);
  assert.equal(rampes.vivid!.light[rangDe(600)].hexa, '#0073DE');
});

test('le 50 de Sun garde une chroma : il ne touche plus le blanc pur', () => {
  const rampes = rampesDe(RECETTE, palette('Sun'));
  for (const intensite of ['soft', 'vivid'] as const) {
    const cran = rampes[intensite]!.light[rangDe(50)];
    assert.notEqual(cran.hexa, '#FFFFFF', intensite);
    assert.ok(cran.C > 0.01, `${intensite} : chroma ${cran.C}`);
  }
});

test('le réglage de luminosité du Color shift ne bouge ni la clarté du 50, du 100 et du 200, ni leur teinte', () => {
  const bleu = paletteTailwind('p-000000d1', '#1E6FD9');
  const regle = (clair: number): Palette => ({
    ...bleu,
    derive: { ...bleu.derive, soft: { ...bleu.derive.soft, clarte: { clair, sombre: 0 } }, vivid: { ...bleu.derive.vivid, clarte: { clair, sombre: 0 } } },
  });
  const rangs = [50, 100, 200].map((cran) => RECETTE.crans.indexOf(cran));
  for (const clair of [-0.15, -0.05, 0, 0.05, 0.15]) {
    const cible = regle(clair);
    const recette = recetteAvec(cible);
    const rampes = rampesDe(recette, cible);
    for (const intensite of ['soft', 'vivid'] as const) {
      rangs.forEach((rang) => {
        assert.equal(clartesDe(recette, cible)[intensite]!.light[rang], recette.courbes.light[rang], `${clair} ${intensite} ${recette.crans[rang]}`);
        assert.ok(Math.abs(rampes[intensite]!.light[rang].L - recette.courbes.light[rang]) < 0.004, `${clair} ${intensite} ${recette.crans[rang]} : ${rampes[intensite]!.light[rang].hexa}`);
      });
    }
  }
});

test('une promesse sur le 100 ou le 200 se juge sur la couleur commune de ces crans', () => {
  const ocean = palette('Ocean');
  const rampes = rampesDe(RECETTE, ocean);
  const promesse = verifierPromesses(RECETTE, ocean).find((autre) => autre.mode === 'light' && autre.profil === 'vivid'
    && autre.garantie.numero === 9);
  assert.ok(promesse, 'G9 de Light, Vivid');
  const clair = rampes.vivid!.light;
  assert.equal(promesse.contraste, contraste(clair[rangDe(700)].couleur, clair[rangDe(100)].couleur));
  assert.ok(Math.abs(clair[rangDe(100)].L - 0.95) < 0.002, `${clair[rangDe(100)].L}`);
});

/** Une rampe sans enveloppe ni Color shift, pivotée sur un bleu moyen, aux numéros et au décalage donnés. */
function visees(courbe: readonly number[], parametres: Partial<ParametresRampe>) {
  const reference = rgb8VersOklch(lireHexa('#1E6FD9')!);
  return viseesDeLaRampe({
    courbe,
    bouts: boutsDe(RECETTE),
    reference,
    derive: { clair: 0, sombre: 0 },
    part: 0.8,
    gamut: 'srgb',
    ...parametres,
  });
}

test('le Light applique la table par numéro de cran : un décalage de luminosité ne bouge que les numéros hors de la table', () => {
  const delta = -0.06;
  const courbe = RECETTE.courbes.light;
  const rampe = visees(courbe, { numeros: RECETTE.crans, decalage: delta });
  const attendu: Record<number, number> = { 50: 0, 100: 0, 200: 0, 300: delta / 3, 400: (2 * delta) / 3 };
  RECETTE.crans.forEach((cran, rang) => {
    assert.ok(Math.abs(rampe[rang].L - (courbe[rang] + (attendu[cran] ?? delta))) < 1e-12, `${cran} : ${rampe[rang].L}`);
  });
});

test("une liste libre applique la table par numéro et non par rang : 150, hors de la table, garde sa clarté", () => {
  const rampe = visees([0.95, 0.93, 0.845, 0.67], { numeros: [100, 150, 300, 500], decalage: -0.06 });
  assert.deepEqual(rampe.map((cran) => arrondir(cran.L, 6)), [0.95, 0.87, 0.825, 0.61]);
});

test('le Dark ne change pas : sans numéros, chaque cran garde la clarté de ses réglages', () => {
  const courbe = RECETTE.courbes.dark;
  const rampe = visees(courbe, { decalage: -0.06 });
  courbe.forEach((L, rang) => assert.ok(Math.abs(rampe[rang].L - Math.max(0, L - 0.06)) < 1e-12, String(rang)));
});

test('le cran qui porte la référence garde la clarté de ses réglages, quel que soit son numéro', () => {
  const sans = visees(RECETTE.courbes.light, { numeros: RECETTE.crans, decalage: -0.06, rangDeLaReference: rangDe(100) });
  assert.ok(Math.abs(sans[rangDe(100)].L - (0.95 - 0.06)) < 1e-12);
  assert.ok(Math.abs(sans[rangDe(50)].L - 0.975) < 1e-12);
  assert.ok(Math.abs(sans[rangDe(200)].L - 0.905) < 1e-12);
});

test('la clarté commune garde la teinte et la part de chroma de chaque cran : la chroma suit le plafond à la nouvelle clarté', () => {
  const reglage = { decalage: -0.06, derive: { clair: 12, sombre: -8, saturation: { clair: -0.3, sombre: 0.1 }, clarte: { clair: 0.02, sombre: 0 } } };
  const avec = visees(RECETTE.courbes.light, { ...reglage, numeros: RECETTE.crans });
  const sans = visees(RECETTE.courbes.light, reglage);
  avec.forEach((cran, rang) => {
    assert.equal(cran.H, sans[rang].H, `teinte ${RECETTE.crans[rang]}`);
    assert.equal(cran.part, sans[rang].part, `part ${RECETTE.crans[rang]}`);
    // La part de chroma, la chroma sur le plafond de l'écran à la clarté du cran, ne change pas.
    assert.ok(Math.abs(cran.C / cran.plafond - sans[rang].C / sans[rang].plafond) < 1e-12, `part de chroma ${RECETTE.crans[rang]}`);
  });
  assert.notEqual(avec[0].L, sans[0].L);
  assert.notEqual(avec[0].C, sans[0].C);
});

test("le décalage selon la teinte ne bouge pas la clarté d'un cran commun, et bouge celle du 500", () => {
  const enveloppe = { p0: 0.9, a: 1.1, b: 0.5, jaunes: 0, cyans: 0 };
  const garde = (decalageDeClarteGarde: number) => visees(RECETTE.courbes.light, {
    numeros: RECETTE.crans, enveloppe, derive: { clair: 0, sombre: 0, clarte: { clair: decalageDeClarteGarde, sombre: 0 } }, decalageDeClarteGarde,
  });
  const neutre = garde(0);
  const decale = garde(-0.03);
  for (const cran of [50, 100, 200]) assert.equal(decale[RECETTE.crans.indexOf(cran)].L, neutre[RECETTE.crans.indexOf(cran)].L, String(cran));
  const rang500 = RECETTE.crans.indexOf(500);
  assert.notEqual(decale[rang500].L, neutre[rang500].L);
});

test('dans une palette entière, le 50 du Light prend la clarté de la courbe et celui du Dark garde le réglage de luminosité', () => {
  const ocean = palette('Ocean');
  const clartes = clartesDe(RECETTE, ocean).vivid!;
  for (const mode of MODES) {
    const L = clartes[mode][rangDe(50)];
    const courbe = RECETTE.courbes[mode][rangDe(50)];
    if (mode === 'light') assert.equal(L, courbe);
    else assert.notEqual(L, courbe);
  }
});
