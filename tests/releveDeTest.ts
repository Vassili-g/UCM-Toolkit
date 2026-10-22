/**
 * Le relevé de l'explorateur que les lois entre produits donnent à lire : un constructeur autonome, écrit sur les types publics de
 * `packages/plugin-architect/src/modele.ts`. Les tests racine ne lisent aucun fichier de test d'un paquet pour ce relevé.
 */
import { FORMAT_DU_RELEVE, type CollectionRelevee, type Couleur, type Releve, type TypeDeVariable, type ValeurSource, type VariableRelevee } from '../packages/plugin-architect/src/modele';

export const alias = (cible: string): ValeurSource => ({ nature: 'alias', cible });

/** Une couleur opaque à partir de `#rrggbb`. */
export function couleur(hexa: string): ValeurSource {
  const canal = (rang: number) => parseInt(hexa.slice(1 + rang * 2, 3 + rang * 2), 16) / 255;
  const valeur: Couleur = { r: canal(0), g: canal(1), b: canal(2), a: 1 };
  return { nature: 'couleur', couleur: valeur };
}

/** Un constructeur de relevé : identifiants lisibles, ordres préservés. */
export function constructeur(fichier: string) {
  const collections: CollectionRelevee[] = [];
  const variables: VariableRelevee[] = [];
  return {
    /** Une collection ; `modes` nomme ses modes, leur identifiant est `${id}:${nom}`. */
    collection(id: string, nom: string, modes: string[]): void {
      collections.push({
        id,
        nom,
        cle: `cle-${id}`,
        distante: false,
        masqueeALaPublication: false,
        modes: modes.map((mode) => ({ id: `${id}:${mode}`, nom: mode })),
        modeParDefaut: `${id}:${modes[0]}`,
        variables: [],
        extension: null,
      });
    },
    /** Une variable ; `valeurs` est indexé par nom de mode de sa collection. */
    variable(id: string, collection: string, nom: string, type: TypeDeVariable, valeurs: Record<string, ValeurSource>, portees: readonly string[]): void {
      const trouvee = collections.find((candidate) => candidate.id === collection);
      if (!trouvee) throw new Error(`collection ${collection} inconnue`);
      (trouvee.variables as string[]).push(id);
      variables.push({
        id,
        nom,
        description: '',
        cle: `cle-${id}`,
        distante: false,
        masqueeALaPublication: false,
        collection,
        type,
        portees,
        syntaxe: {},
        valeurs: Object.fromEntries(Object.entries(valeurs).map(([mode, valeur]) => [`${collection}:${mode}`, valeur])),
      });
    },
    releve(): Releve {
      return {
        format: FORMAT_DU_RELEVE,
        revision: 1,
        fichier,
        luA: 0,
        collections,
        variables,
        manquees: [],
        capacites: { collectionsEtendues: true, variablesDistantes: true },
      };
    },
  };
}
