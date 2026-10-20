/** Le journal défait les mutations des variables avant de clore le geste Figma. */
import { CLES_PARTAGEES_DE_PALETTES, ESPACE_PARTAGE } from '@ucm-kit/core/referentiel';

/** Le changement qui reste dans Figma quand sa restauration échoue. */
export type Reste =
  | { readonly reste: 'variable-creee' | 'variable-changee'; readonly id: string; readonly nom: string }
  | { readonly reste: 'mode'; readonly collection: string; readonly mode: string }
  | { readonly reste: 'collection-creee'; readonly id: string; readonly nom: string };

export interface EtatDAvant {
  readonly nom: string;
  readonly valeurs: { readonly [mode: string]: VariableValue };
  readonly palette: string;
  readonly cle: string;
}

type Mutation =
  | { readonly faite: 'creation'; readonly variable: Variable; readonly palette: string }
  | { readonly faite: 'modification'; readonly variable: Variable; readonly avant: EtatDAvant; readonly palette: string; readonly suivieAvant: boolean }
  | { readonly faite: 'mode-ajoute'; readonly collection: VariableCollection; readonly mode: string }
  | { readonly faite: 'mode-renomme'; readonly collection: VariableCollection; readonly mode: string; readonly avant: string }
  | { readonly faite: 'collection'; readonly collection: VariableCollection };

/** Relève les valeurs et les marqueurs avant la première mutation ; une lecture refusée lève. */
export function etatDAvant(variable: Variable): EtatDAvant {
  return {
    nom: variable.name,
    valeurs: Object.fromEntries(Object.entries(variable.valuesByMode).map(([mode, valeur]) => [mode, { ...(valeur as RGB | RGBA | VariableAlias) } as VariableValue])),
    palette: variable.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette),
    cle: variable.getSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.cle),
  };
}

/**
 * Les deux appels de l'API des variables que le journal rejoue. `src/ecriture/variables.ts`, seul fichier de
 * l'écriture à appeler `figma.variables` et ses méthodes ([ARC-13]), les lui prête.
 */
export interface AppelsDeRestauration {
  ecrireLaValeur(variable: Variable, mode: string, valeur: VariableValue): void;
  renommerLeMode(collection: VariableCollection, mode: string, nom: string): void;
}

/** Une restauration réussie quitte le journal ; les refus restent décrits pour le résultat du geste. */
export function journalDesVariables(appels: AppelsDeRestauration) {
  const mutations: (Mutation & { active: boolean })[] = [];
  const resteDe = (mutation: Mutation): Reste => {
    switch (mutation.faite) {
      case 'creation': return { reste: 'variable-creee', id: mutation.variable.id, nom: mutation.variable.name };
      case 'modification': return { reste: 'variable-changee', id: mutation.variable.id, nom: mutation.variable.name };
      case 'mode-ajoute':
      case 'mode-renomme': return { reste: 'mode', collection: mutation.collection.name, mode: mutation.collection.modes.find((mode) => mode.modeId === mutation.mode)?.name ?? mutation.mode };
      case 'collection': return { reste: 'collection-creee', id: mutation.collection.id, nom: mutation.collection.name };
    }
  };
  function defaire(mutation: Mutation): void {
    switch (mutation.faite) {
      case 'creation': mutation.variable.remove(); return;
      case 'modification': {
        const { variable, avant } = mutation;
        const erreurs: unknown[] = [];
        const tenter = (action: () => void) => { try { action(); } catch (erreur) { erreurs.push(erreur); } };
        if (variable.name !== avant.nom) tenter(() => { variable.name = avant.nom; });
        for (const [mode, valeur] of Object.entries(avant.valeurs)) tenter(() => appels.ecrireLaValeur(variable, mode, valeur));
        tenter(() => variable.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.palette, avant.palette));
        tenter(() => variable.setSharedPluginData(ESPACE_PARTAGE, CLES_PARTAGEES_DE_PALETTES.cle, avant.cle));
        if (erreurs.length > 0) throw erreurs[0];
        return;
      }
      case 'mode-ajoute': mutation.collection.removeMode(mutation.mode); return;
      case 'mode-renomme': appels.renommerLeMode(mutation.collection, mutation.mode, mutation.avant); return;
      case 'collection': mutation.collection.remove(); return;
    }
  }
  return {
    ajouter(mutation: Mutation): void { mutations.push({ ...mutation, active: true }); },
    aDesMutations: () => mutations.some((mutation) => mutation.active),
    /** Sans palette, défait tout ; sinon garde les modifications des variables que cette palette suivait déjà. */
    defaire(palette?: string): Reste[] {
      const restes: Reste[] = [];
      for (const mutation of [...mutations].reverse()) {
        if (!mutation.active) continue;
        if (palette !== undefined && (!('palette' in mutation) || mutation.palette !== palette || (mutation.faite === 'modification' && mutation.suivieAvant))) continue;
        try {
          defaire(mutation);
          mutation.active = false;
          // Une collection retirée emporte les variables et modes dont le retrait avait échoué.
          if (mutation.faite === 'collection') {
            for (const autre of mutations) {
              const collection = 'variable' in autre ? autre.variable.variableCollectionId : autre.collection.id;
              if (collection === mutation.collection.id) autre.active = false;
            }
            for (let rang = restes.length - 1; rang >= 0; rang -= 1) {
              const reste = restes[rang];
              if (reste.reste === 'mode' ? reste.collection === mutation.collection.name : mutations.some((autre) => 'variable' in autre && autre.variable.id === reste.id && autre.variable.variableCollectionId === mutation.collection.id)) restes.splice(rang, 1);
            }
          }
        } catch {
          restes.push(resteDe(mutation));
        }
      }
      return restes;
    },
  };
}
