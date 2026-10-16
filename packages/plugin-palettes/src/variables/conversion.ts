/**
 * Le passage d'une palette reprise au format du plugin ([VAR-13]),
 * définitif : son suivi prend la liaison d'une palette que le plugin a
 * créée. Quand ses variables sont dans la collection de la destination et
 * sous la forme de ses thèmes, elles restent les siennes et prennent le nom
 * que la destination leur donne ; sinon, elles deviennent une sortie
 * ancienne de la palette, et la prochaine mise à jour l'écrit dans la
 * destination. Pur : ni Figma, ni DOM.
 */
import { intensitePorteuse, intensitesDe, type Palette, type Recette } from 'ucm-couleur';

import type { Destination } from './destination';
import { planDesVariables } from './plan';
import type { VariableLue } from './releve';
import type { PaletteSuivie, VariableSuivie } from './suivi';

export interface ConversionDeLaReprise {
  /** Le suivi de la palette au format du plugin. */
  readonly suivie: PaletteSuivie;
  /** Vrai quand les variables restent celles de la palette ; faux quand elles deviennent une sortie ancienne. */
  readonly enPlace: boolean;
  /** Les variables qui prennent le nom que la destination leur donne ; vide quand elles ne restent pas en place. */
  readonly aRenommer: readonly { readonly id: string; readonly de: string; readonly vers: string }[];
  /** Un nom de la destination qu'une autre variable de la collection porte déjà, sans casse : la conversion se refuse. */
  readonly occupe: string | null;
}

/**
 * Ce que le passage au format du plugin ferait d'une palette reprise. Une
 * palette à deux intensités range sous `unique` l'intensité qui porte les
 * variables d'origine : ses clés reprennent le nom de cette intensité.
 */
export function conversionDeLaReprise(
  recette: Recette,
  palette: Palette,
  suivie: PaletteSuivie,
  destination: Destination,
  variables: readonly VariableLue[],
): ConversionDeLaReprise {
  const deuxIntensites = !intensitesDe(palette).includes('unique');
  const porteuse = suivie.intensite ?? intensitePorteuse(recette, palette);
  const cles: { [cle: string]: VariableSuivie } = {};
  for (const [cle, variable] of Object.entries(suivie.variables)) {
    const [intensite, ...reste] = cle.split('/');
    cles[intensite === 'unique' && deuxIntensites ? [porteuse, ...reste].join('/') : cle] = variable;
  }
  const { light, dark } = suivie.modes;
  const enModes = destination.themes === 'modes';
  // Un thème Dark rangé dans le chemin ne devient pas un mode, ni l'inverse : la forme des thèmes doit tenir.
  const darkDansLeChemin = dark === undefined && Object.keys(cles).some((cle) => cle.includes('/dark/'));
  const formeTenue = enModes ? !darkDansLeChemin : dark === undefined;
  const enPlace = light !== undefined && formeTenue && 'id' in destination.collection && destination.collection.id === suivie.collection;
  const modes = enModes
    ? { ...(light === undefined ? {} : { light }), ...(dark === undefined ? {} : { dark }) }
    : light === undefined ? {} : { unique: light };
  const base = { collection: suivie.collection, modes, variables: cles, liaison: 'destination' as const };
  if (!enPlace) return { suivie: { ...base, groupe: suivie.groupe }, enPlace: false, aRenommer: [], occupe: null };

  const lues = new Map(variables.map((variable) => [variable.id, variable]));
  const aRenommer = new Map<string, { id: string; de: string; vers: string }>();
  for (const entree of planDesVariables(recette, palette, destination)) {
    const lue = lues.get(cles[entree.cle]?.id ?? '');
    if (lue && lue.nom !== entree.nom && !aRenommer.has(lue.id)) aRenommer.set(lue.id, { id: lue.id, de: lue.nom, vers: entree.nom });
  }
  const propres = new Set(Object.values(cles).map((variable) => variable.id));
  const prises = new Set(variables.filter((variable) => variable.collection === suivie.collection && !propres.has(variable.id)).map((variable) => variable.nom.toLowerCase()));
  const occupe = [...aRenommer.values()].find(({ vers }) => prises.has(vers.toLowerCase()))?.vers ?? null;
  return { suivie: { ...base, groupe: destination.groupe }, enPlace: true, aRenommer: [...aRenommer.values()], occupe };
}
