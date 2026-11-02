/** Types des cas de stress test d'Architect et de leurs écarts, partagés par toutes les familles. */
import type { Constat } from '../../../src/controles/constat.js';

/** `mesure` : le résultat attendu dépend d'une question que le mainteneur n'a pas confirmée. */
export type Verdict = 'attendu' | 'mesure';

export interface ConstatAttendu {
  readonly code: `C${number}`;
  /** La clé de rattachement que la famille calcule pour ce constat. */
  readonly cle: string;
  readonly forme: 'correction' | 'question' | 'a-faire';
  /** `correction` : la cible attendue de l'écriture. */
  readonly apres?: { readonly cle?: string; readonly nom?: string };
  /** `question` : les noms des candidats, dans n'importe quel ordre. */
  readonly candidats?: readonly string[];
}

export interface CasDeStress<E> {
  readonly id: string;
  readonly famille: string;
  readonly operateur: string;
  readonly verdict: Verdict;
  /** L'identifiant de la question dont dépend un cas `mesure`. */
  readonly question?: string;
  readonly entree: E;
  readonly attendus: readonly ConstatAttendu[];
  /** Les codes dont un constat non attendu compte comme faux constat ; absent : tous les codes. */
  readonly codesJuges?: readonly string[];
}

export type SorteDEcart = 'manque' | 'faux-constat' | 'doublon' | 'correction-inexacte' | 'question-inexacte';

export interface Ecart {
  readonly cas: string;
  readonly sorte: SorteDEcart;
  readonly attendu?: ConstatAttendu;
  readonly emis?: Constat;
  readonly detail: string;
}

export interface ResultatDuCas {
  readonly cas: string;
  readonly famille: string;
  readonly operateur: string;
  readonly verdict: Verdict;
  readonly attendus: number;
  readonly detectes: number;
  readonly ecarts: readonly Ecart[];
}
