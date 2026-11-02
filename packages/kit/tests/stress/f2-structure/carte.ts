/**
 * La carte d'un thème UCM de base : pour chaque palette, son sens par mode, la clé de chaque variable de `theme` par rôle, et la
 * variable que chaque rôle vise dans chaque mode. Les opérateurs de dégradation et l'oracle lisent cette carte, jamais le
 * catalogue qu'ils dégradent, pour savoir ce qu'un thème juste vise. Le générateur la remplit en même temps que le catalogue,
 * d'où `verifierLaCarte`. Tout y est donnée simple (objets et tableaux) : `structuredClone` la copie.
 */
import {
  SUPPORT_DES_VARIABLES, cibleDeLaVariable,
  type CibleDeVariable, type CouleurAbsolue, type ModeDuTheme, type SensDuTheme, type VariableDuTheme,
} from '../../../src/emplois/dossiers.js';
import type { CatalogueDeReference } from '../../../src/controles/index.js';

export const MODES_DU_THEME: readonly ModeDuTheme[] = ['light', 'dark'];

export type FamilleDePalette = 'marque' | 'neutre' | 'statut';

/** La couche où se trouve la rampe qu'une palette de `theme` vise. */
export type CoucheDeRampe = 'brands' | 'utility';

/** Une variable du catalogue, par sa clé et son nom tel que le fichier l'écrit. */
export interface VariableDeCarte {
  readonly cle: string;
  readonly nom: string;
}

/** Ce qu'un rôle vise dans un mode : la variable cible, et le cran ou la couleur absolue que la table donne à ce sens. */
export interface CibleDeCarte extends VariableDeCarte {
  /** Absent pour `elevation/*`, qui vise un fond de `utility` sans cran ni couleur absolue. */
  readonly vise?: CibleDeVariable;
}

/** Une variable de `theme`, avec ce qu'elle vise dans chaque mode. */
export interface RoleDeCarte extends VariableDeCarte {
  readonly role: VariableDuTheme;
  readonly scopes: readonly string[];
  readonly cibles: Readonly<Record<ModeDuTheme, CibleDeCarte>>;
}

export interface PaletteDeCarte {
  /** La forme canonique du groupe, en minuscules et avec `/` : `primary`, `success/soft`, `neutral`. */
  readonly id: string;
  /** Les segments du groupe tels que le fichier les écrit (`Success`, `Soft`). */
  readonly groupe: readonly string[];
  readonly famille: FamilleDePalette;
  readonly couche: CoucheDeRampe;
  /** Lu dans les alias, jamais dans une teinte. */
  readonly sens: Readonly<Record<ModeDuTheme, SensDuTheme>>;
  /** La rampe visée, par mode et par cran. */
  readonly rampes: Readonly<Record<ModeDuTheme, Readonly<Record<number, VariableDeCarte>>>>;
  /** Les 15 rôles de palette, et pour le neutre les 4 rôles propres au neutre, par identifiant de rôle. */
  readonly roles: Readonly<Record<string, RoleDeCarte>>;
}

/** Une couleur de `components` et la variable de `theme` qu'elle vise dans chaque mode. */
export interface JetonDeComposantDeCarte extends VariableDeCarte {
  readonly role: 'background' | 'foreground' | 'border' | 'ring';
  readonly palette: string;
  readonly cible: VariableDeCarte;
}

export interface CarteDuTheme {
  /** La clé et le nom de chaque collection, par rôle. */
  readonly collections: Readonly<Record<'primitives' | 'brands' | 'utility' | 'theme' | 'layout' | 'components', { readonly cle: string; readonly nom: string }>>;
  /** Les modes de `theme`, par mode UCM. */
  readonly modes: Readonly<Record<ModeDuTheme, { readonly id: string; readonly nom: string }>>;
  readonly palettes: readonly PaletteDeCarte[];
  /** Les 3 rôles de `VARIABLES_GLOBALES` et `elevation/page` et `elevation/raised`, hors de toute palette. */
  readonly globales: Readonly<Record<string, RoleDeCarte>>;
  /** `white` et `black` de `utility/neutral`, par mode. */
  readonly absolues: Readonly<Record<ModeDuTheme, Readonly<Record<CouleurAbsolue, VariableDeCarte>>>>;
  readonly composant: { readonly jeu: string; readonly jetons: readonly JetonDeComposantDeCarte[] };
  /** Les variables de `layout` : `sizing/<n>`. */
  readonly echelle: readonly (VariableDeCarte & { readonly valeur: number })[];
}

export function paletteDeCarte(carte: CarteDuTheme, id: string): PaletteDeCarte {
  const palette = carte.palettes.find((entree) => entree.id === id);
  if (!palette) throw new Error(`Palette inconnue : ${id}`);
  return palette;
}

/** Le rôle d'une palette, ou une variable globale quand `palette` est `null`. */
export function roleDeCarte(carte: CarteDuTheme, palette: string | null, role: VariableDuTheme): RoleDeCarte {
  const trouve = palette === null ? carte.globales[role] : paletteDeCarte(carte, palette).roles[role];
  if (!trouve) throw new Error(`Rôle inconnu : ${palette ?? '(globale)'} ${role}`);
  return trouve;
}

/** Tous les rôles de `theme` de la carte : ceux des palettes, puis les variables globales. */
export function tousLesRoles(carte: CarteDuTheme): { readonly palette: string | null; readonly role: RoleDeCarte }[] {
  return [
    ...carte.palettes.flatMap((palette) => Object.values(palette.roles).map((role) => ({ palette: palette.id as string | null, role }))),
    ...Object.values(carte.globales).map((role) => ({ palette: null as string | null, role })),
  ];
}

/**
 * Compare la carte au catalogue et rend les écarts, un message chacun. Une carte complète donne une liste vide : chaque
 * variable de la carte existe au catalogue sous son nom, chaque variable de `theme` du catalogue a son entrée, l'alias de
 * chaque rôle dans chaque mode est celui de la carte, et ce que la carte dit viser est ce que la table donne pour le sens.
 */
export function verifierLaCarte(catalogue: CatalogueDeReference, carte: CarteDuTheme): string[] {
  const ecarts: string[] = [];
  const variables = new Map(catalogue.variables.map((variable) => [variable.cle, variable]));
  const existe = (quoi: string, variable: VariableDeCarte, collection?: string): void => {
    const lue = variables.get(variable.cle);
    if (!lue) ecarts.push(`${quoi} : ${variable.cle} absente du catalogue`);
    else {
      if (lue.nom !== variable.nom) ecarts.push(`${quoi} : ${variable.cle} nommée ${lue.nom} au catalogue, ${variable.nom} dans la carte`);
      if (collection !== undefined && lue.collection !== collection) ecarts.push(`${quoi} : ${variable.cle} dans ${lue.collection}, la carte attend ${collection}`);
    }
  };
  const nomsDeMode = Object.fromEntries(MODES_DU_THEME.map((mode) => [mode, carte.modes[mode].id]));
  const dansLeTheme = new Set<string>();
  const verifierLeRole = (palette: PaletteDeCarte | null, role: RoleDeCarte): void => {
    const quoi = `${palette?.id ?? '(globale)'} ${role.role}`;
    dansLeTheme.add(role.cle);
    existe(quoi, role, carte.collections.theme.cle);
    const lue = variables.get(role.cle);
    const prevu = SUPPORT_DES_VARIABLES[role.role].portees;
    if (lue && (lue.scopes ?? []).join(',') !== prevu.join(',')) ecarts.push(`${quoi} : scopes ${(lue.scopes ?? []).join(',')}, attendu ${prevu.join(',')}`);
    for (const mode of MODES_DU_THEME) {
      const cible = role.cibles[mode];
      existe(`${quoi} en ${mode}`, cible);
      const alias = lue?.valeurs?.[nomsDeMode[mode]];
      if (!alias || !('alias' in alias) || alias.alias !== cible.cle) ecarts.push(`${quoi} en ${mode} : l'alias du catalogue n'est pas ${cible.nom}`);
      if (palette) {
        const attendu = cibleDeLaVariable(role.role, mode, palette.sens[mode]);
        if (JSON.stringify(attendu) !== JSON.stringify(cible.vise)) ecarts.push(`${quoi} en ${mode} : la carte vise ${JSON.stringify(cible.vise)}, la table donne ${JSON.stringify(attendu)}`);
      }
    }
  };
  for (const collection of Object.values(carte.collections)) {
    if (!catalogue.collections.some((entree) => entree.cle === collection.cle && entree.nom === collection.nom)) ecarts.push(`collection ${collection.cle} absente du catalogue`);
  }
  for (const palette of carte.palettes) {
    for (const role of Object.values(palette.roles)) verifierLeRole(palette, role);
    for (const mode of MODES_DU_THEME) {
      for (const [cran, variable] of Object.entries(palette.rampes[mode])) existe(`rampe ${palette.id} ${mode} ${cran}`, variable, carte.collections[palette.couche].cle);
    }
  }
  for (const role of Object.values(carte.globales)) verifierLeRole(null, role);
  for (const mode of MODES_DU_THEME) {
    for (const [absolue, variable] of Object.entries(carte.absolues[mode])) existe(`absolue ${mode} ${absolue}`, variable, carte.collections.utility.cle);
  }
  for (const jeton of carte.composant.jetons) {
    existe(`jeton ${jeton.nom}`, jeton, carte.collections.components.cle);
    existe(`cible de ${jeton.nom}`, jeton.cible, carte.collections.theme.cle);
    const alias = variables.get(jeton.cle)?.valeurs;
    if (!alias || Object.values(alias).some((valeur) => !('alias' in valeur) || valeur.alias !== jeton.cible.cle)) ecarts.push(`jeton ${jeton.nom} : l'alias du catalogue n'est pas ${jeton.cible.nom}`);
  }
  for (const marche of carte.echelle) existe(`échelle ${marche.nom}`, marche, carte.collections.layout.cle);
  for (const variable of catalogue.variables) {
    if (variable.collection === carte.collections.theme.cle && !dansLeTheme.has(variable.cle)) ecarts.push(`variable ${variable.cle} de theme sans entrée dans la carte`);
  }
  return ecarts;
}
