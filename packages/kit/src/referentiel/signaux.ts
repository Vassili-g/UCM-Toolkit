/** Le sens des signaux communs aux interfaces UCM et aux rapports. */

export const SIGNAUX_DU_LANGAGE = [
  { id: 'terme-figma', famille: 'noms', libelle: 'Terme de Figma', sens: 'Libellé affiché par Figma, conservé en anglais.' },
  { id: 'terme-ucm', famille: 'noms', libelle: 'Terme d’UCM', sens: 'Terme du modèle des tokens, conservé tel quel.' },
  { id: 'variant', famille: 'noms', libelle: 'Variant', sens: 'Variant nommé comme dans Figma.' },
  { id: 'groupe', famille: 'chemins', libelle: 'Groupe', sens: 'Segment avant la dernière barre d’un chemin.', place: 'avant-la-derniere-barre' },
  { id: 'variable', famille: 'chemins', libelle: 'Variable', sens: 'Dernier segment d’un chemin.', place: 'dernier-segment' },
  { id: 'groupe-mis-en-avant', famille: 'chemins', libelle: 'Groupe mis en avant', sens: 'Groupe que l’écran désigne dans un filtre, une question ou une règle.', place: 'avant-la-derniere-barre' },
  { id: 'variable-mise-en-avant', famille: 'chemins', libelle: 'Variable mise en avant', sens: 'Variable que l’écran désigne dans une fiche ou une question.', place: 'dernier-segment' },
  { id: 'chemin-dans-une-phrase', famille: 'chemins', libelle: 'Chemin dans une phrase', sens: 'Chemin ou variant cité au milieu d’un texte.' },
  { id: 'collection', famille: 'donnees', libelle: 'Collection', sens: 'Collection de variables.' },
  { id: 'couleur', famille: 'donnees', libelle: 'Couleur', sens: 'Valeur d’une couleur.' },
  { id: 'arrive', famille: 'changements', libelle: 'Ce qui arrive', sens: 'Segment, nom ou liaison nouvelle.' },
  { id: 'part', famille: 'changements', libelle: 'Ce qui part', sens: 'Segment remplacé.' },
  { id: 'carte-ciblee', famille: 'changements', libelle: 'Carte ciblée', sens: 'Carte ouverte par un clic ailleurs.' },
  { id: 'fait', famille: 'changements', libelle: 'Fait', sens: 'Écriture réussie.' },
  { id: 'alerte', famille: 'alertes', libelle: 'Alerte', sens: 'Type d’une alerte ou d’un constat.' },
  { id: 'decision', famille: 'decisions', libelle: 'Décision', sens: 'État d’un nom ou d’une variable.' },
  { id: 'recherche', famille: 'filtres', libelle: 'Recherche', sens: 'Champ qui restreint le tableau des tokens.' },
  { id: 'filtre-arbre', famille: 'filtres', libelle: 'Filtre de l’arbre', sens: 'Collection choisie qui restreint la barre latérale.' },
  { id: 'action', famille: 'actions', libelle: 'Action', sens: 'Bouton principal, secondaire, discret ou destructif.' },
] as const;

export type SignalDuLangage = (typeof SIGNAUX_DU_LANGAGE)[number];

/** Les types d’alerte sont ordonnés du plus bloquant au constat tenu. */
export const TYPES_D_ALERTE = [
  { id: 'bloquant', libelle: 'Bloquant', sens: 'L’opération ne peut pas continuer.' },
  { id: 'corriger', libelle: 'À corriger', sens: 'Un écart établi demande une correction.' },
  { id: 'verifier', libelle: 'À vérifier', sens: 'Les faits lus ne suffisent pas pour conclure.' },
  { id: 'info', libelle: 'Information', sens: 'Un fait est communiqué sans correction demandée.' },
  { id: 'tenu', libelle: 'Tenu', sens: 'Le contrôle n’a trouvé aucun écart.' },
] as const;

export type TypeDAlerte = (typeof TYPES_D_ALERTE)[number]['id'];
export type SeveriteDePalettes = 'bloquant' | 'promesse' | 'alerte' | 'notice';
export type SeveriteDeLExporteur = 'error' | 'warning' | 'info';
