/**
 * Les tirages de la mesure 3a (recette v8, `Mesures/mesurer-reconstruction.mjs`) :
 * des palettes à deux intensités aux réglages variés, tirées à graine fixe,
 * dont les rampes deviennent les couleurs figées à reconstruire.
 */
import {
  PROFILS,
  boutsDe,
  ecrireHexa,
  fabriquerCran,
  prereglageTailwind,
  profilPorteur,
  rampesDe,
  recetteParDefaut,
  referenceReglee,
  rgb8VersOklch,
  validerRecette,
  type Palette,
  type PaletteFigee,
  type Recette,
} from '../src/index';

export const GRAINE_DE_LA_MESURE = 20261008;

export const RECETTE = recetteParDefaut();
const BOUTS = boutsDe(RECETTE);

/** Générateur à graine fixe (mulberry32), celui de la mesure. */
export function generateur(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const arrondi = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;

type Derive = Palette['derive']['soft'];

export function tirerPalette(hasard: () => number, rang: number): { palette: Palette; traits: string[] } {
  const u = (a: number, b: number): number => a + (b - a) * hasard();
  const signe = (): number => (hasard() < 0.5 ? -1 : 1);
  const L = u(0.38, 0.82);
  const H = u(0, 360);
  const part = hasard() < 0.15 ? u(0.05, 0.2) : u(0.3, 1);
  const depart = fabriquerCran(L, H, part, 'srgb').couleur;
  const luDepart = rgb8VersOklch(depart);

  const genre = hasard();
  let soft: Derive;
  let vivid: Derive;
  let lien = true;
  const libre = (): Derive => {
    const derive: { clair: number; sombre: number; origine: 'libre'; saturation?: { clair: number; sombre: number }; clarte?: { clair: number; sombre: number } } = {
      clair: arrondi(u(-40, 40), 2),
      sombre: arrondi(u(-40, 40), 2),
      origine: 'libre',
    };
    if (hasard() < 0.4) {
      const saturation = { clair: arrondi(u(-0.4, 0.4), 2), sombre: arrondi(u(-0.4, 0.4), 2) };
      if (saturation.clair !== 0 || saturation.sombre !== 0) derive.saturation = saturation;
    }
    if (hasard() < 0.4) {
      const clarte = { clair: arrondi(u(-0.06, 0.06) / 0.005, 0) * 0.005, sombre: arrondi(u(-0.06, 0.06) / 0.005, 0) * 0.005 };
      const propre = { clair: arrondi(clarte.clair, 3), sombre: arrondi(clarte.sombre, 3) };
      if (propre.clair !== 0 || propre.sombre !== 0) derive.clarte = propre;
    }
    return derive;
  };
  let nature: string;
  if (genre < 0.4) {
    const d = prereglageTailwind(luDepart, BOUTS, RECETTE.derives);
    soft = vivid = { clair: d.clair, sombre: d.sombre, origine: 'tailwind' };
    nature = 'tailwind';
  } else if (genre < 0.55) {
    soft = vivid = { clair: 0, sombre: 0, origine: 'constante' };
    nature = 'constante';
  } else if (hasard() < 0.5) {
    soft = vivid = libre();
    nature = 'libre liée';
  } else {
    soft = libre();
    vivid = libre();
    lien = false;
    nature = 'libre déliée';
  }

  let palette: Palette = {
    id: `p-${(0x10000000 + rang).toString(16)}`,
    nom: `Tirage ${rang + 1}`,
    reference: ecrireHexa(depart),
    derive: { lien, soft, vivid },
  };
  const traits = [nature];
  if (hasard() < 0.3) {
    palette = { ...palette, parts: { soft: arrondi(u(0.2, 0.6), 3), vivid: arrondi(u(0.7, 1), 3), origine: 'designer' } };
    traits.push('parts propres');
  }
  if (hasard() < 0.3) {
    palette = { ...palette, base: hasard() < 0.5 ? 'soft' : 'vivid' };
    traits.push(`base ${palette.base}`);
  }
  if (hasard() < 0.45) {
    const porteur = profilPorteur(RECETTE, palette);
    const teinte: { soft?: number; vivid?: number } = {};
    const clarte: { soft?: number; vivid?: number } = {};
    for (const profil of PROFILS) {
      if (hasard() < 0.5) teinte[profil] = signe() * Math.round(u(1, 20));
      if (hasard() < 0.5) clarte[profil] = signe() * 0.005 * Math.round(u(1, 14));
    }
    const reglages: NonNullable<Palette['reglages']> & { teinte?: typeof teinte; clarte?: typeof clarte; part?: number; porteur?: 'soft' | 'vivid' } = {};
    if (Object.keys(teinte).length) reglages.teinte = teinte;
    if (Object.keys(clarte).length) {
      reglages.clarte = Object.fromEntries(Object.entries(clarte).map(([cle, v]) => [cle, arrondi(v as number, 3)]));
    }
    if (hasard() < 0.25) reglages.part = arrondi(u(0.2, 1), 3);
    if (!reglages.teinte && !reglages.clarte && reglages.part === undefined) reglages.teinte = { [porteur]: signe() * Math.round(u(1, 20)) };
    if (!palette.base) reglages.porteur = porteur;
    const sur = (cle: 'teinte' | 'clarte'): number | undefined => reglages[cle]?.[porteur];
    const touche = reglages.part !== undefined || sur('teinte') !== undefined || sur('clarte') !== undefined;
    if (touche) {
      const reference = referenceReglee(depart, sur('teinte') ?? 0, sur('clarte') ?? 0, reglages.part, 'srgb');
      palette = { ...palette, reference: ecrireHexa(reference), originale: ecrireHexa(depart), reglages };
    } else {
      palette = { ...palette, reglages };
    }
    traits.push(`réglages${touche ? ' (porteur)' : ' (autre profil)'}`);
  }
  return { palette, traits };
}

/** Les `nombre` premiers tirages valides de la graine de la mesure : les mêmes palettes que le script. */
export function tirerLesPalettes(nombre: number): { palette: Palette; traits: string[]; numero: number }[] {
  const hasard = generateur(GRAINE_DE_LA_MESURE);
  const palettes: { palette: Palette; traits: string[]; numero: number }[] = [];
  let essais = 0;
  while (palettes.length < nombre) {
    essais += 1;
    const tirage = tirerPalette(hasard, palettes.length);
    const verdict = validerRecette({ ...RECETTE, palettes: [tirage.palette] });
    if ('refus' in verdict) {
      if (essais > nombre * 20) throw new Error(`Tirages refusés : ${JSON.stringify(verdict.refus)}`);
      continue;
    }
    palettes.push({ ...tirage, numero: palettes.length + 1 });
  }
  return palettes;
}

/** La graine de recherche par palette de la mesure : `--seul=N` rend le même résultat que la série. */
export const graineDeRecherche = (numero: number): number => (GRAINE_DE_LA_MESURE ^ 0x9e3779b9) + numero;

/** La palette figée que ses rampes donnent : les couleurs des deux intensités, en Light et en Dark. */
export function figerLaPalette(recette: Recette, palette: Palette): PaletteFigee {
  const rampes = rampesDe(recette, palette);
  const couleurs = (profil: 'soft' | 'vivid') => ({
    light: rampes[profil]!.light.map((cran) => cran.hexa),
    dark: rampes[profil]!.dark.map((cran) => cran.hexa),
  });
  return { crans: recette.crans, figees: { soft: couleurs('soft'), vivid: couleurs('vivid') }, reference: palette.reference };
}
