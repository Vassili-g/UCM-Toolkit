/** Couches de référence que les liaisons d'un composant peuvent viser. */
import { ciblesAdmises, type NatureDeCible } from '../referentiel/architecture.js';
import { variableDuCatalogue, type CatalogueDeReference } from './catalogue.js';
import type { Constat } from './constat.js';
import { liaisonsDuReleve } from './mapping.js';
import { constatDuComposant } from './nommage.js';
import type { ReleveDeComposant } from './releve.js';

function natureDeLaLiaison(champ: string, type: string): NatureDeCible {
  if (type === 'COLOR' || champ === 'fills' || champ === 'strokes') return 'couleur';
  if (/font|text/i.test(champ)) return 'typographie';
  return 'dimension';
}

export function controlerCouches(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const constats: Constat[] = [];
  for (const { variant, layer, liaison } of liaisonsDuReleve(releve)) {
    const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
    if (variable === 'absente') continue;
    const collection = catalogue.collections.find((entree) => entree.cle === variable.collection);
    if (!collection?.role) continue;
    const nature = natureDeLaLiaison(liaison.champ, variable.type);
    if (ciblesAdmises('components', nature).includes(collection.role)) continue;
    const lieu = `${variant.id}:${layer.id}:${liaison.champ}:${liaison.indice ?? ''}`;
    const faits = { token: variable.nom, couche: collection.nom, nature };
    constats.push(constatDuComposant('C20', 'liaisons', 'corriger', lieu, faits, [variant.id], [layer.id]));
    if (nature === 'couleur' && collection.role === 'primitives') {
      constats.push(constatDuComposant('C61', 'liaisons', 'corriger', lieu, faits, [variant.id], [layer.id]));
    }
  }
  return constats;
}
