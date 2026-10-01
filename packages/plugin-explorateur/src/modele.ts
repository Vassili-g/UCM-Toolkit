/**
 * Le relevé : ce que le sandbox a lu des variables Figma, sérialisable pour
 * traverser la frontière vers l'interface. Le noyau (`groupes`, `indexation`,
 * `resolution`, `comparaison`) ne lit que ce modèle, jamais `figma` ni le DOM.
 *
 * Aucun nom de collection, de groupe ou de mode n'a de sens réservé ici :
 * l'architecture vient entièrement des données lues.
 */

/** Les types de valeur qu'une variable Figma déclare (`resolvedType`). */
export type TypeDeVariable = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN' | 'EASING' | 'TIMING';

export const TYPES_DE_VARIABLE: readonly TypeDeVariable[] = ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN', 'EASING', 'TIMING'];

/** Une couleur telle que Figma la range : composantes de 0 à 1, alpha compris. */
export interface Couleur {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * La valeur rangée pour un mode, avant toute résolution. Un alias garde
 * l'identifiant de sa cible. Une valeur que le plugin ne sait pas décrire
 * garde sa forme brute, lisible, sans valeur terminale inventée.
 */
export type ValeurSource =
  | { readonly nature: 'alias'; readonly cible: string }
  | { readonly nature: 'couleur'; readonly couleur: Couleur }
  | { readonly nature: 'nombre'; readonly nombre: number }
  | { readonly nature: 'texte'; readonly texte: string }
  | { readonly nature: 'booleen'; readonly booleen: boolean }
  | { readonly nature: 'courbe'; readonly courbe: string }
  | { readonly nature: 'non-prise-en-charge'; readonly brut: string };

/** Les natures terminales : tout sauf l'alias. */
export type ValeurTerminale = Exclude<ValeurSource, { nature: 'alias' }>;

/** Un mode de collection. `parent` n'existe que dans une collection étendue. */
export interface Mode {
  readonly id: string;
  readonly nom: string;
  readonly parent?: string;
}

/** Ce qu'une collection étendue ajoute à sa base. */
export interface Extension {
  readonly parent: string;
  readonly racine: string;
  /** Les surcharges par variable puis par mode de l'extension. */
  readonly surcharges: Readonly<Record<string, Readonly<Record<string, ValeurSource>>>>;
}

export interface CollectionRelevee {
  readonly id: string;
  readonly nom: string;
  /** La clé publiée, quand Figma la donne. */
  readonly cle: string | null;
  readonly distante: boolean;
  readonly masqueeALaPublication: boolean;
  readonly modes: readonly Mode[];
  readonly modeParDefaut: string;
  /** Dans l'ordre que Figma donne, sans les groupes. */
  readonly variables: readonly string[];
  readonly extension: Extension | null;
}

export interface VariableRelevee {
  readonly id: string;
  /** Le nom Figma exact : ses `/` font les groupes, rien d'autre. */
  readonly nom: string;
  readonly description: string;
  readonly cle: string | null;
  readonly distante: boolean;
  readonly masqueeALaPublication: boolean;
  readonly collection: string;
  readonly type: TypeDeVariable;
  readonly portees: readonly string[];
  readonly syntaxe: Readonly<Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>>;
  /** Par identifiant de mode de sa propre collection. */
  readonly valeurs: Readonly<Record<string, ValeurSource>>;
}

/**
 * Une cible demandée que la lecture n'a pas obtenue. `introuvable` dit que
 * Figma a rendu `null` ; `refusee`, que la lecture a levé. Aucune des deux ne
 * prouve une suppression.
 */
export interface LectureManquee {
  readonly id: string;
  readonly genre: 'variable' | 'collection';
  readonly issue: 'introuvable' | 'refusee';
  readonly message: string;
  /** La variable dont une valeur pointait cette cible, quand elle est connue. */
  readonly depuis?: string;
}

/** Ce que la lecture a pu couvrir, pour annoncer les limites sur les seules données concernées. */
export interface Capacites {
  readonly collectionsEtendues: boolean;
  readonly variablesDistantes: boolean;
}

export const FORMAT_DU_RELEVE = 1;

export interface Releve {
  readonly format: typeof FORMAT_DU_RELEVE;
  /** Augmente à chaque lecture terminée du même fichier. */
  readonly revision: number;
  readonly fichier: string;
  /** Millisecondes depuis l'époque Unix, posées par le sandbox à la fin de la lecture. */
  readonly luA: number;
  readonly collections: readonly CollectionRelevee[];
  readonly variables: readonly VariableRelevee[];
  readonly manquees: readonly LectureManquee[];
  readonly capacites: Capacites;
}

/** Le texte d'une valeur terminale, sans unité supposée ni transformation. */
export function texteDeValeur(valeur: ValeurTerminale): string {
  switch (valeur.nature) {
    case 'couleur':
      return hexaDeCouleur(valeur.couleur).hexa;
    case 'nombre':
      return String(valeur.nombre);
    case 'texte':
      return valeur.texte;
    case 'booleen':
      return valeur.booleen ? 'true' : 'false';
    case 'courbe':
      return valeur.courbe;
    case 'non-prise-en-charge':
      return valeur.brut;
  }
}

const deuxChiffres = (canal: number): string => canal.toString(16).padStart(2, '0').toUpperCase();

/**
 * L'hexadécimal à 8 bits d'une couleur, et si la conversion arrondit. Une
 * composante hors de [0, 1] est bornée : `arrondi` le signale aussi.
 */
export function hexaDeCouleur(couleur: Couleur): { hexa: string; arrondi: boolean } {
  let arrondi = false;
  const canal = (composante: number): number => {
    const borne = Math.min(1, Math.max(0, composante));
    const octet = Math.round(borne * 255);
    if (borne !== composante || Math.abs(octet / 255 - composante) > 1e-9) arrondi = true;
    return octet;
  };
  const rouge = canal(couleur.r);
  const vert = canal(couleur.g);
  const bleu = canal(couleur.b);
  const alpha = canal(couleur.a);
  const hexa = `#${deuxChiffres(rouge)}${deuxChiffres(vert)}${deuxChiffres(bleu)}${alpha === 255 ? '' : deuxChiffres(alpha)}`;
  return { hexa, arrondi };
}

/** Les composantes exactes d'une couleur, telles que Figma les range. */
export function composantesDeCouleur(couleur: Couleur): string {
  return `rgba(${couleur.r}, ${couleur.g}, ${couleur.b}, ${couleur.a})`;
}

/** Deux valeurs terminales égales, couleurs comparées composante par composante. */
export function valeursEgales(a: ValeurTerminale, b: ValeurTerminale): boolean {
  if (a.nature !== b.nature) return false;
  if (a.nature === 'couleur' && b.nature === 'couleur') {
    return a.couleur.r === b.couleur.r && a.couleur.g === b.couleur.g && a.couleur.b === b.couleur.b && a.couleur.a === b.couleur.a;
  }
  return texteDeValeur(a) === texteDeValeur(b);
}

/** La nature terminale qu'un type déclaré attend ; `null` quand aucune n'est vérifiable. */
export function natureAttendue(type: TypeDeVariable): ValeurTerminale['nature'] | null {
  switch (type) {
    case 'COLOR':
      return 'couleur';
    case 'FLOAT':
    case 'TIMING':
      return 'nombre';
    case 'STRING':
      return 'texte';
    case 'BOOLEAN':
      return 'booleen';
    case 'EASING':
      return 'courbe';
  }
}
