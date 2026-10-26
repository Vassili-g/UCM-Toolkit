/**
 * Acquisition d'une famille de propriétés de nœud : la géométrie et la mise en
 * page scalaires (`layoutMode`, espacements, rayons, épaisseurs de contour).
 * Le copieur lit un nœud côté Figma et rend des états de `faits.ts` ; le
 * relevé d'Architect et le moteur en tirent chacun leur projection.
 *
 * Un champ se lit une fois, au moment où l'appelant le demande : le copieur
 * ne lit jamais un champ qu'on ne lui a pas nommé, car un nœud n'expose que
 * les champs de son type et chaque lecture nue se compte.
 *
 * Le nœud est un objet quelconque, sans type Figma. Aucun champ de cette
 * famille ne porte d'objet indexé par un nom du designer : la copie n'a pas à
 * se défendre de `__proto__`.
 */
import { MIXTE, acquis, refuse, type ChampsDeNoeud, type EtatEcrit, type TableDesChamps } from './faits';

export const CHAMPS_DE_MISE_EN_PAGE = [
  'layoutMode',
  'layoutWrap',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'counterAxisSpacing',
  'itemSpacing',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'strokeWeight',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
] as const satisfies readonly (keyof ChampsDeNoeud)[];

export type ChampDeMiseEnPage = (typeof CHAMPS_DE_MISE_EN_PAGE)[number];
export type ChampsDeMiseEnPage = Pick<ChampsDeNoeud, ChampDeMiseEnPage>;
export type ValeurScalaire = string | number | boolean | null;

const CHAMPS_TEXTE: ReadonlySet<string> = new Set<ChampDeMiseEnPage>(['layoutMode', 'layoutWrap', 'primaryAxisAlignItems', 'counterAxisAlignItems']);
/** `counterAxisSpacing` vaut `null` sous un espacement automatique. */
const CHAMPS_NULLABLES: ReadonlySet<string> = new Set<ChampDeMiseEnPage>(['counterAxisSpacing']);

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/**
 * Lit un champ scalaire (chaîne, nombre, booléen ou `null`) du nœud, une seule fois.
 * `undefined` : le type de nœud n'expose pas le champ (`absent`). Une lecture
 * qui lève est refusée (`leve`). Le symbole `figma.mixed` et toute forme qui
 * n'est ni chaîne, ni nombre, ni booléen, ni `null` sont mixtes. `lue` est appelé avant
 * l'accès natif, pour que l'appelant compte ses lectures.
 */
export function lireUnChamp(noeud: object, champ: string, lue?: () => void): EtatEcrit<ValeurScalaire> {
  lue?.();
  let valeur: unknown;
  try {
    valeur = (noeud as Record<string, unknown>)[champ];
  } catch (erreur) {
    return refuse('leve', messageDErreur(erreur));
  }
  if (valeur === undefined) return refuse('absent');
  if (valeur === null || typeof valeur === 'string' || typeof valeur === 'number' || typeof valeur === 'boolean') return acquis(valeur);
  return MIXTE;
}

/**
 * Copie les champs nommés, dans l'ordre donné, une lecture chacun. Un champ de
 * texte qui rend un nombre, un champ numérique qui rend une chaîne et un
 * `null` hors `counterAxisSpacing` sont mixtes : la forme n'est pas celle que
 * `ChampsDeNoeud` annonce.
 */
export function copierLaMiseEnPage<K extends ChampDeMiseEnPage>(noeud: object, champs: readonly K[], lue?: () => void): TableDesChamps<Pick<ChampsDeMiseEnPage, K>> {
  const table: { [C in K]?: EtatEcrit<ChampsDeMiseEnPage[C]> } = {};
  for (const champ of champs) {
    const lu = lireUnChamp(noeud, champ, lue);
    const attendu = CHAMPS_TEXTE.has(champ) ? 'string' : 'number';
    const bonneForme = lu.etat !== 'acquis' || (lu.valeur === null ? CHAMPS_NULLABLES.has(champ) : typeof lu.valeur === attendu);
    table[champ] = (bonneForme ? lu : MIXTE) as EtatEcrit<ChampsDeMiseEnPage[K]>;
  }
  return table;
}
