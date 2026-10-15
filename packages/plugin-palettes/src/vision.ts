/**
 * La vision des couleurs que la carte « Roue des teintes » simule ([UI-43]) :
 * sans DOM ni texte, le catalogue donne le nom de chaque vision.
 *
 * Les trois matrices sont celles de Machado, Oliveira et Fernandes, « A
 * Physiologically-based Model for Simulation of Color Vision Deficiency »,
 * Transactions on Visualization and Computer Graphics 15(6), 2009, à la
 * sévérité 1,0, en sRGB linéaire. Source des
 * coefficients : la ligne `1.0` de la table 1 du tutoriel des auteurs,
 * https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html#Tutorial
 * (six décimales, précision publiée).
 *
 * La troisième matrice est celle de la tritanomalie sévère. Dans l'article
 * corrigé, sections 4.2.1 et 4.3 (https://profs.ic.uff.br/~laffernandes/content/publications/journal/2009_tvcg_15%286%29/machado_oliveira_fernandes-tvcg-15%286%29-2009-corrected.pdf),
 * les auteurs excluent la tritanopie de leur modèle et présentent la
 * tritanomalie comme une approximation : le nom de cette vision ne dit pas
 * « tritanopie ».
 */
import { lineaireVersRgb8, rgb8VersLineaire, type Rgb8, type Triplet } from 'ucm-couleur';

export const VISIONS = ['normale', 'deuteranopie', 'protanopie', 'tritanomalie'] as const;

/** L'identifiant d'une vision ; son libellé vient du catalogue. */
export type Vision = (typeof VISIONS)[number];

type Matrice = readonly [Triplet, Triplet, Triplet];

const MATRICES: Readonly<Record<Exclude<Vision, 'normale'>, Matrice>> = {
  deuteranopie: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopie: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  tritanomalie: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/**
 * La couleur telle que la vision la perçoit : chaque ligne de la matrice
 * multiplie le vecteur sRGB linéaire, puis `lineaireVersRgb8` borne le résultat
 * à `[0, 1]`, l'encode et l'arrondit à l'octet. Les coefficients négatifs
 * servent jusqu'à ce bornage. La vision normale rend la couleur telle quelle.
 */
export function simulerLaVision(couleur: Rgb8, vision: Vision): Rgb8 {
  if (vision === 'normale') return couleur;
  const matrice = MATRICES[vision];
  const [r, g, b] = rgb8VersLineaire(couleur);
  return lineaireVersRgb8(matrice.map(([a, c, d]) => a * r + c * g + d * b) as unknown as Triplet);
}
