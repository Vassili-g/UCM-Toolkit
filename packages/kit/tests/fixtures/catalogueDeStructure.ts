/**
 * Un catalogue fabriqué à la main d'un fichier UCM : `theme`, `brands`, `utility` et `primitives`, toutes variables locales.
 * Il reprend les écarts relevés dans un fichier réel : `surface/subtle` et `surface/divider` manquent à chaque palette,
 * `neutral` n'a pas `page/foreground`, et quelques crans visés s'écartent de la table.
 */
import {
  CIBLES_ABSOLUES_DU_NEUTRE, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, cranDeLaVariable,
  type ModeDuTheme, type VariableDuTheme,
} from '../../src/emplois/index.js';
import { collectionsDeReference, type CatalogueDeReference, type VariableDuCatalogue } from '../../src/controles/index.js';
import type { Casse, Separateur } from '../../src/referentiel/conventions.js';
import type { EcritureChoisie } from '../../src/protocoles/nommage.js';

export const MODE_LIGHT = 'm-light';
export const MODE_DARK = 'm-dark';
export const CRANS_DE_LA_FIXTURE = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export const STATUTS = ['success', 'warning', 'danger', 'info'] as const;
export const PROFILS = ['soft', 'vivid'] as const;
const MODES: readonly ModeDuTheme[] = ['light', 'dark'];
const ID_DU_MODE: Record<ModeDuTheme, string> = { light: MODE_LIGHT, dark: MODE_DARK };

export const cleDeLaFixture = (collection: string, nom: string): string => `${collection}|${nom}`;

type Valeurs = Record<string, { alias: string }>;

function variable(collection: string, nom: string, valeurs?: Valeurs): VariableDuCatalogue {
  return { cle: cleDeLaFixture(collection, nom), nom, collection, type: 'COLOR', etat: 'presente', ...(valeurs ? { valeurs } : {}) };
}

/** Une palette de `theme` : son préfixe, et la rampe de `brands` ou de `utility` qu'elle vise dans chaque mode. */
export interface PaletteDeFixture {
  readonly prefixe: string;
  readonly collection: 'brands' | 'utility';
  readonly rampe: (mode: ModeDuTheme) => string;
  readonly neutre?: true;
}

export const PALETTES: readonly PaletteDeFixture[] = [
  { prefixe: 'primary', collection: 'brands', rampe: (mode) => `primary/${mode}` },
  { prefixe: 'secondary', collection: 'brands', rampe: (mode) => `secondary/${mode}` },
  { prefixe: 'neutral', collection: 'utility', rampe: (mode) => `neutral/${mode}`, neutre: true },
  ...STATUTS.flatMap((statut) => PROFILS.map((profil): PaletteDeFixture => ({
    prefixe: `${statut}/${profil}`, collection: 'utility', rampe: (mode) => `${statut}/${profil}/${mode}`,
  }))),
];

/** Le cran que la fixture vise : la table `normal` en Light, `inverse` en Dark, avec les écarts du fichier relevé. */
function cranVise(prefixe: string, role: VariableDuTheme, mode: ModeDuTheme): number {
  if (mode === 'dark') {
    if (role === 'surface/default') return 300;
    if (role === 'surface/hover') return 400;
    if (role === 'surface/pressed') return 500;
    if (prefixe === 'primary' && role === 'ring') return 700;
  }
  if (prefixe === 'primary' && mode === 'light' && role === 'surface/foreground') return 800;
  return cranDeLaVariable(role, mode, mode === 'light' ? 'normal' : 'inverse') as number;
}

function rampeDeBrands(marque: string): VariableDuCatalogue[] {
  return MODES.flatMap((mode) => CRANS_DE_LA_FIXTURE.map((cran) => variable('brands', `${marque}/${mode}/${cran}`)));
}

function rampeDeStatut(statut: string, profil: string): VariableDuCatalogue[] {
  return MODES.flatMap((mode) => CRANS_DE_LA_FIXTURE.map((cran) => variable('utility', `${statut}/${profil}/${mode}/${cran}`)));
}

/** Les variables d'une palette de `theme`, avec un alias par mode vers la cible de la fixture. */
export function variablesDeLaPalette(palette: PaletteDeFixture): VariableDuCatalogue[] {
  const roles: VariableDuTheme[] = VARIABLES_DE_PALETTE.filter((role) => role !== 'surface/subtle' && role !== 'surface/divider'
    && !(palette.neutre && role === 'page/foreground'));
  if (palette.neutre) roles.push(...VARIABLES_DU_NEUTRE);
  return roles.map((role) => {
    const valeurs: Valeurs = {};
    for (const mode of MODES) {
      const absolue = role === 'solid/foreground' ? 'white'
        : role in CIBLES_ABSOLUES_DU_NEUTRE ? CIBLES_ABSOLUES_DU_NEUTRE[role as keyof typeof CIBLES_ABSOLUES_DU_NEUTRE][mode] : undefined;
      const cible = absolue
        ? cleDeLaFixture('utility', `neutral/${mode}/${absolue}`)
        : cleDeLaFixture(palette.collection, `${palette.rampe(mode)}/${role === 'page/foreground-subtle' ? cranVise(palette.prefixe, 'page/foreground', mode) : cranVise(palette.prefixe, role, mode)}`);
      valeurs[ID_DU_MODE[mode]] = { alias: cible };
    }
    return variable('theme', `${palette.prefixe}/${role}`, valeurs);
  });
}

function variablesGlobales(): VariableDuCatalogue[] {
  const crans = { 'disabled/background': (mode: ModeDuTheme) => (mode === 'light' ? 100 : 200), 'disabled/foreground': () => 500, 'disabled/border': () => 500 };
  const disabled = (Object.keys(crans) as (keyof typeof crans)[]).map((role) => variable('theme', role, Object.fromEntries(
    MODES.map((mode) => [ID_DU_MODE[mode], { alias: cleDeLaFixture('utility', `neutral/${mode}/${crans[role](mode)}`) }]),
  )));
  const elevation = ['page', 'raised'].map((niveau) => variable('theme', `elevation/${niveau}`, Object.fromEntries(
    MODES.map((mode) => [ID_DU_MODE[mode], { alias: cleDeLaFixture('utility', `elevation/${mode}/${niveau}`) }]),
  )));
  return [...disabled, ...elevation];
}

export function catalogueDeStructure(): CatalogueDeReference {
  const collections = collectionsDeReference([
    { cle: 'theme', nom: 'theme', modes: [{ id: MODE_LIGHT, nom: 'light' }, { id: MODE_DARK, nom: 'dark' }], etat: 'lue' },
    { cle: 'brands', nom: 'brands', modes: [{ id: 'm-marque-a', nom: 'Marque A' }, { id: 'm-marque-b', nom: 'Marque B' }], etat: 'lue' },
    { cle: 'utility', nom: 'utility', modes: [{ id: 'm-utility', nom: 'Mode 1' }], etat: 'lue' },
    { cle: 'primitives', nom: 'primitives', modes: [{ id: 'm-primitives', nom: 'Mode 1' }], etat: 'lue' },
  ], 'ucm');
  const utility: VariableDuCatalogue[] = [
    ...MODES.flatMap((mode) => [
      ...CRANS_DE_LA_FIXTURE.map((cran) => variable('utility', `neutral/${mode}/${cran}`)),
      variable('utility', `neutral/${mode}/white`), variable('utility', `neutral/${mode}/black`),
      variable('utility', `elevation/${mode}/page`), variable('utility', `elevation/${mode}/raised`),
    ]),
    ...STATUTS.flatMap((statut) => PROFILS.flatMap((profil) => rampeDeStatut(statut, profil))),
  ];
  const variables = [
    ...rampeDeBrands('primary'), ...rampeDeBrands('secondary'),
    ...utility,
    ...PALETTES.flatMap(variablesDeLaPalette),
    ...variablesGlobales(),
  ];
  return { version: 1, library: null, collections, variables };
}

/** Ajoute une marque de `brands` et son groupe de `theme`, sur le modèle de `primary`. */
export function avecUneMarque(catalogue: CatalogueDeReference, marque: string): CatalogueDeReference {
  const palette: PaletteDeFixture = { prefixe: marque, collection: 'brands', rampe: (mode) => `${marque}/${mode}` };
  return { ...catalogue, variables: [...catalogue.variables, ...rampeDeBrands(marque), ...variablesDeLaPalette(palette)] };
}

/** Une `EcritureChoisie` dont les groupes et les variables portent cette convention. */
export function avecEcriture(casse: Casse, separateur: Separateur): EcritureChoisie {
  return { groupes: { casse, separateur }, variables: { casse, separateur } };
}

/** Les mêmes variables sous un autre nom ; les clés ne changent pas, donc les alias tiennent. */
export function renommer(catalogue: CatalogueDeReference, regle: (variable: VariableDuCatalogue) => string): CatalogueDeReference {
  return { ...catalogue, variables: catalogue.variables.map((entree) => ({ ...entree, nom: regle(entree) })) };
}
