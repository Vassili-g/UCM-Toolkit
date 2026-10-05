/**
 * L'état des tokens d'une palette ([VAR-05]), tiré de trois lectures : la
 * couleur que le plugin calcule, la dernière qu'il a écrite, et la couleur
 * lue dans Figma. Pur : ni Figma, ni DOM.
 */
import type { EtatDesTokens } from '../presentation';
import type { Destination } from './destination';
import type { EntreeDuPlan } from './plan';
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
  /** Les variables d'une palette reprise dont le nom n'est pas celui du plan : l'ancien nom et le nouveau ([VAR-13]). */
  readonly aRenommer: readonly { readonly de: string; readonly vers: string }[];
}

/**
 * Vrai quand la destination d'aujourd'hui n'est plus celle de la dernière
 * écriture de la palette. Une palette reprise du fichier garde ses variables
 * d'origine : la destination ne la concerne pas.
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
    if (presentes.length === 0 || presentes.some(({ entree, lue }) => lue.collection !== collection || lue.nom !== entree.nom)) return true;
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
  if (!suivi || Object.keys(suivi.variables).length === 0) {
    return {
      etat: 'jamais-ecrits',
      introuvables: [],
      modifiees: [],
      aEcrire: plan.map((entree) => ({ cle: entree.cle, nom: entree.nom, ecrite: null, plugin: entree.hexa })),
      destinationChangee: false,
      aRenommer: [],
    };
  }
  const introuvables: string[] = [];
  const variablesAbsentes = new Set<string>();
  const modifiees: CouleurModifiee[] = [];
  const aEcrire: CouleurAEcrire[] = [];
  const aRenommer = new Map<string, { de: string; vers: string }>();
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
    if (suivi.liaison === 'reprise' && entree.nom !== '' && lue.nom !== entree.nom) aRenommer.set(lue.id, { de: lue.nom, vers: entree.nom });
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
      : aEcrire.length > 0 || changee || aRenommer.size > 0
        ? 'a-mettre-a-jour'
        : 'a-jour';
  return { etat, introuvables, modifiees, aEcrire, destinationChangee: changee, aRenommer: [...aRenommer.values()] };
}
