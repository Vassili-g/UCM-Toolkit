/**
 * La session d'analyse : ce qu'une analyse complète garde d'un sujet pour une demande suivante, séparé de l'état que
 * l'interface affiche. Une entrée par sujet (la clé du jeu de variants) ; une nouvelle analyse du même sujet la remplace.
 *
 * Une entrée garde trois choses :
 * - les `sorties` des lecteurs, telles qu'ils les ont rendues (relevé, catalogue, résultat du moteur sans ses nœuds Figma,
 *   règles, niveau, réglages lus) ;
 * - les `requetes` pures calculées sur ces sorties, chacune avec le nom des sorties qu'elle a lues : c'est ce qui dira
 *   quelles requêtes rejouer quand une sortie change ;
 * - le `suivi` de l'acquisition : curseur du journal, inventaire et couverture.
 *
 * Une entrée ne garde jamais ce qui appartient à une génération affichée : réponses aux questions, corrections fixées,
 * cases cochées, identité de génération, péremption. Une analyse suivante du même sujet ne les retrouve donc pas.
 *
 * L'invalidation d'une entrée est une marque à part, hors de l'entrée : les raisons posées et le curseur du journal
 * jusqu'où elles ont été évaluées. Une marque reste jusqu'à ce qu'une promotion remplace l'entrée ; annuler, arrêter ou
 * périmer la demande suivante ne l'efface pas.
 *
 * Le module ne connaît aucun type Figma ni aucun type du kit : l'appelant donne les types des sorties et des requêtes.
 * Il ne décide de rien (promotion, validation, éviction viennent après) ; il range et rend.
 */
import type { Couverture } from './faits';

/** Une requête pure déjà calculée : son résultat et les noms des `sorties` ou paramètres qu'elle a lus. */
export interface RequeteRetenue<R, Nom extends string = string> {
  readonly resultat: R;
  readonly entrees: readonly Nom[];
}

/** Ce que la surveillance savait du sujet quand l'acquisition a eu lieu. */
export interface SuiviRetenu {
  /** Le curseur du journal au début de la demande qui a produit l'entrée. */
  readonly curseur: number;
  readonly noeuds: ReadonlySet<string>;
  readonly admis: ReadonlySet<string>;
  readonly parents: ReadonlyMap<string, string>;
  readonly pages: ReadonlySet<string>;
  readonly couverture: Couverture;
}

/** Ce que l'appelant range pour un sujet. */
export interface ContenuDeSession<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>> {
  readonly sorties: Sorties;
  readonly requetes: Requetes;
  readonly suivi: SuiviRetenu;
}

export interface EntreeDeSession<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>> extends ContenuDeSession<Sorties, Requetes> {
  readonly sujet: string;
  /** Numéro d'ordre de la dernière écriture : plus il est grand, plus l'entrée est récente. */
  readonly rang: number;
}

export interface SessionDAnalyse<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>> {
  /** Range le contenu du sujet, en remplaçant l'entrée précédente. */
  retenir(sujet: string, contenu: ContenuDeSession<Sorties, Requetes>): EntreeDeSession<Sorties, Requetes>;
  /** L'entrée du sujet, `null` sans entrée. Lire ne change pas son rang. */
  entree(sujet: string): EntreeDeSession<Sorties, Requetes> | null;
  /** Ajoute des raisons d'invalidation à l'entrée du sujet ; sans effet sans entrée. */
  invalider(sujet: string, raisons: readonly string[]): void;
  /** Les raisons d'invalidation de l'entrée du sujet, sans doublon ; vide quand l'entrée est intacte ou absente. */
  invalidations(sujet: string): readonly string[];
  /** Le curseur du journal jusqu'où l'invalidation du sujet est évaluée (celui du suivi au départ) ; `null` sans entrée. */
  evalueJusqua(sujet: string): number | null;
  /** Avance le curseur jusqu'où l'invalidation du sujet est évaluée. */
  avancerLEvaluation(sujet: string, curseur: number): void;
  /** Retire l'entrée du sujet ; vrai quand il y en avait une. */
  oublier(sujet: string): boolean;
  /** Les sujets retenus, du plus récent au plus ancien. */
  sujets(): readonly string[];
  /** Retire toutes les entrées. */
  vider(): void;
}

interface Marques {
  readonly raisons: Set<string>;
  evalueJusqua: number;
}

export function creerLaSession<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>>(): SessionDAnalyse<Sorties, Requetes> {
  const entrees = new Map<string, EntreeDeSession<Sorties, Requetes>>();
  const marques = new Map<string, Marques>();
  let rang = 0;
  return {
    retenir(sujet, { sorties, requetes, suivi }) {
      rang += 1;
      const entree = { sujet, rang, sorties, requetes, suivi };
      entrees.set(sujet, entree);
      marques.set(sujet, { raisons: new Set(), evalueJusqua: suivi.curseur });
      return entree;
    },
    entree: (sujet) => entrees.get(sujet) ?? null,
    invalider(sujet, raisons) {
      for (const raison of raisons) marques.get(sujet)?.raisons.add(raison);
    },
    invalidations: (sujet) => [...(marques.get(sujet)?.raisons ?? [])],
    evalueJusqua: (sujet) => marques.get(sujet)?.evalueJusqua ?? null,
    avancerLEvaluation(sujet, curseur) {
      const m = marques.get(sujet);
      if (m) m.evalueJusqua = Math.max(m.evalueJusqua, curseur);
    },
    oublier(sujet) {
      marques.delete(sujet);
      return entrees.delete(sujet);
    },
    sujets: () => [...entrees.values()].sort((a, b) => b.rang - a.rang).map(({ sujet }) => sujet),
    vider() {
      entrees.clear();
      marques.clear();
    },
  };
}
