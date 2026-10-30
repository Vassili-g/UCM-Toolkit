/**
 * L'état des tokens d'une palette ([VAR-05]), tiré de trois lectures : la
 * couleur que le plugin calcule, la dernière qu'il a écrite, et la couleur
 * lue dans Figma. Pur : ni Figma, ni DOM.
 */
import type { EtatDesTokens } from '../presentation';
import { segmentsDuGroupe, type Destination } from './destination';
import { memeNomFigma } from './noms';
import { nomsDuPlan, type EntreeDuPlan } from './plan';
import type { VariableLue } from './releve';
import type { PaletteSuivie } from './suivi';

/** Une couleur que Figma ne porte plus telle que le plugin l'a écrite. */
export interface CouleurModifiee {
  readonly cle: string;
  /** Le nom que la variable porte dans Figma aujourd'hui. */
  readonly nom: string;
  /** La couleur lue dans Figma ; `null` quand la variable porte un alias. */
  readonly figma: string | null;
  /** La couleur que le plugin calcule. */
  readonly plugin: string;
}

/** Une couleur que le plugin écrirait. */
export interface CouleurAEcrire {
  readonly cle: string;
  readonly nom: string;
  /** La dernière couleur écrite ; `null` pour une variable que le suivi ne désigne pas encore. */
  readonly ecrite: string | null;
  readonly plugin: string;
}

/** Une variable que l'écriture renomme. */
export interface RenommageExecute {
  readonly id: string;
  readonly de: string;
  readonly vers: string;
  /** `regles` : le fichier porte le nom brut du plan, et seules les règles de nommage le changent. */
  readonly cause: 'forme' | 'regles';
}

export interface EtatDesTokensDUnePalette {
  readonly etat: EtatDesTokens;
  /** Une clé d'entrée par variable absente, même quand Light et Dark partagent cette variable. */
  readonly introuvables: readonly string[];
  /** Les couleurs changées dans Figma depuis la dernière écriture. */
  readonly modifiees: readonly CouleurModifiee[];
  /** Les couleurs que le plugin a changées depuis la dernière écriture, et les entrées jamais écrites. */
  readonly aEcrire: readonly CouleurAEcrire[];
  /** Vrai quand la palette a été écrite vers une autre collection, un autre groupe ou une autre forme de thèmes. */
  readonly destinationChangee: boolean;
  /**
   * Reprise : chaque variable que l'écriture renomme, parce que son nom diffère de celui du plan ([VAR-13]).
   * Seul un renommage de forme rend la palette « à mettre à jour ». Vide pour une destination (D2).
   */
  readonly aRenommer: readonly RenommageExecute[];
  /**
   * Destination : les variables suivies dont le nom du fichier n'est pas celui du plan. L'écriture les garde,
   * UCM Architect les renomme (D2).
   */
  readonly ecartsLaissesANomenclature: readonly { readonly id: string; readonly nom: string; readonly plan: string }[];
  /** Les noms du plan, sans doublon, dans son ordre. */
  readonly nomsDuPlan: readonly string[];
}

/** Les segments du groupe et de la palette d'un nom, sans casse : là où la variable est rangée. */
function emplacement(nom: string, segments: number): string {
  return nom.split('/').slice(0, segments).join('/').toLowerCase();
}

/**
 * Vrai quand la destination d'aujourd'hui n'est plus celle de la dernière
 * écriture de la palette. Une palette reprise du fichier garde ses variables
 * d'origine : la destination ne la concerne pas. Un groupe changé ne compte
 * pas quand les variables suivies sont déjà rangées sous le nouveau groupe et
 * la palette, à la casse près : le fichier a suivi le renommage, et ce qui
 * vient après la palette est l'affaire des règles de nommage, pas de la
 * destination.
 */
export function destinationChangee(
  suivi: PaletteSuivie,
  destination: Destination,
  plan: readonly EntreeDuPlan[],
  lues: ReadonlyMap<string, VariableLue>,
): boolean {
  if (suivi.liaison === 'reprise') return false;
  const collection = 'id' in destination.collection ? destination.collection.id : undefined;
  if (collection === undefined || collection !== suivi.collection) return true;
  if (destination.groupe !== suivi.groupe) {
    const presentes = plan.flatMap((entree) => {
      const suivie = suivi.variables[entree.cle];
      const lue = suivie ? lues.get(suivie.id) : undefined;
      return lue ? [{ entree, lue }] : [];
    });
    const segments = (segmentsDuGroupe(destination.groupe)?.length ?? 0) + 1;
    if (presentes.length === 0 || presentes.some(({ entree, lue }) => lue.collection !== collection || emplacement(lue.nom, segments) !== emplacement(entree.nom, segments))) return true;
  }
  return (destination.themes === 'chemin') !== (suivi.modes.unique !== undefined);
}

/**
 * L'état des tokens d'une palette, par les conditions de `[VAR-05]`, dans
 * leur ordre. `lues` porte les variables du fichier par identifiant : une
 * variable absente n'existe plus. Seules les entrées du plan comptent : une
 * variable que le suivi garde d'un plan plus ancien reste dans le fichier
 * sans changer l'état.
 */
export function etatDesTokens(
  plan: readonly EntreeDuPlan[],
  suivi: PaletteSuivie | undefined,
  lues: ReadonlyMap<string, VariableLue>,
  destination: Destination,
): EtatDesTokensDUnePalette {
  const noms = nomsDuPlan(plan).filter((nom) => nom !== '');
  if (!suivi || Object.keys(suivi.variables).length === 0) {
    return {
      etat: 'jamais-ecrits',
      introuvables: [],
      modifiees: [],
      aEcrire: plan.map((entree) => ({ cle: entree.cle, nom: entree.nom, ecrite: null, plugin: entree.hexa })),
      destinationChangee: false,
      aRenommer: [],
      ecartsLaissesANomenclature: [],
      nomsDuPlan: noms,
    };
  }
  const introuvables: string[] = [];
  const variablesAbsentes = new Set<string>();
  const modifiees: CouleurModifiee[] = [];
  const aEcrire: CouleurAEcrire[] = [];
  const aRenommer = new Map<string, RenommageExecute>();
  const ecarts = new Map<string, { id: string; nom: string; plan: string }>();
  for (const entree of plan) {
    const suivie = suivi.variables[entree.cle];
    if (!suivie) {
      aEcrire.push({ cle: entree.cle, nom: entree.nom, ecrite: null, plugin: entree.hexa });
      continue;
    }
    const lue = lues.get(suivie.id);
    if (!lue) {
      if (!variablesAbsentes.has(suivie.id)) {
        variablesAbsentes.add(suivie.id);
        introuvables.push(entree.cle);
      }
      continue;
    }
    if (entree.nom !== '' && !memeNomFigma(lue.nom, entree.nom)) {
      // Une reprise est renommée par l'écriture ; une palette de la destination garde le nom du fichier (D2).
      if (suivi.liaison === 'reprise') aRenommer.set(lue.id, { id: lue.id, de: lue.nom, vers: entree.nom, cause: lue.nom === entree.brut ? 'regles' : 'forme' });
      else if (!ecarts.has(lue.id)) ecarts.set(lue.id, { id: lue.id, nom: lue.nom, plan: entree.nom });
    }
    const theme = entree.cle.split('/')[1];
    // Le conflit porte sur le mode de la dernière écriture, même si la destination change de forme.
    const mode = suivi.liaison === 'destination'
      ? suivi.modes.unique ?? suivi.modes[theme === 'dark' ? 'dark' : 'light']
      : suivi.modes[entree.mode];
    let figma = mode === undefined ? null : lue.valeurs[mode] ?? null;
    if (suivi.liaison === 'destination' && suivi.modes.unique !== undefined) {
      const autre = Object.values(lue.valeurs).find((couleur) => couleur !== suivie.ecrite);
      if (autre !== undefined) figma = autre;
    }
    if (figma !== suivie.ecrite) modifiees.push({ cle: entree.cle, nom: lue.nom, figma, plugin: entree.hexa });
    else if (entree.hexa !== suivie.ecrite) aEcrire.push({ cle: entree.cle, nom: lue.nom, ecrite: suivie.ecrite, plugin: entree.hexa });
  }
  const changee = destinationChangee(suivi, destination, plan, lues);
  const etat: EtatDesTokens = introuvables.length > 0
    ? 'introuvables'
    : modifiees.length > 0
      ? 'modifies'
      : aEcrire.length > 0 || changee || [...aRenommer.values()].some((renommage) => renommage.cause === 'forme')
        ? 'a-mettre-a-jour'
        : 'a-jour';
  return { etat, introuvables, modifiees, aEcrire, destinationChangee: changee, aRenommer: [...aRenommer.values()], ecartsLaissesANomenclature: [...ecarts.values()], nomsDuPlan: noms };
}
