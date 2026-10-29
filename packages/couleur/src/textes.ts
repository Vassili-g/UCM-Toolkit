/**
 * La correction des textes par teinte : le cran de `surface/foreground` doit
 * tenir le seuil `texte` sur `surface/subtle`, `surface/default` et
 * `surface/hover` (garantie 3), et celui de `page/foreground` sur
 * `surface/default` et `surface/hover` (garantie 9). Quand une teinte les manque, le moteur
 * éloigne le cran de ces fonds, par pas de 0,001 de clarté OKLCH, part de
 * chroma et teinte gardées : plus foncé en Light, plus clair en Dark.
 *
 * Le module ne lit aucune palette : `palette.ts` lui passe chaque rampe
 * fabriquée, une fois le cran de la référence et la bosse posés.
 */
import { GARANTIES, TABLE_DES_DOSSIERS, atteintLeSeuil, contraste, garantieJugeable, sensDuTheme } from '@ucm-kit/core/emplois';

import { plafond } from './plafond';
import { cranDeLaVisee, type Cran, type Mode } from './rampe';
import type { Recette } from './recette';

/** Le pas de la correction, en clarté OKLCH. */
export const PAS_DE_LA_CORRECTION = 0.001;

/** Les garanties dont le texte se corrige : leur premier membre est un cran de la rampe, leur seuil `texte`, et leurs fonds sont des crans de la rampe. */
const GARANTIES_CORRIGEES: readonly number[] = [3, 9];

/**
 * Ce qui est arrivé au cran d'un texte : `tenue`, il tenait le seuil ;
 * `corrigee`, il l'a atteint en s'éloignant des fonds ; `reference`, il porte
 * la référence exacte et reste tel quel ; `voisin`, la clarté du cran voisin
 * l'arrête avant le seuil et il reste tel quel.
 */
export type EtatDeLaCorrection = 'tenue' | 'corrigee' | 'reference' | 'voisin';

export interface CorrectionDeTexte {
  /** Le rang du cran, dans la liste de la recette. */
  readonly rang: number;
  readonly etat: EtatDeLaCorrection;
  /** Le nombre de pas de `PAS_DE_LA_CORRECTION` franchis ; 0 hors de `corrigee`. */
  readonly pas: number;
  readonly avant: Cran;
  readonly apres: Cran;
}

/** Pour chaque rang de texte à garder, les rangs des fonds de la palette qu'il doit tenir, dans le mode et le sens du texte des boutons. */
export function fondsDesTextes(recette: Recette, mode: Mode): Map<number, Set<number>> {
  const sens = sensDuTheme(mode, recette.texteDesBoutons[mode]);
  const table = TABLE_DES_DOSSIERS[mode][sens];
  const fonds = new Map<number, Set<number>>();
  for (const garantie of GARANTIES) {
    if (!GARANTIES_CORRIGEES.includes(garantie.numero) || !garantieJugeable(garantie, recette.crans, mode, sens)) continue;
    const texte = table[garantie.premier.variable];
    if (typeof texte !== 'number') continue;
    const rang = recette.crans.indexOf(texte);
    const rangs = fonds.get(rang) ?? new Set<number>();
    for (const fond of garantie.fonds) {
      if (!('variable' in fond)) continue;
      const cran = table[fond.variable];
      if (typeof cran === 'number') rangs.add(recette.crans.indexOf(cran));
    }
    fonds.set(rang, rangs);
  }
  return fonds;
}

/** Les rangs des crans de texte qu'une rampe de ce mode peut voir corrigés, dans la liste de la recette. */
export function rangsDesTextes(recette: Recette, mode: Mode): ReadonlySet<number> {
  return new Set(fondsDesTextes(recette, mode).keys());
}

/**
 * Les textes d'une rampe de ce mode ramenés au seuil `texte` de la recette, un
 * cran à la fois, du plus grand numéro au plus petit : un cran ne passe jamais
 * la clarté de son voisin, déjà corrigé s'il est un texte (le voisin le plus
 * foncé en Light, le plus clair en Dark). Le cran de la référence (`rangDeLaReference`)
 * ne change jamais. Le cran corrigé est le même pour toutes les variables qui
 * le visent : la table le désigne une seule fois. Rend la rampe corrigée et ce
 * qui est arrivé à chaque cran de texte.
 */
export function corrigerLesTextes(
  recette: Recette,
  mode: Mode,
  rampe: readonly Cran[],
  rangDeLaReference?: number,
): { readonly rampe: Cran[]; readonly corrections: CorrectionDeTexte[] } {
  const courante = [...rampe];
  const corrections: CorrectionDeTexte[] = [];
  const sens = mode === 'light' ? -1 : 1;
  const seuil = recette.seuils.texte;
  const rangsDesTextes = [...fondsDesTextes(recette, mode)].sort(([a], [b]) => b - a);
  for (const [rang, rangsDesFonds] of rangsDesTextes) {
    const avant = courante[rang];
    const tient = (cran: Cran): boolean => [...rangsDesFonds].every((fond) => atteintLeSeuil(contraste(cran.couleur, courante[fond].couleur), seuil));
    const rendre = (etat: EtatDeLaCorrection, pas: number, apres: Cran): void => {
      corrections.push({ rang, etat, pas, avant, apres });
      courante[rang] = apres;
    };
    if (tient(avant)) { rendre('tenue', 0, avant); continue; }
    if (rang === rangDeLaReference) { rendre('reference', 0, avant); continue; }
    // Sans voisin, la clarté s'arrête au noir ou au blanc.
    const limite = courante[rang + 1]?.L ?? (sens < 0 ? 0 : 1);
    const part = Math.min(1, avant.C / Math.max(plafond(avant.L, avant.H, recette.gamut), 1e-4));
    let etat: EtatDeLaCorrection = 'voisin';
    let pas = 0;
    let apres = avant;
    for (let essai = 1; sens * (limite - (avant.L + sens * essai * PAS_DE_LA_CORRECTION)) >= 0; essai += 1) {
      const L = avant.L + sens * essai * PAS_DE_LA_CORRECTION;
      const candidat = cranDeLaVisee({ L, C: part * plafond(L, avant.H, recette.gamut), H: avant.H });
      if (!tient(candidat)) continue;
      etat = 'corrigee';
      pas = essai;
      apres = candidat;
      break;
    }
    rendre(etat, pas, apres);
  }
  return { rampe: courante, corrections };
}
