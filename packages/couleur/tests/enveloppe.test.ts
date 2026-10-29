/**
 * L'enveloppe de chroma ([MOT-35]) : `cranVise` borne la chroma par
 * `p0 × min(a × marge(H) × (1 − L), b × L)`, et `rampesDe` la lit dans la
 * recette.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  boutsDe,
  couleursViseesDeLaRampe,
  cranVise,
  enveloppeDe,
  fabriquerRampe,
  plafond,
  rampesSansCorrection,
  recetteParDefaut,
  type Enveloppe,
  type Intensite,
  type Mode,
  type Palette,
  type ParametresRampe,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

/** Générateur à congruence linéaire, graine fixe : un échec se rejoue à l'identique. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (Math.imul(1664525, etat) + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

test('[MOT-35] sans enveloppe, la chroma reste part × plafond', () => {
  const tirer = generateur(20261014);
  const fautes: string[] = [];
  for (let essai = 0; essai < 5000; essai += 1) {
    const L = tirer();
    const H = tirer() * 360;
    const part = tirer();
    const lue = cranVise(L, H, part, 'srgb');
    if (lue.L !== L || lue.H !== H || lue.C !== part * plafond(L, H, 'srgb')) fautes.push(JSON.stringify({ L, H, part, lue }));
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});

/** Les enveloppes par défaut, écrites ici : Soft Light, Vivid Dark et Soft Dark. */
const SOFT_LIGHT: Enveloppe = { p0: 0.85, a: 0.6, b: 0.38, jaunes: 1, cyans: 0 };
const VIVID_DARK: Enveloppe = { p0: 0.95, a: 1.1, b: 0.3, jaunes: 0, cyans: 0 };
const SOFT_DARK: Enveloppe = { p0: 0.85, a: 1.1, b: 0.15, jaunes: 0, cyans: 0 };

test('[MOT-35] la borne vers le blanc et la borne vers le noir', () => {
  const proche = (obtenu: number, attendu: number) => assert.ok(Math.abs(obtenu - attendu) < 1e-9, `${obtenu} contre ${attendu}`);
  // Vers le blanc, Soft Light, L 0,97, H 200, sans marge : 0,85 × 0,6 × 0,03. La part × plafond (0,0316) est plus haute.
  assert.ok(0.85 * plafond(0.97, 200, 'srgb') > 0.0153);
  proche(cranVise(0.97, 200, 0.85, 'srgb', SOFT_LIGHT).C, 0.0153);
  // Le même cran à H 100, marge 2 : 0,85 × 0,6 × 2 × 0,03. La part × plafond (0,0557) reste plus haute.
  assert.ok(0.85 * plafond(0.97, 100, 'srgb') > 0.0306);
  proche(cranVise(0.97, 100, 0.85, 'srgb', SOFT_LIGHT).C, 0.0306);
  // Vers le noir, Vivid Dark, L 0,20, H 30 : 0,95 × 0,30 × 0,20. La part × plafond (0,0762) est plus haute.
  assert.ok(0.95 * plafond(0.2, 30, 'srgb') > 0.057);
  proche(cranVise(0.2, 30, 0.95, 'srgb', VIVID_DARK).C, 0.057);
  // Part × plafond plus petit que l'enveloppe (0,85 × 0,228 = 0,1938) : la part garde la chroma.
  assert.ok(0.2 * plafond(0.6, 250, 'srgb') < 0.1938);
  proche(cranVise(0.6, 250, 0.2, 'srgb', SOFT_LIGHT).C, 0.2 * plafond(0.6, 250, 'srgb'));
});

test('[MOT-35] la marge des jaunes ne joue pas en Dark', () => {
  const recette = recetteParDefaut();
  for (const intensite of ['soft', 'vivid', 'unique'] as const) assert.equal(enveloppeDe(recette, intensite, 'dark').jaunes, 0, intensite);
  // Soft, L 0,93, H 100 : 0,85 × 1,1 × 0,07 en Dark, 0,85 × 0,6 × 2 × 0,07 en Light.
  const dark = cranVise(0.93, 100, 0.85, 'srgb', enveloppeDe(recette, 'soft', 'dark'));
  const light = cranVise(0.93, 100, 0.85, 'srgb', enveloppeDe(recette, 'soft', 'light'));
  assert.ok(Math.abs(dark.C - 0.06545) < 1e-9, `${dark.C}`);
  assert.ok(Math.abs(light.C - 0.0714) < 1e-9, `${light.C}`);
  assert.deepEqual(dark, cranVise(0.93, 100, 0.85, 'srgb', SOFT_DARK));
});

test('[MOT-35] l’enveloppe d’une intensité est celle de son profil, et l’intensité unique prend celle de Vivid', () => {
  const recette = recetteParDefaut();
  for (const mode of ['light', 'dark'] as const) {
    const { soft, vivid } = recette.profils;
    assert.deepEqual(enveloppeDe(recette, 'soft', mode), { p0: soft.enveloppe.p0, ...soft.enveloppe[mode] });
    assert.deepEqual(enveloppeDe(recette, 'vivid', mode), { p0: vivid.enveloppe.p0, ...vivid.enveloppe[mode] });
    assert.deepEqual(enveloppeDe(recette, 'unique', mode), enveloppeDe(recette, 'vivid', mode));
  }
});

test('[MOT-35] la marge des cyans centre sa bosse à 195° et vaut 1 + cyans, aux jaunes près', () => {
  const proche = (obtenu: number, attendu: number) => assert.ok(Math.abs(obtenu - attendu) < 1e-9, `${obtenu} contre ${attendu}`);
  const avec = (cyans: number): Enveloppe => ({ p0: 1, a: 0.6, b: 0.38, jaunes: 1, cyans });
  // L 0,97, H 195, p0 × a × marge × 0,03 ; la part × plafond (0,037) reste plus haute.
  assert.ok(plafond(0.97, 195, 'srgb') > 0.027);
  proche(cranVise(0.97, 195, 1, 'srgb', avec(0)).C, 0.6 * 0.03);
  proche(cranVise(0.97, 195, 1, 'srgb', avec(0.5)).C, 0.6 * 1.5 * 0.03);
  proche(cranVise(0.97, 195, 1, 'srgb', avec(-0.2)).C, 0.6 * 0.8 * 0.03);
});

test('[MOT-35] Lenveloppe lit la borne de l’enveloppe à sa clarté et le plafond de l’écran à L ; absente, elle vaut L', () => {
  const proche = (obtenu: number, attendu: number) => assert.ok(Math.abs(obtenu - attendu) < 1e-9, `${obtenu} contre ${attendu}`);
  const enveloppe: Enveloppe = { p0: 0.85, a: 0.6, b: 0.38, jaunes: 0, cyans: 0 };
  for (const H of [30, 100, 195, 260]) {
    for (const L of [0.2, 0.6, 0.93, 0.97]) assert.deepEqual(cranVise(L, H, 0.85, 'srgb', enveloppe), cranVise(L, H, 0.85, 'srgb', enveloppe, L), `${L} ${H}`);
  }
  // L 0,97 et Lenveloppe 0,96 : l'enveloppe vaut 0,85 × 0,6 × 0,04, le plafond 0,85 × plafond(0,97) reste plus haut.
  assert.ok(0.85 * plafond(0.97, 200, 'srgb') > 0.0204);
  proche(cranVise(0.97, 200, 0.85, 'srgb', enveloppe, 0.96).C, 0.0204);
  // L 0,60 et Lenveloppe 0,95 : l'enveloppe monte à 0,85 × 0,6 × 0,05 = 0,0255, sous le plafond de l'écran lu à 0,60.
  proche(cranVise(0.6, 200, 0.85, 'srgb', enveloppe, 0.95).C, 0.0255);
  // Sans enveloppe, Lenveloppe est sans effet.
  assert.deepEqual(cranVise(0.6, 200, 0.85, 'srgb', undefined, 0.95), cranVise(0.6, 200, 0.85, 'srgb'));
});

/** Une rampe de crans de clarté de courbe donnée, sans Color shift, pivot au milieu. */
function rampeDeClartes(courbe: number[], reste: Partial<ParametresRampe>): ParametresRampe {
  const crans = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const bouts = boutsDe({ crans, courbes: { light: [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27], dark: [] } });
  return {
    courbe,
    bouts,
    reference: { L: 0.6, C: 0.1, H: 230 },
    derive: { clair: 0, sombre: 0 },
    part: 0.85,
    gamut: 'srgb',
    enveloppe: { p0: 10, a: 10, b: 10, jaunes: 0, cyans: 0 },
    ...reste,
  };
}

test('[MOT-35] clairs ne change rien sous la clarté 0,78 et multiplie la chroma en entier au-dessus de 0,88', () => {
  const courbe = [0.4, 0.7, 0.77, 0.78, 0.88, 0.9, 0.975];
  const sans = couleursViseesDeLaRampe(rampeDeClartes(courbe, {}));
  const avec = couleursViseesDeLaRampe(rampeDeClartes(courbe, { clairs: 0.5 }));
  courbe.forEach((L, rang) => {
    const rapport = avec[rang].C / sans[rang].C;
    if (L <= 0.78) assert.equal(avec[rang].C, sans[rang].C, `${L}`);
    else if (L >= 0.88) assert.ok(Math.abs(rapport - 0.5) < 1e-12, `${L} : ${rapport}`);
    assert.equal(avec[rang].L, sans[rang].L, `${L}`);
    assert.equal(avec[rang].H, sans[rang].H, `${L}`);
  });
  // Entre 0,78 et 0,88, le facteur descend sans saut.
  const milieu = couleursViseesDeLaRampe(rampeDeClartes([0.83], { clairs: 0.5 }))[0].C / couleursViseesDeLaRampe(rampeDeClartes([0.83], {}))[0].C;
  assert.ok(Math.abs(milieu - 0.75) < 1e-12, `${milieu}`);
});

test('[MOT-35] clairs à 1 et decalageDeClarteGarde à 0 rendent les mêmes octets qu’une rampe sans ces paramètres', () => {
  const recette = recetteParDefaut();
  for (const mode of ['light', 'dark'] as const) {
    const base = rampeDeClartes(recette.courbes[mode].slice(), { enveloppe: enveloppeDe(recette, 'soft', mode) });
    const hexas = (parametres: ParametresRampe) => fabriquerRampe(parametres).map((cran) => cran.hexa);
    assert.deepEqual(hexas({ ...base, clairs: 1, decalageDeClarteGarde: 0 }), hexas(base), mode);
  }
});

test('[MOT-35] decalageDeClarteGarde lit l’enveloppe des crans du bout clair plus bas et garde la clarté fabriquée', () => {
  const enveloppe: Enveloppe = { p0: 0.85, a: 0.1, b: 0.38, jaunes: 0, cyans: 0 };
  const base = rampeDeClartes([0.975, 0.5], { enveloppe, reference: { L: 0.5, C: 0.1, H: 230 } });
  const gardee = couleursViseesDeLaRampe({ ...base, decalageDeClarteGarde: 0.05 });
  const normale = couleursViseesDeLaRampe(base);
  assert.equal(gardee[0].L, normale[0].L);
  // Bout clair au poids 1 : l'enveloppe se lit à 0,925 (0,85 × 0,1 × 0,075) au lieu de 0,975 (0,85 × 0,1 × 0,025).
  assert.ok(Math.abs(normale[0].C - 0.002125) < 1e-9, `${normale[0].C}`);
  assert.ok(Math.abs(gardee[0].C - 0.006375) < 1e-9, `${gardee[0].C}`);
  // Au pivot, le poids est nul : rien ne change.
  assert.deepEqual(gardee[1], normale[1]);
});

type Rampes = Partial<Record<Intensite, Record<Mode, string[]>>>;

/** Les palettes de la recette par défaut dont les rampes sont écrites plus bas. */
const PALETTES: Record<string, Palette> = {
  bleu: paletteTailwind('p-000000e1', '#3B82F6'),
  jaune: paletteTailwind('p-000000e2', '#EAB308'),
  vert: paletteTailwind('p-000000e3', '#16A34A'),
  unique: { ...paletteTailwind('p-000000e4', '#B15152'), intensites: 1 },
  reglee: { ...paletteTailwind('p-000000e5', '#3B82F6'), reglages: { teinte: { soft: 8, vivid: 8 }, clarte: { soft: -0.02, vivid: -0.02 } } },
  propres: { ...paletteTailwind('p-000000e6', '#EAB308'), parts: { soft: 0.6, vivid: 1, origine: 'designer' } },
};

/**
 * Les rampes de `rampesDuBanc` avec `REGLE_FINALE` (Mesures/prototype.ts et
 * variantes.ts, dossier de la recette critique de qualité), relevées une fois ; les rampes Soft du thème Dark
 * suivent la borne `b` 0,15 du format 12, et les rampes Light le `clairs` 0,7 de Soft et le `cyans` −0,2 de Vivid, relevés sur le moteur.
 * Les valeurs suivent aussi la clarté selon la teinte et la bosse de chroma de l'intensité porteuse, relevées sur le moteur.
 * Les crans 50 à 400 de Light, hors celui de la référence, suivent la clarté commune des crans clairs, relevée sur le moteur.
 */
const DU_PROTOTYPE: Record<string, Rampes> = {
  // Bleu #3B82F6
  bleu: {
    soft: {
      light: ['#F5F7FA', '#E9EFF7', '#D4E1F2', '#B5CDEE', '#84B1F3', '#5993EF', '#3375E9', '#2E5DBE', '#264796', '#1D3270', '#142250'],
      dark: ['#070A12', '#161B29', '#202739', '#2B354B', '#3A4764', '#4E6084', '#617BA6', '#7596C9', '#88B0EC', '#ACCCF7', '#D2E4FB'],
    },
    vivid: {
      light: ['#F2F7FE', '#E5F0FE', '#CDE2FD', '#ACCDFB', '#80B1F9', '#5393F7', '#3B82F6', '#0F52E0', '#153DB3', '#132B86', '#0E1C61'],
      dark: ['#060915', '#0F1939', '#17244E', '#1F3165', '#294384', '#345CAF', '#3B82F6', '#5393F7', '#7EB0F9', '#AACCFB', '#D1E4FD'],
    },
  },
  // Jaune #EAB308
  jaune: {
    soft: {
      light: ['#FBF9DB', '#F7F0C1', '#EFE0A4', '#E7CA78', '#D9A93F', '#BD8B33', '#A17129', '#86581F', '#6C4216', '#522E0E', '#3C1D07'],
      dark: ['#0D0907', '#251911', '#352317', '#46301F', '#5C412A', '#785A39', '#957347', '#B28F57', '#CEAC67', '#EACE7A', '#F9F0BD'],
    },
    vivid: {
      light: ['#FFFAC3', '#FFF197', '#FFDF4E', '#F7C70A', '#EAB308', '#C38905', '#A76E03', '#8B5502', '#713F01', '#562B01', '#3F1B00'],
      dark: ['#0E0906', '#27180E', '#392111', '#4D2C10', '#6A3A01', '#885202', '#A66D03', '#C38905', '#EAB308', '#F7CB35', '#FAF0B6'],
    },
  },
  // Vert #16A34A
  vert: {
    soft: {
      light: ['#EEFBF2', '#E3F3E8', '#CDE8D5', '#AFD9BB', '#72C88B', '#3BB05F', '#2F924C', '#24753F', '#1A5B31', '#114324', '#092E18'],
      dark: ['#070B08', '#121F16', '#1A2D1F', '#243C2B', '#32503A', '#466B4E', '#5A8763', '#6FA57A', '#83C594', '#97E5AF', '#C9F9D9'],
    },
    vivid: {
      light: ['#E4FFED', '#CEFCDD', '#A8F4C2', '#76E99F', '#20D370', '#19B356', '#16A34A', '#0D7738', '#085D2D', '#044420', '#022F16'],
      // Dark normal : le 700 de la courbe ne tient pas 4,5:1 sur le 300, la référence glisse au 600 (`ancrageDeplace.test.ts`) ; le 400 et le 500 se relèvent, le 700 reprend la clarté de la courbe.
      dark: ['#070B08', '#112015', '#152E1D', '#153F24', '#075A2C', '#0F7C3B', '#16A34A', '#19B252', '#20D470', '#72EEA0', '#C5FBD6'],
    },
  },
  // Rouge #B15152 à une intensité
  unique: {
    unique: {
      light: ['#FBF5F5', '#F8EBEB', '#F2D9D9', '#EABFC0', '#DF9B9C', '#D67275', '#B15152', '#994547', '#783537', '#592528', '#3F181B'],
      dark: ['#0E0909', '#271717', '#391F20', '#502829', '#703134', '#954345', '#B15152', '#D67275', '#DF9A9B', '#E9BEC0', '#F3DEDF'],
    },
  },
  // Bleu #3B82F6, teinte +8° et luminosité −0,02
  reglee: {
    soft: {
      light: ['#F5F7FB', '#EAEFF8', '#D6E0F2', '#B7C9ED', '#89A9F3', '#6388EF', '#4B6AE0', '#3E53B4', '#323E8C', '#242B66', '#181B47'],
      dark: ['#05060C', '#141623', '#1E2133', '#2A2F44', '#3A415C', '#4E597D', '#63739F', '#788DC2', '#8CA7E4', '#AAC3F6', '#CCDCFA'],
    },
    vivid: {
      light: ['#F3F7FE', '#E7EFFE', '#D1E0FD', '#B0C9FB', '#86A9F9', '#5F86F7', '#3B82F6', '#3645D6', '#2D33A7', '#22227B', '#171456'],
      dark: ['#05060F', '#111331', '#1A1E45', '#242A5C', '#303B7B', '#4053A5', '#3B82F6', '#5F86F7', '#82A6F9', '#A8C3FB', '#CBDCFC'],
    },
  },
  // Jaune #EAB308, parts propres 0,6 et 1
  propres: {
    soft: {
      light: ['#FAF8E1', '#F5F0CC', '#ECE0AD', '#E1CB8F', '#CDAC6A', '#B18F58', '#977548', '#7C5C39', '#63462B', '#4B311E', '#362113'],
      dark: ['#0C0908', '#221A14', '#32241B', '#453021', '#5C412A', '#785A39', '#957347', '#B18F58', '#CDAC6A', '#EACE7D', '#F8EFC1'],
    },
    vivid: {
      light: ['#FFFAC2', '#FFF196', '#FFDF4C', '#F7C700', '#EAB308', '#C38900', '#A86E00', '#8B5500', '#713F00', '#562B00', '#3F1B00'],
      dark: ['#0E0906', '#27180E', '#392111', '#4E2C10', '#6A3A00', '#885200', '#A66D00', '#C38900', '#EAB308', '#F7CB36', '#FAF0B7'],
    },
  },
};

for (const [nom, palette] of Object.entries(PALETTES)) {
  test(`[MOT-35] les rampes suivent le prototype : ${palette.reference}, ${nom}`, () => {
    // Le prototype ignore la correction des textes, que `rampesDe` applique ensuite : on lit les rampes avant elle.
    const rampes = rampesSansCorrection(recetteAvec(palette), palette);
    const obtenues: Rampes = {};
    for (const intensite of Object.keys(rampes) as Intensite[]) {
      const rampe = rampes[intensite]!;
      obtenues[intensite] = { light: rampe.light.map((cran) => cran.hexa), dark: rampe.dark.map((cran) => cran.hexa) };
    }
    assert.deepEqual(obtenues, DU_PROTOTYPE[nom]);
  });
}
