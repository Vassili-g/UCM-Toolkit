/**
 * Les messages du calcul des noms hors du sandbox. Le sandbox envoie à l'interface l'entrée du calcul (`calcul-des-noms`) ; l'interface la
 * passe à un Worker, puis rend au sandbox le bilan (`noms-calcules`) ou la raison pour laquelle le Worker n'a rien rendu (`noms-non-calcules`).
 * Chaque message porte la demande de l'écran, la génération que le bilan prendra et la révision de l'acquisition de l'entrée : le sandbox
 * ignore une réponse qui ne répond pas à sa demande en attente.
 *
 * Les heures sont des millisecondes depuis 1970, lues sur la même horloge par le sandbox, l'interface et le Worker ; le journal du mode Tokens
 * les range telles quelles. Ni nom de variable ni identifiant n'y figure.
 */
import type { DemandeDeNomenclature } from './nomenclature';
import type { EntreeDuCalcul } from '../nomenclature/calcul';

/** Sandbox vers interface : l'entrée du calcul, que l'interface passe au Worker. */
export interface MessageDeCalculDesNoms {
  readonly type: 'calcul-des-noms';
  readonly demande: number;
  readonly generation: number;
  readonly revision: string;
  /** L'heure d'envoi par le sandbox. */
  readonly envoyeA: number;
  readonly entree: EntreeDuCalcul;
}

/** Ce que l'interface a mesuré sur le trajet : de quoi remplir les phases `worker-*` du journal. */
export interface MesureDuCalculDistant {
  /** L'interface a reçu l'entrée. */
  readonly recuA: number;
  /** Cette demande a créé le Worker : son démarrage compte dans l'attente. */
  readonly demarrage: boolean;
  /** Le Worker a reçu l'entrée. */
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

/** Contrôle la forme d'une réponse du Worker ; le sandbox s'y fie ensuite. */
export function estReponseDuCalculDesNoms(brut: unknown): brut is ReponseDuCalculDesNoms {
  if (!objet(brut) || !entierPositif(brut.demande) || !entierPositif(brut.generation) || typeof brut.revision !== 'string') return false;
  if (brut.type === 'noms-non-calcules') return typeof brut.cause === 'string' && CAUSES.includes(brut.cause);
  if (brut.type !== 'noms-calcules') return false;
  const { bilan, mesure } = brut;
  return objet(bilan) && bilan.generation === brut.generation && Array.isArray(bilan.groupes) && Array.isArray(bilan.questions)
    && objet(mesure) && typeof mesure.demarrage === 'boolean' && [mesure.recuA, mesure.travailleurRecuA, mesure.calculDebutA, mesure.calculFinA].every(heure);
}

/** Contrôle la forme de l'entrée que le sandbox envoie ; l'interface la passe au Worker sans la lire. */
export function estCalculDesNoms(brut: unknown): brut is MessageDeCalculDesNoms {
  return objet(brut) && brut.type === 'calcul-des-noms' && entierPositif(brut.demande) && entierPositif(brut.generation)
    && typeof brut.revision === 'string' && heure(brut.envoyeA) && objet(brut.entree);
}
