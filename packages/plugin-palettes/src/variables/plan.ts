/**
 * Ce qu'une palette écrit dans les variables ([VAR-01]) : une liste
 * ordonnée d'entrées, une par intensité, thème et nuance. Les couleurs
 * viennent de `rampesDe` du moteur, celles que l'aperçu, la planche et le
 * rapport lisent. Pur : ni Figma, ni DOM.
 */
import { MODES, grilleDe, intensitePorteuse, intensitesDe, rampeDe, rampesDe, type Intensite, type Mode, type Palette, type Recette } from 'ucm-couleur';

import { segmentsDuGroupe, type Destination } from './destination';
import { segmentDeLaPalette } from './noms';
import type { OrigineDeLaReprise } from './reprise';
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
 * reprise, et `origine` ce que le fichier porte autour d'elle ([VAR-13]).
 * Le plan couvre alors la palette entière, sous le chemin d'origine et dans
 * la forme d'une destination : un segment d'intensité à deux intensités, un
 * segment de thème quand le thème Dark n'est pas en mode. Les variables
 * d'origine portent la rampe Light. Leur intensité s'écrit sous la clé
 * `unique` : à deux intensités, celle que le suivi garde, sinon celle qui
 * porte la référence. Une variable suivie dont le nom diffère de celui du
 * plan est à renommer. Le thème Dark s'écrit en mode quand le suivi garde un
 * mode Dark, ou quand la destination met les thèmes en modes et que le suivi
 * n'a aucune variable Dark ; sinon dans le mode du thème Light. Une entrée
 * sans variable dont le nom est déjà pris, ou qui vise un alias, sort du
 * plan.
 *
 * Une palette figée, ou une origine que le fichier ne porte plus, ne rend
 * que les entrées que le suivi désigne, sans nom.
 */
export function planDesVariables(recette: Recette, palette: Palette, destination: Destination, suivie?: PaletteSuivie, origine?: OrigineDeLaReprise | null): EntreeDuPlan[] {
  if (suivie?.liaison === 'reprise') {
    const rampes = rampesDe(recette, palette);
    const nuances = grilleDe(recette, palette).crans;
    const porteuse = intensitePorteuse(recette, palette);
    const reprises: EntreeDuPlan[] = [];
    if (!origine || palette.figees !== undefined) {
      const rampe = rampeDe(rampes, porteuse);
      for (const mode of MODES) {
        nuances.forEach((nuance, rang) => {
          const cle = cleDuPlan('unique', mode, nuance);
          if (suivie.variables[cle]) reprises.push({ cle, nom: '', mode, hexa: rampe[mode][rang].hexa.toUpperCase() });
        });
      }
      return reprises;
    }
    const darkEnMode = suivie.modes.dark !== undefined
      || (destination.themes === 'modes' && !Object.keys(suivie.variables).some((cle) => cle.includes('/dark/')));
    const designee = (cle: string) => {
      const connue = suivie.variables[cle];
      return connue ? origine.suivies.get(connue.id) : undefined;
    };
    for (const intensite of intensitesDe(palette)) {
      const rampe = rampeDe(rampes, intensite);
      const dOrigine = intensite === (intensite === 'unique' ? 'unique' : suivie.intensite ?? porteuse);
      const segment = intensite === 'unique' ? [] : [intensite];
      for (const mode of MODES) {
        nuances.forEach((nuance, rang) => {
          const enMode = mode === 'light' || darkEnMode;
          const cle = cleDuPlan(dOrigine ? 'unique' : intensite, mode, nuance);
          const entree = { cle, mode: enMode ? mode : 'light', hexa: rampe[mode][rang].hexa.toUpperCase() } as const;
          const voulu = [origine.chemin, ...segment, ...(darkEnMode ? [] : [mode]), String(nuance)].filter((partie) => partie !== '').join('/');
          const propre = designee(cle);
          // Les deux thèmes d'une nuance en modes écrivent la même variable : la clé de l'autre thème la désigne aussi.
          const lue = propre ?? (darkEnMode ? designee(cleDuPlan(dOrigine ? 'unique' : intensite, mode === 'light' ? 'dark' : 'light', nuance)) : undefined);
          const occupant = origine.parNom.get(voulu);
          const cible = suivie.modes[entree.mode];
          if (!lue) {
            // Sans variable, l'entrée en crée une, ou reprend celle de ce nom que la palette suit sous une autre clé.
            const libre = !occupant || (origine.suivies.has(occupant.id) && !(cible !== undefined && occupant.valeurs[cible] === null));
            if (libre) reprises.push({ ...entree, nom: voulu });
            return;
          }
          if (!propre && cible !== undefined && lue.valeurs[cible] === null) return;
          // Une variable garde son nom quand une autre porte déjà celui que le plan lui donne.
          reprises.push({ ...entree, nom: occupant && occupant.id !== lue.id ? lue.nom : voulu });
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
