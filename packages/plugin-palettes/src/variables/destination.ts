/**
 * La destination des tokens ([VAR-02]) : où les palettes du plugin
 * s'écrivent dans les variables du fichier. Elle vaut pour toutes les
 * palettes et se range dans le suivi, jamais dans la recette. Pur : ni
 * Figma, ni DOM.
 */

/** Une collection locale, par son identifiant, ou une collection à créer, par son nom. */
export type CollectionVisee = { readonly id: string } | { readonly nom: string };

/** Les thèmes Light et Dark : un segment du chemin, ou deux modes de la collection. */
export type ThemesDeLaDestination = 'chemin' | 'modes';

export interface Destination {
  readonly collection: CollectionVisee;
  /** Le dossier des palettes dans la collection, segments séparés par `/` ; vide, les palettes sont à la racine. */
  readonly groupe: string;
  readonly themes: ThemesDeLaDestination;
}

/** La forme de l'architecture (D5) : la collection neuve `primitives`, le groupe `colors`, les thèmes dans le chemin. */
export const DESTINATION_PAR_DEFAUT: Destination = { collection: { nom: 'primitives' }, groupe: 'colors', themes: 'chemin' };

/** Le champ qu'une destination refusée doit corriger. */
export type RefusDeDestination = 'collection' | 'groupe' | 'themes';

/** Ce que Figma refuse dans un nom de variable : `.`, `{`, `}`, et un `$` en tête de segment. */
const SEGMENT_REFUSE = /[.{}]|^\$/;

/**
 * Les segments d'un groupe saisi : coupés aux `/`, sans espaces autour, sans
 * segment vide. `null` quand un segment porte un caractère que Figma refuse.
 */
export function segmentsDuGroupe(groupe: string): string[] | null {
  const segments = groupe.split('/').map((segment) => segment.trim()).filter((segment) => segment !== '');
  return segments.some((segment) => SEGMENT_REFUSE.test(segment)) ? null : segments;
}

/**
 * Valide une destination reçue de l'interface ou lue dans le suivi, et la
 * rend sous sa forme rangée : le nom de collection et le groupe sans espaces
 * autour, le groupe sans `/` de trop.
 */
export function validerLaDestination(valeur: unknown): { readonly destination: Destination } | { readonly refus: RefusDeDestination } {
  if (!valeur || typeof valeur !== 'object') return { refus: 'collection' };
  const { collection, groupe, themes } = valeur as { collection?: unknown; groupe?: unknown; themes?: unknown };
  let visee: CollectionVisee | null = null;
  if (collection && typeof collection === 'object') {
    const { id, nom } = collection as { id?: unknown; nom?: unknown };
    if (typeof id === 'string' && id !== '') visee = { id };
    else if (typeof nom === 'string' && nom.trim() !== '') visee = { nom: nom.trim() };
  }
  if (!visee) return { refus: 'collection' };
  if (typeof groupe !== 'string') return { refus: 'groupe' };
  const segments = segmentsDuGroupe(groupe);
  if (!segments) return { refus: 'groupe' };
  if (themes !== 'chemin' && themes !== 'modes') return { refus: 'themes' };
  return { destination: { collection: visee, groupe: segments.join('/'), themes } };
}

/** Vrai quand deux destinations désignent la même collection, le même groupe et la même forme de thèmes. */
export function memeDestination(a: Destination, b: Destination): boolean {
  const memeCollection = 'id' in a.collection
    ? 'id' in b.collection && a.collection.id === b.collection.id
    : 'nom' in b.collection && a.collection.nom === b.collection.nom;
  return memeCollection && a.groupe === b.groupe && a.themes === b.themes;
}
