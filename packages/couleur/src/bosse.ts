/**
 * La bosse de chroma d'une rampe porteuse ([MOT-39]) : quand la référence est plus vive
 * que la chroma que sa rampe vise à son cran, les crans de clarté voisine
 * montent vers elle. `palette.ts` la garde contre les promesses.
 */
import type { Oklch } from './conversions';
import type { Mode, ViseeDeCran } from './rampe';

/** L'écart type de la bosse, en clarté. */
const LARGEUR_DE_LA_BOSSE = 0.1;
/** Les clartés de courbe où la zone des fonds commence à se fermer et où elle l'est entièrement, par mode. */
const ZONE_DES_FONDS = { light: { debut: 0.88, pleine: 0.78 }, dark: { debut: 0.5, pleine: 0.56 } } as const;

const lisse = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/**
 * La part de la zone des fonds à la clarté de courbe `Lc`, dans `[0 ; 1]` :
 * les tons clairs du thème Light, les fonds 300 à 500 du thème Dark. La bosse
 * n'y entre pas.
 */
function zoneDesFonds(Lc: number, mode: Mode): number {
  const { debut, pleine } = ZONE_DES_FONDS[mode];
  return 1 - lisse((debut - Lc) / (debut - pleine));
}

/**
 * La chroma de chaque cran d'une rampe porteuse dans un mode, bosse entière, ou
 * `null` quand la référence n'est pas plus vive que la chroma visée à son cran
 * (`rang`). Le cran de la référence garde sa chroma visée ; un autre monte
 * vers celle de la référence selon sa proximité en clarté, sans dépasser sa
 * part du plafond de l'écran, et jamais sous sa chroma visée. La zone des
 * fonds reste fermée, sauf pour la part où la référence s'y trouve quand
 * `zoneOuverte` est vrai : Vivid et l'intensité unique la rouvrent, Soft
 * garde des fonds calmes même quand il porte la référence.
 */
export function bosseDeChroma(visees: readonly ViseeDeCran[], rang: number, mode: Mode, reference: Oklch, zoneOuverte: boolean): number[] | null {
  const rho = reference.C / Math.max(1e-6, visees[rang].C);
  if (rho <= 1) return null;
  const ouverte = zoneOuverte ? zoneDesFonds(visees[rang].Lc, mode) : 0;
  return visees.map((cran, i) => {
    if (i === rang) return cran.C;
    const fond = zoneDesFonds(cran.Lc, mode) * (1 - ouverte);
    const w = (1 - fond) * Math.exp(-0.5 * ((cran.L - reference.L) / LARGEUR_DE_LA_BOSSE) ** 2);
    return Math.max(cran.C, Math.min(cran.part * cran.plafond, reference.C, cran.C * (1 + (rho - 1) * w)));
  });
}
