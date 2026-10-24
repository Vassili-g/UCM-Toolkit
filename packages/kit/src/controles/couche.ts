/**
 * Couches de référence que les liaisons d'un composant peuvent viser.
 *
 * Un layer lié à une variable de `components` suit le chemin UCM : c'est la cible de ses alias qui se juge (C20). Une couleur
 * ou une taille liée directement à une variable d'une autre collection saute le token du composant : C80, sans autre constat.
 * La typographie reste hors de cette règle : sa variable se juge sur sa collection, comme un token de `components`.
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

/** Le champ d'une propriété de texte, y compris celles que `natureDeLaLiaison` range avec les dimensions. */
function estUneProprieteDeTexte(champ: string): boolean {
  return /font|text|lineHeight|letterSpacing|paragraph/i.test(champ);
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
    const lieuDeBase = `${variant.id}:${layer.id}${liaison.surcharge ? `>${liaison.surcharge.id}` : ''}:${liaison.champ}:${liaison.indice ?? ''}`;
    if (collection.role !== 'components' && nature !== 'typographie' && !estUneProprieteDeTexte(liaison.champ) && (variable.type === 'COLOR' || variable.type === 'FLOAT')) {
      const faits = { token: variable.nom, couche: collection.nom, champ: liaison.champ, calque: (liaison.surcharge ?? layer).nom };
      constats.push(constatDuComposant('C80', nature === 'couleur' ? 'liaisons' : 'tailles', 'corriger', lieuDeBase, faits, [variant.id], [layer.id]));
      continue;
    }
    const admises = ciblesAdmises('components', nature);
    const jugees = collection.role === 'components'
      ? ciblesDesAlias(catalogue, variable).map((cible) => ({ cible, couche: roleDe(cible) }))
      : [{ cible: null, couche: collection }];
    for (const { cible, couche } of jugees) {
      if (!couche?.role || admises.includes(couche.role)) continue;
      const lieu = cible ? `${lieuDeBase}:${cible.cle}` : lieuDeBase;
      const faits = { token: variable.nom, couche: couche.nom, nature, admises: admises.join(','), ...(cible ? { cible: cible.nom } : {}) };
      constats.push(constatDuComposant('C20', 'liaisons', 'corriger', lieu, faits, [variant.id], [layer.id]));
    }
  }
  return constats;
}
