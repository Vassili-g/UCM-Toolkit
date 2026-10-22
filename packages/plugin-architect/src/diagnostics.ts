/**
 * Les constats génériques d'un relevé : chaînes qui n'aboutissent pas, dans
 * chaque mode de la collection de départ, les autres familles prenant le
 * contexte courant. Aucun constat ne dépend d'un nom de collection ni d'UCM.
 *
 * Les points de départ qui butent sur la même cause forment un seul constat :
 * un cycle se signale une fois par ensemble de variables, une cible
 * inaccessible une fois par cible.
 */
import { familleDe, type Index } from './indexation';
import { contexteDeColonne, type Contexte, type Etape, type Resolveur, type StatutDeResolution } from './resolution';

export type NatureDeConstat = Exclude<StatutDeResolution, 'resolu'>;

/** L'ordre d'affichage : ce qui casse une chaîne avant ce qui la laisse partielle. */
export const ORDRE_DES_NATURES: readonly NatureDeConstat[] = ['cycle', 'type-incompatible', 'mode-absent', 'inaccessible', 'non-pris-en-charge', 'interrompu'];

export interface Occurrence {
  readonly depart: string;
  readonly mode: string;
}

export interface Constat {
  readonly nature: NatureDeConstat;
  /** La clé de regroupement, stable d'un calcul à l'autre sur le même relevé. */
  readonly cle: string;
  /** La variable en cause : cible inaccessible, variable sans valeur, variable au type inattendu, ou membre du cycle. */
  readonly enCause: string;
  /** Pour un cycle : ses membres, dans l'ordre du parcours. */
  readonly boucle: readonly string[];
  /** Pour un mode absent : le mode sans valeur. */
  readonly mode?: string;
  /** Chaque départ et mode qui bute sur cette cause. */
  readonly occurrences: Occurrence[];
  /** Le chemin du premier départ, pour montrer l'étape en cause. */
  readonly chemin: readonly Etape[];
}

export interface Diagnostic {
  readonly constats: Constat[];
  /** Le nombre de résolutions faites : chaque variable dans chaque mode de sa collection. */
  readonly resolutions: number;
  /** Vrai quand des lectures ont manqué : le relevé ne couvre pas tout ce que les alias visent. */
  readonly partiel: boolean;
}

/** Les modes d'une collection, ceux de ses extensions compris. */
function modesAParcourir(index: Index, collection: string): string[] {
  const famille = familleDe(index, collection);
  return index.releve.collections
    .filter((candidate) => candidate.id === collection || candidate.extension?.racine === famille)
    .flatMap((candidate) => candidate.modes.map((mode) => mode.id));
}

/** Diagnostique `variables` (toutes par défaut) dans le contexte donné. */
export function diagnostiquer(resolveur: Resolveur, contexte: Contexte, variables?: readonly string[]): Diagnostic {
  const index = resolveur.index;
  const parCle = new Map<string, Constat>();
  let resolutions = 0;
  const ids = variables ?? index.releve.variables.map((variable) => variable.id);
  for (const depart of ids) {
    const variable = index.variables.get(depart);
    if (!variable) continue;
    for (const mode of modesAParcourir(index, variable.collection)) {
      const resultat = resolveur.resoudre(depart, contexteDeColonne(index, contexte, mode));
      resolutions += 1;
      if (resultat.statut === 'resolu') continue;
      const cause = causeDe(resultat, depart);
      const existant = parCle.get(cause.cle);
      if (existant) {
        existant.occurrences.push({ depart, mode });
        continue;
      }
      parCle.set(cause.cle, { ...cause, occurrences: [{ depart, mode }], chemin: resultat.etapes });
    }
  }
  const constats = [...parCle.values()].sort((a, b) => ORDRE_DES_NATURES.indexOf(a.nature) - ORDRE_DES_NATURES.indexOf(b.nature));
  return { constats, resolutions, partiel: index.releve.manquees.length > 0 };
}

type Cause = Omit<Constat, 'occurrences' | 'chemin'>;

function causeDe(resultat: Exclude<ReturnType<Resolveur['resoudre']>, { statut: 'resolu' }>, depart: string): Cause {
  switch (resultat.statut) {
    case 'cycle': {
      const boucle = resultat.etapes.slice(resultat.debut).map((etape) => etape.variable);
      return { nature: 'cycle', cle: `cycle:${[...new Set(boucle)].sort().join('|')}`, enCause: boucle[0], boucle };
    }
    case 'inaccessible':
      return { nature: 'inaccessible', cle: `inaccessible:${resultat.cible}`, enCause: resultat.cible, boucle: [] };
    case 'mode-absent':
      return { nature: 'mode-absent', cle: `mode-absent:${resultat.variable}:${resultat.mode}`, enCause: resultat.variable, mode: resultat.mode, boucle: [] };
    case 'type-incompatible':
      return { nature: 'type-incompatible', cle: `type:${resultat.variable}`, enCause: resultat.variable, boucle: [] };
    case 'non-pris-en-charge': {
      const derniere = resultat.etapes[resultat.etapes.length - 1]?.variable ?? depart;
      return { nature: 'non-pris-en-charge', cle: `non-pris:${derniere}`, enCause: derniere, boucle: [] };
    }
    case 'interrompu':
      return { nature: 'interrompu', cle: `interrompu:${depart}`, enCause: depart, boucle: [] };
  }
}

/** Les variables qu'un ensemble de constats concerne : départs et variables en cause. */
export function variablesConcernees(constats: readonly Constat[]): Set<string> {
  const concernees = new Set<string>();
  for (const constat of constats) {
    concernees.add(constat.enCause);
    for (const membre of constat.boucle) concernees.add(membre);
    for (const occurrence of constat.occurrences) concernees.add(occurrence.depart);
  }
  return concernees;
}
