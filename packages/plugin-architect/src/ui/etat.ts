/**
 * L'état de l'interface : le relevé courant et ses dérivés, la navigation
 * et les deux contextes. Les vues lisent cet état et demandent un rendu ;
 * aucune ne garde de copie du relevé.
 *
 * Un nouveau relevé, ou une simulation, reconstruit l'index et le résolveur :
 * toutes les résolutions mémorisées tombent d'un coup.
 */
import type { LectureDeComposant } from '../composant';
import type { AnalyseRecue } from './composant/analyse';
import type { ArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { Disposition } from '../fenetre';
import { arbreDeCollection, commencePar, segmentsDeGroupe, type NoeudDeGroupe } from '../groupes';
import { indexer, modesDeFamille, type Index } from '../indexation';
import type { SujetSelectionne } from '../messages';
import type { PreparationVue } from '../messages/preparation';
import type { Releve, TypeDeVariable, VariableRelevee } from '../modele';
import { PREFERENCES_PAR_DEFAUT, type Preferences } from '../preferences';
import { creerResolveur, type Contexte, type Resolveur } from '../resolution';
import { variablesTrouvees } from './recherche/resultats';

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
}

export const FILTRES_PAR_DEFAUT: Filtres = { type: 'tous', nature: 'toutes', provenance: 'toutes' };

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
  contexte: Contexte;
  /** Vrai tant que la collection choisie dans l'arbre filtre la barre latérale ; la croix de la puce le met à faux jusqu'au prochain choix dans l'arbre. */
  filtreDeLaBarre: boolean;
  preferences: Preferences;
  /** La disposition de la fenêtre, large avant l'annonce du sandbox. La bascule de la barre la change. */
  disposition: Disposition;
  /** La déclaration UCM du fichier, que le sandbox annonce à l'ouverture et à chaque changement ; `null` avant l'annonce. */
  architecture: ArchitectureDuFichier | null;
  /** La library dont le fichier tire ses variables, quand il n'en a aucune en local ; `null` sinon. */
  bibliotheque: { readonly nom: string; readonly cleDuFichierDesTokens: string | null } | null;
  composant: EtatDuComposant;
  /** La dernière analyse du sandbox ; `null` avant la première. */
  analyse: AnalyseRecue | null;
  /** Les préparations rangées sur ce poste, les plus récentes d'abord, telles que le dernier message `preparations` les a rendues. */
  preparations: readonly PreparationVue[];
  /** Le panneau des constats du mode Composant : fermé à l'ouverture, et la largeur que la frontière donne à la vue quand il est ouvert. */
  panneau: { ouvert: boolean; largeurDeLaVue: number; onglet: OngletDuPanneau };
  /** La library de référence que la Configuration annonce ; `null` tant qu'elle n'a rien dit. */
  reference: { readonly library: string | null; readonly nom: string | null; readonly candidates: number } | null;
}

/** Les trois onglets du panneau des constats. */
export type OngletDuPanneau = 'corrections' | 'questions' | 'a-faire';

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
    contexte: {},
    filtreDeLaBarre: true,
    preferences: PREFERENCES_PAR_DEFAUT,
    disposition: 'large',
    architecture: null,
    bibliotheque: null,
    composant: { demande: 0, statut: 'vide', message: '', lecture: null, index: null, pile: [], portee: null, apercu: null, selection: null, ignores: 0, empiler: false, deLaSelection: true },
    analyse: null,
    preparations: [],
    panneau: { ouvert: false, largeurDeLaVue: 400, onglet: 'corrections' },
    reference: null,
  };
}

/**
 * Pose un relevé. La navigation garde sa collection, son groupe et le token
 * inspecté quand ils existent encore ; sinon elle ouvre la première collection.
 */
export function poserReleve(etat: Etat, releve: Releve, original = true): void {
  etat.releve = releve;
  if (original) etat.releveOriginal = releve;
  const index = indexer(releve);
  etat.index = index;
  etat.resolveur = creerResolveur(index);
  etat.arbres = releve.collections.map((collection) => arbreDeCollection(collection, index.variables));
  const garderContexte = (contexte: Contexte): Contexte => Object.fromEntries(Object.entries(contexte).filter(([famille, mode]) => modesDeFamille(index, famille).some((candidat) => candidat.mode.id === mode)));
  etat.contexte = garderContexte(etat.contexte);
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
  return true;
}

/** Le texte cherché d'une variable : nom, collection, description et valeur terminale du contexte actif. */
function texteCherche(etat: Etat, variable: VariableRelevee, valeur: (id: string) => string): string {
  const collection = etat.index?.collections.get(variable.collection)?.nom ?? '';
  return `${variable.nom}\n${collection}\n${variable.description}\n${valeur(variable.id)}`.toLocaleLowerCase('fr');
}

/**
 * Les variables affichées : toute la collection, un groupe et ses
 * descendants, ou, pendant une recherche (texte, `terme:` ou `vise:`), toutes
 * les collections.
 */
export function variablesAffichees(etat: Etat, valeur: (id: string) => string): VariableRelevee[] {
  const { index, position } = etat;
  if (!index) return [];
  if (position.recherche.trim()) return variablesTrouvees(index, position.recherche, (variable) => passeLesFiltres(etat, variable), (variable) => texteCherche(etat, variable, valeur));
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

/** La collection qui filtre la barre latérale : celle que l'arbre a choisie, hors recherche et tant que la croix de la puce n'a pas retiré le filtre. */
export function collectionDuFiltre(etat: Etat): string | null {
  if (!etat.filtreDeLaBarre || etat.position.recherche.trim() !== '') return null;
  return etat.position.collection;
}
