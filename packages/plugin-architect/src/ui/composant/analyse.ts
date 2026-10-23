/**
 * Ce que la vue Composant retient de l'analyse : les constats que le bouton
 * Constats compte et que la section Variants répartit par valeur. Le panneau
 * des constats lit le même état.
 */
import { TYPES_D_ALERTE, type TypeDAlerte } from '@ucm-kit/core/referentiel';

import type { LectureDeComposant } from '../../composant';
import type { MessageDAnalyse } from '../../messages/analyse';
import type { Constat } from '../../messages/commun';
import type { Etat } from '../etat';

export interface AnalyseRecue {
  readonly statut: 'en-cours' | 'complete' | 'partielle' | 'annulee' | 'arretee';
  readonly constats: readonly Constat[];
  readonly variants: ReadonlyArray<{ readonly id: string; readonly nom: string }>;
  /** Un changement du document ou de la sélection a rendu ces constats périmés ; l'interface les garde. */
  readonly perimee: boolean;
  /** L'heure de réception, en millisecondes. */
  readonly recueA: number;
}

/** Retient le message du sandbox. `analyse-en-cours` et `occupe` ne changent rien à ce que la vue montre. */
export function recevoirUneAnalyse(etat: Etat, message: MessageDAnalyse): void {
  if (message.type === 'analyse-commencee') etat.analyse = { statut: 'en-cours', constats: [], variants: [], perimee: false, recueA: Date.now() };
  else if (message.type === 'analyse') etat.analyse = { statut: message.statut, constats: message.constats, variants: message.variants, perimee: false, recueA: Date.now() };
  else if (message.type === 'perime' && etat.analyse) etat.analyse = { ...etat.analyse, perimee: true };
}

/** L'analyse retenue quand elle porte sur le composant lu (un de ses variants est un variant du jeu affiché), sinon `null`. */
export function analyseDe(etat: Etat, lecture: LectureDeComposant | null): AnalyseRecue | null {
  const { analyse } = etat;
  if (!analyse || !lecture || analyse.statut === 'en-cours') return null;
  const ids = new Set([lecture.sujet.id, ...lecture.sujet.variants.map((variant) => variant.id)]);
  return analyse.variants.some((variant) => ids.has(variant.id)) ? analyse : null;
}

/** Le plus grave des types, dans l'ordre du kit ; `null` sans constat. */
export function tonLePlusGrave(constats: readonly Pick<Constat, 'type'>[]): TypeDAlerte | null {
  let meilleur: TypeDAlerte | null = null;
  let rang: number = TYPES_D_ALERTE.length;
  for (const { type } of constats) {
    const candidat = TYPES_D_ALERTE.findIndex((entree) => entree.id === type);
    if (candidat < rang) {
      rang = candidat;
      meilleur = type;
    }
  }
  return meilleur;
}
