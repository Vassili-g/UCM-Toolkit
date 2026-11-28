/**
 * Le comparateur du banc : il reçoit le rendu que le modèle de vérité attend et celui que le kit lit sur le contrat, et rend les écarts
 * que rien ne couvre. Il ne lit ni le contrat ni le document.
 *
 * Un écart est une différence pour une identité de calque et un champ (`rendu.ts`). Un calque que le contrat ne porte pas, ou porte en
 * trop, est un écart de champ `calque`. Le texte est le seul champ non normatif : le contrat le publie en échantillon, à titre
 * indicatif.
 *
 * Couverture par les pertes : le sous-lot 1.9a n'en admet aucune, `ecartsNonCouverts` rend donc tous les écarts. Le sous-lot 1.9b y
 * met la règle du plan de P22 (un écart passe seulement si une perte du §2.11 ou du §2.14, par son chemin et son objet, le couvre).
 */
import { CHAMPS_DE_RENDU, egaux, type ChampDeRendu, type RenduNormalise } from './rendu';

/** Une entrée de `meta.diagnostics`, que le contrat publie : seul `code` est garanti. */
export interface Diagnostic {
  code: string;
  [cle: string]: unknown;
}

export interface Ecart {
  variant: string;
  identite: string;
  champ: ChampDeRendu | 'calque';
  attendu: unknown;
  lu: unknown;
  /** Faux pour un champ que le contrat ne publie qu'à titre indicatif (le texte). */
  normatif: boolean;
}

const INDICATIFS: ReadonlySet<string> = new Set<ChampDeRendu>(['texte']);

/** Tous les écarts entre le rendu attendu et le rendu lu, couverts ou non. */
export function ecartsDeRendu(attendu: RenduNormalise, lu: RenduNormalise): Ecart[] {
  const ecarts: Ecart[] = [];
  const variant = attendu.variant;
  for (const identite of new Set([...Object.keys(attendu.calques), ...Object.keys(lu.calques)])) {
    const a = attendu.calques[identite];
    const b = lu.calques[identite];
    if (!a || !b) {
      ecarts.push({ variant, identite, champ: 'calque', attendu: a ? 'présent' : 'absent', lu: b ? 'présent' : 'absent', normatif: true });
      continue;
    }
    for (const champ of CHAMPS_DE_RENDU) {
      if (!egaux(a[champ], b[champ])) ecarts.push({ variant, identite, champ, attendu: a[champ], lu: b[champ], normatif: !INDICATIFS.has(champ) });
    }
  }
  return ecarts;
}

/** Les écarts qu'aucune perte du contrat ne couvre. Sous-lot 1.9a : aucune perte n'est admise, tout écart reste. */
export function ecartsNonCouverts(ecarts: readonly Ecart[], pertes: readonly Diagnostic[]): Ecart[] {
  void pertes;
  return [...ecarts];
}

/** Le comparateur : le rendu attendu, le rendu lu et les diagnostics du contrat (`meta.diagnostics`) rendent les écarts non couverts. */
export function comparer(attendu: RenduNormalise, lu: RenduNormalise, pertes: readonly Diagnostic[]): Ecart[] {
  return ecartsNonCouverts(ecartsDeRendu(attendu, lu), pertes);
}
