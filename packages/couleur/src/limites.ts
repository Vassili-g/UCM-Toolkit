/**
 * La limite dynamique d'un réglage ([DER-19], [DER-20]) : l'intervalle autour
 * de la valeur courante où chaque promesse tenue au départ reste tenue, et où
 * deux nuances voisines gardent leur écart de clarté.
 *
 * Le balayage ne lit aucun réglage : le Color shift et le réglage global lui
 * passent chacun la palette que leur geste donnerait pour une valeur.
 */
import { clartesDe } from './palette';
import { verifierPromesses, type Promesse } from './promesses';
import { arrondir } from './rampe';
import type { Palette, Recette } from './recette';

/** L'écart de clarté minimal entre deux nuances voisines, pour que l'ordre de la rampe tienne ([DER-19]). */
export const ECART_MINIMAL_DES_CLARTES = 0.01;

/** Ce qui arrête une borne : une promesse tenue au départ qui manquerait, ou l'ordre des nuances. */
export type CauseDeLaBorne =
  | { readonly nature: 'promesse'; readonly promesse: Promesse }
  | { readonly nature: 'ordre' };

/** Une borne permise, et sa cause ; `null` quand la borne fixe du réglage l'arrête. */
export interface Borne {
  readonly valeur: number;
  readonly cause: CauseDeLaBorne | null;
}

export interface Limite {
  readonly bas: Borne;
  readonly haut: Borne;
}

export interface DemandeDeLimite {
  readonly recette: Recette;
  /** La palette au départ du geste. */
  readonly palette: Palette;
  /** La palette que le geste donnerait pour `valeur`. */
  readonly candidate: (valeur: number) => Palette;
  /** La valeur au départ du geste. */
  readonly valeur: number;
  /** Les bornes fixes du réglage ([MOT-15], [ENT-15]). */
  readonly bornes: { readonly bas: number; readonly haut: number };
  /** Le pas du balayage : 1°, 0,01 ou 0,005. */
  readonly pas: number;
  /** Vrai quand le réglage déplace la clarté des nuances, et doit garder leur ordre. */
  readonly ordre: boolean;
}

/** La clé d'une promesse, qui la retrouve d'une palette candidate à l'autre : une garantie compte une promesse par fond. */
const cleDe = (promesse: Promesse): string => {
  const fond = promesse.second.nature === 'cran' ? promesse.second.cran : promesse.second.nature;
  return `${promesse.mode}/${promesse.profil}/${promesse.garantie.numero}/${fond}`;
};

/** Vrai quand chaque liste de clartés de la palette garde `ECART_MINIMAL_DES_CLARTES` entre voisines. */
export function ordreTenu(recette: Recette, palette: Palette): boolean {
  return Object.values(clartesDe(recette, palette)).every((parMode) => Object.values(parMode).every((clartes) => {
    const sens = Math.sign(clartes[0] - clartes[clartes.length - 1]);
    // Le millionième absorbe l'erreur d'arrondi d'un écart posé exactement à 0,01.
    return clartes.every((clarte, rang) => rang === 0 || sens * (clartes[rang - 1] - clarte) >= ECART_MINIMAL_DES_CLARTES - 1e-6);
  }));
}

/** Le nombre de décimales d'un pas : 0 pour 1, 2 pour 0,01, 3 pour 0,005. */
const decimalesDu = (pas: number): number => Math.max(0, Math.ceil(-Math.log10(pas) - 1e-9));

/**
 * Le balayage d'une limite ([DER-19]), une valeur candidate par pas : il part
 * de la valeur courante, au pas du réglage, vers chaque borne fixe, et
 * s'arrête sur la dernière valeur permise. Une promesse manquée au départ ne
 * borne rien ; l'ordre des nuances non plus quand il ne tient pas au départ.
 * La cause d'une borne est la première promesse, dans l'ordre de
 * `verifierPromesses`, qui manquerait un pas au-delà ([DER-20]).
 *
 * Une candidate coûte une palette entière, et une limite de teinte libre en
 * juge 180 : 24 ms en moyenne dans Node, 53 ms au plus (`mesurer-limites.mjs`).
 * Le générateur rend la main après chaque candidate, pour que l'interface
 * étale le calcul entre deux images.
 */
export function* balayerLaLimite(demande: DemandeDeLimite): Generator<void, Limite, void> {
  const { recette, valeur, bornes, pas } = demande;
  const tenues = new Set(verifierPromesses(recette, demande.palette)
    .filter((promesse) => promesse.verdict === 'tenue')
    .map(cleDe));
  const ordre = demande.ordre && ordreTenu(recette, demande.palette);
  const decimales = decimalesDu(pas);

  const causeA = (candidate: number): CauseDeLaBorne | null => {
    const palette = demande.candidate(candidate);
    if (ordre && !ordreTenu(recette, palette)) return { nature: 'ordre' };
    const manquee = verifierPromesses(recette, palette).find((promesse) => promesse.verdict === 'manquee' && tenues.has(cleDe(promesse)));
    return manquee ? { nature: 'promesse', promesse: manquee } : null;
  };

  function* chercher(sens: -1 | 1): Generator<void, Borne, void> {
    const fixe = sens > 0 ? bornes.haut : bornes.bas;
    let derniere = valeur;
    for (let rang = 1; sens * (fixe - derniere) > 0; rang += 1) {
      const suivante = arrondir(Math.round((valeur + sens * rang * pas) / pas) * pas, decimales);
      const candidate = sens > 0 ? Math.min(fixe, suivante) : Math.max(fixe, suivante);
      if (sens * (candidate - derniere) <= 0) continue;
      const cause = causeA(candidate);
      if (cause) return { valeur: derniere, cause };
      derniere = candidate;
      yield;
    }
    return { valeur: fixe, cause: null };
  }

  const bas = yield* chercher(-1);
  const haut = yield* chercher(1);
  return { bas, haut };
}

/** La limite d'un réglage, calculée d'un trait ([DER-19]). */
export function limiteDynamique(demande: DemandeDeLimite): Limite {
  const balayage = balayerLaLimite(demande);
  for (;;) {
    const pas = balayage.next();
    if (pas.done) return pas.value;
  }
}
