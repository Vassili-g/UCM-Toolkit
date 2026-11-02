/**
 * Le thème UCM de base des stress tests de structure (famille F2) : un `CatalogueDeReference` d'un fichier UCM complet et sa
 * carte (`CarteDuTheme`). Il suit le référentiel du kit et ne laisse aucun constat à `controlerLeCatalogue` ni à
 * `controlerLIntegriteUcm`. Les opérateurs de dégradation partent d'une copie de ce thème et lisent la carte pour savoir ce que
 * « juste » veut dire.
 *
 * Six collections : `primitives` (une couleur directe par cran), `brands` (alias vers `primitives`, deux modes de marque),
 * `utility` (le neutre, ses bornes, les élévations et les statuts), `theme` (tous les rôles de chaque palette, un alias par
 * mode Light et Dark), `layout` (l'échelle `sizing`) et `components` (un composant dont chaque couleur vise `theme`). Chaque
 * variable a une valeur dans chaque mode de sa collection. Le mode d'une rampe est un segment du chemin (`primary/light/500`) ;
 * les modes de `brands` sont des modes de marque, donc C60 ne trouve aucun mode dans le chemin de la cible.
 *
 * Le sens d'une palette se lit dans les crans que ses alias visent, jamais dans une teinte : les couleurs des primitives
 * viennent d'un tirage de la graine, sans lien avec le cran.
 */
import {
  CIBLES_ABSOLUES_DU_NEUTRE, NIVEAUX_D_ELEVATION_DU_THEME, SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_NEUTRE, VARIABLES_GLOBALES,
  cibleDeLaVariable,
  type CibleDeVariable, type CouleurAbsolue, type ModeDuTheme, type SensDuTheme, type VariableDuTheme,
} from '../../../src/emplois/dossiers.js';
import { collectionsDeReference, type CatalogueDeReference, type VariableDuCatalogue } from '../../../src/controles/index.js';
import type { EcritureChoisie } from '../../../src/protocoles/nommage.js';
import type { Convention } from '../../../src/referentiel/conventions.js';
import { assembler, decouperSegment, motsAvecCasse } from '../../../src/referentiel/ecriture-des-mots.js';
import { CRANS, REGISTRE_STATUTS } from '../../../src/referentiel/vocabulaire.js';
import { choisir, graineDe, mulberry32 } from '../commun/prng.js';
import {
  MODES_DU_THEME,
  type CarteDuTheme, type CoucheDeRampe, type FamilleDePalette, type JetonDeComposantDeCarte, type PaletteDeCarte, type RoleDeCarte, type VariableDeCarte,
} from './carte.js';

export const GRAINE_PAR_DEFAUT = 7102;

export type PalettesDuProfil = 'minimale' | 'moyenne' | 'large';
export type EcritureDuProfil = 'minuscules-tiret' | 'capitales-tiret' | 'minuscules-souligne';
export type SensDuProfil = 'normal' | 'mixte';
export type RampesDuProfil = 'locales' | 'distantes';

export interface ProfilDeTheme {
  /** `p01` à `p72`. */
  readonly id: string;
  readonly palettes: PalettesDuProfil;
  readonly ecriture: EcritureDuProfil;
  /** Vrai : chaque nom de variable commence par sa collection (`theme/primary/solid/default`). */
  readonly collectionRedite: boolean;
  /** `mixte` : au moins une palette en sens inverse, sur les deux modes. */
  readonly sens: SensDuProfil;
  /** `distantes` : les rampes de `brands` sont marquées `distante` et une library est choisie. */
  readonly rampes: RampesDuProfil;
}

export const CONVENTIONS_DES_ECRITURES: Readonly<Record<EcritureDuProfil, Convention>> = {
  'minuscules-tiret': { casse: 'minuscules', separateur: 'tiret' },
  // Chaque mot prend sa capitale initiale : `Foreground-Main`.
  'capitales-tiret': { casse: 'PascalCase', separateur: 'tiret' },
  'minuscules-souligne': { casse: 'minuscules', separateur: 'tiret-bas' },
};

/**
 * Les 72 profils, dans cet ordre de boucles, de l'extérieur à l'intérieur : écriture, sens, collection redite, rampes, palettes.
 * `p14` est P0 et `p37` est le profil minimal en capitales initiales des combinaisons.
 */
export const PROFILS_DE_THEME: readonly ProfilDeTheme[] = (['minuscules-tiret', 'capitales-tiret', 'minuscules-souligne'] as const).flatMap((ecriture) =>
  (['normal', 'mixte'] as const).flatMap((sens) =>
    ([false, true] as const).flatMap((collectionRedite) =>
      (['locales', 'distantes'] as const).flatMap((rampes) =>
        (['minimale', 'moyenne', 'large'] as const).map((palettes) => ({ ecriture, sens, collectionRedite, rampes, palettes }))))))
  .map((profil, rang): ProfilDeTheme => ({ id: `p${String(rang + 1).padStart(2, '0')}`, ...profil }));

const profilNomme = (id: string): ProfilDeTheme => PROFILS_DE_THEME.find((profil) => profil.id === id)!;

/** Palettes moyennes, minuscules et tirets, collection non redite, rampes locales, `secondary` en sens inverse : le profil des opérateurs simples. */
export const PROFIL_P0: ProfilDeTheme = profilNomme('p14');
/** Palettes minimales en capitales initiales, `primary` en sens inverse : le deuxième profil des combinaisons. */
export const PROFIL_P37: ProfilDeTheme = profilNomme('p37');

/** Un profil large tiré de la graine : le troisième profil des combinaisons. */
export function profilTire(graine: number = GRAINE_PAR_DEFAUT): ProfilDeTheme {
  return choisir(mulberry32(graineDe(graine, 'profil-large')), PROFILS_DE_THEME.filter((profil) => profil.palettes === 'large'));
}

export interface ThemeDeBase {
  readonly profil: ProfilDeTheme;
  readonly graine: number;
  readonly convention: Convention;
  /** L'écriture choisie dans Nomenclature : la convention du profil, pour les groupes et pour les variables. */
  readonly ecriture: EcritureChoisie;
  readonly catalogue: CatalogueDeReference;
  readonly carte: CarteDuTheme;
}

export function conventionDuProfil(profil: ProfilDeTheme): Convention {
  return CONVENTIONS_DES_ECRITURES[profil.ecriture];
}

/** Écrit un identifiant du référentiel selon une convention : `foreground-main` devient `Foreground-Main` en capitales initiales. */
export function ecrireAvec(convention: Convention, texte: string): string {
  return assembler(texte, motsAvecCasse(decouperSegment(texte), convention.casse), convention.separateur);
}

/** Une copie qui ne partage rien avec la base : un opérateur la dégrade sans altérer le thème de base. */
export function copierLeTheme(base: ThemeDeBase): ThemeDeBase {
  return structuredClone(base);
}

interface SpecDePalette {
  readonly id: string;
  readonly segments: readonly string[];
  readonly famille: FamilleDePalette;
  readonly couche: CoucheDeRampe;
}

const STATUTS = REGISTRE_STATUTS.termes.map((terme) => terme.id);
const marque = (id: string): SpecDePalette => ({ id, segments: [id], famille: 'marque', couche: 'brands' });
const NEUTRE: SpecDePalette = { id: 'neutral', segments: ['neutral'], famille: 'neutre', couche: 'utility' };
const statut = (id: string, profil: string | null): SpecDePalette => ({
  id: profil ? `${id}/${profil}` : id, segments: profil ? [id, profil] : [id], famille: 'statut', couche: 'utility',
});

/** Moyenne : 2 marques, le neutre, 4 statuts en `soft` et `vivid`. Large : 3 marques, le neutre, 4 statuts en `soft`, `vivid` et sans profil. */
function palettesDuProfil(palettes: PalettesDuProfil): SpecDePalette[] {
  if (palettes === 'minimale') return [marque('primary'), NEUTRE];
  const profils = palettes === 'moyenne' ? ['soft', 'vivid'] : ['soft', 'vivid', null];
  return [
    ...(palettes === 'moyenne' ? ['primary', 'secondary'] : ['primary', 'secondary', 'tertiary']).map(marque),
    NEUTRE,
    ...STATUTS.flatMap((id) => profils.map((profil) => statut(id, profil))),
  ];
}

/** Les palettes en sens inverse sur les deux modes ; aucune quand le profil est `normal`. */
function palettesInverses(profil: ProfilDeTheme): readonly string[] {
  if (profil.sens === 'normal') return [];
  return profil.palettes === 'minimale' ? ['primary'] : profil.palettes === 'moyenne' ? ['secondary'] : ['secondary', 'danger/vivid'];
}

type Couche = 'primitives' | 'brands' | 'utility' | 'theme' | 'layout' | 'components';

const ROLES_DU_COMPOSANT = [
  ['background', 'solid/default'], ['foreground', 'solid/foreground'], ['border', 'surface/border'], ['ring', 'ring'],
] as const satisfies readonly (readonly [JetonDeComposantDeCarte['role'], VariableDuTheme])[];
const PORTEES_DU_COMPOSANT: Record<JetonDeComposantDeCarte['role'], readonly string[]> = {
  background: ['ALL_FILLS'], foreground: ['ALL_FILLS'], border: ['STROKE_COLOR'], ring: ['STROKE_COLOR'],
};
const PAS_DE_L_ECHELLE = [4, 8, 12, 16, 24, 32] as const;
const ELEVATIONS_CLAIRES: Record<ModeDuTheme, Record<'page' | 'raised', number>> = { light: { page: 50, raised: 100 }, dark: { page: 950, raised: 900 } };

function couleurTiree(graine: number, etiquette: string): { r: number; g: number; b: number; a: number } {
  const tirer = mulberry32(graineDe(graine, etiquette));
  const composante = () => Math.round(tirer() * 1000) / 1000;
  return { r: composante(), g: composante(), b: composante(), a: 1 };
}

/** Fabrique le catalogue et la carte du thème d'un profil. Même profil et même graine, mêmes couleurs. */
export function themeDuProfil(profil: ProfilDeTheme, graine: number = GRAINE_PAR_DEFAUT): ThemeDeBase {
  const convention = conventionDuProfil(profil);
  const memoire = new Map<string, string>();
  const ecrire = (texte: string): string => {
    let ecrit = memoire.get(texte);
    if (ecrit === undefined) { ecrit = ecrireAvec(convention, texte); memoire.set(texte, ecrit); }
    return ecrit;
  };
  const nomDe = (couche: Couche, segments: readonly string[]): string => [...(profil.collectionRedite ? [ecrire(couche)] : []), ...segments.map(ecrire)].join('/');
  const specs = palettesDuProfil(profil.palettes);
  const inverses = palettesInverses(profil);

  const nomsDeCouche: Record<Couche, string> = {
    primitives: ecrire('primitives'), brands: ecrire('brands'), utility: ecrire('utility'), theme: ecrire('theme'), layout: ecrire('layout'), components: ecrire('components'),
  };
  const modesDeTheme = { light: { id: 'm-theme-light', nom: ecrire('light') }, dark: { id: 'm-theme-dark', nom: ecrire('dark') } } as const;
  const collections = collectionsDeReference([
    { cle: 'primitives', nom: nomsDeCouche.primitives, modes: [{ id: 'm-primitives', nom: 'Mode 1' }], etat: 'lue' },
    { cle: 'brands', nom: nomsDeCouche.brands, modes: [{ id: 'm-brands-a', nom: 'Marque A' }, { id: 'm-brands-b', nom: 'Marque B' }], etat: 'lue' },
    { cle: 'utility', nom: nomsDeCouche.utility, modes: [{ id: 'm-utility', nom: 'Mode 1' }], etat: 'lue' },
    { cle: 'theme', nom: nomsDeCouche.theme, modes: [modesDeTheme.light, modesDeTheme.dark], etat: 'lue' },
    { cle: 'layout', nom: nomsDeCouche.layout, modes: [{ id: 'm-layout', nom: 'Mode 1' }], etat: 'lue' },
    { cle: 'components', nom: nomsDeCouche.components, modes: [{ id: 'm-components', nom: 'Mode 1' }], etat: 'lue' },
  ], 'ucm');
  const idsDeMode = (couche: Couche): string[] => collections.find((collection) => collection.cle === couche)!.modes.map((mode) => mode.id);

  const variables: VariableDuCatalogue[] = [];
  const ajouter = (
    couche: Couche, segments: readonly string[], type: VariableDuCatalogue['type'],
    valeur: (idDeMode: string) => { alias: string } | { valeur: unknown },
    options: { scopes?: readonly string[]; distante?: true } = {},
  ): VariableDeCarte => {
    const nom = nomDe(couche, segments);
    const cle = `${couche}|${nom}`;
    variables.push({
      cle, nom, collection: couche, type, etat: 'presente', ...(options.distante ? { distante: true as const } : {}),
      scopes: [...(options.scopes ?? [])], valeurs: Object.fromEntries(idsDeMode(couche).map((id) => [id, valeur(id)])),
    });
    return { cle, nom };
  };
  const alias = (cible: VariableDeCarte) => () => ({ alias: cible.cle });

  // `primitives` : une couleur directe par cran, pour chaque palette et chaque mode ; les deux bornes du neutre.
  const primitives = new Map<string, VariableDeCarte>();
  for (const spec of specs) {
    for (const mode of MODES_DU_THEME) {
      for (const cran of CRANS) {
        const segments = ['color', ...spec.segments, mode, String(cran)];
        primitives.set(segments.join('/'), ajouter('primitives', segments, 'COLOR', () => ({ valeur: couleurTiree(graine, segments.join('/')) })));
      }
    }
  }
  const absolues = { white: { r: 1, g: 1, b: 1, a: 1 }, black: { r: 0, g: 0, b: 0, a: 1 } } as const;
  const primitivesAbsolues = Object.fromEntries((['white', 'black'] as const).map((couleur) =>
    [couleur, ajouter('primitives', ['color', 'neutral', couleur], 'COLOR', () => ({ valeur: absolues[couleur] }))])) as Record<CouleurAbsolue, VariableDeCarte>;
  const primitive = (spec: SpecDePalette, mode: ModeDuTheme, cran: number): VariableDeCarte => primitives.get(['color', ...spec.segments, mode, String(cran)].join('/'))!;

  // `brands` puis `utility` : une rampe par palette et par mode, en alias vers `primitives`.
  const rampes = new Map<string, Record<ModeDuTheme, Record<number, VariableDeCarte>>>();
  for (const spec of specs.filter((entree) => entree.couche === 'brands')) {
    const parMode = { light: {}, dark: {} } as Record<ModeDuTheme, Record<number, VariableDeCarte>>;
    for (const mode of MODES_DU_THEME) {
      for (const cran of CRANS) {
        parMode[mode][cran] = ajouter('brands', [...spec.segments, mode, String(cran)], 'COLOR', alias(primitive(spec, mode, cran)), { distante: profil.rampes === 'distantes' ? true : undefined });
      }
    }
    rampes.set(spec.id, parMode);
  }
  const absoluesDUtility = { light: {}, dark: {} } as Record<ModeDuTheme, Record<CouleurAbsolue, VariableDeCarte>>;
  const elevations = { light: {}, dark: {} } as Record<ModeDuTheme, Record<'page' | 'raised', VariableDeCarte>>;
  for (const spec of specs.filter((entree) => entree.couche === 'utility')) {
    const parMode = { light: {}, dark: {} } as Record<ModeDuTheme, Record<number, VariableDeCarte>>;
    for (const mode of MODES_DU_THEME) {
      for (const cran of CRANS) parMode[mode][cran] = ajouter('utility', [...spec.segments, mode, String(cran)], 'COLOR', alias(primitive(spec, mode, cran)));
      if (spec.famille === 'neutre') {
        for (const couleur of ['white', 'black'] as const) absoluesDUtility[mode][couleur] = ajouter('utility', [...spec.segments, mode, couleur], 'COLOR', alias(primitivesAbsolues[couleur]));
        for (const niveau of NIVEAUX_D_ELEVATION_DU_THEME) {
          elevations[mode][niveau] = ajouter('utility', ['elevation', mode, niveau], 'COLOR', alias(primitive(spec, mode, ELEVATIONS_CLAIRES[mode][niveau])));
        }
      }
    }
    rampes.set(spec.id, parMode);
  }

  // `theme` : chaque rôle vise, dans chaque mode, le cran ou la couleur absolue que la table donne au sens de la palette.
  const rolesDeCarte = (spec: SpecDePalette | null, sens: Record<ModeDuTheme, SensDuTheme>, roles: readonly VariableDuTheme[], prefixe: readonly string[]): Record<string, RoleDeCarte> => {
    const resultat: Record<string, RoleDeCarte> = {};
    for (const role of roles) {
      const cibles = {} as Record<ModeDuTheme, RoleDeCarte['cibles'][ModeDuTheme]>;
      for (const mode of MODES_DU_THEME) {
        if (role.startsWith('elevation/')) {
          cibles[mode] = elevations[mode][role.split('/')[1] as 'page' | 'raised'];
          continue;
        }
        const vise = cibleDeLaVariable(role, mode, sens[mode]) as CibleDeVariable;
        const cible = 'absolue' in vise ? absoluesDUtility[mode][vise.absolue] : rampes.get((spec ?? NEUTRE).id)![mode][vise.cran];
        cibles[mode] = { ...cible, vise };
      }
      const variable = ajouter('theme', [...prefixe, ...role.split('/')], 'COLOR', (id) => ({
        alias: cibles[MODES_DU_THEME.find((mode) => modesDeTheme[mode].id === id)!].cle,
      }), { scopes: SUPPORT_DES_VARIABLES[role].portees });
      resultat[role] = { ...variable, role, scopes: [...SUPPORT_DES_VARIABLES[role].portees], cibles };
    }
    return resultat;
  };
  const palettes: PaletteDeCarte[] = specs.map((spec) => {
    const sensDeLaPalette: SensDuTheme = inverses.includes(spec.id) ? 'inverse' : 'normal';
    const sens = { light: sensDeLaPalette, dark: sensDeLaPalette };
    const roles: readonly VariableDuTheme[] = spec.famille === 'neutre' ? [...VARIABLES_DE_PALETTE, ...VARIABLES_DU_NEUTRE] : VARIABLES_DE_PALETTE;
    return {
      id: spec.id, groupe: spec.segments.map(ecrire), famille: spec.famille, couche: spec.couche, sens, rampes: rampes.get(spec.id)!,
      roles: rolesDeCarte(spec, sens, roles, spec.segments),
    };
  });
  const globales = rolesDeCarte(null, { light: 'normal', dark: 'normal' }, [
    ...VARIABLES_GLOBALES, ...NIVEAUX_D_ELEVATION_DU_THEME.map((niveau): VariableDuTheme => `elevation/${niveau}`),
  ], []);

  // `layout` : une échelle croissante.
  const echelle = PAS_DE_L_ECHELLE.map((valeur, rang) => ({ ...ajouter('layout', ['sizing', String(rang + 1)], 'FLOAT', () => ({ valeur })), valeur }));

  // `components` : un composant dont chaque couleur est un alias vers `theme`.
  const jeu = 'button';
  const jetons: JetonDeComposantDeCarte[] = [];
  for (const palette of palettes.filter((entree) => entree.famille !== 'statut')) {
    for (const [role, cibleDuTheme] of ROLES_DU_COMPOSANT) {
      const cible = palette.roles[cibleDuTheme];
      const variable = ajouter('components', [jeu, 'color', ...palette.id.split('/'), role], 'COLOR', alias(cible), { scopes: PORTEES_DU_COMPOSANT[role] });
      jetons.push({ ...variable, role, palette: palette.id, cible: { cle: cible.cle, nom: cible.nom } });
    }
  }

  const carte: CarteDuTheme = {
    collections: Object.fromEntries((Object.keys(nomsDeCouche) as Couche[]).map((couche) => [couche, { cle: couche, nom: nomsDeCouche[couche] }])) as CarteDuTheme['collections'],
    modes: modesDeTheme, palettes, globales, absolues: absoluesDUtility, composant: { jeu: ecrire(jeu), jetons }, echelle,
  };
  const catalogue: CatalogueDeReference = {
    version: 1,
    library: profil.rampes === 'distantes' ? { nom: 'Bibliothèque des marques', cle: 'lib-marques' } : null,
    collections, variables,
  };
  return { profil, graine, convention, ecriture: { groupes: convention, variables: convention }, catalogue, carte };
}
