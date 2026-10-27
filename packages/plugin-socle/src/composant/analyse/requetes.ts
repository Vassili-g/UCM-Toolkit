/**
 * L'ossature des requêtes pures incrémentales : la clé d'une requête et les révisions de ses valeurs. Les dépendances lues
 * pendant un calcul et la validation à la demande viennent après ; ce module ne calcule rien.
 *
 * Une clé identifie une requête dans un document ouvert : son nom, ses arguments en forme canonique, la session du document
 * et la version de l'algorithme. Elle ne porte ni la génération d'interface ni l'identité d'analyse : une valeur calculée
 * pour une génération reste valable pour la suivante tant que ses entrées ne changent pas. La session du document n'est pas
 * persistée, donc une valeur d'un plugin précédent ne sert jamais ; la version d'algorithme s'incrémente quand un calcul
 * change, pour que les clés d'avant ne soient plus jamais retrouvées.
 *
 * Les révisions suivent le modèle des calculs incrémentaux : une révision globale monte quand un fait (une entrée) change
 * de valeur. Chaque valeur garde `revisionChangee`, la révision où sa valeur a changé pour la dernière fois, et
 * `revisionVerifiee`, la dernière révision où elle a été reconnue à jour. Une valeur recalculée égale à l'ancienne
 * (`egalesExactement`) garde sa `revisionChangee` : ce qui la lit n'a rien à rejouer.
 *
 * Le module ne connaît aucun type Figma ni aucun type du kit.
 */
import { egalesExactement } from './validation';

/** Identifiant d'un document ouvert, créé à l'ouverture du plugin et jamais écrit. */
export type SessionDuDocument = string;

/**
 * Le numéro de l'algorithme des requêtes. À monter dès qu'une requête, un argument ou un fait lu change de sens : la clé
 * change, et aucune valeur calculée avant n'est reprise.
 */
export const VERSION_DE_L_ALGORITHME = 1;

let sessionsCreees = 0;

/** Une session neuve : deux appels ne rendent jamais la même, même dans un module rechargé (la part aléatoire). */
export function creerLaSessionDuDocument(): SessionDuDocument {
  sessionsCreees += 1;
  return `doc${sessionsCreees}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Les clés d'objet qu'aucun argument ne porte : la génération d'interface et l'identité d'analyse. */
const CLES_INTERDITES: ReadonlySet<string> = new Set(['generation', 'identite']);

/**
 * La forme canonique d'un argument, une chaîne que seule une valeur identique produit :
 * - les chaînes entre guillemets, séparateurs et guillemets échappés ; `1` et `'1'` diffèrent ;
 * - `NaN` et `-0` ont leur propre forme, comme pour `egalesExactement` ;
 * - les listes, `Map` et `Set` gardent leur ordre, parce qu'une requête qui les parcourt le voit ;
 * - les objets simples ordonnent leurs clés : l'ordre d'écriture d'un argument n'identifie pas la requête.
 * Un objet qui n'est pas simple (nœud Figma, instance de classe, date), une fonction, un symbole, un cycle ou une clé
 * `generation` ou `identite` lèvent : une clé instable ou qui dépend de l'interface serait fausse sans le dire.
 */
export function formeCanonique(valeur: unknown): string {
  return canoniser(valeur, []);
}

function canoniser(valeur: unknown, ancetres: object[]): string {
  switch (typeof valeur) {
    case 'string': return JSON.stringify(valeur);
    case 'number': return Object.is(valeur, -0) ? 'n:-0' : `n:${valeur}`;
    case 'boolean': return valeur ? 'true' : 'false';
    case 'bigint': return `b:${valeur}`;
    case 'undefined': return 'undefined';
    case 'object': break;
    default: throw new TypeError(`Une clé de requête ne porte pas de ${typeof valeur}.`);
  }
  if (valeur === null) return 'null';
  if (ancetres.includes(valeur)) throw new TypeError('Une clé de requête ne porte pas de cycle.');
  const chemin = [...ancetres, valeur];
  if (Array.isArray(valeur)) {
    return `[${Array.from({ length: valeur.length }, (_, rang) => (rang in valeur ? canoniser(valeur[rang], chemin) : '<vide>')).join(',')}]`;
  }
  if (valeur instanceof Map) return `Map[${[...valeur].map(([cle, contenu]) => `${canoniser(cle, chemin)}=>${canoniser(contenu, chemin)}`).join(',')}]`;
  if (valeur instanceof Set) return `Set[${[...valeur].map((element) => canoniser(element, chemin)).join(',')}]`;
  const prototype = Object.getPrototypeOf(valeur) as unknown;
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('Une clé de requête ne porte que des objets simples.');
  const objet = valeur as Record<string, unknown>;
  const cles = Object.keys(objet).sort();
  const interdite = cles.find((cle) => CLES_INTERDITES.has(cle));
  if (interdite !== undefined) throw new TypeError(`Une clé de requête ne porte pas de « ${interdite} » : ni génération d’interface ni identité d’analyse.`);
  return `{${cles.map((cle) => `${JSON.stringify(cle)}:${canoniser(objet[cle], chemin)}`).join(',')}}`;
}

/** Les quatre éléments d'une clé, dans cet ordre. Rien d'autre ne l'identifie. */
export interface ElementsDeCle {
  readonly version: number;
  readonly session: SessionDuDocument;
  readonly nom: string;
  readonly arguments: string;
}

/**
 * La clé complète de la requête `nom` appelée avec `argumentsDeLaRequete`, dans la session `session` et la version
 * `version` de l'algorithme. Deux appels de mêmes éléments rendent la même chaîne.
 */
export function cleDeRequete(
  nom: string,
  argumentsDeLaRequete: readonly unknown[],
  session: SessionDuDocument,
  version: number = VERSION_DE_L_ALGORITHME,
): string {
  return JSON.stringify([version, session, nom, formeCanonique(argumentsDeLaRequete)]);
}

/** Relit les éléments d'une clé rendue par `cleDeRequete`. */
export function elementsDeCle(cle: string): ElementsDeCle {
  const [version, session, nom, canonique] = JSON.parse(cle) as [number, string, string, string];
  return { version, session, nom, arguments: canonique };
}

/** Une valeur et les deux révisions qui la situent. */
export interface EtatDeRevision {
  readonly valeur: unknown;
  /** La dernière révision où la valeur est reconnue à jour. */
  readonly revisionVerifiee: number;
  /** La révision où la valeur a changé pour la dernière fois ; une valeur égale à la précédente ne la monte pas. */
  readonly revisionChangee: number;
}

export interface RegistreDeRevisions {
  /** La révision globale : monte d'un cran à chaque fait dont la valeur diffère. */
  readonly revision: number;
  /**
   * Pose un fait. Une clé nouvelle ou une valeur qui diffère (`egalesExactement`) monte la révision globale et date la
   * valeur de cette révision ; une valeur égale ne touche à rien. Rend vrai si la valeur a changé. Lève sur la clé d'une
   * requête.
   */
  poserLEntree(cle: string, valeur: unknown): boolean;
  /**
   * Range le résultat d'un calcul de requête à la révision courante, qui la vérifie. Sa `revisionChangee` ne bouge que si le
   * résultat diffère du précédent : rend vrai dans ce cas, faux sur un résultat égal, qui arrête la propagation. Ne monte
   * pas la révision globale. Lève sur la clé d'un fait.
   */
  poserLaRequete(cle: string, valeur: unknown): boolean;
  /** Reconnaît la valeur de `cle` à jour à la révision courante, sans la recalculer. Sans effet sur une clé inconnue. */
  verifier(cle: string): void;
  /** La valeur et les révisions de `cle`, `undefined` si rien n'y est posé. */
  etat(cle: string): EtatDeRevision | undefined;
}

interface Enregistrement {
  readonly genre: 'entree' | 'requete';
  valeur: unknown;
  revisionVerifiee: number;
  revisionChangee: number;
}

export function creerLeRegistreDeRevisions(): RegistreDeRevisions {
  let revision = 0;
  const enregistrements = new Map<string, Enregistrement>();
  const genreAttendu = (cle: string, genre: Enregistrement['genre']): Enregistrement | undefined => {
    const existant = enregistrements.get(cle);
    if (existant && existant.genre !== genre) throw new Error(`La clé ${cle} est déjà posée comme ${existant.genre}.`);
    return existant;
  };
  return {
    get revision() { return revision; },
    poserLEntree(cle, valeur) {
      const existant = genreAttendu(cle, 'entree');
      if (existant && egalesExactement(existant.valeur, valeur)) return false;
      revision += 1;
      enregistrements.set(cle, { genre: 'entree', valeur, revisionVerifiee: revision, revisionChangee: revision });
      return true;
    },
    poserLaRequete(cle, valeur) {
      const existant = genreAttendu(cle, 'requete');
      if (existant && egalesExactement(existant.valeur, valeur)) {
        existant.revisionVerifiee = revision;
        return false;
      }
      enregistrements.set(cle, { genre: 'requete', valeur, revisionVerifiee: revision, revisionChangee: revision });
      return true;
    },
    verifier(cle) {
      const existant = enregistrements.get(cle);
      if (existant) existant.revisionVerifiee = revision;
    },
    etat(cle) {
      const existant = enregistrements.get(cle);
      return existant && { valeur: existant.valeur, revisionVerifiee: existant.revisionVerifiee, revisionChangee: existant.revisionChangee };
    },
  };
}
