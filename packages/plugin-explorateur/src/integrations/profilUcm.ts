/**
 * Le profil d'architecture UCM, facultatif : le designer associe chaque
 * collection à une couche, et le profil contrôle les variables de couleur
 * des collections associées. Un nom de collection n'active rien ; une
 * collection sans couche n'est pas contrôlée. Une autre architecture n'est
 * pas fautive : le profil ne s'applique qu'à la demande.
 *
 * Les couches, leurs cibles et les portées viennent de l'architecture
 * multimarque ; les emplois, les rangs et les supports viennent de
 * `@ucm-kit/core/emplois`, sans recopie de leurs tables.
 */
import { EMPLOIS, RANGS, SUPPORT_DES_USAGES, USAGES_DU_NEUTRE, usagesDElevation, usagesDeLaPalette, usagesPropresAuNeutre, type Emploi, type Rang, type Recette, type Support } from 'ucm-couleur';

import type { Index } from '../indexation';
import type { VariableRelevee } from '../modele';

export const COUCHES = ['primitives', 'brand', 'color-utilities', 'theme', 'usage', 'components'] as const;

export type Couche = (typeof COUCHES)[number];

/** Les couches qu'un alias de chaque couche peut viser. */
export const CIBLES_DES_COUCHES: { readonly [C in Couche]: readonly Couche[] } = {
  components: ['usage'],
  usage: ['theme'],
  theme: ['brand', 'color-utilities'],
  brand: ['primitives'],
  'color-utilities': ['primitives'],
  primitives: [],
};

/** Les couches dont les variables ne paraissent dans aucun sélecteur de calque : portées vides. */
const COUCHES_SANS_PORTEE: readonly Couche[] = ['primitives', 'brand', 'color-utilities', 'theme'];

export type RegleDuProfil = 'couche' | 'valeur-directe' | 'portee' | 'cible';

export interface ConstatDuProfil {
  readonly regle: RegleDuProfil;
  /** Stable pour un même fichier : la clé d'une exception du designer. */
  readonly cle: string;
  readonly variable: string;
  readonly mode?: string;
  /** La cible lue, ou attendue pour la règle `cible`. */
  readonly cible?: string;
  readonly attendue?: string;
  readonly coucheCible?: Couche;
}

/** L'association de chaque collection à sa couche, par identifiant. */
export type AssociationDesCouches = Readonly<Record<string, Couche>>;

export function estCouche(valeur: unknown): valeur is Couche {
  return typeof valeur === 'string' && (COUCHES as readonly string[]).includes(valeur);
}

/** L'emploi et le rang qu'un nom de `usage` porte, segment par segment ; `null` quand aucun segment n'est un usage connu. */
export function emploiDuNom(nom: string): { usage: Emploi | keyof typeof USAGES_DU_NEUTRE | 'elevation'; rang: Rang | null; support: Support } | null {
  const segments = nom.split('/');
  for (let rang = 0; rang < segments.length; rang += 1) {
    const segment = segments[rang];
    const usage = (EMPLOIS as readonly string[]).includes(segment) || segment in USAGES_DU_NEUTRE || segment === 'elevation' ? (segment as Emploi | keyof typeof USAGES_DU_NEUTRE | 'elevation') : null;
    if (!usage) continue;
    const suivant = segments[rang + 1];
    const rangLu = (RANGS as readonly string[]).includes(suivant ?? '') ? (suivant as Rang) : null;
    return { usage, rang: rangLu, support: SUPPORT_DES_USAGES[usage] };
  }
  return null;
}

/** La cible qu'une variable de `usage` doit viser dans `theme`, d'après la recette ; `null` sans preuve. */
export function cibleAttendue(nom: string, recette: Recette): string | null {
  const segments = nom.split('/');
  const palette = segments[0];
  const intensite = segments[1] === 'soft' || segments[1] === 'vivid' ? segments[1] : undefined;
  const lue = recette.palettes.find((candidate) => candidate.nom === palette);
  const crans = lue?.crans ?? recette.crans;
  let usages;
  try {
    usages = [...usagesDeLaPalette(palette, crans, intensite), ...usagesPropresAuNeutre(), ...usagesDElevation()];
  } catch {
    return null;
  }
  const trouve = usages.find((usage) => usage.chemin.join('/') === nom);
  return trouve ? trouve.cible.join('/') : null;
}

function memeEnsemble(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((element) => b.includes(element));
}

/**
 * Les écarts au profil, sur les variables de couleur des collections
 * associées. `recette` permet le contrôle de la cible attendue. Les
 * exceptions du designer sont retirées.
 */
export function controlerLeProfil(index: Index, couches: AssociationDesCouches, options: { recette?: Recette | null; exceptions?: ReadonlySet<string> } = {}): ConstatDuProfil[] {
  const constats: ConstatDuProfil[] = [];
  const coucheDe = (variable: VariableRelevee | undefined): Couche | undefined => (variable ? couches[variable.collection] : undefined);
  for (const variable of index.releve.variables) {
    const couche = coucheDe(variable);
    if (!couche || variable.type !== 'COLOR') continue;
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
      if (couche === 'usage' && options.recette && cible) {
        const attendue = cibleAttendue(variable.nom, options.recette);
        if (attendue !== null && (coucheCible !== 'theme' || cible.nom !== attendue)) {
          constats.push({ regle: 'cible', cle: `cible:${variable.id}:${mode}`, variable: variable.id, mode, cible: valeur.cible, attendue });
        }
      }
    }
    if (COUCHES_SANS_PORTEE.includes(couche) && variable.portees.length > 0) {
      constats.push({ regle: 'portee', cle: `portee:${variable.id}`, variable: variable.id, attendue: '' });
    }
    if (couche === 'usage') {
      const emploi = emploiDuNom(variable.nom);
      if (emploi && !memeEnsemble(variable.portees, emploi.support.portees)) {
        constats.push({ regle: 'portee', cle: `portee:${variable.id}`, variable: variable.id, attendue: emploi.support.portees.join(', ') });
      }
    }
  }
  const exceptions = options.exceptions ?? new Set<string>();
  return constats.filter((constat) => !exceptions.has(constat.cle));
}
