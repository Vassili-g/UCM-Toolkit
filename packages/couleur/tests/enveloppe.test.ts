/**
 * L'enveloppe de chroma ([MOT-35]) : `cranVise` borne la chroma par
 * `p0 × min(a × marge(H) × (1 − L), b × L)`, et `rampesDe` la lit dans la
 * recette.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cranVise,
  enveloppeDe,
  plafond,
  rampesDe,
  recetteParDefaut,
  type Enveloppe,
  type Intensite,
  type Mode,
  type Palette,
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
const SOFT_LIGHT: Enveloppe = { p0: 0.85, a: 0.6, b: 0.38, jaunes: 1 };
const VIVID_DARK: Enveloppe = { p0: 0.95, a: 1.1, b: 0.3, jaunes: 0 };
const SOFT_DARK: Enveloppe = { p0: 0.85, a: 1.1, b: 0.38, jaunes: 0 };

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
 * variantes.ts, dossier de la recette critique de qualité), relevées une fois.
 */
const DU_PROTOTYPE: Record<string, Rampes> = {
  // Bleu #3B82F6
  bleu: {
    soft: {
      light: ['#F2F7FE', '#E5F0FD', '#CEE2FA', '#B0CFF8', '#86B3F4', '#5A94F0', '#3175E9', '#2B5DBE', '#244796', '#1B3370', '#122250'],
      dark: ['#060A15', '#0D193B', '#132453', '#19316B', '#21428C', '#2A5AB9', '#3174E7', '#5A94F0', '#86B3F4', '#B3D0F8', '#DBE9FC'],
    },
    vivid: {
      light: ['#F2F7FE', '#E5F0FE', '#CDE2FD', '#AECFFB', '#82B3F9', '#5494F7', '#3B82F6', '#1055D9', '#0D3EB3', '#0D2C86', '#0A1D61'],
      dark: ['#050A16', '#0D1939', '#15254E', '#1D3265', '#264484', '#325CAE', '#3B82F6', '#5494F7', '#82B3F9', '#B0D0FB', '#DAE9FD'],
    },
  },
  // Jaune #EAB308
  jaune: {
    soft: {
      light: ['#FBF7E4', '#F8EFCA', '#F4DF9B', '#EEC85D', '#D9A93F', '#BD8B33', '#A27129', '#86581F', '#6C4216', '#522D0E', '#3C1D07'],
      dark: ['#0D0907', '#251811', '#372215', '#4B2E17', '#663D14', '#83551E', '#A06F28', '#BD8B33', '#D9A93F', '#F2C954', '#F6E8B7'],
    },
    vivid: {
      light: ['#FEF8DA', '#FEEFB4', '#FFDD6D', '#F9C50A', '#EAB308', '#C38905', '#A86E03', '#8C5502', '#713F01', '#562B01', '#3F1B00'],
      dark: ['#0E0906', '#27180E', '#392111', '#4E2C10', '#6A3A01', '#885202', '#A66C03', '#C38905', '#EAB308', '#F6C83B', '#F7E8B1'],
    },
  },
  // Vert #16A34A
  vert: {
    soft: {
      light: ['#F1F9F2', '#E3F4E5', '#CAE9CF', '#A8DBB1', '#76C786', '#3AAF5C', '#2F924B', '#24753B', '#1A5C2D', '#11431F', '#092F14'],
      dark: ['#070B08', '#121F15', '#182E1C', '#1B3E23', '#185529', '#237239', '#2E904A', '#3AAF5C', '#47D06E', '#87E79B', '#CAF5D1'],
    },
    vivid: {
      light: ['#EBFCEE', '#D7F9DC', '#B1F3BC', '#76E991', '#20D362', '#19B252', '#16A34A', '#0D7734', '#085D27', '#04441B', '#023011'],
      dark: ['#070C08', '#112014', '#152E1A', '#153F20', '#075724', '#0D7433', '#139342', '#16A34A', '#20D362', '#7CEA94', '#C7F6CE'],
    },
  },
  // Rouge #B15152 à une intensité
  unique: {
    unique: {
      light: ['#FBF5F5', '#F8EBEB', '#F2D9D8', '#EAC0C0', '#E09D9C', '#D67475', '#B15152', '#994545', '#793534', '#592524', '#401918'],
      dark: ['#0E0908', '#271716', '#391F1E', '#502826', '#713130', '#954343', '#B15152', '#D67475', '#E09D9C', '#EBC2C2', '#F5E3E3'],
    },
  },
  // Bleu #3B82F6, teinte +8° et luminosité −0,02
  reglee: {
    soft: {
      light: ['#EAF1FD', '#DEE8FC', '#C9DAF9', '#AEC6F7', '#88A9F3', '#6489EF', '#4A6AE0', '#3D53B4', '#303F8C', '#232B66', '#171C47'],
      dark: ['#05060E', '#0F1431', '#181D4A', '#212962', '#2D3A82', '#3B50AF', '#4969DD', '#6489EF', '#88A9F3', '#B0C8F7', '#D4E2FB'],
    },
    vivid: {
      light: ['#E9F1FE', '#DDE8FD', '#C7DAFC', '#ABC6FB', '#85A9F9', '#6087F7', '#3B82F6', '#3446D6', '#2A33A7', '#1F237B', '#141557'],
      dark: ['#05060F', '#0F1431', '#191E45', '#222B5C', '#2F3C7B', '#3F53A5', '#3B82F6', '#6087F7', '#85A9F9', '#AEC8FB', '#D3E2FD'],
    },
  },
  // Jaune #EAB308, parts propres 0,6 et 1
  propres: {
    soft: {
      light: ['#FBF7E4', '#F8EFCA', '#F2DFA1', '#E7C97B', '#CDAC6A', '#B28F58', '#977548', '#7D5C39', '#64462B', '#4B311E', '#362113'],
      dark: ['#0C0908', '#231A14', '#33241B', '#453021', '#5E4127', '#795937', '#967347', '#B28F58', '#CDAC6A', '#E9CB7C', '#F6E8B7'],
    },
    vivid: {
      light: ['#FEF8DA', '#FEEFB4', '#FFDD6C', '#F9C500', '#EAB308', '#C38900', '#A86E00', '#8C5500', '#713F00', '#562B00', '#3F1B00'],
      dark: ['#0E0906', '#27180E', '#392111', '#4E2C10', '#6B3A00', '#895200', '#A66C00', '#C38900', '#EAB308', '#F6C83B', '#F7E8B1'],
    },
  },
};

for (const [nom, palette] of Object.entries(PALETTES)) {
  test(`[MOT-35] les rampes suivent le prototype : ${palette.reference}, ${nom}`, () => {
    const rampes = rampesDe(recetteAvec(palette), palette);
    const obtenues: Rampes = {};
    for (const intensite of Object.keys(rampes) as Intensite[]) {
      const rampe = rampes[intensite]!;
      obtenues[intensite] = { light: rampe.light.map((cran) => cran.hexa), dark: rampe.dark.map((cran) => cran.hexa) };
    }
    assert.deepEqual(obtenues, DU_PROTOTYPE[nom]);
  });
}
