/** Les textes de la barre, de l'annonce et du pied, communs à tous les domaines. Le nom du produit ne s'écrit qu'ici et dans le manifest. */

export const NOM_DU_PRODUIT = 'UCM Architect';

export const TEXTES_COMMUN = {
  marque: 'UCM',
  produit: NOM_DU_PRODUIT,
  lectureSeule: 'Lecture seule',
  actualiser: 'Actualiser',
  actualiserAide: 'Relire les variables du fichier',
  annuler: 'Annuler',
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
