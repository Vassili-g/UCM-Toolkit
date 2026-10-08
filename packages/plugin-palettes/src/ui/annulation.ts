/**
 * L'annulation dans la session ([REC-06], [REC-10], D4) : l'état d'ouverture
 * de chaque palette, la pile des recettes rangées par l'interface, et le
 * rétablissement qui suit une annulation.
 *
 * Tout est valeur : chaque fonction rend un nouvel état. La frontière garde
 * l'état souhaité et l'état confirmé par le sandbox, et revient au second
 * quand un rangement est refusé. Rien ne se range dans le fichier : l'état
 * vit en mémoire et s'oublie avec la fenêtre.
 */
import { jsonCanonique, type Palette, type Recette } from 'ucm-couleur';

export interface EtatDAnnulation {
  /** Pour chaque palette, celle que l'interface a vue rangée en premier dans la session. */
  readonly ouverture: ReadonlyMap<string, Palette>;
  /** Les recettes rangées, de la plus ancienne à la plus récente. */
  readonly pile: readonly Recette[];
  /** Le rang de la recette rangée dans la pile ; une pile vide ne porte aucune recette. */
  readonly position: number;
  /** La palette d'avant la dernière annulation, tant qu'aucun autre rangement n'a suivi. */
  readonly retablissable: { readonly id: string; readonly palette: Palette } | null;
}

/** Un état avec la recette qu'il demande de ranger. */
export interface Pas {
  readonly etat: EtatDAnnulation;
  readonly recette: Recette;
}

export const ETAT_D_ANNULATION_VIDE: EtatDAnnulation = { ouverture: new Map(), pile: [], position: 0, retablissable: null };

function memes(a: unknown, b: unknown): boolean {
  return jsonCanonique(a) === jsonCanonique(b);
}

function remplacer(recette: Recette, palette: Palette): Recette {
  return { ...recette, palettes: recette.palettes.map((candidate) => (candidate.id === palette.id ? palette : candidate)) };
}

function avecLesOuvertures(ouverture: ReadonlyMap<string, Palette>, recette: Recette): ReadonlyMap<string, Palette> {
  const complete = new Map(ouverture);
  for (const palette of recette.palettes) if (!complete.has(palette.id)) complete.set(palette.id, palette);
  return complete;
}

/** La recette que la pile désigne, ou `null` tant qu'aucune n'est rangée ni lue. */
export function recetteCourante(etat: EtatDAnnulation): Recette | null {
  return etat.pile[etat.position] ?? null;
}

function paletteCourante(etat: EtatDAnnulation, id: string): Palette | undefined {
  return recetteCourante(etat)?.palettes.find((palette) => palette.id === id);
}

/**
 * Repart d'une recette lue dans le fichier : la pile ne garde qu'elle, et le
 * rétablissement tombe. Une palette qui a changé depuis la recette connue, ou
 * qui n'avait pas d'état d'ouverture, prend la version lue ; une palette
 * absente de la lecture est oubliée.
 */
export function adopter(etat: EtatDAnnulation, lue: Recette): EtatDAnnulation {
  const ouverture = new Map<string, Palette>();
  for (const palette of lue.palettes) {
    const ancienne = etat.ouverture.get(palette.id);
    const connue = paletteCourante(etat, palette.id);
    const changee = connue !== undefined && !memes(connue, palette);
    ouverture.set(palette.id, ancienne === undefined || changee ? palette : ancienne);
  }
  return { ouverture, pile: [lue], position: 0, retablissable: null };
}

/** Garde les états d'ouverture et vide la pile, quand la recette rangée n'est pas connue de l'interface. */
export function viderLaPile(etat: EtatDAnnulation): EtatDAnnulation {
  return { ouverture: etat.ouverture, pile: [], position: 0, retablissable: null };
}

function empiler(etat: EtatDAnnulation, recette: Recette, retablissable: EtatDAnnulation['retablissable']): EtatDAnnulation {
  const pile = [...etat.pile.slice(0, etat.position + 1), recette];
  return { ouverture: avecLesOuvertures(etat.ouverture, recette), pile, position: pile.length - 1, retablissable };
}

/**
 * Un réglage de l'interface : la recette s'ajoute à la pile, coupe la suite
 * et fait tomber le rétablissement. Une recette égale à la courante ne change rien.
 */
export function regler(etat: EtatDAnnulation, recette: Recette): EtatDAnnulation {
  const courante = recetteCourante(etat);
  if (courante && memes(courante, recette)) return etat;
  return empiler(etat, recette, null);
}

/** Vrai quand la palette rangée n'est plus celle de son état d'ouverture. */
export function differeDeLOuverture(etat: EtatDAnnulation, id: string): boolean {
  const ouverte = etat.ouverture.get(id);
  const courante = paletteCourante(etat, id);
  return ouverte !== undefined && courante !== undefined && !memes(ouverte, courante);
}

/** La recette courante avec cette palette remise dans son état d'ouverture ; `null` quand elle n'a pas bougé. */
export function annuler(etat: EtatDAnnulation, id: string): Pas | null {
  const courante = recetteCourante(etat);
  const ouverte = etat.ouverture.get(id);
  const actuelle = paletteCourante(etat, id);
  if (!courante || !ouverte || !actuelle || memes(ouverte, actuelle)) return null;
  const recette = remplacer(courante, ouverte);
  return { etat: empiler(etat, recette, { id, palette: actuelle }), recette };
}

export function peutRetablir(etat: EtatDAnnulation): boolean {
  const { retablissable } = etat;
  return retablissable !== null && paletteCourante(etat, retablissable.id) !== undefined;
}

/** La recette courante avec la palette d'avant la dernière annulation ; elle s'ajoute à la pile comme un réglage. */
export function retablir(etat: EtatDAnnulation): Pas | null {
  const courante = recetteCourante(etat);
  if (!courante || !etat.retablissable || !peutRetablir(etat)) return null;
  const recette = remplacer(courante, etat.retablissable.palette);
  return { etat: empiler(etat, recette, null), recette };
}

export function peutReculer(etat: EtatDAnnulation): boolean {
  return etat.position > 0;
}

export function peutAvancer(etat: EtatDAnnulation): boolean {
  return etat.position < etat.pile.length - 1;
}

/** Recule d'un pas dans la pile ; le rétablissement tombe. */
export function reculer(etat: EtatDAnnulation): Pas | null {
  if (!peutReculer(etat)) return null;
  const position = etat.position - 1;
  return { etat: { ...etat, position, retablissable: null }, recette: etat.pile[position] as Recette };
}

export function avancer(etat: EtatDAnnulation): Pas | null {
  if (!peutAvancer(etat)) return null;
  const position = etat.position + 1;
  return { etat: { ...etat, position, retablissable: null }, recette: etat.pile[position] as Recette };
}
