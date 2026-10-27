/**
 * La matrice de couverture des événements : pour chaque entrée que l'analyse
 * lit, l'événement Figma qui en signale le changement, ou la relecture à
 * chaque demande. Un événement absent ne valide rien : une entrée dont la
 * couverture n'est pas démontrée se relit.
 *
 * Le sandbox n'écoute que `nodechange`, sur la page courante et sur celle du
 * sujet : `documentchange` exige `loadAllPagesAsync`, que la loi d'écriture
 * refuse hors de `ecriture/`. Aucune variable, collection, library ni aucun
 * inventaire n'a donc d'événement. `NodeChangeProperty` ne nomme ni
 * `boundVariables` ni les modes explicites : leurs changements ne sont pas
 * démontrés et se relisent avec les variables.
 *
 * `porteeDuChangement` classe un changement reçu. Un nœud hors de l'inventaire
 * touche le sujet quand l'un de ses ancêtres y est, ou quand il vit sous le
 * maître d'une instance du sujet : Figma ne documente aucun événement sur
 * l'instance quand son maître change. Une portée qu'on ne peut établir est
 * `inconnue`, et l'appelant invalide largement.
 */
import type { IdDeNoeud } from './faits';

/** Les entrées que lit une analyse, de la plus proche du sujet à la plus lointaine. */
export type EntreeLue =
  | 'noeud'
  | 'liaisons-de-variables'
  | 'valeur-heritee'
  | 'page'
  | 'regles'
  | 'maitre'
  | 'variable'
  | 'collection'
  | 'style'
  | 'inventaire'
  | 'library';

/** `page-ecoutee` : la page du nœud est écoutée. `locale-et-page-ecoutee` : la ressource vit dans le fichier, sur une page écoutée. */
export type ConditionDeSuivi = 'page-ecoutee' | 'locale-et-page-ecoutee';

export type CouvertureDEntree =
  | { readonly suivi: 'nodechange'; readonly condition: ConditionDeSuivi }
  | { readonly suivi: 'relecture'; readonly motif: string };

export const MATRICE_DE_COUVERTURE: { readonly [E in EntreeLue]: CouvertureDEntree } = {
  noeud: { suivi: 'nodechange', condition: 'page-ecoutee' },
  'liaisons-de-variables': {
    suivi: 'relecture',
    motif: '`NodeChangeProperty` ne nomme ni `boundVariables` ni les modes explicites.',
  },
  'valeur-heritee': {
    suivi: 'nodechange',
    condition: 'locale-et-page-ecoutee',
  },
  page: { suivi: 'nodechange', condition: 'page-ecoutee' },
  regles: { suivi: 'nodechange', condition: 'page-ecoutee' },
  maitre: { suivi: 'nodechange', condition: 'locale-et-page-ecoutee' },
  variable: { suivi: 'relecture', motif: 'Aucun événement de variable sans `documentchange`.' },
  collection: { suivi: 'relecture', motif: 'Aucun événement de collection sans `documentchange`.' },
  style: { suivi: 'relecture', motif: '`stylechange` n’est pas encore vérifié dans la documentation Figma.' },
  inventaire: { suivi: 'relecture', motif: 'Les listes de variables et de collections locales n’ont pas d’événement.' },
  library: { suivi: 'relecture', motif: 'Une library publiée change hors du fichier.' },
};

/** Où vit la ressource qu'une entrée lit. `locale` vaut faux pour une ressource distante ou d'origine inconnue. */
export interface SituationDeLEntree {
  readonly pageEcoutee: boolean;
  readonly locale: boolean;
}

/** Vrai quand l'entrée doit se relire à la demande, faute d'événement qui la couvre dans cette situation. */
export function doitSeRelire(entree: EntreeLue, situation: SituationDeLEntree, matrice = MATRICE_DE_COUVERTURE): boolean {
  const couverture = matrice[entree];
  if (couverture.suivi === 'relecture') return true;
  if (!situation.pageEcoutee) return true;
  return couverture.condition === 'locale-et-page-ecoutee' && !situation.locale;
}

/** Ce que la portée lit d'un nœud d'événement : `SceneNode` ou `RemovedNode` en production, un double en test. */
export interface NoeudDEvenement {
  readonly id: string;
  readonly removed?: boolean;
  readonly parent?: NoeudDEvenement | null;
}

/** Un élément de `NodeChangeEvent.nodeChanges`. `type` reste une chaîne : un type futur doit se lire comme inconnu. */
export interface ChangementRecu {
  readonly type: string;
  readonly id: string;
  readonly node?: NoeudDEvenement;
  readonly properties?: readonly string[];
}

/** Les identifiants dont un changement touche le sujet. */
export interface SuivisDuSujet {
  /** L'inventaire de péremption : le jeu, ses enfants et ses descendants. */
  readonly noeuds: ReadonlySet<IdDeNoeud>;
  /** Les maîtres des instances du sujet qui vivent hors de l'inventaire. */
  readonly maitres: ReadonlySet<IdDeNoeud>;
}

export type RaisonDePorteeInconnue =
  | 'type-inconnu'
  | 'noeud-supprime'
  | 'ancetres-illisibles'
  | 'parent-de-suppression-inconnu';

export type PorteeDuChangement =
  | { readonly portee: 'sujet' }
  | { readonly portee: 'hors-sujet' }
  | { readonly portee: 'inconnue'; readonly raison: RaisonDePorteeInconnue };

const SUJET: PorteeDuChangement = { portee: 'sujet' };
const HORS_SUJET: PorteeDuChangement = { portee: 'hors-sujet' };
const inconnue = (raison: RaisonDePorteeInconnue): PorteeDuChangement => ({ portee: 'inconnue', raison });

const TYPES_CONNUS: ReadonlySet<string> = new Set(['CREATE', 'DELETE', 'PROPERTY_CHANGE']);

function estSuivi(id: string, suivis: SuivisDuSujet): boolean {
  return suivis.noeuds.has(id) || suivis.maitres.has(id);
}

/** Remonte les parents du nœud. Un parent qui lève, ou un nœud supprimé en chemin, rend la portée inconnue. */
function porteeParLesAncetres(noeud: NoeudDEvenement, suivis: SuivisDuSujet): PorteeDuChangement {
  try {
    if (noeud.removed) return inconnue('noeud-supprime');
    for (let parent = noeud.parent; parent; parent = parent.parent) {
      if (parent.removed) return inconnue('ancetres-illisibles');
      if (estSuivi(parent.id, suivis)) return SUJET;
    }
    return HORS_SUJET;
  } catch {
    return inconnue('ancetres-illisibles');
  }
}

/**
 * La portée d'un changement reçu. Un identifiant suivi touche le sujet quel que
 * soit le type. Une suppression hors de l'inventaire ne dit plus où vivait le
 * nœud : sans maître suivi, elle ne peut toucher que des nœuds inventoriés et
 * reste hors du sujet ; avec un maître suivi, elle a pu en retirer un calque.
 */
export function porteeDuChangement(changement: ChangementRecu, suivis: SuivisDuSujet): PorteeDuChangement {
  if (estSuivi(changement.id, suivis)) return SUJET;
  if (!TYPES_CONNUS.has(changement.type)) return inconnue('type-inconnu');
  if (changement.type === 'DELETE') {
    return suivis.maitres.size === 0 ? HORS_SUJET : inconnue('parent-de-suppression-inconnu');
  }
  if (!changement.node) return inconnue('ancetres-illisibles');
  return porteeParLesAncetres(changement.node, suivis);
}

/** La portée d'une série : le sujet dès qu'un changement le touche, sinon inconnue dès qu'une portée l'est. */
export function porteeDesChangements(changements: Iterable<ChangementRecu>, suivis: SuivisDuSujet): PorteeDuChangement {
  let resultat: PorteeDuChangement = HORS_SUJET;
  for (const changement of changements) {
    const portee = porteeDuChangement(changement, suivis);
    if (portee.portee === 'sujet') return portee;
    if (portee.portee === 'inconnue' && resultat.portee === 'hors-sujet') resultat = portee;
  }
  return resultat;
}

