/**
 * Le profil porteur prend l'intensité de la référence ([ENT-11]), qu'une
 * palette de base le force, que les réglages le figent ou que le classement
 * automatique le choisisse ; l'autre profil suit, calculé à la lecture.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORMAT_RECETTE,
  MODES,
  PROFILS,
  alertesDePalette,
  ancrageDe,
  arrondir,
  classerRecette,
  jsonCanonique,
  lireHexa,
  partDeChroma,
  partsDe,
  profilAutomatique,
  profilPorteur,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  type Palette,
  type Profil,
  type Recette,
} from '../src/index';
import { paletteTailwind } from './fabrique';

/** Une recette d'une seule palette de cette référence, forcée sur `base` quand elle est donnée. */
function forcee(reference: string, base?: Profil, recette: Recette = recetteParDefaut()): { recette: Recette; palette: Palette } {
  const palette = paletteTailwind('p-000000b1', reference, base ? { base } : {});
  return { recette: { ...recette, palettes: [palette] }, palette };
}

/** Le rapport des parts communes par défaut, Vivid sur Soft. */
const RAPPORT = 0.95 / 0.45;

const partDe = (reference: string): number => arrondir(partDeChroma(lireHexa(reference)!, 'srgb'), 3);

const codesDAlerte = (recette: Recette, palette: Palette): string[] => alertesDePalette(recette, palette).map((alerte) => alerte.code);

test('[ENT-11] une référence terne forcée en Vivid : Vivid prend son intensité, Soft garde le rapport des parts communes', () => {
  const { recette, palette } = forcee('#A0B599', 'vivid');
  assert.equal(profilAutomatique(recette, palette), 'soft');
  assert.equal(profilPorteur(recette, palette), 'vivid');
  const part = partDe('#A0B599');
  assert.deepEqual(partsDe(recette, palette), { soft: arrondir(part / RAPPORT, 3), vivid: part });
  assert.ok(!codesDAlerte(recette, palette).includes('reference-plus-terne'));
  assert.ok(!codesDAlerte(recette, palette).includes('reference-plus-vive'));
});

test('[ENT-11] une référence saturée forcée en Soft : Soft prend son intensité, Vivid ne descend pas sous elle', () => {
  const { recette, palette } = forcee('#1E6FD9', 'soft');
  assert.equal(profilAutomatique(recette, palette), 'vivid');
  assert.equal(profilPorteur(recette, palette), 'soft');
  const part = partDe('#1E6FD9');
  assert.deepEqual(partsDe(recette, palette), { soft: part, vivid: Math.max(0.95, part) });
  assert.ok(!codesDAlerte(recette, palette).some((code) => code === 'reference-plus-terne' || code === 'reference-plus-vive'));
});

test('[ENT-11] forcer le profil qu’Auto aurait choisi aligne quand même son intensité sur la référence', () => {
  const { recette, palette } = forcee('#1E6FD9', 'vivid');
  assert.equal(profilPorteur(recette, palette), profilAutomatique(recette, palette));
  assert.deepEqual(partsDe(recette, palette), { soft: 0.45, vivid: partDe('#1E6FD9') });
});

test('[ENT-11] sans palette de base, le porteur classé prend l’intensité de la référence, l’autre garde la part commune', () => {
  const { recette, palette } = forcee('#1E6FD9');
  assert.equal(profilPorteur(recette, palette), 'vivid');
  assert.deepEqual(partsDe(recette, palette), { soft: 0.45, vivid: partDe('#1E6FD9') });
  // Au-dessus de la part commune de Soft, Soft porteur prend la part de la référence et Vivid garde la sienne.
  const vert = forcee('#559765');
  assert.equal(profilPorteur(vert.recette, vert.palette), 'soft');
  assert.deepEqual(partsDe(vert.recette, vert.palette), { soft: partDe('#559765'), vivid: 0.95 });
});

test('[ENT-11] sous la part commune de Soft, Soft porte la référence et Vivid garde le rapport des parts communes', () => {
  for (const reference of ['#897288', '#7C717B', '#6B7280', '#78716C']) {
    const { recette, palette } = forcee(reference);
    const part = partDe(reference);
    assert.ok(part < 0.45, reference);
    assert.equal(profilPorteur(recette, palette), 'soft', reference);
    assert.deepEqual(partsDe(recette, palette), { soft: part, vivid: arrondir(part * RAPPORT, 3) }, reference);
  }
});

test('[ENT-11] la part de l’autre profil est continue quand la référence passe la part commune de Soft', () => {
  // La part commune de Soft encadre celle de #897288, 0,160 : Vivid passe du rapport à sa part commune sans saut.
  const part = partDe('#897288');
  const autour = (soft: number) => {
    const { recette, palette } = forcee('#897288', 'soft', { ...recetteParDefaut(), profils: { soft: { part: soft }, vivid: { part: 0.95 } } });
    return partsDe(recette, palette).vivid!;
  };
  assert.ok(Math.abs(autour(part + 0.001) - 0.95) <= 0.01);
  assert.equal(autour(part), 0.95);
  assert.equal(autour(part - 0.001), 0.95);
});

test('[ENT-11] des intensités du designer passent avant celles de la palette de base', () => {
  const { recette, palette } = forcee('#1E6FD9', 'soft');
  const designer: Palette = { ...palette, parts: { soft: 0.3, vivid: 0.8, origine: 'designer' } };
  assert.deepEqual(partsDe(recette, designer), { soft: 0.3, vivid: 0.8 });
  assert.equal(profilPorteur(recette, designer), 'soft');
});

test('[ENT-11] changer les intensités communes ne déplace pas une référence forcée', () => {
  const { recette, palette } = forcee('#A0B599', 'vivid');
  const autre: Recette = { ...recette, profils: { soft: { part: 0.1 }, vivid: { part: 0.2 } } };
  assert.equal(profilPorteur(autre, palette), 'vivid');
  assert.equal(partsDe(autre, palette).soft, Math.min(0.1, partDe('#A0B599')));
});

test('[ENT-11] propriété : sur des teintes, clartés et intensités communes variées, la palette forcée se valide et porte sa référence exacte', () => {
  const communes: [number, number][] = [[0.45, 0.95], [0.1, 0.2], [0.6, 0.6], [0, 1]];
  for (let teinte = 0; teinte < 360; teinte += 37) {
    for (const clarte of [25, 45, 65, 85]) {
      const reference = hsl(teinte, 70, clarte);
      for (const [soft, vivid] of communes) {
        for (const base of PROFILS) {
          const recette: Recette = { ...recetteParDefaut(), profils: { soft: { part: soft }, vivid: { part: vivid } } };
          const { recette: avec, palette } = forcee(reference, base, recette);
          const nom = `${reference} ${base} ${soft}/${vivid}`;
          assert.ok('recette' in validerRecette(avec), nom);
          const parts = partsDe(avec, palette);
          assert.ok(parts.soft! <= parts.vivid!, nom);
          assert.equal(ancrageDe(avec, palette).profil, base, nom);
          const rampes = rampesDe(avec, palette);
          for (const mode of MODES) assert.equal(rampes[base]![mode][ancrageDe(avec, palette).rangs[mode]].hexa, reference, `${nom} ${mode}`);
          assert.ok(!codesDAlerte(avec, palette).some((code) => code === 'reference-plus-terne' || code === 'reference-plus-vive'), nom);
        }
      }
    }
  }
});

test('[REC-05] une palette de base autre que soft ou vivid est refusée', () => {
  const recette = { ...recetteParDefaut(), palettes: [{ ...paletteTailwind('p-000000b1', '#1E6FD9'), base: 'auto' }] };
  const lue = validerRecette(recette);
  assert.ok('refus' in lue);
  assert.deepEqual(lue.refus, [{ regle: 'base-inconnue', chemin: 'palettes[0].base', valeur: 'auto' }]);
});

/** Un hexa depuis teinte, saturation et luminosité HSL, en entiers. */
function hsl(teinte: number, saturation: number, luminosite: number): string {
  const s = saturation / 100;
  const l = luminosite / 100;
  const a = s * Math.min(l, 1 - l);
  const canal = (n: number): string => {
    const k = (n + teinte / 30) % 12;
    const valeur = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(valeur * 255).toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${canal(0)}${canal(8)}${canal(4)}`;
}
