/**
 * La référence complète d'un fichier full UCM : les variables que `brands`, `utility` et `theme` portent, les cibles d'élévation,
 * et les échelles de départ de `layout`, `typography` et des valeurs hors couleur de `primitives`.
 *
 * `brands`, `utility` et `theme` se dérivent des registres et de `TABLE_DES_DOSSIERS`, jamais recopiés. Les échelles sont des choix du mainteneur
 * (`docs/notes/Recherches/Archi Tokens Multi-marques/PROPOSITION-REFERENCE-COMPLETE.md`, partie 6) : `components` n'a aucune variable imposée,
 * `identity` ne vise aucun cran (le designer le choisit par marque) et les couleurs de `primitives` viennent de Palettes.
 *
 * Après une modification : relancer `npm test`, relire `docs/inventaire/couverture.ts` et changer la version du kit.
 */
import { NIVEAUX_D_ELEVATION_DU_THEME, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES, type CibleDeVariable, type ModeDuTheme } from '../emplois/dossiers.js';
import { FAMILLES_BRANDS, REGISTRE_COULEURS_ABSOLUES, type Collection } from './architecture.js';
import { CRANS, MODES, PROFILS, REGISTRE_STATUTS } from './vocabulaire.js';

/** Ce que `variablesAttendues` fait varier. Sans valeur, elle prend tous les thèmes et tous les profils, et une seule marque sans nom. */
export interface ContexteDeLaReference {
  /** Une colonne de `brands` par marque ; le nom de la marque n'entre pas dans le chemin. */
  readonly marques?: readonly string[];
  readonly themes?: readonly ModeDuTheme[];
  readonly profils?: readonly (typeof PROFILS)[number][];
}

/** Une variable que le fichier doit porter : son chemin dans la collection, sans le nom de la collection ni celui du mode. */
export interface VariableAttendue {
  readonly collection: Collection;
  readonly chemin: string;
  /** Pour `brands` : la marque, donc la colonne, qui la porte. */
  readonly marque?: string;
}

const statuts = REGISTRE_STATUTS.termes.map((terme) => terme.id);
const famillesDeMarque = FAMILLES_BRANDS.termes.map((terme) => terme.id).filter((famille) => famille !== 'identity');
const absolues = REGISTRE_COULEURS_ABSOLUES.termes.map((terme) => terme.id);

function brands(marques: readonly (string | undefined)[], themes: readonly ModeDuTheme[]): VariableAttendue[] {
  return marques.flatMap((marque) => [
    ...famillesDeMarque.flatMap((famille) => themes.flatMap((theme) => CRANS.map((cran) => `${famille}/${theme}/${cran}`))),
    ...famillesDeMarque.map((famille) => `identity/${famille}`),
  ].map((chemin) => ({ collection: 'brands' as const, chemin, ...(marque === undefined ? {} : { marque }) })));
}

function utility(themes: readonly ModeDuTheme[], profils: readonly string[]): VariableAttendue[] {
  const chemins = [
    ...themes.flatMap((theme) => [...CRANS.map(String), ...absolues].map((fin) => `neutral/${theme}/${fin}`)),
    ...statuts.flatMap((statut) => profils.flatMap((profil) => themes.flatMap((theme) => CRANS.map((cran) => `${statut}/${profil}/${theme}/${cran}`)))),
    ...themes.flatMap((theme) => NIVEAUX_D_ELEVATION_DU_THEME.map((niveau) => `elevation/${theme}/${niveau}`)),
  ];
  return chemins.map((chemin) => ({ collection: 'utility' as const, chemin }));
}

/** Les modes de `theme` sont des colonnes : ni le thème ni la marque n'entrent dans le chemin. */
function theme(profils: readonly string[]): VariableAttendue[] {
  const dePalette: readonly string[] = [...VARIABLES_DE_PALETTE, ...CRANS.map((cran) => `scale/${cran}`)];
  const palettes: (readonly [string, readonly string[]])[] = [
    ...famillesDeMarque.map((famille) => [famille, dePalette] as const),
    ['neutral', [...dePalette, ...VARIABLES_DU_NEUTRE]],
    ...statuts.flatMap((statut) => profils.map((profil) => [`${statut}/${profil}`, dePalette] as const)),
  ];
  const chemins = [
    ...palettes.flatMap(([prefixe, variables]) => variables.map((variable) => `${prefixe}/${variable}`)),
    ...VARIABLES_GLOBALES,
    ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau) => `elevation/${niveau}`),
  ];
  return chemins.map((chemin) => ({ collection: 'theme' as const, chemin }));
}

/** Les variables attendues de `brands`, `utility` ou `theme`. Les autres collections n'ont pas de liste de noms : voir `ECHELLES_DE_REFERENCE`. */
export function variablesAttendues(collection: 'brands' | 'utility' | 'theme', contexte: ContexteDeLaReference = {}): VariableAttendue[] {
  const themes = contexte.themes ?? MODES;
  const profils = contexte.profils ?? PROFILS;
  if (collection === 'brands') return brands(contexte.marques ?? [undefined], themes);
  return collection === 'utility' ? utility(themes, profils) : theme(profils);
}

/** Ce que les niveaux d'élévation de `utility` visent dans la palette neutre, par thème. La page vise le cran 50 ; la carte, le blanc en Light et le cran 100 en Dark. */
export const CIBLES_DE_L_ELEVATION: Readonly<Record<(typeof NIVEAUX_D_ELEVATION_DU_THEME)[number], Readonly<Record<ModeDuTheme, CibleDeVariable>>>> = {
  page: { light: { cran: 50 }, dark: { cran: 50 } },
  raised: { light: { absolue: 'white' }, dark: { cran: 100 } },
};

/** Une variable de départ : une valeur dans `primitives`, un alias vers `primitives` dans `layout` et `typography`. */
export interface EntreeDEchelle {
  /** Le chemin dans la collection, sans le nom de la collection. */
  readonly chemin: string;
  readonly valeur?: number | string;
  /** Le chemin complet de la cible, collection en tête. */
  readonly alias?: string;
}

/** Le segment d'un chemin qui porte un nombre : le séparateur décimal est la virgule (`0.5` s'écrit `0,5`). */
export const segmentDeNombre = (nombre: number): string => String(nombre).replace('.', ',');

/** Le nombre qu'un segment porte, avec la virgule ou le point, ou `undefined` si le segment n'est pas un nombre. Lit ce que `segmentDeNombre` écrit. */
export function nombreDuSegment(segment: string): number | undefined {
  if (!/^\d+(?:[.,]\d+)?$/.test(segment)) return undefined;
  const resultat = Number(segment.replace(',', '.'));
  return Number.isFinite(resultat) ? resultat : undefined;
}
/** Une mesure nulle se nomme `none`, les autres par leur valeur en px ; la plus grande, `full`, a sa propre entrée. */
const dimension = (px: number): string => `dimension/${px === 0 ? 'none' : px}`;

const DIMENSIONS = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96] as const;
const TAILLES_DE_TEXTE = { '3xs': 10, xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96 } as const;
/** Les interlignes et les approches gardent les noms de taille de l'export. */
const INTERLIGNES = { '3xs': 12, '2xs': 14, xs: 16, sm: 20, base: 22, lg: 24, xl: 28, '2xl': 32, '3xl': 36, '4xl': 40, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96 } as const;
const GRAISSES = [400, 600, 700] as const;
const APPROCHES = { '5xs': -2.5, '4xs': -2, '3xs': -1.5, '2xs': -1, xs: -0.5, sm: -0.25, base: 0, lg: 0.25 } as const;
const nomDe = (echelle: Readonly<Record<string, number>>, valeur: number): string => {
  const trouve = Object.entries(echelle).find(([, v]) => v === valeur);
  if (!trouve) throw new Error(`Aucun nom pour la valeur ${valeur}`);
  return trouve[0];
};

const PRIMITIVES: readonly EntreeDEchelle[] = [
  ...DIMENSIONS.map((px) => ({ chemin: dimension(px), valeur: px })),
  { chemin: 'dimension/full', valeur: 99999 },
  { chemin: 'font-family/base', valeur: 'Open Sans' },
  ...GRAISSES.map((graisse) => ({ chemin: `font-weight/${graisse}`, valeur: graisse })),
  ...Object.entries(TAILLES_DE_TEXTE).map(([taille, px]) => ({ chemin: `font-size/${taille}`, valeur: px })),
  ...Object.entries(INTERLIGNES).map(([taille, px]) => ({ chemin: `line-height/${taille}`, valeur: px })),
  ...Object.entries(APPROCHES).map(([taille, approche]) => ({ chemin: `letter-spacing/${taille}`, valeur: approche })),
];

/** Les crans de `sizing` portent la mesure divisée par 4 (`sizing/2,5` vaut 10 px). */
const SIZING = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96] as const;
const RAYONS = { xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, '4xl': 32 } as const;
const versDimension = (px: number): string => `primitives/${dimension(px)}`;

const LAYOUT: readonly EntreeDEchelle[] = [
  ...SIZING.map((px) => ({ chemin: `sizing/${segmentDeNombre(px / 4)}`, alias: versDimension(px) })),
  ...Object.entries(RAYONS).map(([taille, px]) => ({ chemin: `radius/${taille}`, alias: versDimension(px) })),
  { chemin: 'radius/full', alias: 'primitives/dimension/full' },
  { chemin: 'stroke/outline-weight', alias: versDimension(1) },
  { chemin: 'stroke/ring-weight', alias: versDimension(2) },
];

/** Taille, interligne, graisse et approche de chaque style. `body` ne règle pas l'approche dans l'export : la référence la met à 0. */
const STYLES: Readonly<Record<string, readonly [taille: keyof typeof TAILLES_DE_TEXTE, interligne: number, graisse: number, approche: number]>> = {
  'display/lg': ['8xl', 96, 700, -2.5], 'display/md': ['7xl', 72, 700, -2], 'display/sm': ['6xl', 60, 700, -1.5],
  'headline/lg': ['5xl', 48, 700, -1], 'headline/md': ['4xl', 40, 700, -0.5], 'headline/sm': ['3xl', 36, 700, -0.5],
  'title/lg': ['2xl', 32, 600, -0.25], 'title/md': ['xl', 28, 600, -0.25], 'title/sm': ['lg', 24, 600, 0],
  'body/lg': ['base', 24, 600, 0], 'body/md': ['base', 22, 400, 0], 'body/sm': ['sm', 20, 400, 0],
  'label/lg': ['sm', 16, 600, 0], 'label/md': ['xs', 14, 600, 0.25], 'label/sm': ['3xs', 12, 600, 0.25],
};

const TYPOGRAPHY: readonly EntreeDEchelle[] = Object.entries(STYLES).flatMap(([style, [taille, interligne, graisse, approche]]) => [
  { chemin: `${style}/font-size`, alias: `primitives/font-size/${taille}` },
  { chemin: `${style}/line-height`, alias: `primitives/line-height/${nomDe(INTERLIGNES, interligne)}` },
  { chemin: `${style}/font-weight`, alias: `primitives/font-weight/${graisse}` },
  { chemin: `${style}/letter-spacing`, alias: `primitives/letter-spacing/${nomDe(APPROCHES, approche)}` },
]);

/** Les échelles de départ : 61 valeurs hors couleur de `primitives`, 31 variables de `layout` et 60 de `typography`. */
export const ECHELLES_DE_REFERENCE: Readonly<Record<'primitives' | 'layout' | 'typography', readonly EntreeDEchelle[]>> = {
  primitives: PRIMITIVES,
  layout: LAYOUT,
  typography: TYPOGRAPHY,
};
