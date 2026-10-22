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
import type { VariableLue } from './releve';
import type { PaletteSuivie } from './suivi';

/** Le mode qu'une entrée écrit : le seul mode suivi quand les thèmes sont dans le chemin, sinon son thème. */
export type ModeDuPlan = 'unique' | Mode;

export interface EntreeDuPlan {
  /** La clé stable de l'entrée dans le suivi, `{intensité}/{thème}/{nuance}` : elle ne dépend ni du nom ni de la destination. */
  readonly cle: string;
  /** Le nom de la variable, segments séparés par `/`. */
  readonly nom: string;
  /** Dans une reprise, le nom voulu avant les règles de nommage, quand elles le changent. */
  readonly brut?: string;
  readonly mode: ModeDuPlan;
  /** La couleur que le plugin calcule, en hexa majuscule. */
  readonly hexa: string;
}

/** Ce que le nommeur reçoit d'une entrée : sa clé, son nom brut, et la variable que le fichier porte déjà pour elle. */
export interface EntreeANommer {
  readonly cle: string;
  readonly nom: string;
  readonly id?: string;
}

/** Les noms que les règles de nommage du fichier donnent à ces entrées, dans leur ordre. */
export type Nommer = (entrees: readonly EntreeANommer[]) => string[];

/** Un nom qu'une entrée de reprise veut prendre et qu'une palette précédente du même lot tient déjà. */
export interface NomReserve {
  readonly nom: string;
  readonly palette: string;
}

/**
 * Le plan sous les noms de `nommer`. `id` donne la variable que le fichier
 * porte pour une clé ; une entrée sans nom reste telle quelle.
 */
export function nommerLePlan(plan: readonly EntreeDuPlan[], nommer: Nommer, id: (cle: string) => string | undefined): EntreeDuPlan[] {
  // Thèmes en modes : Light et Dark d'une nuance sont une seule variable, que seule l'entrée qui la porte désigne. Les deux entrées prennent son id.
  const idDuNom = new Map<string, string>();
  for (const entree of plan) {
    const existant = entree.nom === '' ? undefined : id(entree.cle);
    if (existant !== undefined && !idDuNom.has(entree.nom)) idDuNom.set(entree.nom, existant);
  }
  const noms = nommer(plan.map((entree) => ({ cle: entree.cle, nom: entree.nom, id: id(entree.cle) ?? idDuNom.get(entree.nom) })));
  return plan.map((entree, rang) => (entree.nom === '' || noms[rang] === entree.nom ? entree : { ...entree, nom: noms[rang] }));
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
 * avec les variables que la palette ne suit pas. `reservesDuLot` donne les
 * noms (en minuscules) que les palettes précédentes du lot tiennent dans la
 * collection de la reprise : une entrée dont le nom, créé ou visé par un
 * renommage, y figure sort du plan et rejoint `nomsReserves`, que l'appelant
 * traite comme un refus de la reprise entière.
 *
 * Une palette figée garde les noms d'origine tant qu'une variable suivie
 * subsiste. Sans variable restante, le chemin rangé et la destination actuelle
 * déterminent les variables à recréer.
 *
 * Sans `nommer`, le plan porte les noms bruts. Avec lui (les règles de nommage
 * du fichier, voir `nommeur.ts`), il porte les noms finaux, et la reprise
 * compare ces noms-là à ceux du fichier : l'occupant d'un nom et la variable à
 * renommer se cherchent sur le nom final, que le fichier porte déjà quand
 * UCM Architect l'a appliqué. Une entrée garde dans `brut` le nom d'avant
 * les règles : une variable qui le porte n'est pas à renommer, comme celles
 * d'une palette que le plugin a créée. Le plan reste pur : `nommer` est injecté.
 */
export function planDesVariables(recette: Recette, palette: Palette, destination: Destination, suivie?: PaletteSuivie, origine?: OrigineDeLaReprise | null, nomsOccupes: string[] = [], nommer?: Nommer, reservesDuLot?: ReadonlyMap<string, string>, nomsReserves: NomReserve[] = []): EntreeDuPlan[] {
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
    /** Une entrée avant le choix du nom : le nom brut qu'elle voudrait, et la variable que le fichier porte pour elle. */
    const candidats: { readonly entree: Omit<EntreeDuPlan, 'nom'>; readonly lue: VariableLue | undefined; readonly voulu: string }[] = [];
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
          const cible = suivie.modes[entree.mode];
          if (lue && !propre && cible !== undefined && lue.valeurs[cible] === null) return;
          const voulu = `${[chemin, ...segment, ...(darkEnMode ? [] : [mode]), String(nuance)].filter((partie) => partie !== '').join('/')}${suffixeDeNuance(lue?.nom, nuance)}`;
          candidats.push({ entree, lue, voulu });
        });
      }
    }
    // Les noms se choisissent ensemble : les règles de nommage lisent tout le fichier, et l'occupant d'un nom se cherche sur le nom final.
    const finals = nommer ? nommer(candidats.map(({ entree, lue, voulu }) => ({ cle: entree.cle, nom: voulu, id: lue?.id }))) : candidats.map(({ voulu }) => voulu);
    candidats.forEach(({ entree, lue, voulu: brut }, rang) => {
      const voulu = finals[rang];
      const occupant = origine.parNom.get(voulu.toLowerCase());
      const cible = suivie.modes[entree.mode];
      const reservePar = reservesDuLot?.get(voulu.toLowerCase());
      if (reservePar !== undefined && (!lue || occupant?.id !== lue.id)) {
        // Une palette précédente du lot tient ce nom : la reprise entière est refusée, et l'entrée n'écrit rien.
        nomsReserves.push({ nom: voulu, palette: reservePar });
        if (lue) reprises.push({ ...entree, nom: lue.nom, ...(brut !== voulu ? { brut } : {}) });
        return;
      }
      if (!lue) {
        // Sans variable, l'entrée en crée une, ou reprend celle de ce nom que la palette suit sous une autre clé.
        const libre = !occupant || (origine.suivies.has(occupant.id) && !(cible !== undefined && occupant.valeurs[cible] === null));
        if (libre) reprises.push({ ...entree, nom: voulu });
        else if (occupant && !origine.suivies.has(occupant.id)) nomsOccupes.push(voulu);
        return;
      }
      // Une variable garde son nom quand une autre porte déjà celui que le plan lui donne.
      reprises.push({ ...entree, nom: occupant && occupant.id !== lue.id ? lue.nom : voulu, ...(brut !== voulu ? { brut } : {}) });
    });
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
  return nommer ? nommerLePlan(plan, nommer, (cle) => (suivie?.liaison === 'destination' ? suivie.variables[cle]?.id : undefined)) : plan;
}

/** Les noms de variable d'un plan, sans doublon, dans son ordre : 44 avec les thèmes dans le chemin, 22 en modes. */
export function nomsDuPlan(plan: readonly EntreeDuPlan[]): string[] {
  return [...new Set(plan.map((entree) => entree.nom))];
}
