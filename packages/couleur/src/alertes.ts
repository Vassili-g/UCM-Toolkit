/**
 * Les alertes de la section 11.3 : une mesure qui franchit un seuil de
 * conception ([VER-08], [VER-10], [VER-11], [ENT-06]). Une alerte n'empêche
 * rien ; elle porte la mesure, le seuil et ce qu'ils visent, et l'interface
 * les met en mots.
 */
import { VARIABLES_DE_PALETTE, cranDeLaVariable, rangDuCranLeger, sensDuTheme } from '@ucm-kit/core/emplois';

import { lireHexa, rgb8VersOklch } from './conversions';
import { distanceOk } from './contraste';
import { aUneIntensite, fondsSombresDe, intensitesDe, partDeLaReference, partsDe, rampesDe } from './palette';
import { estLibre, grilleDe } from './nuances';
import { facteurSombre, MODES, rampeDe, type Intensite, type Mode } from './rampe';
import type { Palette, Recette } from './recette';

/** Un cran où `soft` et `vivid` se confondent. */
export interface Confusion {
  readonly mode: Mode;
  readonly cran: number;
  readonly distance: number;
}

export type Alerte =
  | { readonly code: 'profils-confondus'; readonly palette: string; readonly crans: readonly Confusion[]; readonly seuil: number }
  | { readonly code: 'palettes-proches'; readonly palettes: readonly [string, string]; readonly distance: number; readonly seuil: number }
  | { readonly code: 'reference-plus-terne'; readonly palette: string; readonly part: number; readonly partSoft: number }
  | { readonly code: 'reference-plus-vive'; readonly palette: string; readonly part: number; readonly partVivid: number }
  | { readonly code: 'fond-hors-courbe'; readonly mode: Mode; readonly clarte: number; readonly cran: number };

/** La tolérance sur la clarté d'un fond : `#121212` vaut 0,1822 contre une courbe à 0,18 ([ENT-06]). */
export const TOLERANCE_FOND = 0.005;

/** Les crans où l'on compare deux palettes pour les juger proches. */
export const CRANS_PALETTES_PROCHES: readonly number[] = [500, 600, 700];

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
      const cran = cranDeLaVariable(variable, sens);
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

/**
 * Les nuances d'une palette où `soft` et `vivid` se confondent, sur toute sa
 * liste : le repère ≈ de l'aperçu et de la planche ([PLA-15]). Des profils
 * ternes par construction ne se signalent pas (`aDesProfilsTernes`). Une
 * palette à une intensité n'a qu'une rampe ([ENT-14]).
 */
export function confusionsDe(recette: Recette, palette: Palette): Confusion[] {
  if (aUneIntensite(palette) || aDesProfilsTernes(recette, palette)) return [];
  const rampes = rampesDe(recette, palette);
  const [soft, vivid] = [rampeDe(rampes, 'soft'), rampeDe(rampes, 'vivid')];
  const { crans } = grilleDe(recette, palette);
  return MODES.flatMap((mode) => crans.flatMap((cran, rang) => {
    const distance = distanceOk(soft[mode][rang].couleur, vivid[mode][rang].couleur);
    return distance < recette.seuils.profilsConfondus ? [{ mode, cran, distance }] : [];
  }));
}

/**
 * L'alerte ne vise que les nuances que portent les variables ([VER-11]) : une
 * palette libre n'en a pas. Elle se tait sur les fonds du thème Dark dont la
 * part baisse ([MOT-28]) : les deux profils s'y rapprochent par construction.
 * En dessous de `MINIMUM_DE_NUANCES_CONFONDUES` nuances, la palette passe sans
 * alerte.
 */
const MINIMUM_DE_NUANCES_CONFONDUES = 3;

function profilsConfondus(recette: Recette, palette: Palette): Alerte | null {
  if (estLibre(palette)) return null;
  const visees = new Set(rangsDesVariables(recette).map((rang) => recette.crans[rang]));
  const fonds = fondsSombresDe(recette);
  const attenue = ({ mode, cran }: Confusion): boolean =>
    mode === 'dark' && facteurSombre(recette.courbes.dark[recette.crans.indexOf(cran)], fonds) < 1;
  const crans = confusionsDe(recette, palette).filter((confusion) => visees.has(confusion.cran) && !attenue(confusion));
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

/**
 * Les rampes où deux palettes se comparent ([VER-17]) : Vivid contre Vivid
 * entre deux palettes à deux intensités, la rampe unique contre la rampe
 * unique, et une rampe unique contre Soft et contre Vivid, la plus petite
 * distance l'emportant : sa part est quelconque, et elle ressemble au profil
 * le plus proche d'elle.
 */
function rampesComparees(a: Palette, b: Palette): [Intensite, Intensite][] {
  const [unA, unB] = [aUneIntensite(a), aUneIntensite(b)];
  if (!unA && !unB) return [['vivid', 'vivid']];
  const cotesA = unA ? ['unique' as const] : intensitesDe(a);
  const cotesB = unB ? ['unique' as const] : intensitesDe(b);
  return cotesA.flatMap((cote) => cotesB.map((autre): [Intensite, Intensite] => [cote, autre]));
}

/**
 * La distance moyenne de deux palettes sur les crans 500, 600 et 700, en
 * clair, chacune lue sur sa liste, et sur les rampes que `rampesComparees`
 * désigne ; `null` si l'une manque d'un de ces crans. Deux palettes libres se
 * comparent donc dès qu'elles les portent.
 */
export function distanceDePalettes(recette: Recette, a: Palette, b: Palette): number | null {
  const lire = (palette: Palette) => {
    const { crans } = grilleDe(recette, palette);
    const rangs = CRANS_PALETTES_PROCHES.map((cran) => crans.indexOf(cran));
    if (rangs.some((rang) => rang < 0)) return null;
    const rampes = rampesDe(recette, palette);
    return (intensite: Intensite) => rangs.map((rang) => rampeDe(rampes, intensite).light[rang].couleur);
  };
  const nuancesA = lire(a);
  const nuancesB = lire(b);
  if (!nuancesA || !nuancesB) return null;
  const distances = rampesComparees(a, b).map(([cote, autre]) => {
    const [deA, deB] = [nuancesA(cote), nuancesB(autre)];
    return deA.reduce((total, couleur, rang) => total + distanceOk(couleur, deB[rang]), 0) / deA.length;
  });
  return Math.min(...distances);
}

/** Un fond plus sombre que le cran 50 clair, ou plus clair que le cran 50 sombre, à 0,005 près ([ENT-06]). */
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
 * la recette, puis chaque paire de palettes proches.
 */
export function alertesDeRecette(recette: Recette): Alerte[] {
  const alertes = alertesDesFonds(recette);
  for (const palette of recette.palettes) alertes.push(...alertesDePalette(recette, palette));
  recette.palettes.forEach((a, rang) => {
    for (const b of recette.palettes.slice(rang + 1)) {
      const distance = distanceDePalettes(recette, a, b);
      if (distance !== null && distance < recette.seuils.palettesProches) {
        alertes.push({ code: 'palettes-proches', palettes: [a.id, b.id], distance, seuil: recette.seuils.palettesProches });
      }
    }
  });
  return alertes;
}
