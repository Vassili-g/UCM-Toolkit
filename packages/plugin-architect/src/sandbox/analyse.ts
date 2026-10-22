/**
 * Le domaine `analyse` : l'identité de l'analyse courante et ce qui la rend
 * périmée. `analyser` reste une souche ; l'état et les règles de péremption
 * sont ceux que le lot des contrôles branche.
 *
 * Une analyse se périme de trois façons, et une seule fois : après une
 * écriture du plugin (`ecriture`), sur un changement de la page qui touche un
 * nœud du jeu analysé (`document`, dont le Ctrl+Z), sur une sélection Figma
 * d'un autre jeu de variants (`selection`). La sélection que le plugin pose
 * lui-même, au clic sur un constat, ne périme rien.
 */
import type { CauseDePeremption, DemandeDAnalyse } from '../messages/analyse';
import type { IdentiteDAnalyse, OrigineDeSelection } from '../messages/commun';
import type { Contexte } from './contexte';
import { souche } from './souche';

export const TYPES: readonly DemandeDAnalyse['type'][] = ['analyser', 'annuler-analyse'];
export const traiter = souche<DemandeDAnalyse>('analyse');

interface AnalyseCourante {
  readonly identite: IdentiteDAnalyse;
  /** Les identifiants des nœuds du jeu analysé : le jeu, ses variants et leurs calques. */
  readonly noeuds: ReadonlySet<string>;
  perimee: boolean;
}

let generation = 0;
let courante: AnalyseCourante | null = null;

/** Ouvre une analyse : la génération monte, l'analyse précédente n'est plus la courante. */
export function commencerUneAnalyse(sujet: string, noeuds: Iterable<string>, contexte: Contexte): IdentiteDAnalyse {
  generation += 1;
  const identite = { sujet, generation };
  courante = { identite, noeuds: new Set(noeuds), perimee: false };
  contexte.surveillerLeDocument();
  return identite;
}

export function analyseCourante(): IdentiteDAnalyse | null {
  return courante?.identite ?? null;
}

/** Oublie l'analyse courante, sans toucher à la génération. */
export function oublierLAnalyse(): void {
  courante = null;
}

function perimer(cause: CauseDePeremption, contexte: Contexte): void {
  if (!courante || courante.perimee) return;
  courante.perimee = true;
  contexte.envoyer({ type: 'perime', analyse: courante.identite, cause });
}

/** À appeler quand le plugin vient d'écrire dans le document pour l'analyse courante. */
export function perimerApresUneEcriture(contexte: Contexte): void {
  perimer('ecriture', contexte);
}

/** `nodechange` de la page : les identifiants des nœuds touchés. Un seul qui appartient au jeu analysé suffit. */
export function surChangementDuDocument(noeudsTouches: Iterable<string>, contexte: Contexte): void {
  if (!courante) return;
  for (const id of noeudsTouches) {
    if (courante.noeuds.has(id)) {
      perimer('document', contexte);
      return;
    }
  }
}

/**
 * Une sélection a changé. `sujetId` est le composant que la sélection désigne,
 * `null` quand elle n'en désigne aucun : une sélection vide ou hors composant
 * ne périme pas l'analyse.
 */
export function surSelection(sujetId: string | null, origine: OrigineDeSelection, contexte: Contexte): void {
  if (!courante || origine === 'plugin' || sujetId === null) return;
  if (!courante.noeuds.has(sujetId)) perimer('selection', contexte);
}
