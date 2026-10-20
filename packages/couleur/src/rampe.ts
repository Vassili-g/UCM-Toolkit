/**
 * Fabriquer un cran, une rampe et les rampes d'une palette ([MOT-09] à
 * [MOT-17]), avec la teinte pivotée autour de la couleur de référence, et la
 * part des fonds du thème Dark ([MOT-28]).
 */
import {
  ecartAngulaire,
  ecrireHexa,
  lineaireVersRgb8,
  normaliserTeinte,
  oklchVersLineaire,
  rgb8VersOklch,
  type Oklch,
  type Rgb8,
  type Triplet,
} from './conversions';
import { plafond, type Gamut } from './plafond';
import { INTENSITE_UNIQUE, MODES as MODES_DU_REFERENTIEL, PROFILS as PROFILS_DU_REFERENTIEL } from '@ucm-kit/core/referentiel';

export type Profil = (typeof PROFILS_DU_REFERENTIEL)[number];
export type Mode = (typeof MODES_DU_REFERENTIEL)[number];
export const MODES: readonly Mode[] = MODES_DU_REFERENTIEL;
export const PROFILS: readonly Profil[] = PROFILS_DU_REFERENTIEL;

/**
 * Une intensité d'une palette : l'un des deux profils d'une palette à deux
 * intensités, ou la rampe `unique` d'une palette à une intensité, qui n'a pas
 * de nom de profil ([ENT-14]).
 */
export type Intensite = Profil | typeof INTENSITE_UNIQUE;

/** Un décalage du Color shift à chaque bout de la rampe ([MOT-30]). */
export interface DecalageAuxBouts {
  readonly clair: number;
  readonly sombre: number;
}

/**
 * Le Color shift d'un profil ([MOT-30]) : `clair` et `sombre` portent la
 * teinte, en degrés signés (section 6.4) ; `saturation` et `clarte`, absents,
 * valent zéro aux deux bouts.
 */
export interface Derive extends DecalageAuxBouts {
  readonly saturation?: DecalageAuxBouts;
  readonly clarte?: DecalageAuxBouts;
}

/** Un bout de la rampe : celui des nuances claires, ou celui des nuances sombres. */
export type Bout = keyof DecalageAuxBouts;

/** Une dérive se borne à `[-90, 90]` degrés ([MOT-15]). */
export const DERIVE_MAXIMALE = 90;

/**
 * Les bornes du Color shift à chaque bout ([MOT-15]) : la teinte en degrés,
 * la saturation en fraction signée de la part du profil, la luminosité en
 * décalage de clarté OKLCH.
 */
export const BORNES_DU_COLOR_SHIFT = { teinte: DERIVE_MAXIMALE, saturation: 1, clarte: 0.15 } as const;

/** Les trois grandeurs du Color shift ([MOT-30]). */
export type GrandeurDuColorShift = keyof typeof BORNES_DU_COLOR_SHIFT;

/** Le pas de chaque grandeur ([DER-07]) : 1°, 1 % de la part, 0,005 de clarté. Le glisser, le clavier et le balayage des limites le suivent. */
export const PAS_DU_COLOR_SHIFT: { readonly [G in GrandeurDuColorShift]: number } = { teinte: 1, saturation: 0.01, clarte: 0.005 };

/** Les deux clartés qui bornent la dérive : celles des numéros 50 et 950 en Light (`boutsDe`, nuances.ts). */
export interface Bouts {
  readonly clair: number;
  readonly sombre: number;
}

/** Les courbes de clarté d'une recette, un nombre par cran. */
export type Courbes = Readonly<Record<Mode, readonly number[]>>;

/**
 * Arrondi à `decimales` chiffres, symétrique en signe : `signe(x) × round(|x| ×
 * 10ⁿ) / 10ⁿ` ([MOT-27]). Un angle se range au centième, une part au millième.
 */
export function arrondir(x: number, decimales: number): number {
  const facteur = 10 ** decimales;
  const arrondi = Math.round(Math.abs(x) * facteur) / facteur;
  // `-0` s'écrit `0` en JSON mais n'égale pas `0` pour `Object.is` : un angle
  // nul reste positif.
  return x < 0 && arrondi !== 0 ? -arrondi : arrondi;
}

/** Le bout qu'une clarté regarde, et la fraction de son réglage qu'elle reçoit. */
export interface Poids {
  readonly bout: Bout;
  readonly poids: number;
}

/**
 * Le poids d'une nuance de clarté `L` (section 6.4, [MOT-30]) : 0 à la clarté
 * du pivot, 1 au bout, linéaire entre les deux. Une clarté plus claire que le
 * pivot regarde le bout clair, une plus sombre le bout sombre. Hors de
 * `[Ls, Lc]`, le poids vaut 1 ([MOT-14]) ; un bout sans segment donne 0 au
 * bout clair et 1 au bout sombre.
 */
export function poidsA(L: number, reference: Oklch, bouts: Bouts): Poids {
  if (L >= reference.L) {
    const u = bouts.clair > reference.L
      ? Math.min(1, Math.max(0, (L - reference.L) / (bouts.clair - reference.L)))
      : 0;
    return { bout: 'clair', poids: u };
  }
  const v = reference.L > bouts.sombre
    ? Math.min(1, Math.max(0, (reference.L - L) / (reference.L - bouts.sombre)))
    : 1;
  return { bout: 'sombre', poids: v };
}

/**
 * La teinte à la clarté `L` (section 6.4). La référence est le pivot : à sa
 * clarté, la teinte vaut la sienne quelle que soit la dérive. Une clarté hors
 * de `[Ls, Lc]` prend la dérive entière du bout le plus proche ([MOT-14]).
 */
export function teinteA(L: number, reference: Oklch, derive: Derive, bouts: Bouts): number {
  const { bout, poids } = poidsA(L, reference, bouts);
  return normaliserTeinte(reference.H + derive[bout] * poids);
}

/** Un cran produit : la couleur à 8 bits et sa lecture OKLCH recalculée ([MOT-09], [MOT-11]). */
export interface Cran {
  readonly couleur: Rgb8;
  readonly hexa: string;
  readonly L: number;
  readonly C: number;
  readonly H: number;
}

/**
 * L'enveloppe de chroma d'un profil dans un thème ([MOT-35]) : `p0`, la part
 * commune du profil, et les bornes `a` (vers le blanc) et `b` (vers le noir).
 * `jaunes` élargit la borne vers le blanc autour de la teinte 100°. `cyans`
 * est l'amplitude d'une seconde bosse de la marge, centrée à 195° (écart type
 * 30°), dans `[−1 ; 1]`.
 */
export interface Enveloppe {
  readonly p0: number;
  readonly a: number;
  readonly b: number;
  readonly jaunes: number;
  readonly cyans: number;
}

/** Les teintes que `Enveloppe.jaunes` et `Enveloppe.cyans` élargissent, et l'écart type de chaque bosse, en degrés. */
const TEINTE_DES_JAUNES = 100;
const LARGEUR_DES_JAUNES = 12;
const TEINTE_DES_CYANS = 195;
const LARGEUR_DES_CYANS = 30;

/** Une bosse gaussienne de hauteur 1 centrée sur `centre`. */
function bosse(H: number, centre: number, largeur: number): number {
  return Math.exp(-0.5 * (ecartAngulaire(H, centre) / largeur) ** 2);
}

/**
 * La couleur visée par un cran, avant tout arrondi ([MOT-35]). La chroma vaut
 * `part × plafond(L, H)`. Avec une enveloppe, elle ne dépasse pas
 * `p0 × min(a × marge(H) × (1 − Lenveloppe), b × Lenveloppe)`, avec
 * `marge(H) = 1 + jaunes × bosse(H, 100°, 12°) + cyans × bosse(H, 195°, 30°)` :
 * `p0` ne suit ni le Color shift ni les fonds Dark, que `part` porte déjà.
 * `Lenveloppe`, absente, vaut `L` ; sinon l'enveloppe se lit à cette clarté et
 * le plafond de l'écran reste lu à `L`.
 */
export function cranVise(L: number, H: number, part: number, gamut: Gamut, enveloppe?: Enveloppe, Lenveloppe: number = L): Oklch {
  const C = part * plafond(L, H, gamut);
  if (!enveloppe) return { L, C, H };
  const marge = 1 + enveloppe.jaunes * bosse(H, TEINTE_DES_JAUNES, LARGEUR_DES_JAUNES) + enveloppe.cyans * bosse(H, TEINTE_DES_CYANS, LARGEUR_DES_CYANS);
  return { L, H, C: Math.min(C, enveloppe.p0 * Math.min(enveloppe.a * marge * (1 - Lenveloppe), enveloppe.b * Lenveloppe)) };
}

/**
 * Le chemin sans arrondi à 8 bits : les composantes linéaires bornées à
 * `[0, 1]`. Il sert à comparer le moteur aux relevés en virgule flottante de
 * l'architecture ; le plugin ne l'affiche jamais.
 */
export function cranFlottant(L: number, H: number, part: number, gamut: Gamut, enveloppe?: Enveloppe): Triplet {
  const lineaire = oklchVersLineaire(cranVise(L, H, part, gamut, enveloppe));
  return [
    Math.min(1, Math.max(0, lineaire[0])),
    Math.min(1, Math.max(0, lineaire[1])),
    Math.min(1, Math.max(0, lineaire[2])),
  ];
}

/**
 * Ce que les fonds du thème Dark retiennent de la part ([MOT-28]) : le facteur
 * `depart` jusqu'à `clarteBasse`, la clarté du numéro 50 de la courbe Dark,
 * puis un facteur qui remonte linéairement en clarté jusqu'à 1 à
 * `clarteHaute`, celle du numéro 400, et au-delà.
 */
export interface FondsSombres {
  readonly depart: number;
  readonly clarteBasse: number;
  readonly clarteHaute: number;
}

/**
 * Le facteur de la part d'un cran du thème Dark de clarté `L`, la clarté que
 * la courbe vise ([MOT-28]). Il vaut 1 dès `clarteHaute` : les accents
 * gardent leur part.
 */
export function facteurSombre(L: number, fonds: FondsSombres): number {
  const t = Math.min(1, Math.max(0, (L - fonds.clarteBasse) / (fonds.clarteHaute - fonds.clarteBasse)));
  return fonds.depart + (1 - fonds.depart) * t;
}

/** Les octets d'une couleur visée, et sa lecture OKLCH recalculée. */
export function cranDeLaVisee(visee: Oklch): Cran {
  const couleur = lineaireVersRgb8(oklchVersLineaire(visee));
  const lu = rgb8VersOklch(couleur);
  return { couleur, hexa: ecrireHexa(couleur), L: lu.L, C: lu.C, H: lu.H };
}

/** Fabrique un cran (section 6.3). */
export function fabriquerCran(L: number, H: number, part: number, gamut: Gamut, enveloppe?: Enveloppe): Cran {
  return cranDeLaVisee(cranVise(L, H, part, gamut, enveloppe));
}

/** Ce qu'une rampe demande : une courbe, un pivot, une dérive, une part, et pour le thème Dark ses fonds. */
export interface ParametresRampe {
  readonly courbe: readonly number[];
  readonly bouts: Bouts;
  /** Le pivot de la teinte : la référence, ou le départ réglé d'un profil (Z10.5). */
  readonly reference: Oklch;
  readonly derive: Derive;
  readonly part: number;
  readonly gamut: Gamut;
  /** Présent pour une rampe du thème Dark : la part de ses fonds baisse ([MOT-28]). */
  readonly sombre?: FondsSombres;
  /** Le décalage de clarté du profil, réglé dans la carte (Z10.5) ; absent, 0. */
  readonly decalage?: number;
  /** L'enveloppe de chroma du profil dans ce thème ([MOT-35]) ; absente, la chroma vaut `part × plafond`. */
  readonly enveloppe?: Enveloppe;
  /**
   * Le facteur de chroma des tons clairs du thème Light, dans `]0 ; 1]` ; absent, 1.
   * Il agit en entier au-dessus de la clarté de courbe 0,88 et plus du tout sous 0,78.
   */
  readonly clairs?: number;
  /**
   * Ce que l'enveloppe retire à la clarté d'un cran clair, au poids de son bout ;
   * absent, 0. L'enveloppe se lit alors plus bas que la clarté fabriquée.
   */
  readonly decalageDeClarteGarde?: number;
}

/** Les clartés de courbe sous lesquelles `clairs` n'agit plus, et au-dessus desquelles il agit en entier. */
const CLAIRS_PLEIN = 0.88;
const CLAIRS_NUL = 0.78;

const borner = (x: number): number => Math.min(1, Math.max(0, x));

/** La clarté à laquelle un cran de clarté de courbe `L` se fabrique, bornée à [0, 1] ([MOT-29], [MOT-30]). */
function clarteDuCran(L: number, { bout, poids }: Poids, parametres: ParametresRampe): number {
  return borner(L + (parametres.decalage ?? 0) + (parametres.derive.clarte?.[bout] ?? 0) * poids);
}

/**
 * Les crans d'une rampe, dans l'ordre de la courbe. Un décalage de clarté
 * translate la courbe, le pivot et les bouts ensemble ; le Color shift
 * décale ensuite la part et la clarté de chaque cran selon son poids
 * ([MOT-30]). Le poids, la teinte et le facteur des fonds se lisent sur la
 * clarté de la courbe ; la couleur se fabrique à la clarté décalée, et la part
 * décalée, bornées à [0, 1].
 */
export function fabriquerRampe(parametres: ParametresRampe): Cran[] {
  return couleursViseesDeLaRampe(parametres).map(cranDeLaVisee);
}

/**
 * Ce que `fabriquerRampe` vise pour un cran : sa clarté de courbe `Lc`, la
 * couleur visée (`L`, `C`, `H`), la part que `cranVise` a reçue et le plafond
 * de l'écran à la clarté fabriquée.
 */
export interface ViseeDeCran extends Oklch {
  readonly Lc: number;
  readonly part: number;
  readonly plafond: number;
}

/**
 * Les cibles de `fabriquerRampe`, avant l'arrondi à 8 bits. Le facteur
 * `clairs` multiplie la chroma après l'enveloppe, et l'enveloppe d'un cran
 * clair se lit à la clarté fabriquée moins `decalageDeClarteGarde × poids`.
 */
export function viseesDeLaRampe(parametres: ParametresRampe): ViseeDeCran[] {
  const { derive, sombre, clairs = 1, decalageDeClarteGarde = 0 } = parametres;
  return parametres.courbe.map((Lc) => {
    const poids = poidsA(Lc, parametres.reference, parametres.bouts);
    const part = borner(parametres.part * (1 + (derive.saturation?.[poids.bout] ?? 0) * poids.poids));
    const clarte = clarteDuCran(Lc, poids, parametres);
    const clarteDeLEnveloppe = poids.bout === 'clair' ? borner(clarte - decalageDeClarteGarde * poids.poids) : clarte;
    const partDuCran = sombre ? part * facteurSombre(Lc, sombre) : part;
    const visee = cranVise(
      clarte,
      teinteA(Lc, parametres.reference, derive, parametres.bouts),
      partDuCran,
      parametres.gamut,
      parametres.enveloppe,
      clarteDeLEnveloppe,
    );
    const x = borner((CLAIRS_PLEIN - Lc) / (CLAIRS_PLEIN - CLAIRS_NUL));
    const t = 1 - x * x * (3 - 2 * x);
    return { ...visee, C: visee.C * (1 - (1 - clairs) * t), Lc, part: partDuCran, plafond: plafond(visee.L, visee.H, parametres.gamut) };
  });
}

/** Les couleurs visées par `fabriquerRampe`, avant l'arrondi à 8 bits. */
export function couleursViseesDeLaRampe(parametres: ParametresRampe): Oklch[] {
  return viseesDeLaRampe(parametres).map(({ L, C, H }) => ({ L, C, H }));
}

/**
 * Les clartés auxquelles `fabriquerRampe` fabrique les crans, avant l'arrondi
 * à 8 bits. L'ordre des nuances se juge sur elles ([DER-19]).
 */
export function clartesVisees(parametres: ParametresRampe): number[] {
  return parametres.courbe.map((L) => clarteDuCran(L, poidsA(L, parametres.reference, parametres.bouts), parametres));
}

/** Une part de chroma par profil. */
export type Parts = Readonly<Record<Profil, number>>;

/**
 * Les parts qu'une palette emploie : ses parts propres quand elle en porte,
 * sinon celles de la recette.
 */
export function partsEffectives(recette: Parts, propres?: Parts): Parts {
  return propres ? { soft: propres.soft, vivid: propres.vivid } : recette;
}

/** Ce qu'une palette demande pour produire ses quatre rampes : ses courbes, et les bouts de la recette. */
export interface EntreesPalette {
  readonly reference: Rgb8;
  readonly courbes: Courbes;
  readonly bouts: Bouts;
  readonly parts: Parts;
  readonly derives: Readonly<Record<Profil, Derive>>;
  readonly gamut: Gamut;
  /** Absent, les fonds du thème Dark gardent la part de leur profil ([MOT-28]). */
  readonly sombre?: FondsSombres;
  /** Le pivot de chaque profil (Z10.5) ; absent, la référence pour les deux. */
  readonly pivots?: { readonly [P in Profil]: Oklch };
  /** Le décalage de clarté de chaque profil (Z10.5) ; absent, aucun. */
  readonly decalages?: { readonly [P in Profil]: number };
}

/** Une rampe par thème. */
export type RampeParMode = { readonly [M in Mode]: Cran[] };

/** Les quatre rampes des deux profils : `soft` et `vivid`, en clair et en sombre. */
export type RampesDesProfils = { readonly [P in Profil]: RampeParMode };

/**
 * Les rampes d'une palette, une par intensité présente : `soft` et `vivid`,
 * ou `unique` ([ENT-14]). Une intensité absente n'a pas de clé.
 */
export type Rampes = { readonly [I in Intensite]?: RampeParMode };

/** La rampe d'une intensité que la palette porte ; une intensité absente est une faute de l'appelant. */
export function rampeDe(rampes: Rampes, intensite: Intensite): RampeParMode {
  const rampe = rampes[intensite];
  if (!rampe) throw new Error(`Intensité absente de la palette : ${intensite}.`);
  return rampe;
}

/**
 * Fabrique les quatre rampes communes des deux profils : la référence fixe le
 * pivot de la teinte, et chaque cran suit sa courbe. `rampesDe` (palette.ts) y
 * ancre ensuite les octets exacts de la référence ([MOT-17]).
 */
export function fabriquerPalette(entrees: EntreesPalette): RampesDesProfils {
  const reference = rgb8VersOklch(entrees.reference);
  const { bouts } = entrees;
  const rampe = (profil: Profil, mode: Mode): Cran[] =>
    fabriquerRampe({
      courbe: entrees.courbes[mode],
      bouts,
      reference: entrees.pivots?.[profil] ?? reference,
      derive: entrees.derives[profil],
      part: entrees.parts[profil],
      gamut: entrees.gamut,
      sombre: mode === 'dark' ? entrees.sombre : undefined,
      decalage: entrees.decalages?.[profil],
    });
  return {
    soft: { light: rampe('soft', 'light'), dark: rampe('soft', 'dark') },
    vivid: { light: rampe('vivid', 'light'), dark: rampe('vivid', 'dark') },
  };
}
