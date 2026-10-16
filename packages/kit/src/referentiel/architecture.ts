/** Les collections UCM et les formes de leurs chemins, hors propriétés propres aux composants. */
import { NIVEAUX_D_ELEVATION_DU_THEME, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES } from '../emplois/dossiers.js';
import type { Registre } from './termes.js';
import { termeRetenu } from './termes.js';
import { REGISTRE_CRANS, REGISTRE_MODES, REGISTRE_PROFILS, REGISTRE_STATUTS, REGISTRE_TAILLES } from './vocabulaire.js';

export const COLLECTIONS = ['components', 'theme', 'color-brands', 'color-utilities', 'primitives', 'layouts', 'typography'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export const CIBLES_DES_COLLECTIONS: Readonly<Record<Collection, readonly Collection[]>> = {
  components: ['theme', 'layouts', 'typography'],
  theme: ['color-brands', 'color-utilities'],
  'color-brands': ['primitives'],
  'color-utilities': ['primitives'],
  primitives: [],
  layouts: ['primitives'],
  typography: ['primitives'],
};

export const CIBLES_DES_COULEURS_DE_COMPOSANT = ['theme'] as const;
export const COLLECTIONS_SANS_PORTEE = ['primitives', 'color-brands', 'color-utilities'] as const;
export const DESTINATION_DES_PALETTES = { collection: 'primitives', groupe: 'colors', themes: 'chemin' } as const;

function registre(id: string, extensible: boolean, termes: readonly string[]): Registre {
  return {
    id, extensible,
    termes: termes.map((terme) => ({
      id: terme,
      libelle: { fr: terme, en: terme },
      definition: { fr: `Segment ${terme} du registre ${id}.`, en: `${terme} segment in the ${id} registry.` },
    })),
  };
}

export const FAMILLES_COLOR_BRANDS = registre('familles-color-brands', true, ['identity', 'primary', 'secondary']);
export const FAMILLES_COLOR_UTILITIES = registre('familles-color-utilities', true, [...REGISTRE_STATUTS.termes.map((terme) => terme.id), 'neutral', 'elevation']);
export const FAMILLES_PRIMITIVES = registre('familles-primitives', true, ['colors', 'dimensions', 'fontfamily', 'fontweight', 'fontsize', 'lineheight', 'letterspacing']);
export const FAMILLES_LAYOUTS = registre('familles-layouts', true, ['sizing', 'radius', 'stroke']);
export const FAMILLES_TYPOGRAPHY = registre('familles-typography', true, ['display', 'headline', 'title', 'body', 'label']);
export const REGISTRE_PALETTES = registre('palettes', true, []);
export const REGISTRE_MARQUES = registre('marques', true, []);
export const REGISTRE_VALEURS_DIMENSIONNELLES = registre('valeurs-dimensionnelles', true, ['none', 'full']);
export const REGISTRE_VALEURS_TYPOGRAPHIQUES = registre('valeurs-typographiques', true, ['base']);
export const REGISTRE_PROPRIETES_TYPOGRAPHIQUES = registre('proprietes-typographiques', false, ['fontfamily', 'fontweight', 'fontsize', 'lineheight', 'letterspacing']);
export const REGISTRE_COULEURS_ABSOLUES = registre('couleurs-absolues', false, ['white', 'black']);
export const REGISTRE_ELEVATIONS = registre('elevations', false, NIVEAUX_D_ELEVATION_DU_THEME);
export const REGISTRE_DOSSIERS_THEME = registre('dossiers-theme', false, ['solid', 'surface', 'page', 'ring', 'scale', 'disabled', 'elevation']);
export const REGISTRE_VALEURS_THEME = registre('valeurs-theme', false, [
  ...new Set([...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE, ...VARIABLES_GLOBALES].flatMap((variable) => variable.split('/').slice(1))),
]);
export const REGISTRES_ARCHITECTURE: readonly Registre[] = [
  FAMILLES_COLOR_BRANDS, FAMILLES_COLOR_UTILITIES, FAMILLES_PRIMITIVES, FAMILLES_LAYOUTS, FAMILLES_TYPOGRAPHY,
  REGISTRE_PALETTES, REGISTRE_MARQUES, REGISTRE_VALEURS_DIMENSIONNELLES, REGISTRE_VALEURS_TYPOGRAPHIQUES,
  REGISTRE_PROPRIETES_TYPOGRAPHIQUES, REGISTRE_COULEURS_ABSOLUES, REGISTRE_ELEVATIONS,
  REGISTRE_DOSSIERS_THEME, REGISTRE_VALEURS_THEME,
];

export const AXES_DES_COLLECTIONS = {
  marque: { collection: 'color-brands', attribut: 'data-color-brands', registre: REGISTRE_MARQUES },
  theme: { collection: 'theme', attribut: 'data-theme', registre: REGISTRE_MODES },
} as const;

export type PositionDeChemin = {
  readonly registre: Registre;
  readonly valeurs?: readonly string[];
  readonly exclues?: readonly string[];
};
export type FormeDeChemin = readonly PositionDeChemin[];

function position(registre: Registre, valeurs?: readonly string[], exclues?: readonly string[]): PositionDeChemin {
  return { registre, ...(valeurs ? { valeurs } : {}), ...(exclues ? { exclues } : {}) };
}

const statut = position(REGISTRE_STATUTS, undefined, ['neutral', 'elevation', 'identity', 'disabled']);
const paletteDeMarque = position(FAMILLES_COLOR_BRANDS, undefined, ['identity', 'neutral', 'elevation', 'disabled', ...REGISTRE_STATUTS.termes.map((terme) => terme.id)]);
const profil = position(REGISTRE_PROFILS);
const mode = position(REGISTRE_MODES);
const cran = position(REGISTRE_CRANS);
const palette = position(REGISTRE_PALETTES);
const colors = position(FAMILLES_PRIMITIVES, ['colors']);
const neutre = position(FAMILLES_COLOR_UTILITIES, ['neutral']);
const elevation = position(FAMILLES_COLOR_UTILITIES, ['elevation']);

function finsDuTheme(): FormeDeChemin[] {
  return [
    ...VARIABLES_DE_PALETTE.map((variable) => variable.split('/').map((segment, rang) => position(rang === 0 ? REGISTRE_DOSSIERS_THEME : REGISTRE_VALEURS_THEME, [segment]))),
    [position(REGISTRE_DOSSIERS_THEME, ['scale']), cran],
  ];
}

const palettesDuTheme: FormeDeChemin[] = [[paletteDeMarque], [neutre], [statut, profil]];

/** Chaque forme porte un nombre exact de positions ; seules les positions extensibles admettent un segment supplémentaire au vocabulaire. */
export const FORMES_DES_CHEMINS: Readonly<Record<Exclude<Collection, 'components'>, readonly FormeDeChemin[]>> = {
  'color-brands': [
    [position(FAMILLES_COLOR_BRANDS, ['identity']), paletteDeMarque],
    [paletteDeMarque, mode, cran],
  ],
  'color-utilities': [
    [neutre, mode, cran],
    [neutre, mode, position(REGISTRE_COULEURS_ABSOLUES)],
    [elevation, mode, position(REGISTRE_ELEVATIONS)],
    [statut, profil, mode, cran],
  ],
  primitives: [
    [colors, palette, mode, cran],
    [colors, palette, profil, mode, cran],
    [colors, palette, position(REGISTRE_COULEURS_ABSOLUES)],
    [position(FAMILLES_PRIMITIVES, ['dimensions']), position(REGISTRE_VALEURS_DIMENSIONNELLES)],
    [position(FAMILLES_PRIMITIVES, ['fontfamily', 'fontweight', 'fontsize', 'lineheight', 'letterspacing']), position(REGISTRE_VALEURS_TYPOGRAPHIQUES)],
  ],
  layouts: [[position(FAMILLES_LAYOUTS), position(REGISTRE_VALEURS_DIMENSIONNELLES)]],
  typography: [[position(FAMILLES_TYPOGRAPHY), position(REGISTRE_TAILLES), position(REGISTRE_PROPRIETES_TYPOGRAPHIQUES)]],
  theme: [
    ...palettesDuTheme.flatMap((prefixe) => finsDuTheme().map((fin) => [...prefixe, ...fin])),
    ...VARIABLES_DU_NEUTRE.map((variable) => [neutre, ...variable.split('/').map((segment, rang) => position(rang === 0 ? REGISTRE_DOSSIERS_THEME : REGISTRE_VALEURS_THEME, [segment]))]),
    ...VARIABLES_GLOBALES.map((variable) => variable.split('/').map((segment, rang) => position(rang === 0 ? REGISTRE_DOSSIERS_THEME : REGISTRE_VALEURS_THEME, [segment]))),
    [elevation, position(REGISTRE_ELEVATIONS)],
  ],
};

/** Valide des segments sans préfixe de collection. Les propriétés de `components` dépendent du composant. */
export function cheminConforme(collection: Collection, segments: readonly string[]): boolean {
  if (collection === 'components') return false;
  return FORMES_DES_CHEMINS[collection].some((forme) => forme.length === segments.length && forme.every((position, rang) => {
    const segment = segments[rang];
    if (!segment || segment.trim() !== segment || /[/.]/.test(segment) || position.exclues?.includes(segment)) return false;
    if (position.valeurs) return position.valeurs.includes(segment);
    return Boolean(termeRetenu(position.registre, segment)) || position.registre.extensible;
  }));
}

export function estNeutre(nom: string): boolean {
  return nom.trim().toLowerCase() === 'neutral';
}
