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
  VARIABLES_DE_PALETTE,
  VARIABLES_DU_NEUTRE,
  VARIABLES_GLOBALES,
  cranDeLaVariable,
  sensDuTheme,
  type SupportDeVariable,
  type VariableDuTheme,
} from '@ucm-kit/core/emplois';
import type { Recette } from 'ucm-couleur';

import type { Index } from '../indexation';
import type { VariableRelevee } from '../modele';

export const COUCHES = ['primitives', 'color-brands', 'color-utilities', 'theme', 'components'] as const;

export type Couche = (typeof COUCHES)[number];

/** Les couches qu'un alias de chaque couche peut viser. */
export const CIBLES_DES_COUCHES: { readonly [C in Couche]: readonly Couche[] } = {
  components: ['theme'],
  theme: ['color-brands', 'color-utilities'],
  'color-brands': ['primitives'],
  'color-utilities': ['primitives'],
  primitives: [],
};

/** Les couches dont les variables ne paraissent dans aucun sélecteur de calque : portées vides. */
const COUCHES_SANS_PORTEE: readonly Couche[] = ['primitives', 'color-brands', 'color-utilities'];

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

/** L'association de chaque collection à sa couche, par identifiant. */
export type AssociationDesCouches = Readonly<Record<string, Couche>>;

export function estCouche(valeur: unknown): valeur is Couche {
  return typeof valeur === 'string' && (COUCHES as readonly string[]).includes(valeur);
}

/** Une couche rangée sous son ancien nom se lit sous le nouveau ; une couche disparue, ou inconnue, se lit sans couche. */
export function coucheRangee(valeur: unknown): Couche | null {
  if (valeur === 'brand') return 'color-brands';
  return estCouche(valeur) ? valeur : null;
}

const VARIABLES_DU_THEME: readonly VariableDuTheme[] = [
  ...VARIABLES_DE_PALETTE,
  ...VARIABLES_DU_NEUTRE,
  ...VARIABLES_GLOBALES,
  'elevation/page',
  'elevation/raised',
];

/** La variable de dossier qu'un nom de `theme` porte, par sa fin : `primary/solid/hover` est `solid/hover`. `null` pour `identity` et tout nom inconnu. */
export function variableDuNom(nom: string): { variable: VariableDuTheme; support: SupportDeVariable } | null {
  const variable = VARIABLES_DU_THEME.find((candidate) => nom === candidate || nom.endsWith(`/${candidate}`));
  return variable ? { variable, support: SUPPORT_DES_VARIABLES[variable] } : null;
}

/** La nuance qu'une variable de dossier doit viser dans un mode ; `null` sans nuance à juger. */
export function nuanceAttendue(nom: string, mode: 'light' | 'dark', recette: Recette): number | null {
  const lue = variableDuNom(nom);
  if (!lue) return null;
  const cran = cranDeLaVariable(lue.variable, sensDuTheme(mode, recette.texteDesBoutons[mode]));
  return typeof cran === 'number' ? cran : null;
}

function memeEnsemble(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((element) => b.includes(element));
}

/**
 * Les écarts au profil, sur les variables de couleur des collections
 * associées. `recette` permet le contrôle de la nuance attendue. Les
 * exceptions du designer sont retirées.
 */
export function controlerLeProfil(index: Index, couches: AssociationDesCouches, options: { recette?: Recette | null; exceptions?: ReadonlySet<string> } = {}): ConstatDuProfil[] {
  const constats: ConstatDuProfil[] = [];
  const coucheDe = (variable: VariableRelevee | undefined): Couche | undefined => (variable ? couches[variable.collection] : undefined);
  for (const variable of index.releve.variables) {
    const couche = coucheDe(variable);
    if (!couche || variable.type !== 'COLOR') continue;
    const dossier = couche === 'theme' ? variableDuNom(variable.nom) : null;
    for (const [mode, valeur] of Object.entries(variable.valeurs)) {
      if (valeur.nature !== 'alias') {
        if (couche !== 'primitives') constats.push({ regle: 'valeur-directe', cle: `valeur-directe:${variable.id}:${mode}`, variable: variable.id, mode });
        continue;
      }
      const cible = index.variables.get(valeur.cible);
      const coucheCible = coucheDe(cible);
      if (coucheCible && !CIBLES_DES_COUCHES[couche].includes(coucheCible)) {
        constats.push({ regle: 'couche', cle: `couche:${variable.id}:${mode}`, variable: variable.id, mode, cible: valeur.cible, coucheCible });
      }
      if (dossier && options.recette && cible) {
        const nomDuMode = index.collections.get(variable.collection)?.modes.find((candidat) => candidat.id === mode)?.nom.toLowerCase();
        if (nomDuMode === 'light' || nomDuMode === 'dark') {
          const attendue = nuanceAttendue(variable.nom, nomDuMode, options.recette);
          if (attendue !== null && Number(cible.nom.split('/').at(-1)) !== attendue) {
            constats.push({ regle: 'nuance', cle: `nuance:${variable.id}:${mode}`, variable: variable.id, mode, cible: valeur.cible, attendue: String(attendue) });
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
  return constats.filter((constat) => !exceptions.has(constat.cle));
}
