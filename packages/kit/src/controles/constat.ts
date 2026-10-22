/** La forme des résultats que les contrôles rendent à Architect. */
import type { TypeDAlerte } from '../referentiel/signaux.js';

export interface Correction {
  id: string;
  sorte: 'liaison' | 'nom-de-valeur' | 'regles' | 'scope' | 'alias-de-mode' | 'variable';
  cible: { layer?: string; champ?: string; indice?: number; plage?: { debut: number; fin: number }; variable?: string; mode?: string };
  avant: string | null;
  apres: { cle?: string; nom: string };
  aRelire: { axes?: Record<string, string>; regle: string; avant: string | null };
}

export interface Question {
  id: string;
  candidats: { cle?: string; nom: string }[];
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
