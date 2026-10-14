/**
 * Banc de recherche : les rampes d'une palette avec une règle de chroma
 * interchangeable. Même chaîne que `rampesDe` (courbe, pivot, Color shift,
 * décalage, fonds du thème Dark, ancrage de la référence) ; seule la chroma
 * visée change. Rien ici n'entre dans le paquet.
 */
import {
  ecrireHexa, lineaireVersRgb8, normaliserTeinte, oklchVersLineaire, rgb8VersOklch, type Rgb8,
} from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { boutsDe, grilleDe } from '../../../../../../packages/couleur/src/nuances';
import {
  ancrageDe, decalageDe, fondsSombresDe, intensitesDe, partsDe, pivotDe, referenceDe,
} from '../../../../../../packages/couleur/src/palette';
import { facteurSombre, poidsA, type Cran, type Intensite, type Mode } from '../../../../../../packages/couleur/src/rampe';
import type { Palette, Recette } from '../../../../../../packages/couleur/src/recette';

/** Ce qu'une règle reçoit pour un cran : sa clarté de fabrication, sa teinte, la part du profil après Color shift, le thème. */
export interface Visee { L: number; H: number; part: number; mode: Mode; intensite: Intensite; Lcourbe: number }
export type RegleDeChroma = (v: Visee) => number;

/** Le moteur actuel : une part constante du plafond sRGB. */
export const partDuPlafond: RegleDeChroma = ({ L, H, part }) => part * plafond(L, H, 'srgb');

/**
 * L'enveloppe : la part s'applique au plus petit du plafond et d'une borne qui
 * ne dépend que de la clarté, `a × (1 − L)` vers le blanc, `b × L` vers le noir.
 */
export const enveloppe = (a: number, b: number): RegleDeChroma =>
  ({ L, H, part }) => part * Math.min(plafond(L, H, 'srgb'), a * (1 - L), b * L);

/**
 * L'enveloppe retenue : la part donne la chroma, l'enveloppe la plafonne.
 * `C = min(part × plafond, p₀ × min(a × (1 − L), b × L))`, où `p₀` est la part
 * commune du profil. Une référence terne, de part basse, garde sa chroma : la
 * borne ne la multiplie pas une seconde fois.
 */
export const enveloppes = (parProfil: Record<'soft' | 'vivid' | 'unique', { p0: number; a: number; b: number }>): RegleDeChroma =>
  ({ L, H, part, intensite }) => {
    const { p0, a, b } = parProfil[intensite];
    return Math.min(part * plafond(L, H, 'srgb'), p0 * Math.min(a * (1 - L), b * L));
  };

/**
 * L'enveloppe par thème. La borne vers le blanc, `a × (1 − L)`, plafonne les
 * crans clairs : des fonds en Light, des textes en Dark. Chaque thème a donc
 * ses bornes ; les autres termes suivent `enveloppes`.
 */
export const enveloppesParTheme = (parTheme: Record<Mode, Record<'soft' | 'vivid' | 'unique', { p0: number; a: number; b: number }>>): RegleDeChroma =>
  ({ L, H, part, intensite, mode }) => {
    const { p0, a, b } = parTheme[mode][intensite];
    return Math.min(part * plafond(L, H, 'srgb'), p0 * Math.min(a * (1 - L), b * L));
  };

/**
 * Le poids des accents d'un cran, de 0 dans les fonds à 1 dans les accents,
 * lu sur la clarté de la courbe : en Light, fonds dès 0,86 et accents sous
 * 0,70 ; en Dark, fonds sous 0,33 et accents dès 0,45.
 */
export function poidsDesAccents(Lcourbe: number, mode: Mode): number {
  const [fond, accent] = mode === 'light' ? [0.86, 0.7] : [0.33, 0.45];
  const t = Math.min(1, Math.max(0, (Lcourbe - fond) / (accent - fond)));
  return t * t * (3 - 2 * t);
}

/** Deux parts par profil : celle des fonds et celle des accents, raccordées entre 0,86 et 0,70 de clarté (Light). */
export const deuxZones = (parts: Record<'soft' | 'vivid' | 'unique', { fonds: number; accents: number }>): RegleDeChroma =>
  ({ L, H, mode, intensite, Lcourbe, part }) => {
    const { fonds, accents } = parts[intensite];
    const w = poidsDesAccents(Lcourbe, mode);
    // `part` porte le Color shift de saturation et l'atténuation des fonds Dark, relatifs à la part du profil.
    const relatif = part / (parts[intensite].accents || 1);
    return (fonds + (accents - fonds) * w) * relatif * plafond(L, H, 'srgb');
  };

/** Les deux bosses de la retenue par teinte (voir `caler-retenue.ts`). */
export interface Retenue {
  clairs: { k: number; h: number; s: number; debut: number; plein: number };
  fonces: { k: number; h: number; s: number; debut: number; plein: number };
}
const lisse = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const ecartDeTeinte = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const bosse = (H: number, h: number, s: number) => Math.exp(-0.5 * (ecartDeTeinte(H, h) / s) ** 2);

/** Le facteur de retenue à une clarté et une teinte : 1 hors des deux bosses, moins dans les verts clairs et les bleus foncés. */
export function facteurDeRetenue(r: Retenue, L: number, H: number): number {
  const clairs = r.clairs.k * bosse(H, r.clairs.h, r.clairs.s) * lisse((L - r.clairs.debut) / (r.clairs.plein - r.clairs.debut));
  const fonces = r.fonces.k * bosse(H, r.fonces.h, r.fonces.s) * lisse((r.fonces.debut - L) / (r.fonces.debut - r.fonces.plein));
  return Math.max(0, 1 - clairs - fonces);
}

/** La retenue calée sur Tailwind 3.4.17 : verts clairs et bleus foncés. */
export const RETENUE_TAILWIND: Retenue = {
  clairs: { k: 0.32, h: 157, s: 30.8, debut: 0.762, plein: 0.898 },
  fonces: { k: 0.566, h: 269.2, s: 13.8, debut: 0.685, plein: 0.213 },
};
/** La retenue des clairs calée sur Radix clair, plus forte et plus large ; les foncés suivent Tailwind. */
export const RETENUE_RADIX: Retenue = {
  clairs: { k: 0.675, h: 162.6, s: 34.9, debut: 0.561, plein: 0.881 },
  fonces: RETENUE_TAILWIND.fonces,
};

/**
 * La retenue par teinte : une part par profil, éventuellement plus basse dans
 * les fonds que dans les accents, multipliée par une retenue lisse qui ne mord
 * que là où le marché retient la chroma (verts clairs, bleus foncés).
 * `C = part(zone) × retenue(L, H) × plafond(L, H)`.
 */
export const retenueParTeinte = (parProfil: Record<'soft' | 'vivid' | 'unique', { fonds: number; accents: number; retenue: Retenue }>): RegleDeChroma =>
  ({ L, H, mode, intensite, Lcourbe, part }) => {
    const { fonds, accents, retenue } = parProfil[intensite];
    const w = poidsDesAccents(Lcourbe, mode);
    // `part` porte le Color shift de saturation et l'atténuation des fonds Dark, relatifs à la part des accents.
    const relatif = part / (accents || 1);
    return Math.min(1, (fonds + (accents - fonds) * w) * relatif * facteurDeRetenue(retenue, L, H)) * plafond(L, H, 'srgb');
  };

/**
 * La retenue par teinte et par thème. La retenue des clairs calée sur Radix
 * vise des fonds ; en Dark, ces clartés sont des textes, qui suivent la
 * retenue de Tailwind.
 */
export const retenueParTheme = (parTheme: Record<Mode, Record<'soft' | 'vivid' | 'unique', { fonds: number; accents: number; retenue: Retenue }>>): RegleDeChroma => {
  const regles = { light: retenueParTeinte(parTheme.light), dark: retenueParTeinte(parTheme.dark) };
  return (v) => regles[v.mode](v);
};

/** La règle candidate : Vivid suit Tailwind ; Soft garde des fonds plus calmes (0,6) et des textes colorés (0,85). */
export const REGLE_RETENUE = retenueParTheme({
  light: {
    soft: { fonds: 0.6, accents: 0.85, retenue: RETENUE_RADIX },
    vivid: { fonds: 0.95, accents: 0.95, retenue: RETENUE_TAILWIND },
    unique: { fonds: 0.95, accents: 0.95, retenue: RETENUE_TAILWIND },
  },
  dark: {
    soft: { fonds: 0.6, accents: 0.85, retenue: RETENUE_TAILWIND },
    vivid: { fonds: 0.95, accents: 0.95, retenue: RETENUE_TAILWIND },
    unique: { fonds: 0.95, accents: 0.95, retenue: RETENUE_TAILWIND },
  },
});

/**
 * La dérive de teinte corrigée : le préréglage actuel choisit les rampes
 * voisines de Tailwind d'après la teinte de leur cran 50 et répartit la dérive
 * au prorata de la clarté. Celle-ci les choisit d'après leur teinte à la
 * clarté de la référence, et lit sur elles la dérive à chaque bout.
 */
export function deriveAuxBouts(rampes: { pts: { L: number; H: number }[] }[], reference: { L: number; H: number }, bouts: { clair: number; sombre: number }) {
  const ecart = (a: number, b: number) => ((b - a + 540) % 360) - 180;
  const teinteA = (pts: { L: number; H: number }[], L: number) => {
    const deplie = [pts[0].H];
    for (let i = 1; i < pts.length; i += 1) deplie.push(deplie[i - 1] + ecart(pts[i - 1].H, pts[i].H));
    if (L >= pts[0].L) return deplie[0];
    if (L <= pts[pts.length - 1].L) return deplie[pts.length - 1];
    const i = pts.findIndex((p) => p.L < L);
    const t = (pts[i - 1].L - L) / (pts[i - 1].L - pts[i].L);
    return deplie[i - 1] + t * (deplie[i] - deplie[i - 1]);
  };
  const lus = rampes.map((r) => {
    const h0 = teinteA(r.pts, reference.L);
    return { h: ((h0 % 360) + 360) % 360, clair: teinteA(r.pts, bouts.clair) - h0, sombre: teinteA(r.pts, bouts.sombre) - h0 };
  }).sort((a, b) => a.h - b.h);
  let s = lus.findIndex((x) => x.h > reference.H);
  if (s < 0) s = 0;
  const b = lus[s];
  const a = lus[(s - 1 + lus.length) % lus.length];
  const t = ((reference.H - a.h + 360) % 360) / (((b.h - a.h + 360) % 360) || 360);
  const arrondi = (x: number) => Math.round(x * 100) / 100;
  return { clair: arrondi(a.clair + (b.clair - a.clair) * t), sombre: arrondi(a.sombre + (b.sombre - a.sombre) * t) };
}

/** Une rampe de Tailwind relue : la teinte, la clarté et la part du plafond de chaque cran. */
export interface RampeRelevee { nom: string; points: { L: number; H: number; part: number }[] }

/** La part relevée à la clarté `L` sur une rampe, interpolée entre ses crans, bornée à ses extrémités. */
function partALaClarte(rampe: RampeRelevee, L: number): { part: number; H: number } {
  const pts = rampe.points;
  if (L >= pts[0].L) return pts[0];
  if (L <= pts[pts.length - 1].L) return pts[pts.length - 1];
  const i = pts.findIndex((p) => p.L < L);
  const t = (pts[i - 1].L - L) / (pts[i - 1].L - pts[i].L);
  return { part: pts[i - 1].part + t * (pts[i].part - pts[i - 1].part), H: pts[i - 1].H + t * (pts[i].H - pts[i - 1].H) };
}

/**
 * La forme de saturation de Tailwind à une clarté et une teinte : à cette
 * clarté, on lit la teinte et la part de chaque rampe relevée, puis on
 * interpole la part entre les deux rampes voisines sur le cercle.
 */
export function formeTailwind(releve: RampeRelevee[], L: number, H: number): number {
  const lus = releve.map((r) => partALaClarte(r, L)).sort((a, b) => a.H - b.H);
  let suivante = lus.findIndex((p) => p.H > H);
  if (suivante < 0) suivante = 0;
  const b = lus[suivante];
  const a = lus[(suivante - 1 + lus.length) % lus.length];
  const largeur = (b.H - a.H + 360) % 360 || 360;
  const t = ((H - a.H + 360) % 360) / largeur;
  return a.part + t * (b.part - a.part);
}

/** Le relevé Tailwind : part × forme(L, H) × plafond, les fonds réduits par le facteur `fonds` de chaque profil. */
export const releveTailwind = (releve: RampeRelevee[], parts: Record<'soft' | 'vivid' | 'unique', { fonds: number; accents: number }>): RegleDeChroma =>
  ({ L, H, mode, intensite, Lcourbe, part }) => {
    const { fonds, accents } = parts[intensite];
    const w = poidsDesAccents(Lcourbe, mode);
    const relatif = part / (parts[intensite].accents || 1);
    return Math.min(1, (fonds + (accents - fonds) * w) * relatif * formeTailwind(releve, L, H)) * plafond(L, H, 'srgb');
  };

const fabriquer = (L: number, C: number, H: number): Cran => {
  const couleur = lineaireVersRgb8(oklchVersLineaire({ L, C, H }));
  const lu = rgb8VersOklch(couleur);
  return { couleur, hexa: ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H };
};
const borner = (x: number) => Math.min(1, Math.max(0, x));
const cranDeLaReference = (reference: Rgb8): Cran => {
  const lu = rgb8VersOklch(reference);
  return { couleur: reference, hexa: ecrireHexa(reference), L: lu.L, C: lu.C, H: lu.H };
};

export interface OptionsDuBanc {
  /** La part de chaque intensité ; absente, celle que `partsDe` donne. */
  parts?: Partial<Record<Intensite, number>>;
  /** Vrai : les fonds du thème Dark gardent leur atténuation. */
  fondsSombres?: boolean;
}

/** Les rampes d'une palette, ancrées comme `rampesDe`, la chroma donnée par `regle`. */
export function rampesDuBanc(recette: Recette, palette: Palette, regle: RegleDeChroma, options: OptionsDuBanc = {}) {
  const { courbes } = grilleDe(recette, palette);
  const bouts = boutsDe(recette);
  const parts = partsDe(recette, palette);
  const sombre = fondsSombresDe(recette);
  const ancrage = ancrageDe(recette, palette);
  const reference = referenceDe(palette);
  const rampes: Partial<Record<Intensite, Record<Mode, Cran[]>>> = {};
  for (const intensite of intensitesDe(palette)) {
    const derive = palette.derive[intensite === 'unique' ? 'vivid' : intensite];
    const pivot = pivotDe(recette, palette, intensite);
    const decalage = decalageDe(palette, intensite);
    const partDuProfil = options.parts?.[intensite] ?? parts[intensite] ?? 0;
    const rampe = (mode: Mode): Cran[] => courbes[mode].map((Lc, rang) => {
      if (intensite === ancrage.profil && rang === ancrage.rangs[mode]) return cranDeLaReference(reference);
      const poids = poidsA(Lc, pivot, bouts);
      const L = borner(Lc + decalage + (derive.clarte?.[poids.bout] ?? 0) * poids.poids);
      const H = normaliserTeinte(pivot.H + derive[poids.bout] * poids.poids);
      let part = borner(partDuProfil * (1 + (derive.saturation?.[poids.bout] ?? 0) * poids.poids));
      if (mode === 'dark' && options.fondsSombres !== false) part *= facteurSombre(Lc, sombre);
      return fabriquer(L, regle({ L, H, part, mode, intensite, Lcourbe: Lc }), H);
    });
    rampes[intensite] = { light: rampe('light'), dark: rampe('dark') };
  }
  return rampes;
}

/**
 * La recette aux réglages communs : chaque palette perd ses parts propres, ses
 * réglages de clarté et son Color shift de luminosité et de saturation. Elle
 * garde sa référence, son porteur et ses teintes : ce sont des choix de couleur.
 */
export function recetteAuxReglagesCommuns(recette: Recette): Recette {
  const nettoyer = (derive: Palette['derive']['soft']) => ({ clair: derive.clair, sombre: derive.sombre, origine: derive.origine });
  return {
    ...recette,
    palettes: recette.palettes.map((palette) => {
      const { parts: _parts, ...reste } = palette;
      const reglages = palette.reglages ? { ...palette.reglages, clarte: undefined, part: undefined } : undefined;
      return {
        ...reste,
        derive: { ...palette.derive, soft: nettoyer(palette.derive.soft), vivid: nettoyer(palette.derive.vivid) },
        ...(reglages ? { reglages: JSON.parse(JSON.stringify(reglages)) } : {}),
      } as Palette;
    }),
  };
}

/** L'alpha minimal et la couleur qui, composés sur `fond`, redonnent `cible` (composantes sRGB encodées). */
export function alphaMinimal(cible: Rgb8, fond: Rgb8): { couleur: [number, number, number]; alpha: number } {
  const s = cible.map((x) => x / 255);
  const b = fond.map((x) => x / 255);
  const alpha = Math.max(1e-6, ...s.map((sc, c) => (sc < b[c] ? (b[c] - sc) / b[c] : sc > b[c] ? (sc - b[c]) / (1 - b[c]) : 0)));
  const couleur = s.map((sc, c) => Math.min(1, Math.max(0, (sc - (1 - alpha) * b[c]) / alpha))) as [number, number, number];
  return { couleur, alpha };
}
export const composer = (a: { couleur: number[]; alpha: number }, fond: Rgb8): Rgb8 =>
  fond.map((f, c) => Math.round(a.couleur[c] * 255 * a.alpha + f * (1 - a.alpha))) as Rgb8;
