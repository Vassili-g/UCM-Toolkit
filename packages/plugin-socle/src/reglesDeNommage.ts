/**
 * Les règles du fichier qui changent un nom : l'écriture des groupes et des variables, les termes du vocabulaire,
 * les termes UCM écartés, les termes ordinaires et les collections exclues. UCM Nomenclature les range dans
 * `ESPACE_ARCHITECT`, et UCM Palettes les relit pour nommer ses variables comme lui : le socle les analyse une fois.
 *
 * Une entrée est un JSON qui porte `version: 1` ; une entrée illisible ou d'une autre version se lit comme absente,
 * et une lecture ne réécrit rien. Le module est pur : il lit des couples (clé, texte) et ne touche à aucun objet Figma.
 */
import {
  CATEGORIES_DE_NOM, REGISTRE_CASSES, REGISTRE_SEPARATEURS,
  type Convention, type ConventionsParCategorie, type Mots, type TermePersonnalise, type VocabulaireDuFichier,
} from '@ucm-kit/core/referentiel';

export const VERSION_DES_REGLES = 1;
export const CLE_ECRITURE = 'ecriture';
export const CLE_EXCLUES = 'exclues';
/** Clé de la convention de la v1, lue seulement quand `ecriture` manque. */
export const CLE_CONVENTIONS_V1 = 'conventions';

export interface EcritureChoisie { readonly groupes: Convention; readonly variables: Convention }

/** La convention du document reste versionnée et validée par les registres du kit. */
export interface ChoixDeConventions {
  readonly version: 1;
  readonly conventions: ConventionsParCategorie;
  readonly termesUcm: boolean;
}

/** Refuse une catégorie ou une dimension absente des registres publiés. */
export function estConventions(brut: unknown): brut is ConventionsParCategorie {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return false;
  return Object.entries(brut).every(([categorie, choix]) => CATEGORIES_DE_NOM.includes(categorie as typeof CATEGORIES_DE_NOM[number])
    && choix && typeof choix === 'object' && Object.keys(choix).length === 2
    && REGISTRE_CASSES.termes.some((terme) => terme.id === choix.casse)
    && REGISTRE_SEPARATEURS.termes.some((terme) => terme.id === choix.separateur));
}

/** Une donnée illisible n'est jamais réécrite lors d'une simple lecture. */
export function lireChoix(texte: string): ChoixDeConventions | undefined {
  if (!texte) return undefined;
  try {
    const brut = JSON.parse(texte);
    return brut?.version === 1 && typeof brut.termesUcm === 'boolean' && estConventions(brut.conventions) ? brut : undefined;
  } catch { return undefined; }
}

// Les aides de lecture

export const comparer = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
export const trier = (liste: readonly string[]): string[] => [...new Set(liste)].sort(comparer);
export const estTexte = (valeur: unknown): valeur is string => typeof valeur === 'string' && valeur.length > 0;
/** Un mot de terme refuse les espaces et les caractères qui séparent un chemin, une paire ou une clé : / | . { } $. */
export const estMot = (valeur: unknown): valeur is string => estTexte(valeur) && !/[\s/|.{}$]/u.test(valeur);
export const estMots = (valeur: unknown): valeur is Mots => Array.isArray(valeur) && valeur.length > 0 && valeur.every(estMot);
export const estListeDeTextes = (valeur: unknown): valeur is string[] => Array.isArray(valeur) && valeur.every(estTexte);
export const estObjet = (valeur: unknown): valeur is Record<string, unknown> => !!valeur && typeof valeur === 'object' && !Array.isArray(valeur);

/** Le reste d'une clé après son préfixe, ou `undefined` quand elle ne le porte pas ou ne dit rien d'autre. */
export function apres(cle: string, prefixe: string): string | undefined {
  return cle.startsWith(prefixe) && cle.length > prefixe.length ? cle.slice(prefixe.length) : undefined;
}
export function motsDe(texte: string): Mots | undefined {
  const mots = texte.split(' ');
  return estMots(mots) ? mots : undefined;
}

/** Un JSON objet portant `version: 1`, sinon rien. */
export function lireEntree(texte: string): Record<string, unknown> | undefined {
  if (!texte) return undefined;
  try {
    const brut: unknown = JSON.parse(texte);
    return estObjet(brut) && brut.version === VERSION_DES_REGLES ? brut : undefined;
  } catch { return undefined; }
}

export function lireEcriture(brut: Record<string, unknown>): EcritureChoisie | undefined {
  const { groupes, variables } = brut;
  return estConventions({ groupes }) && estConventions({ variables }) ? { groupes, variables } as EcritureChoisie : undefined;
}

export function lireTerme(mots: Mots, brut: Record<string, unknown>): TermePersonnalise | undefined {
  if (!estMots(brut.terme) || brut.terme.join(' ') !== mots.join(' ')) return undefined;
  if (!Array.isArray(brut.remplace) || !brut.remplace.every(estMots)) return undefined;
  if (brut.definition !== undefined && typeof brut.definition !== 'string') return undefined;
  return { terme: mots, remplace: brut.remplace, ...(brut.definition ? { definition: brut.definition } : {}) };
}

// La lecture des entrées

/** Vrai pour une clé que `lireLesEntreesDeNommage` lit ; les autres règles du fichier ne changent aucun nom. */
export const estCleDeNommage = (cle: string): boolean =>
  cle === CLE_ECRITURE || cle === CLE_EXCLUES || cle === CLE_CONVENTIONS_V1
  || apres(cle, 'terme:') !== undefined || apres(cle, 'ecart:') !== undefined || apres(cle, 'ordinaire:') !== undefined;

export interface EntreesDeNommage {
  readonly ecriture?: EcritureChoisie;
  /** Vrai quand `ecriture` vient de la clé `conventions` de la v1 et n'est pas encore rangée. */
  readonly ecritureDeLaV1: boolean;
  readonly termes: readonly TermePersonnalise[];
  readonly ecartsUcm: readonly string[];
  /** Les termes (mots en minuscules joints par `-`) que le fichier traite comme des mots ordinaires, jamais comme des noms. */
  readonly ordinaires: readonly string[];
  readonly collectionsExclues: readonly string[];
}

/**
 * Lit les entrées de l'espace qui changent un nom : `ecriture` (à défaut, `conventions` de la v1), `terme:`, `ecart:`,
 * `ordinaire:` et `exclues`. Les autres clés sont ignorées. C'est l'analyseur unique : UCM Nomenclature l'appelle
 * pour toutes ses règles et UCM Palettes pour les seules qui nomment.
 */
export function lireLesEntreesDeNommage(entrees: ReadonlyMap<string, string>): EntreesDeNommage {
  let ecriture: EcritureChoisie | undefined;
  const termes: TermePersonnalise[] = [];
  const ecartsUcm: string[] = [];
  const ordinaires: string[] = [];
  let exclues: string[] = [];
  for (const [cle, texte] of entrees) {
    if (cle === CLE_CONVENTIONS_V1 || !estCleDeNommage(cle)) continue;
    const brut = lireEntree(texte);
    if (!brut) continue;
    let reste: string | undefined;
    if (cle === CLE_ECRITURE) ecriture = lireEcriture(brut);
    else if (cle === CLE_EXCLUES) { if (estListeDeTextes(brut.ids)) exclues = trier(brut.ids); }
    else if ((reste = apres(cle, 'terme:')) !== undefined) {
      const mots = motsDe(reste);
      const terme = mots && lireTerme(mots, brut);
      if (terme) termes.push(terme);
    } else if ((reste = apres(cle, 'ecart:')) !== undefined) ecartsUcm.push(reste);
    else if ((reste = apres(cle, 'ordinaire:')) !== undefined) { if (estMot(reste)) ordinaires.push(reste); }
  }
  const v1 = ecriture ? undefined : lireChoix(entrees.get(CLE_CONVENTIONS_V1) ?? '');
  const reprise: EcritureChoisie | undefined = v1?.conventions.groupes && v1.conventions.variables
    ? { groupes: v1.conventions.groupes, variables: v1.conventions.variables } : undefined;
  return {
    ...(ecriture ?? reprise ? { ecriture: ecriture ?? reprise } : {}),
    ecritureDeLaV1: !ecriture && !!reprise,
    termes: termes.sort((a, b) => comparer(a.terme.join(' '), b.terme.join(' '))),
    ecartsUcm: trier(ecartsUcm),
    ordinaires: trier(ordinaires),
    collectionsExclues: exclues,
  };
}

/** Le vocabulaire que `indexerVocabulaire` du kit reçoit. */
export function vocabulaireDeNommage(regles: Pick<EntreesDeNommage, 'termes' | 'ecartsUcm'>): VocabulaireDuFichier {
  return { personnalises: regles.termes, ecartsUcm: regles.ecartsUcm };
}

/** Ce que le calcul de renommage lit des règles du fichier. `ecriture` manque tant qu'aucune écriture n'est rangée. */
export interface ReglesPourLeCalcul {
  readonly ecriture?: EcritureChoisie;
  readonly vocabulaire: VocabulaireDuFichier;
  readonly ordinaires: readonly string[];
  readonly collectionsExclues: readonly string[];
}

/** Les règles d'un fichier dont l'écriture est rangée : celles que le calcul de renommage suit sans rien détecter. */
export interface ReglesDeNommage extends ReglesPourLeCalcul { readonly ecriture: EcritureChoisie }

/**
 * Les règles de nommage d'un fichier, depuis les couples (clé, texte) de l'espace `ESPACE_ARCHITECT`.
 * `null` quand aucune écriture n'est rangée en v2 : la clé `ecriture` manque ou est illisible, ou seule la clé
 * `conventions` de la v1 existe. UCM Nomenclature n'a alors pas fini son premier lancement.
 */
export function lireReglesDeNommage(couples: Iterable<readonly [string, string]>): ReglesDeNommage | null {
  const lues = lireLesEntreesDeNommage(new Map(couples));
  if (!lues.ecriture || lues.ecritureDeLaV1) return null;
  return { ecriture: lues.ecriture, vocabulaire: vocabulaireDeNommage(lues), ordinaires: lues.ordinaires, collectionsExclues: lues.collectionsExclues };
}
