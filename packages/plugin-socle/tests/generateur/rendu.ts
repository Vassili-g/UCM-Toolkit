/**
 * Le rendu normalisé : la langue commune où le modèle de vérité (`verite.ts`) et le lecteur du kit (`lecture.ts`) écrivent ce qu'un
 * variant montre. Le comparateur (`comparateur.ts`) ne lit que ce rendu, jamais le contrat ni le document.
 *
 * Un calque s'y trouve par son identité : le chemin de ses noms Figma depuis la racine de la vue, chaque nom suivi de son rang parmi
 * les frères de même nom de cette vue (`Header#0 › Label#1`). La racine s'appelle `RACINE`. Les frères comptés sont ceux que la vue
 * porte : un calque masqué en dur n'y est pas, un calque que sa propriété de visibilité peut montrer y est.
 *
 * Les valeurs sont des jetons, jamais des couleurs ou des nombres résolus : `{collection.chemin.du.nom}` en minuscules, dans la
 * convention d'adressage DTCG de l'export. Une valeur sans variable n'entre pas dans le rendu, car le contrat ne la publie pas.
 * Un champ sans contenu est absent de l'enregistrement, pour que deux enregistrements égaux soient égaux champ à champ.
 */

export const RACINE = '(racine)';
const SEPARATEUR = ' › ';

/** `['Header#0', 'Label#1']` donne `Header#0 › Label#1`. */
export const identiteDe = (chemin: readonly string[]): string => (chemin.length ? chemin.join(SEPARATEUR) : RACINE);

/** Le nom d'un calque suivi de son rang parmi les frères de même nom déjà comptés dans `vus`. */
export function nomAvecRang(nom: string, vus: Map<string, number>): string {
  const rang = vus.get(nom) ?? 0;
  vus.set(nom, rang + 1);
  return `${nom}#${rang}`;
}

/** `Compose/Size/Small/gap` dans la collection `components` s'écrit `{components.compose.size.small.gap}`. */
export function jetonDeVariable(collection: string, nom: string): string {
  return `{${[collection, ...nom.split('/')].map((segment) => segment.trim().toLowerCase().replace(/\s+/g, '-')).join('.')}}`;
}

export type Cote = 'top' | 'right' | 'bottom' | 'left';
export type Coin = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
export type Borne = 'minWidth' | 'maxWidth' | 'minHeight' | 'maxHeight';

/** Un contour : la couleur d'un trait, sa largeur (un jeton ou un jeton par côté) et son alignement. */
export interface Contour {
  couleur: string;
  largeur?: string | Partial<Record<Cote, string>>;
  alignement?: string;
}

/** La boîte effective : ce que le dessin impose, pas ce que l'auto layout calcule. `rotation` est en degrés CSS, `opacite` un jeton. */
export interface Boite {
  largeur?: string;
  hauteur?: string;
  bornes?: Partial<Record<Borne, string>>;
  rotation?: number;
  opacite?: string;
}

/** Le flux intérieur d'un conteneur : disposition, espacements et rayons en jetons, répartition et alignement des enfants. */
export interface Flux {
  disposition?: 'flex-row' | 'flex-column' | 'grid';
  gap?: string;
  padding?: Partial<Record<Cote, string>>;
  rayon?: Partial<Record<Coin, string>>;
  justification?: string;
  alignement?: string;
}

/** Le style typographique d'un texte : le nom Figma du style et les jetons que ses propriétés citent. */
export interface Typographie {
  style: string;
  jetons?: Record<string, string>;
}

export interface RenduDeCalque {
  /** Faux seulement pour un calque que sa propriété de visibilité cache : il n'a alors aucun autre champ. */
  visible: boolean;
  /** Jetons des remplissages unis, sans doublon, triés. */
  couleurs?: string[];
  contours?: Contour[];
  texte?: string;
  /** Le nom du composant que ce calque pose, quand ce n'est pas une icône. */
  compose?: string;
  /** Le nom Figma de l'icône que ce calque pose. */
  icone?: string;
  boite?: Boite;
  flux?: Flux;
  typographie?: Typographie;
  /** Les noms Figma des styles d'effet appliqués. */
  effets?: string[];
}

/** Les champs que le comparateur lit, dans cet ordre. */
export const CHAMPS_DE_RENDU = ['visible', 'couleurs', 'contours', 'texte', 'compose', 'icone', 'boite', 'flux', 'typographie', 'effets'] as const;
export type ChampDeRendu = (typeof CHAMPS_DE_RENDU)[number];

/** Le rendu d'un variant : `variant` est l'identifiant du calque Figma du variant, `calques` se range par identité. */
export interface RenduNormalise {
  variant: string;
  calques: Record<string, RenduDeCalque>;
}

const estVide = (v: unknown): boolean => v === undefined || v === null || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);

/** Retire récursivement les champs `undefined`, `null`, les objets et les listes vides. Le booléen `false` et le nombre `0` restent. */
export function elaguer<T>(valeur: T): T | undefined {
  if (Array.isArray(valeur)) {
    const liste = valeur.map(elaguer).filter((x) => x !== undefined);
    return (liste.length ? liste : undefined) as T | undefined;
  }
  if (valeur && typeof valeur === 'object') {
    const objet = Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, elaguer(v)]).filter(([, v]) => !estVide(v)));
    return (Object.keys(objet).length ? objet : undefined) as T | undefined;
  }
  return valeur === null ? undefined : valeur;
}

/** Les mêmes clés dans le même ordre, pour comparer deux valeurs par leur écriture. */
const canonique = (v: unknown): unknown => (Array.isArray(v) ? v.map(canonique) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonique((v as Record<string, unknown>)[k])])) : v);
export const egaux = (a: unknown, b: unknown): boolean => JSON.stringify(canonique(a)) === JSON.stringify(canonique(b));

/** Un padding ou un rayon écrit d'un seul jeton vaut ce jeton sur chaque côté ou chaque coin. */
export function surChaqueCote<K extends string>(valeur: string | Partial<Record<K, string>> | undefined | null, cles: readonly K[]): Partial<Record<K, string>> | undefined {
  if (valeur === undefined || valeur === null) return undefined;
  if (typeof valeur === 'string') return Object.fromEntries(cles.map((k) => [k, valeur])) as Record<K, string>;
  return elaguer(valeur);
}
