/** Contrat des messages entre l'écran et le sandbox : les demandes de l'écran, les réponses numérotées du sandbox et le contrôle de forme des demandes. */
import type { Convention, OrigineDuTerme, IndiceDePaire, CategorieDeNom } from '@ucm-kit/core/referentiel';
import type { DemandeDeTaille } from 'ucm-plugin-socle/src/ui/ResizeGrip';
import { estConventions } from './conventions';

/** Un nom est coché si son groupe principal l'est et qu'il n'est pas exclu, ou s'il est inclus. */
export interface Selection { readonly groupes: readonly string[]; readonly exclus: readonly string[]; readonly inclus: readonly string[] }
export interface EcritureChoisie { readonly groupes: Convention; readonly variables: Convention }
export type Reponse =
  | { readonly type: 'garder'; readonly rang: 0 | 1 } | { readonly type: 'autre'; readonly terme: string }
  | { readonly type: 'distincts' } | { readonly type: 'plus-tard' }
  | { readonly type: 'corriger'; readonly mots: readonly string[] } | { readonly type: 'voulu' }
  | { readonly type: 'echelle'; readonly forme: 0 | 1 } | { readonly type: 'collection'; readonly cible: string | null };
export type GesteSurLesRegles =
  | { readonly type: 'ecriture'; readonly ecriture: EcritureChoisie }
  | { readonly type: 'remplacer-par'; readonly terme: string; readonly par: string }
  | { readonly type: 'remplace-termes'; readonly terme: string; readonly termes: readonly string[] }
  | { readonly type: 'retirer-remplace'; readonly terme: string; readonly remplace: string }
  | { readonly type: 'supprimer'; readonly terme: string }
  | { readonly type: 'ecart-ucm'; readonly terme: string; readonly actif: boolean }
  | { readonly type: 'retirer-distinct'; readonly termes: readonly [string, string] }
  | { readonly type: 'retirer-voulu'; readonly terme: string }
  | { readonly type: 'reprendre'; readonly question: string }
  | { readonly type: 'annuler-reponse'; readonly question: string };

export type DemandeArchitect =
  | { readonly type: 'analyser'; readonly demande: number }
  | { readonly type: 'lignes'; readonly demande: number; readonly generation: number; readonly groupe: string; readonly debut: number }
  | { readonly type: 'termes'; readonly demande: number; readonly generation: number; readonly recherche: string; readonly filtre: 'tous' | 'avec-regle' | 'sans-regle'; readonly debut: number }
  | { readonly type: 'fiche'; readonly demande: number; readonly generation: number; readonly terme: string }
  | { readonly type: 'simuler'; readonly demande: number; readonly generation: number; readonly geste: GesteSurLesRegles }
  | { readonly type: 'repondre'; readonly demande: number; readonly question: string; readonly reponse: Reponse }
  | { readonly type: 'regle'; readonly demande: number; readonly geste: GesteSurLesRegles }
  | { readonly type: 'appliquer'; readonly demande: number; readonly generation: number; readonly selection: Selection }
  | { readonly type: 'annuler-dernier'; readonly demande: number }
  | { readonly type: 'exporter'; readonly demande: number }
  | { readonly type: 'importer'; readonly demande: number; readonly texte: string }
  | { readonly type: 'configurer'; readonly demande: number; readonly collectionsExclues: readonly string[] };
export type UiMessage = DemandeArchitect | DemandeDeTaille;

/** Un chemin découpé autour du segment en cause. */
export interface LigneVue { readonly id: string; readonly avant: string; readonly terme: string; readonly apres: string; readonly aussi: readonly string[] }
export type RegleVue =
  | { readonly sorte: 'terme'; readonly origine: OrigineDuTerme }
  | { readonly sorte: 'ecriture'; readonly categorie: CategorieDeNom; readonly convention: Convention }
  | { readonly sorte: 'collection' };
export interface GroupeVue {
  readonly cle: string; readonly regle: RegleVue;
  readonly avant: string; readonly apres: string; readonly autres: number;
  readonly variables: number; readonly collections: number;
  readonly nouveau: boolean; readonly apercu: readonly LigneVue[];
}
export interface BloqueVue { readonly avant: string; readonly apres: string; readonly collection: string }
export interface TermeVue { readonly mot: string; readonly nombre: number; readonly exemples: readonly LigneVue[]; readonly ucm: boolean }
export type QuestionVue =
  | { readonly type: 'paire'; readonly cle: string; readonly indice: IndiceDePaire; readonly termes: readonly [TermeVue, TermeVue]; readonly propose: 0 | 1; readonly cibleCommune: string | null }
  | { readonly type: 'ecriture-du-terme'; readonly cle: string; readonly indice: 'faute' | 'mots-colles'; readonly terme: TermeVue; readonly proposition: readonly string[]; readonly reference: { readonly mot: string; readonly nombre: number } | null }
  | { readonly type: 'echelle'; readonly cle: string; readonly formes: readonly [readonly string[], readonly string[]]; readonly nombres: readonly [number, number]; readonly exemples: readonly [LigneVue | null, LigneVue | null]; readonly propose: 0 | 1 }
  | { readonly type: 'collection'; readonly cle: string; readonly nom: string; readonly nombre: number; readonly proposee: string | null };
export interface LigneDEcriture { readonly convention: Convention; readonly suivent: number; readonly total: number; readonly exemple: LigneVue | null }
export interface CollectionVue { readonly id: string; readonly nom: string; readonly nombre: number; readonly analysee: boolean; readonly palettes: boolean }
export interface Bilan {
  readonly generation: number;
  readonly premierLancement: boolean;
  readonly sansVariableLocale: boolean;
  readonly ecriture: { readonly groupes: LigneDEcriture; readonly variables: LigneDEcriture; readonly collections: { readonly reconnues: number; readonly total: number } };
  readonly groupes: readonly GroupeVue[];
  readonly bloques: readonly BloqueVue[];
  readonly proteges: number;
  readonly questions: readonly QuestionVue[];
  readonly autresPistes: number;
  readonly plusTard: readonly QuestionVue[];
  readonly collections: readonly CollectionVue[];
  readonly dernierRenommage: { readonly nombre: number; readonly heure: string } | null;
}
/** Le filtre `avec-regle` montre `regle` et `ecart` ; `sans-regle` montre `sans-regle` et `a-trancher`. */
export interface TermeDeListe { readonly mot: string; readonly origine: OrigineDuTerme | null; readonly statut: 'regle' | 'ecart' | 'a-trancher' | 'sans-regle'; readonly remplace: readonly string[]; readonly avec: string | null; readonly nombre: number }
export interface FicheVue {
  readonly mot: string; readonly origine: OrigineDuTerme | null; readonly categorieUcm: string | null; readonly definition: string | null;
  readonly remplace: readonly { readonly mot: string; readonly nombre: number; readonly ucm: boolean }[];
  readonly emploi: { readonly nombre: number; readonly exemples: readonly LigneVue[] };
  readonly ecart: boolean; readonly voulu: boolean; readonly distincts: readonly string[]; readonly question: string | null;
}
export type EffetVue =
  | { readonly sorte: 'terme'; readonly avant: string; readonly apres: string; readonly nombre: number; readonly exemple: LigneVue | null }
  | { readonly sorte: 'ecriture'; readonly groupes: LigneDEcriture; readonly variables: LigneDEcriture; readonly renommages: number; readonly exemple: { readonly avant: string; readonly apres: string } | null };
export type ConflitVue =
  | { readonly type: 'contredit-ucm'; readonly terme: string; readonly remplace: string; readonly termeUcm: string }
  | { readonly type: 'deja-remplace'; readonly remplace: string; readonly par: string }
  | { readonly type: 'cycle'; readonly termes: readonly string[] };
export interface ResultatVue { readonly sorte: 'application' | 'annulation'; readonly statut: 'applique' | 'partiel' | 'refuse'; readonly renommes: number; readonly sautes: number; readonly annulable: boolean }
export type CodeDErreur = 'analyse-en-cours' | 'fichier-modifie' | 'generation-perimee' | 'regles-modifiees' | 'import-illisible' | 'echec';

export type PluginMessage =
  | { readonly type: 'initial'; readonly dejaAnalyse: boolean }
  | { readonly type: 'lecture'; readonly demande: number; readonly lues: number; readonly total: number }
  | { readonly type: 'bilan'; readonly demande: number; readonly bilan: Bilan }
  | { readonly type: 'lignes'; readonly demande: number; readonly generation: number; readonly groupe: string; readonly debut: number; readonly lignes: readonly LigneVue[]; readonly total: number }
  | { readonly type: 'termes'; readonly demande: number; readonly generation: number; readonly debut: number; readonly termes: readonly TermeDeListe[]; readonly total: number; readonly comptes: { readonly tous: number; readonly avecRegle: number; readonly sansRegle: number } }
  | { readonly type: 'fiche'; readonly demande: number; readonly generation: number; readonly fiche: FicheVue }
  | { readonly type: 'simulation'; readonly demande: number; readonly generation: number; readonly effet: EffetVue | null; readonly conflit: ConflitVue | null }
  | { readonly type: 'refus'; readonly demande: number; readonly conflits: readonly ConflitVue[] }
  | { readonly type: 'application'; readonly demande: number; readonly resultat: ResultatVue }
  | { readonly type: 'regles-exportees'; readonly demande: number; readonly texte: string }
  | { readonly type: 'erreur'; readonly demande: number; readonly code: CodeDErreur };

type Objet = Readonly<Record<string, unknown>>;
const entierPositif = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur > 0;
const entierNonNegatif = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur >= 0;
const chaine = (valeur: unknown): boolean => typeof valeur === 'string';
const zeroOuUn = (valeur: unknown): boolean => valeur === 0 || valeur === 1;
const chaines = (valeur: unknown): boolean => Array.isArray(valeur) && valeur.every(chaine);
const sansDoublon = (valeur: unknown): boolean => chaines(valeur) && new Set(valeur as string[]).size === (valeur as string[]).length;
const objet = (valeur: unknown): valeur is Objet => !!valeur && typeof valeur === 'object' && !Array.isArray(valeur);
const nombreFini = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isFinite(valeur);

const LIMITE_D_IMPORT = 1_000_000;
const FILTRES = ['tous', 'avec-regle', 'sans-regle'];

function estEcriture(brut: unknown): boolean {
  return objet(brut) && Object.keys(brut).length === 2 && 'groupes' in brut && 'variables' in brut && estConventions(brut);
}

function estReponse(brut: unknown): boolean {
  if (!objet(brut)) return false;
  switch (brut.type) {
    case 'garder': return zeroOuUn(brut.rang);
    case 'autre': return chaine(brut.terme);
    case 'distincts': case 'plus-tard': case 'voulu': return true;
    case 'corriger': return chaines(brut.mots);
    case 'echelle': return zeroOuUn(brut.forme);
    case 'collection': return brut.cible === null || chaine(brut.cible);
    default: return false;
  }
}

function estGeste(brut: unknown): boolean {
  if (!objet(brut)) return false;
  switch (brut.type) {
    case 'ecriture': return estEcriture(brut.ecriture);
    case 'remplacer-par': return chaine(brut.terme) && chaine(brut.par);
    case 'remplace-termes': return chaine(brut.terme) && chaines(brut.termes);
    case 'retirer-remplace': return chaine(brut.terme) && chaine(brut.remplace);
    case 'supprimer': case 'retirer-voulu': return chaine(brut.terme);
    case 'ecart-ucm': return chaine(brut.terme) && typeof brut.actif === 'boolean';
    case 'retirer-distinct': return Array.isArray(brut.termes) && brut.termes.length === 2 && brut.termes.every(chaine);
    case 'reprendre': case 'annuler-reponse': return chaine(brut.question);
    default: return false;
  }
}

function estSelection(brut: unknown): boolean {
  return objet(brut) && sansDoublon(brut.groupes) && sansDoublon(brut.exclus) && sansDoublon(brut.inclus);
}

/** Refuse toute demande hors contrat : demande ou génération non numérotée, rang, filtre ou geste inconnu, sélection à doublons, import de plus d'un million de caractères, coordonnées de fenêtre non finies. */
export function estUiMessage(brut: unknown): brut is UiMessage {
  if (!objet(brut)) return false;
  if (brut.type === 'resize') {
    return nombreFini(brut.largeur) && nombreFini(brut.hauteur) && (!('fin' in brut) || typeof brut.fin === 'boolean');
  }
  if (!entierPositif(brut.demande)) return false;
  const genere = entierPositif(brut.generation);
  switch (brut.type) {
    case 'analyser': case 'annuler-dernier': case 'exporter': return true;
    case 'lignes': return genere && chaine(brut.groupe) && entierNonNegatif(brut.debut);
    case 'termes': return genere && chaine(brut.recherche) && FILTRES.includes(brut.filtre as string) && entierNonNegatif(brut.debut);
    case 'fiche': return genere && chaine(brut.terme);
    case 'simuler': return genere && estGeste(brut.geste);
    case 'repondre': return chaine(brut.question) && estReponse(brut.reponse);
    case 'regle': return estGeste(brut.geste);
    case 'appliquer': return genere && estSelection(brut.selection);
    case 'importer': return chaine(brut.texte) && (brut.texte as string).length <= LIMITE_D_IMPORT;
    case 'configurer': return chaines(brut.collectionsExclues);
    default: return false;
  }
}
