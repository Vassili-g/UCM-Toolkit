/**
 * Les palettes que le fichier porte déjà dans ses variables ([VAR-12]) : des
 * variables de couleur dont le dernier segment du nom est un nombre et dont
 * le reste du chemin est le même. La lecture ne suit pas les alias : une
 * variable qui n'a de couleur dans aucun mode n'entre dans aucune palette.
 * Pur : ni Figma, ni DOM.
 */
import type { CollectionLue, ModeLu, VariableLue } from './releve';

/** Le nombre de variables à partir duquel un groupe est une palette. */
export const SEUIL_DE_PALETTE = 5;

/** La nuance que « Modifier dans le plugin » prend pour référence, ou la plus proche ([VAR-13]). */
export const NUANCE_DE_REFERENCE = 600;

export interface PaletteDuFichier {
  /** L'identifiant et le nom de la collection qui porte la palette. */
  readonly collection: string;
  readonly nomDeLaCollection: string;
  /** Le chemin commun des variables, sans la nuance ; vide pour des variables à la racine de la collection. */
  readonly chemin: string;
  /** Les nuances, en ordre croissant. */
  readonly nuances: readonly number[];
  /** L'identifiant de la variable de chaque nuance, dans l'ordre de `nuances`. */
  readonly variables: readonly string[];
  /** Les modes de la collection, dans son ordre. */
  readonly modes: readonly ModeLu[];
  /** Les couleurs de chaque mode, dans l'ordre de `nuances` ; `null` pour un alias. */
  readonly couleurs: { readonly [mode: string]: readonly (string | null)[] };
  /** La nuance 600, ou la plus proche ; à distance égale, la plus sombre. */
  readonly reference: number;
}

/** La nuance la plus proche de 600 ; à distance égale, la plus grande. */
function nuanceDeReference(nuances: readonly number[]): number {
  return nuances.reduce((choisie, nuance) => {
    const ecart = Math.abs(nuance - NUANCE_DE_REFERENCE) - Math.abs(choisie - NUANCE_DE_REFERENCE);
    return ecart < 0 || (ecart === 0 && nuance > choisie) ? nuance : choisie;
  });
}

/**
 * Les palettes du fichier, dans l'ordre des collections puis de leur
 * première variable. `possedees` porte les identifiants que le suivi
 * désigne : ces variables sont celles du plugin, et n'entrent dans aucune
 * palette du fichier. Deux variables de la même nuance, `50` et `050` : la
 * première lue garde la nuance.
 */
export function palettesDuFichier(
  variables: readonly VariableLue[],
  collections: readonly CollectionLue[],
  possedees: ReadonlySet<string> = new Set(),
): PaletteDuFichier[] {
  const groupes = new Map<string, { collection: CollectionLue; chemin: string; nuances: Map<number, VariableLue> }>();
  const parIdentifiant = new Map(collections.map((collection) => [collection.id, collection]));
  for (const variable of variables) {
    if (possedees.has(variable.id)) continue;
    const collection = parIdentifiant.get(variable.collection);
    if (!collection) continue;
    if (Object.values(variable.valeurs).every((valeur) => valeur === null)) continue;
    const segments = variable.nom.split('/');
    const dernier = segments[segments.length - 1].trim();
    if (!/^\d+$/.test(dernier)) continue;
    const chemin = segments.slice(0, -1).join('/');
    const cle = `${collection.id}\n${chemin}`;
    const groupe = groupes.get(cle) ?? { collection, chemin, nuances: new Map<number, VariableLue>() };
    groupes.set(cle, groupe);
    const nuance = Number(dernier);
    if (!groupe.nuances.has(nuance)) groupe.nuances.set(nuance, variable);
  }
  const rangDeLaCollection = new Map(collections.map((collection, rang) => [collection.id, rang]));
  return [...groupes.values()]
    .filter((groupe) => groupe.nuances.size >= SEUIL_DE_PALETTE)
    // Le tri est stable : dans une collection, les palettes gardent l'ordre de leur première variable.
    .sort((a, b) => rangDeLaCollection.get(a.collection.id)! - rangDeLaCollection.get(b.collection.id)!)
    .map(({ collection, chemin, nuances }) => {
      const triees = [...nuances.keys()].sort((a, b) => a - b);
      return {
        collection: collection.id,
        nomDeLaCollection: collection.nom,
        chemin,
        nuances: triees,
        variables: triees.map((nuance) => nuances.get(nuance)!.id),
        modes: collection.modes,
        couleurs: Object.fromEntries(collection.modes.map((mode) => [mode.id, triees.map((nuance) => nuances.get(nuance)!.valeurs[mode.id] ?? null)])),
        reference: nuanceDeReference(triees),
      };
    });
}
