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

export interface EntreeDeJournal {
  /** Numéro d'ordre, croissant d'une entrée à la suivante. */
  readonly revision: number;
  readonly nature: 'noeud' | 'style';
  readonly type: string;
  readonly id: string;
  readonly properties?: readonly string[];
  /** Le parent à la réception ; `null` pour un style, un nœud supprimé ou un parent illisible. */
  readonly parent: IdDeNoeud | null;
}

export interface JournalDeChangements {
  enregistrer(changements: Iterable<ChangementAJournaliser>): void;
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
    marquer: () => revision,
    depuis: (curseur) => entrees.filter((entree) => entree.revision > curseur),
    debordeDepuis: (curseur) => premierePerdue !== null && premierePerdue > curseur,
    oublierAvant(curseur) {
      entrees = entrees.filter((entree) => entree.revision > curseur);
      if (premierePerdue !== null && premierePerdue <= curseur) premierePerdue = null;
    },
  };
}
