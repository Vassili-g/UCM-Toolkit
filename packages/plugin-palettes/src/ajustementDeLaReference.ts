/**
 * Ce que la modale « Ajuster la référence » calcule (W7, réponse R1 de la
 * maquette Z10.4), sans DOM : elle règle la luminosité du profil porteur, par
 * pas de 0,01, dans les bornes de la carte (Z10.5). Un pas translate la rampe
 * du porteur, la référence avec elle. Rien ne se range ici : seul
 * « Appliquer » change la palette, par le geste de luminosité de la carte.
 */
import {
  BORNES_DES_REGLAGES,
  MODES,
  ancrageDe,
  cleDuPorteur,
  intensitesDe,
  lireHexa,
  verifierPromesses,
  type Intensite,
  type Mode,
  type Palette,
  type Promesse,
  type Recette,
} from 'ucm-couleur';

import { reglerClarte, valeursDe } from './edition';

/** Un pas de la modale, en clarté OKLCH, et les pas extrêmes que les bornes de la carte permettent. */
const PAS = 0.01;

const PAS_EXTREMES = { bas: Math.round(BORNES_DES_REGLAGES.clarte.bas / PAS), haut: Math.round(BORNES_DES_REGLAGES.clarte.haut / PAS) };

/** Le pas à l'ouverture : celui qui mène à la luminosité rangée du porteur, arrondi au pas le plus proche. */
export function pasALOuverture(recette: Recette, palette: Palette): number {
  const clarte = valeursDe(palette).clarte[cleDuPorteur(recette, palette)] ?? 0;
  return Math.min(PAS_EXTREMES.haut, Math.max(PAS_EXTREMES.bas, Math.round(clarte / PAS)));
}

/** La palette à `pas` pas de luminosité du porteur, telle qu'« Appliquer » la rangerait ; `null` hors des bornes. */
export function paletteAuPas(recette: Recette, palette: Palette, pas: number): Palette | null {
  if (pas < PAS_EXTREMES.bas || pas > PAS_EXTREMES.haut) return null;
  return reglerClarte(recette, palette, cleDuPorteur(recette, palette), pas * PAS);
}

/** La référence que la palette aurait à `pas` pas, en hexa ; `null` hors des bornes. */
export function propositionAuPas(recette: Recette, palette: Palette, pas: number): string | null {
  return paletteAuPas(recette, palette, pas)?.reference ?? null;
}

/** Le pas dont la proposition ressemble le plus à un code saisi dans la modale, octet par octet. */
export function pasLePlusProche(recette: Recette, palette: Palette, hexa: string): number {
  const saisie = lireHexa(hexa);
  if (!saisie) return pasALOuverture(recette, palette);
  let meilleur = pasALOuverture(recette, palette);
  let ecart = Infinity;
  for (let pas = PAS_EXTREMES.bas; pas <= PAS_EXTREMES.haut; pas += 1) {
    const proposee = lireHexa(propositionAuPas(recette, palette, pas) ?? '');
    if (!proposee) continue;
    const distance = proposee.reduce((total, canal, rang) => total + Math.abs(canal - saisie[rang]), 0);
    if (distance < ecart) {
      ecart = distance;
      meilleur = pas;
    }
  }
  return meilleur;
}

/** La nuance qui porterait la référence dans chaque thème. */
export function nuancesVisees(recette: Recette, palette: Palette): { readonly [M in Mode]: number } {
  return ancrageDe(recette, palette).crans;
}

/** Un thème où le pas voisin changerait le numéro de la référence, et le numéro qu'il prendrait. */
export interface ChangementDeNuance {
  readonly mode: Mode;
  readonly numero: number;
}

/**
 * Ce que le pas voisin, `sens` vaut −1 ou +1, ferait au numéro de la
 * référence : la liste des thèmes où il change, vide sinon, `null` quand ce
 * pas sortirait des bornes. L'ancrage se lit sur le départ (Z10.5) : un pas de
 * luminosité ne change pas de nuance, et la liste reste vide.
 */
export function changementAuPasVoisin(recette: Recette, palette: Palette, pas: number, sens: -1 | 1): ChangementDeNuance[] | null {
  const avant = paletteAuPas(recette, palette, pas);
  const apres = paletteAuPas(recette, palette, pas + sens);
  if (!avant || !apres) return null;
  const cransAvant = nuancesVisees(recette, avant);
  const cransApres = nuancesVisees(recette, apres);
  return MODES.filter((mode) => cransAvant[mode] !== cransApres[mode]).map((mode) => ({ mode, numero: cransApres[mode] }));
}

/** Les garanties manquées de chaque intensité présente, les deux thèmes comptés, dans l'ordre de `intensitesDe`. */
export function manqueesParIntensite(recette: Recette, palette: Palette): { readonly intensite: Intensite; readonly manquees: number }[] {
  const promesses = verifierPromesses(recette, palette);
  return intensitesDe(palette).map((intensite) => ({
    intensite,
    manquees: promesses.filter((promesse) => promesse.profil === intensite && promesse.verdict === 'manquee').length,
  }));
}

/** Une garantie qui change avec l'ajustement, ou reste manquée : son état avant et après. */
export interface GarantieComparee {
  readonly avant: Promesse;
  readonly apres: Promesse;
}

/**
 * Les garanties à montrer dans la modale : celles qui sont manquées avant ou
 * après la proposition, dans l'ordre du moteur. Une garantie tenue des deux
 * côtés ne se montre pas.
 */
export function garantiesComparees(recette: Recette, avant: Palette, apres: Palette): GarantieComparee[] {
  const promessesAvant = verifierPromesses(recette, avant);
  const promessesApres = verifierPromesses(recette, apres);
  return promessesAvant.flatMap((promesse, rang) => {
    const suivante = promessesApres[rang];
    if (!suivante || (promesse.verdict === 'tenue' && suivante.verdict === 'tenue')) return [];
    return [{ avant: promesse, apres: suivante }];
  });
}
