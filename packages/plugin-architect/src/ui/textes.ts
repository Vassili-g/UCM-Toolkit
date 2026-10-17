/**
 * Tous les textes de l'écran. Un texte entre accents graves met ces mots en
 * code : c'est l'écriture d'un nom, jamais une phrase.
 */
const noms = (nombre: number): string => (nombre === 1 ? '1 nom' : `${nombre} noms`);
const questions = (nombre: number): string => (nombre === 1 ? '1 question' : `${nombre} questions`);

export const TEXTES = {
  marque: 'UCM Architect',
  titreConfiguration: 'Configuration',
  boutonConfiguration: 'Configuration',
  ouvrirLaConfiguration: 'Ouvrir la configuration',
  retour: 'Retour',

  etiquetteDesOnglets: 'Sections d’UCM Architect',
  ongletAAppliquer: 'À appliquer',
  ongletATrancher: 'À trancher',
  ongletRegles: 'Règles',
  /** Le nom que les lecteurs d'écran donnent à l'onglet quand son compte s'affiche. */
  nomDeLOngletAAppliquer: (nombre: number): string => `À appliquer, ${noms(nombre)}`,
  nomDeLOngletATrancher: (nombre: number): string => `À trancher, ${questions(nombre)}`,

  analyseEnCours: 'Lecture des variables',
  avancementDeLAnalyse: 'Avancement de la lecture',
  variablesLues: (lues: number, total: number): string => `${lues} sur ${total}`,

  rienAFaire: 'Tous les noms suivent vos règles',
  relancerLAnalyse: 'Relancer l’analyse',

  sansVariableLocale: 'Aucune variable à harmoniser ici',
  sansVariableLocaleExplication: 'Les variables de ce fichier viennent d’une bibliothèque. Ouvrez le plugin dans le fichier des tokens.',

  fichierModifie: 'Le fichier a changé',
} as const;
