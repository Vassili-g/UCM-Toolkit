/**
 * La course de la teinte d'une palette et ses zones trop proches des autres
 * palettes cochées, que la carte « Réglages » ([UI-42]) peint sur sa piste et
 * la carte « Roue des teintes » ([UI-43]) sur son cercle. Le calcul balaie la
 * course degré par degré : le dernier résultat se garde, pour que les deux
 * cartes, qui lisent les mêmes entrées, ne le refassent pas.
 */
import { courseDeTeinte, zonesTropProches, type CourseDeTeinte, type Palette, type Profil, type Recette } from 'ucm-couleur';

import type { Intervalle, ZoneDeReglette } from '../derive/reglette';
import { memoriserVues, type Localisation } from '../localisation';

/** Une zone trop proche d'une palette, avec le nom de celle-ci. */
export type ZoneNommee = ZoneDeReglette & { readonly nom: string };

export interface CourseEtZones {
  readonly cle: string;
  /** La course de l'écart commun que les garanties tenues permettent, depuis la position de départ. */
  readonly course: CourseDeTeinte;
  /** La course en valeurs du profil affiché. */
  readonly permises: Intervalle;
  /** Les zones trop proches, en valeurs du profil affiché. */
  readonly zones: readonly ZoneNommee[];
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DE_L_HARMONISATION: { liste }, nomDeLaPalette } = i18n.messages;
  let derniere: CourseEtZones | null = null;

  /**
   * La course et les zones de `palette` contre chacune des `autres`, dans le
   * `profil` vu. `valeurTeinte` est la teinte réglée de ce profil.
   */
  function calculerLaCourseEtLesZones(recette: Recette, palette: Palette, autres: readonly Palette[], profil: Profil, valeurTeinte: number): CourseEtZones {
    const cle = JSON.stringify([{ ...recette, palettes: [] }, palette, autres, profil]);
    if (derniere?.cle === cle) return derniere;
    const course = courseDeTeinte(recette, palette);
    const zones = autres.flatMap((autre) => {
      const nom = nomDeLaPalette(autre);
      return zonesTropProches(recette, palette, autre, profil).map(({ debut, fin }) => ({ debut, fin, nom, titre: liste.tropProcheDe([nom]) }));
    });
    derniere = { cle, course, permises: { bas: valeurTeinte + course.bas, haut: valeurTeinte + course.haut }, zones };
    return derniere;
  }

  return { calculerLaCourseEtLesZones };
}

export const creerVuesCourseEtZones = memoriserVues(construireVues);
