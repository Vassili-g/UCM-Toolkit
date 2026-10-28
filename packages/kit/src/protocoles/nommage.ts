/**
 * Les règles du fichier qui changent un nom : l'écriture des groupes et des variables, les termes du vocabulaire, les termes UCM
 * écartés, les termes ordinaires et les collections exclues. UCM Architect les range dans `ESPACE_ARCHITECT` et UCM Palettes
 * les relit pour nommer ses variables comme lui : ce module porte les clés, leur forme, leur écriture et leur lecture.
 *
 * Une entrée est un JSON qui porte `version: 1`. Une entrée illisible se lit comme absente. Une entrée d'une version plus
 * récente n'entre pas dans le calcul, mais `lireLesEntreesDeNommage` la nomme dans `futures`. Une lecture ne réécrit rien.
 *
 * Le module lit des couples (clé, texte) et ne touche à aucun objet Figma.
 *
 * Après une modification : relancer `npm test`, relancer les tests d'Architect et de Palettes, et changer la version du kit.
 */
import {
  CATEGORIES_DE_NOM, REGISTRE_CASSES, REGISTRE_SEPARATEURS,
  type Convention, type ConventionsParCategorie,
} from '../referentiel/conventions.js';
import type { Mots, TermePersonnalise, VocabulaireDuFichier } from '../referentiel/harmonisation.js';
import { classerLaDonnee, type FenetreDeVersions } from './donnee.js';

export const VERSION_DES_REGLES = 1;
export const CLE_ECRITURE = 'ecriture';
export const CLE_EXCLUES = 'exclues';
/** Clé de la convention de la v1, lue seulement quand `ecriture` manque. */
export const CLE_CONVENTIONS_V1 = 'conventions';

/** La seule définition des préfixes des clés rangées dans Figma ; Architect écrit avec, `lireLesEntreesDeNommage` lit avec. */
export const PREFIXES_DE_NOMMAGE = { terme: 'terme:', ecart: 'ecart:', ordinaire: 'ordinaire:' } as const;

/** Les entrées de règles ne sont lues qu'à la version 1 : toute version supérieure est future. */
export const FENETRE_DES_REGLES: FenetreDeVersions = { champ: 'version', courante: VERSION_DES_REGLES, premiere: VERSION_DES_REGLES };

// Les clés
//
// Le préfixe `terme:` sert à deux clés. Celle-ci est rangée dans Figma : les mots du terme joints par une espace, casse gardée
// (`terme:font size`). La règle de l'analyse, `cleDeRegleDuTerme` du référentiel, vit en mémoire : mots en minuscules joints par
// `-` (`terme:font-size`).

/** La clé rangée du terme personnalisé de ces mots : `terme:font size`. */
export const cleTerme = (mots: Mots): string => `${PREFIXES_DE_NOMMAGE.terme}${mots.join(' ')}`;
/** La clé rangée d'un terme UCM que le fichier n'applique pas, désigné par son identifiant. */
export const cleEcart = (id: string): string => `${PREFIXES_DE_NOMMAGE.ecart}${id}`;
/** La clé rangée d'un terme ordinaire, désigné par ses mots en minuscules joints par `-`. */
export const cleOrdinaire = (cle: string): string => `${PREFIXES_DE_NOMMAGE.ordinaire}${cle}`;

export interface EcritureChoisie { readonly groupes: Convention; readonly variables: Convention }

/** Les cinq règles de nommage rangées par Architect et lues par les deux plugins. */
export type RegleDeNommage =
  | { readonly type: 'ecriture'; readonly ecriture: EcritureChoisie }
  | { readonly type: 'terme'; readonly terme: TermePersonnalise }
  | { readonly type: 'ecart'; readonly id: string }
  | { readonly type: 'ordinaire'; readonly cle: string }
  | { readonly type: 'exclues'; readonly ids: readonly string[] };

export interface EcritureDeRegle { readonly cle: string; readonly texte: string | null }

/** Une règle de nommage devient sa clé et son texte versionné dans `ESPACE_ARCHITECT`. */
export function entreeDeNommage(regle: RegleDeNommage): { cle: string; texte: string } {
  const version = VERSION_DES_REGLES;
  switch (regle.type) {
    case 'ecriture': return { cle: CLE_ECRITURE, texte: JSON.stringify({ version, groupes: regle.ecriture.groupes, variables: regle.ecriture.variables }) };
    case 'terme': return { cle: cleTerme(regle.terme.terme), texte: JSON.stringify({ version, terme: regle.terme.terme, remplace: regle.terme.remplace,
      ...(regle.terme.definition ? { definition: regle.terme.definition } : {}) }) };
    case 'ecart': return { cle: cleEcart(regle.id), texte: JSON.stringify({ version }) };
    case 'ordinaire': return { cle: cleOrdinaire(regle.cle), texte: JSON.stringify({ version }) };
    case 'exclues': return { cle: CLE_EXCLUES, texte: JSON.stringify({ version, ids: trier(regle.ids) }) };
  }
}

/** Le port de stockage des règles dans l'espace partagé du fichier. */
export interface StockageDeRegles {
  cles(): readonly string[];
  lire(cle: string): string;
  ecrire(cle: string, texte: string): void;
  effacer(cle: string): void;
}

/** Range dans l'ordre et remet chaque texte d'avant, au mieux, si une écriture échoue. L'erreur d'origine est relancée. */
export function rangerLesEcritures(stockage: StockageDeRegles, ecritures: readonly EcritureDeRegle[]): void {
  const touchees = new Map<string, string>();
  try {
    for (const { cle, texte } of ecritures) {
      if (!touchees.has(cle)) touchees.set(cle, stockage.lire(cle));
      if (texte === null || texte === '') stockage.effacer(cle);
      else stockage.ecrire(cle, texte);
    }
  } catch (cause) {
    for (const [cle, avant] of touchees) {
      try {
        if (avant === '') stockage.effacer(cle);
        else stockage.ecrire(cle, avant);
      } catch { /* retour au mieux */ }
    }
    throw cause;
  }
}

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

/** Un JSON objet portant `version: 1`, sinon rien. Une entrée d'une version plus récente rend aussi `undefined` : `lireLesEntreesDeNommage` la nomme. */
export function lireEntree(texte: string): Record<string, unknown> | undefined {
  const classee = classerLaDonnee(texte, FENETRE_DES_REGLES);
  return classee.etat === 'courante' ? classee.valeur : undefined;
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
  || apres(cle, PREFIXES_DE_NOMMAGE.terme) !== undefined || apres(cle, PREFIXES_DE_NOMMAGE.ecart) !== undefined
  || apres(cle, PREFIXES_DE_NOMMAGE.ordinaire) !== undefined;

export interface EntreesDeNommage {
  readonly ecriture?: EcritureChoisie;
  /** Vrai quand `ecriture` vient de la clé `conventions` de la v1 et n'est pas encore rangée. */
  readonly ecritureDeLaV1: boolean;
  readonly termes: readonly TermePersonnalise[];
  readonly ecartsUcm: readonly string[];
  /** Les termes (mots en minuscules joints par `-`) que le fichier traite comme des mots ordinaires, jamais comme des noms. */
  readonly ordinaires: readonly string[];
  readonly collectionsExclues: readonly string[];
  /** Les clés de nommage dont l'entrée vient d'une version plus récente, triées. Le calcul les ignore. */
  readonly futures: readonly string[];
}

/**
 * Lit les entrées de l'espace qui changent un nom : `ecriture` (à défaut, `conventions` de la v1), `terme:`, `ecart:`,
 * `ordinaire:` et `exclues`. Les autres clés sont ignorées. C'est l'analyseur unique : UCM Architect l'appelle
 * pour toutes ses règles et UCM Palettes pour les seules qui nomment.
 *
 * Une entrée de nommage d'une version plus récente est rangée dans `futures` et n'entre pas dans le calcul.
 */
export function lireLesEntreesDeNommage(entrees: ReadonlyMap<string, string>): EntreesDeNommage {
  let ecriture: EcritureChoisie | undefined;
  const termes: TermePersonnalise[] = [];
  const ecartsUcm: string[] = [];
  const ordinaires: string[] = [];
  const futures: string[] = [];
  let exclues: string[] = [];
  for (const [cle, texte] of entrees) {
    if (!estCleDeNommage(cle)) continue;
    const classee = classerLaDonnee(texte, FENETRE_DES_REGLES);
    if (classee.etat === 'future') { futures.push(cle); continue; }
    if (cle === CLE_CONVENTIONS_V1 || classee.etat !== 'courante') continue;
    const brut = classee.valeur;
    let reste: string | undefined;
    if (cle === CLE_ECRITURE) ecriture = lireEcriture(brut);
    else if (cle === CLE_EXCLUES) { if (estListeDeTextes(brut.ids)) exclues = trier(brut.ids); }
    else if ((reste = apres(cle, PREFIXES_DE_NOMMAGE.terme)) !== undefined) {
      const mots = motsDe(reste);
      const terme = mots && lireTerme(mots, brut);
      if (terme) termes.push(terme);
    } else if ((reste = apres(cle, PREFIXES_DE_NOMMAGE.ecart)) !== undefined) ecartsUcm.push(reste);
    else if ((reste = apres(cle, PREFIXES_DE_NOMMAGE.ordinaire)) !== undefined) { if (estMot(reste)) ordinaires.push(reste); }
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
    futures: trier(futures),
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
 * `conventions` de la v1 existe. UCM Architect n'a alors pas fini son premier lancement.
 *
 * `null` aussi quand `ecriture` ou `exclues` vient d'une version plus récente : sans elle, le lecteur ne sait ni comment écrire
 * ni quelles collections laisser. UCM Palettes garde alors la protection de ses variables et son nommage par défaut. Une entrée
 * `terme:`, `ecart:` ou `ordinaire:` future ne change rien pour ce lecteur.
 */
export function lireReglesDeNommage(couples: Iterable<readonly [string, string]>): ReglesDeNommage | null {
  const lues = lireLesEntreesDeNommage(new Map(couples));
  if (!lues.ecriture || lues.ecritureDeLaV1) return null;
  if (lues.futures.includes(CLE_ECRITURE) || lues.futures.includes(CLE_EXCLUES)) return null;
  return { ecriture: lues.ecriture, vocabulaire: vocabulaireDeNommage(lues), ordinaires: lues.ordinaires, collectionsExclues: lues.collectionsExclues };
}
