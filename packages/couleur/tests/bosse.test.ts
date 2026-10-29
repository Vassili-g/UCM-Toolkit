/**
 * La bosse de chroma de l'intensité porteuse : une référence plus vive que
 * sa rampe tire les crans de clarté voisine, hors des fonds, et la garde
 * rend la force qui ne fait manquer aucune promesse tenue sans elle.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODES,
  ancrageDe,
  bosseDeChroma,
  clarteSelonLaTeinteGardee,
  courbesParDefaut,
  cranDeLaVisee,
  decalageDe,
  ecrireHexa,
  enveloppeDe,
  fondsSombresDe,
  boutsDe,
  jugerLesRampes,
  cleDeLaPromesse,
  intensitesDe,
  partsDe,
  pivotDe,
  rampesDe,
  recetteParDefaut,
  referenceDe,
  rgb8VersOklch,
  viseesDeLaRampe,
  type Cran,
  type Mode,
  type Palette,
  type Rampes,
  type Recette,
  type ViseeDeCran,
} from '../src/index';
import { paletteTailwind } from './fabrique';

const neuve = (reference: string, autres: Partial<Palette> = {}, recette: Recette = recetteParDefaut()): { recette: Recette; palette: Palette } => {
  const palette = paletteTailwind('p-000000b1', reference, autres);
  return { recette: { ...recette, palettes: [palette] }, palette };
};

/**
 * Les crans de l'intensité porteuse sans la bosse (`commune`) et avec la bosse entière (`pleine`), la référence ancrée,
 * assemblés comme `rampesDe` à partir des visées de la rampe.
 */
function chaines(recette: Recette, palette: Palette): { commune: Rampes; pleine: Rampes; visees: Record<Mode, ViseeDeCran[]>; bosses: Record<Mode, number[] | null> } {
  const ancrage = ancrageDe(recette, palette);
  const reference = referenceDe(palette);
  const lue = rgb8VersOklch(reference);
  const decalage = clarteSelonLaTeinteGardee(recette, palette).decalage;
  const intensite = ancrage.profil;
  const derive = palette.derive[intensite === 'unique' ? 'vivid' : intensite];
  const visees = {} as Record<Mode, ViseeDeCran[]>;
  const bosses = {} as Record<Mode, number[] | null>;
  for (const mode of MODES) {
    visees[mode] = viseesDeLaRampe({
      courbe: recette.courbes[mode],
      bouts: boutsDe(recette),
      reference: pivotDe(recette, palette, intensite),
      derive: decalage === 0 ? derive : { ...derive, clarte: { clair: (derive.clarte?.clair ?? 0) + decalage, sombre: derive.clarte?.sombre ?? 0 } },
      part: partsDe(recette, palette)[intensite] ?? 0,
      gamut: recette.gamut,
      sombre: mode === 'dark' ? fondsSombresDe(recette) : undefined,
      decalage: decalageDe(palette, intensite),
      enveloppe: enveloppeDe(recette, intensite, mode),
      clairs: mode === 'light' ? recette.profils[intensite === 'soft' ? 'soft' : 'vivid'].clairs : 1,
      decalageDeClarteGarde: decalage,
      numeros: mode === 'light' ? recette.crans : undefined,
      rangDeLaReference: mode === 'light' ? ancrage.rangs.light : undefined,
    });
    bosses[mode] = bosseDeChroma(visees[mode], ancrage.rangs[mode], mode, lue, intensite !== 'soft');
  }
  const cranDeReference: Cran = { couleur: reference, hexa: ecrireHexa(reference), L: lue.L, C: lue.C, H: lue.H };
  const assembler = (chroma: (mode: Mode, rang: number) => number): Rampes => ({
    [intensite]: Object.fromEntries(MODES.map((mode) => [mode, visees[mode].map((visee, rang) => (rang === ancrage.rangs[mode]
      ? cranDeReference
      : cranDeLaVisee({ L: visee.L, H: visee.H, C: chroma(mode, rang) })))])),
  }) as Rampes;
  return {
    commune: assembler((mode, rang) => visees[mode][rang].C),
    pleine: assembler((mode, rang) => bosses[mode]?.[rang] ?? visees[mode][rang].C),
    visees,
    bosses,
  };
}

const hexas = (rampes: Rampes, intensite: 'soft' | 'vivid' | 'unique', mode: Mode): string[] => rampes[intensite]![mode].map((cran) => cran.hexa);

test('[MOT-39] une référence moins vive que sa rampe ne change rien : elle ne lève aucune bosse', () => {
  const visees: ViseeDeCran[] = [0.9, 0.7, 0.5, 0.3, 0.1].map((L) => ({ L, Lc: L, H: 250, C: 0.1, part: 1, plafond: 0.3 }));
  assert.equal(bosseDeChroma(visees, 2, 'light', { L: 0.5, C: 0.1, H: 250 }, false), null, 'à égalité');
  assert.equal(bosseDeChroma(visees, 2, 'dark', { L: 0.5, C: 0.07, H: 250 }, true), null);
  const { recette, palette } = neuve('#8896B0');
  assert.deepEqual(chaines(recette, palette).bosses, { light: null, dark: null });
  const rampes = rampesDe(recette, palette);
  const { commune } = chaines(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  for (const mode of MODES) assert.deepEqual(hexas(rampes, ancrage.profil, mode), hexas(commune, ancrage.profil, mode));
});

test('[MOT-39] une référence plus vive tire ses voisines, plus près d’elle en clarté, sans dépasser sa chroma ni le plafond de leur part', () => {
  // Cinq crans, la référence au milieu : la chroma visée vaut 0,05, la référence 0,15 (ρ = 3).
  const visees: ViseeDeCran[] = [0.7, 0.6, 0.5, 0.4, 0.3].map((L) => ({ L, Lc: L, H: 250, C: 0.05, part: 1, plafond: 0.3 }));
  const bosse = bosseDeChroma(visees, 2, 'light', { L: 0.5, C: 0.15, H: 250 }, false)!;
  assert.equal(bosse[2], 0.05, 'le cran de la référence garde sa chroma visée');
  // w = exp(−½ ((L − 0,5) ÷ 0,10)²) : 0,6065 à 0,1 de la référence, 0,1353 à 0,2.
  assert.ok(Math.abs(bosse[1] - 0.05 * (1 + 2 * Math.exp(-0.5))) < 1e-12);
  assert.ok(Math.abs(bosse[3] - 0.05 * (1 + 2 * Math.exp(-0.5))) < 1e-12);
  assert.ok(Math.abs(bosse[0] - 0.05 * (1 + 2 * Math.exp(-2))) < 1e-12);
  // Le plafond de la part du cran et la chroma de la référence bornent la bosse.
  const bornee = bosseDeChroma(visees.map((v) => ({ ...v, plafond: 0.06 })), 2, 'light', { L: 0.5, C: 0.15, H: 250 }, false)!;
  assert.deepEqual([bornee[1], bornee[3]], [0.06, 0.06]);
  const moinsVive = bosseDeChroma(visees, 2, 'light', { L: 0.5, C: 0.052, H: 250 }, false)!;
  assert.ok(moinsVive.every((C) => C <= 0.052 + 1e-12));
  // Aucun cran ne descend sous sa chroma visée.
  assert.ok(bosse.every((C) => C >= 0.05));
});

test('[MOT-39] les fonds restent calmes : Light au-dessus de 0,88 et Dark sous 0,50 ne bougent pas, sauf quand la référence y est portée par Vivid', () => {
  const clairs: ViseeDeCran[] = [0.95, 0.9, 0.85].map((L) => ({ L, Lc: L, H: 250, C: 0.02, part: 1, plafond: 0.3 }));
  const reference = { L: 0.9, C: 0.1, H: 250 };
  // La référence au cran 0,90 : un voisin à 0,95 est un fond. Soft le garde calme, Vivid l'ouvre à proportion de la place de la référence dans la zone.
  const soft = bosseDeChroma(clairs, 1, 'light', reference, false)!;
  assert.equal(soft[0], 0.02);
  const vivid = bosseDeChroma(clairs, 1, 'light', reference, true)!;
  assert.ok(vivid[0] > 0.02 * 1.5, `${vivid[0]}`);
  // Dark : la référence à 0,60 laisse les fonds sous 0,50 fermés ; posée à 0,40, dans la zone, elle les rouvre pour Vivid seulement.
  const sombres: ViseeDeCran[] = [0.2, 0.3, 0.4, 0.6].map((L) => ({ L, Lc: L, H: 250, C: 0.02, part: 1, plafond: 0.3 }));
  const dehors = bosseDeChroma(sombres, 3, 'dark', { L: 0.6, C: 0.1, H: 250 }, true)!;
  assert.deepEqual([dehors[0], dehors[1], dehors[2]], [0.02, 0.02, 0.02]);
  const dedans = { L: 0.4, C: 0.1, H: 250 };
  assert.equal(bosseDeChroma(sombres, 2, 'dark', dedans, false)![1], 0.02);
  assert.ok(bosseDeChroma(sombres, 2, 'dark', dedans, true)![1] > 0.02 * 1.5);
});

test('[MOT-39] #0013FF, plus vif que sa rampe, tire ses voisines en Light et en Dark ; les crans loin de lui en clarté restent à leur chroma visée', () => {
  const { recette, palette } = neuve('#0013FF');
  const { commune, bosses } = chaines(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  const rampes = rampesDe(recette, palette);
  for (const mode of MODES) {
    assert.ok(bosses[mode], mode);
    const reel = rampes[ancrage.profil]![mode];
    const sans = commune[ancrage.profil]![mode];
    const lue = rgb8VersOklch(reel[ancrage.rangs[mode]].couleur);
    const tirees = reel.filter((cran, rang) => rang !== ancrage.rangs[mode] && cran.C > sans[rang].C + 0.004);
    assert.ok(tirees.length >= 2, `${mode} : ${tirees.length} crans tirés`);
    // Un cran tiré garde la chroma de la référence comme borne.
    assert.ok(reel.every((cran, rang) => rang === ancrage.rangs[mode] || cran.C <= lue.C + 0.004), mode);
    reel.forEach((cran, rang) => {
      if (rang !== ancrage.rangs[mode] && Math.abs(cran.L - lue.L) > 0.45) assert.equal(cran.hexa, sans[rang].hexa, `${mode} ${recette.crans[rang]}`);
    });
  }
});

test('[MOT-39] les fonds de Soft ne bougent pas quand Soft porte la référence (palette de base Soft)', () => {
  const { recette, palette } = neuve('#0013FF', { base: 'soft' });
  const ancrage = ancrageDe(recette, palette);
  assert.equal(ancrage.profil, 'soft');
  const { commune, bosses } = chaines(recette, palette);
  const rampes = rampesDe(recette, palette);
  for (const mode of MODES) {
    assert.ok(bosses[mode], `${mode} : la référence est plus vive que la rampe de Soft`);
    const reel = rampes.soft![mode];
    const sans = commune.soft![mode];
    recette.courbes[mode].forEach((Lc, rang) => {
      const fond = mode === 'light' ? Lc >= 0.88 : Lc <= 0.5;
      if (fond) assert.equal(reel[rang].hexa, sans[rang].hexa, `${mode} ${recette.crans[rang]}`);
    });
  }
});

test('[MOT-39] la garde rend une force qui ne fait manquer aucune promesse tenue sans la bosse, et qui reste sous la bosse entière', () => {
  const texte = { light: 'blanc', dark: 'blanc' } as const;
  const { recette, palette } = neuve('#047917', { intensites: 1 }, { ...recetteParDefaut(), texteDesBoutons: texte, courbes: courbesParDefaut(11, texte) });
  const { commune, pleine, bosses } = chaines(recette, palette);
  assert.ok(bosses.dark, 'la référence est plus vive que la rampe en Dark');
  const intensites = intensitesDe(palette);
  const manquees = (rampes: Rampes) => new Set(jugerLesRampes(recette, intensites, rampes).filter((p) => p.verdict === 'manquee').map(cleDeLaPromesse));
  const sans = manquees(commune);
  const entiere = manquees(pleine);
  assert.ok([...entiere].some((cle) => !sans.has(cle)), 'la bosse entière ferait manquer une promesse tenue');
  const reelle = rampesDe(recette, palette);
  assert.deepEqual([...manquees(reelle)].filter((cle) => !sans.has(cle)), []);
  const reel = hexas(reelle, 'unique', 'dark');
  assert.notDeepEqual(reel, hexas(pleine, 'unique', 'dark'));
  assert.notDeepEqual(reel, hexas(commune, 'unique', 'dark'), 'la force retenue garde une part de la bosse');
  // Light n'a pas de bosse à perdre : sa force reste entière.
  assert.deepEqual(hexas(reelle, 'unique', 'light'), hexas(pleine, 'unique', 'light'));
});

test('[MOT-39] [MOT-17] l’ancrage garde ses octets avec la bosse, dans les deux modes et les trois intensités porteuses', () => {
  for (const reference of ['#0013FF', '#FF0076', '#FFD300', '#00E676', '#FF6D00']) {
    for (const extra of [{}, { base: 'soft' as const }, { intensites: 1 as const }]) {
      const { recette, palette } = neuve(reference, extra);
      const ancrage = ancrageDe(recette, palette);
      const rampes = rampesDe(recette, palette);
      for (const mode of MODES) assert.equal(rampes[ancrage.profil]![mode][ancrage.rangs[mode]].hexa, reference, `${reference} ${JSON.stringify(extra)} ${mode}`);
    }
  }
});
