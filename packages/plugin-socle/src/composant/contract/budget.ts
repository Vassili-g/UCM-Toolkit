/**
 * Le budget de lecture d'une analyse : combien de layers elle lit avant de
 * s'arrêter, pour qu'un gros composant (Button 216 variants, Input 720) ne
 * bloque pas le panneau qui la lance.
 *
 * Le budget se compte en layers de variants, racine comprise. Il borne les
 * variants lus, pas le détail de chaque lecture : un variant se lit en entier
 * ou pas du tout. Sans budget, l'analyse lit tout.
 *
 * Un seul décompte : `parcourirLesLayers`. Le relevé d'Architect lit les layers
 * qu'il rend, et le moteur compte les siens avec cette même fonction ; les deux
 * coupent donc au même variant. Un décompte qui lève fait manquer ce variant
 * sans couper les suivants.
 */
import type { VariantEntry } from './componentTree';
import { AnalyseAnnulee, champDuNoeud, respirerSiBesoin } from './porteeDAnalyse';

/** La borne par défaut, partagée avec le relevé d'Architect ; une analyse sans budget ne s'en sert pas. */
export const BUDGET_DE_LAYERS_PAR_DEFAUT = 2000;

/** Ce qu'une lecture bornée a lu, et ce qu'elle a laissé. */
export type BilanDeBudget = {
  lus: number;
  /** Les layers des variants non lus, comptés sans les analyser ; `inconnu` si un compte a échoué. */
  nonLus: number | 'inconnu';
};

/** Un layer d'un variant, avec l'identifiant de son parent ; `frontiere` pour une instance qui n'est pas la racine. */
export interface EtapeDeLayer<N> {
  readonly noeud: N;
  readonly parent: string | null;
  readonly frontiere: boolean;
}

/**
 * Les layers d'un variant, dans l'ordre du document, racine d'abord : la racine, ses descendants, et une instance sous la racine pour
 * elle seule, sans ce qu'elle contient (sa `frontiere`). C'est le décompte du budget et les layers que le relevé lit.
 */
export function* parcourirLesLayers<N extends { readonly id: string }>(
  racine: N,
  enfantsDe: (noeud: N) => readonly N[] | undefined,
  estUneInstance: (noeud: N) => boolean,
): Generator<EtapeDeLayer<N>> {
  const aVisiter: Array<{ noeud: N; parent: string | null }> = [{ noeud: racine, parent: null }];
  while (aVisiter.length > 0) {
    const { noeud, parent } = aVisiter.pop() as { noeud: N; parent: string | null };
    const frontiere = estUneInstance(noeud) && noeud.id !== racine.id;
    yield { noeud, parent, frontiere };
    if (frontiere) continue;
    const enfants = enfantsDe(noeud) ?? [];
    for (let rang = enfants.length - 1; rang >= 0; rang -= 1) aVisiter.push({ noeud: enfants[rang], parent: noeud.id });
  }
}

/** Les layers du variant selon `parcourirLesLayers`, lus par la mémoire de champs de la portée ouverte quand il y en a une. */
function compterLesLayers(variant: ComponentNode): number {
  let layers = 0;
  const parcours = parcourirLesLayers<SceneNode>(
    variant,
    (noeud) => champDuNoeud<readonly SceneNode[] | undefined>(noeud, 'children'),
    (noeud) => champDuNoeud(noeud, 'type') === 'INSTANCE',
  );
  for (let etape = parcours.next(); !etape.done; etape = parcours.next()) layers += 1;
  return layers;
}

/**
 * Garde les variants qu'un budget de layers permet de lire, dans l'ordre de la
 * matrice. Le variant de référence se lit toujours, sans borne : le layout se
 * tire de lui, et un budget plus petit que lui ne laisserait rien à analyser.
 * Un variant qui ferait dépasser le budget n'est pas lu, ni aucun de ceux qui
 * le suivent. Un variant dont le décompte lève reste non lu sans couper les
 * suivants, qui se jugent comme avant ; le bilan est alors `inconnu`.
 *
 * `verifier` lève si l'analyse est annulée ; il passe avant chaque variant.
 * `bilan` est null quand tous les variants tiennent dans le budget et se comptent.
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
  let compteLeve = false;
  /** Le décompte d'un variant, `null` quand il lève : Figma refuse le parcours, le variant est une lecture manquée. */
  const compter = (variant: ComponentNode): number | null => {
    try {
      return compterLesLayers(variant);
    } catch (erreur) {
      if (erreur instanceof AnalyseAnnulee) throw erreur;
      compteLeve = true;
      return null;
    }
  };
  const premier = variants.find((entry) => entry.component === reference) ?? variants[0];
  if (premier) {
    yield;
    verifier();
    gardes.add(premier);
    lus += compter(premier.component) ?? 0;
  }
  let nonLus = 0;
  let coupe = false;
  for (const entry of variants) {
    yield;
    verifier();
    if (entry === premier) continue;
    const layers = compter(entry.component);
    if (layers === null) continue;
    if (!coupe && lus + layers <= budget) {
      gardes.add(entry);
      lus += layers;
      continue;
    }
    coupe = true;
    nonLus += layers;
  }
  return {
    gardes: variants.filter((entry) => gardes.has(entry)),
    bilan: coupe || compteLeve ? { lus, nonLus: compteLeve ? 'inconnu' : nonLus } : null,
  };
}
