/**
 * Une palette lue contre sa recette : ses intensités, ses parts, l'ancrage de
 * sa référence et ses rampes.
 *
 * Chaque fonction reçoit une recette déjà validée ([REC-05]).
 */
import { CHROMA_SANS_TEINTE, ecrireHexa, lireHexa, normaliserTeinte, rgb8VersOklch, type Oklch, type Rgb8 } from './conversions';
import { PREREGLAGES, boutsDe, estLibre, etendueDe, grilleDe } from './nuances';
import { plafond } from './plafond';
import {
  arrondir,
  clartesVisees,
  fabriquerRampe,
  MODES,
  partsEffectives,
  PROFILS,
  rampeDe,
  type Cran,
  type FondsSombres,
  type Intensite,
  type Mode,
  type ParametresRampe,
  type Parts,
  type Profil,
  type RampeParMode,
  type Rampes,
} from './rampe';
import type { Palette, Recette } from './recette';

/** Vrai pour une palette à une intensité ([ENT-14]). */
export function aUneIntensite(palette: Palette): boolean {
  return palette.intensites === 1;
}

/**
 * Les intensités qu'une palette porte, dans l'ordre de l'affichage : `unique`,
 * ou `soft` puis `vivid` ([ENT-14]). Toute vue qui parcourt les rampes, les
 * promesses ou les pastilles d'une palette lit cette liste.
 */
export function intensitesDe(palette: Palette): readonly Intensite[] {
  return aUneIntensite(palette) ? ['unique'] : PROFILS;
}

/** La part d'une intensité, par intensité présente. */
export type PartsDePalette = { readonly [I in Intensite]?: number };

/** La couleur de référence d'une palette validée. */
export function referenceDe(palette: Palette): Rgb8 {
  const couleur = lireHexa(palette.reference);
  if (!couleur) throw new Error(`Référence illisible : ${palette.reference}. La recette n'a pas été validée.`);
  return couleur;
}

/**
 * Vrai pour un gris pur ([MOT-18]) : R, G et B ne diffèrent pas de plus d'une
 * unité. Un voisin à une unité est alors un gris sans teinte, et la teinte
 * lue ne dit rien de l'intention du designer.
 */
export function estGrisPur(couleur: Rgb8): boolean {
  return Math.max(...couleur) - Math.min(...couleur) <= 1;
}

/**
 * La part de chroma de la référence ([MOT-18]), au millième : la précision à
 * laquelle une part se range ([MOT-27]). Nulle pour un gris pur. Le plafond
 * se lit à la teinte de la référence et à sa clarté bornée à l'étendue de la
 * liste de la palette : près du noir ou du blanc, le plafond à sa propre
 * clarté est minuscule, et la part mesurée là colorerait les nuances du
 * milieu. Une référence dans l'étendue garde la part de `partDeChroma`.
 * Une saturation réglée dans la carte (`reglages.part`) est la part de la
 * référence : `referenceReglee` l'a fabriquée à cette part, à sa clarté
 * propre, comme un cran de la rampe. La rampe, le curseur et les alertes
 * lisent alors ce nombre, et non une mesure à la clarté bornée.
 */
export function partDeLaReference(recette: Recette, palette: Palette): number {
  if (palette.reglages?.part !== undefined) return palette.reglages.part;
  const reference = referenceDe(palette);
  const lue = rgb8VersOklch(reference);
  if (estGrisPur(reference) || lue.C < CHROMA_SANS_TEINTE) return 0;
  const etendue = etendueDe(grilleDe(recette, palette));
  const maximum = plafond(Math.min(etendue.clair, Math.max(etendue.sombre, lue.L)), lue.H, recette.gamut);
  return arrondir(maximum <= 0 ? 1 : Math.min(1, lue.C / maximum), 3);
}

/**
 * Les parts de chroma qu'une palette emploie, une par intensité. Une palette
 * à une intensité prend la part de sa référence ([ENT-14]). Sinon ses parts
 * du designer passent d'abord, puis celles de `partsDesProfils`. Ces parts se
 * calculent à la lecture et ne se rangent pas : un changement de référence ou
 * de part commune les suit sans rangement.
 */
export function partsDe(recette: Recette, palette: Palette): PartsDePalette {
  return aUneIntensite(palette) ? { unique: partDeLaReference(recette, palette) } : partsDesProfils(recette, palette);
}

/**
 * Les parts des deux profils d'une palette à deux intensités, celles que
 * `partsDe` lui donne ([ENT-11]). Des parts du designer passent d'abord.
 * Sinon le profil porteur prend la part de la référence, qu'il soit forcé,
 * figé ou classé. Sous la part commune de soft, l'autre profil garde le
 * rapport des parts communes : une référence terne donne deux profils ternes
 * et distincts. Au-dessus, l'autre garde sa part commune, bornée pour que
 * soft ne dépasse pas vivid. Une saturation réglée de la référence
 * (`reglages.part`) est toujours celle du porteur, parts du designer
 * comprises : la référence et ses voisines ont la même part.
 */
export function partsDesProfils(recette: Recette, palette: Palette): Parts {
  const communes = { soft: recette.profils.soft.part, vivid: recette.profils.vivid.part };
  const porteur = profilPorteur(recette, palette);
  const reglee = palette.reglages?.part;
  if (palette.parts) {
    const propres = partsEffectives(communes, palette.parts);
    return reglee === undefined ? propres : { ...propres, [porteur]: reglee };
  }
  const part = partDeLaReference(recette, palette);
  const terne = part < communes.soft;
  const rapport = communes.soft > 0 ? communes.vivid / communes.soft : 1;
  if (porteur === 'soft') {
    return { soft: part, vivid: terne ? Math.min(1, arrondir(part * rapport, 3)) : Math.max(communes.vivid, part) };
  }
  return { soft: terne ? arrondir(part / rapport, 3) : Math.min(communes.soft, part), vivid: part };
}

/**
 * Vrai pour une palette grise ([DER-15]) : aucune nuance calculée, hors du
 * cran de la référence, n'a de couleur. R, G et B y sont égaux, dans chaque
 * intensité et chaque mode. La teinte ne s'y voit pas : l'éditeur de dérive
 * et la piste de teinte se désactivent. Des parts toutes nulles donnent des
 * gris purs, sans calcul des rampes.
 */
export function estPaletteGrise(recette: Recette, palette: Palette): boolean {
  if (Object.values(partsDe(recette, palette)).every((part) => part === 0)) return true;
  const ancrage = ancrageDe(recette, palette);
  const rampes = rampesDe(recette, palette);
  return intensitesDe(palette).every((intensite) => MODES.every((mode) =>
    rampeDe(rampes, intensite)[mode].every(({ couleur }, rang) =>
      (intensite === ancrage.profil && rang === ancrage.rangs[mode]) || (couleur[0] === couleur[1] && couleur[1] === couleur[2]))));
}

/**
 * La clarté Dark d'un numéro qui borne les fonds : celle de la courbe commune
 * quand la liste le porte, sinon celle de la courbe par défaut des onze
 * nuances. Une interpolation déplacerait la borne quand un préréglage retire
 * le 400, et les fonds changeraient de couleur sans qu'aucune nuance gardée
 * n'ait bougé.
 */
function borneDesFonds(recette: Recette, numero: 50 | 400): number {
  const rang = recette.crans.indexOf(numero);
  if (rang >= 0) return recette.courbes.dark[rang];
  const { crans, courbes } = PREREGLAGES[11];
  return courbes.dark[crans.indexOf(numero)];
}

/**
 * Les fonds du thème Dark d'une recette ([MOT-28]) : le facteur rangé, et les
 * clartés Dark des numéros 50 et 400 (`borneDesFonds`).
 */
export function fondsSombresDe(recette: Recette): FondsSombres {
  return {
    depart: recette.intensiteDesFondsSombres,
    clarteBasse: borneDesFonds(recette, 50),
    clarteHaute: borneDesFonds(recette, 400),
  };
}

/** Une part au millième entier : la précision à laquelle une part se range ([MOT-27]). */
const enMilliemes = (part: number): number => Math.round(part * 1000);

/**
 * Le profil que le classement automatique choisit ([MOT-17]) : celui dont la
 * part **commune** est la plus proche de la part de la référence, comparées
 * au millième. Égalité : `vivid`. Un gris pur, de part nulle, va à `soft`.
 * Les parts propres d'une palette n'y entrent pas : les régler ne fait pas
 * passer la référence d'un profil à l'autre.
 */
export function profilAutomatique(recette: Recette, palette: Palette): Profil {
  const part = enMilliemes(partDeLaReference(recette, palette));
  const versSoft = Math.abs(part - enMilliemes(recette.profils.soft.part));
  const versVivid = Math.abs(part - enMilliemes(recette.profils.vivid.part));
  return versSoft < versVivid ? 'soft' : 'vivid';
}

/**
 * Le profil qui porte la référence exacte d'une palette à deux intensités :
 * la palette de base forcée ([ENT-11]), sinon le porteur que les réglages ont
 * figé (Z10.5), sinon le classement automatique. Une palette libre n'a pas de
 * base : la validation la refuse.
 */
export function profilPorteur(recette: Recette, palette: Palette): Profil {
  return (estLibre(palette) ? undefined : palette.base) ?? palette.reglages?.porteur ?? profilAutomatique(recette, palette);
}

/** La clé sous laquelle se rangent les réglages du porteur : `vivid` pour une palette à une intensité, comme sa dérive. */
export function cleDuPorteur(recette: Recette, palette: Palette): Profil {
  return aUneIntensite(palette) ? 'vivid' : profilPorteur(recette, palette);
}

/** Vrai quand un réglage déplace la référence : la teinte ou la clarté du porteur, ou la part d'une palette à une intensité. */
export function aUnReglageDuPorteur(recette: Recette, palette: Palette): boolean {
  const reglages = palette.reglages;
  if (!reglages) return false;
  const cle = cleDuPorteur(recette, palette);
  return reglages.part !== undefined || reglages.teinte?.[cle] !== undefined || reglages.clarte?.[cle] !== undefined;
}

/**
 * Le départ des réglages (Z10.5) : `depart`, sinon `originale`, quand un
 * réglage du porteur existe ; sinon la référence. Le pivot, l'ancrage et le
 * préréglage Tailwind le lisent : il ne bouge pas pendant les gestes.
 */
export function departDe(recette: Recette, palette: Palette): Rgb8 {
  if (!aUnReglageDuPorteur(recette, palette)) return referenceDe(palette);
  const couleur = lireHexa(palette.reglages?.depart ?? palette.originale ?? palette.reference);
  if (!couleur) throw new Error(`Départ illisible pour la palette ${palette.id}. La recette n'a pas été validée.`);
  return couleur;
}

/**
 * Le pivot de la teinte d'une intensité (Z10.5) : la clarté du départ, et sa
 * teinte plus celle que la carte règle pour ce profil. Sans réglage, la
 * référence elle-même.
 */
export function pivotDe(recette: Recette, palette: Palette, intensite: Intensite): Oklch {
  const depart = rgb8VersOklch(departDe(recette, palette));
  const cle: Profil = intensite === 'unique' ? 'vivid' : intensite;
  const teinte = palette.reglages?.teinte?.[cle] ?? 0;
  return teinte === 0 ? depart : { ...depart, H: normaliserTeinte(depart.H + teinte) };
}

/** Le décalage de clarté d'une intensité, réglé dans la carte (Z10.5) ; 0 sans réglage. */
export function decalageDe(palette: Palette, intensite: Intensite): number {
  return palette.reglages?.clarte?.[intensite === 'unique' ? 'vivid' : intensite] ?? 0;
}

/** L'intensité qui porte la référence exacte : `unique`, ou le profil porteur. */
export function intensitePorteuse(recette: Recette, palette: Palette): Intensite {
  return aUneIntensite(palette) ? 'unique' : profilPorteur(recette, palette);
}

/**
 * Le rang de la clarté de `courbe` la plus proche de `clarte`. Égalité : le
 * premier rang, qui porte le plus petit numéro dans les deux courbes. Une
 * clarté hors de la courbe donne l'extrémité la plus proche.
 */
export function rangPorteur(courbe: readonly number[], clarte: number): number {
  let meilleur = 0;
  courbe.forEach((valeur, rang) => {
    if (Math.abs(valeur - clarte) < Math.abs(courbe[meilleur] - clarte)) meilleur = rang;
  });
  return meilleur;
}

/** Où la référence exacte se place : son intensité porteuse, et son rang et son numéro dans chaque mode. */
export interface Ancrage {
  readonly profil: Intensite;
  readonly rangs: { readonly [M in Mode]: number };
  readonly crans: { readonly [M in Mode]: number };
}

/**
 * L'ancrage de la référence d'une palette ([MOT-17]), l'unique désignation
 * que toutes les vues lisent, sur la grille de la palette : la liste commune,
 * ou sa liste libre.
 */
export function ancrageDe(recette: Recette, palette: Palette): Ancrage {
  // Le départ, fixe pendant les gestes : la luminosité du porteur translate sa rampe sans changer la nuance du ◆ (Z10.5).
  const clarte = rgb8VersOklch(departDe(recette, palette)).L;
  const { crans, courbes } = grilleDe(recette, palette);
  const rangs = { light: rangPorteur(courbes.light, clarte), dark: rangPorteur(courbes.dark, clarte) };
  return {
    profil: intensitePorteuse(recette, palette),
    rangs,
    crans: { light: crans[rangs.light], dark: crans[rangs.dark] },
  };
}

/** Le cran que la référence devient : ses octets tels quels, et L, C, H lus sur eux ([MOT-11]). */
function cranDeLaReference(reference: Rgb8): Cran {
  const lu = rgb8VersOklch(reference);
  return { couleur: reference, hexa: ecrireHexa(reference), L: lu.L, C: lu.C, H: lu.H };
}

/**
 * Ce que la rampe d'une intensité et d'un mode demande à `fabriquerRampe`,
 * avant l'ancrage de la référence : la courbe de la grille, le pivot du
 * profil, son Color shift, sa part et son décalage de clarté. Une palette à
 * une intensité lit la dérive de `vivid` et la part de sa référence
 * ([ENT-14]).
 */
function parametresDesRampes(recette: Recette, palette: Palette): (intensite: Intensite, mode: Mode) => ParametresRampe {
  const { courbes } = grilleDe(recette, palette);
  const bouts = boutsDe(recette);
  const parts = partsDe(recette, palette);
  const sombre = fondsSombresDe(recette);
  return (intensite, mode) => ({
    courbe: courbes[mode],
    bouts,
    reference: pivotDe(recette, palette, intensite),
    derive: palette.derive[intensite === 'unique' ? 'vivid' : intensite],
    part: parts[intensite] ?? 0,
    gamut: recette.gamut,
    sombre: mode === 'dark' ? sombre : undefined,
    decalage: decalageDe(palette, intensite),
  });
}

/**
 * Les rampes d'une palette, une par intensité présente, la référence ancrée
 * ([MOT-17]) : dans l'intensité porteuse, le cran de l'ancrage de chaque mode
 * prend les octets exacts de la référence, fonds du thème Dark compris. Les
 * autres crans gardent le calcul commun. Promesses, alertes, planche et
 * rapport lisent ces rampes-ci.
 */
export function rampesDe(recette: Recette, palette: Palette): Rampes {
  const reference = referenceDe(palette);
  const ancrage = ancrageDe(recette, palette);
  const parametres = parametresDesRampes(recette, palette);
  const rampes: { [I in Intensite]?: RampeParMode } = {};
  for (const intensite of intensitesDe(palette)) {
    const rampe = (mode: Mode): Cran[] => fabriquerRampe(parametres(intensite, mode))
      .map((cran, rang) => (intensite === ancrage.profil && rang === ancrage.rangs[mode] ? cranDeLaReference(reference) : cran));
    rampes[intensite] = { light: rampe('light'), dark: rampe('dark') };
  }
  return rampes;
}

/** Une liste de clartés par thème. */
export type ClartesParMode = { readonly [M in Mode]: readonly number[] };

/**
 * Les clartés auxquelles les crans d'une palette se fabriquent, par intensité
 * présente, la clarté de la référence à son cran ([MOT-17]). L'ordre des
 * nuances se juge sur elles ([DER-19]).
 */
export function clartesDe(recette: Recette, palette: Palette): { readonly [I in Intensite]?: ClartesParMode } {
  const L = rgb8VersOklch(referenceDe(palette)).L;
  const ancrage = ancrageDe(recette, palette);
  const parametres = parametresDesRampes(recette, palette);
  const clartes: { [I in Intensite]?: ClartesParMode } = {};
  for (const intensite of intensitesDe(palette)) {
    const parMode = (mode: Mode): number[] => clartesVisees(parametres(intensite, mode))
      .map((clarte, rang) => (intensite === ancrage.profil && rang === ancrage.rangs[mode] ? L : clarte));
    clartes[intensite] = { light: parMode('light'), dark: parMode('dark') };
  }
  return clartes;
}
