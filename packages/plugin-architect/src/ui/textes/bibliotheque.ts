/** Les textes de la Library lue depuis le fichier des composants : l'arbre de ses noms, ses valeurs en attente, l'alerte des onglets grisés. */

export const TEXTES_BIBLIOTHEQUE = {
  surtitreDeLaLibrary: (library: string): string => `Library ${library}`,
  valeurEnCoursDeLecture: 'Valeur en cours de lecture',
  alerteDeLaLibrary: (library: string): string => `Ces variables viennent de la library ${library}.`,
  alerteRenommer: 'Pour les renommer, ouvrez ce fichier.',
  ouvrirLeFichierDesTokens: (library: string): string => `Ouvrir ${library}`,
  /** Une library ne donne le nom d'un mode qu'à l'import : la colonne d'une collection à un seul mode porte le nom de Figma par défaut. */
  modeUnique: 'Valeur',
  modeNumero: (rang: number): string => `Mode ${rang}`,
} as const;
