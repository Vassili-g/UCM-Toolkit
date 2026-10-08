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
 * Le chemin d'une palette reprise : le groupe configuré s'il diffère du
 * groupe de référence du suivi, sinon le groupe des variables relues.
 */
export function cheminDeLaReprise(destination: Destination, suivie: PaletteSuivie, recette: Recette, palette: Palette, origine: OrigineDeLaReprise): string {
  const segmentsOrigine = origine.chemin.split('/').filter(Boolean);
  const nom = segmentsOrigine.at(-1) ?? segmentDeLaPalette(recette, palette).segment;
  const groupeOrigine = segmentsOrigine.slice(0, -1).join('/');
  const groupe = destination.groupe !== suivie.groupe ? destination.groupe : groupeOrigine;
  return [...(segmentsDuGroupe(groupe) ?? []), nom].join('/');
}

function suffixeDeNuance(nom: string | undefined, nuance: number): string {
  const dernier = nom?.split('/').at(-1) ?? '';
  const prefixe = `${nuance}-`;
  return dernier.startsWith(prefixe) && dernier.length > prefixe.length
    ? dernier.slice(String(nuance).length)
    : '';
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
 * Le plan couvre alors la palette entière, sous le groupe configuré s'il a
 * changé depuis la reprise, sinon sous le groupe lu dans ses variables. Le
 * dernier segment du chemin d'origine nomme la palette. La forme suit la
 * destination : un segment d'intensité à deux intensités, un segment de
 * thème quand le thème Dark n'est pas en mode. Les variables
 * d'origine portent la rampe Light. Leur intensité s'écrit sous la clé
 * `unique` : à deux intensités, celle que le suivi garde, sinon celle qui
 * porte la référence. Une variable suivie dont le nom diffère de celui du
 * plan est à renommer, sauf si le dernier segment ajoute un suffixe non vide
 * après le numéro de nuance : ce suffixe est conservé. Le thème Dark s'écrit
 * en mode quand le suivi garde un mode Dark, ou quand la destination met les
 * thèmes en modes et que le suivi n'a aucune variable Dark ; sinon dans le
 * mode du thème Light. Une entrée sans variable dont le nom est déjà pris,
 * ou qui vise un alias, sort du plan. `nomsOccupes` reçoit les collisions
 * avec les variables que la palette ne suit pas.
 *
 * Une palette figée garde les noms d'origine tant qu'une variable suivie
 * subsiste. Sans variable restante, le chemin rangé et la destination actuelle
 * déterminent les variables à recréer.
 */
export function planDesVariables(recette: Recette, palette: Palette, destination: Destination, suivie?: PaletteSuivie, origine?: OrigineDeLaReprise | null, nomsOccupes: string[] = []): EntreeDuPlan[] {
  if (suivie?.liaison === 'reprise') {
    const rampes = rampesDe(recette, palette);
    const nuances = grilleDe(recette, palette).crans;
    const porteuse = intensitePorteuse(recette, palette);
    const reprises: EntreeDuPlan[] = [];
    if (!origine || (palette.figees !== undefined && (origine.suivies.size > 0 || !suivie.chemin))) {
      // Une palette figée à deux intensités écrit chacune sous la clé que son suivi lui donne : `unique` pour celle qui porte les variables d'origine.
      const intensites = palette.figees !== undefined ? intensitesDe(palette) : [porteuse];
      for (const intensite of intensites) {
        const rampe = rampeDe(rampes, intensite);
        const rangee = palette.figees !== undefined && intensite !== 'unique' && intensite !== (suivie.intensite ?? porteuse) ? intensite : 'unique';
        for (const mode of MODES) {
          nuances.forEach((nuance, rang) => {
            const cle = cleDuPlan(rangee, mode, nuance);
            if (suivie.variables[cle]) reprises.push({ cle, nom: '', mode: mode === 'dark' && suivie.modes.dark === undefined ? 'light' : mode, hexa: rampe[mode][rang].hexa.toUpperCase() });
          });
        }
      }
      return reprises;
    }
    const darkEnMode = origine.suivies.size === 0
      ? destination.themes === 'modes'
      : suivie.modes.dark !== undefined
        || (destination.themes === 'modes' && !Object.keys(suivie.variables).some((cle) => cle.includes('/dark/')));
    const chemin = cheminDeLaReprise(destination, suivie, recette, palette, origine);
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
          const propre = designee(cle);
          // Les deux thèmes d'une nuance en modes écrivent la même variable : la clé de l'autre thème la désigne aussi.
          const lue = propre ?? (darkEnMode ? designee(cleDuPlan(dOrigine ? 'unique' : intensite, mode === 'light' ? 'dark' : 'light', nuance)) : undefined);
          const voulu = `${[chemin, ...segment, ...(darkEnMode ? [] : [mode]), String(nuance)].filter((partie) => partie !== '').join('/')}${suffixeDeNuance(lue?.nom, nuance)}`;
          const occupant = origine.parNom.get(voulu);
          const cible = suivie.modes[entree.mode];
          if (!lue) {
            // Sans variable, l'entrée en crée une, ou reprend celle de ce nom que la palette suit sous une autre clé.
            const libre = !occupant || (origine.suivies.has(occupant.id) && !(cible !== undefined && occupant.valeurs[cible] === null));
            if (libre) reprises.push({ ...entree, nom: voulu });
            else if (occupant && !origine.suivies.has(occupant.id)) nomsOccupes.push(voulu);
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
