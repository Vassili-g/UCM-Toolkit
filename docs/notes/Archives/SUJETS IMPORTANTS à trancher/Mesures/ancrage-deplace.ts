/**
 * La règle « A + ancrage déplacé », simulée hors du moteur sur une rampe Dark que `rampesDe` a rendue
 * (piste A : la table Dark de `surface` vaut 200, 300, 400).
 *
 * Tranche : l'intensité porteuse dont la référence tombe sur le cran du texte de la page et dont le
 * texte, la référence elle-même, reste sous le seuil `texte` sur le 200 ou le 300.
 * 1. La référence glisse au cran voisin plus sombre, couleur exacte gardée.
 * 2. Le cran du texte libéré part de la clarté de la courbe Dark, teinte et part de chroma de la
 *    référence, et s'éclaircit par pas de 0,001 jusqu'au seuil sur le 200 et le 300, sans passer la
 *    clarté du cran voisin plus clair.
 * 3. Les crans entre le 300 et la référence se relèvent vers un espacement régulier : le cran à la
 *    fraction f du chemin entre le 300 et la référence prend la part f de son écart à l'espacement
 *    régulier (1/3 pour le 400 et 2/3 pour le 500 quand la référence est au 600). Teinte et part de
 *    chroma de chaque cran gardées ; un cran déjà au-dessus de l'espacement régulier ne bouge pas.
 *
 * Importé par `generer-dark-normal.ts` et `mesurer-ancrage-deplace.ts`.
 */
import * as M from '../../../../../packages/couleur/src/index';
import type { Cran, Palette, Recette } from '../../../../../packages/couleur/src/index';

const PAS = 0.001;

export interface Simulation {
  /** La rampe après la règle ; la rampe reçue si la palette est hors tranche. */
  readonly rampe: readonly Cran[];
  readonly dansLaTranche: boolean;
  /** Le numéro où la référence se pose après la règle (celui d'avant hors tranche). */
  readonly referenceAu: number | undefined;
  readonly referenceAvant: number | undefined;
  /** Vrai quand le texte atteint le seuil sur le 200 et le 300 ; toujours vrai hors tranche. */
  readonly texteTient: boolean;
  /** Vrai quand les clartés des 11 crans croissent strictement. */
  readonly ordreTenu: boolean;
}

const partDe = (c: Cran, gamut: Recette['gamut']): number => Math.min(1, c.C / Math.max(M.plafond(c.L, c.H, gamut), 1e-4));
const croissant = (r: readonly Cran[]): boolean => r.every((c, k) => k === 0 || c.L > r[k - 1].L);

/** Simule la règle sur la rampe Dark `rampe` de l'intensité `intensite` ; `cranTexte` est le numéro du texte de la page. */
export function simuler(recette: Recette, palette: Palette, intensite: M.Intensite, rampe: readonly Cran[], cranTexte: number): Simulation {
  const rang = (n: number) => recette.crans.indexOf(n);
  const ancrage = M.ancrageDe(recette, palette);
  const rangRef = ancrage.rangs.dark;
  const seuil = recette.seuils.texte;
  const horsTranche: Simulation = {
    rampe, dansLaTranche: false, texteTient: true, ordreTenu: croissant(rampe),
    referenceAu: intensite === ancrage.profil ? ancrage.crans.dark : undefined,
    referenceAvant: intensite === ancrage.profil ? ancrage.crans.dark : undefined,
  };
  if (intensite !== ancrage.profil || rangRef !== rang(cranTexte)) return horsTranche;
  const [r200, r300] = [rang(200), rang(300)];
  const ref = rampe[rangRef];
  const tient = (c: Cran) => M.contraste(c.couleur, rampe[r200].couleur) >= seuil && M.contraste(c.couleur, rampe[r300].couleur) >= seuil;
  if (tient(ref)) return horsTranche;

  const nouvelle = [...rampe];
  const rangNouveau = rangRef - 1;
  nouvelle[rangNouveau] = ref;

  // Le cran du texte libéré.
  const H = ref.H, part = partDe(ref, recette.gamut);
  const limite = rampe[rangRef + 1].L;
  let libere: Cran | undefined;
  let tientLeSeuil = false;
  for (let L = recette.courbes.dark[rangRef]; L <= limite + 1e-9; L = Math.round((L + PAS) * 1e6) / 1e6) {
    libere = M.cranDeLaVisee({ L, C: part * M.plafond(L, H, recette.gamut), H });
    if (tient(libere)) { tientLeSeuil = true; break; }
  }
  nouvelle[rangRef] = libere ?? ref;

  // Les crans entre le 300 et la référence.
  const L300 = rampe[r300].L;
  for (let k = r300 + 1; k < rangNouveau; k += 1) {
    const f = (k - r300) / (rangNouveau - r300);
    const reguliere = L300 + (ref.L - L300) * f;
    const c = rampe[k];
    if (reguliere <= c.L) continue;
    const L = c.L + f * (reguliere - c.L);
    nouvelle[k] = M.cranDeLaVisee({ L, C: partDe(c, recette.gamut) * M.plafond(L, c.H, recette.gamut), H: c.H });
  }
  return {
    rampe: nouvelle, dansLaTranche: true, texteTient: tientLeSeuil, ordreTenu: croissant(nouvelle),
    referenceAu: recette.crans[rangNouveau], referenceAvant: ancrage.crans.dark,
  };
}
