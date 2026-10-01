/**
 * La collection `usage` : la table des emplois en variables (décisions D13,
 * D14 et D16, section 5 d'ARCHITECTURE-FINALE). UCM Palettes écrit ces
 * variables et `ucm check` les lit ; les deux dérivent leurs noms, leurs
 * cibles et leurs portées de ce module.
 */
import { EMPLOIS, TABLE_DES_EMPLOIS, emploiPresent, rangDuCranLeger, type Emploi } from './emplois.js';
import { decalagesDeLEmploi } from './paires.js';
import { RANGS, type Rang } from './rangs.js';

/** Les trois usages propres au neutre, et leur cran. WCAG n'exige aucun contraste de `text-disabled`. */
export const USAGES_DU_NEUTRE = { 'text-strong': 900, 'text-disabled': 500, 'fill-disabled': 200 } as const;

export type UsageDuNeutre = keyof typeof USAGES_DU_NEUTRE;

/** Les niveaux d'élévation, opaques, du fond d'écran à la modale (D15). */
export const NIVEAUX_D_ELEVATION = ['page', 'raised', 'overlay'] as const;

export type NiveauDElevation = (typeof NIVEAUX_D_ELEVATION)[number];

/** Ce qu'une couleur peint, dans le vocabulaire que publie UCM Exporter. */
export type Peint = 'background' | 'foreground' | 'icon' | 'border' | 'ring';

/** Une portée de variable de Figma, telle que l'API la nomme. */
export type PorteeFigma = 'FRAME_FILL' | 'SHAPE_FILL' | 'TEXT_FILL' | 'STROKE_COLOR';

export interface Support {
  readonly peint: readonly Peint[];
  readonly portees: readonly PorteeFigma[];
}

const FOND: Support = { peint: ['background'], portees: ['FRAME_FILL', 'SHAPE_FILL'] };
const TEXTE: Support = { peint: ['foreground', 'icon'], portees: ['TEXT_FILL', 'SHAPE_FILL'] };
const CONTOUR: Support = { peint: ['border'], portees: ['STROKE_COLOR'] };
const ANNEAU: Support = { peint: ['ring'], portees: ['STROKE_COLOR'] };

/** Ce que chaque usage peint, et les portées Figma de sa variable (D14). */
export const SUPPORT_DES_USAGES: { readonly [U in Emploi | UsageDuNeutre | 'elevation']: Support } = {
  solid: FOND,
  surface: FOND,
  'surface-card': FOND,
  'fill-disabled': FOND,
  elevation: FOND,
  text: TEXTE,
  'text-strong': TEXTE,
  'text-disabled': TEXTE,
  'on-solid': TEXTE,
  'border-control': CONTOUR,
  'border-decorative': CONTOUR,
  focus: ANNEAU,
};

/** Une variable de `usage` : son chemin sous `usage`, et le chemin sous `theme` que son alias vise. */
export interface Usage {
  readonly chemin: readonly string[];
  readonly cible: readonly string[];
  readonly usage: Emploi | UsageDuNeutre | 'elevation';
  /** Le rang, pour un emploi que les paires avancent ; absent sinon. */
  readonly rang?: Rang;
  readonly support: Support;
}

/** Le nom de la palette neutre, qui porte `on-solid` et les usages propres au neutre. */
export const PALETTE_NEUTRE = 'neutral';

/** Vrai quand les paires avancent l'emploi jusqu'au dernier rang : `solid`, `text`, `surface`, `border-control`. */
export function emploiARangs(emploi: Emploi): boolean {
  return decalagesDeLEmploi(emploi).length === RANGS.length;
}

/**
 * Les variables de `usage` d'une palette, dans l'ordre des emplois puis des
 * rangs : vingt quand la liste porte la 50, dix-neuf sinon. `intensite`
 * ajoute son segment au chemin et à la cible. Un rang vise le cran que la
 * liste place après celui de l'emploi : `crans` doit porter chaque cran de
 * la table, ce que la validation de la recette exige.
 */
export function usagesDeLaPalette(palette: string, crans: readonly number[], intensite?: string): Usage[] {
  const prefixe = intensite === undefined ? [palette] : [palette, intensite];
  const usages: Usage[] = [];
  for (const emploi of EMPLOIS) {
    if (!emploiPresent(emploi, crans)) continue;
    const support = SUPPORT_DES_USAGES[emploi];
    const cran = TABLE_DES_EMPLOIS[emploi];
    if (cran === 'fond') {
      usages.push({ chemin: [...prefixe, emploi], cible: [PALETTE_NEUTRE, String(crans[rangDuCranLeger(crans)])], usage: emploi, support });
      continue;
    }
    const depart = crans.indexOf(cran);
    if (!emploiARangs(emploi)) {
      usages.push({ chemin: [...prefixe, emploi], cible: [...prefixe, String(cran)], usage: emploi, support });
      continue;
    }
    RANGS.forEach((rang, decalage) => {
      const vise = crans[depart + decalage];
      if (vise === undefined) throw new Error(`La liste n'a pas de cran après ${cran} pour le rang ${rang}.`);
      usages.push({ chemin: [...prefixe, emploi, rang], cible: [...prefixe, String(vise)], usage: emploi, rang, support });
    });
  }
  return usages;
}

/** Les variables propres au neutre : `text-strong`, `text-disabled`, `fill-disabled`, sans intensité. */
export function usagesPropresAuNeutre(): Usage[] {
  return (Object.keys(USAGES_DU_NEUTRE) as UsageDuNeutre[]).map((usage) => ({
    chemin: [PALETTE_NEUTRE, usage],
    cible: [PALETTE_NEUTRE, String(USAGES_DU_NEUTRE[usage])],
    usage,
    support: SUPPORT_DES_USAGES[usage],
  }));
}

/** Les trois niveaux d'élévation : `usage.elevation.*` vise `theme.elevation.*`. */
export function usagesDElevation(): Usage[] {
  return NIVEAUX_D_ELEVATION.map((niveau) => ({
    chemin: ['elevation', niveau],
    cible: ['elevation', niveau],
    usage: 'elevation' as const,
    support: SUPPORT_DES_USAGES.elevation,
  }));
}
