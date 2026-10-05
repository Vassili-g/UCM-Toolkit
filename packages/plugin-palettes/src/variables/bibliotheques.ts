/**
 * Les collections des bibliothèques distantes activées dans le fichier, et
 * les palettes que leurs noms de variables dessinent ([VAR-14]). Figma ne
 * donne d'une variable de bibliothèque que son nom, sa clé et son type :
 * une couleur ne se lit qu'après l'import de la variable. Une collection de
 * bibliothèque n'est jamais une destination. Pur : ni Figma, ni DOM.
 */
import { SEUIL_DE_PALETTE } from './detection';

export interface CollectionDeBibliotheque {
  /** La clé de la collection, que Figma demande pour lister ses variables. */
  readonly cle: string;
  readonly nom: string;
  /** Le nom du fichier de bibliothèque qui la publie. */
  readonly bibliotheque: string;
  /** Le nombre de ses variables, tous types confondus : il distingue deux collections du même nom. */
  readonly variables: number;
}

/** Une variable de bibliothèque, telle que Figma la liste : sans valeur. */
export interface VariableDeBibliotheque {
  readonly nom: string;
  readonly cle: string;
  /** Vrai pour une variable de type couleur. */
  readonly couleur: boolean;
}

/** Une palette lue dans les noms d'une collection de bibliothèque : ses couleurs ne sont pas connues. */
export interface PaletteDeBibliotheque {
  /** La clé de sa collection. */
  readonly collection: string;
  readonly nomDeLaCollection: string;
  readonly variablesDeLaCollection: number;
  readonly chemin: string;
  /** Les nuances, en ordre croissant. */
  readonly nuances: readonly number[];
}

export interface Bibliotheques {
  readonly illisibles?: readonly string[];
  readonly collections: readonly CollectionDeBibliotheque[];
  readonly palettes: readonly PaletteDeBibliotheque[];
  /** Faux quand Figma n'a pas rendu les bibliothèques : l'API manque ou a levé. Le reste de Gestion fonctionne. */
  readonly lisibles: boolean;
}

export const SANS_BIBLIOTHEQUE: Bibliotheques = { collections: [], palettes: [], lisibles: true };

/**
 * Les variables de couleur d'une rampe : celles dont le nom est `chemin`
 * suivi d'une nuance numérique. La première lue garde sa nuance, `50` avant
 * `050`.
 */
export function variablesDeLaRampe(variables: readonly VariableDeBibliotheque[], chemin: string): Map<number, VariableDeBibliotheque> {
  const rampe = new Map<number, VariableDeBibliotheque>();
  for (const variable of variables) {
    if (!variable.couleur) continue;
    const segments = variable.nom.split('/');
    const dernier = segments[segments.length - 1].trim();
    if (!/^\d+$/.test(dernier) || segments.slice(0, -1).join('/') !== chemin) continue;
    const nuance = Number(dernier);
    if (!rampe.has(nuance)) rampe.set(nuance, variable);
  }
  return rampe;
}

/**
 * Les palettes d'une collection de bibliothèque, par la règle de
 * `[VAR-12]` appliquée aux seuls noms : un nombre pour dernier segment, le
 * même chemin avant lui, cinq variables de couleur au moins. Dans l'ordre de
 * leur première variable.
 */
export function palettesDeLaCollection(collection: CollectionDeBibliotheque, variables: readonly VariableDeBibliotheque[]): PaletteDeBibliotheque[] {
  const chemins: string[] = [];
  for (const variable of variables) {
    if (!variable.couleur) continue;
    const segments = variable.nom.split('/');
    if (!/^\d+$/.test(segments[segments.length - 1].trim())) continue;
    const chemin = segments.slice(0, -1).join('/');
    if (!chemins.includes(chemin)) chemins.push(chemin);
  }
  return chemins
    .map((chemin) => ({ chemin, rampe: variablesDeLaRampe(variables, chemin) }))
    .filter(({ rampe }) => rampe.size >= SEUIL_DE_PALETTE)
    .map(({ chemin, rampe }) => ({
      collection: collection.cle,
      nomDeLaCollection: collection.nom,
      variablesDeLaCollection: collection.variables,
      chemin,
      nuances: [...rampe.keys()].sort((a, b) => a - b),
    }));
}
