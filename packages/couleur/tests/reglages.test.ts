/**
 * Teinte, saturation et luminosité réglées dans la carte (Z10.5) : la forme de
 * `reglages`, la recette 4 relue sans changer de couleur, la référence tirée
 * de son départ, le pivot de chaque profil et l'ancrage sur le départ.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ancrageDe,
  classerRecette,
  ecrireHexa,
  fabriquerCran,
  jsonCanonique,
  lireHexa,
  normaliserTeinte,
  partDeLaReference,
  partsDesProfils,
  pivotDe,
  propositionDAjustement,
  rampesDe,
  rangPorteur,
  recetteParDefaut,
  referenceReglee,
  rgb8VersOklch,
  teinteA,
  boutsDe,
  validerRecette,
  type Palette,
  type Reglages,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

const BLEU = '#1E6FD9';

/** Bleu dont Vivid, porteur, est réglé : la référence tirée de l'originale. */
function bleuRegle(reglages: Reglages): Palette {
  const depart = lireHexa(BLEU)!;
  const teinte = reglages.teinte?.vivid ?? 0;
  const clarte = reglages.clarte?.vivid ?? 0;
  const reference = ecrireHexa(referenceReglee(depart, teinte, clarte, undefined, 'srgb'));
  return paletteTailwind('p-000000e1', reference, { originale: BLEU, reglages: { porteur: 'vivid', ...reglages } });
}

const refus = (palette: Palette): string[] => {
  const lue = validerRecette(recetteAvec(palette));
  return 'refus' in lue ? lue.refus.map(({ regle, chemin }) => `${regle} ${chemin}`) : [];
};

test('Z10.5 [REC-05] des réglages bornés, jamais nuls, adaptés au nombre d’intensités, se valident', () => {
  assert.deepEqual(refus(bleuRegle({ teinte: { vivid: 8 }, clarte: { soft: -0.02 } })), []);
  assert.deepEqual(refus(paletteTailwind('p-000000e2', BLEU, { reglages: { porteur: 'vivid', teinte: { soft: 6 } } })), [], 'un réglage de l’autre profil ne demande pas d’originale');
  assert.deepEqual(refus({ ...paletteTailwind('p-000000e3', BLEU), intensites: 1, originale: '#1E6FDA', reglages: { part: 0 } }), [], 'une part nulle est une saturation, pas un réglage vide');
  assert.deepEqual(refus(paletteTailwind('p-000000e7', '#1E70DA', { originale: BLEU, reglages: { porteur: 'vivid', part: 0.5 } })), [], 'à deux intensités, la part est celle du porteur');
});

test('Z10.5 [REC-05] chaque règle des réglages refuse sa faute', () => {
  const cas: [Palette, string][] = [
    [bleuRegle({ teinte: { vivid: 31 } }), 'reglages-bornes palettes[0].reglages.teinte.vivid'],
    [bleuRegle({ clarte: { vivid: 0.11 } }), 'reglages-bornes palettes[0].reglages.clarte.vivid'],
    [bleuRegle({ teinte: { soft: 0 } }), 'reglage-nul palettes[0].reglages.teinte.soft'],
    [paletteTailwind('p-000000e4', BLEU, { reglages: { porteur: 'vivid' } }), 'reglage-nul palettes[0].reglages'],
    [paletteTailwind('p-000000e5', BLEU, { reglages: { teinte: { soft: 5 } } }), 'porteur-manquant palettes[0].reglages'],
    [paletteTailwind('p-000000e6', BLEU, { base: 'vivid', reglages: { porteur: 'vivid', teinte: { soft: 5 } } }), 'porteur-base palettes[0].reglages.porteur'],
    [{ ...paletteTailwind('p-000000e8', BLEU), intensites: 1, reglages: { teinte: { soft: 5 } } }, 'reglages-intensites palettes[0].reglages.teinte.soft'],
    [paletteTailwind('p-000000e9', '#1E70DA', { reglages: { porteur: 'vivid', teinte: { vivid: 2 } } }), 'reglages-sans-originale palettes[0].reglages'],
    [paletteTailwind('p-000000ea', BLEU, { originale: '#2A7FDB', reglages: { porteur: 'vivid', teinte: { soft: 5 }, depart: '#1E70DA' } }), 'depart-sans-reglage palettes[0].reglages.depart'],
    [paletteTailwind('p-000000eb', '#1E70DA', { originale: BLEU, reglages: { porteur: 'vivid', teinte: { vivid: 2 }, depart: BLEU } }), 'depart-identique palettes[0].reglages.depart'],
  ];
  for (const [palette, attendu] of cas) assert.ok(refus(palette).includes(attendu), `${attendu} attendu, lu ${refus(palette).join(' ; ')}`);
});

test('Z10.5 [REC-05] un réglage du porteur qui rend les octets de l’originale la garde ; sans réglage, l’originale identique reste refusée', () => {
  assert.deepEqual(refus(paletteTailwind('p-000000ec', BLEU, { originale: BLEU, reglages: { porteur: 'vivid', teinte: { vivid: 0.01 } } })), []);
  assert.ok(refus(paletteTailwind('p-000000ed', BLEU, { originale: BLEU })).includes('originale-identique palettes[0].originale'));
});

test('Z10.5 la référence réglée : zéro rend le départ à l’octet, la clarté seule égale l’ajustement de la version 4', () => {
  // Refabriquées depuis leur OKLCH, ces couleurs très sombres changent d'octets : #000012 donnerait #00010F.
  for (const sombre of [[0, 0, 6], [0, 0, 18], [0, 0, 12]] as const) assert.deepEqual(referenceReglee(sombre, 0, 0, undefined, 'srgb'), sombre);
  for (let rang = 0; rang < 400; rang += 1) {
    const depart: [number, number, number] = [(rang * 53 + 17) % 256, (rang * 97 + 41) % 256, (rang * 29 + 88) % 256];
    assert.deepEqual(referenceReglee(depart, 0, 0, undefined, 'srgb'), depart);
    for (let pas = -5; pas <= 2; pas += 1) {
      assert.deepEqual(referenceReglee(depart, 0, pas / 100, undefined, 'srgb'), propositionDAjustement(depart, pas, 'srgb'), `pas ${pas}`);
    }
  }
});

test('Z10.5 [MOT-14] à la clarté du départ, la teinte de chaque profil vaut celle de son pivot, pour tout réglage', () => {
  const recette = recetteParDefaut();
  for (let rang = 0; rang < 300; rang += 1) {
    const reglages: Reglages = { teinte: { vivid: ((rang * 7) % 61) - 30 || 1, soft: ((rang * 11) % 61) - 30 || -1 }, clarte: { vivid: -((rang % 5) + 1) / 100, soft: ((rang % 3) - 1) / 100 || 0.01 } };
    const palette = bleuRegle(reglages);
    for (const profil of ['soft', 'vivid'] as const) {
      const pivot = pivotDe(recette, palette, profil);
      assert.equal(pivot.H, normaliserTeinte(rgb8VersOklch(lireHexa(BLEU)!).H + (reglages.teinte?.[profil] ?? 0)));
      assert.equal(pivot.L, rgb8VersOklch(lireHexa(BLEU)!).L, 'le pivot garde la clarté du départ');
      assert.equal(teinteA(pivot.L, pivot, palette.derive[profil], boutsDe(recette)), pivot.H);
    }
  }
});

test('Z10.5 [MOT-17] près d’une frontière de nuances, la luminosité du porteur garde le ◆ au rang de son départ', () => {
  const recette = recetteParDefaut();
  const [cinqCents, sixCents] = [recette.crans.indexOf(500), recette.crans.indexOf(600)];
  const milieu = (recette.courbes.light[cinqCents] + recette.courbes.light[sixCents]) / 2;
  const depart = fabriquerCran(milieu - 0.008, 255, 0.8, 'srgb').couleur;
  const originale = ecrireHexa(depart);
  const reference = ecrireHexa(referenceReglee(depart, 0, 0.02, undefined, 'srgb'));
  const palette = paletteTailwind('p-000000f0', reference, { originale, reglages: { porteur: 'vivid', clarte: { vivid: 0.02 } } });
  assert.deepEqual(refus(palette), []);
  const rangDuDepart = rangPorteur(recette.courbes.light, rgb8VersOklch(depart).L);
  assert.notEqual(rangPorteur(recette.courbes.light, rgb8VersOklch(lireHexa(reference)!).L), rangDuDepart, 'la référence réglée franchit la frontière : le cas éprouve l’ancrage');
  assert.equal(ancrageDe(recette, palette).rangs.light, rangDuDepart);
  assert.equal(rampesDe(recette, palette).vivid!.light[rangDuDepart].hexa, reference, 'les octets de la référence au rang du départ');
});

test('Z10.5 un décalage de clarté translate la rampe sans changer la teinte de ses crans', () => {
  const recette = recetteParDefaut();
  // Une dérive forte : lire la teinte à la clarté décalée la changerait d’environ 6,7°, et l’arrondi à 8 bits d’un cran en coûte jusqu’à 2,4.
  const libre = { clair: 60, sombre: -60, origine: 'libre' as const };
  // Soft porte la référence : Vivid, décalé, garde sa part de 0,95 et des crans assez vifs pour lire leur teinte.
  const base = paletteTailwind('p-000000f1', BLEU, { base: 'soft', derive: { lien: false, soft: libre, vivid: libre } });
  const decalee: Palette = { ...base, reglages: { clarte: { vivid: -0.05 } } };
  assert.deepEqual(refus(decalee), []);
  const avant = rampesDe(recette, base).vivid!.light;
  const apres = rampesDe(recette, decalee).vivid!.light;
  let juges = 0;
  apres.forEach((cran, rang) => {
    assert.ok(Math.abs(cran.L - avant[rang].L + 0.05) < 0.01, `rang ${rang} : la clarté descend de 0,05`);
    if (cran.C < 0.08 || avant[rang].C < 0.08) return;
    juges += 1;
    const ecart = Math.abs(((cran.H - avant[rang].H + 540) % 360) - 180);
    assert.ok(ecart < 3, `rang ${rang} : la teinte bouge de ${ecart.toFixed(2)}°`);
  });
  assert.ok(juges >= 5, `${juges} crans jugés`);
  assert.deepEqual(rampesDe(recette, decalee).soft, rampesDe(recette, base).soft, 'l’autre profil ne bouge pas');
});

test('Z10.5 [MOT-17] le porteur figé par les réglages l’emporte sur le classement automatique', () => {
  const recette = recetteParDefaut();
  const automatique = ancrageDe(recette, paletteTailwind('p-000000f2', BLEU)).profil;
  const autre = automatique === 'vivid' ? 'soft' : 'vivid';
  const figee = paletteTailwind('p-000000f3', BLEU, { reglages: { porteur: autre, teinte: { [automatique]: 5 } } });
  assert.deepEqual(refus(figee), []);
  assert.equal(ancrageDe(recette, figee).profil, autre);
  assert.equal(rampesDe(recette, figee)[autre]!.light[ancrageDe(recette, figee).rangs.light].hexa, BLEU);
});

test('[ENT-09] la saturation réglée de la référence est la part de son porteur, parts du designer comprises', () => {
  const recette = recetteParDefaut();
  const depart = lireHexa(BLEU)!;
  const reference = ecrireHexa(referenceReglee(depart, 0, 0, 0.2, 'srgb'));
  const reglee = paletteTailwind('p-000000f4', reference, { originale: BLEU, reglages: { porteur: 'vivid', part: 0.2 } });
  assert.deepEqual(refus(reglee), []);
  assert.equal(partDeLaReference(recette, reglee), 0.2);
  const designer: Palette = { ...reglee, parts: { soft: 0.1, vivid: 0.6, origine: 'designer' } };
  assert.deepEqual(partsDesProfils(recette, designer), { soft: 0.1, vivid: 0.2 }, 'la part rangée du porteur cède à celle de la référence');
  // La référence est un cran de sa rampe : à sa clarté, le calcul rend ses octets.
  const lue = rgb8VersOklch(lireHexa(reference)!);
  const cran = fabriquerCran(lue.L, lue.H, partsDesProfils(recette, reglee).vivid, 'srgb');
  assert.equal(cran.hexa, reference);
});
