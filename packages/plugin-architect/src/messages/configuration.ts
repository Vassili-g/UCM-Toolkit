/** Les messages de la configuration : la Library choisie et le niveau d'accessibilité. L'Historique de Nomenclature garde ses messages dans `nomenclature.ts`. */
export type NiveauDAccessibilite = 'AA' | 'AAA';

export interface LibraryConfiguree {
  readonly cle: string;
  readonly nom: string;
  readonly liaisons: number;
}

export type DemandeDeConfiguration =
  | { type: 'lire-configuration' }
  | { type: 'ranger-library'; cle: string }
  | { type: 'ranger-niveau'; niveau: NiveauDAccessibilite };

export type MessageDeConfiguration =
  | { type: 'configuration'; library: LibraryConfiguree | null; candidates: readonly LibraryConfiguree[]; niveau: NiveauDAccessibilite };
