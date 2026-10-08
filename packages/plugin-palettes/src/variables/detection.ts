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
export function nuanceDeReference(nuances: readonly number[]): number {
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

export type IntensiteDuChemin = 'soft' | 'vivid';
export type ThemeDuChemin = 'light' | 'dark';

/**
 * Les trois formes complètes d'une palette écrite en plusieurs groupes :
 * - `intensites-themes-chemin` : `X/soft/light`, `X/soft/dark`, `X/vivid/light`, `X/vivid/dark` ;
 * - `intensites-themes-modes` : `X/soft`, `X/vivid`, dans une collection à modes Light et Dark ;
 * - `themes-chemin` : `X/light`, `X/dark`, une seule intensité.
 */
export type FormeGroupee = 'intensites-themes-chemin' | 'intensites-themes-modes' | 'themes-chemin';

/** Un groupe de la palette groupée ; `null` quand le chemin ne porte pas l'intensité ou le thème. */
export interface GroupeRange {
  readonly intensite: IntensiteDuChemin | null;
  readonly theme: ThemeDuChemin | null;
  readonly palette: PaletteDuFichier;
}

export interface PaletteGroupee {
  readonly type: 'groupee';
  readonly collection: string;
  readonly nomDeLaCollection: string;
  /** Le chemin commun des groupes, sans intensité ni thème ; vide à la racine de la collection. */
  readonly racine: string;
  readonly forme: FormeGroupee;
  /** Rangés par intensité (soft puis vivid), puis par thème (light puis dark). */
  readonly groupes: readonly GroupeRange[];
}

export interface PaletteSeule {
  readonly type: 'seule';
  readonly palette: PaletteDuFichier;
}

export type PaletteRegroupee = PaletteGroupee | PaletteSeule;

const INTENSITES: readonly IntensiteDuChemin[] = ['soft', 'vivid'];
const THEMES: readonly ThemeDuChemin[] = ['light', 'dark'];

interface Candidat {
  readonly rang: number;
  readonly racine: string;
  readonly intensite: IntensiteDuChemin | null;
  readonly theme: ThemeDuChemin | null;
  readonly palette: PaletteDuFichier;
}

/** Sépare le chemin en racine, intensité et thème ; `null` si ses derniers segments n'en portent aucun. */
function decouperLeChemin(chemin: string): { racine: string; intensite: IntensiteDuChemin | null; theme: ThemeDuChemin | null } | null {
  const segments = chemin.split('/');
  const dernier = segments[segments.length - 1];
  const avantDernier = segments.length > 1 ? segments[segments.length - 2] : undefined;
  const intensiteDe = (segment: string | undefined) => INTENSITES.find((valeur) => valeur === segment?.trim().toLowerCase());
  const themeDe = (segment: string | undefined) => THEMES.find((valeur) => valeur === segment?.trim().toLowerCase());
  const racine2 = segments.slice(0, -2).join('/');
  const racine1 = segments.slice(0, -1).join('/');
  if (intensiteDe(avantDernier) && themeDe(dernier)) return { racine: racine2, intensite: intensiteDe(avantDernier)!, theme: themeDe(dernier)! };
  if (themeDe(avantDernier) && intensiteDe(dernier)) return { racine: racine2, intensite: intensiteDe(dernier)!, theme: themeDe(avantDernier)! };
  if (intensiteDe(dernier)) return { racine: racine1, intensite: intensiteDe(dernier)!, theme: null };
  if (themeDe(dernier)) return { racine: racine1, intensite: null, theme: themeDe(dernier)! };
  return null;
}

function memesNuances(a: PaletteDuFichier, b: PaletteDuFichier): boolean {
  return a.nuances.length === b.nuances.length && a.nuances.every((nuance, rang) => nuance === b.nuances[rang]);
}

/** La forme complète que ces groupes dessinent, ou `null` : une forme incomplète ou mêlée ne se regroupe pas. */
function formeComplete(membres: readonly Candidat[]): FormeGroupee | null {
  const nombre = (intensite: IntensiteDuChemin | null, theme: ThemeDuChemin | null) => membres.filter((membre) => membre.intensite === intensite && membre.theme === theme).length;
  if (membres.length === 4 && INTENSITES.every((i) => THEMES.every((t) => nombre(i, t) === 1))) return 'intensites-themes-chemin';
  if (membres.length === 2 && THEMES.every((t) => nombre(null, t) === 1)) return 'themes-chemin';
  if (membres.length === 2 && INTENSITES.every((i) => nombre(i, null) === 1)) {
    const modes = membres[0].palette.modes.map((mode) => mode.nom.trim().toLowerCase());
    return modes.includes('light') && modes.includes('dark') ? 'intensites-themes-modes' : null;
  }
  return null;
}

/**
 * Regroupe les groupes d'une même palette (décision D2 de la recette v8 :
 * seules les formes complètes se regroupent). Les groupes doivent être de la
 * même collection, de mêmes nuances, et leurs chemins ne différer que par
 * l'intensité et le thème, sans casse et dans n'importe quel ordre. Ce qui
 * ne forme pas une des trois formes complètes passe inchangé. Le résultat
 * garde l'ordre d'entrée : une palette groupée prend la place de son premier
 * groupe. Pur ; à appeler après `palettesDuFichier`.
 */
export function regrouperLesPalettes(palettes: readonly PaletteDuFichier[]): PaletteRegroupee[] {
  const familles = new Map<string, Candidat[]>();
  palettes.forEach((palette, rang) => {
    const decoupe = decouperLeChemin(palette.chemin);
    if (!decoupe) return;
    const cle = `${palette.collection}\n${decoupe.racine.toLowerCase()}`;
    const famille = familles.get(cle) ?? [];
    familles.set(cle, famille);
    famille.push({ ...decoupe, rang, palette });
  });
  const groupees = new Map<number, PaletteGroupee>();
  const absorbes = new Set<number>();
  const rangDe = <T extends string>(valeurs: readonly T[], valeur: T | null) => (valeur === null ? -1 : valeurs.indexOf(valeur));
  for (const membres of familles.values()) {
    if (!membres.every((membre) => memesNuances(membre.palette, membres[0].palette))) continue;
    const forme = formeComplete(membres);
    if (!forme) continue;
    const rangees = [...membres].sort((a, b) => rangDe(INTENSITES, a.intensite) - rangDe(INTENSITES, b.intensite) || rangDe(THEMES, a.theme) - rangDe(THEMES, b.theme));
    groupees.set(Math.min(...membres.map((membre) => membre.rang)), {
      type: 'groupee',
      collection: membres[0].palette.collection,
      nomDeLaCollection: membres[0].palette.nomDeLaCollection,
      racine: rangees[0].racine,
      forme,
      groupes: rangees.map(({ intensite, theme, palette }) => ({ intensite, theme, palette })),
    });
    for (const membre of membres) absorbes.add(membre.rang);
  }
  const resultat: PaletteRegroupee[] = [];
  palettes.forEach((palette, rang) => {
    const groupee = groupees.get(rang);
    if (groupee) resultat.push(groupee);
    else if (!absorbes.has(rang)) resultat.push({ type: 'seule', palette });
  });
  return resultat;
}

/** Ce qui désigne une palette groupée dans une demande : sa collection, sa racine et sa forme. */
export interface SourceGroupee {
  readonly collection: string;
  readonly racine: string;
  readonly forme: FormeGroupee;
}

/** La palette groupée que `source` désigne, ou `undefined` quand le fichier ne porte plus cette forme sous cette racine. */
export function retrouverLaPaletteGroupee(palettes: readonly PaletteDuFichier[], source: SourceGroupee): PaletteGroupee | undefined {
  return regrouperLesPalettes(palettes).find((candidate): candidate is PaletteGroupee =>
    candidate.type === 'groupee' && candidate.collection === source.collection && candidate.racine === source.racine && candidate.forme === source.forme);
}
