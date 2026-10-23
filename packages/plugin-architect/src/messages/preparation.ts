/**
 * Les messages de la préparation des tokens : le plan du mode Composant, le texte d'une préparation, la création des variables
 * dans le fichier des tokens et le retour au composant.
 *
 * `preparer` calcule le plan à chaque réponse du designer ; avec `ranger: true` et aucune question ouverte, il range la préparation
 * et répond `preparations` avec `nouvelle`. Un refus est un code que l'interface écrit : le sandbox ne dit rien en phrases.
 */
import type { Correction, PreparationDesTokens } from '@ucm-kit/core/controles';

import type { CollectionDeDestination, MotifDEchecDeCreation, MotifDeRefusDeCreation } from '../ecriture/variables';
import type {
  EtatDeVariable, LiaisonEnAttente, MotifDeTexteRefuse, ReglePreparee, SourceDePreparation, VariablePreparee,
} from '../preparations';
import type { IdentiteDAnalyse, Preparation } from './commun';

export type DemandeDePreparation =
  | { type: 'preparer'; analyse: IdentiteDAnalyse; reponses: Readonly<Record<string, string>>; ranger?: boolean }
  | { type: 'lire-preparations' }
  | { type: 'lire-texte'; texte: string }
  /** `collection` choisit la collection `components` quand le fichier en porte plusieurs ; `reponses` porte `existante:<nom>` : `garder` ou `remplacer`. */
  | { type: 'creer-variables'; preparation: string; collection?: string; reponses?: Readonly<Record<string, string>> }
  | { type: 'abandonner-preparation'; preparation: string }
  | { type: 'copier-preparation'; preparation: string }
  | { type: 'lier-preparation'; analyse: IdentiteDAnalyse; preparation: string };

/** Une variable d'une préparation rangée, vue par l'interface : le nombre de layers qu'elle concerne, et l'état du dernier essai de création. */
export interface VariableVue extends Omit<VariablePreparee, 'layers'> {
  readonly layers: number;
  readonly etat: EtatDeVariable;
}

/** Une préparation rangée sur ce poste. `etat` vaut `a-creer` tant qu'aucune création n'a été tentée. */
export interface PreparationVue extends Preparation {
  readonly source: SourceDePreparation;
  readonly creeLe: string;
  readonly variables: readonly VariableVue[];
  readonly regles: readonly ReglePreparee[];
}

export type MotifDeRefusDePreparation = 'hors-ucm' | 'analyse-perimee' | 'sans-cibles' | 'library-illisible' | 'questions-ouvertes' | 'rien-a-preparer' | 'rangement-impossible' | 'occupe';
export type MotifDeRefusDeLiaison = 'introuvable' | 'analyse-perimee' | 'autre-composant' | 'hors-ucm' | 'library-illisible';

export type MessageDePreparation =
  /** Le plan de l'analyse `analyse` ; `plan` vaut `null` quand `refus` le dit. `questions-ouvertes` rend le plan avec ses questions. */
  | { type: 'plan-de-preparation'; analyse: IdentiteDAnalyse; plan: PreparationDesTokens | null; refus: MotifDeRefusDePreparation | null }
  /** Les préparations rangées, les plus récentes d'abord. `nouvelle` est l'identifiant de celle que ce message vient de ranger. */
  | { type: 'preparations'; preparations: readonly PreparationVue[]; nouvelle?: string }
  | { type: 'preparation-texte'; preparation: string; texte: string }
  /** `champ` est le chemin du champ faux (`variables[3].cibles`) quand `motif` vaut `champ-faux`. */
  | { type: 'texte-refuse'; motif: MotifDeTexteRefuse; champ?: string }
  | {
    type: 'variables-creees'; preparation: string; creees: number; gardees: number; sautees: number; remplacees: number;
    /** Les variables déjà là qui visent autre chose, sans réponse ; `vise` est la cible voulue. L'interface pose la question `existante:<nom>`. */
    divergentes: readonly { nom: string; vise: string }[];
    echecs: readonly { nom: string; motif: MotifDEchecDeCreation }[];
    /** Faux : les variables existent mais le fichier n'a pas gardé le journal, l'Historique ne peut pas les défaire. */
    journal: boolean;
    /** Le code du refus ; rien n'est écrit alors. `introuvable` : la préparation n'est plus rangée. `collections` liste les choix de `destination-ambigue`. */
    refus: MotifDeRefusDeCreation | 'introuvable' | 'occupe' | null;
    collections: readonly CollectionDeDestination[];
  }
  /** Les liaisons du retour au composant, aussi retenues par l'analyse : `appliquer-corrections` les écrit par leurs identifiants. `enAttente` n'a pas de case. */
  | {
    type: 'liaisons-preparees'; analyse: IdentiteDAnalyse; preparation: string; corrections: readonly Correction[];
    enAttente: readonly LiaisonEnAttente[]; ecartees: number; refus: MotifDeRefusDeLiaison | null;
  };
