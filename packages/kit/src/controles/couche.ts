/**
 * Couches de référence que les liaisons d'un composant peuvent viser.
 *
 * Un layer lié à une variable de `components` suit le chemin UCM : c'est la cible de ses alias qui se juge (C20). Une couleur
 * ou une taille liée directement à une variable d'une autre collection saute le token du composant : C80, sans autre constat.
 * Une liaison que l'instance d'une pièce interne ou d'un wrapper de dimensions tient de son composant principal peut viser `theme` ou `layout`.
 * La typographie reste hors de cette règle : sa variable se juge sur sa collection, comme un token de `components`.
 */
import { ciblesAdmises, natureDuChamp } from '../referentiel/architecture.js';
import { collectionParCle, variableDuCatalogue, type CatalogueDeReference, type VariableDuCatalogue } from './catalogue.js';
import type { Constat } from './constat.js';
import { constatDuComposant } from './nommage.js';
import { constatsDeModele } from './propagation.js';
import type { SorteDImbrique } from '../referentiel/composition.js';
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

/** La sorte de l'instance imbriquée la plus proche du layer, lui compris ; un cycle de `parent` s'arrête au premier layer revu. */
function sorteDeLInstance(layer: LayerLu, parId: ReadonlyMap<string, LayerLu>): SorteDImbrique | undefined {
  const vus = new Set<string>();
  for (let courant: LayerLu | undefined = layer; courant && !vus.has(courant.id); courant = courant.parent === null ? undefined : parId.get(courant.parent)) {
    if (courant.sorte) return courant.sorte;
    vus.add(courant.id);
  }
  return undefined;
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
    const parId = new Map(variant.layers.map((l) => [l.id, l]));
    for (const layer of variant.layers) {
      yield;
      for (const liaison of layer.liaisons) {
        yield;
        const variable = variableDuCatalogue(catalogue, liaison.variable.cle);
        if (variable === 'absente') continue;
        const collection = roleDe(variable);
        if (!collection?.role) continue;
        const nature = natureDuChamp(liaison.champ, variable.type);
        const sorte = liaison.provenance === 'composant-principal' ? sorteDeLInstance(layer, parId) : undefined;
        const heriteDeLaPiece = (sorte === 'piece-interne' || sorte === 'wrapper-de-dimensions') && (collection.role === 'theme' || collection.role === 'layout');
        if (heriteDeLaPiece) continue;
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
