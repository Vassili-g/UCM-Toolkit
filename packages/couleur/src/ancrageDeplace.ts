/**
 * L'ancrage déplacé en Dark normal ([MOT-17]). Le texte de `page` (`page/foreground`)
 * y vise le 700. Quand la référence exacte se pose sur ce cran et manque le seuil
 * `texte` sur les fonds de la garantie 9 (`surface/default` et `surface/hover`),
 * la correction des textes ne peut pas la rendre lisible : le moteur la glisse au
 * cran plus sombre voisin, couleur exacte gardée, et libère le cran du texte.
 *
 * - Le cran libéré part de la clarté de la courbe, avec la teinte et la part de
 *   chroma de la référence, et s'éclaircit par pas de `PAS_DE_LA_CORRECTION`
 *   jusqu'au seuil sur les fonds, sans passer la clarté du cran plus clair voisin.
 * - Les crans entre le fond le plus sombre de la garantie et la référence prennent
 *   la part `f` de leur écart à un espacement régulier entre ce fond et la référence
 *   (`f` vaut 1/3 pour le premier cran, 2/3 pour le suivant). Un cran déjà au-dessus
 *   de cet espacement ne bouge pas. Teinte et part de chroma de chaque cran sont gardées.
 *
 * Le Dark inversé et le Light n'en relèvent pas : une référence posée sur le 800 garde
 * sa place et la garantie 9 manque pour elle. Le module ne lit aucune palette :
 * `palette.ts` lui passe les couleurs. Mesure : `docs/notes/Archives/SUJETS IMPORTANTS à trancher/Mesures/ancrage-deplace.ts`.
 */
import { TABLE_DES_DOSSIERS, atteintLeSeuil, contraste, sensDuTheme } from '@ucm-kit/core/emplois';

import type { Rgb8 } from './conversions';
import { plafond } from './plafond';
import { cranDeLaVisee, type Cran } from './rampe';
import type { Recette } from './recette';
import { PAS_DE_LA_CORRECTION, fondsDesTextes } from './textes';

/** Le cran du texte de la page en Dark normal, et les rangs des fonds que la garantie 9 lui oppose, du plus clair au plus sombre. */
export interface TexteSurveille {
  readonly rang: number;
  readonly fonds: readonly number[];
}

const surveilles = new WeakMap<Recette, TexteSurveille | null>();

/**
 * Ce que la règle surveille dans une recette ; absent en Dark inversé, quand la
 * garantie 9 ne se juge pas (un cran manque à la liste) et quand le cran du texte
 * n'a pas de voisin plus sombre. Mémorisé par recette.
 */
export function texteSurveille(recette: Recette): TexteSurveille | undefined {
  let surveille = surveilles.get(recette);
  if (surveille === undefined) {
    surveille = null;
    if (sensDuTheme('dark', recette.texteDesBoutons.dark) === 'normal') {
      const rang = recette.crans.indexOf(TABLE_DES_DOSSIERS.dark.normal['page/foreground']);
      const fonds = fondsDesTextes(recette, 'dark').get(rang);
      if (rang >= 1 && fonds && fonds.size > 0) surveille = { rang, fonds: [...fonds].sort((a, b) => a - b) };
    }
    surveilles.set(recette, surveille);
  }
  return surveille ?? undefined;
}

/** Vrai quand la couleur atteint le seuil `texte` sur chacun des fonds. */
export function tientLeTexte(recette: Recette, couleur: Rgb8, fonds: readonly Rgb8[]): boolean {
  return fonds.every((fond) => atteintLeSeuil(contraste(couleur, fond), recette.seuils.texte));
}

const partDe = (cran: Cran, recette: Recette): number => Math.min(1, cran.C / Math.max(plafond(cran.L, cran.H, recette.gamut), 1e-4));

/**
 * La rampe Dark après le déplacement. `crans` porte la référence exacte au rang
 * `surveille.rang`, corrigée ou non ; `clarteDeLaCourbe` est la clarté de la
 * courbe à ce rang. Avec `corriger`, le cran libéré s'éclaircit jusqu'au seuil ;
 * sans lui, il garde la clarté de la courbe.
 */
export function deplacerLaReference(
  recette: Recette,
  crans: readonly Cran[],
  surveille: TexteSurveille,
  clarteDeLaCourbe: number,
  corriger: boolean,
): Cran[] {
  const sortie = [...crans];
  const rangDuTexte = surveille.rang;
  const rangDeLaReference = rangDuTexte - 1;
  const reference = crans[rangDuTexte];
  sortie[rangDeLaReference] = reference;

  const part = partDe(reference, recette);
  const fonds = surveille.fonds.map((rang) => crans[rang].couleur);
  const libere = (L: number): Cran => cranDeLaVisee({ L, C: part * plafond(L, reference.H, recette.gamut), H: reference.H });
  let cran = libere(clarteDeLaCourbe);
  if (corriger) {
    const limite = crans[rangDuTexte + 1]?.L ?? 1;
    for (let L = clarteDeLaCourbe; L <= limite + 1e-9; L = Math.round((L + PAS_DE_LA_CORRECTION) * 1e6) / 1e6) {
      cran = libere(L);
      if (tientLeTexte(recette, cran.couleur, fonds)) break;
    }
  }
  sortie[rangDuTexte] = cran;

  const rangDuFond = surveille.fonds[surveille.fonds.length - 1];
  const clarteDuFond = crans[rangDuFond].L;
  for (let rang = rangDuFond + 1; rang < rangDeLaReference; rang += 1) {
    const f = (rang - rangDuFond) / (rangDeLaReference - rangDuFond);
    const reguliere = clarteDuFond + (reference.L - clarteDuFond) * f;
    const voisin = crans[rang];
    if (reguliere <= voisin.L) continue;
    const L = voisin.L + f * (reguliere - voisin.L);
    sortie[rang] = cranDeLaVisee({ L, C: partDe(voisin, recette) * plafond(L, voisin.H, recette.gamut), H: voisin.H });
  }
  return sortie;
}
