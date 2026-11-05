/**
 * Les contrôles de structure du mode Tokens comme fonction pure d'une entrée sérialisable : `controlerLeCatalogue` (scopes, échelles, alias de
 * mode) puis `controlerLIntegriteUcm` (C82) du kit, sur le catalogue du fichier. Le Worker de l'interface les exécute (`atelier.ts`) ; le
 * sandbox les exécute lui-même quand le Worker ne répond pas (`controlesDistants.ts`). Les deux voies appellent cette fonction, donc elles
 * rendent les mêmes constats, dans le même ordre.
 *
 * L'entrée est un catalogue de référence, l'écriture choisie dans Nomenclature et les rôles que le fichier ignore : des objets simples, sans
 * fonction ni `Map`, que `structuredClone` copie sans perte. Les constats rendus le sont aussi.
 *
 * Le module n'importe ni `figma`, ni le journal `src/lecture.ts`, ni le socle d'interface : il tient dans le bundle du Worker.
 */
import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type Constat } from '@ucm-kit/core/controles';
import type { VariableDuTheme } from '@ucm-kit/core/emplois';
import type { EcritureChoisie } from '@ucm-kit/core/protocoles';

export interface EntreeDesControles {
  readonly catalogue: CatalogueDeReference;
  /** L'écriture choisie dans Nomenclature, `null` tant qu'elle n'y est pas rangée : C82 ne propose alors aucune création. */
  readonly ecriture: EcritureChoisie | null;
  /** Les rôles du thème que le fichier ignore partout. */
  readonly roles: readonly VariableDuTheme[];
}

/** Les constats de chaque contrôle, dans l'ordre où le kit les rend. Le sandbox les réunit, sans doublon d'identifiant. */
export interface ConstatsDeStructure {
  readonly catalogue: readonly Constat[];
  readonly integrite: readonly Constat[];
}

/** Début et fin de chaque contrôle, en millisecondes depuis 1970 : le journal du mode Tokens les range. */
export interface HeuresDesControles {
  readonly catalogue: { readonly debut: number; readonly fin: number };
  readonly integrite: { readonly debut: number; readonly fin: number };
}

export interface ConstatsMesures extends ConstatsDeStructure {
  readonly heures: HeuresDesControles;
}

/** Les constats des deux contrôles du kit sur `entree`. */
export function controlerLeCatalogueEtLIntegrite({ catalogue, ecriture, roles }: EntreeDesControles): ConstatsDeStructure {
  return {
    catalogue: controlerLeCatalogue(catalogue),
    integrite: controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores: [...roles] }),
  };
}

/** Les mêmes constats avec les heures de chaque contrôle, lues sur `horloge`. */
export function controlerEtMesurer(entree: EntreeDesControles, horloge: () => number = Date.now): ConstatsMesures {
  const debutDuCatalogue = horloge();
  const catalogue = controlerLeCatalogue(entree.catalogue);
  const finDuCatalogue = horloge();
  const integrite = controlerLIntegriteUcm(entree.catalogue, { ecriture: entree.ecriture, rolesIgnores: [...entree.roles] });
  const finDeLIntegrite = horloge();
  return {
    catalogue,
    integrite,
    heures: { catalogue: { debut: debutDuCatalogue, fin: finDuCatalogue }, integrite: { debut: finDuCatalogue, fin: finDeLIntegrite } },
  };
}
