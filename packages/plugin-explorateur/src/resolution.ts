/**
 * La chaîne explicative d'une variable dans un contexte de modes.
 *
 * Un contexte choisit au plus un mode par famille (une collection et ses
 * extensions). Une famille absente du contexte prend le `defaultModeId`
 * déclaré par sa collection, jamais la première colonne, et jamais le mode
 * d'une autre collection rapproché par son nom.
 *
 * Le parcours est itératif. Un cycle se détecte sur les couples variable–mode
 * du chemin courant : deux branches qui atteignent la même cible n'en forment
 * pas un. Au-delà de `BORNE_DES_ETAPES`, le résultat est « interrompu », sans
 * conclure à un cycle.
 *
 * Un alias de couleur peut porter une opacité. Elle multiplie l'alpha de la
 * couleur terminale, et les opacités d'une chaîne se multiplient entre elles.
 */
import { descendDe, familleDe, type Index } from './indexation';
import { natureAttendue, type CollectionRelevee, type TypeDeVariable, type ValeurSource, type ValeurTerminale } from './modele';

export const BORNE_DES_ETAPES = 10_000;

/** Un mode par famille, par identifiant de famille. */
export type Contexte = Readonly<Record<string, string>>;

/** D'où vient le mode retenu à une étape. */
export type OrigineDuMode = 'contexte' | 'defaut' | 'calque-explicite' | 'calque-herite';

export interface Etape {
  readonly variable: string;
  /** La collection de la variable. */
  readonly collection: string;
  /** Le mode retenu, éventuellement celui d'une extension. */
  readonly mode: string;
  readonly origine: OrigineDuMode;
  /** La valeur lue à cette étape, alias compris. */
  readonly source: ValeurSource;
  /** L'extension dont vient la valeur, quand une surcharge l'a remplacée. */
  readonly surcharge?: string;
}

export type Resultat =
  | { readonly statut: 'resolu'; readonly etapes: readonly Etape[]; readonly valeur: ValeurTerminale }
  /** La cible d'un alias n'a pas été lue : rien ne prouve qu'elle soit supprimée. */
  | { readonly statut: 'inaccessible'; readonly etapes: readonly Etape[]; readonly cible: string }
  /** La variable n'a aucune valeur pour le mode retenu. */
  | { readonly statut: 'mode-absent'; readonly etapes: readonly Etape[]; readonly variable: string; readonly mode: string }
  /** Le chemin revient sur un couple variable–mode déjà parcouru ; `debut` est le rang de sa première visite. */
  | { readonly statut: 'cycle'; readonly etapes: readonly Etape[]; readonly debut: number }
  /** `variable` porte le type ou la valeur en cause : la cible d'un alias, ou la dernière étape. */
  | { readonly statut: 'type-incompatible'; readonly etapes: readonly Etape[]; readonly variable: string; readonly attendu: TypeDeVariable; readonly obtenu: string }
  | { readonly statut: 'non-pris-en-charge'; readonly etapes: readonly Etape[]; readonly brut: string }
  | { readonly statut: 'interrompu'; readonly etapes: readonly Etape[] };

export type StatutDeResolution = Resultat['statut'];

/** Ce qu'un calque réel fixe pour une famille : son mode, explicite ou hérité. */
export interface ModeDeCalque {
  readonly mode: string;
  readonly explicite: boolean;
}

export interface OptionsDeResolution {
  /** Modes lus sur un calque, par identifiant de collection ; ils priment sur le contexte. */
  readonly calque?: Readonly<Record<string, ModeDeCalque>>;
}

/** Le mode retenu pour une collection, et pourquoi. */
export function modePour(index: Index, collection: CollectionRelevee, contexte: Contexte, options: OptionsDeResolution = {}): { mode: string; origine: OrigineDuMode } {
  const famille = familleDe(index, collection.id);
  const duCalque = options.calque?.[collection.id] ?? options.calque?.[famille];
  if (duCalque && accepteLeMode(index, collection, duCalque.mode)) {
    return { mode: duCalque.mode, origine: duCalque.explicite ? 'calque-explicite' : 'calque-herite' };
  }
  const choisi = contexte[famille];
  if (choisi !== undefined && accepteLeMode(index, collection, choisi)) return { mode: choisi, origine: 'contexte' };
  return { mode: collection.modeParDefaut, origine: 'defaut' };
}

/** Vrai quand `mode` appartient à la collection ou à l'une de ses extensions. */
function accepteLeMode(index: Index, collection: CollectionRelevee, mode: string): boolean {
  const declarante = index.collectionDuMode.get(mode);
  return declarante !== undefined && descendDe(index, declarante, collection.id);
}

/**
 * La valeur d'une variable pour un mode. Un mode d'extension lit d'abord la
 * surcharge de l'extension, puis remonte au mode parent. Un mode inconnu de
 * la chaîne rend `undefined`.
 */
export function valeurPourLeMode(index: Index, variable: string, collection: string, mode: string): { valeur: ValeurSource; surcharge?: string } | undefined {
  const declarante = index.collectionDuMode.get(mode);
  if (declarante === undefined) return undefined;
  if (declarante === collection) {
    const valeur = index.variables.get(variable)?.valeurs[mode];
    return valeur === undefined ? undefined : { valeur };
  }
  const extension = index.collections.get(declarante);
  if (!extension?.extension) return undefined;
  const surcharge = extension.extension.surcharges[variable]?.[mode];
  if (surcharge !== undefined) return { valeur: surcharge, surcharge: declarante };
  const parent = extension.modes.find((candidat) => candidat.id === mode)?.parent;
  return parent === undefined ? undefined : valeurPourLeMode(index, variable, collection, parent);
}

/** Résout une variable dans un contexte. Le résultat porte toutes les étapes connues. */
export function resoudre(index: Index, depart: string, contexte: Contexte, options: OptionsDeResolution = {}): Resultat {
  const etapes: Etape[] = [];
  const visites = new Map<string, number>();
  const typeDeDepart = index.variables.get(depart)?.type;
  let courante = depart;
  let opacite = 1;
  while (etapes.length < BORNE_DES_ETAPES) {
    const variable = index.variables.get(courante);
    const collection = variable ? index.collections.get(variable.collection) : undefined;
    if (!variable || !collection) return { statut: 'inaccessible', etapes, cible: courante };
    if (typeDeDepart !== undefined && variable.type !== typeDeDepart) {
      return { statut: 'type-incompatible', etapes, variable: courante, attendu: typeDeDepart, obtenu: variable.type };
    }
    const { mode, origine } = modePour(index, collection, contexte, options);
    const couple = `${courante}\u0000${mode}`;
    const deja = visites.get(couple);
    if (deja !== undefined) return { statut: 'cycle', etapes, debut: deja };
    visites.set(couple, etapes.length);
    const lue = valeurPourLeMode(index, courante, collection.id, mode);
    if (!lue) return { statut: 'mode-absent', etapes, variable: courante, mode };
    etapes.push({ variable: courante, collection: collection.id, mode, origine, source: lue.valeur, ...(lue.surcharge ? { surcharge: lue.surcharge } : {}) });
    const valeur = lue.valeur;
    if (valeur.nature === 'alias') {
      courante = valeur.cible;
      opacite *= valeur.opacite ?? 1;
      continue;
    }
    if (valeur.nature === 'non-prise-en-charge') return { statut: 'non-pris-en-charge', etapes, brut: valeur.brut };
    const attendue = natureAttendue(variable.type);
    if (attendue !== null && attendue !== valeur.nature) return { statut: 'type-incompatible', etapes, variable: courante, attendu: variable.type, obtenu: valeur.nature };
    if (valeur.nature === 'couleur' && opacite !== 1) return { statut: 'resolu', etapes, valeur: { nature: 'couleur', couleur: { ...valeur.couleur, a: valeur.couleur.a * opacite } } };
    return { statut: 'resolu', etapes, valeur };
  }
  return { statut: 'interrompu', etapes };
}

/** Le contexte d'une colonne : le mode de la colonne remplace celui de sa famille. */
export function contexteDeColonne(index: Index, contexte: Contexte, mode: string): Contexte {
  const collection = index.collectionDuMode.get(mode);
  if (collection === undefined) return contexte;
  return { ...contexte, [familleDe(index, collection)]: mode };
}

/** La signature d'un contexte, stable quel que soit l'ordre des clés. */
export function signatureDeContexte(contexte: Contexte): string {
  return JSON.stringify(Object.keys(contexte).sort().map((cle) => [cle, contexte[cle]]));
}

/**
 * Un résolveur mémorisé pour un index donné. La mémoire vit avec l'index :
 * un nouveau relevé ou une simulation construit un nouveau résolveur, ce qui
 * invalide d'un geste toutes les résolutions dépendantes.
 */
export function creerResolveur(index: Index) {
  const memoire = new Map<string, Map<string, Resultat>>();
  return {
    index,
    resoudre(variable: string, contexte: Contexte): Resultat {
      const signature = signatureDeContexte(contexte);
      let parVariable = memoire.get(signature);
      if (!parVariable) {
        parVariable = new Map();
        memoire.set(signature, parVariable);
      }
      const connu = parVariable.get(variable);
      if (connu) return connu;
      const resultat = resoudre(index, variable, contexte);
      parVariable.set(variable, resultat);
      return resultat;
    },
    /** Le nombre de résolutions mémorisées, pour les mesures. */
    taille(): number {
      let total = 0;
      for (const parVariable of memoire.values()) total += parVariable.size;
      return total;
    },
  };
}

export type Resolveur = ReturnType<typeof creerResolveur>;
