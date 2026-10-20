/**
 * Le classement commun d'une donnée que des plugins se partagent dans le fichier Figma.
 *
 * Aucune lecture ne migre ni ne réécrit la donnée. Le classement ne juge que l'enveloppe, le texte JSON et sa
 * version : la forme du contenu reste au lecteur de chaque donnée.
 *
 * Après une modification : relancer `npm test` et changer la version du kit.
 */

/** Ce qu'une lecture conclut d'une donnée partagée. */
export type EtatDeLaDonnee = 'absente' | 'illisible' | 'refusee' | 'ancienne' | 'courante' | 'future';

export type DonneeLue<T> =
  | { readonly etat: 'absente' }
  | { readonly etat: 'illisible'; readonly cause: 'json' | 'forme' | 'version'; readonly version?: number }
  | { readonly etat: 'refusee' }
  | { readonly etat: 'ancienne'; readonly version: number; readonly valeur: T }
  | { readonly etat: 'courante'; readonly version: number; readonly valeur: T }
  | { readonly etat: 'future'; readonly version: number };

/** Les versions qu'un lecteur reconnaît. */
export interface FenetreDeVersions {
  /** Le champ qui porte la version : `version` ou `formatVersion`. */
  readonly champ: string;
  readonly courante: number;
  /** La plus ancienne version lue ; en dessous, la donnée est illisible. */
  readonly premiere: number;
  /** La version d'un objet dont le champ n'est pas un nombre. Absent : un tel objet est illisible. */
  readonly parDefaut?: number;
}

/**
 * Classe un texte rangé selon la fenêtre. Un classement de texte ne rend jamais `refusee` : seule `lireLaDonnee`
 * la produit.
 */
export function classerLaDonnee(
  texte: string | undefined,
  fenetre: FenetreDeVersions,
): Exclude<DonneeLue<Record<string, unknown>>, { readonly etat: 'refusee' }> {
  if (texte === undefined || texte === '') return { etat: 'absente' };
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { etat: 'illisible', cause: 'json' };
  }
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return { etat: 'illisible', cause: 'forme' };
  const objet = brut as Record<string, unknown>;

  const lue = objet[fenetre.champ];
  const version = typeof lue === 'number' ? lue : fenetre.parDefaut;
  if (version === undefined || !Number.isInteger(version) || version < 0) return { etat: 'illisible', cause: 'version' };
  if (version > fenetre.courante) return { etat: 'future', version };
  if (version < fenetre.premiere) return { etat: 'illisible', cause: 'version', version };
  return { etat: version < fenetre.courante ? 'ancienne' : 'courante', version, valeur: objet };
}

/** Appelle `lire`, qui touche Figma ; une exception donne `refusee`, jamais `absente`. */
export function lireLaDonnee<T>(lire: () => string, classer: (texte: string) => DonneeLue<T>): DonneeLue<T> {
  let texte: string;
  try {
    texte = lire();
  } catch {
    return { etat: 'refusee' };
  }
  return classer(texte);
}
