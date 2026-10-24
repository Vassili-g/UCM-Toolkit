/**
 * Couches de référence que les liaisons d'un composant peuvent viser.
 *
 * Un layer lié à une variable de `components` suit le chemin UCM : c'est la cible de ses alias qui se juge. Un layer lié
 * à une variable d'une autre collection se juge sur cette collection, comme s'il était un token de `components`.
 */
import { ciblesAdmises, type NatureDeCible } from '../referentiel/architecture.js';
import { variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import { liaisonsDuReleve } from './mapping.js';
import { constatDuComposant } from './nommage.js';
import type { ReleveDeComposant } from './releve.js';

function natureDeLaLiaison(champ: string, type: string): NatureDeCible {
  if (type === 'COLOR' || champ === 'fills' || champ === 'strokes') return 'couleur';
  if (/font|text/i.test(champ)) return 'typographie';
  return 'dimension';
}

/** Les cibles distinctes des alias d'une variable, dans tous ses modes ; une cible absente du catalogue n'est pas jugée. */
function ciblesDesAlias(catalogue: CatalogueDeReference, variable: VariableDuCatalogue): VariableDuCatalogue[] {
  const cibles = new Map<string, VariableDuCatalogue>();
  for (const valeur of Object.values(variable.valeurs ?? {})) {
    if (!('alias' in valeur)) continue;
    const cible = variableDuCatalogue(catalogue, valeur.alias);
    if (cible !== 'absente') cibles.set(cible.cle, cible);
  }
  return [...cibles.values()];
}

export function controlerCouches(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const constats: Constat[] = [];
  const roleDe = (variable: VariableDuCatalogue) => catalogue.collections.find((entree) => entree.cle === variable.collection);
  for (const { variant, layer, liaison } of liaisonsDuReleve(releve)) {
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    const collection = roleDe(variable);
    if (!collection?.role) continue;
    const nature = natureDeLaLiaison(liaison.champ, variable.type);
    const admises = ciblesAdmises('components', nature);
    const lieuDeBase = `${variant.id}:${layer.id}${liaison.surcharge ? `>${liaison.surcharge.id}` : ''}:${liaison.champ}:${liaison.indice ?? ''}`;
    const jugees = collection.role === 'components'
      ? ciblesDesAlias(catalogue, variable).map((cible) => ({ cible, couche: roleDe(cible) }))
      : [{ cible: null, couche: collection }];
    for (const { cible, couche } of jugees) {
      if (!couche?.role || admises.includes(couche.role)) continue;
      const lieu = cible ? `${lieuDeBase}:${cible.cle}` : lieuDeBase;
      const faits = { token: variable.nom, couche: couche.nom, nature, admises: admises.join(','), ...(cible ? { cible: cible.nom } : {}) };
      // Une couleur primitive (C61 de la conception) est le même écart : C20 seul le dit, une carte au lieu de deux.
      constats.push(constatDuComposant('C20', 'liaisons', 'corriger', lieu, faits, [variant.id], [layer.id]));
    }
  }
  return constats;
}
