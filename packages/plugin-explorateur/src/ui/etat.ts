/**
 * L'état de l'interface : le relevé courant et ses dérivés, la navigation
 * et les deux contextes. Les vues lisent cet état et demandent un rendu ;
 * aucune ne garde de copie du relevé.
 *
 * Un nouveau relevé, ou une simulation, reconstruit l'index et le résolveur :
 * toutes les résolutions mémorisées tombent d'un coup.
 */
import type { LectureDeComposant } from '../composant';
import type { Disposition } from '../fenetre';
import { arbreDeCollection, commencePar, segmentsDeGroupe, type NoeudDeGroupe } from '../groupes';
import { familles, indexer, modesDeFamille, type Index } from '../indexation';
import type { Import } from '../integrations/contrats';
import type { AssociationDeCran } from '../integrations/palettes';
import type { SujetSelectionne } from '../messages';
import type { Releve, TypeDeVariable, VariableRelevee } from '../modele';
import { PREFERENCES_PAR_DEFAUT, type Preferences } from '../preferences';
import { creerResolveur, type Contexte, type Resolveur } from '../resolution';

export type Onglet = 'table' | 'comparer' | 'dependants' | 'diagnostics' | 'integrations' | 'releves';

export const ONGLETS: readonly Onglet[] = ['table', 'comparer', 'dependants', 'diagnostics', 'integrations', 'releves'];

/** L'image d'un sujet, gardée sous une URL de blob, et la zone qu'elle couvre dans la page. */
export interface ApercuRecu {
  readonly sujet: string;
  readonly url: string;
  readonly largeur: number;
  readonly hauteur: number;
  readonly origine: { readonly x: number; readonly y: number };
}

/** Un composant lu et affiché : sa lecture, l'index de son relevé, le calque de sa portée et son image. */
export interface ComposantAffiche {
  readonly lecture: LectureDeComposant;
  readonly index: Index;
  readonly portee: string;
  readonly apercu: ApercuRecu | null;
}

/**
 * La vue composant. `demande` numérote la dernière lecture demandée : une
 * réponse d'une autre demande est ignorée. `pile` porte les composants
 * quittés pour ouvrir l'un de leurs composants imbriqués.
 */
export interface EtatDuComposant {
  demande: number;
  statut: 'vide' | 'en-cours' | 'lu' | 'echouee';
  /** Le message de la lecture qui a levé. */
  message: string;
  lecture: LectureDeComposant | null;
  index: Index | null;
  pile: ComposantAffiche[];
  portee: string | null;
  apercu: ApercuRecu | null;
  /** Ce que la sélection de Figma désigne, d'après le dernier message `selection`. */
  selection: SujetSelectionne | null;
  ignores: number;
  /** Ce que la réponse attendue fait du composant affiché : vrai l'empile, faux le remplace. */
  empiler: boolean;
  /** Vrai quand la lecture attendue est celle de la sélection : sa portée vient alors de la sélection. */
  deLaSelection: boolean;
}

export interface Filtres {
  readonly type: TypeDeVariable | 'tous';
  readonly nature: 'toutes' | 'alias' | 'directe';
  readonly provenance: 'toutes' | 'locale' | 'distante';
  /** Restreint la liste aux variables d'un constat de diagnostic. */
  readonly concernees: boolean;
}

export const FILTRES_PAR_DEFAUT: Filtres = { type: 'tous', nature: 'toutes', provenance: 'toutes', concernees: false };

/** Ce que la table montre et la variable que l'inspecteur épingle. */
export interface Position {
  readonly collection: string | null;
  readonly groupe: readonly string[];
  readonly recherche: string;
  readonly filtres: Filtres;
  readonly inspectee: string | null;
}

export type Lecture =
  | { readonly statut: 'attente' }
  | { readonly statut: 'en-cours'; readonly demande: number; readonly phase: string; readonly fait: number; readonly total: number }
  | { readonly statut: 'annulee' }
  | { readonly statut: 'echouee'; readonly message: string };

export interface Etat {
  releve: Releve | null;
  /** Le relevé lu dans Figma, conservé pendant une simulation. */
  releveOriginal: Releve | null;
  index: Index | null;
  resolveur: Resolveur | null;
  arbres: NoeudDeGroupe[];
  lecture: Lecture;
  position: Position;
  replies: Set<string>;
  onglet: Onglet;
  contexte: Contexte;
  contexteB: Contexte;
  preferences: Preferences;
  /** Les variables que les constats concernent, calculées à l'ouverture des diagnostics. */
  concernees: Set<string> | null;
  /** Les contrats et fichiers de tokens importés, en mémoire. */
  imports: Import[];
  /** Le texte de la recette UCM Palettes lu à la dernière demande ; `null` avant toute lecture. */
  recette: { readonly demande: number; readonly texte: string | null } | null;
  /** Les associations de variables à un cran de palette, en mémoire. */
  crans: Map<string, AssociationDeCran>;
  /** La disposition de la fenêtre, large avant l'annonce du sandbox. La bascule de la barre la change. */
  disposition: Disposition;
  composant: EtatDuComposant;
}

export function etatInitial(): Etat {
  return {
    releve: null,
    releveOriginal: null,
    index: null,
    resolveur: null,
    arbres: [],
    lecture: { statut: 'attente' },
    position: { collection: null, groupe: [], recherche: '', filtres: FILTRES_PAR_DEFAUT, inspectee: null },
    replies: new Set(),
    onglet: 'table',
    contexte: {},
    contexteB: {},
    preferences: PREFERENCES_PAR_DEFAUT,
    concernees: null,
    imports: [],
    recette: null,
    crans: new Map(),
    disposition: 'large',
    composant: { demande: 0, statut: 'vide', message: '', lecture: null, index: null, pile: [], portee: null, apercu: null, selection: null, ignores: 0, empiler: false, deLaSelection: true },
  };
}

/**
 * Pose un relevé. La navigation garde sa collection, son groupe et le token
 * inspecté quand ils existent encore ; sinon elle ouvre la première collection.
 * Le contexte B prend, pour chaque famille, un mode autre que celui de A.
 */
export function poserReleve(etat: Etat, releve: Releve, original = true): void {
  etat.releve = releve;
  if (original) etat.releveOriginal = releve;
  const index = indexer(releve);
  etat.index = index;
  etat.resolveur = creerResolveur(index);
  etat.arbres = releve.collections.map((collection) => arbreDeCollection(collection, index.variables));
  etat.concernees = null;
  const garderContexte = (contexte: Contexte): Contexte => Object.fromEntries(Object.entries(contexte).filter(([famille, mode]) => modesDeFamille(index, famille).some((candidat) => candidat.mode.id === mode)));
  etat.contexte = garderContexte(etat.contexte);
  const contexteB: Record<string, string> = { ...garderContexte(etat.contexteB) };
  for (const famille of familles(index)) {
    if (contexteB[famille.id] !== undefined) continue;
    const modes = modesDeFamille(index, famille.id);
    if (modes.length < 2) continue;
    const actuel = etat.contexte[famille.id] ?? famille.modeParDefaut;
    contexteB[famille.id] = (modes.find((candidat) => candidat.mode.id !== actuel) ?? modes[0]).mode.id;
  }
  etat.contexteB = contexteB;
  const { position } = etat;
  const collection = position.collection && index.collections.has(position.collection) ? position.collection : (releve.collections[0]?.id ?? null);
  const inspectee = position.inspectee && index.variables.has(position.inspectee) ? position.inspectee : null;
  etat.position = { ...position, collection, groupe: collection === position.collection ? position.groupe : [], inspectee };
  // À la première lecture, l'arbre montre les collections et les groupes de premier niveau de la collection ouverte.
  if (etat.replies.size === 0) {
    for (const arbre of etat.arbres) {
      if (arbre.collection !== collection) etat.replies.add(arbre.cle);
      for (const enfant of arbre.enfants) etat.replies.add(enfant.cle);
    }
  }
}

/** Vrai quand une variable passe les filtres. La recherche est traitée à part. */
export function passeLesFiltres(etat: Etat, variable: VariableRelevee): boolean {
  const { filtres } = etat.position;
  if (filtres.type !== 'tous' && variable.type !== filtres.type) return false;
  if (filtres.provenance === 'locale' && variable.distante) return false;
  if (filtres.provenance === 'distante' && !variable.distante) return false;
  if (filtres.nature !== 'toutes' && etat.index) {
    const collection = etat.index.collections.get(variable.collection);
    const premiere = collection ? variable.valeurs[collection.modeParDefaut] ?? Object.values(variable.valeurs)[0] : undefined;
    const estAlias = Object.values(variable.valeurs).some((valeur) => valeur.nature === 'alias');
    if (filtres.nature === 'alias' && !estAlias) return false;
    if (filtres.nature === 'directe' && (estAlias || !premiere)) return false;
  }
  if (filtres.concernees && etat.concernees && !etat.concernees.has(variable.id)) return false;
  return true;
}

/** Le texte cherché d'une variable : nom, collection, description et valeur terminale du contexte actif. */
function texteCherche(etat: Etat, variable: VariableRelevee, valeur: (id: string) => string): string {
  const collection = etat.index?.collections.get(variable.collection)?.nom ?? '';
  return `${variable.nom}\n${collection}\n${variable.description}\n${valeur(variable.id)}`.toLocaleLowerCase('fr');
}

/**
 * Les variables affichées : toute la collection, un groupe et ses
 * descendants, ou, pendant une recherche, toutes les collections.
 */
export function variablesAffichees(etat: Etat, valeur: (id: string) => string): VariableRelevee[] {
  const { index, position } = etat;
  if (!index) return [];
  const terme = position.recherche.trim().toLocaleLowerCase('fr');
  if (terme) {
    return index.releve.variables.filter((variable) => passeLesFiltres(etat, variable) && texteCherche(etat, variable, valeur).includes(terme));
  }
  const collection = position.collection ? index.collections.get(position.collection) : undefined;
  if (!collection) return [];
  const liste: VariableRelevee[] = [];
  for (const id of collection.variables) {
    const variable = index.variables.get(id);
    if (!variable) continue;
    if (!commencePar(segmentsDeGroupe(variable.nom), position.groupe)) continue;
    if (passeLesFiltres(etat, variable)) liste.push(variable);
  }
  return liste;
}
