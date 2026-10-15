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
 * suivent la borne `b` 0,15 du format 12, relevée sur le moteur.
 */
const DU_PROTOTYPE: Record<string, Rampes> = {
  // Bleu #3B82F6
  bleu: {
    soft: {
      light: ['#F2F7FE', '#E6F0FD', '#CFE1FA', '#B1CEF8', '#87B3F4', '#5A94F0', '#3375E9', '#2E5DBE', '#264796', '#1D3270', '#142250'],
      dark: ['#070A12', '#161B29', '#202739', '#2B354B', '#3A4764', '#4E6084', '#617BA6', '#7596CA', '#8AB3EF', '#B3D0F8', '#DBE9FC'],
    },
    vivid: {
      light: ['#F2F7FE', '#E5F0FE', '#CDE2FD', '#AECFFB', '#83B3F9', '#5494F7', '#3B82F6', '#0F52E0', '#153DB3', '#132B86', '#0E1C61'],
      dark: ['#060915', '#0F1939', '#17244E', '#1F3165', '#294384', '#345CAF', '#3B82F6', '#5494F7', '#83B3F9', '#B1D0FB', '#DAE9FD'],
    },
  },
  // Jaune #EAB308
  jaune: {
    soft: {
      light: ['#F9F8E5', '#F6F0C9', '#F2E097', '#EEC856', '#D9A93F', '#BD8B33', '#A17129', '#86581F', '#6C4216', '#522E0E', '#3C1D07'],
      dark: ['#0D0907', '#251911', '#352317', '#46301F', '#5C412A', '#785A39', '#957347', '#B28F57', '#CEAC67', '#E8CC78', '#F3E9B7'],
    },
    vivid: {
      light: ['#FBF9DB', '#FAF1B4', '#FCDF61', '#F6C60A', '#EAB308', '#C38905', '#A76E03', '#8B5502', '#713F01', '#562B01', '#3F1B00'],
      dark: ['#0E0906', '#27180E', '#392111', '#4D2C10', '#6A3A01', '#885202', '#A66D03', '#C38905', '#EAB308', '#F4C93B', '#F4E9B1'],
    },
  },
  // Vert #16A34A
  vert: {
    soft: {
      light: ['#F0FAF3', '#E2F4E7', '#C7EAD2', '#A4DCB4', '#71C78A', '#3AAF5F', '#2F924C', '#24753F', '#1A5B31', '#114324', '#092E18'],
      dark: ['#070B08', '#121F16', '#1A2D1F', '#243C2B', '#32503A', '#466B4E', '#5A8763', '#6EA479', '#81C393', '#94E3AD', '#C6F6D5'],
    },
    vivid: {
      light: ['#EAFCF0', '#D4FAE0', '#AAF4C3', '#69EA9A', '#20D26F', '#19B256', '#16A34A', '#0D7738', '#085D2D', '#044420', '#022F16'],
      dark: ['#070B08', '#112015', '#152E1D', '#153F24', '#07572A', '#0D7437', '#139244', '#16A34A', '#20D26F', '#70EB9D', '#C2F7D3'],
    },
  },
  // Rouge #B15152 à une intensité
  unique: {
    unique: {
      light: ['#FBF5F5', '#F8EBEB', '#F2D9D9', '#EAC0C1', '#E09D9E', '#D67476', '#B15152', '#994547', '#783537', '#592528', '#3F181B'],
      dark: ['#0E0909', '#271717', '#391F20', '#502829', '#703134', '#954345', '#B15152', '#D67476', '#E09D9E', '#EBC2C3', '#F5E3E3'],
    },
  },
  // Bleu #3B82F6, teinte +8° et luminosité −0,02
  reglee: {
    soft: {
      light: ['#EAF0FD', '#DEE8FC', '#C9DAF9', '#AEC6F7', '#89A9F3', '#6489EF', '#4B6AE0', '#3E53B4', '#323E8C', '#242B66', '#181B47'],
      dark: ['#05060C', '#141623', '#1E2133', '#2A2F44', '#3A415C', '#4E597D', '#63739F', '#788EC2', '#8FAAE7', '#B0C7F7', '#D5E2FB'],
    },
    vivid: {
      light: ['#E9F0FE', '#DDE8FD', '#C8DAFC', '#ACC6FB', '#86A8F9', '#6087F7', '#3B82F6', '#3645D6', '#2D33A7', '#22227B', '#171456'],
      dark: ['#05060F', '#111331', '#1A1E45', '#242A5C', '#303B7B', '#4053A5', '#3B82F6', '#6087F7', '#86A8F9', '#AEC7FB', '#D4E2FD'],
    },
  },
  // Jaune #EAB308, parts propres 0,6 et 1
  propres: {
    soft: {
      light: ['#F9F8E5', '#F6F0C9', '#F2E097', '#E6CA7B', '#CDAC6A', '#B18F58', '#977548', '#7C5C39', '#63462B', '#4B311E', '#362113'],
      dark: ['#0C0908', '#221A14', '#32241B', '#453021', '#5C412A', '#785A39', '#957347', '#B18F58', '#CDAC6A', '#E7CC7C', '#F3E9B7'],
    },
    vivid: {
      light: ['#FBF9DB', '#FAF1B4', '#FCDF61', '#F7C600', '#EAB308', '#C38900', '#A86E00', '#8B5500', '#713F00', '#562B00', '#3F1B00'],
      dark: ['#0E0906', '#27180E', '#392111', '#4E2C10', '#6A3A00', '#885200', '#A66D00', '#C38900', '#EAB308', '#F4C93B', '#F4E9B1'],
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
