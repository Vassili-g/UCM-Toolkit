/**
 * La fenêtre de l'explorateur : ses deux dispositions, leurs bornes et leurs
 * clés. La lecture, le rangement et le bornage sont ceux du socle.
 *
 * La disposition large porte l'arbre, la table et l'inspecteur. La
 * disposition étroite porte la vue composant seule : le sandbox la choisit
 * dans un fichier sans variable locale. Chaque disposition range sa taille
 * sous sa propre clé.
 */
import * as socle from 'ucm-plugin-socle/src/fenetre';

export type Disposition = 'large' | 'etroite';

/** La taille d'ouverture, tant que rien n'a été rangé : l'arbre, la table et l'inspecteur côte à côte. */
export const TAILLE_PAR_DEFAUT = { largeur: 1200, hauteur: 800 } as const;

/** En dessous, l'arbre et la table ne tiennent plus côte à côte, inspecteur replié. */
export const TAILLE_MINIMALE = { largeur: 560, hauteur: 480 } as const;

/** Une clé propre au plugin, distincte de celles des deux autres plugins. */
export const CLE_DE_LA_FENETRE = 'ucm-explorateur/tailleFenetre';

/** La taille d'ouverture de la vue composant seule : une colonne. */
export const TAILLE_ETROITE = { largeur: 364, hauteur: 680 } as const;

/** En dessous, une ligne ne montre plus son nom à côté de sa valeur. */
export const TAILLE_MINIMALE_ETROITE = { largeur: 320, hauteur: 420 } as const;

export const CLE_DE_LA_FENETRE_ETROITE = 'ucm-explorateur/tailleFenetreEtroite';

const BORNES: Readonly<Record<Disposition, socle.BornesFenetre>> = {
  large: { defaut: TAILLE_PAR_DEFAUT, minimale: TAILLE_MINIMALE, cle: CLE_DE_LA_FENETRE },
  etroite: { defaut: TAILLE_ETROITE, minimale: TAILLE_MINIMALE_ETROITE, cle: CLE_DE_LA_FENETRE_ETROITE },
};

/** Ramène une demande de taille dans les bornes de la disposition. */
export function tailleValide(brut: Partial<socle.TailleFenetre> | null | undefined, disposition: Disposition = 'large'): socle.TailleFenetre {
  return socle.tailleValide(brut, BORNES[disposition]);
}

/** La taille rangée la fois précédente pour cette disposition, ou celle par défaut. */
export function lireTaille(disposition: Disposition = 'large'): Promise<socle.TailleFenetre> {
  return socle.lireTaille(BORNES[disposition]);
}

/**
 * Le redimensionnement de la fenêtre dans les bornes de la disposition que
 * `disposition` rend à chaque demande ; `appliquer` redimensionne l'iframe.
 */
export function creerRedimensionnement(appliquer: (taille: socle.TailleFenetre) => void, disposition: () => Disposition = () => 'large') {
  return socle.creerRedimensionnement((brut) => tailleValide(brut, disposition()), (taille) => appliquer(taille), (taille) => socle.rangerTaille(taille, BORNES[disposition()]));
}
