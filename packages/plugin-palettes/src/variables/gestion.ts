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
import { nomsDuPlan, nommerLePlan, planDesVariables } from './plan';
import { nommeurDuFichier, planDeLaPalette } from './nommeur';
import type { VariableLue } from './releve';
import { variablesProtegees } from './suivi';
import { cheminCommun, origineDeLaReprise, variableDeLEntree } from './reprise';

export interface TokensDUnePalette extends EtatDesTokensDUnePalette {
  readonly nomsOccupes: readonly string[];
  readonly themes: Destination['themes'] | 'light-seul';
  /** Le nombre de variables que la palette porte sous la destination d'aujourd'hui. */
  readonly variables: number;
  /** Les noms des variables qu'une écriture créerait, dans l'ordre du plan. */
  readonly aCreer: readonly string[];
  /**
   * Les noms du plan que la collection porte déjà, dans des variables
   * qu'aucune autre palette ne suit : l'écriture les remplace quand le
   * designer le confirme ([VAR-08]).
   */
  readonly existantes: readonly string[];
  /** Les identifiants des variables de `existantes`, dans le même ordre. */
  readonly variablesExistantes: readonly string[];
  /** Le nombre de valeurs déjà écrites qu'une écriture remplacerait. */
  readonly aRemplacer: number;
  /** Le nom de la collection où l'écriture se ferait ; `null` quand la destination désigne une collection que le fichier ne porte plus. */
  readonly collection: string | null;
  /** Vrai pour une palette reprise du fichier : ses variables d'origine gardent leur identifiant, et ses autres variables se créent sous leur chemin ([VAR-13]). */
  readonly reprise: boolean;
  /** Pour une palette reprise, le chemin commun de ses variables d'origine ; `null` sinon. */
  readonly origine: string | null;
}

/**
 * L'état des tokens d'une palette, et ce qu'une écriture lui ferait. Le
 * compte suit `ecrireLesVariables` : une palette jamais écrite, écrite vers
 * une autre destination, ou dont la collection a disparu crée toutes ses
 * variables ; sinon, seules celles que le suivi ne désigne plus.
 */
export function tokensDeLaPalette(recette: Recette, palette: Palette, fichier: VariablesDuFichier): TokensDUnePalette {
  const { destination } = fichier.suivi;
  const suivie = fichier.suivi.palettes[palette.id];
  const origine = suivie?.liaison === 'reprise' ? origineDeLaReprise(suivie, fichier.variables) : null;
  const nomsOccupes: string[] = [];
  const lues = new Map<string, VariableLue>(fichier.variables.map((variable) => [variable.id, variable]));
  const collections = new Map(fichier.collections.map((collection) => [collection.id, collection.nom]));
  // Les noms sont ceux que l'écriture donnerait : les règles de nommage du fichier, quand il en a.
  const plan = planDeLaPalette(nommeurDuFichier(fichier), recette, palette, destination, suivie, origine, lues, collections, nomsOccupes);
  const lu = etatDesTokens(plan, suivie, lues, destination);
  const etat = { ...lu, etat: lu.etat === 'a-jour' && nomsOccupes.length > 0 ? 'a-mettre-a-jour' as const : lu.etat, nomsOccupes };
  if (suivie?.liaison === 'reprise') {
    // Ce que la palette porte de plus que ses variables d'origine se crée sous le chemin du plan.
    const presentes = new Set<string>();
    const aCreer = new Set<string>();
    const variablesDuPlan = new Map<string, VariableLue>();
    let aRemplacer = 0;
    for (const entree of plan) {
      const lue = variableDeLEntree(entree, suivie, origine) ?? variablesDuPlan.get(entree.nom);
      if (!lue) {
        if (entree.nom !== '') aCreer.add(entree.nom);
        continue;
      }
      if (entree.nom !== '') variablesDuPlan.set(entree.nom, lue);
      presentes.add(lue.id);
      const mode = suivie.modes[entree.mode];
      // Un thème dont le mode reste à trouver s'écrit dans une variable présente : il compte parmi les couleurs remplacées.
      if (mode === undefined || lue.valeurs[mode] !== entree.hexa) aRemplacer += 1;
    }
    const chemin = origine?.chemin ?? cheminCommun([...presentes].map((id) => lues.get(id)!.nom));
    const themes = !plan.some((entree) => entree.cle.includes('/dark/')) ? 'light-seul' : plan.some((entree) => entree.mode === 'dark') ? 'modes' : 'chemin';
    return { ...etat, themes, variables: presentes.size + aCreer.size, aCreer: [...aCreer], existantes: [], variablesExistantes: [], aRemplacer, collection: collections.get(suivie.collection) ?? null, reprise: true, origine: chemin };
  }
  const garde = suivie && !etat.destinationChangee && collections.has(suivie.collection) ? suivie : undefined;

  const resolus = new Set<string>();
  let aRemplacer = 0;
  for (const entree of plan) {
    const connue = garde?.variables[entree.cle];
    const lue = connue ? lues.get(connue.id) : undefined;
    if (!lue) continue;
    resolus.add(entree.nom);
    const mode = garde!.modes[entree.mode];
    const differente = entree.mode === 'unique'
      ? fichier.collections.find((collection) => collection.id === garde!.collection)?.modes.some((cible) => lue.valeurs[cible.id] !== entree.hexa)
      : mode !== undefined && lue.valeurs[mode] !== entree.hexa;
    if (differente) aRemplacer += 1;
  }
  const noms = nomsDuPlan(plan);
  const collection = garde
    ? collections.get(garde.collection)!
    : 'id' in destination.collection ? collections.get(destination.collection.id) ?? null : destination.collection.nom;
  // Les variables du même nom, sans casse, que la collection de l'écriture porte hors des autres palettes de la recette, comme `ecrireLesVariables` les cherche.
  const cible = garde ? garde.collection : 'id' in destination.collection ? destination.collection.id : undefined;
  const protegees = variablesProtegees(fichier.suivi, new Set(recette.palettes.map((autre) => autre.id)), palette.id);
  const prises = new Map<string, string>();
  for (const variable of fichier.variables) {
    const cle = variable.nom.toLowerCase();
    if (variable.collection === cible && !protegees.has(variable.id) && !prises.has(cle)) prises.set(cle, variable.id);
  }
  const sansVariable = noms.filter((nom) => !resolus.has(nom));
  const existantes = sansVariable.filter((nom) => prises.has(nom.toLowerCase()));
  // Une palette jamais écrite dont la collection porte déjà les variables est à mettre à jour, pas à écrire.
  const suite = etat.etat === 'jamais-ecrits' && existantes.length > 0 ? 'a-mettre-a-jour' as const : etat.etat;
  return {
    ...etat,
    etat: suite,
    themes: destination.themes,
    variables: noms.length,
    aCreer: sansVariable.filter((nom) => !prises.has(nom.toLowerCase())),
    existantes,
    variablesExistantes: existantes.map((nom) => prises.get(nom.toLowerCase())!),
    aRemplacer,
    collection,
    reprise: false,
    origine: null,
  };
}

/** Les variables qu'une palette supprimée de la recette laisse dans le fichier. */
export interface VariablesOrphelines {
  readonly ancienne?: boolean;
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
 * Une variable qu'une palette de la recette remplacera n'y compte pas : la
 * fiche de cette palette porte la décision ([VAR-08]).
 */
export function variablesDesPalettesSupprimees(recette: Recette, fichier: VariablesDuFichier): VariablesOrphelines[] {
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  const lues = new Map(fichier.variables.map((variable) => [variable.id, variable]));
  const aRemplacer = new Set(recette.palettes.flatMap((palette) => tokensDeLaPalette(recette, palette, fichier).variablesExistantes));
  const orphelines: VariablesOrphelines[] = [];
  for (const [palette, suivie] of Object.entries(fichier.suivi.palettes)) {
    if (presentes.has(palette) || suivie.liaison !== 'destination') continue;
    const noms = [...new Set(Object.values(suivie.variables).map((variable) => variable.id))]
      .filter((id) => !aRemplacer.has(id))
      .map((id) => lues.get(id)?.nom)
      .filter((nom): nom is string => nom !== undefined);
    if (noms.length === 0) continue;
    orphelines.push({ palette, variables: noms.length, chemin: cheminCommun(noms) || noms[0], ...(suivie.sortieAnterieureDe ? { ancienne: true } : {}) });
  }
  return orphelines;
}

/** Un groupe de la simulation : le chemin d'une rampe, et le nom de ses nuances. */
export interface GroupeSimule {
  readonly chemin: string;
  readonly nuances: readonly string[];
}

export interface Simulation {
  /** Le nombre de modes que les variables portent : un seul, ou Light et Dark. */
  readonly modes: number;
  readonly variables: number;
  readonly groupes: readonly GroupeSimule[];
}

/**
 * Les chemins qu'une destination crée dans la collection, pour la première
 * palette de la recette ([UI-30]) : un groupe par rampe, dans l'ordre du
 * plan. `null` sans palette. Avec les règles de nommage du fichier, les
 * chemins sont ceux que l'écriture créerait.
 */
export function simulationDeLaDestination(recette: Recette, destination: Destination, fichier?: Pick<VariablesDuFichier, 'nommage'>): Simulation | null {
  const [palette] = recette.palettes;
  if (!palette) return null;
  const brut = planDesVariables(recette, palette, destination);
  const nommer = fichier ? nommeurDuFichier(fichier)?.pour('id' in destination.collection ? { id: destination.collection.id } : { nom: destination.collection.nom }) : undefined;
  const plan = nommer ? nommerLePlan(brut, nommer, () => undefined) : brut;
  const groupes = new Map<string, Set<string>>();
  for (const entree of plan) {
    const coupe = entree.nom.lastIndexOf('/');
    const chemin = coupe < 0 ? '' : entree.nom.slice(0, coupe);
    const nuances = groupes.get(chemin) ?? new Set<string>();
    groupes.set(chemin, nuances);
    nuances.add(entree.nom.slice(coupe + 1));
  }
  return {
    modes: destination.themes === 'modes' ? 2 : 1,
    variables: nomsDuPlan(plan).length,
    groupes: [...groupes].map(([chemin, nuances]) => ({ chemin, nuances: [...nuances] })),
  };
}
