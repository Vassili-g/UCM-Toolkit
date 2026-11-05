/**
 * Les messages du travail des noms hors du sandbox. Le sandbox envoie à l'interface un travail (`calcul-des-noms`) : calculer le bilan d'un
 * inventaire, recalculer après de nouvelles règles, répondre à une lecture ou à une simulation, préparer les écritures d'un geste, lister les
 * renommages d'une sélection. L'interface le passe à un Worker, qui garde l'état complet (lexique, résultat, questions) de chaque génération,
 * puis rend au sandbox le résultat (`noms-calcules`) ou la raison pour laquelle le Worker n'a rien rendu (`noms-non-calcules`).
 * Chaque message porte la demande de l'écran, la génération sur laquelle il porte et la révision de l'acquisition : le sandbox ignore une
 * réponse qui ne répond pas à sa requête en attente.
 *
 * Les heures sont des millisecondes depuis 1970, lues sur la même horloge par le sandbox, l'interface et le Worker ; le journal du mode Tokens
 * les range telles quelles. Ni nom de variable ni identifiant n'y figure.
 */
import type { Bilan, CodeDErreur, ConflitVue, DemandeDeNomenclature, GesteSurLesRegles, MessageDeNomenclature, Reponse, Selection } from './nomenclature';
import type { EntreeDuCalcul } from '../nomenclature/calcul';
import type { Ecriture, ReglesDuFichier } from '../nomenclature/regles';

/** Les lectures paginées que le Worker rend de son état : tout ce qui se lit sans calcul. */
export type DemandeDeLecture = Extract<DemandeDeNomenclature, { readonly type: 'lignes' | 'termes' | 'fiche' | 'noms-selection' | 'diagnostic' }>;
const TYPES_DE_LECTURE: readonly string[] = ['lignes', 'termes', 'fiche', 'noms-selection', 'diagnostic'];

/** Ce qu'un geste demande d'écrire dans les règles du fichier. */
export type TravailDePreparation =
  | { readonly sorte: 'geste'; readonly geste: GesteSurLesRegles }
  | { readonly sorte: 'reponse'; readonly question: string; readonly reponse: Reponse }
  | { readonly sorte: 'configurer'; readonly collectionsExclues: readonly string[] };

/** Le stockage des règles tel que le sandbox le lit : des couples clé et texte, sans `Map`. */
export type StockageEnvoye = readonly (readonly [string, string])[];

/**
 * Ce que le sandbox confie au Worker. `calculer` et `recalculer` créent la génération de la requête ; les autres travaux portent sur la génération
 * de la requête, que le Worker doit encore garder. `adopter` refait la projection de cette génération avec d'autres règles, sans recalculer.
 */
export type TravailDesNoms =
  | { readonly sorte: 'calculer'; readonly entree: EntreeDuCalcul }
  | { readonly sorte: 'recalculer'; readonly base: number; readonly regles: ReglesDuFichier }
  | { readonly sorte: 'adopter'; readonly regles: ReglesDuFichier }
  | { readonly sorte: 'lire'; readonly lecture: DemandeDeLecture }
  | { readonly sorte: 'simuler'; readonly demande: number; readonly geste: GesteSurLesRegles; readonly courant: StockageEnvoye }
  | { readonly sorte: 'preparer'; readonly preparation: TravailDePreparation; readonly courant: StockageEnvoye }
  | { readonly sorte: 'renommages'; readonly selection: Selection };

export const SORTES_DE_TRAVAIL: readonly TravailDesNoms['sorte'][] = ['calculer', 'recalculer', 'adopter', 'lire', 'simuler', 'preparer', 'renommages'];

/** Un renommage à écrire : le Worker rend l'identifiant et les deux noms, le sandbox le rapproche de ce qu'il a lu dans Figma. */
export interface RenommageAEcrire { readonly id: string; readonly ancienNom: string; readonly nouveauNom: string }

/** Ce que le Worker rend d'un travail. `perimee` : il ne garde plus la génération demandée. */
export type ResultatDuTravail =
  | { readonly sorte: 'bilan'; readonly bilan: Bilan }
  | { readonly sorte: 'message'; readonly message: MessageDeNomenclature }
  | { readonly sorte: 'ecritures'; readonly ecritures: readonly Ecriture[]; readonly regles: ReglesDuFichier }
  | { readonly sorte: 'refus'; readonly conflits: readonly ConflitVue[] }
  | { readonly sorte: 'erreur'; readonly code: CodeDErreur }
  | { readonly sorte: 'renommages'; readonly renommages: readonly RenommageAEcrire[] }
  | { readonly sorte: 'perimee' };

/** Sandbox vers interface : le travail, que l'interface passe au Worker. */
export interface MessageDeCalculDesNoms {
  readonly type: 'calcul-des-noms';
  readonly demande: number;
  readonly generation: number;
  readonly revision: string;
  /** L'heure d'envoi par le sandbox. */
  readonly envoyeA: number;
  readonly travail: TravailDesNoms;
}

/** Ce que l'interface a mesuré sur le trajet : de quoi remplir les phases `worker-*` du journal. */
export interface MesureDuCalculDistant {
  /** L'interface a reçu le travail. */
  readonly recuA: number;
  /** Cette demande a créé le Worker : son démarrage compte dans l'attente. */
  readonly demarrage: boolean;
  /** Le Worker a reçu le travail. */
  readonly travailleurRecuA: number;
  readonly calculDebutA: number;
  readonly calculFinA: number;
}

/** Pourquoi le Worker n'a rien rendu : jamais créé (`indisponible`), muet au démarrage (`demarrage`), calcul en erreur (`echec`). */
export type CauseDeRepli = 'indisponible' | 'demarrage' | 'echec' | 'delai';

/** Interface vers sandbox : la réponse du Worker. Ses deux formes sont déclarées dans `DemandeDeNomenclature`, où la table des types du sandbox les lit. */
export type ReponseDuCalculDesNoms = Extract<DemandeDeNomenclature, { readonly type: 'noms-calcules' | 'noms-non-calcules' }>;

const CAUSES: readonly string[] = ['indisponible', 'demarrage', 'echec'];
const entierPositif = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isSafeInteger(valeur) && valeur > 0;
const heure = (valeur: unknown): boolean => typeof valeur === 'number' && Number.isFinite(valeur);
const objet = (valeur: unknown): valeur is Record<string, unknown> => !!valeur && typeof valeur === 'object' && !Array.isArray(valeur);

/** Vrai quand `resultat` a la forme que le sandbox lira pour sa sorte. Le contenu d'un message, d'une écriture ou d'un renommage vient du Worker. */
function estResultatDuTravail(resultat: unknown, generation: number): resultat is ResultatDuTravail {
  if (!objet(resultat)) return false;
  switch (resultat.sorte) {
    case 'bilan': {
      const { bilan } = resultat;
      return objet(bilan) && bilan.generation === generation && Array.isArray(bilan.groupes) && Array.isArray(bilan.questions);
    }
    case 'message': return objet(resultat.message) && typeof resultat.message.type === 'string';
    case 'ecritures': return Array.isArray(resultat.ecritures) && objet(resultat.regles);
    case 'refus': return Array.isArray(resultat.conflits);
    case 'erreur': return typeof resultat.code === 'string';
    case 'renommages': return Array.isArray(resultat.renommages);
    case 'perimee': return true;
    default: return false;
  }
}

/** Contrôle la forme d'une réponse du Worker ; le sandbox s'y fie ensuite. */
export function estReponseDuCalculDesNoms(brut: unknown): brut is ReponseDuCalculDesNoms {
  if (!objet(brut) || !entierPositif(brut.demande) || !entierPositif(brut.generation) || typeof brut.revision !== 'string') return false;
  if (brut.type === 'noms-non-calcules') return typeof brut.cause === 'string' && CAUSES.includes(brut.cause);
  if (brut.type !== 'noms-calcules') return false;
  const { resultat, mesure } = brut;
  return estResultatDuTravail(resultat, brut.generation as number)
    && objet(mesure) && typeof mesure.demarrage === 'boolean' && [mesure.recuA, mesure.travailleurRecuA, mesure.calculDebutA, mesure.calculFinA].every(heure);
}

/** Contrôle la forme du travail que le sandbox envoie ; l'interface le passe au Worker sans le lire. */
export function estCalculDesNoms(brut: unknown): brut is MessageDeCalculDesNoms {
  return objet(brut) && brut.type === 'calcul-des-noms' && entierPositif(brut.demande) && entierPositif(brut.generation)
    && typeof brut.revision === 'string' && heure(brut.envoyeA)
    && objet(brut.travail) && typeof brut.travail.sorte === 'string' && (SORTES_DE_TRAVAIL as readonly string[]).includes(brut.travail.sorte);
}

/** Vrai quand `type` est une lecture que le Worker sait rendre. */
export const estUneLecture = (type: string): boolean => TYPES_DE_LECTURE.includes(type);
