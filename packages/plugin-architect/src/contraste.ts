/**
 * Le contraste d'une paire choisie par le designer, dans un contexte connu.
 * Le calcul et la comparaison au seuil sont ceux du kit, que UCM Palettes et
 * `ucm check` emploient. Ce module ne lit aucun profil UCM.
 *
 * Un premier plan translucide se compose sur son fond, comme C49. Un fond
 * translucide laisse le fond réel inconnu ; une composante hors de [0, 1] sort
 * du gamut que le calcul suppose. Les deux rendent un résultat non jugé, avec
 * sa raison. Le calcul se fait sur la couleur en sRGB à 8 bits : dans un
 * document Display P3, les canaux passent d'abord par `versSrgb`.
 */
import { SEUILS_PAR_USAGE, SEUIL_TEXTE_AAA } from '@ucm-kit/core/referentiel';
import { atteintLeSeuil, composer, contraste, couleurDansLeGamut, ecrireContraste, OPAQUE, type Rgb8 } from '@ucm-kit/core/emplois';

import { versSrgb } from './espace';
import type { Couleur, EspaceDuReleve } from './modele';
import type { Resultat } from './resolution';

export const SEUILS = [SEUILS_PAR_USAGE.nonTexte, SEUILS_PAR_USAGE.texte, SEUIL_TEXTE_AAA] as const;

export type Contraste =
  | { readonly statut: 'juge'; readonly ratio: number; readonly affiche: string; readonly atteint: boolean; readonly seuil: number }
  | { readonly statut: 'non-juge'; readonly raison: 'transparence' | 'non-resolu' | 'pas-une-couleur' | 'gamut' };

function enOctets(couleur: Couleur): Rgb8 {
  return [Math.round(couleur.r * 255), Math.round(couleur.g * 255), Math.round(couleur.b * 255)];
}

/** Juge le contraste du premier plan sur le fond, au seuil donné, pour des couleurs rangées dans `espace`. */
export function jugerContraste(premierPlan: Resultat, fond: Resultat, seuil: number, espace: EspaceDuReleve = 'srgb'): Contraste {
  if (premierPlan.statut !== 'resolu' || fond.statut !== 'resolu') return { statut: 'non-juge', raison: 'non-resolu' };
  if (premierPlan.valeur.nature !== 'couleur' || fond.valeur.nature !== 'couleur') return { statut: 'non-juge', raison: 'pas-une-couleur' };
  const [devant, derriere] = [premierPlan.valeur.couleur, fond.valeur.couleur];
  if (!couleurDansLeGamut(devant) || !couleurDansLeGamut(derriere)) return { statut: 'non-juge', raison: 'gamut' };
  if (derriere.a < OPAQUE) return { statut: 'non-juge', raison: 'transparence' };
  const composee = composer([devant], derriere);
  if (!composee) return { statut: 'non-juge', raison: 'transparence' };
  const ratio = contraste(enOctets(versSrgb(composee, espace).couleur), enOctets(versSrgb(derriere, espace).couleur));
  return { statut: 'juge', ratio, affiche: ecrireContraste(ratio), atteint: atteintLeSeuil(ratio, seuil), seuil };
}
