/** La taille reste dans clientStorage ; le document ne porte aucune préférence locale. */
import * as socle from 'ucm-plugin-socle/src/fenetre';
export const BORNES = { defaut: { largeur: 640, hauteur: 720 }, minimale: { largeur: 360, hauteur: 420 }, cle: 'ucm-architect/tailleFenetre' } as const;
export const lireTaille = () => socle.lireTaille(BORNES);
export const tailleValide = (brut: Partial<socle.TailleFenetre> | null | undefined) => socle.tailleValide(brut, BORNES);
export const creerRedimensionnement = (appliquer: (taille: socle.TailleFenetre) => void) => socle.creerRedimensionnement(tailleValide, appliquer, (taille) => socle.rangerTaille(taille, BORNES));
