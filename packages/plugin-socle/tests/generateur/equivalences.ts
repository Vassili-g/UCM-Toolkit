/**
 * Les équivalences de projection : ce que le contrat dit autrement que le dessin, sans rien perdre. Le modèle de vérité (`verite.ts`)
 * décrit le dessin et la convention d'UCM ; il passe par cette liste chaque fois qu'il écrit une chose que le contrat projette
 * à sa façon. Une équivalence n'est pas une perte : le contrat porte la même information, sous une autre forme, et FORMAT.md la fonde.
 *
 * Chaque entrée de `EQUIVALENCES` nomme une fonction de `Projection` et cite la section de FORMAT.md qui la fonde. Une règle sans
 * section qui la fonde ne s'ajoute pas ici ; son écart reste visible au comparateur.
 *
 * Borne : `enveloppeDeTailleEnCadre` tombe avec le contrat 15.0, où le wrapper de taille n'existe plus (option E du plan de P22,
 * case 0.6) ; les trois autres restent.
 */
import { calqueDe } from './capacites';
import type { DocumentGenere, Noeud } from './types';

/** Les quatre décisions de projection que le modèle de vérité demande à cette liste. */
export interface Projection {
  /** Une instance entre dans la vue même sans information : le contrat la publie comme un slot facultatif. */
  instanceEnSlotFacultatif(n: Noeud): boolean;
  /** Le wrapper de taille que la spec décrit se lit comme un cadre : il règle les dimensions de ses enfants, il n'est pas une dépendance. */
  enveloppeDeTailleEnCadre(doc: DocumentGenere, n: Noeud): boolean;
  /** Le gap d'un conteneur se publie à partir de deux enfants ; celui de la racine se publie toujours. */
  gapDUnSeulEnfant(enfants: number, estRacine: boolean): boolean;
  /** Une variante se nomme `Axe=Valeur` : le composant posé porte le nom de son jeu. */
  nomDuJeuPourUneVariante(doc: DocumentGenere, maitre: string): string;
}

export const PROJECTION: Projection = {
  instanceEnSlotFacultatif: (n) => n.type === 'INSTANCE',
  enveloppeDeTailleEnCadre: (doc, n) => n.type === 'INSTANCE' && !!doc.spec.wrapperTaille && n.name === `.sizeWrapper${doc.spec.nom}`,
  gapDUnSeulEnfant: (enfants, estRacine) => estRacine || enfants > 1,
  nomDuJeuPourUneVariante: (doc, maitre) => {
    const variante = calqueDe(doc, maitre);
    const jeu = variante.parent ? doc.noeuds.find((n) => n.id === variante.parent) : undefined;
    return jeu?.type === 'COMPONENT_SET' ? jeu.name : variante.name;
  },
};

export interface Equivalence {
  cle: keyof Projection;
  enonce: string;
  /** La section de FORMAT.md qui fonde l'équivalence, en chemin de titres. */
  fondement: string;
}

export const EQUIVALENCES: readonly Equivalence[] = [
  {
    cle: 'instanceEnSlotFacultatif',
    enonce: 'Une instance sans information propre reste dans la vue : le contrat la publie comme un slot facultatif.',
    fondement: 'docs/format/FORMAT.md, « 6. Structure » (un calque graphique devient un slot `optional`) et « Composition et dépendances » (une instance déclarée n’est pas parcourue)',
  },
  {
    cle: 'enveloppeDeTailleEnCadre',
    enonce: 'Le wrapper de taille se lit comme un cadre qui range ses enfants, jamais comme un composant posé.',
    fondement: 'docs/format/FORMAT.md, « 3. Layout » (le wrapper de dimensions prête ses dimensions au composant, ses props sont fusionnées dans l’API)',
  },
  {
    cle: 'gapDUnSeulEnfant',
    enonce: 'Un conteneur qui range un seul enfant ne publie pas de gap, la racine le publie toujours.',
    fondement: 'docs/format/FORMAT.md, « 6. Structure » (« gap n’est relevé qu’à partir de deux enfants ») et « Composition et dépendances » › « Cadre de dépendance »',
  },
  {
    cle: 'nomDuJeuPourUneVariante',
    enonce: 'Le composant qu’une instance pose porte le nom de son jeu de variantes, pas celui de la variante (`Axe=Valeur`).',
    fondement: 'docs/format/FORMAT.md, « Composition et dépendances » (« un variant interne d’un set reconnu prend le nom du set »)',
  },
];
