/**
 * Couches de référence que les liaisons d'un composant peuvent viser.
 *
 * Un layer lié à une variable de `components` suit le chemin UCM : c'est la cible de ses alias qui se juge (C20). Une couleur
 * ou une taille liée directement à une variable d'une autre collection saute le token du composant : C80, sans autre constat.
 * Une liaison que l'instance tient sans changement de son composant principal n'est jamais jugée, quelle que soit la sorte de l'instance
 * (Q-F3-8) : le composant principal en répond. Une surcharge posée par l'hôte l'est.
 * La typographie reste hors de cette règle : sa variable se juge sur sa collection, comme un token de `components`.
 */
import { ciblesAdmises, natureDuChamp } from '../referentiel/architecture.js';
import { collectionParCle, variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import { constatDuComposant } from './nommage.js';
import { constatsDeModele } from './propagation.js';
import type { LayerLu, ReleveDeComposant } from './releve.js';

/** Les cibles distinctes des alias d'une variable, dans tous ses modes ; une cible absente du catalogue n'est pas jugée. */
function* ciblesDesAlias(catalogue: CatalogueDeReference, variable: VariableDuCatalogue): Generator<void, VariableDuCatalogue[]> {
  const cibles = new Map<string, VariableDuCatalogue>();
  for (const valeur of Object.values(variable.valeurs ?? {})) {
    yield;
    if (!('alias' in valeur)) continue;
    const cible = variableDuCatalogue(catalogue, valeur.alias);
    if (cible !== 'absente') cibles.set(cible.cle, cible);
  }
  return [...cibles.values()];
}

export function controlerCouches(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Constat[] {
  const calcul = controlerCouchesParEtapes(releve, catalogue);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Cède entre variants, layers, liaisons et cibles d'alias sans changer l'ordre des constats. */
export function* controlerCouchesParEtapes(releve: ReleveDeComposant, catalogue: CatalogueDeReference): Generator<void, Constat[]> {
  const constats: Constat[] = [];
  const roleDe = (variable: VariableDuCatalogue) => collectionParCle(catalogue, variable.collection);
  for (const variant of releve.variants) {
    yield;
    for (const layer of variant.layers) {
      yield;
      for (const liaison of layer.liaisons) {
        yield;
        if (liaison.provenance === 'composant-principal') continue;
        const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
        if (variable === 'absente') continue;
        const collection = roleDe(variable);
        if (!collection?.role) continue;
        const nature = natureDuChamp(liaison.champ, variable.type);
        const lieuDeBase = `${variant.id}:${layer.id}${liaison.surcharge ? `>${liaison.surcharge.id}` : ''}:${liaison.champ}:${liaison.indice ?? ''}`;
        if (collection.role !== 'components' && nature !== 'typographie' && (variable.type === 'COLOR' || variable.type === 'FLOAT')) {
          const faits = { token: variable.nom, couche: collection.nom, champ: liaison.champ, calque: (liaison.surcharge ?? layer).nom };
          constats.push(constatDuComposant('C80', nature === 'couleur' ? 'liaisons' : 'tailles', 'corriger', lieuDeBase, faits, [variant.id], [layer.id]));
          continue;
        }
        const admises = ciblesAdmises('components', nature);
        const cibles = collection.role === 'components' ? yield* ciblesDesAlias(catalogue, variable) : [null];
        for (const cible of cibles) {
          yield;
          const couche = cible ? roleDe(cible) : collection;
          if (!couche?.role || admises.includes(couche.role)) continue;
          const lieu = cible ? `${lieuDeBase}:${cible.cle}` : lieuDeBase;
          const faits = { token: variable.nom, couche: couche.nom, nature, admises: admises.join(','), ...(cible ? { cible: cible.nom } : {}) };
          constats.push(constatDuComposant('C20', 'liaisons', 'corriger', lieu, faits, [variant.id], [layer.id]));
        }
      }
    }
  }
  yield;
  constats.push(...constatsDeModele(releve, catalogue));
  return constats;
}
