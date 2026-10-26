/**
 * Le budget de lecture d'une analyse : combien de layers elle lit avant de
 * s'arrêter, pour qu'un gros composant (Button 216 variants, Input 720) ne
 * bloque pas le panneau qui la lance.
 *
 * Le budget se compte en layers de variants, racine comprise. Il borne les
 * variants lus, pas le détail de chaque lecture : un variant se lit en entier
 * ou pas du tout. Sans budget, l'analyse lit tout.
 */
import type { VariantEntry } from './componentTree';
import { respirerSiBesoin } from './porteeDAnalyse';

/** La borne par défaut, partagée avec le relevé d'Architect ; une analyse sans budget ne s'en sert pas. */
export const BUDGET_DE_LAYERS_PAR_DEFAUT = 2000;

/** Ce qu'une lecture bornée a lu, et ce qu'elle a laissé. */
export type BilanDeBudget = {
  lus: number;
  /** Les layers des variants non lus, comptés sans les analyser ; `inconnu` si un compte a échoué. */
  nonLus: number | 'inconnu';
};

function compterLesLayers(variant: ComponentNode): number {
  return 1 + ('findAll' in variant ? variant.findAll(() => true).length : 0);
}

/**
 * Garde les variants qu'un budget de layers permet de lire, dans l'ordre de la
 * matrice. Le variant de référence se lit toujours : le layout se tire de lui,
 * et un budget plus petit que lui ne laisserait rien à analyser. Un variant qui
 * ferait dépasser le budget n'est pas lu, ni aucun de ceux qui le suivent.
 *
 * `verifier` lève si l'analyse est annulée ; il passe avant chaque variant.
 * `bilan` est null quand tous les variants tiennent dans le budget.
 */
export function bornerLesVariants(
  variants: readonly VariantEntry[],
  reference: ComponentNode | null,
  budget: number,
  verifier: () => void,
): { gardes: VariantEntry[]; bilan: BilanDeBudget | null } {
  const parcours = parcourirLeBudget(variants, reference, budget, verifier);
  let etape = parcours.next();
  while (!etape.done) etape = parcours.next();
  return etape.value;
}

/** Même préfixe que la voie synchrone, avec un point coopératif avant chaque compte Figma. */
export async function bornerLesVariantsParTranches(
  variants: readonly VariantEntry[],
  reference: ComponentNode | null,
  budget: number,
  verifier: () => void,
): Promise<{ gardes: VariantEntry[]; bilan: BilanDeBudget | null }> {
  const parcours = parcourirLeBudget(variants, reference, budget, verifier);
  let etape = parcours.next();
  while (!etape.done) {
    await respirerSiBesoin();
    etape = parcours.next();
  }
  return etape.value;
}

function* parcourirLeBudget(
  variants: readonly VariantEntry[],
  reference: ComponentNode | null,
  budget: number,
  verifier: () => void,
): Generator<void, { gardes: VariantEntry[]; bilan: BilanDeBudget | null }> {
  const gardes = new Set<VariantEntry>();
  let lus = 0;
  const premier = variants.find((entry) => entry.component === reference) ?? variants[0];
  if (premier) {
    yield;
    verifier();
    gardes.add(premier);
    lus += compterLesLayers(premier.component);
  }
  let nonLus: number | 'inconnu' = 0;
  let coupe = false;
  for (const entry of variants) {
    yield;
    verifier();
    if (entry === premier) continue;
    if (!coupe) {
      const layers = compterLesLayers(entry.component);
      if (lus + layers <= budget) {
        gardes.add(entry);
        lus += layers;
        continue;
      }
      coupe = true;
      nonLus = layers;
      continue;
    }
    if (nonLus === 'inconnu') continue;
    try {
      nonLus += compterLesLayers(entry.component);
    } catch {
      nonLus = 'inconnu';
    }
  }
  return {
    gardes: variants.filter((entry) => gardes.has(entry)),
    bilan: coupe ? { lus, nonLus } : null,
  };
}
