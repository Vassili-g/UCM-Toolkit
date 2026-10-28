/**
 * Les messages du rapport d'analyse : l'interface demande la description du composant analysé, le sandbox la rend en JSON.
 * `sujet` est l'identifiant du jeu de variants que l'analyse rendue porte. Une réponse reprend la `demande` de la requête.
 */
export type DemandeDeRapport =
  | { type: 'preparer-le-rapport'; demande: number; sujet: string };

export type MessageDeRapport =
  | { type: 'rapport-pret'; demande: number; capture: string }
  | { type: 'rapport-echoue'; demande: number };
