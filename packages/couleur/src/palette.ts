/**
 * Une palette lue contre sa recette : ses intensités, ses parts, l'ancrage de
 * sa référence et ses rampes.
 *
 * Chaque fonction reçoit une recette déjà validée ([REC-05]).
 */
import { bosseDeChroma } from './bosse';
import { CHROMA_SANS_TEINTE, ecrireHexa, lireHexa, normaliserTeinte, rgb8VersOklch, type Oklch, type Rgb8 } from './conversions';
import { cleDeLaPromesse, jugerLesRampes } from './jugement';
import { PREREGLAGES, boutsDe, estFigee, estLibre, etendueDe, grilleDe } from './nuances';
import { ordreDesClartesTenu, type ClartesParMode } from './ordre';
import { plafond } from './plafond';
import {
  arrondir,
  clartesVisees,
  cranDeLaVisee,
  MODES,
  partsEffectives,
  PROFILS,
  rampeDe,
  viseesDeLaRampe,
  type Cran,
  type DecalageAuxBouts,
  type Derive,
  type Enveloppe,
  type FondsSombres,
  type Intensite,
  type Mode,
  type ParametresRampe,
  type Parts,
  type Profil,
  type RampeParMode,
  type Rampes,
  type ViseeDeCran,
} from './rampe';
import { figeesParIntensite, type CouleursFigees, type CouleursFigeesParIntensite, type Palette, type Recette } from './recette';
import { clarteSelonLaTeinteDuReleve } from './tailwind';

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

/**
 * Le profil que le classement automatique choisit ([MOT-17]) : toujours
 * `vivid`. Plus la référence est saturée, plus les palettes le sont, sans
 * bascule d'un profil à l'autre quand le designer fait glisser la saturation.
 * Une palette de base, un réglage du porteur et une palette figée passent
 * avant (`profilPorteur`). Les paramètres gardent la signature des appelants.
 */
export function profilAutomatique(_recette: Recette, _palette: Palette): Profil {
  return 'vivid';
}

/**
 * Les couleurs figées d'une intensité d'une palette figée ([VAR-13]). Une
 * palette figée à une intensité rend les siennes, quelle que soit l'intensité
 * demandée ; une palette figée à deux intensités rend celles de `soft` ou de
 * `vivid`, `unique` valant `soft`.
 */
export function couleursFigeesDe(figees: NonNullable<Palette['figees']>, intensite: Intensite): CouleursFigees {
  if (!figeesParIntensite(figees)) return figees;
  return figees[intensite === 'vivid' ? 'vivid' : 'soft'];
}

/**
 * Le profil d'une palette figée à deux intensités qui porte la couleur de la
 * référence : le premier dont la rampe Light la contient, sinon `soft`. La
 * reprise ancre la référence à une couleur de Soft en Light.
 */
function porteurDeLaFigee(figees: CouleursFigeesParIntensite, reference: string): Profil {
  const cherchee = reference.toUpperCase();
  return figees.soft.light.some((hexa) => hexa.toUpperCase() === cherchee) || !figees.vivid.light.some((hexa) => hexa.toUpperCase() === cherchee) ? 'soft' : 'vivid';
}

/**
 * Le profil qui porte la référence exacte d'une palette à deux intensités :
 * la palette de base forcée ([ENT-11]), sinon le porteur que les réglages ont
 * figé (Z10.5), sinon le classement automatique. Une palette libre n'a pas de
 * base : la validation la refuse. Une palette figée à deux intensités n'a ni
 * base ni réglage : son porteur est le profil dont les couleurs contiennent la
 * référence.
 */
export function profilPorteur(recette: Recette, palette: Palette): Profil {
  if (estFigee(palette) && figeesParIntensite(palette.figees)) return porteurDeLaFigee(palette.figees, palette.reference);
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
  if (estFigee(palette)) {
    // Une palette figée ne calcule rien : la référence est la nuance qui en porte la couleur, dans l'intensité porteuse, la première de sa liste sinon.
    const profil = intensitePorteuse(recette, palette);
    const rang = Math.max(0, couleursFigeesDe(palette.figees, profil).light.findIndex((hexa) => hexa.toUpperCase() === palette.reference.toUpperCase()));
    return { profil, rangs: { light: rang, dark: rang }, crans: { light: palette.crans[rang], dark: palette.crans[rang] } };
  }
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
 * L'enveloppe de chroma d'une intensité dans un thème ([MOT-35]) : le profil
 * `soft` pour l'intensité Soft, `vivid` pour Vivid et pour l'intensité unique.
 */
export function enveloppeDe(recette: Recette, intensite: Intensite, mode: Mode): Enveloppe {
  const { enveloppe } = recette.profils[intensite === 'soft' ? 'soft' : 'vivid'];
  return { p0: enveloppe.p0, ...enveloppe[mode] };
}


/**
 * Ce que la rampe d'une intensité et d'un mode demande à `fabriquerRampe`,
 * avant l'ancrage de la référence : la courbe de la grille, le pivot du
 * profil, son Color shift, sa part, son décalage de clarté et son enveloppe
 * de chroma. Une palette à une intensité lit la dérive de `vivid` et la part
 * de sa référence ([ENT-14]). `decalageDeClarte`, celui que
 * `clarteSelonLaTeinteGardee` retient ou celui d'un candidat, s'ajoute à la
 * luminosité du Color shift au bout clair, et l'enveloppe de chroma se lit
 * sans lui.
 */
function parametresDesRampes(recette: Recette, palette: Palette, decalageDeClarte: number): (intensite: Intensite, mode: Mode) => ParametresRampe {
  const { courbes } = grilleDe(recette, palette);
  const bouts = boutsDe(recette);
  const parts = partsDe(recette, palette);
  const sombre = fondsSombresDe(recette);
  const deriveDe = (intensite: Intensite): Derive => {
    const derive = palette.derive[intensite === 'unique' ? 'vivid' : intensite];
    return decalageDeClarte === 0
      ? derive
      : { ...derive, clarte: { clair: (derive.clarte?.clair ?? 0) + decalageDeClarte, sombre: derive.clarte?.sombre ?? 0 } };
  };
  return (intensite, mode) => ({
    courbe: courbes[mode],
    bouts,
    reference: pivotDe(recette, palette, intensite),
    derive: deriveDe(intensite),
    part: parts[intensite] ?? 0,
    gamut: recette.gamut,
    sombre: mode === 'dark' ? sombre : undefined,
    decalage: decalageDe(palette, intensite),
    enveloppe: enveloppeDe(recette, intensite, mode),
    clairs: mode === 'light' ? recette.profils[intensite === 'soft' ? 'soft' : 'vivid'].clairs : 1,
    decalageDeClarteGarde: decalageDeClarte,
  });
}

/**
 * Le décalage de clarté du bout clair que les rampes de Tailwind montrent à
 * la teinte du départ de la palette ([MOT-36]), lu sur le relevé `derives`
 * de la recette. Il vaut 0 pour un gris, pour une palette figée ou libre et
 * quand la liste n'a pas de cran 100. Le bout sombre vaut 0. Il ne se range
 * pas : `clarteSelonLaTeinteGardee` en retient la part que les promesses et
 * l'ordre des nuances permettent.
 */
export function clarteSelonLaTeinte(recette: Recette, palette: Palette): DecalageAuxBouts {
  const rang = recette.crans.indexOf(100);
  if (rang < 0 || estFigee(palette) || estLibre(palette) || estGrisPur(referenceDe(palette))) return { clair: 0, sombre: 0 };
  const depart = rgb8VersOklch(departDe(recette, palette));
  return { clair: clarteSelonLaTeinteDuReleve(depart, boutsDe(recette), recette.courbes.light[rang], recette.derives), sombre: 0 };
}

/** Le décalage de clarté que `rampesDe` et `clartesDe` appliquent, et la fraction du décalage voulu qu'il représente. */
export interface ClarteGardee {
  /** La part de `clarteSelonLaTeinte` que la garde retient, dans `[0 ; 1]`. */
  readonly fraction: number;
  /** Le décalage ajouté au bout clair : `arrondir(voulu × fraction, 3)`. */
  readonly decalage: number;
}

const DICHOTOMIES_DE_LA_CLARTE = 12;
const DICHOTOMIES_DE_LA_BOSSE = 14;

/**
 * La plus grande fraction du décalage de `clarteSelonLaTeinte` qui garde
 * l'ordre des nuances ([DER-19]) et ne fait manquer aucune promesse que la
 * palette tient sans décalage. Les promesses se jugent sur la chaîne entière,
 * bosse comprise. Dichotomie quand la fraction 1 échoue.
 */
function chercherLaClarteGardee(recette: Recette, palette: Palette): ClarteGardee {
  const voulu = clarteSelonLaTeinte(recette, palette).clair;
  if (voulu === 0) return { fraction: 1, decalage: 0 };
  const intensites = intensitesDe(palette);
  const jugees = (decalage: number) => jugerLesRampes(recette, intensites, rampesAvecLeDecalage(recette, palette, decalage));
  const tenues = new Set(jugees(0).filter((promesse) => promesse.verdict === 'tenue').map(cleDeLaPromesse));
  const poser = (fraction: number): ClarteGardee => ({ fraction, decalage: arrondir(voulu * fraction, 3) });
  const accepte = ({ decalage }: ClarteGardee): boolean =>
    ordreDesClartesTenu(clartesAvecLeDecalage(recette, palette, decalage))
    && !jugees(decalage).some((promesse) => promesse.verdict === 'manquee' && tenues.has(cleDeLaPromesse(promesse)));
  if (accepte(poser(1))) return poser(1);
  let bas = 0;
  let haut = 1;
  for (let i = 0; i < DICHOTOMIES_DE_LA_CLARTE; i += 1) {
    const milieu = (bas + haut) / 2;
    if (accepte(poser(milieu))) bas = milieu;
    else haut = milieu;
  }
  return poser(bas);
}

const clartesGardees = new WeakMap<Recette, WeakMap<Palette, ClarteGardee>>();

/**
 * La clarté selon la teinte que la palette applique ([MOT-36]) : la fraction
 * gardée de `clarteSelonLaTeinte`, mémorisée par recette et par palette, que
 * `rampesDe` et `clartesDe` lisent toutes deux. Elle s'ajoute à la
 * luminosité du Color shift des deux profils, rangée ou non, et ne se range
 * jamais.
 */
export function clarteSelonLaTeinteGardee(recette: Recette, palette: Palette): ClarteGardee {
  let parPalette = clartesGardees.get(recette);
  if (!parPalette) {
    parPalette = new WeakMap();
    clartesGardees.set(recette, parPalette);
  }
  let gardee = parPalette.get(palette);
  if (!gardee) {
    gardee = chercherLaClarteGardee(recette, palette);
    parPalette.set(palette, gardee);
  }
  return gardee;
}

/**
 * Les rampes de l'intensité porteuse, la référence ancrée et la bosse de
 * chroma posée ([MOT-17]). La bosse monte les crans de clarté voisine vers la
 * référence quand elle est plus vive que la chroma visée à son cran. Elle se
 * garde mode par mode, Light puis Dark : sa force est la plus grande, par
 * dichotomie, qui ne fait manquer à ce mode et à cette intensité aucune
 * promesse tenue sans elle.
 */
function rampeDeLIntensitePorteuse(
  recette: Recette,
  palette: Palette,
  intensite: Intensite,
  ancrage: Ancrage,
  reference: Rgb8,
  visees: { readonly [M in Mode]: readonly ViseeDeCran[] },
): RampeParMode {
  const lue = rgb8VersOklch(reference);
  const bosses = {
    light: bosseDeChroma(visees.light, ancrage.rangs.light, 'light', lue, intensite !== 'soft'),
    dark: bosseDeChroma(visees.dark, ancrage.rangs.dark, 'dark', lue, intensite !== 'soft'),
  };
  const rampe = (mode: Mode, force: number): Cran[] => {
    const bosse = bosses[mode];
    return visees[mode].map((visee, rang) => (rang === ancrage.rangs[mode]
      ? cranDeLaReference(reference)
      : cranDeLaVisee({ L: visee.L, H: visee.H, C: bosse ? visee.C + (bosse[rang] - visee.C) * force : visee.C })));
  };
  const forces = { light: 0, dark: 0 };
  for (const mode of MODES) {
    if (!bosses[mode]) continue;
    forces[mode] = 1;
    // Une palette libre n'a pas de promesses (W6) : la bosse y reste entière.
    if (estLibre(palette)) continue;
    // Le jugement ne lit que ce mode : l'autre rampe reste vide.
    const jugees = (force: number) => jugerLesRampes(recette, [intensite], { [intensite]: { light: [], dark: [], [mode]: rampe(mode, force) } }, { mode, intensite });
    const tenues = new Set(jugees(0).filter((promesse) => promesse.verdict === 'tenue').map(cleDeLaPromesse));
    const perd = (force: number): boolean => jugees(force).some((promesse) => promesse.verdict === 'manquee' && tenues.has(cleDeLaPromesse(promesse)));
    if (!perd(1)) continue;
    let bas = 0;
    let haut = 1;
    for (let i = 0; i < DICHOTOMIES_DE_LA_BOSSE; i += 1) {
      const milieu = (bas + haut) / 2;
      if (perd(milieu)) haut = milieu;
      else bas = milieu;
    }
    forces[mode] = bas;
  }
  return { light: rampe('light', forces.light), dark: rampe('dark', forces.dark) };
}

/** Les rampes d'une palette non figée sous un décalage de clarté donné : la chaîne que `rampesDe` retient et que la garde de la clarté essaie. */
function rampesAvecLeDecalage(recette: Recette, palette: Palette, decalageDeClarte: number): Rampes {
  const reference = referenceDe(palette);
  const ancrage = ancrageDe(recette, palette);
  const parametres = parametresDesRampes(recette, palette, decalageDeClarte);
  const rampes: { [I in Intensite]?: RampeParMode } = {};
  for (const intensite of intensitesDe(palette)) {
    const visees = { light: viseesDeLaRampe(parametres(intensite, 'light')), dark: viseesDeLaRampe(parametres(intensite, 'dark')) };
    if (intensite === ancrage.profil) {
      rampes[intensite] = rampeDeLIntensitePorteuse(recette, palette, intensite, ancrage, reference, visees);
      continue;
    }
    rampes[intensite] = { light: visees.light.map(cranDeLaVisee), dark: visees.dark.map(cranDeLaVisee) };
  }
  return rampes;
}

/**
 * Les rampes d'une palette, une par intensité présente, la référence ancrée
 * ([MOT-17]) : dans l'intensité porteuse, le cran de l'ancrage de chaque mode
 * prend les octets exacts de la référence, fonds du thème Dark compris. Les
 * autres crans gardent le calcul commun, sauf ceux de l'intensité porteuse que
 * la bosse de chroma monte vers la référence. Promesses, alertes, planche et
 * rapport lisent ces rampes-ci.
 */
export function rampesDe(recette: Recette, palette: Palette): Rampes {
  if (estFigee(palette)) {
    // Les couleurs lues dans le fichier, telles quelles ; sans mode Dark à l'origine, le thème Dark rend celles de Light.
    const rampe = (couleurs: readonly string[]): Cran[] => couleurs.map((hexa) => cranDeLaReference(lireHexa(hexa) ?? [0, 0, 0]));
    const parMode = (figees: CouleursFigees): RampeParMode => ({ light: rampe(figees.light), dark: rampe(figees.dark ?? figees.light) });
    // Une palette figée à deux intensités rend les couleurs de chacune, Soft puis Vivid.
    return figeesParIntensite(palette.figees)
      ? { soft: parMode(palette.figees.soft), vivid: parMode(palette.figees.vivid) }
      : { unique: parMode(palette.figees) };
  }
  return rampesAvecLeDecalage(recette, palette, clarteSelonLaTeinteGardee(recette, palette).decalage);
}

export type { ClartesParMode };

/** Les clartés de la chaîne sous un décalage de clarté donné. */
function clartesAvecLeDecalage(recette: Recette, palette: Palette, decalageDeClarte: number): { readonly [I in Intensite]?: ClartesParMode } {
  const L = rgb8VersOklch(referenceDe(palette)).L;
  const ancrage = ancrageDe(recette, palette);
  const parametres = parametresDesRampes(recette, palette, decalageDeClarte);
  const clartes: { [I in Intensite]?: ClartesParMode } = {};
  for (const intensite of intensitesDe(palette)) {
    const parMode = (mode: Mode): number[] => clartesVisees(parametres(intensite, mode))
      .map((clarte, rang) => (intensite === ancrage.profil && rang === ancrage.rangs[mode] ? L : clarte));
    clartes[intensite] = { light: parMode('light'), dark: parMode('dark') };
  }
  return clartes;
}

/**
 * Les clartés auxquelles les crans d'une palette se fabriquent, par intensité
 * présente, la clarté de la référence à son cran ([MOT-17]). L'ordre des
 * nuances se juge sur elles ([DER-19]). Elles portent la même clarté selon la
 * teinte que `rampesDe`.
 */
export function clartesDe(recette: Recette, palette: Palette): { readonly [I in Intensite]?: ClartesParMode } {
  return clartesAvecLeDecalage(recette, palette, clarteSelonLaTeinteGardee(recette, palette).decalage);
}
