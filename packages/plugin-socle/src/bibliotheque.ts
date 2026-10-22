/**
 * Les noms des variables des libraries activées, lus depuis le fichier courant sans importer de valeur : nom, clé et type
 * seulement. Architect s'en sert pour lire une library depuis un autre fichier (mode Tokens) et pour son catalogue de
 * référence (mode Composant). Les valeurs se lisent plus tard, variable par variable.
 */

export type TypeDeVariable = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

/** Ce que la lecture demande à Figma ; `teamLibrary` manque sans la permission du manifest. */
export interface PortDeBibliotheque {
  readonly teamLibrary?: {
    getAvailableLibraryVariableCollectionsAsync(): Promise<readonly { key: string; name: string; libraryName: string }[]>;
    getVariablesInLibraryCollectionAsync(cle: string): Promise<readonly { key: string; name: string; resolvedType: string }[]>;
  };
}

export interface VariableDeLibrary { readonly cle: string; readonly nom: string; readonly type: TypeDeVariable }

export interface CollectionDeLibrary {
  readonly cle: string;
  readonly nom: string;
  readonly library: string;
  readonly variables: readonly VariableDeLibrary[];
}

export interface CollectionIllisible { readonly cle: string; readonly nom: string; readonly library: string; readonly motif: string }

export type LectureDesLibraries =
  | { readonly etat: 'illisible'; readonly motif: string }
  | { readonly etat: 'lue'; readonly collections: readonly CollectionDeLibrary[]; readonly illisibles: readonly CollectionIllisible[] };

function motifDe(erreur: unknown): string { return erreur instanceof Error ? erreur.message : String(erreur); }

/** Une collection qui lève est dite illisible avec son motif ; les autres se lisent. */
export async function lireLesLibraries(figma: PortDeBibliotheque): Promise<LectureDesLibraries> {
  const { teamLibrary } = figma;
  if (!teamLibrary) return { etat: 'illisible', motif: 'La permission teamlibrary manque : les libraries ne se lisent pas.' };
  let disponibles;
  try { disponibles = await teamLibrary.getAvailableLibraryVariableCollectionsAsync(); }
  catch (erreur) { return { etat: 'illisible', motif: motifDe(erreur) }; }
  const lectures = await Promise.allSettled(disponibles.map((collection) => teamLibrary.getVariablesInLibraryCollectionAsync(collection.key)));
  const collections: CollectionDeLibrary[] = [];
  const illisibles: CollectionIllisible[] = [];
  disponibles.forEach((collection, rang) => {
    const base = { cle: collection.key, nom: collection.name, library: collection.libraryName };
    const lecture = lectures[rang];
    if (lecture.status === 'rejected') { illisibles.push({ ...base, motif: motifDe(lecture.reason) }); return; }
    collections.push({ ...base, variables: lecture.value.map((variable) => ({ cle: variable.key, nom: variable.name, type: variable.resolvedType as TypeDeVariable })) });
  });
  return { etat: 'lue', collections, illisibles };
}

export interface CandidateDeLibrary { readonly library: string; readonly liaisons: number }
export interface ChoixDeLibrary {
  /** La library dont les variables sont liées au plus grand nombre de layers ; `null` à égalité ou sans liaison. */
  readonly choisie: string | null;
  /** Les libraries liées au moins une fois, de la plus liée à la moins liée, pour que la Configuration en propose une. */
  readonly candidates: readonly CandidateDeLibrary[];
}

/** `liaisonsParVariable` : le nombre de layers liés, par clé de variable, tiré des liaisons lues par l'appelant. */
export function choisirLaLibrary(collections: readonly CollectionDeLibrary[], liaisonsParVariable: ReadonlyMap<string, number>): ChoixDeLibrary {
  const comptes = new Map<string, number>();
  for (const collection of collections) {
    const somme = collection.variables.reduce((total, variable) => total + (liaisonsParVariable.get(variable.cle) ?? 0), 0);
    comptes.set(collection.library, (comptes.get(collection.library) ?? 0) + somme);
  }
  const candidates = [...comptes].filter(([, liaisons]) => liaisons > 0).map(([library, liaisons]) => ({ library, liaisons })).sort((a, b) => b.liaisons - a.liaisons);
  const choisie = candidates.length > 0 && (candidates.length === 1 || candidates[0].liaisons > candidates[1].liaisons) ? candidates[0].library : null;
  return { choisie, candidates };
}
