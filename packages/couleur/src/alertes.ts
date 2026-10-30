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
 * `solid/foreground` n'en vise aucun : il vaut le texte des boutons. Le 50 est
 * visé par `surface/subtle`, le 400 et le 950 par les surfaces du Dark : aucun
 * cran de la liste commune n'échappe aux variables. Un numéro que la liste de
 * la recette ne porte pas n'a pas de rang.
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

/**
 * Le poids de chaque numéro de cran dans le score de proximité ([VER-22]),
 * le même dans les deux thèmes : en Dark aussi, les petits numéros sont les
 * crans proches de la page. Les crans du milieu pèsent le plus ; les extrémités,
 * pâles en Light et sombres en Dark, se rapprochent d'une palette à l'autre
 * sans que le designer les confonde.
 */
export const POIDS_DES_CRANS_DE_PROXIMITE: Readonly<Record<number, number>> = {
  50: 0.1, 100: 0.1, 200: 0.2, 300: 0.5, 400: 1, 500: 1, 600: 1, 700: 1, 800: 0.6, 900: 0.3, 950: 0.2,
};

/**
 * Le poids d'un numéro de cran. Un numéro hors de la table, comme 1000 ou
 * 1050 du préréglage à treize nuances, prend le poids du numéro le plus
 * proche (950 pour ces deux-là) ; à égale distance, du plus petit.
 */
export function poidsDeProximite(numero: number): number {
  const numeros = Object.keys(POIDS_DES_CRANS_DE_PROXIMITE).map(Number).sort((a, b) => a - b);
  const plusProche = numeros.reduce((retenu, candidat) => (Math.abs(candidat - numero) < Math.abs(retenu - numero) ? candidat : retenu));
  return POIDS_DES_CRANS_DE_PROXIMITE[plusProche];
}

/** Les crans dont la chroma moyenne dit si une palette est nettement plus terne qu'une autre ([VER-22]). */
const CRANS_DE_LA_CHROMA = { de: 400, a: 700 } as const;

/** Sous cette part de la chroma de l'autre, une palette est nettement plus terne : la paire se distingue ([VER-22]). */
export const PART_DE_CHROMA_QUI_DISTINGUE = 0.75;

/** Sous cette part du seuil, deux palettes sont presque identiques ([VER-22]). */
const PART_PRESQUE_IDENTIQUES = 0.2;

/**
 * La proximité de deux palettes ([VER-22]) : `score` est la moyenne pondérée,
 * sur toute la rampe et les deux thèmes, du rapport entre la ΔEok d'un cran et
 * le seuil `palettesProches`.
 */
export interface Proximite {
  readonly score: number;
  /** Le thème où la moyenne pondérée des rapports est la plus petite (Light à égalité). */
  readonly mode: Mode;
  /** Le seuil `palettesProches` de la recette, appliqué à chaque cran. */
  readonly seuil: number;
  /**
   * La chroma moyenne des crans 400 à 700, Light et Dark, de la palette la
   * plus terne divisée par celle de l'autre ; `null` si l'une des listes n'a
   * aucun de ces crans.
   */
  readonly rapportDeChroma: number | null;
  /** `score < 1`, sauf quand `rapportDeChroma` est au plus `PART_DE_CHROMA_QUI_DISTINGUE`. */
  readonly tropProche: boolean;
  /** `tropProche` et `score` sous 0,2. */
  readonly presqueIdentiques: boolean;
}

/** Une palette colorée telle que la comparaison la lit : chaque cran et son poids, et la chroma de son milieu. */
export interface NuancesDeProximite {
  readonly crans: readonly { readonly poids: number; readonly couleurs: { readonly [M in Mode]: Rgb8 } }[];
  readonly chroma: number | null;
}

/**
 * Les couleurs d'une palette que la comparaison lit : chaque cran de sa liste
 * dans Vivid ou l'unique intensité, Light et Dark ; `null` si la palette
 * n'entre pas dans la comparaison : libre ou figée, ou terne. `rampes`
 * remplace les rampes de la palette quand l'appelant les a déjà calculées.
 */
export function nuancesDeProximite(recette: Recette, palette: Palette, rampes: Rampes = rampesDe(recette, palette)): NuancesDeProximite | null {
  if (estLibre(palette)) return null;
  const reference = lireHexa(palette.reference);
  if (!reference || rgb8VersOklch(reference).C <= CHROMA_DES_PALETTES_COLOREES) return null;
  const { crans } = grilleDe(recette, palette);
  const rampe = rampeDe(rampes, aUneIntensite(palette) ? 'unique' : 'vivid');
  const du = (mode: Mode, rang: number): Rgb8 => rampe[mode][rang].couleur;
  const chromas = crans.flatMap((numero, rang) => (
    numero >= CRANS_DE_LA_CHROMA.de && numero <= CRANS_DE_LA_CHROMA.a ? MODES.map((mode) => rgb8VersOklch(du(mode, rang)).C) : []
  ));
  return {
    crans: crans.map((numero, rang) => ({ poids: poidsDeProximite(numero), couleurs: { light: du('light', rang), dark: du('dark', rang) } })),
    chroma: chromas.length === 0 ? null : chromas.reduce((somme, chroma) => somme + chroma, 0) / chromas.length,
  };
}

/** La proximité de deux jeux de nuances, de même liste de crans. */
export function proximiteDeNuances(a: NuancesDeProximite, b: NuancesDeProximite, palettesProches: number): Proximite {
  const sommes = { light: 0, dark: 0 };
  let poids = 0;
  a.crans.forEach((cran, rang) => {
    poids += cran.poids;
    for (const mode of MODES) sommes[mode] += cran.poids * (distanceOk(cran.couleurs[mode], b.crans[rang].couleurs[mode]) / palettesProches);
  });
  const score = (sommes.light + sommes.dark) / (2 * poids);
  const mode: Mode = sommes.dark < sommes.light ? 'dark' : 'light';
  const [plus, moins] = a.chroma !== null && b.chroma !== null ? [Math.max(a.chroma, b.chroma), Math.min(a.chroma, b.chroma)] : [0, 0];
  const rapportDeChroma = plus > 0 ? moins / plus : null;
  const tropProche = score < 1 && !(rapportDeChroma !== null && rapportDeChroma <= PART_DE_CHROMA_QUI_DISTINGUE);
  return { score, mode, seuil: palettesProches, rapportDeChroma, tropProche, presqueIdentiques: tropProche && score < PART_PRESQUE_IDENTIQUES };
}

/**
 * La proximité de deux palettes colorées ([VER-22]) : toute la rampe, pondérée
 * par numéro de cran. `null` si l'une des palettes est libre, figée ou terne.
 */
export function proximiteDePalettes(recette: Recette, a: Palette, b: Palette): Proximite | null {
  const [nuancesA, nuancesB] = [nuancesDeProximite(recette, a), nuancesDeProximite(recette, b)];
  return nuancesA && nuancesB ? proximiteDeNuances(nuancesA, nuancesB, recette.seuils.palettesProches) : null;
}

/** Une paire de palettes que le seuil `palettesProches` de la recette juge trop proches. */
export interface PaireTropProche {
  readonly palettes: readonly [string, string];
  readonly proximite: Proximite;
}

/** Toutes les paires de la recette dont le score est sous 1, par score croissant ; à score égal, l'ordre de la recette. */
export function pairesTropProches(recette: Recette): PaireTropProche[] {
  const nuances = recette.palettes.map((palette) => nuancesDeProximite(recette, palette));
  const paires: PaireTropProche[] = [];
  recette.palettes.forEach((a, rang) => {
    const nuancesA = nuances[rang];
    if (!nuancesA) return;
    for (let autre = rang + 1; autre < recette.palettes.length; autre += 1) {
      const nuancesB = nuances[autre];
      if (!nuancesB) continue;
      const proximite = proximiteDeNuances(nuancesA, nuancesB, recette.seuils.palettesProches);
      if (proximite.tropProche) paires.push({ palettes: [a.id, recette.palettes[autre].id], proximite });
    }
  });
  return paires.sort((x, y) => x.proximite.score - y.proximite.score);
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
 * la recette, puis chaque paire de palettes proches, par score croissant.
 */
export function alertesDeRecette(recette: Recette): Alerte[] {
  const alertes = alertesDesFonds(recette);
  for (const palette of recette.palettes) alertes.push(...alertesDePalette(recette, palette));
  for (const { palettes, proximite } of pairesTropProches(recette)) {
    alertes.push({ code: 'palettes-proches', palettes, proximite, seuil: proximite.seuil });
  }
  return alertes;
}
