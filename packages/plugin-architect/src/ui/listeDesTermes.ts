/**
 * L'état de la liste des termes de l'onglet Règles : la recherche, le filtre,
 * les pages reçues et le terme choisi. Le module est pur ; `regles.ts` lit cet
 * état pour le DOM et envoie les demandes.
 */
import type { PluginMessage, TermeDeListe } from '../messages';
import { TEXTES } from './textes';

export type FiltreDesTermes = 'tous' | 'avec-regle' | 'sans-regle';
type ReponseDesTermes = Extract<PluginMessage, { type: 'termes' }>;

/** Le nombre de termes que le sandbox rend par page. */
export const TAILLE_DE_PAGE = 50;

export interface EtatDeLaListe {
  readonly recherche: string;
  readonly filtre: FiltreDesTermes;
  /** Les pages reçues, bout à bout. */
  readonly termes: readonly TermeDeListe[];
  /** Le nombre de termes que la recherche et le filtre retiennent, `null` avant la première page. */
  readonly total: number | null;
  /** Les comptes des trois filtres, conservés d'une recherche à l'autre. */
  readonly comptes: ReponseDesTermes['comptes'] | null;
  /** Le mot du terme dont la feuille est ouverte. */
  readonly choisi: string | null;
}

export const LISTE_INITIALE: EtatDeLaListe = { recherche: '', filtre: 'tous', termes: [], total: null, comptes: null, choisi: null };

/** Une nouvelle recherche ou un nouveau filtre repart de la première page. */
function depart(etat: EtatDeLaListe, suite: Partial<Pick<EtatDeLaListe, 'recherche' | 'filtre'>>): EtatDeLaListe {
  return { ...etat, ...suite, termes: [], total: null };
}

export function saisir(etat: EtatDeLaListe, recherche: string): EtatDeLaListe {
  return recherche === etat.recherche ? etat : depart(etat, { recherche });
}

export function filtrer(etat: EtatDeLaListe, filtre: FiltreDesTermes): EtatDeLaListe {
  return filtre === etat.filtre ? etat : depart(etat, { filtre });
}

/**
 * Ajoute une page. La première page remplace tout ; la suivante s'ajoute si
 * elle commence où la liste s'arrête, sinon elle est ignorée.
 */
export function recevoir(etat: EtatDeLaListe, reponse: Pick<ReponseDesTermes, 'debut' | 'termes' | 'total' | 'comptes'>): EtatDeLaListe {
  const { debut, termes, total, comptes } = reponse;
  if (debut === 0) return { ...etat, termes, total, comptes };
  if (debut !== etat.termes.length) return etat;
  return { ...etat, termes: [...etat.termes, ...termes], total, comptes };
}

/** Vrai tant que la liste reçue est plus courte que le total. */
export function resteAAfficher(etat: EtatDeLaListe): boolean {
  return etat.total !== null && etat.termes.length < etat.total;
}

/** Le rang de la prochaine page à demander. */
export function debutSuivant(etat: EtatDeLaListe): number {
  return etat.termes.length;
}

export function choisir(etat: EtatDeLaListe, mot: string | null): EtatDeLaListe {
  return mot === etat.choisi ? etat : { ...etat, choisi: mot };
}

/** Le résumé de règle d'une ligne ; vide pour un terme sans règle. */
export function resumeDuTerme(terme: TermeDeListe): string {
  switch (terme.statut) {
    case 'regle':
      return terme.remplace.length > 0 ? TEXTES.termeRemplace(terme.remplace) : '';
    case 'a-trancher':
      return TEXTES.termeATrancher(terme.avec);
    case 'ecart':
      return TEXTES.termeNonApplique;
    case 'sans-regle':
      return '';
  }
}
