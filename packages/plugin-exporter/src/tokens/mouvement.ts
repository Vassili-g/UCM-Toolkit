/**
 * Les variables `EASING` qu'un export ne peut pas publier.
 *
 * `dureeDeToken` et `courbeDeToken`, la traduction d'une valeur `TIMING` ou
 * `EASING` en DTCG, vivent dans `@ucm-kit/core/format` : le comparateur de
 * l'explorateur applique les mêmes règles. Une `EASING` a une courbe dès que
 * l'API publie ses quatre points, quel que soit le nom du préréglage, et
 * `LINEAR` en a une par définition. Un ressort n'en a pas, `HOLD` non plus, et
 * un préréglage dont l'API tait les points n'en donne aucune. `easingsSansCourbe`
 * relève ces cas avant la première feuille, et `packages/plugin-exporter/SPEC.md`
 * dit ce que l'export en fait.
 */
import { courbeDeToken } from '@ucm-kit/core/format';
import type { CauseSansCourbe } from '@ucm-kit/core/format';

import { firstVariableAlias } from 'ucm-plugin-socle/src/composant/variables';

/** Ce que la décision lit : l'index des variables exportées, et leurs collections. */
export type GrapheDesVariables = {
  collectionById: ReadonlyMap<string, VariableCollection>;
  variableById: ReadonlyMap<string, Variable>;
  pathById: ReadonlyMap<string, string>;
};

/** Un mode dont la valeur `EASING` n'a pas de courbe. */
export type ModeSansCourbe = { modeId: string; cause: CauseSansCourbe };

/**
 * Les variables `EASING` qu'au moins un mode empêche de publier, et les modes
 * en cause.
 *
 * Une variable entière est relevée dès qu'un seul de ses modes n'a pas de
 * courbe : publier les autres modes laisserait la feuille incomplète sous un
 * type qui promet une courbe dans chacun. Un mode sans valeur et un mode qui
 * porte un alias ne sont pas relevés ici : l'export les traite déjà, le
 * premier par son avertissement de mode vide, le second en conservant la
 * référence.
 */
export function easingsSansCourbe(graphe: GrapheDesVariables): Map<string, ModeSansCourbe[]> {
  const releve = new Map<string, ModeSansCourbe[]>();

  for (const id of graphe.pathById.keys()) {
    const variable = graphe.variableById.get(id);
    if (!variable || variable.resolvedType !== 'EASING') continue;
    const collection = graphe.collectionById.get(variable.variableCollectionId);
    if (!collection) continue;

    const modes: ModeSansCourbe[] = [];
    for (const mode of collection.modes) {
      const valeur = variable.valuesByMode[mode.modeId];
      if (valeur === undefined || firstVariableAlias(valeur)) continue;
      const resultat = courbeDeToken(valeur);
      if ('cause' in resultat) modes.push({ modeId: mode.modeId, cause: resultat.cause });
    }
    if (modes.length > 0) releve.set(id, modes);
  }

  return releve;
}
