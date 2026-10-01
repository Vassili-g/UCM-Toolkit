/**
 * Ce que l'onglet Gestion montre des tokens, avant sa mise en mots : l'état
 * d'une palette et ce qu'une écriture lui ferait ([UI-26], [UI-31]), la
 * simulation d'une destination ([UI-30]), et les variables qu'une palette
 * supprimée laisse dans le fichier ([UI-35]). Pur : ni Figma, ni DOM.
 */
import type { Palette, Recette } from 'ucm-couleur';

import type { VariablesDuFichier } from '../lectureDesVariables';
import type { Destination } from './destination';
import { etatDesTokens, type EtatDesTokensDUnePalette } from './etat';
import { nomsDuPlan, planDesVariables, type EntreeDuPlan, type ModeDuPlan } from './plan';
import type { VariableLue } from './releve';

export interface TokensDUnePalette extends EtatDesTokensDUnePalette {
  /** Le nombre de variables que la palette porte sous la destination d'aujourd'hui. */
  readonly variables: number;
  /** Les noms des variables qu'une écriture créerait, dans l'ordre du plan. */
  readonly aCreer: readonly string[];
  /** Le nombre de valeurs déjà écrites qu'une écriture remplacerait. */
  readonly aRemplacer: number;
  /** Le nom de la collection où l'écriture se ferait ; `null` quand la destination désigne une collection que le fichier ne porte plus. */
  readonly collection: string | null;
}

/**
 * L'état des tokens d'une palette, et ce qu'une écriture lui ferait. Le
 * compte suit `ecrireLesVariables` : une palette jamais écrite, écrite vers
 * une autre destination, ou dont la collection a disparu crée toutes ses
 * variables ; sinon, seules celles que le suivi ne désigne plus.
 */
export function tokensDeLaPalette(recette: Recette, palette: Palette, fichier: VariablesDuFichier): TokensDUnePalette {
  const { destination } = fichier.suivi;
  const plan = planDesVariables(recette, palette, destination);
  const lues = new Map<string, VariableLue>(fichier.variables.map((variable) => [variable.id, variable]));
  const suivie = fichier.suivi.palettes[palette.id];
  const etat = etatDesTokens(plan, suivie, lues, destination);
  const collections = new Map(fichier.collections.map((collection) => [collection.id, collection.nom]));
  const garde = suivie && !etat.destinationChangee && collections.has(suivie.collection) ? suivie : undefined;

  const resolus = new Set<string>();
  let aRemplacer = 0;
  for (const entree of plan) {
    const connue = garde?.variables[entree.cle];
    const lue = connue ? lues.get(connue.id) : undefined;
    if (!lue) continue;
    resolus.add(entree.nom);
    const mode = garde!.modes[entree.mode];
    if (mode !== undefined && lue.valeurs[mode] !== entree.hexa) aRemplacer += 1;
  }
  const noms = nomsDuPlan(plan);
  const collection = garde
    ? collections.get(garde.collection)!
    : 'id' in destination.collection ? collections.get(destination.collection.id) ?? null : destination.collection.nom;
  return { ...etat, variables: noms.length, aCreer: noms.filter((nom) => !resolus.has(nom)), aRemplacer, collection };
}

/** Les variables qu'une palette supprimée de la recette laisse dans le fichier. */
export interface VariablesOrphelines {
  readonly palette: string;
  /** Le nombre de variables suivies que le fichier porte encore. */
  readonly variables: number;
  /** Le chemin commun de ces variables : ce qui nomme la palette quand la recette ne la porte plus. */
  readonly chemin: string;
}

/**
 * Les palettes que le suivi garde et que la recette ne porte plus, quand
 * leurs variables sont encore dans le fichier. Une palette reprise du
 * fichier n'y paraît pas : ses variables d'origine ne sont pas à retirer.
 */
export function variablesDesPalettesSupprimees(recette: Pick<Recette, 'palettes'>, fichier: VariablesDuFichier): VariablesOrphelines[] {
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  const lues = new Map(fichier.variables.map((variable) => [variable.id, variable]));
  const orphelines: VariablesOrphelines[] = [];
  for (const [palette, suivie] of Object.entries(fichier.suivi.palettes)) {
    if (presentes.has(palette) || suivie.liaison !== 'destination') continue;
    const noms = [...new Set(Object.values(suivie.variables).map((variable) => variable.id))]
      .map((id) => lues.get(id)?.nom)
      .filter((nom): nom is string => nom !== undefined);
    if (noms.length === 0) continue;
    const segments = noms.map((nom) => nom.split('/'));
    const commun: string[] = [];
    for (let rang = 0; segments.every((liste) => rang < liste.length - 1 && liste[rang] === segments[0][rang]); rang += 1) commun.push(segments[0][rang]);
    orphelines.push({ palette, variables: noms.length, chemin: commun.join('/') || noms[0] });
  }
  return orphelines;
}

/** Une ligne de la simulation : une nuance, et sa couleur dans chaque colonne. */
export interface LigneSimulee {
  readonly nuance: string;
  readonly valeurs: readonly string[];
}

/** Un groupe de la simulation : le chemin d'une rampe, et ses nuances. */
export interface GroupeSimule {
  readonly chemin: string;
  readonly lignes: readonly LigneSimulee[];
}

export interface Simulation {
  /** Les colonnes de valeur : le seul mode, ou Light puis Dark. */
  readonly colonnes: readonly ModeDuPlan[];
  readonly variables: number;
  readonly groupes: readonly GroupeSimule[];
}

/**
 * Ce qu'une destination donne dans le panneau des variables de Figma, pour
 * la première palette de la recette ([UI-30]) : un groupe par rampe, dans
 * l'ordre du plan. `null` sans palette.
 */
export function simulationDeLaDestination(recette: Recette, destination: Destination): Simulation | null {
  const [palette] = recette.palettes;
  if (!palette) return null;
  const plan = planDesVariables(recette, palette, destination);
  const colonnes: ModeDuPlan[] = destination.themes === 'modes' ? ['light', 'dark'] : ['unique'];
  const groupes = new Map<string, Map<string, EntreeDuPlan[]>>();
  for (const entree of plan) {
    const coupe = entree.nom.lastIndexOf('/');
    const chemin = coupe < 0 ? '' : entree.nom.slice(0, coupe);
    const lignes = groupes.get(chemin) ?? new Map<string, EntreeDuPlan[]>();
    groupes.set(chemin, lignes);
    const nuance = entree.nom.slice(coupe + 1);
    lignes.set(nuance, [...(lignes.get(nuance) ?? []), entree]);
  }
  return {
    colonnes,
    variables: nomsDuPlan(plan).length,
    groupes: [...groupes].map(([chemin, lignes]) => ({
      chemin,
      lignes: [...lignes].map(([nuance, entrees]) => ({ nuance, valeurs: colonnes.map((colonne) => entrees.find((entree) => entree.mode === colonne)?.hexa ?? '') })),
    })),
  };
}

/** Ce que « Tout mettre à jour » écrirait dans les tokens ([UI-28]). */
export interface MiseAJourDesTokens {
  /** Les palettes à écrire, dans l'ordre de la recette. */
  readonly palettes: readonly string[];
  readonly creees: number;
  readonly ecrites: number;
  /** Les palettes « Modifiés dans Figma », exclues de l'écriture. */
  readonly modifiees: number;
}

export function miseAJourDesTokens(recette: Pick<Recette, 'palettes'>, tokens: ReadonlyMap<string, TokensDUnePalette>): MiseAJourDesTokens {
  const palettes: string[] = [];
  let creees = 0;
  let ecrites = 0;
  let modifiees = 0;
  for (const { id } of recette.palettes) {
    const etat = tokens.get(id);
    if (!etat) continue;
    if (etat.etat === 'modifies') modifiees += 1;
    else if (etat.etat !== 'a-jour') {
      palettes.push(id);
      creees += etat.aCreer.length;
      ecrites += etat.aRemplacer;
    }
  }
  return { palettes, creees, ecrites, modifiees };
}
