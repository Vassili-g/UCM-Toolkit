/**
 * Le journal des changements reçus : la liste ordonnée des changements de nœuds et de styles, sans objet Figma,
 * indépendante de la notification de péremption. Il ne se vide ni à la péremption ni entre deux analyses : seul
 * `oublierAvant` retire des entrées, au plus ancien curseur que l'appelant retient encore.
 *
 * Une entrée garde l'identifiant du parent lu à la réception. Un nœud supprimé ou un parent illisible donnent `null` :
 * l'ancien parent n'est alors plus connu, et le lecteur du journal invalide largement.
 *
 * Au-delà de `borne` entrées, les suivantes ne sont plus gardées : `debordeDepuis(curseur)` dit si des changements
 * postérieurs au curseur manquent, et le lecteur ne peut plus s'y fier.
 *
 * Une page qui cesse d'être écoutée n'envoie plus rien, et son retour ne rend pas ce qui a été manqué : le suivi
 * inscrit une interruption. `couvertureDepuis` dit si la couverture d'un curseur sur des pages a tenu.
 *
 * Une écriture du plugin (correction, préparation, structure) ou un changement effectif de configuration s'inscrit aussi,
 * avec la portée la plus large : le sujet entier. Son événement Figma peut arriver en retard ou ne pas arriver ; un
 * lecteur qui voit `ecritureDepuis(curseur)` ne réutilise rien d'antérieur à cette écriture. Un Ctrl+Z qui la défait
 * arrive, lui, comme un changement ordinaire.
 */
import type { NoeudDEvenement } from './couverture';
import type { IdDeNoeud } from './faits';

/** Un changement à inscrire. `node` n'est lu qu'à l'inscription. */
export interface ChangementAJournaliser {
  readonly nature: 'noeud' | 'style';
  readonly type: string;
  readonly id: string;
  readonly properties?: readonly string[];
  readonly node?: NoeudDEvenement;
}

export type RaisonDInterruption = 'page-quittee' | 'page-non-ecoutee';

/** Ce qui a écrit : le document (correction, préparation, structure) ou la configuration. */
export type OrigineDEcriture = 'ecriture' | 'configuration';

/** Pourquoi une couverture est interrompue : une page cessée d'être écoutée, ou des changements perdus à la borne. */
export type RaisonDeCouvertureInterrompue = RaisonDInterruption | 'journal-deborde';

export type CouvertureDepuis =
  | { readonly etat: 'continue' }
  | { readonly etat: 'interrompue'; readonly raisons: readonly RaisonDeCouvertureInterrompue[] };

export interface EntreeDeJournal {
  /** Numéro d'ordre, croissant d'une entrée à la suivante. */
  readonly revision: number;
  readonly nature: 'noeud' | 'style' | 'interruption' | 'ecriture';
  readonly type: string;
  readonly id: string;
  /** Pour une interruption : la page et la raison. */
  readonly page?: IdDeNoeud;
  readonly raison?: RaisonDInterruption;
  /** Pour une écriture : ce qui a écrit. */
  readonly origine?: OrigineDEcriture;
  readonly properties?: readonly string[];
  /** Le parent à la réception ; `null` pour un style, un nœud supprimé ou un parent illisible. */
  readonly parent: IdDeNoeud | null;
}

export interface JournalDeChangements {
  enregistrer(changements: Iterable<ChangementAJournaliser>): void;
  /** Inscrit l'arrêt d'écoute d'une page. */
  signaler(page: IdDeNoeud, raison: RaisonDInterruption): void;
  /** Inscrit une écriture du plugin : portée du sujet entier, sans identifiant de nœud. */
  signalerUneEcriture(origine: OrigineDEcriture): void;
  /** Vrai quand une écriture est postérieure au curseur, ou que des entrées postérieures ont été perdues à la borne. */
  ecritureDepuis(curseur: number): boolean;
  /** `interrompue` si une interruption de l'une de ces pages ou un débordement est postérieur au curseur. */
  couvertureDepuis(curseur: number, pages: Iterable<IdDeNoeud>): CouvertureDepuis;
  /** Le curseur courant : `depuis(curseur)` rend ce qui arrive ensuite. */
  marquer(): number;
  /** Les entrées postérieures au curseur, dans l'ordre de réception. */
  depuis(curseur: number): readonly EntreeDeJournal[];
  /** Vrai quand un changement postérieur au curseur n'a pas été gardé. */
  debordeDepuis(curseur: number): boolean;
  /** Retire les entrées au plus égales au curseur : aucun curseur retenu ne les lit plus. */
  oublierAvant(curseur: number): void;
}

function parentDe(changement: ChangementAJournaliser): IdDeNoeud | null {
  if (changement.nature === 'style') return null;
  try {
    if (!changement.node || changement.node.removed) return null;
    return changement.node.parent?.id ?? null;
  } catch {
    return null;
  }
}

export function creerLeJournal({ borne }: { readonly borne: number }): JournalDeChangements {
  let entrees: EntreeDeJournal[] = [];
  let revision = 0;
  let premierePerdue: number | null = null;

  return {
    enregistrer(changements) {
      for (const changement of changements) {
        revision += 1;
        if (entrees.length >= borne) {
          premierePerdue ??= revision;
          continue;
        }
        entrees.push({
          revision,
          nature: changement.nature,
          type: changement.type,
          id: changement.id,
          ...(changement.properties ? { properties: [...changement.properties] } : {}),
          parent: parentDe(changement),
        });
      }
    },
    signaler(page, raison) {
      revision += 1;
      if (entrees.length >= borne) {
        premierePerdue ??= revision;
        return;
      }
      entrees.push({ revision, nature: 'interruption', type: 'INTERRUPTION', id: page, page, raison, parent: null });
    },
    signalerUneEcriture(origine) {
      revision += 1;
      if (entrees.length >= borne) {
        premierePerdue ??= revision;
        return;
      }
      entrees.push({ revision, nature: 'ecriture', type: 'ECRITURE', id: origine, origine, parent: null });
    },
    ecritureDepuis: (curseur) => (premierePerdue !== null && premierePerdue > curseur) || entrees.some((entree) => entree.revision > curseur && entree.nature === 'ecriture'),
    couvertureDepuis(curseur, pages) {
      const voulues = new Set(pages);
      const raisons = new Set<RaisonDeCouvertureInterrompue>();
      for (const entree of entrees) {
        if (entree.revision > curseur && entree.nature === 'interruption' && entree.page !== undefined && voulues.has(entree.page)) raisons.add(entree.raison!);
      }
      if (premierePerdue !== null && premierePerdue > curseur) raisons.add('journal-deborde');
      return raisons.size === 0 ? { etat: 'continue' } : { etat: 'interrompue', raisons: [...raisons] };
    },
    marquer: () => revision,
    depuis: (curseur) => entrees.filter((entree) => entree.revision > curseur),
    debordeDepuis: (curseur) => premierePerdue !== null && premierePerdue > curseur,
    oublierAvant(curseur) {
      entrees = entrees.filter((entree) => entree.revision > curseur);
      if (premierePerdue !== null && premierePerdue <= curseur) premierePerdue = null;
    },
  };
}
