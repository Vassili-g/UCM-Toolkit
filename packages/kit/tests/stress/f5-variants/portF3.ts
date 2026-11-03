/**
 * Le seul fichier de F5 et F6 qui importe le générateur de F3 (`../f3-composant/composantDeBase.ts`). `SpecDeComposant` y accepte une
 * liste d'axes libre, donc F5 n'a rien à reconstruire. Ce port expose les trois fonctions du plan et les types dont les opérateurs
 * ont besoin, et tout le reste de `f5-variants/` passe par lui.
 *
 * Les layers sont ceux de F3 (`Root`, `Label`, `Icon`, `Ring`, plus `Glyph`, `.Bar` et `SizeWrapper` avec `imbriques`). Les
 * layers propres à F6 (style de texte par taille, icône en instance de library) s'ajouteront à `composantDeBase.ts` au lot de F6.
 */
import { graineDe, mulberry32, type Tireur } from '../commun/prng.js';
import {
  construireLeComposant, copierLeComposant, GRAINE_PAR_DEFAUT, type AxeDeSpec, type ComposantDeBase, type SpecDeComposant,
} from '../f3-composant/composantDeBase.js';
import type { CarteDuComposant, JetonDeCarte, NomDeLayer, VariantDeCarte } from '../f3-composant/carte.js';
import type { CatalogueDeReference, ReleveDeComposant } from '../../../src/controles/index.js';

export { copierLeComposant };
export type { AxeDeSpec, CarteDuComposant, ComposantDeBase, JetonDeCarte, NomDeLayer, SpecDeComposant, VariantDeCarte };

/**
 * Un composant valide pour cette spec. `prng` est le tireur du cas : le générateur de F3 tire l'échelle des tokens de taille d'une
 * graine, donc la graine est lue sur le premier tirage du tireur. Même tireur au départ, même composant.
 */
export function composantValide(spec: SpecDeComposant, prng?: Tireur): ComposantDeBase {
  const graine = prng ? Math.floor(prng() * 0xffffffff) : (spec.graine ?? GRAINE_PAR_DEFAUT);
  return construireLeComposant({ ...spec, graine });
}

export const releveDe = (composant: ComposantDeBase): ReleveDeComposant => composant.releve;
export const catalogueDe = (composant: ComposantDeBase): CatalogueDeReference => composant.catalogue;

/** Un tireur dont la sous-graine ne dépend que de la graine et de l'étiquette (`commun/prng.ts`). */
export const tireurDe = (graine: number, etiquette: string): Tireur => mulberry32(graineDe(graine, etiquette));
