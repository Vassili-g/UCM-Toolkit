/**
 * La fenêtre de l'explorateur : ses bornes et sa clé. La lecture, le
 * rangement et le bornage sont ceux du socle.
 */
import * as socle from 'ucm-plugin-socle/src/fenetre';

/** La taille d'ouverture, tant que rien n'a été rangé : l'arbre, la table et l'inspecteur côte à côte. */
export const TAILLE_PAR_DEFAUT = { largeur: 1200, hauteur: 800 } as const;

/** En dessous, l'arbre et la table ne tiennent plus côte à côte, inspecteur replié. */
export const TAILLE_MINIMALE = { largeur: 560, hauteur: 480 } as const;

/** Une clé propre au plugin, distincte de celles des deux autres plugins. */
export const CLE_DE_LA_FENETRE = 'ucm-explorateur/tailleFenetre';

const BORNES: socle.BornesFenetre = { defaut: TAILLE_PAR_DEFAUT, minimale: TAILLE_MINIMALE, cle: CLE_DE_LA_FENETRE };

/** Ramène une demande de taille dans les bornes de l'explorateur. */
export function tailleValide(brut: Partial<socle.TailleFenetre> | null | undefined): socle.TailleFenetre {
  return socle.tailleValide(brut, BORNES);
}

/** La taille rangée la fois précédente, ou celle par défaut. */
export function lireTaille(): Promise<socle.TailleFenetre> {
  return socle.lireTaille(BORNES);
}

/** Le redimensionnement de la fenêtre dans les bornes de l'explorateur ; `appliquer` redimensionne l'iframe. */
export function creerRedimensionnement(appliquer: (taille: socle.TailleFenetre) => void) {
  return socle.creerRedimensionnement(tailleValide, (taille) => appliquer(taille), (taille) => socle.rangerTaille(taille, BORNES));
}
