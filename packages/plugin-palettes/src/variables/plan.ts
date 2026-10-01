/**
 * Ce qu'une palette écrit dans les variables ([VAR-01]) : une liste
 * ordonnée d'entrées, une par intensité, thème et nuance. Les couleurs
 * viennent de `rampesDe` du moteur, celles que l'aperçu, la planche et le
 * rapport lisent. Pur : ni Figma, ni DOM.
 */
import { MODES, grilleDe, intensitesDe, rampeDe, rampesDe, type Intensite, type Mode, type Palette, type Recette } from 'ucm-couleur';

import { segmentsDuGroupe, type Destination } from './destination';
import { segmentDeLaPalette } from './noms';
import type { PaletteSuivie } from './suivi';

/** Le mode qu'une entrée écrit : le seul mode suivi quand les thèmes sont dans le chemin, sinon son thème. */
export type ModeDuPlan = 'unique' | Mode;

export interface EntreeDuPlan {
  /** La clé stable de l'entrée dans le suivi, `{intensité}/{thème}/{nuance}` : elle ne dépend ni du nom ni de la destination. */
  readonly cle: string;
  /** Le nom de la variable, segments séparés par `/`. */
  readonly nom: string;
  readonly mode: ModeDuPlan;
  /** La couleur que le plugin calcule, en hexa majuscule. */
  readonly hexa: string;
}

/** La clé d'une entrée du plan. */
export function cleDuPlan(intensite: Intensite, mode: Mode, nuance: number): string {
  return `${intensite}/${mode}/${nuance}`;
}

/**
 * Le plan d'une palette, dans l'ordre des intensités, puis des thèmes, puis
 * des nuances. Avec les thèmes dans le chemin, chaque entrée a sa variable.
 * Avec les thèmes en modes, le chemin perd son segment de thème : les
 * entrées Light et Dark d'une nuance portent le même nom. Une palette à une
 * intensité n'a pas de segment d'intensité, et une palette libre écrit ses
 * seules nuances.
 *
 * Pour une palette reprise du fichier, `suivie` porte une liaison de
 * reprise : le plan ne rend que les entrées que le suivi désigne, sans nom,
 * chacune dans le mode de son thème. La destination ne la concerne pas
 * ([VAR-13]).
 */
export function planDesVariables(recette: Recette, palette: Palette, destination: Destination, suivie?: PaletteSuivie): EntreeDuPlan[] {
  if (suivie?.liaison === 'reprise') {
    const rampes = rampesDe(recette, palette);
    const nuances = grilleDe(recette, palette).crans;
    const reprises: EntreeDuPlan[] = [];
    for (const intensite of intensitesDe(palette)) {
      const rampe = rampeDe(rampes, intensite);
      for (const mode of MODES) {
        nuances.forEach((nuance, rang) => {
          const cle = cleDuPlan(intensite, mode, nuance);
          if (suivie.variables[cle]) reprises.push({ cle, nom: '', mode, hexa: rampe[mode][rang].hexa.toUpperCase() });
        });
      }
    }
    return reprises;
  }
  const groupe = segmentsDuGroupe(destination.groupe) ?? [];
  const { segment } = segmentDeLaPalette(recette, palette);
  const rampes = rampesDe(recette, palette);
  const nuances = grilleDe(recette, palette).crans;
  const enModes = destination.themes === 'modes';
  const plan: EntreeDuPlan[] = [];
  for (const intensite of intensitesDe(palette)) {
    const rampe = rampeDe(rampes, intensite);
    for (const mode of MODES) {
      nuances.forEach((nuance, rang) => {
        const chemin = [...groupe, segment, ...(intensite === 'unique' ? [] : [intensite]), ...(enModes ? [] : [mode]), String(nuance)];
        plan.push({ cle: cleDuPlan(intensite, mode, nuance), nom: chemin.join('/'), mode: enModes ? mode : 'unique', hexa: rampe[mode][rang].hexa.toUpperCase() });
      });
    }
  }
  return plan;
}

/** Les noms de variable d'un plan, sans doublon, dans son ordre : 44 avec les thèmes dans le chemin, 22 en modes. */
export function nomsDuPlan(plan: readonly EntreeDuPlan[]): string[] {
  return [...new Set(plan.map((entree) => entree.nom))];
}
