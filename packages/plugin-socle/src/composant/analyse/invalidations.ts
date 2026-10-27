/**
 * Ce que le journal dit d'une entrée de session : les raisons pour lesquelles ce que le suivi a couvert ne tient plus.
 * Le calcul ne lit que le journal et le suivi retenu ; il ne demande aucune relecture à Figma.
 *
 * Les changements de nœuds se rejouent dans l'ordre de réception. Chacun se juge comme à sa réception
 * (`porteeDesChangements`) : les anciens parents viennent de la topologie retenue puis des parents que le journal a vus
 * avant lui, et les ancêtres d'un nœud se reconstruisent par les identifiants de parent que le journal garde. Un parent
 * qu'aucune de ces sources ne connaît n'a pas d'ancêtre suivi : le changement est hors du sujet.
 *
 * Les maîtres locaux d'une page écoutée se jugent comme l'inventaire, par `suivi.maitres` : le maître, ses descendants et
 * tout nœud créé dessous touchent le sujet. Les autres maîtres n'ont pas d'événement démontré (matrice de couverture) : ils
 * ne se jugent pas ici et la validation les relit ou refuse la reprise.
 *
 * Une écriture d'origine `configuration` n'invalide rien : le niveau et la library choisie se retrouvent dans les sorties
 * relues et comparées par la validation et les requêtes. Toute autre écriture invalide le sujet entier.
 */
import { porteeDesChangements, type AnciensParents, type ChangementRecu, type NoeudDEvenement } from './couverture';
import type { IdDeNoeud } from './faits';
import type { JournalDeChangements } from './journal';
import type { SuiviRetenu } from './session';

export type RaisonDInvalidation =
  | 'sujet-touche'
  | 'portee-inconnue'
  | 'style'
  | 'ecriture'
  | 'page-interrompue'
  | 'journal-deborde';

/** Les ancêtres que l'on reconstruit s'arrêtent à cette profondeur : au-delà, l'arbre est cyclique ou absurde. */
const PROFONDEUR_MAX = 1000;

/** Les raisons, sans doublon, dans l'ordre où elles apparaissent ; vide quand rien depuis `depuis` n'invalide le suivi. */
export function raisonsDInvalidation(suivi: SuiviRetenu, depuis: number, journal: JournalDeChangements): readonly RaisonDInvalidation[] {
  const raisons = new Set<RaisonDInvalidation>();
  const deborde = journal.debordeDepuis(depuis);
  if (deborde) raisons.add('journal-deborde');
  const couverture = journal.couvertureDepuis(depuis, suivi.pages);
  if (couverture.etat === 'interrompue' && couverture.raisons.some((raison) => raison !== 'journal-deborde')) raisons.add('page-interrompue');

  const vus = new Map<IdDeNoeud, IdDeNoeud | null>();
  const parentConnu = (id: IdDeNoeud): IdDeNoeud | null => {
    const vu = vus.get(id);
    return typeof vu === 'string' ? vu : suivi.parents.get(id) ?? null;
  };
  const anciens: AnciensParents = {
    deborde,
    parentDe(id) {
      const vu = vus.get(id);
      if (typeof vu === 'string') return vu;
      return suivi.parents.get(id) ?? (vu === null ? null : undefined);
    },
  };
  const ancetres = (id: IdDeNoeud | null): NoeudDEvenement | null => {
    const chaine: IdDeNoeud[] = [];
    for (let courant = id; courant !== null && chaine.length < PROFONDEUR_MAX; courant = parentConnu(courant)) chaine.push(courant);
    return chaine.reduceRight<NoeudDEvenement | null>((parent, courant) => ({ id: courant, parent }), null);
  };
  const suivis = { noeuds: suivi.noeuds, maitres: suivi.maitres ?? new Set<IdDeNoeud>() };

  for (const entree of journal.depuis(depuis)) {
    // Un réglage de configuration (library choisie, niveau) ne touche pas au sujet : ce qui le lit se compare à la validation.
    if (entree.nature === 'ecriture') { if (entree.origine !== 'configuration') raisons.add('ecriture'); }
    else if (entree.nature === 'style') raisons.add('style');
    else if (entree.nature === 'noeud') {
      const changement: ChangementRecu = {
        type: entree.type,
        id: entree.id,
        ...(entree.properties ? { properties: entree.properties } : {}),
        ...(entree.type === 'DELETE' ? {} : { node: entree.parent === null ? { id: entree.id, removed: true } : { id: entree.id, parent: ancetres(entree.parent) } }),
      };
      const portee = porteeDesChangements([changement], suivis, anciens);
      if (portee.portee === 'sujet') raisons.add('sujet-touche');
      else if (portee.portee === 'inconnue' && !(deborde && portee.raison === 'journal-deborde')) raisons.add('portee-inconnue');
      if (entree.parent !== null) vus.set(entree.id, entree.parent);
      else if (!vus.has(entree.id)) vus.set(entree.id, null);
    }
  }
  return [...raisons];
}
