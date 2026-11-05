/**
 * Des catalogues fabriqués de taille croissante, pour mesurer le kit sans Figma : les tests de croissance (`croissanceDuKit.test.ts`) et
 * le banc `scripts/mesure/croissanceDuKit.ts` les partagent. La taille se règle par le nombre de palettes et de crans : les palettes
 * se ressemblent (mêmes derniers segments), donc chaque alias manquant a des voisines à examiner, comme dans un thème réel.
 */
import type { CatalogueDeReference, VariableDuCatalogue } from '@ucm-kit/core/controles';
import { VARIABLES_DE_PALETTE } from '@ucm-kit/core/emplois';

/** Générateur déterministe : la même graine rend les mêmes catalogues. */
export function aleatoireDeGraine(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FormeDeCatalogue {
  readonly palettes: number;
  readonly crans: number;
  /** La part des alias dont la cible manque, de 0 à 1. */
  readonly partManquante: number;
}

const COULEUR = { r: 0.2, g: 0.4, b: 0.6, a: 1 };

/** Un catalogue UCM : `brands` et `theme` des palettes, `utility`, `layout`. Les alias de `brands` et de `theme` manquent à `partManquante`. */
export function fabriquerUnCatalogue(graine: number, forme: FormeDeCatalogue): CatalogueDeReference {
  const hasard = aleatoireDeGraine(graine);
  const manque = (): boolean => hasard() < forme.partManquante;
  const variables: VariableDuCatalogue[] = [];
  const roles = VARIABLES_DE_PALETTE.filter((role) => role !== 'surface/subtle' && role !== 'surface/divider');
  for (let k = 0; k < 4; k++) {
    variables.push({ cle: `u:${k}`, nom: `neutral/step${k}`, collection: 'utility', type: 'COLOR', etat: 'presente', valeurs: { u: { valeur: COULEUR } } });
  }
  for (let p = 0; p < forme.palettes; p++) {
    for (let c = 0; c < forme.crans; c++) {
      const cible = manque() ? `absent:${p}:${c}` : `u:${c % 4}`;
      variables.push({ cle: `b:${p}:${c}`, nom: `palette${p}/light/c${c}`, collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { m: { alias: cible } } });
    }
    for (const role of roles) {
      const cible = (): string => (manque() ? `absent:${p}:${role}` : `b:${p}:${Math.floor(hasard() * forme.crans)}`);
      variables.push({
        cle: `t:${p}:${role}`, nom: `palette${p}/${role}`, collection: 'theme', type: 'COLOR', etat: 'presente',
        valeurs: { l: { alias: cible() }, d: { alias: cible() } },
      });
    }
  }
  for (let c = 0; c < forme.crans; c++) variables.push({ cle: `l:${c}`, nom: `spacing/s${c}`, collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { m: { valeur: c } } });
  return {
    version: 1,
    library: null,
    collections: [
      { cle: 'theme', nom: 'theme', role: 'theme', modes: [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }], etat: 'lue' },
      { cle: 'brands', nom: 'brands', role: 'brands', modes: [{ id: 'm', nom: 'Marque' }], etat: 'lue' },
      { cle: 'utility', nom: 'utility', role: 'utility', modes: [{ id: 'u', nom: 'Mode 1' }], etat: 'lue' },
      { cle: 'layout', nom: 'layout', role: 'layout', modes: [{ id: 'm', nom: 'Mode 1' }], etat: 'lue' },
    ],
    variables,
  };
}

/**
 * Une copie du catalogue dont chaque variable compte les lectures de `cle`, `nom` et `collection` : le nombre d'opérations d'un
 * contrôle, indépendant de la durée. `lectures()` donne le total depuis la dernière remise à zéro.
 */
export function compterLesLectures(catalogue: CatalogueDeReference): { catalogue: CatalogueDeReference; lectures(): number; remettreAZero(): void } {
  let total = 0;
  const suivies = catalogue.variables.map((variable) => new Proxy(variable, {
    get(cible, propriete, receveur) {
      if (propriete === 'cle' || propriete === 'nom' || propriete === 'collection') total += 1;
      return Reflect.get(cible, propriete, receveur);
    },
  }));
  return { catalogue: { ...catalogue, variables: suivies }, lectures: () => total, remettreAZero: () => { total = 0; } };
}
