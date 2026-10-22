/** Les messages de la Library : ses collections, leurs variables et leurs valeurs. */
export interface VariableDeBibliotheque {
  readonly nom: string;
  readonly cle: string;
  readonly type: string;
}

export interface CollectionDeBibliotheque {
  readonly nom: string;
  readonly cle: string;
  readonly variables: readonly VariableDeBibliotheque[];
}

export type DemandeDeBibliotheque =
  | { type: 'lire-bibliotheque'; demande: number }
  | { type: 'lire-valeurs'; demande: number; cles: readonly string[] };

export type MessageDeBibliotheque =
  | { type: 'bibliotheque'; demande: number; library: { nom: string; cle: string } | null; collections: readonly CollectionDeBibliotheque[]; cleDuFichierDesTokens: string | null }
  /** Les valeurs des variables demandées, par clé. */
  | { type: 'valeurs'; demande: number; valeurs: Readonly<Record<string, unknown>> }
  | { type: 'bibliotheque-illisible'; demande: number; motif: string };
