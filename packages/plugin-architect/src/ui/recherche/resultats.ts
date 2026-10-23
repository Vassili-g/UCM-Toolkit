/** Les variables que la recherche de l'arbre retient, et leur répartition par collection. */
import type { Index } from '../../indexation';
import type { VariableRelevee } from '../../modele';
import { correspond, formesDuTerme, lireLaRecherche, type Requete } from './requete';

/**
 * Les variables de toutes les collections qui répondent à la saisie. `passe`
 * applique les filtres du tableau ; `texteDe` rend le texte que cherche un
 * texte libre (nom, collection, description, valeur).
 */
export function variablesTrouvees(index: Index, saisie: string, passe: (variable: VariableRelevee) => boolean, texteDe: (variable: VariableRelevee) => string): VariableRelevee[] {
  const requete = lireLaRecherche(saisie);
  const retenue = correspond(requete, index, requete.sorte === 'terme' ? formesDuTerme(requete.mot) : []);
  return index.releve.variables.filter((variable) => passe(variable) && retenue(variable, () => texteDe(variable)));
}

/** Le nombre de résultats de chaque collection, dans l'ordre du relevé ; les collections sans résultat n'y figurent pas. */
export function comptesParCollection(index: Index, trouvees: readonly VariableRelevee[]): Array<{ readonly collection: string; readonly nombre: number }> {
  const comptes = new Map<string, number>();
  for (const variable of trouvees) comptes.set(variable.collection, (comptes.get(variable.collection) ?? 0) + 1);
  return index.releve.collections.filter((collection) => comptes.has(collection.id)).map((collection) => ({ collection: collection.id, nombre: comptes.get(collection.id) ?? 0 }));
}

/** Les formes que la note du tableau énumère pour une requête sur un terme ; vide pour les autres. */
export function formesDeLaRequete(requete: Requete): readonly string[] {
  return requete.sorte === 'terme' ? formesDuTerme(requete.mot) : [];
}
