/**
 * La fenêtre de l'explorateur : ses deux dispositions, leurs bornes et leurs
 * clés. La lecture, le rangement et le bornage sont ceux du socle.
 *
 * La disposition large est le mode Tokens : l'arbre, la table et le panneau
 * latéral. La disposition étroite est le mode Composant. Le sandbox ouvre
 * l'étroite quand la sélection a un sujet, la large sinon, et la bascule de
 * la barre passe de l'une à l'autre. Chaque disposition range sa taille sous
 * sa propre clé.
 */
import * as socle from 'ucm-plugin-socle/src/fenetre';

export type Disposition = 'large' | 'etroite';

/** La taille d'ouverture du mode Tokens, tant que rien n'a été rangé : l'arbre, la table et le panneau latéral de 640 px côte à côte. */
export const TAILLE_PAR_DEFAUT = { largeur: 1360, hauteur: 800 } as const;

/** En dessous, l'arbre et la table ne tiennent plus côte à côte, inspecteur replié. */
export const TAILLE_MINIMALE = { largeur: 560, hauteur: 480 } as const;

/** Une clé propre au plugin, distincte de celles des deux autres plugins. */
export const CLE_DE_LA_FENETRE = 'ucm-explorateur/tailleFenetre';

/** La taille d'ouverture du mode Composant, panneau des constats fermé. */
export const TAILLE_ETROITE = { largeur: 520, hauteur: 760 } as const;

/** La taille du mode Composant, panneau des constats ouvert. L'interface la demande par `resize` ; elle n'est pas rangée comme défaut. */
export const TAILLE_COMPOSANT_PANNEAU_OUVERT = { largeur: 1040, hauteur: 760 } as const;

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
