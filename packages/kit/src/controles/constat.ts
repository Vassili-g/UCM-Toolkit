/** La forme des résultats que les contrôles rendent à Architect. */
import type { TypeDAlerte } from '../referentiel/signaux.js';

/** Ce qu'une correction `variable` crée : une couleur de `theme`, un alias par mode, ses scopes. */
export interface CreationDeVariable {
  /** La clé de la collection `theme`. */
  readonly collection: string;
  /** Le nom complet de la variable à créer, sans la collection. */
  readonly nom: string;
  readonly type: 'COLOR';
  readonly scopes: readonly string[];
  /** Par identifiant de mode de `theme` : la variable visée. */
  readonly alias: Readonly<Record<string, { readonly cle: string; readonly nom: string }>>;
}

export interface Correction {
  id: string;
  sorte: 'liaison' | 'nom-de-valeur' | 'regles' | 'scope' | 'alias-de-mode' | 'variable';
  cible: { layer?: string; champ?: string; indice?: number; plage?: { debut: number; fin: number }; variable?: string; mode?: string };
  avant: string | null;
  /** `collection` et `valeur` : le nom de la collection du token et sa valeur en pixels, posés par C29 pour que la carte les montre. */
  apres: { cle?: string; nom: string; collection?: string; valeur?: number };
  /** `valeur` : la valeur numérique que l'analyse a lue sur le champ ; l'écriture saute la liaison si le champ en porte une autre. */
  aRelire: { axes?: Record<string, string>; regle: string; avant: string | null; valeur?: number };
  /** `variable` : la variable à créer. `cible` reste vide et `avant` vaut `null`. */
  creation?: CreationDeVariable;
}

export interface Question {
  id: string;
  /** `valeur` : la valeur en pixels d'un candidat dont la valeur n'est pas celle lue (C29 proche). */
  candidats: { cle?: string; nom: string; valeur?: number }[];
  indice?: string;
}

export interface Constat {
  id: string;
  code: `C${number}`;
  type: TypeDAlerte;
  famille: 'liaisons' | 'tailles' | 'tokens' | 'variants' | 'contraste' | 'typographie' | 'regles' | 'visibilite' | 'export';
  variants: string[];
  layers: string[];
  faits: Record<string, string | number>;
  correction?: Correction;
  question?: Question;
  limite?: true;
}
