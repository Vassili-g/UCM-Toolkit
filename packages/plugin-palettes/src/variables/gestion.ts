/**
 * Ce que l'onglet Gestion montre des tokens, avant sa mise en mots : l'état
 * d'une palette et ce qu'une écriture lui ferait ([UI-26], [UI-31]), la
 * simulation d'une destination ([UI-30]), et les variables qu'une palette
 * supprimée laisse dans le fichier ([UI-35]). Pur : ni Figma, ni DOM.
 */
import type { Palette, Recette } from 'ucm-couleur';

import type { Reste } from '../ecriture/variables';
import type { ResteNomme } from '../i18n/fr';
import type { VariablesDuFichier } from '../lectureDesVariables';
import type { Destination } from './destination';
import type { EtatDesTokensDUnePalette } from './etat';
import { nomsDuPlan, nommerLePlan, planDesVariables } from './plan';
import { nommeurDuFichier } from './nommeur';
import { planDuLot } from './lot';
import { cheminCommun } from './reprise';

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
  readonly refus: { readonly nom: string; readonly palette: string } | null;
}

/**
 * L'état des tokens d'une palette, et ce qu'une écriture lui ferait. Le
 * compte suit `ecrireLesVariables` : une palette jamais écrite, écrite vers
 * une autre destination, ou dont la collection a disparu crée toutes ses
 * variables ; sinon, seules celles que le suivi ne désigne plus.
 */
export function tokensDeLaPalette(recette: Recette, palette: Palette, fichier: VariablesDuFichier): TokensDUnePalette {
  const decision = planDuLot(recette, fichier, { palettes: [palette.id], remettre: [palette.id], remplacer: [palette.id] }).palettes[0];
  if (decision.decision === 'absente' || decision.decision === 'modifiee') throw new Error(`Palette sans plan : ${palette.id}`);
  const ecriture = decision.decision === 'ecrire' ? decision : decision.ecriture;
  const reprise = ecriture.liaison === 'reprise';
  const existantes = ecriture.remplacements.map((remplacement) => remplacement.vers);
  const etat = ecriture.etat.etat === 'a-jour' && ecriture.nomsOccupes.length > 0
    ? 'a-mettre-a-jour' : ecriture.etat.etat === 'jamais-ecrits' && existantes.length > 0 ? 'a-mettre-a-jour' : ecriture.etat.etat;
  const visee = ecriture.collection;
  const collection = 'nom' in visee ? visee.nom : fichier.collections.find((candidate) => candidate.id === visee.id)?.nom ?? null;
  const presentes = new Set(ecriture.cibles.flatMap((cible) => cible.cible === 'presente' ? [cible.id] : []));
  return {
    ...ecriture.etat,
    etat,
    aRenommer: ecriture.renommages,
    nomsOccupes: ecriture.nomsOccupes,
    themes: reprise ? !ecriture.plan.some((entree) => entree.cle.includes('/dark/')) ? 'light-seul' : ecriture.plan.some((entree) => entree.mode === 'dark') ? 'modes' : 'chemin' : fichier.suivi.destination.themes,
    variables: reprise ? presentes.size + ecriture.creations.length : nomsDuPlan(ecriture.plan).length,
    aCreer: ecriture.creations.map((creation) => creation.nom),
    existantes,
    variablesExistantes: ecriture.remplacements.map((remplacement) => remplacement.id),
    aRemplacer: ecriture.aRemplacer,
    collection,
    reprise,
    origine: ecriture.origine,
    refus: decision.decision === 'nom-pris' && decision.occupant.par === 'palette' ? { nom: decision.nom, palette: decision.occupant.palette } : null,
  };
}

/** Un écart que la mise à jour d'une palette reprise ferait ; la ligne « Tokens Figma » les nomme tous, dans cet ordre. */
export type EcartDeLaReprise =
  | { readonly ecart: 'creations'; readonly nombre: number }
  | { readonly ecart: 'couleurs'; readonly nombre: number; readonly total: number }
  | { readonly ecart: 'renommages'; readonly nombre: number };

/** Les écarts d'une palette reprise : créations, couleurs qui changent, renommages. Vide quand aucun des trois ne se produit. */
export function ecartsDeLaReprise(tokens: Pick<TokensDUnePalette, 'aCreer' | 'aRemplacer' | 'aRenommer' | 'variables'>): EcartDeLaReprise[] {
  return [
    ...(tokens.aCreer.length > 0 ? [{ ecart: 'creations', nombre: tokens.aCreer.length } as const] : []),
    ...(tokens.aRemplacer > 0 ? [{ ecart: 'couleurs', nombre: tokens.aRemplacer, total: tokens.variables } as const] : []),
    ...(tokens.aRenommer.length > 0 ? [{ ecart: 'renommages', nombre: tokens.aRenommer.length } as const] : []),
  ];
}

/** Ce qu'une écriture n'a pas pu défaire, tel que l'annonce le nomme : une variable, un mode ou une collection. */
export function restesNommes(restes: readonly Reste[]): ResteNomme[] {
  return restes.map((reste) => (reste.reste === 'mode' ? { nom: reste.mode, variable: false } : { nom: reste.nom, variable: reste.reste !== 'collection-creee' }));
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
