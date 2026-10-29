/** Les variables de thème, leurs crans et leurs portées, communes aux lecteurs de palettes. */
export type TexteDesBoutons = 'blanc' | 'noir';
export type SensDuTheme = 'normal' | 'inverse';
export type ModeDuTheme = 'light' | 'dark';

export const COULEUR_DU_TEXTE_DES_BOUTONS = { blanc: '#FFFFFF', noir: '#000000' } as const;
export const TEXTE_DES_BOUTONS_PAR_DEFAUT = { light: 'blanc', dark: 'noir' } as const;

export function sensDuTheme(mode: ModeDuTheme, texte: TexteDesBoutons): SensDuTheme {
  return texte === TEXTE_DES_BOUTONS_PAR_DEFAUT[mode] ? 'normal' : 'inverse';
}

export const DOSSIERS = ['solid', 'surface', 'page'] as const;
export const ETATS = ['default', 'hover', 'pressed'] as const;
export const VARIABLES_DE_PALETTE = [
  'solid/default', 'solid/hover', 'solid/pressed', 'solid/foreground',
  'surface/default', 'surface/hover', 'surface/pressed', 'surface/subtle', 'surface/foreground', 'surface/border', 'surface/divider',
  'page/foreground', 'page/border', 'page/divider', 'ring',
] as const;
export const VARIABLES_DU_NEUTRE = ['page/foreground-main', 'page/foreground-subtle', 'scale/0', 'scale/1000'] as const;
export const VARIABLES_GLOBALES = ['disabled/background', 'disabled/foreground', 'disabled/border'] as const;
export const NIVEAUX_D_ELEVATION_DU_THEME = ['page', 'raised'] as const;

export type VariableDePalette = (typeof VARIABLES_DE_PALETTE)[number];
export type VariablePropreAuNeutre = (typeof VARIABLES_DU_NEUTRE)[number];
export type VariableGlobale = (typeof VARIABLES_GLOBALES)[number];
export type VariableDuTheme = VariableDePalette | VariablePropreAuNeutre | VariableGlobale | `elevation/${(typeof NIVEAUX_D_ELEVATION_DU_THEME)[number]}`;

/** Les variables de dossier que porte `theme`, dans l'ordre où une fin de nom les cherche. */
export const VARIABLES_DU_THEME: readonly VariableDuTheme[] = [
  ...VARIABLES_DE_PALETTE,
  ...VARIABLES_DU_NEUTRE,
  ...VARIABLES_GLOBALES,
  ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`),
];

/** Une table par thème et par sens : en Dark, les surfaces montent aux crans 300 à 500 et leur texte au 950. */
export const TABLE_DES_DOSSIERS = {
  light: {
    normal: {
      'solid/default': 700, 'solid/hover': 800, 'solid/pressed': 900, 'solid/foreground': 'texteDesBoutons',
      'surface/default': 100, 'surface/hover': 200, 'surface/pressed': 300, 'surface/subtle': 50, 'surface/foreground': 700, 'surface/border': 700, 'surface/divider': 300,
      'page/foreground': 700, 'page/border': 700, 'page/divider': 300, 'ring': 600,
    },
    inverse: {
      'solid/default': 700, 'solid/hover': 600, 'solid/pressed': 500, 'solid/foreground': 'texteDesBoutons',
      'surface/default': 100, 'surface/hover': 200, 'surface/pressed': 300, 'surface/subtle': 50, 'surface/foreground': 900, 'surface/border': 900, 'surface/divider': 300,
      'page/foreground': 800, 'page/border': 800, 'page/divider': 300, 'ring': 700,
    },
  },
  dark: {
    normal: {
      'solid/default': 700, 'solid/hover': 800, 'solid/pressed': 900, 'solid/foreground': 'texteDesBoutons',
      'surface/default': 300, 'surface/hover': 400, 'surface/pressed': 500, 'surface/subtle': 200, 'surface/foreground': 950, 'surface/border': 950, 'surface/divider': 500,
      'page/foreground': 700, 'page/border': 700, 'page/divider': 300, 'ring': 600,
    },
    inverse: {
      'solid/default': 700, 'solid/hover': 600, 'solid/pressed': 500, 'solid/foreground': 'texteDesBoutons',
      'surface/default': 300, 'surface/hover': 400, 'surface/pressed': 500, 'surface/subtle': 200, 'surface/foreground': 950, 'surface/border': 950, 'surface/divider': 500,
      'page/foreground': 800, 'page/border': 800, 'page/divider': 300, 'ring': 800,
    },
  },
} as const satisfies Record<ModeDuTheme, Record<SensDuTheme, Record<VariableDePalette, number | 'texteDesBoutons'>>>;

/** Les trois couleurs désactivées ne dépendent ni du thème ni du sens. */
const CRANS_GLOBAUX = { 'disabled/background': 200, 'disabled/foreground': 500, 'disabled/border': 500 } as const;

/** Les couleurs du neutre hors rampe et les élévations rendent `undefined` : elles ne visent aucun cran. */
export function cranDeLaVariable(variable: VariableDuTheme, mode: ModeDuTheme, sens: SensDuTheme): number | 'texteDesBoutons' | undefined {
  const table = TABLE_DES_DOSSIERS[mode][sens];
  if (variable === 'page/foreground-subtle') return table['page/foreground'];
  if (variable in CRANS_GLOBAUX) return CRANS_GLOBAUX[variable as VariableGlobale];
  if (variable in table) return table[variable as VariableDePalette];
  return undefined;
}

export function cransRequis(mode: ModeDuTheme, sens: SensDuTheme): number[] {
  const crans = Object.values(TABLE_DES_DOSSIERS[mode][sens]).filter((cran) => typeof cran === 'number');
  return [...new Set(crans)].sort((a, b) => a - b);
}

/**
 * L'indice du cran le plus clair de la liste, le plus petit numéro : la recette la trie
 * croissante, mais on calcule le minimum. Une liste vide rend 0.
 */
export function rangDuCranLeger(crans: readonly number[]): number {
  let rang = 0;
  crans.forEach((cran, i) => {
    if (cran < crans[rang]) rang = i;
  });
  return rang;
}

/** Les couleurs sans cran sont présentes indépendamment de la liste des nuances. */
export function variablePresente(variable: VariableDuTheme, crans: readonly number[], mode: ModeDuTheme, sens: SensDuTheme): boolean {
  const cran = cranDeLaVariable(variable, mode, sens);
  return typeof cran !== 'number' || crans.includes(cran);
}

/** Les variables du cran à l'indice `rang`, dans l'ordre de la table ; le neutre ajoute ses variables numériques. */
export function variablesDuCran(crans: readonly number[], rang: number, mode: ModeDuTheme, sens: SensDuTheme, neutre: boolean): VariableDuTheme[] {
  const cran = crans[rang];
  if (cran === undefined) return [];
  const variables: readonly VariableDuTheme[] = neutre
    ? [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE, ...VARIABLES_GLOBALES]
    : VARIABLES_DE_PALETTE;
  return variables.filter((variable) => cranDeLaVariable(variable, mode, sens) === cran);
}

export const ETAT_DU_FOND = {
  repos: { etat: 'default' },
  survol: { etat: 'hover' },
  appui: { etat: 'pressed' },
  focus: { etat: 'default', anneau: 'ring' },
  desactive: { variables: VARIABLES_GLOBALES },
} as const;

export interface SupportDeVariable {
  readonly peint: readonly ('background' | 'foreground' | 'icon' | 'border' | 'ring')[];
  readonly portees: readonly ('FRAME_FILL' | 'SHAPE_FILL' | 'TEXT_FILL' | 'STROKE_COLOR')[];
}

const FOND: SupportDeVariable = { peint: ['background'], portees: ['FRAME_FILL', 'SHAPE_FILL'] };
const TEXTE: SupportDeVariable = { peint: ['foreground', 'icon'], portees: ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] };
const FILET: SupportDeVariable = { peint: ['border'], portees: ['STROKE_COLOR', 'FRAME_FILL', 'SHAPE_FILL'] };
const CONTOUR: SupportDeVariable = { peint: ['border'], portees: ['STROKE_COLOR'] };
const ANNEAU: SupportDeVariable = { peint: ['ring'], portees: ['STROKE_COLOR'] };
const ECHELLE: SupportDeVariable = { peint: [], portees: [] };

export const SUPPORT_DES_VARIABLES: Readonly<Record<VariableDuTheme, SupportDeVariable>> = {
  'solid/default': FOND, 'solid/hover': FOND, 'solid/pressed': FOND, 'solid/foreground': TEXTE,
  'surface/default': FOND, 'surface/hover': FOND, 'surface/pressed': FOND, 'surface/subtle': FOND, 'surface/foreground': TEXTE, 'surface/border': CONTOUR, 'surface/divider': FILET,
  'page/foreground': TEXTE, 'page/border': CONTOUR, 'page/divider': FILET, 'ring': ANNEAU,
  'page/foreground-main': TEXTE, 'page/foreground-subtle': TEXTE, 'scale/0': ECHELLE, 'scale/1000': ECHELLE,
  'disabled/background': FOND, 'disabled/foreground': TEXTE, 'disabled/border': CONTOUR,
  'elevation/page': FOND, 'elevation/raised': FOND,
};
