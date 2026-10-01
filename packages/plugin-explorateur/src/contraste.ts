/**
 * Le contraste d'une paire choisie par le designer, dans un contexte connu.
 * Le calcul et la comparaison au seuil sont ceux du kit, que UCM Palettes et
 * `ucm check` emploient. Ce module ne lit aucun profil UCM.
 *
 * Seules deux couleurs opaques en sRGB se jugent. Une transparence laisse le
 * fond réel inconnu ; une composante hors de [0, 1] sort du gamut que le
 * calcul suppose. Les deux rendent un résultat non jugé, avec sa raison.
 */
import { aDixDecimales, atteintLeSeuil, contraste, type Rgb8 } from '@ucm-kit/core/emplois';

import type { Couleur } from './modele';
import type { Resultat } from './resolution';

export const SEUILS = [3, 4.5, 7] as const;

export type Contraste =
  | { readonly statut: 'juge'; readonly ratio: number; readonly affiche: string; readonly atteint: boolean; readonly seuil: number }
  | { readonly statut: 'non-juge'; readonly raison: 'transparence' | 'non-resolu' | 'pas-une-couleur' | 'gamut' };

function enOctets(couleur: Couleur): Rgb8 {
  return [Math.round(couleur.r * 255), Math.round(couleur.g * 255), Math.round(couleur.b * 255)];
}

/** Le ratio tronqué à deux décimales, avec la virgule : 4,499 s'affiche 4,49 et ne passe pas 4,5. */
export function ratioAffiche(ratio: number): string {
  const [entier, decimales] = aDixDecimales(ratio).split('.');
  return `${entier},${decimales.slice(0, 2)}`;
}

/** Juge le contraste du premier plan sur le fond, au seuil donné. */
export function jugerContraste(premierPlan: Resultat, fond: Resultat, seuil: number): Contraste {
  if (premierPlan.statut !== 'resolu' || fond.statut !== 'resolu') return { statut: 'non-juge', raison: 'non-resolu' };
  if (premierPlan.valeur.nature !== 'couleur' || fond.valeur.nature !== 'couleur') return { statut: 'non-juge', raison: 'pas-une-couleur' };
  const couleurs = [premierPlan.valeur.couleur, fond.valeur.couleur];
  if (couleurs.some((couleur) => [couleur.r, couleur.g, couleur.b].some((composante) => !(composante >= 0 && composante <= 1)))) return { statut: 'non-juge', raison: 'gamut' };
  if (couleurs.some((couleur) => couleur.a !== 1)) return { statut: 'non-juge', raison: 'transparence' };
  const ratio = contraste(enOctets(couleurs[0]), enOctets(couleurs[1]));
  return { statut: 'juge', ratio, affiche: ratioAffiche(ratio), atteint: atteintLeSeuil(ratio, seuil), seuil };
}
