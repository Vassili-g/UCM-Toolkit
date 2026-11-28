/**
 * Le comparateur du banc : il reçoit le rendu que le modèle de vérité attend et celui que le kit lit sur le contrat, et rend les écarts
 * que rien ne couvre. Il ne lit ni le contrat ni le document.
 *
 * Un écart est une différence pour une identité de calque et un champ (`rendu.ts`). Un calque que le contrat ne porte pas, ou porte en
 * trop, est un écart de champ `calque`. Le texte est le seul champ non normatif : le contrat le publie en échantillon, à titre
 * indicatif. Une occurrence que l'un des deux côtés ne résout pas est un écart de champ `resolution`, à la racine.
 *
 * Couverture par les pertes (`pertes.ts`) : un écart passe seulement si une perte prévue au §2.11 ou au §2.14, publiée dans
 * `meta.diagnostics`, le couvre par son chemin et son objet. Les seules pertes de résolution admises sont la sélection non unique et
 * l'appariement ambigu, et seulement quand le modèle de vérité ne résout pas non plus l'occurrence, pour la même cause.
 */
import { perteCouvre, type Diagnostic, type Lieu } from './pertes';
import { CHAMPS_DE_RENDU, RACINE, egaux, type ChampDeRendu, type RenduNormalise } from './rendu';

export type { Diagnostic } from './pertes';

export interface Ecart {
  variant: string;
  identite: string;
  champ: ChampDeRendu | 'calque' | 'resolution';
  attendu: unknown;
  lu: unknown;
  /** Faux pour un champ que le contrat ne publie qu'à titre indicatif (le texte). */
  normatif: boolean;
}

const INDICATIFS: ReadonlySet<string> = new Set<ChampDeRendu>(['texte']);

/** Tous les écarts entre le rendu attendu et le rendu lu, couverts ou non. */
export function ecartsDeRendu(attendu: RenduNormalise, lu: RenduNormalise): Ecart[] {
  const variant = attendu.variant;
  if (attendu.nonResolu || lu.nonResolu) {
    return [{ variant, identite: RACINE, champ: 'resolution', attendu: attendu.nonResolu ?? 'résolu', lu: lu.nonResolu ?? 'résolu', normatif: true }];
  }
  const ecarts: Ecart[] = [];
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

/** Les écarts qu'aucune perte du contrat ne couvre, là où `lieu` les lit. */
export function ecartsNonCouverts(ecarts: readonly Ecart[], pertes: readonly Diagnostic[], lieu: Lieu = {}): Ecart[] {
  return ecarts.filter((ecart) => !pertes.some((perte) => perteCouvre(perte, ecart, lieu)));
}

/** Le comparateur : le rendu attendu, le rendu lu et les diagnostics du contrat (`meta.diagnostics`) rendent les écarts non couverts. */
export function comparer(attendu: RenduNormalise, lu: RenduNormalise, pertes: readonly Diagnostic[]): Ecart[] {
  return ecartsNonCouverts(ecartsDeRendu(attendu, lu), pertes, { cheminDuContrat: lu.cheminDuContrat, adresses: lu.adresses });
}
