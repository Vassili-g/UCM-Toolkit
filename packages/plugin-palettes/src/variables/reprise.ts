/**
 * La reprise d'une palette du fichier ([VAR-13]) : ce que « Modifier dans le
 * plugin » lit d'elle, et la liaison que le suivi en garde. Une palette
 * reprise garde ses variables d'origine, avec leurs liaisons : le plugin
 * les renomme sous le segment de leur thème ou de leur intensité, et crée
 * sous leur chemin ce que la palette porte de plus. Pur : ni Figma, ni DOM.
 */
import { MODES, type Mode } from 'ucm-couleur';

import { nuanceDeReference, type PaletteDuFichier } from './detection';
import { cleDuPlan, type EntreeDuPlan } from './plan';
import type { CollectionLue, ModeLu, VariableLue } from './releve';
import type { PaletteSuivie, VariableSuivie } from './suivi';

/**
 * Le mode de la collection que chaque thème vise. Light vise le mode dont le
 * nom contient « light », sans casse, sinon le premier mode. Dark vise un
 * autre mode dont le nom contient « dark » ; sans lui, le thème Dark ne
 * s'écrit pas.
 */
export function modesDeLaReprise(modes: readonly ModeLu[]): { readonly light: ModeLu | null; readonly dark: ModeLu | null } {
  const nomme = (mot: string): ModeLu | undefined => modes.find((mode) => mode.nom.toLowerCase().includes(mot));
  const light = nomme('light') ?? modes[0] ?? null;
  const dark = modes.find((mode) => mode !== light && mode.nom.toLowerCase().includes('dark')) ?? null;
  return { light, dark };
}

/** Les couleurs qu'une palette du fichier porte dans chaque thème, dans l'ordre de ses nuances ; `null` pour un alias. */
export interface CouleursDeLaReprise {
  readonly nuances: readonly number[];
  readonly light: readonly (string | null)[];
  /** `null` quand la collection n'a pas de mode Dark. */
  readonly dark: readonly (string | null)[] | null;
}

export function couleursDeLaReprise(palette: PaletteDuFichier): CouleursDeLaReprise {
  const { light, dark } = modesDeLaReprise(palette.modes);
  const sans = palette.nuances.map(() => null);
  return {
    nuances: palette.nuances,
    light: light ? palette.couleurs[light.id] ?? sans : sans,
    dark: dark ? palette.couleurs[dark.id] ?? sans : null,
  };
}

/**
 * Le suivi d'une palette reprise : ses clés désignent les variables
 * d'origine, par identifiant, et la dernière couleur écrite prend la couleur
 * lue. Une palette reprise telle quelle est donc « À jour » sans écriture.
 * Une variable qui porte un alias dans un thème n'y est pas suivie : le
 * plugin n'écrase pas un alias.
 */
export function suiviDeLaReprise(palette: PaletteDuFichier): PaletteSuivie {
  const viser = modesDeLaReprise(palette.modes);
  const couleurs = couleursDeLaReprise(palette);
  const variables: { [cle: string]: VariableSuivie } = {};
  const modes: { light?: string; dark?: string } = {};
  for (const mode of MODES) {
    const cible = viser[mode];
    const lues = mode === 'light' ? couleurs.light : couleurs.dark;
    if (!cible || !lues) continue;
    modes[mode] = cible.id;
    palette.nuances.forEach((nuance, rang) => {
      const lue = lues[rang];
      if (lue !== null) variables[cleDuPlan('unique', mode, nuance)] = { id: palette.variables[rang], ecrite: lue };
    });
  }
  return { collection: palette.collection, groupe: '', modes, variables, liaison: 'reprise' };
}

/**
 * Ce que le fichier porte autour d'une palette reprise : le plan y lit le
 * nom de chaque variable, et l'écriture la variable qu'une entrée vise.
 */
export interface OrigineDeLaReprise {
  /** Le chemin commun des variables d'origine à la reprise, sans leur nuance : celui que le suivi garde, sinon celui de leurs noms. */
  readonly chemin: string;
  /** Les variables de couleur de la collection, par nom. */
  readonly parNom: ReadonlyMap<string, VariableLue>;
  /** Les variables que le suivi de la palette désigne et que le fichier porte encore, par identifiant. */
  readonly suivies: ReadonlyMap<string, VariableLue>;
}

/**
 * Vrai pour une clé du suivi qui désigne une variable d'origine : la rampe
 * Light sous `unique`, et le thème Dark quand la collection le porte en
 * mode. Les autres clés désignent des variables créées sous leur chemin.
 */
function estDOrigine(suivie: PaletteSuivie, cle: string): boolean {
  return cle.startsWith('unique/light/') || (suivie.modes.dark !== undefined && cle.startsWith('unique/dark/'));
}

/**
 * L'origine d'une palette reprise, relue dans les variables d'aujourd'hui.
 * `null` quand le fichier ne porte plus aucune variable d'origine : le
 * chemin où créer n'est plus connu.
 */
export function origineDeLaReprise(suivie: PaletteSuivie, variables: readonly VariableLue[]): OrigineDeLaReprise | null {
  const lues = new Map(variables.map((variable) => [variable.id, variable]));
  const suivies = new Map<string, VariableLue>();
  const origine: string[] = [];
  for (const [cle, variable] of Object.entries(suivie.variables)) {
    const lue = lues.get(variable.id);
    if (!lue) continue;
    suivies.set(lue.id, lue);
    if (estDOrigine(suivie, cle)) origine.push(lue.nom);
  }
  if (origine.length === 0) return null;
  const parNom = new Map(variables.filter((variable) => variable.collection === suivie.collection).map((variable) => [variable.nom, variable]));
  return { chemin: suivie.chemin ?? cheminCommun(origine), parNom, suivies };
}

/**
 * La variable qu'une entrée du plan écrit, quand le fichier la porte : celle
 * que le suivi désigne sous sa clé, sinon une variable de la palette qui
 * porte déjà son nom, pour un thème en mode que le suivi ne désigne pas
 * encore.
 */
export function variableDeLEntree(entree: Pick<EntreeDuPlan, 'cle' | 'nom'>, suivie: PaletteSuivie, origine: OrigineDeLaReprise | null): VariableLue | undefined {
  if (!origine) return undefined;
  const connue = suivie.variables[entree.cle];
  const designee = connue ? origine.suivies.get(connue.id) : undefined;
  if (designee) return designee;
  const homonyme = origine.parNom.get(entree.nom);
  return homonyme && origine.suivies.has(homonyme.id) ? homonyme : undefined;
}

/** Les thèmes qu'une liaison de reprise écrit : ceux dont le suivi garde un mode. */
export function themesDeLaReprise(suivie: PaletteSuivie): Mode[] {
  return MODES.filter((mode) => suivie.modes[mode] !== undefined);
}

/** Le chemin commun à des noms de variables, sans leur dernier segment ; vide quand ils n'en partagent aucun. */
export function cheminCommun(noms: readonly string[]): string {
  if (noms.length === 0) return '';
  const segments = noms.map((nom) => nom.split('/'));
  const commun: string[] = [];
  for (let rang = 0; segments.every((liste) => rang < liste.length - 1 && liste[rang] === segments[0][rang]); rang += 1) commun.push(segments[0][rang]);
  return commun.join('/');
}

/**
 * La palette du fichier qu'une liaison de reprise désigne, relue dans les
 * variables d'aujourd'hui : c'est elle que la bascule « Recalculées · Telles
 * quelles » de Création reprend de nouveau ([UI-34]). `null` quand sa
 * collection ou toutes ses variables ont quitté le fichier.
 */
export function sourceDeLaReprise(
  suivie: PaletteSuivie,
  fichier: { readonly collections: readonly CollectionLue[]; readonly variables: readonly VariableLue[] },
): PaletteDuFichier | null {
  const collection = fichier.collections.find((candidate) => candidate.id === suivie.collection);
  if (!collection) return null;
  const lues = new Map(fichier.variables.map((variable) => [variable.id, variable]));
  const parNuance = new Map<number, VariableLue>();
  for (const [cle, variable] of Object.entries(suivie.variables)) {
    if (!estDOrigine(suivie, cle)) continue;
    const nuance = Number(cle.slice(cle.lastIndexOf('/') + 1));
    const lue = lues.get(variable.id);
    if (lue && Number.isFinite(nuance) && !parNuance.has(nuance)) parNuance.set(nuance, lue);
  }
  if (parNuance.size === 0) return null;
  const nuances = [...parNuance.keys()].sort((a, b) => a - b);
  // Les modes que la liaison écrit, dans l'ordre de la collection.
  const modes = collection.modes.filter((mode) => mode.id === suivie.modes.light || mode.id === suivie.modes.dark);
  return {
    collection: collection.id,
    nomDeLaCollection: collection.nom,
    chemin: suivie.chemin ?? cheminCommun(nuances.map((nuance) => parNuance.get(nuance)!.nom)),
    nuances,
    variables: nuances.map((nuance) => parNuance.get(nuance)!.id),
    modes,
    couleurs: Object.fromEntries(modes.map((mode) => [mode.id, nuances.map((nuance) => parNuance.get(nuance)!.valeurs[mode.id] ?? null)])),
    reference: nuanceDeReference(nuances),
  };
}
