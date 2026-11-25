/**
 * Ce que `rendu.js` lit pour dessiner la chaîne UCM : les constantes de `briques.ts`, rendues telles quelles. C'est la seule entrée
 * que lit `generer-inventaire.ts`.
 */
import { GARANTIES, KIT, LEGENDES, LIENS, MARQUES, NOEUDS, ZONES } from './briques';

export function donneesDeLaChaine() {
  return { ZONES, LEGENDES, NOEUDS, LIENS, KIT, MARQUES, GARANTIES };
}

export type DonneesDeLaChaine = ReturnType<typeof donneesDeLaChaine>;
