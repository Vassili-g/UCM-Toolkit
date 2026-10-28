/** Les textes de la barre, de l'annonce et du pied, communs à tous les domaines. Le nom du produit ne s'écrit qu'ici et dans le manifest. */

export const NOM_DU_PRODUIT = 'UCM Architect';

export const TEXTES_COMMUN = {
  marque: 'UCM',
  produit: NOM_DU_PRODUIT,
  actualiser: 'Actualiser',
  actualiserAide: 'Relire les variables du fichier',
  annuler: 'Annuler',
  configuration: 'Configuration',
  configurationAide: 'Ouvrir la configuration des noms',
  analyser: 'Analyser',
  analyserAide: 'Lire le composant et contrôler ses liaisons',
  actualiserLAnalyseAide: 'Relire ce qui a changé depuis l’analyse. Maj+clic : tout relire depuis le début',
  selectionnerUnComposant: 'Sélectionnez un composant dans Figma',
  constats: 'Constats',
  constatsOuvrir: 'Ouvrir le panneau des constats',
  constatsFermer: 'Fermer le panneau des constats',
  frontiereDuPanneau: 'Tirer pour changer la largeur',
  horsUcm: {
    titre: 'Ce fichier n’est pas déclaré UCM.',
    texte: 'Les onglets « Corrections », « Questions » et « À faire dans Figma » s’ouvrent après la déclaration.',
    declarer: 'Déclarer dans la Configuration',
  },
  rechercher: 'Rechercher',
  rechercheEtiquette: 'Recherche dans toutes les collections',
  rechercheAide: 'Cherche dans le nom, la collection, la description et la valeur',
  contexteDeFamille: (nom: string) => `Mode de ${nom}`,
  defautDeFamille: (mode: string) => `${mode} (défaut)`,
  modes: {
    etiquette: 'Mode de l’explorateur',
    noms: { large: 'Tokens', etroite: 'Composant' },
    aides: { large: 'Explorer les collections de variables du fichier', etroite: 'Lire les tokens du composant sélectionné dans Figma' },
  },
};
