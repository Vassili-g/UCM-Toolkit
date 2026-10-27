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
 * `stylechange` ne demande pas de page : il couvre les styles locaux. Un style
 * distant ou d'origine inconnue se relit, faute d'événement documenté.
 * `porteeDesChangementsDeStyle` classe ses changements.
 *
 * `porteeDuChangement` classe un changement reçu. Un nœud hors de l'inventaire
 * touche le sujet quand l'un de ses ancêtres y est, ou quand il vit sous le
 * maître d'une instance du sujet : Figma ne documente aucun événement sur
 * l'instance quand son maître change. Une portée qu'on ne peut établir est
 * `inconnue`, et l'appelant invalide largement.
 */
import type { FaitDeRessource, IdDeNoeud, Ressources } from './faits';

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

/** `locale` : la ressource vit dans le fichier ; aucune page n'est demandée. */
export type ConditionDeSuiviDeStyle = 'locale';

export type CouvertureDEntree =
  | { readonly suivi: 'nodechange'; readonly condition: ConditionDeSuivi }
  | { readonly suivi: 'stylechange'; readonly condition: ConditionDeSuiviDeStyle }
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
  style: { suivi: 'stylechange', condition: 'locale' },
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
  if (couverture.suivi === 'stylechange') return !situation.locale;
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
  | 'parent-de-suppression-inconnu'
  | 'style-cree'
  | 'styles-lus-inconnus'
  | 'journal-deborde'
  | 'ancien-parent-inconnu';

export type PorteeDuChangement =
  | { readonly portee: 'sujet' }
  | { readonly portee: 'hors-sujet' }
  | { readonly portee: 'inconnue'; readonly raison: RaisonDePorteeInconnue };

const SUJET: PorteeDuChangement = { portee: 'sujet' };
const HORS_SUJET: PorteeDuChangement = { portee: 'hors-sujet' };
const inconnue = (raison: RaisonDePorteeInconnue): PorteeDuChangement => ({ portee: 'inconnue', raison });

const TYPES_CONNUS: ReadonlySet<string> = new Set(['CREATE', 'DELETE', 'PROPERTY_CHANGE']);
const TYPES_DE_STYLE_CONNUS: ReadonlySet<string> = new Set(['STYLE_CREATE', 'STYLE_DELETE', 'STYLE_PROPERTY_CHANGE']);

function estSuivi(id: string, suivis: SuivisDuSujet): boolean {
  return suivis.noeuds.has(id) || suivis.maitres.has(id);
}

/**
 * Ce que l'appelant sait des parents d'avant le changement : la topologie lue avec l'analyse, puis les parents que le
 * journal a vus depuis son curseur. `deborde` : le journal a perdu des changements depuis ce curseur.
 */
export interface AnciensParents {
  /** Le parent connu ; `null` : le nœud est apparu depuis le curseur sans parent lisible ; `undefined` : jamais vu. */
  parentDe(id: IdDeNoeud): IdDeNoeud | null | undefined;
  readonly deborde: boolean;
}

type Remontee = 'sujet' | 'apparu-sans-parent' | 'jamais-vu';

/** Remonte les anciens parents de `id` jusqu'à un identifiant suivi ou jusqu'au premier ancêtre qu'on ne connaît plus. */
function remonterLesAnciensParents(id: IdDeNoeud, suivis: SuivisDuSujet, anciens: AnciensParents): Remontee {
  const vus = new Set<IdDeNoeud>();
  for (let courant = id; !vus.has(courant);) {
    vus.add(courant);
    const parent = anciens.parentDe(courant);
    if (parent === undefined) return 'jamais-vu';
    if (parent === null) return 'apparu-sans-parent';
    if (estSuivi(parent, suivis)) return 'sujet';
    courant = parent;
  }
  return 'apparu-sans-parent';
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
 * nœud. Avec `anciens`, ses anciens parents la situent : un ancêtre suivi touche
 * le sujet, un nœud apparu depuis le curseur sans parent connu est de portée
 * inconnue. Sans eux, une suppression reste hors du sujet, sauf avec un maître
 * suivi : elle a pu en retirer un calque. Un journal débordé rend toute portée
 * inconnue.
 */
export function porteeDuChangement(changement: ChangementRecu, suivis: SuivisDuSujet, anciens?: AnciensParents): PorteeDuChangement {
  if (estSuivi(changement.id, suivis)) return SUJET;
  if (anciens?.deborde) return inconnue('journal-deborde');
  if (!TYPES_CONNUS.has(changement.type)) return inconnue('type-inconnu');
  if (changement.type === 'DELETE') {
    if (anciens) {
      const avant = remonterLesAnciensParents(changement.id, suivis, anciens);
      if (avant === 'sujet') return SUJET;
      if (avant === 'apparu-sans-parent') return inconnue('ancien-parent-inconnu');
    }
    return suivis.maitres.size === 0 ? HORS_SUJET : inconnue('parent-de-suppression-inconnu');
  }
  if (!changement.node) return inconnue('ancetres-illisibles');
  const maintenant = porteeParLesAncetres(changement.node, suivis);
  if (maintenant.portee !== 'hors-sujet' || !anciens || !changement.properties?.includes('parent')) return maintenant;
  // Un nœud déplacé hors du sujet n'a plus d'ancêtre suivi : son ancien parent le situe.
  const avant = remonterLesAnciensParents(changement.id, suivis, anciens);
  if (avant === 'sujet') return SUJET;
  return avant === 'apparu-sans-parent' ? inconnue('ancien-parent-inconnu') : HORS_SUJET;
}

/** La portée d'une série : le sujet dès qu'un changement le touche, sinon inconnue dès qu'une portée l'est. */
export function porteeDesChangements(changements: Iterable<ChangementRecu>, suivis: SuivisDuSujet, anciens?: AnciensParents): PorteeDuChangement {
  let resultat: PorteeDuChangement = HORS_SUJET;
  for (const changement of changements) {
    const portee = porteeDuChangement(changement, suivis, anciens);
    if (portee.portee === 'sujet') return portee;
    if (portee.portee === 'inconnue' && resultat.portee === 'hors-sujet') resultat = portee;
  }
  return resultat;
}

/** Un élément de `StyleChangeEvent.styleChanges`. `type` reste une chaîne : un type futur doit se lire comme inconnu. */
export interface ChangementDeStyleRecu {
  readonly type: string;
  readonly id: string;
  readonly properties?: readonly string[];
}

/**
 * La portée des changements de style reçus. `stylesSuivis` : les styles locaux que l'analyse a lus, ou `null` quand
 * elle ne sait pas lesquels. Une modification ou une suppression d'un style suivi touche le sujet. Un style créé peut
 * changer une recherche par nom, que rien ne suit : sa portée est inconnue. Sans style connu, tout changement de style
 * l'est aussi. Les autres changements sont hors du sujet.
 */
export function porteeDesChangementsDeStyle(changements: Iterable<ChangementDeStyleRecu>, stylesSuivis: ReadonlySet<string> | null): PorteeDuChangement {
  let resultat: PorteeDuChangement = HORS_SUJET;
  const retenir = (portee: PorteeDuChangement): void => {
    if (resultat.portee === 'hors-sujet') resultat = portee;
  };
  for (const changement of changements) {
    if (!TYPES_DE_STYLE_CONNUS.has(changement.type)) retenir(inconnue('type-inconnu'));
    else if (stylesSuivis === null) retenir(inconnue('styles-lus-inconnus'));
    else if (changement.type === 'STYLE_CREATE') retenir(inconnue('style-cree'));
    else if (stylesSuivis.has(changement.id)) return SUJET;
  }
  return resultat;
}

/** Ce que l'appelant sait des pages : celles qu'il écoute, et la page d'un maître local (`null` : inconnue). */
export interface PagesDuSuivi {
  readonly ecoutees: ReadonlySet<IdDeNoeud>;
  pageDe(maitre: IdDeNoeud): IdDeNoeud | null;
}

/**
 * Les ressources d'une acquisition qu'une nouvelle demande doit relire avant
 * toute réutilisation, et les maîtres dont un événement suffit. Variables,
 * collections, libraries et inventaires se relisent toujours. Un maître se
 * relit s'il est distant, refusé, ou s'il vit sur une page non écoutée. Un style
 * se relit s'il est distant, refusé ou d'origine inconnue.
 */
export interface RelecturesObligatoires {
  readonly variables: readonly string[];
  readonly collections: readonly string[];
  /** Les styles distants, refusés ou d'origine inconnue. */
  readonly styles: readonly string[];
  /** Les styles locaux acquis : à passer dans `porteeDesChangementsDeStyle`. */
  readonly stylesSuivis: readonly string[];
  readonly maitres: readonly IdDeNoeud[];
  /** Par clé de collection de library. */
  readonly variablesDeLibrary: readonly string[];
  readonly inventaires: readonly (keyof Ressources['inventaires'])[];
  /** Les maîtres locaux sur une page écoutée : à passer dans `SuivisDuSujet.maitres`. */
  readonly maitresSuivis: readonly IdDeNoeud[];
}

function maitreSuivi(fait: FaitDeRessource<{ readonly remote: boolean }>, pages: PagesDuSuivi): boolean {
  if (fait.etat.etat !== 'acquis') return false;
  const page = pages.pageDe(fait.id);
  const pageEcoutee = page !== null && pages.ecoutees.has(page);
  return !doitSeRelire('maitre', { pageEcoutee, locale: fait.provenance.origine === 'locale' && !fait.etat.valeur.remote });
}

function styleSuivi(fait: FaitDeRessource<object>): boolean {
  return fait.etat.etat === 'acquis' && !doitSeRelire('style', { pageEcoutee: true, locale: fait.provenance.origine === 'locale' });
}

export function relecturesObligatoires(ressources: Ressources, pages: PagesDuSuivi): RelecturesObligatoires {
  const maitres: IdDeNoeud[] = [];
  const maitresSuivis: IdDeNoeud[] = [];
  for (const fait of Object.values(ressources.maitres)) (maitreSuivi(fait, pages) ? maitresSuivis : maitres).push(fait.id);
  const styles: string[] = [];
  const stylesSuivis: string[] = [];
  for (const fait of Object.values(ressources.styles)) (styleSuivi(fait) ? stylesSuivis : styles).push(fait.id);
  return {
    variables: Object.keys(ressources.variables),
    collections: Object.keys(ressources.collections),
    styles,
    stylesSuivis,
    maitres,
    variablesDeLibrary: Object.keys(ressources.variablesDeLibrary),
    inventaires: (Object.keys(ressources.inventaires) as (keyof Ressources['inventaires'])[])
      .filter((cle) => ressources.inventaires[cle] !== undefined),
    maitresSuivis,
  };
}
