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
 * Il ne décide ni de la promotion ni de la validation ; il range et rend, dans les bornes de `retention.ts`. Ranger un sujet
 * hors des bornes évince les sujets les moins récents, jamais celui qu'on range. Un sujet qui dépasse seul une borne n'est pas
 * retenu, et son entrée précédente est retirée avec sa marque d'invalidation : l'appelant l'analyse sans rétention.
 */
import type { Couverture } from './faits';
import { BORNES_DE_RETENTION, estimerLesOctets, type BornesDeRetention } from './retention';

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
  /**
   * Les identifiants des maîtres locaux des instances du sujet, sur une page écoutée, et de leurs descendants
   * (`relecturesObligatoires(...).maitresSuivis`). Absent : aucun maître n'est suivi, un changement sous un maître ne
   * touche pas le sujet.
   */
  readonly maitres?: ReadonlySet<string>;
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
  /**
   * Range le contenu du sujet, en remplaçant l'entrée précédente, et évince au besoin les sujets les moins récents pour
   * tenir les bornes. `null` quand le contenu dépasse seul une borne : rien n'est retenu et l'entrée précédente est retirée.
   */
  retenir(sujet: string, contenu: ContenuDeSession<Sorties, Requetes>): EntreeDeSession<Sorties, Requetes> | null;
  /** Ce que la session retient : sujets, octets estimés, arêtes. */
  mesure(): { readonly sujets: number; readonly octets: number; readonly aretes: number };
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

export interface OptionsDeSession<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>> {
  /** Les bornes en vigueur, relues à chaque rangement ; `BORNES_DE_RETENTION` par défaut. */
  readonly bornes?: () => BornesDeRetention;
  /** Les arêtes que le contenu porte en plus des entrées de ses requêtes (ressources de dépendance retenues). */
  readonly aretes?: (contenu: ContenuDeSession<Sorties, Requetes>) => number;
}

export function creerLaSession<Sorties extends object, Requetes extends Record<string, RequeteRetenue<unknown>>>(
  options: OptionsDeSession<Sorties, Requetes> = {},
): SessionDAnalyse<Sorties, Requetes> {
  const entrees = new Map<string, EntreeDeSession<Sorties, Requetes>>();
  const marques = new Map<string, Marques>();
  const couts = new Map<string, { octets: number; aretes: number }>();
  const bornes = options.bornes ?? (() => BORNES_DE_RETENTION);
  let rang = 0;
  const retirer = (sujet: string): boolean => {
    marques.delete(sujet);
    couts.delete(sujet);
    return entrees.delete(sujet);
  };
  const total = (): { sujets: number; octets: number; aretes: number } => {
    let octets = 0;
    let aretes = 0;
    for (const cout of couts.values()) { octets += cout.octets; aretes += cout.aretes; }
    return { sujets: entrees.size, octets, aretes };
  };
  return {
    retenir(sujet, contenu) {
      const { sorties, requetes, suivi } = contenu;
      const limites = bornes();
      const octets = estimerLesOctets({ sorties, requetes, suivi }, limites.octets);
      const aretes = Object.values(requetes).reduce((somme, { entrees: lues }) => somme + lues.length, 0) + (options.aretes?.(contenu) ?? 0);
      if (octets > limites.octets || aretes > limites.aretes || limites.sujets < 1) {
        retirer(sujet);
        return null;
      }
      rang += 1;
      const entree = { sujet, rang, sorties, requetes, suivi };
      entrees.set(sujet, entree);
      marques.set(sujet, { raisons: new Set(), evalueJusqua: suivi.curseur });
      couts.set(sujet, { octets, aretes });
      // Les moins récents partent d'abord ; le sujet rangé tient seul dans les bornes, la boucle s'arrête donc.
      for (const { sujet: ancien } of [...entrees.values()].sort((a, b) => a.rang - b.rang)) {
        const courant = total();
        if (courant.sujets <= limites.sujets && courant.octets <= limites.octets && courant.aretes <= limites.aretes) break;
        if (ancien !== sujet) retirer(ancien);
      }
      return entree;
    },
    mesure: total,
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
    oublier: retirer,
    sujets: () => [...entrees.values()].sort((a, b) => b.rang - a.rang).map(({ sujet }) => sujet),
    vider() {
      entrees.clear();
      marques.clear();
      couts.clear();
    },
  };
}
