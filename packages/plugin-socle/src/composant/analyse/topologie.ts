/**
 * La topologie du jeu analysé et l'inventaire de péremption qu'on en tire : les
 * identifiants dont un changement rend l'analyse périmée, avec la couverture de
 * cette liste.
 *
 * `lireLaTopologieDuJeu` lit le jeu (ou le composant seul), ses enfants directs
 * et, par un seul `findAll`, tous ses descendants, instances comprises : la
 * couverture déclare `instances: 'descendues'`. Les descendants au-delà des
 * enfants directs n'ont que leur identifiant, car lire leur type et leur nom
 * ajouterait des milliers de lectures à l'ouverture de l'analyse. Un `children`
 * ou un `findAll` qui lève est un trou `enfants` : la liste vide d'un nœud
 * illisible ne se confond pas avec celle d'un nœud sans enfants.
 *
 * Les ancêtres du jeu n'y entrent pas : le jeu est un sommet dont le parent
 * n'est pas lu, et un déplacement du jeu le nomme lui-même dans l'événement.
 */
import {
  acquis, NON_DEMANDE, refuse,
  type Couverture, type IdDeNoeud, type NoeudDeTopologie, type RaisonDeRefus, type TrouDeCouverture,
} from './faits';

/** Ce que la lecture demande à un nœud ; un nœud Figma convient, un double de test aussi. */
export interface NoeudALire {
  readonly id: string;
  readonly type?: string;
  readonly name?: string;
  readonly children?: readonly NoeudALire[];
  findAll?(filtre: () => boolean): readonly { readonly id: string }[];
}

export interface TopologieLue {
  readonly sommets: readonly IdDeNoeud[];
  readonly topologie: { readonly [id: string]: NoeudDeTopologie };
  /** Les descendants que `findAll` a rendus, dans son ordre, par identifiant seul : ils n'ont pas d'entrée dans `topologie`. */
  readonly descendants: readonly IdDeNoeud[];
  readonly couverture: Couverture;
}

export interface InventaireDePeremption {
  /** Le jeu, ses enfants directs, puis ses descendants : un événement sur l'un d'eux périme l'analyse. */
  readonly noeuds: readonly IdDeNoeud[];
  /** Le jeu et ses enfants directs : une sélection de l'un d'eux ne périme pas l'analyse. */
  readonly admis: readonly IdDeNoeud[];
  readonly couverture: Couverture;
}

const messageDe = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));

/** `type` et `name` d'un nœud supprimé lèvent : le trou `enfants` du même nœud porte alors le refus. */
function texteDe(lire: () => string | undefined): string {
  try { return lire() ?? ''; }
  catch { return ''; }
}

type EnfantsLus = { readonly lus: readonly NoeudALire[] } | { readonly raison: RaisonDeRefus; readonly message?: string };

function enfantsDe(noeud: NoeudALire): EnfantsLus {
  try {
    const { children } = noeud;
    return children === undefined ? { raison: 'absent' } : { lus: children };
  } catch (erreur) {
    return { raison: 'leve', message: messageDe(erreur) };
  }
}

/**
 * Les enfants d'un jeu de variants sont des variants, sommets de composant. Un composant seul garde ses calques
 * ordinaires, sauf une instance, que la couverture `frontiere` ne descendrait pas.
 */
function frontiereDesEnfants(typeDuJeu: string, type: string): NoeudDeTopologie['frontiere'] {
  if (typeDuJeu === 'COMPONENT_SET') return 'racine';
  return type === 'INSTANCE' ? 'instance' : 'ordinaire';
}

export function lireLaTopologieDuJeu(jeu: NoeudALire): TopologieLue {
  const trous: TrouDeCouverture[] = [];
  const topologie: Record<string, NoeudDeTopologie> = {};
  const typeDuJeu = texteDe(() => jeu.type);
  const enfants = enfantsDe(jeu);

  const idsDesEnfants: IdDeNoeud[] = [];
  if ('lus' in enfants) {
    enfants.lus.forEach((enfant, rang) => {
      idsDesEnfants.push(enfant.id);
      const type = texteDe(() => enfant.type);
      topologie[enfant.id] = {
        id: enfant.id, type, nom: texteDe(() => enfant.name), parent: jeu.id, rang,
        enfants: NON_DEMANDE, frontiere: frontiereDesEnfants(typeDuJeu, type), sousUneInstance: false,
      };
    });
  } else if (enfants.raison === 'leve') {
    trous.push({ type: 'enfants', noeud: jeu.id, raison: 'leve', ...(enfants.message === undefined ? {} : { message: enfants.message }) });
  }
  topologie[jeu.id] = {
    id: jeu.id, type: typeDuJeu, nom: texteDe(() => jeu.name), parent: null, rang: null,
    enfants: 'lus' in enfants ? acquis(idsDesEnfants) : refuse(enfants.raison, enfants.message),
    frontiere: 'racine', sousUneInstance: false,
  };

  let descendants: readonly IdDeNoeud[] = [];
  try {
    if (typeof jeu.findAll === 'function') descendants = jeu.findAll(() => true).map((noeud) => noeud.id);
    else if (idsDesEnfants.length > 0) trous.push({ type: 'enfants', noeud: jeu.id, raison: 'absent' });
  } catch (erreur) {
    if (!trous.some((trou) => trou.type === 'enfants' && trou.noeud === jeu.id)) {
      trous.push({ type: 'enfants', noeud: jeu.id, raison: 'leve', message: messageDe(erreur) });
    }
  }

  const couverture: Couverture = trous.length === 0 ? { instances: 'descendues', complete: true } : { instances: 'descendues', complete: false, trous };
  return { sommets: [jeu.id], topologie, descendants, couverture };
}

/** L'inventaire se lit sur la topologie : les enfants directs du sommet, puis les descendants. */
export function inventaireDePeremption(lue: TopologieLue): InventaireDePeremption {
  const admis = lue.sommets.flatMap((sommet) => {
    const { enfants } = lue.topologie[sommet];
    return [sommet, ...(enfants.etat === 'acquis' ? enfants.valeur : [])];
  });
  return { noeuds: [...admis, ...lue.descendants], admis, couverture: lue.couverture };
}

/** Une page que le sandbox n'écoute pas est un trou : un changement qui s'y produit n'atteint pas l'analyse. */
export function avecLesPagesNonEcoutees(couverture: Couverture, pages: readonly IdDeNoeud[]): Couverture {
  if (pages.length === 0) return couverture;
  const nouveaux: TrouDeCouverture[] = pages.map((page) => ({ type: 'page-non-ecoutee', page }));
  return { instances: couverture.instances, complete: false, trous: [...(couverture.complete ? [] : couverture.trous), ...nouveaux] };
}
