/**
 * Les alertes de la section 11.3 : une mesure qui franchit un seuil de
 * conception ([VER-08], [VER-10], [VER-11], [VER-22], [ENT-06]). Une alerte
 * n'empêche rien ; elle porte la mesure, le seuil et ce qu'ils visent, et
 * l'interface les met en mots.
 */
import { VARIABLES_DE_PALETTE, cranDeLaVariable, rangDuCranLeger, sensDuTheme } from '@ucm-kit/core/emplois';

import { lireHexa, rgb8VersOklch, type Rgb8 } from './conversions';
import { distanceOk } from './contraste';
import { aUneIntensite, partDeLaReference, partsDe, rampesDe } from './palette';
import { estLibre, grilleDe } from './nuances';
import { MODES, rampeDe, type Mode, type Rampes } from './rampe';
import type { Palette, Recette } from './recette';

/** Un cran où `soft` et `vivid` se confondent. */
export interface Confusion {
  readonly mode: Mode;
  readonly cran: number;
  readonly distance: number;
}

export type Alerte =
  | { readonly code: 'profils-confondus'; readonly palette: string; readonly crans: readonly Confusion[]; readonly seuil: number }
  | { readonly code: 'palettes-proches'; readonly palettes: readonly [string, string]; readonly proximite: Proximite; readonly seuil: number }
  | { readonly code: 'reference-plus-terne'; readonly palette: string; readonly part: number; readonly partSoft: number }
  | { readonly code: 'reference-plus-vive'; readonly palette: string; readonly part: number; readonly partVivid: number }
  | { readonly code: 'fond-hors-courbe'; readonly mode: Mode; readonly clarte: number; readonly cran: number };

/** La tolérance sur la clarté d'un fond : `#121212` vaut 0,1822 contre une courbe à 0,18 ([ENT-06]). */
export const TOLERANCE_FOND = 0.005;

/**
 * Les rangs des crans que les variables de palette visent dans `crans`, dans
 * le sens de chaque mode de la recette, les deux modes réunis ([VER-11]).
 * `solid/foreground` n'en vise aucun : il vaut le texte des boutons. Les crans
 * facultatifs 50, 400 et 950 n'y sont pas : aucune variable ne les vise, et
 * les deux profils s'y confondent sur la plupart des teintes sans qu'aucun
 * réglage les sépare.
 */
export function rangsDesVariables(recette: Recette): number[] {
  const rangs = new Set<number>();
  for (const mode of MODES) {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    for (const variable of VARIABLES_DE_PALETTE) {
      if (variable === 'solid/foreground') continue;
      const cran = cranDeLaVariable(variable, mode, sens);
      const rang = typeof cran === 'number' ? recette.crans.indexOf(cran) : -1;
      if (rang >= 0) rangs.add(rang);
    }
  }
  return [...rangs].sort((a, b) => a - b);
}

/**
 * Vrai quand les deux profils d'une palette sont ternes par construction
 * ([ENT-09]) : sans parts du designer, une référence sous la part commune de
 * soft donne deux parts dans le rapport des parts communes, proches l'une de
 * l'autre. Un gris pur en fait partie.
 */
export function aDesProfilsTernes(recette: Recette, palette: Palette): boolean {
  return !aUneIntensite(palette) && !palette.parts && partDeLaReference(recette, palette) < recette.profils.soft.part;
}

/** Les fonds que la comparaison des profils lit : en Light `surface/hover` et `surface/pressed`, en Dark `surface/default`, `hover` et `pressed`. */
const FONDS_COMPARES = [
  { mode: 'light', variables: ['surface/hover', 'surface/pressed'] },
  { mode: 'dark', variables: ['surface/default', 'surface/hover', 'surface/pressed'] },
] as const;

/**
 * Les nuances d'une palette où `soft` et `vivid` se confondent, sur les seuls
 * fonds de `FONDS_COMPARES`, lus au cran que la table du sens de chaque thème
 * leur donne : le repère ≈ de l'aperçu et de la planche ([PLA-15]). Le fond
 * Light `surface/default` n'y entre pas : au cran 100 l'écart possible entre
 * deux couleurs aussi pâles est trop faible. Les pleins et les textes n'y
 * entrent pas non plus. Des profils ternes par construction ne se signalent
 * pas (`aDesProfilsTernes`). Une palette à une intensité n'a qu'une rampe
 * ([ENT-14]).
 */
export function confusionsDe(recette: Recette, palette: Palette): Confusion[] {
  if (aUneIntensite(palette) || aDesProfilsTernes(recette, palette)) return [];
  const rampes = rampesDe(recette, palette);
  const [soft, vivid] = [rampeDe(rampes, 'soft'), rampeDe(rampes, 'vivid')];
  const { crans } = grilleDe(recette, palette);
  return FONDS_COMPARES.flatMap(({ mode, variables }) => {
    const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
    return variables.flatMap((variable) => {
      const cran = cranDeLaVariable(variable, mode, sens);
      const rang = typeof cran === 'number' ? crans.indexOf(cran) : -1;
      if (rang < 0 || typeof cran !== 'number') return [];
      const distance = distanceOk(soft[mode][rang].couleur, vivid[mode][rang].couleur);
      return distance < recette.seuils.profilsConfondus ? [{ mode, cran, distance }] : [];
    });
  });
}

/**
 * L'alerte juge les cinq fonds de `confusionsDe` ([VER-11]) et sonne à partir
 * de `MINIMUM_DE_NUANCES_CONFONDUES` d'entre eux, les deux thèmes réunis. Une
 * palette libre n'a pas de variables : elle passe sans alerte.
 */
const MINIMUM_DE_NUANCES_CONFONDUES = 3;

function profilsConfondus(recette: Recette, palette: Palette): Alerte | null {
  if (estLibre(palette)) return null;
  const crans = confusionsDe(recette, palette);
  return crans.length >= MINIMUM_DE_NUANCES_CONFONDUES
    ? { code: 'profils-confondus', palette: palette.id, crans, seuil: recette.seuils.profilsConfondus }
    : null;
}

/**
 * Les alertes qui portent sur une palette seule, dans l'ordre de la table
 * 11.3. Sans parts du designer, le profil porteur prend la part de la
 * référence : elle n'est ni plus terne ni plus vive ([ENT-11], [ENT-14]).
 */
export function alertesDePalette(recette: Recette, palette: Palette): Alerte[] {
  const alertes: Alerte[] = [];
  const parts = partsDe(recette, palette);
  const part = partDeLaReference(recette, palette);

  const confondus = profilsConfondus(recette, palette);
  if (confondus) alertes.push(confondus);
  if (parts.soft !== undefined && part < parts.soft) alertes.push({ code: 'reference-plus-terne', palette: palette.id, part, partSoft: parts.soft });
  if (parts.vivid !== undefined && part > parts.vivid) alertes.push({ code: 'reference-plus-vive', palette: palette.id, part, partVivid: parts.vivid });
  return alertes;
}

/** La chroma OKLCH que la référence d'une palette dépasse pour que la palette soit colorée ([VER-22]). */
export const CHROMA_DES_PALETTES_COLOREES = 0.05;

/** Sous cette distance, deux palettes sont presque identiques ([VER-22]). */
const DISTANCE_DES_PALETTES_PRESQUE_IDENTIQUES = 0.01;

/** Le rôle où deux palettes se ressemblent : le plein des boutons, ou le texte posé sur le fond teinté. */
export type RoleDeProximite = 'plein' | 'texte';

/** La plus petite distance entre deux palettes, avec le rôle et le thème qui la portent ([VER-22]). */
export interface Proximite {
  readonly distance: number;
  readonly role: RoleDeProximite;
  readonly mode: Mode;
  readonly presqueIdentiques: boolean;
}

/** Les trois couleurs que deux palettes se disputent : le plein dans les deux thèmes, le texte du fond teinté en Light seulement. */
const MESURES_DE_PROXIMITE = [
  { role: 'plein', variable: 'solid/default', mode: 'light' },
  { role: 'plein', variable: 'solid/default', mode: 'dark' },
  { role: 'texte', variable: 'surface/foreground', mode: 'light' },
] as const;

export type NuancesDeProximite = readonly { readonly role: RoleDeProximite; readonly mode: Mode; readonly couleur: Rgb8 }[];

/**
 * Les trois couleurs d'une palette que la comparaison lit, dans l'intensité
 * Vivid ou l'unique intensité de la palette ; `null` si la palette n'entre pas
 * dans la comparaison : libre ou figée, terne, ou sans l'un de ces crans.
 * `rampes` remplace les rampes de la palette quand l'appelant les a déjà
 * calculées.
 */
export function nuancesDeProximite(recette: Recette, palette: Palette, rampes: Rampes = rampesDe(recette, palette)): NuancesDeProximite | null {
  if (estLibre(palette)) return null;
  const reference = lireHexa(palette.reference);
  if (!reference || rgb8VersOklch(reference).C <= CHROMA_DES_PALETTES_COLOREES) return null;
  const { crans } = grilleDe(recette, palette);
  const rampe = rampeDe(rampes, aUneIntensite(palette) ? 'unique' : 'vivid');
  const nuances: { role: RoleDeProximite; mode: Mode; couleur: Rgb8 }[] = [];
  for (const { role, variable, mode } of MESURES_DE_PROXIMITE) {
    const cran = cranDeLaVariable(variable, mode, sensDuTheme(mode, recette.texteDesBoutons[mode]));
    const rang = typeof cran === 'number' ? crans.indexOf(cran) : -1;
    if (rang < 0) return null;
    nuances.push({ role, mode, couleur: rampe[mode][rang].couleur });
  }
  return nuances;
}

/** La plus petite distance entre deux jeux de nuances comparées, avec le rôle et le thème qui la portent. */
export function proximiteDeNuances(a: NuancesDeProximite, b: NuancesDeProximite): Proximite {
  let plus = { distance: Infinity, rang: 0 };
  a.forEach((nuance, rang) => {
    const distance = distanceOk(nuance.couleur, b[rang].couleur);
    if (distance < plus.distance) plus = { distance, rang };
  });
  const { role, mode } = a[plus.rang];
  return { distance: plus.distance, role, mode, presqueIdentiques: plus.distance < DISTANCE_DES_PALETTES_PRESQUE_IDENTIQUES };
}

/**
 * La proximité de deux palettes colorées ([VER-22]) : la plus petite des
 * distances de leur plein en Light, de leur plein en Dark et de leur texte sur
 * fond teinté en Light, chaque couleur lue au cran que la table des rôles lui
 * donne dans la grille de la palette. `null` si l'une des palettes est libre,
 * figée ou terne, ou manque d'un de ces crans.
 */
export function proximiteDePalettes(recette: Recette, a: Palette, b: Palette): Proximite | null {
  const [nuancesA, nuancesB] = [nuancesDeProximite(recette, a), nuancesDeProximite(recette, b)];
  return nuancesA && nuancesB ? proximiteDeNuances(nuancesA, nuancesB) : null;
}

/** Une paire de palettes que le seuil `palettesProches` de la recette juge trop proches. */
export interface PaireTropProche {
  readonly palettes: readonly [string, string];
  readonly proximite: Proximite;
}

/** Toutes les paires de la recette sous le seuil `palettesProches`, par distance croissante ; à distance égale, l'ordre de la recette. */
export function pairesTropProches(recette: Recette): PaireTropProche[] {
  const nuances = recette.palettes.map((palette) => nuancesDeProximite(recette, palette));
  const paires: PaireTropProche[] = [];
  recette.palettes.forEach((a, rang) => {
    const nuancesA = nuances[rang];
    if (!nuancesA) return;
    for (let autre = rang + 1; autre < recette.palettes.length; autre += 1) {
      const nuancesB = nuances[autre];
      if (!nuancesB) continue;
      const proximite = proximiteDeNuances(nuancesA, nuancesB);
      if (proximite.distance < recette.seuils.palettesProches) paires.push({ palettes: [a.id, recette.palettes[autre].id], proximite });
    }
  });
  return paires.sort((x, y) => x.proximite.distance - y.proximite.distance);
}

/** Un fond plus sombre que le cran le plus léger de la courbe claire, ou plus clair que celui de la courbe sombre, à 0,005 près ([ENT-06]). */
export function alertesDesFonds(recette: Recette): Alerte[] {
  const alertes: Alerte[] = [];
  for (const mode of MODES) {
    const fond = lireHexa(recette.fonds[mode]);
    if (!fond) continue;
    const clarte = rgb8VersOklch(fond).L;
    const cran = recette.courbes[mode][rangDuCranLeger(recette.crans)];
    const hors = mode === 'light' ? clarte < cran - TOLERANCE_FOND : clarte > cran + TOLERANCE_FOND;
    if (hors) alertes.push({ code: 'fond-hors-courbe', mode, clarte, cran });
  }
  return alertes;
}

/**
 * Toutes les alertes d'une recette : ses fonds, chaque palette dans l'ordre de
 * la recette, puis chaque paire de palettes proches, par distance croissante.
 */
export function alertesDeRecette(recette: Recette): Alerte[] {
  const alertes = alertesDesFonds(recette);
  for (const palette of recette.palettes) alertes.push(...alertesDePalette(recette, palette));
  for (const { palettes, proximite } of pairesTropProches(recette)) {
    alertes.push({ code: 'palettes-proches', palettes, proximite, seuil: recette.seuils.palettesProches });
  }
  return alertes;
}
