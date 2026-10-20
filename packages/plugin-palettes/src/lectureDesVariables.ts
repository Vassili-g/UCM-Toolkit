/**
 * Ce que le plugin lit des variables du fichier ([VAR-04], [VAR-12]) : les
 * collections locales, les variables locales de couleur avec leur valeur
 * par mode, le suivi rangé, et les collections des bibliothèques activées
 * ([VAR-14]). Avec `src/ecriture/variables.ts`, c'est le seul fichier qui
 * appelle `figma.variables` et `figma.teamLibrary` ([ARC-13]). Rien ici
 * n'écrit.
 *
 * La liste locale fait foi : une variable du suivi qui n'y est plus est
 * introuvable. `getVariableByIdAsync` rend encore une variable supprimée
 * tant qu'un calque la cite, et ne sert donc pas à cette lecture.
 */
import { ESPACE_PARTAGE } from 'ucm-couleur';
import { estCleDeNommage, lireReglesDeNommage } from '@ucm-kit/core/protocoles';

import type { ProfilDuDocument } from './lecture';
import { SANS_BIBLIOTHEQUE, palettesDeLaCollection, type Bibliotheques, type CollectionDeBibliotheque, type VariableDeBibliotheque } from './variables/bibliotheques';
import { RELEVE_VIDE, hexaLu, type CollectionLue, type ReleveDesVariables, type VariableLue } from './variables/releve';
import { CLES_PARTAGEES_DE_PALETTES, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import type { InventaireDuLot } from './variables/lot';
import type { DonneesDeNommage, VariableNommee } from './variables/nommeur';
import { SUIVI_VIDE, lireLeSuivi, type SuiviDesVariables } from './variables/suivi';

/** Ce que la lecture demande à Figma. */
export interface FigmaDesVariables {
  readonly variables: Pick<VariablesAPI, 'getLocalVariableCollectionsAsync' | 'getLocalVariablesAsync'>;
}

/** Les variables du fichier, telles que l'état les envoie à l'interface. */
export interface VariablesDuFichier extends ReleveDesVariables {
  readonly suivi: SuiviDesVariables;
  /** Les collections des bibliothèques activées et leurs palettes ; absent d'un état qui ne les a pas lues. */
  readonly bibliotheques?: Bibliotheques;
  /** Ce que les règles de nommage du fichier lisent ; absent sans règles enregistrées, et de l'état d'un fichier qui ne les porte pas. */
  readonly nommage?: DonneesDeNommage;
}

/** Un fichier sans variable ni suivi. */
export const VARIABLES_SANS_SUIVI: VariablesDuFichier = { ...RELEVE_VIDE, suivi: SUIVI_VIDE, bibliotheques: SANS_BIBLIOTHEQUE };

/** Ce que la lecture des bibliothèques demande à Figma ; `teamLibrary` manque sans la permission du manifest. */
export interface FigmaDesBibliotheques {
  readonly teamLibrary?: Pick<TeamLibraryAPI, 'getAvailableLibraryVariableCollectionsAsync' | 'getVariablesInLibraryCollectionAsync'>;
}

/** Les variables d'une collection de bibliothèque, réduites à leur nom, leur clé et leur type. */
export async function variablesDeLaBibliotheque(figma: Required<FigmaDesBibliotheques>, cle: string): Promise<VariableDeBibliotheque[]> {
  return (await figma.teamLibrary.getVariablesInLibraryCollectionAsync(cle)).map((variable) => ({ nom: variable.name, cle: variable.key, couleur: variable.resolvedType === 'COLOR' }));
}

/**
 * Les collections des bibliothèques activées, et leurs palettes détectées
 * sur les seuls noms ([VAR-14]). Un refus sur une collection conserve celles
 * qui se lisent et nomme les collections illisibles.
 */
export async function lireLesBibliotheques(figma: FigmaDesBibliotheques): Promise<Bibliotheques> {
  const { teamLibrary } = figma;
  if (!teamLibrary) return { ...SANS_BIBLIOTHEQUE, lisibles: false };
  try {
    const disponibles = await teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    const lectures = await Promise.allSettled(disponibles.map(async (collection) => {
      const variables = await variablesDeLaBibliotheque({ teamLibrary }, collection.key);
      const lue: CollectionDeBibliotheque = { cle: collection.key, nom: collection.name, bibliotheque: collection.libraryName, variables: variables.length };
      return { collection: lue, palettes: palettesDeLaCollection(lue, variables) };
    }));
    const lues = lectures.flatMap((lecture) => lecture.status === 'fulfilled' ? [lecture.value] : []);
    const illisibles = disponibles.filter((_, rang) => lectures[rang].status === 'rejected').map((collection) => `${collection.libraryName} / ${collection.name}`);
    return { collections: lues.map(({ collection }) => collection), palettes: lues.flatMap(({ palettes }) => palettes), lisibles: illisibles.length === 0, ...(illisibles.length > 0 ? { illisibles } : {}) };
  } catch {
    return { ...SANS_BIBLIOTHEQUE, lisibles: false };
  }
}

/** Le suivi des variables, rangé à la racine du document. */
export function lireLeSuiviRange(racine: { getSharedPluginData(espace: string, cle: string): string }): SuiviDesVariables {
  return lireLeSuivi(racine.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.variables));
}

/** La valeur d'un mode : une couleur en hexa, ou `null` pour un alias, que la lecture ne suit pas. */
function valeurLue(valeur: VariableValue, profil: ProfilDuDocument): string | null {
  if (typeof valeur !== 'object' || valeur === null || !('r' in valeur)) return null;
  return hexaLu(valeur, profil);
}

/** La collection et la variable de Figma, réduites à ce que le modèle lit. */
export function collectionLue(collection: VariableCollection): CollectionLue {
  return {
    id: collection.id,
    nom: collection.name,
    modes: collection.modes.map((mode) => ({ id: mode.modeId, nom: mode.name })),
    variables: collection.variableIds.length,
  };
}

export function variableLue(variable: Variable, profil: ProfilDuDocument): VariableLue {
  return {
    id: variable.id,
    nom: variable.name,
    collection: variable.variableCollectionId,
    valeurs: Object.fromEntries(Object.entries(variable.valuesByMode).map(([mode, valeur]) => [mode, valeurLue(valeur, profil)])),
  };
}

/** Ce que le calcul des noms lit d'une variable : son alias et sa donnée partagée `palette`. */
export type LecturesDeNommage = Map<string, { readonly alias?: string; readonly palette?: string }>;

/**
 * Ce que les règles de nommage du fichier lisent : leurs couples (clé, texte) dans `ESPACE_ARCHITECT`, les collections et
 * toutes les variables locales, de tous types. `undefined` quand aucune écriture n'est rangée en v2 : Palettes garde ses
 * noms bruts. `memo` garde l'alias et la palette d'une variable d'une lecture à l'autre.
 */
export function lireLesDonneesDeNommage(
  racine: { getSharedPluginDataKeys(espace: string): string[]; getSharedPluginData(espace: string, cle: string): string },
  collections: readonly VariableCollection[],
  variables: readonly Variable[],
  memo: LecturesDeNommage = new Map(),
): DonneesDeNommage | undefined {
  const couples = racine.getSharedPluginDataKeys(ESPACE_ARCHITECT).filter(estCleDeNommage).map((cle) => [cle, racine.getSharedPluginData(ESPACE_ARCHITECT, cle)] as const);
  if (!lireReglesDeNommage(couples)) return undefined;
  const lecture = (variable: Variable) => {
    let lue = memo.get(variable.id);
    if (!lue) {
      const premier = Object.values(variable.valuesByMode)[0];
      const alias = typeof premier === 'object' && premier !== null && 'type' in premier && premier.type === 'VARIABLE_ALIAS' ? premier.id : undefined;
      const palette = variable.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette);
      lue = { ...(alias ? { alias } : {}), ...(palette ? { palette } : {}) };
      memo.set(variable.id, lue);
    }
    return lue;
  };
  const locales = collections.filter((collection) => !collection.remote);
  return {
    couples,
    collections: locales.map((collection) => ({ id: collection.id, nom: collection.name })),
    variables: variables.filter((variable) => !variable.remote).map((variable): VariableNommee => ({ id: variable.id, nom: variable.name, collection: variable.variableCollectionId, ...lecture(variable) })),
  };
}

/** Les collections et les variables locales, de tous types : le relevé en garde les couleurs, le calcul des noms les lit toutes. */
async function lireLesObjets(figma: FigmaDesVariables): Promise<{ collections: VariableCollection[]; variables: Variable[] }> {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);
  return { collections, variables };
}

const releveDe = (collections: readonly VariableCollection[], variables: readonly Variable[], profil: ProfilDuDocument): ReleveDesVariables => ({
  collections: collections.map(collectionLue),
  variables: variables.filter((variable) => variable.resolvedType === 'COLOR').map((variable) => variableLue(variable, profil)),
});

/** Le relevé du fichier : ses collections locales et ses variables locales de couleur, lues ensemble. */
export async function lireLesVariables(figma: FigmaDesVariables, profil: ProfilDuDocument): Promise<ReleveDesVariables> {
  const { collections, variables } = await lireLesObjets(figma);
  return releveDe(collections, variables, profil);
}

/**
 * Ce que le plan d'un lot lit du fichier, à partir des objets que Figma a rendus : le relevé des collections et des
 * variables de couleur, le suivi rangé, et les données de nommage quand les règles sont enregistrées. Synchrone :
 * l'écriture l'appelle après sa dernière attente, et `lireLesVariablesDuFichier` rend le même relevé.
 */
export function inventaireLu(
  racine: { getSharedPluginDataKeys(espace: string): string[]; getSharedPluginData(espace: string, cle: string): string; readonly documentColorProfile: ProfilDuDocument },
  collections: readonly VariableCollection[],
  variables: readonly Variable[],
): InventaireDuLot {
  const nommage = lireLesDonneesDeNommage(racine, collections, variables);
  return { ...releveDe(collections, variables, racine.documentColorProfile), suivi: lireLeSuiviRange(racine), ...(nommage ? { nommage } : {}) };
}

/**
 * Ce que `lire-etat` ajoute à l'état : le relevé, le suivi, et les
 * bibliothèques que l'appelant a lues, et de quoi calculer les noms que
 * les règles de nommage donnent (toutes les variables, de tous types, avec
 * leurs noms). Les bibliothèques ne se relisent pas
 * à chaque état : le sandbox les garde, et les relit à « Synchroniser ».
 */
export async function lireLesVariablesDuFichier(
  figma: FigmaDesVariables & { readonly root: { getSharedPluginDataKeys(espace: string): string[]; getSharedPluginData(espace: string, cle: string): string; readonly documentColorProfile: ProfilDuDocument } },
  bibliotheques: Bibliotheques = SANS_BIBLIOTHEQUE,
): Promise<VariablesDuFichier> {
  const { collections, variables } = await lireLesObjets(figma);
  return { ...inventaireLu(figma.root, collections, variables), bibliotheques };
}
