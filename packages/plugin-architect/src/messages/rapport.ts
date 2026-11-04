/**
 * Les messages du rapport d'analyse : l'interface demande la description du composant analysé, le sandbox la rend en JSON.
 * `sujet` est l'identifiant du jeu de variants que l'analyse rendue porte. Une réponse reprend la `demande` de la requête.
 * `preparer-le-rapport-de-tokens` demande les mesures du mode Tokens, que `rapport-de-tokens-pret` rend en JSON.
 */
export type DemandeDeRapport =
  | { type: 'preparer-le-rapport'; demande: number; sujet: string }
  | { type: 'preparer-le-rapport-de-tokens'; demande: number };

export type MessageDeRapport =
  | { type: 'rapport-pret'; demande: number; capture: string }
  | { type: 'rapport-de-tokens-pret'; demande: number; mesures: string }
  | { type: 'rapport-echoue'; demande: number };
