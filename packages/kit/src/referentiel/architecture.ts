/**
 * Les collections UCM et les formes de leurs chemins, hors propriétés propres aux composants.
 *
 * Après une modification : relancer `npm test`, régénérer la vue illustrée (`generer-donnees-referentiel.ts`) (elle en tire les collections et leurs cibles), et changer la version du kit.
 */
import { NIVEAUX_D_ELEVATION_DU_THEME, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES } from '../emplois/dossiers.js';
import type { Registre } from './termes.js';
import { NUMEROS_DE_PALETTE, PROFILS, REGISTRE_CRANS, REGISTRE_MODES, REGISTRE_PROFILS, REGISTRE_STATUTS, REGISTRE_TAILLES } from './vocabulaire.js';

export const COLLECTIONS = ['components', 'theme', 'brands', 'utility', 'primitives', 'layout', 'typography'] as const;
export type Collection = (typeof COLLECTIONS)[number];
/** Les couches réservées aux alias, où Palettes n'écrit pas quand le fichier suit l'architecture UCM. */
export const COUCHES_SANS_PALETTES = ['theme', 'brands', 'utility'] as const satisfies readonly Collection[];

export const CIBLES_DES_COLLECTIONS: Readonly<Record<Collection, readonly Collection[]>> = {
  components: ['theme', 'layout', 'typography'],
  theme: ['brands', 'utility'],
  brands: ['primitives'],
  utility: ['primitives'],
  primitives: [],
  layout: ['primitives'],
  typography: ['primitives'],
};

export const CIBLES_DES_COULEURS_DE_COMPOSANT = ['theme'] as const;
export type NatureDeCible = 'couleur' | 'dimension' | 'typographie';

/** Les couleurs des composants visent le thème ; les autres natures suivent les cibles de leur collection. */
export function ciblesAdmises(collection: Collection, nature: NatureDeCible): readonly Collection[] {
  return collection === 'components' && nature === 'couleur' ? CIBLES_DES_COULEURS_DE_COMPOSANT : CIBLES_DES_COLLECTIONS[collection];
}

export const COLLECTIONS_SANS_PORTEE = ['primitives', 'brands', 'utility'] as const;
/** Les noms d'avant le renommage de la décision D8, que le kit lit encore comme les collections courantes. */
export const FORMES_ANCIENNES_DES_COLLECTIONS: Readonly<Record<string, Collection>> = {
  'color-brands': 'brands',
  'color-utilities': 'utility',
  layouts: 'layout',
};

export const DESTINATION_DES_PALETTES = { collection: 'primitives', groupe: 'color', themes: 'chemin' } as const;

export const PLACES_DES_THEMES = ['chemin', 'modes'] as const;
/** Les thèmes Light et Dark : un segment du chemin, ou des modes de la collection. */
export type PlaceDesThemes = (typeof PLACES_DES_THEMES)[number];
/** Ce que la grammaire d'un chemin doit connaître de la collection : la place de ses thèmes. */
export interface ContexteDuChemin { readonly themes: PlaceDesThemes }

/** Un terme s'écrit seul, ou avec ses formes tolérées que le renommage ramène vers lui. */
type TermeDeRegistre = string | readonly [string, readonly string[]];

function registre(id: string, extensible: boolean, termes: readonly TermeDeRegistre[]): Registre {
  return {
    id, extensible,
    termes: termes.map((entree) => typeof entree === 'string' ? [entree, []] as const : entree).map(([terme, toleres]) => ({
      id: terme,
      ...(toleres.length ? { toleres } : {}),
      libelle: { fr: terme, en: terme },
      definition: { fr: `Segment ${terme} du registre ${id}.`, en: `${terme} segment in the ${id} registry.` },
    })),
  };
}

export const FAMILLES_BRANDS = registre('familles-brands', true, ['identity', 'primary', 'secondary']);
export const FAMILLES_UTILITY = registre('familles-utility', true, [...REGISTRE_STATUTS.termes.map((terme) => terme.id), 'neutral', 'elevation']);
/** Décisions T04, T05 et T13 de la nomenclature : singulier, propriétés de texte écrites avec un tiret. */
const PROPRIETES_DE_TEXTE: readonly TermeDeRegistre[] = [
  ['font-family', ['fontfamily']], ['font-weight', ['fontweight']], ['font-size', ['fontsize']],
  ['line-height', ['lineheight']], ['letter-spacing', ['letterspacing']],
];
export const FAMILLES_PRIMITIVES = registre('familles-primitives', true, [['color', ['colors', 'colour']], ['dimension', ['dimensions']], ...PROPRIETES_DE_TEXTE]);
export const FAMILLES_LAYOUT = registre('familles-layout', true, ['sizing', 'radius', 'stroke']);
export const FAMILLES_TYPOGRAPHY = registre('familles-typography', true, ['display', 'headline', 'title', 'body', 'label']);
export const REGISTRE_PALETTES = registre('palettes', true, []);
export const REGISTRE_MARQUES = registre('marques', true, []);
export const REGISTRE_VALEURS_DIMENSIONNELLES = registre('valeurs-dimensionnelles', true, ['none', 'full']);
export const REGISTRE_VALEURS_TYPOGRAPHIQUES = registre('valeurs-typographiques', true, ['base']);
export const REGISTRE_PROPRIETES_TYPOGRAPHIQUES = registre('proprietes-typographiques', false, PROPRIETES_DE_TEXTE);
export const REGISTRE_COULEURS_ABSOLUES = registre('couleurs-absolues', false, ['white', 'black']);
export const REGISTRE_ELEVATIONS = registre('elevations', false, NIVEAUX_D_ELEVATION_DU_THEME);
export const REGISTRE_DOSSIERS_THEME = registre('dossiers-theme', false, ['solid', 'surface', 'page', 'ring', 'scale', 'disabled', 'elevation']);
export const REGISTRE_VALEURS_THEME = registre('valeurs-theme', false, [
  ...new Set([...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE, ...VARIABLES_GLOBALES].flatMap((variable) => variable.split('/').slice(1))),
]);
export const REGISTRES_ARCHITECTURE: readonly Registre[] = [
  FAMILLES_BRANDS, FAMILLES_UTILITY, FAMILLES_PRIMITIVES, FAMILLES_LAYOUT, FAMILLES_TYPOGRAPHY,
  REGISTRE_PALETTES, REGISTRE_MARQUES, REGISTRE_VALEURS_DIMENSIONNELLES, REGISTRE_VALEURS_TYPOGRAPHIQUES,
  REGISTRE_PROPRIETES_TYPOGRAPHIQUES, REGISTRE_COULEURS_ABSOLUES, REGISTRE_ELEVATIONS,
  REGISTRE_DOSSIERS_THEME, REGISTRE_VALEURS_THEME,
];

export const AXES_DES_COLLECTIONS = {
  marque: { collection: 'brands', attribut: 'data-brands', registre: REGISTRE_MARQUES },
  theme: { collection: 'theme', attribut: 'data-theme', registre: REGISTRE_MODES },
} as const;

/** Ce qu'un segment est dans le chemin d'une variable. */
export type RoleDeSegment =
  | 'famille' | 'palette' | 'intensite' | 'theme' | 'cran' | 'couleur-absolue'
  | 'niveau' | 'dossier' | 'valeur' | 'taille' | 'propriete';

export type PositionDeChemin = {
  readonly registre: Registre;
  readonly role: RoleDeSegment;
  readonly valeurs?: readonly string[];
  readonly exclues?: readonly string[];
};
export type IdentifiantDeForme = `${Exclude<Collection, 'components'>}:${string}`;
export type FormeDeChemin = {
  /** Le nom de la collection, puis chaque position : sa valeur quand elle n'en admet qu'une, sinon son rôle. */
  readonly id: IdentifiantDeForme;
  readonly positions: readonly PositionDeChemin[];
  /** Absent : la forme vaut quelle que soit la place des thèmes. */
  readonly themes?: PlaceDesThemes;
};

function position(registre: Registre, role: RoleDeSegment, valeurs?: readonly string[], exclues?: readonly string[]): PositionDeChemin {
  return { registre, role, ...(valeurs ? { valeurs } : {}), ...(exclues ? { exclues } : {}) };
}

function forme(collection: Exclude<Collection, 'components'>, positions: readonly PositionDeChemin[], themes?: PlaceDesThemes): FormeDeChemin {
  const id = `${collection}:${positions.map((place) => (place.valeurs?.length === 1 ? place.valeurs[0] : place.role)).join('/')}` as IdentifiantDeForme;
  return { id, positions, ...(themes ? { themes } : {}) };
}

const statut = position(REGISTRE_STATUTS, 'palette', undefined, ['neutral', 'elevation', 'identity', 'disabled']);
const paletteDeMarque = position(FAMILLES_BRANDS, 'palette', undefined, ['identity', 'neutral', 'elevation', 'disabled', ...REGISTRE_STATUTS.termes.map((terme) => terme.id)]);
const profil = position(REGISTRE_PROFILS, 'intensite');
/** Un profil n'est jamais un thème, même si le registre des modes admet d'autres noms. */
const theme = position(REGISTRE_MODES, 'theme', undefined, PROFILS);
const cran = position(REGISTRE_CRANS, 'cran');
const numeroDePalette = position(REGISTRE_CRANS, 'cran', NUMEROS_DE_PALETTE.map(String));
const palette = position(REGISTRE_PALETTES, 'palette');
const couleurAbsolue = position(REGISTRE_COULEURS_ABSOLUES, 'couleur-absolue');
const colors = position(FAMILLES_PRIMITIVES, 'famille', ['color']);
const neutre = position(FAMILLES_UTILITY, 'palette', ['neutral']);
const elevation = position(FAMILLES_UTILITY, 'famille', ['elevation']);

const positionsDeLaVariable = (variable: string) => variable.split('/').map((segment, rang) => (
  rang === 0 ? position(REGISTRE_DOSSIERS_THEME, 'dossier', [segment]) : position(REGISTRE_VALEURS_THEME, 'valeur', [segment])
));

function finsDuTheme(): (readonly PositionDeChemin[])[] {
  return [
    ...VARIABLES_DE_PALETTE.map(positionsDeLaVariable),
    [position(REGISTRE_DOSSIERS_THEME, 'dossier', ['scale']), cran],
  ];
}

const palettesDuTheme: (readonly PositionDeChemin[])[] = [[paletteDeMarque], [neutre], [statut, profil]];

/**
 * Chaque forme porte un nombre exact de positions ; seules les positions extensibles admettent un segment supplémentaire au vocabulaire.
 * L'ordre compte : la reconnaissance garde la première forme qui convient.
 */
export const FORMES_DES_CHEMINS: Readonly<Record<Exclude<Collection, 'components'>, readonly FormeDeChemin[]>> = {
  brands: [
    forme('brands', [position(FAMILLES_BRANDS, 'famille', ['identity']), paletteDeMarque]),
    forme('brands', [paletteDeMarque, theme, cran]),
  ],
  utility: [
    forme('utility', [neutre, theme, cran]),
    forme('utility', [neutre, theme, couleurAbsolue]),
    forme('utility', [elevation, theme, position(REGISTRE_ELEVATIONS, 'niveau')]),
    forme('utility', [statut, profil, theme, cran]),
  ],
  primitives: [
    forme('primitives', [colors, palette, theme, numeroDePalette], 'chemin'),
    forme('primitives', [colors, palette, profil, theme, numeroDePalette], 'chemin'),
    forme('primitives', [colors, palette, numeroDePalette], 'modes'),
    forme('primitives', [colors, palette, profil, numeroDePalette], 'modes'),
    forme('primitives', [colors, palette, couleurAbsolue]),
    forme('primitives', [position(FAMILLES_PRIMITIVES, 'famille', ['dimension']), position(REGISTRE_VALEURS_DIMENSIONNELLES, 'valeur')]),
    forme('primitives', [position(FAMILLES_PRIMITIVES, 'famille', ['font-family', 'font-weight', 'font-size', 'line-height', 'letter-spacing']), position(REGISTRE_VALEURS_TYPOGRAPHIQUES, 'valeur')]),
  ],
  layout: [forme('layout', [position(FAMILLES_LAYOUT, 'famille'), position(REGISTRE_VALEURS_DIMENSIONNELLES, 'valeur')])],
  typography: [forme('typography', [position(FAMILLES_TYPOGRAPHY, 'famille'), position(REGISTRE_TAILLES, 'taille'), position(REGISTRE_PROPRIETES_TYPOGRAPHIQUES, 'propriete')])],
  theme: [
    ...palettesDuTheme.flatMap((prefixe) => finsDuTheme().map((fin) => forme('theme', [...prefixe, ...fin]))),
    ...VARIABLES_DU_NEUTRE.map((variable) => forme('theme', [neutre, ...positionsDeLaVariable(variable)])),
    ...VARIABLES_GLOBALES.map((variable) => forme('theme', positionsDeLaVariable(variable))),
    forme('theme', [elevation, position(REGISTRE_ELEVATIONS, 'niveau')]),
  ],
};

export function estNeutre(nom: string): boolean {
  return nom.trim().toLowerCase() === 'neutral';
}
