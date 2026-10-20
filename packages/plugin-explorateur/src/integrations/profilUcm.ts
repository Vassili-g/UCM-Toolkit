/**
 * Le profil d'architecture UCM, facultatif : le designer associe chaque
 * collection à une couche, et le profil contrôle les variables de couleur
 * des collections associées. Un nom de collection n'active rien ; une
 * collection sans couche n'est pas contrôlée. Une autre architecture n'est
 * pas fautive : le profil ne s'applique qu'à la demande.
 *
 * Les couches et leurs cibles viennent de l'architecture multimarque ; les
 * variables de `theme`, leurs nuances et leurs portées viennent de
 * `@ucm-kit/core/emplois`, sans recopie de leurs tables.
 */
import {
  SUPPORT_DES_VARIABLES,
  cranDeLaVariable,
  sensDuTheme,
  type ModeDuTheme,
  type SupportDeVariable,
  type VariableDuTheme,
} from '@ucm-kit/core/emplois';
import {
  COLLECTIONS,
  COLLECTIONS_SANS_PORTEE,
  ciblesAdmises,
  DEFINITIONS_DES_VARIABLES,
  FORMES_ANCIENNES_DES_COLLECTIONS,
  indexerVocabulaire,
  modeDuThemeReconnu,
  variableDuThemeReconnue,
  type Collection,
  type IndexDuVocabulaire,
} from '@ucm-kit/core/referentiel';
import type { Recette } from 'ucm-couleur';

import type { Index } from '../indexation';
import type { VariableRelevee, VocabulaireDuReleve } from '../modele';

export const COUCHES = COLLECTIONS;

export type Couche = Collection;

/** Les couches dont les variables ne paraissent dans aucun sélecteur de calque : portées vides. */
const COUCHES_SANS_PORTEE: readonly Couche[] = COLLECTIONS_SANS_PORTEE;

export type RegleDuProfil = 'couche' | 'valeur-directe' | 'portee' | 'nuance';

export interface ConstatDuProfil {
  readonly regle: RegleDuProfil;
  /** Stable pour un même fichier : la clé d'une exception du designer. */
  readonly cle: string;
  readonly variable: string;
  readonly mode?: string;
  /** La cible lue. */
  readonly cible?: string;
  /** Les portées attendues (règle `portee`) ou la nuance attendue (règle `nuance`). */
  readonly attendue?: string;
  readonly coucheCible?: Couche;
}

/** Pourquoi un contrôle n'a pas pu se faire. */
export type CauseDeLimiteDuProfil = 'role-inconnu' | 'mode-non-reconnu' | 'mode-sans-valeur' | 'cible-sans-couche';

/**
 * Un contrôle que le profil n'a pas pu faire. `cle` est stable pour un même
 * fichier. `mode` est un identifiant de mode, comme celui d'un constat. `cible`
 * est la variable visée, pour `cible-sans-couche`. `mode-non-reconnu` n'est
 * relevé qu'une fois par collection et par mode, avec la première variable
 * qui l'a rencontré.
 */
export interface LimiteDuProfil {
  readonly cause: CauseDeLimiteDuProfil;
  readonly cle: string;
  readonly variable: string;
  readonly mode?: string;
  readonly cible?: string;
}

/** Ce que le profil a constaté, et ce qu'il n'a pas pu contrôler. Une exception du designer retire un constat, jamais une limite. */
export interface ControleDuProfil {
  readonly constats: readonly ConstatDuProfil[];
  readonly limites: readonly LimiteDuProfil[];
}

/** L'association de chaque collection à sa couche, par identifiant. */
export type AssociationDesCouches = Readonly<Record<string, Couche>>;

export function estCouche(valeur: unknown): valeur is Couche {
  return typeof valeur === 'string' && (COUCHES as readonly string[]).includes(valeur);
}

/** Une couche rangée sous son ancien nom se lit sous le nouveau ; une couche disparue, ou inconnue, se lit sans couche. */
export function coucheRangee(valeur: unknown): Couche | null {
  if (valeur === 'brand') return 'brands';
  if (typeof valeur === 'string' && Object.prototype.hasOwnProperty.call(FORMES_ANCIENNES_DES_COLLECTIONS, valeur)) return FORMES_ANCIENNES_DES_COLLECTIONS[valeur] ?? null;
  return estCouche(valeur) ? valeur : null;
}

const indexesDesVocabulaires = new WeakMap<object, IndexDuVocabulaire | null>();

/**
 * L'index des termes que le fichier déclare ; `undefined` sans règle, ou quand un relevé importé porte un vocabulaire
 * de forme inattendue. Gardé par relevé : l'indexation parcourt tous les registres du kit.
 */
export function indexDuVocabulaire(vocabulaire: VocabulaireDuReleve | undefined): IndexDuVocabulaire | undefined {
  if (!vocabulaire || typeof vocabulaire !== 'object') return undefined;
  const connu = indexesDesVocabulaires.get(vocabulaire);
  if (connu !== undefined) return connu ?? undefined;
  let index: IndexDuVocabulaire | null = null;
  try {
    index = indexerVocabulaire({ personnalises: vocabulaire.personnalises, ecartsUcm: vocabulaire.ecartsUcm }).index;
  } catch {
    index = null;
  }
  indexesDesVocabulaires.set(vocabulaire, index);
  return index ?? undefined;
}

/** La variable de dossier qu'un nom de `theme` porte, par sa fin : `primary/solid/hover` est `solid/hover`. `null` pour `identity` et tout nom inconnu. */
export function variableDuNom(nom: string, index?: IndexDuVocabulaire): { variable: VariableDuTheme; support: SupportDeVariable } | null {
  const variable = variableDuThemeReconnue(nom, index);
  return variable ? { variable, support: SUPPORT_DES_VARIABLES[variable] } : null;
}

/** Vrai pour `identity`, le rôle que le profil ne juge pas, quelle que soit l'écriture du nom. */
function estIdentite(nom: string): boolean {
  return nom.split('/').at(-1)?.toLowerCase() === 'identity';
}

/** Le libellé de la variable de `theme` dans le référentiel, en français par défaut ; `null` sans libellé (les nuances `scale/…` n'en ont pas). */
export function libelleDeLaVariable(variable: string, langue: 'fr' | 'en' = 'fr'): string | null {
  return DEFINITIONS_DES_VARIABLES.find((definition) => definition.id === variable)?.libelle[langue] ?? null;
}

/** La nuance qu'une variable de dossier doit viser dans un mode ; `null` sans nuance à juger. */
export function nuanceAttendue(nom: string, mode: ModeDuTheme, recette: Recette, index?: IndexDuVocabulaire): number | null {
  const lue = variableDuNom(nom, index);
  if (!lue) return null;
  const cran = cranDeLaVariable(lue.variable, mode, sensDuTheme(mode, recette.texteDesBoutons[mode]));
  return typeof cran === 'number' ? cran : null;
}

function memeEnsemble(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((element) => b.includes(element));
}

/**
 * Les écarts au profil, sur les variables de couleur des collections
 * associées, et les contrôles qu'il n'a pas pu faire. `recette` permet le
 * contrôle de la nuance attendue. Les exceptions du designer retirent des
 * constats. `indexDuVocabulaire` apporte les termes du fichier : un mode que ni
 * UCM ni ces termes ne désignent n'est pas contrôlé, et le profil le dit.
 */
export function controlerLeProfil(
  index: Index,
  couches: AssociationDesCouches,
  options: { recette?: Recette | null; exceptions?: ReadonlySet<string>; indexDuVocabulaire?: IndexDuVocabulaire } = {},
): ControleDuProfil {
  const constats: ConstatDuProfil[] = [];
  const limites: LimiteDuProfil[] = [];
  const modesNonReconnus = new Set<string>();
  const coucheDe = (variable: VariableRelevee | undefined): Couche | undefined => (variable ? couches[variable.collection] : undefined);
  for (const variable of index.releve.variables) {
    const couche = coucheDe(variable);
    if (!couche || variable.type !== 'COLOR') continue;
    const collection = index.collections.get(variable.collection);
    const dossier = couche === 'theme' ? variableDuNom(variable.nom, options.indexDuVocabulaire) : null;
    if (couche === 'theme' && !dossier && !estIdentite(variable.nom)) {
      limites.push({ cause: 'role-inconnu', cle: `role-inconnu:${variable.id}`, variable: variable.id });
    }
    const modes = [...new Set([...(collection?.modes.map((candidat) => candidat.id) ?? []), ...Object.keys(variable.valeurs)])];
    for (const mode of modes) {
      const valeur = variable.valeurs[mode];
      if (!valeur) {
        limites.push({ cause: 'mode-sans-valeur', cle: `mode-sans-valeur:${variable.id}:${mode}`, variable: variable.id, mode });
        continue;
      }
      if (valeur.nature !== 'alias') {
        if (couche !== 'primitives') constats.push({ regle: 'valeur-directe', cle: `valeur-directe:${variable.id}:${mode}`, variable: variable.id, mode });
        continue;
      }
      const cible = index.variables.get(valeur.cible);
      const coucheCible = coucheDe(cible);
      if (coucheCible && !ciblesAdmises(couche, 'couleur').includes(coucheCible)) {
        constats.push({ regle: 'couche', cle: `couche:${variable.id}:${mode}`, variable: variable.id, mode, cible: valeur.cible, coucheCible });
      }
      if (cible && !coucheCible) {
        limites.push({ cause: 'cible-sans-couche', cle: `cible-sans-couche:${variable.id}:${mode}`, variable: variable.id, mode, cible: valeur.cible });
      }
      if (dossier && options.recette && cible) {
        const nomDuMode = collection?.modes.find((candidat) => candidat.id === mode)?.nom;
        const modeDuTheme = nomDuMode === undefined ? undefined : modeDuThemeReconnu(nomDuMode, options.indexDuVocabulaire);
        if (modeDuTheme) {
          const attendue = nuanceAttendue(variable.nom, modeDuTheme, options.recette, options.indexDuVocabulaire);
          if (attendue !== null && Number(cible.nom.split('/').at(-1)) !== attendue) {
            constats.push({ regle: 'nuance', cle: `nuance:${variable.id}:${mode}`, variable: variable.id, mode, cible: valeur.cible, attendue: String(attendue) });
          }
        } else if (nomDuMode !== undefined) {
          const cle = `mode-non-reconnu:${variable.collection}:${mode}`;
          if (!modesNonReconnus.has(cle)) {
            modesNonReconnus.add(cle);
            limites.push({ cause: 'mode-non-reconnu', cle, variable: variable.id, mode });
          }
        }
      }
    }
    if (COUCHES_SANS_PORTEE.includes(couche) && variable.portees.length > 0) {
      constats.push({ regle: 'portee', cle: `portee:${variable.id}`, variable: variable.id, attendue: '' });
    }
    if (dossier && !memeEnsemble(variable.portees, dossier.support.portees)) {
      constats.push({ regle: 'portee', cle: `portee:${variable.id}`, variable: variable.id, attendue: dossier.support.portees.join(', ') });
    }
  }
  const exceptions = options.exceptions ?? new Set<string>();
  return { constats: constats.filter((constat) => !exceptions.has(constat.cle)), limites };
}
