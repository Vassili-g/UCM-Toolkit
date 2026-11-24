/**
 * Ce que la page de l'inventaire ne montre pas exprès. `tests/inventaire.test.ts` exige, pour chaque univers, que chaque
 * élément attendu soit montré par la page ou nommé ici avec sa raison. Un nom s'écrit tel quel, jamais en motif ; un nom
 * montré ou disparu n'a pas sa place ici.
 */
export interface GroupeExclu {
  /** La raison de l'exclusion, en une phrase. */
  motif: string;
  noms: string[];
}

export const EXCLUSIONS: Readonly<Record<string, GroupeExclu[]>> = {
  "export ./referentiel": [
    {
      motif: "Référence complète des variables attendues, que lisent les contrôles et le générateur de la vue illustrée ; la page montre déjà les collections et le thème.",
      noms: ["CIBLES_DE_L_ELEVATION", "ECHELLES_DE_REFERENCE", "variablesAttendues"],
    },
    {
      motif: "Écriture et lecture d'un nombre dans un segment de nom Figma (virgule décimale), appelées par les contrôles et l'export.",
      noms: ["nombreDuSegment", "segmentDeNombre"],
    },
    {
      motif: "Le registre figure dans REGISTRES, REGISTRES_ARCHITECTURE ou REGISTRES_COMPOSANTS, que la page lit.",
      noms: ["REGISTRE_AXES_ETAT", "REGISTRE_CASSES", "REGISTRE_COMPOSANTS", "REGISTRE_COTES", "REGISTRE_COULEURS_ABSOLUES", "REGISTRE_CRANS", "REGISTRE_DOSSIERS_THEME", "REGISTRE_ELEMENTS_COMPOSANT", "REGISTRE_ELEVATIONS", "REGISTRE_ETATS", "REGISTRE_GROUPES", "REGISTRE_INTENSITES", "REGISTRE_MARQUES", "REGISTRE_MODES", "REGISTRE_PALETTES", "REGISTRE_PALETTES_COMPOSANT", "REGISTRE_PROFILS", "REGISTRE_PROPRIETES_TYPOGRAPHIQUES", "REGISTRE_ROLES", "REGISTRE_SEPARATEURS", "REGISTRE_STATUTS", "REGISTRE_STYLES_COMPOSANT", "REGISTRE_VALEURS_THEME", "REGISTRE_VARIABLES_THEME"],
    },
    {
      motif: "Table de vocabulaire ou de forme de nom que la grammaire des noms interroge ; la page montre les termes par les registres.",
      noms: ["ABREVIATIONS", "CATEGORIES_DE_NOM", "CHAMPS_DE_TYPOGRAPHIE", "CONVENTION_DE_SEGMENT_DE_TOKEN", "CONVENTION_DE_VALEUR_DE_VARIANT", "ECHELLES_DE_TAILLES", "ETATS_FRANCAIS_INTERACTIFS", "FORMES_ANCIENNES_DES_COLLECTIONS", "FORMES_DES_CHEMINS", "FORMES_D_UN_MEME_MOT", "INTERRUPTEURS", "LIBELLES_DE_CATEGORIE", "MOTS_DISTINCTS", "MOTS_D_ICONE", "NOMS_D_AXES", "NOMS_D_AXES_FRANCAIS", "NUMEROS_DE_PALETTE", "PREFIXES_DE_PIECE_INTERNE", "RECOMMANDATIONS", "REGLE_SCALE", "SIZE_VALUES", "STATE_AXIS_NAMES", "STATE_PRECEDENCE", "STATE_SELECTORS", "SYNONYMES_COURANTS", "TAILLES_DE_VARIANT"],
    },
    {
      motif: "Table du kit de règles d'usage qu'Architect crée ; la page décrit le geste sans lister ses calques.",
      noms: ["AIDES_A_MARQUER", "CALQUES_DE_CONTENU", "CALQUES_DU_KIT_DE_REGLES", "CALQUES_LUS_PAR_TAG", "MAITRES_COMPACTES", "MAITRES_DU_KIT_DE_REGLES", "MARQUEUR_A_COMPLETER", "ROLES_QUI_DESIGNENT_UN_LAYER", "SECTIONS_DU_KIT_DE_REGLES", "TAGS_DES_REGLES", "TAGS_D_INTENTION"],
    },
    {
      motif: "Clé de stockage, espace de noms ou réglage interne des plugins, sans intérêt pour le lecteur de la page.",
      noms: ["CLES_D_ARCHITECT", "CLES_PARTAGEES_DE_PALETTES", "CLE_ARCHITECTURE_DU_FICHIER", "CLE_NOMMAGE_DE_PALETTES", "CLE_RECETTE", "DESTINATION_DES_PALETTES", "ESPACE_ARCHITECT", "ESPACE_PARTAGE", "INTENSITE_UNIQUE", "PLACES_DES_THEMES", "POSE_DES_ALERTES"],
    },
    {
      motif: "Table du thème, des crans ou d'un seuil de contraste que la page rend par d'autres noms (collections, thème, garanties).",
      noms: ["AXES_DES_COLLECTIONS", "CIBLES_ABSOLUES_DU_NEUTRE", "CIBLES_DES_COULEURS_DE_COMPOSANT", "COUCHES_SANS_PALETTES", "CRANS", "DEFINITIONS_DES_VARIABLES", "ETAT_DU_FOND", "SEUILS_PAR_ROLE", "SEUILS_PAR_USAGE", "SEUIL_DE_PALETTE", "SEUIL_GRAND_TEXTE_AA", "SEUIL_TEXTE_AAA", "SUPPORT_DES_VARIABLES", "TABLE_DES_DOSSIERS"],
    },
    {
      motif: "Aide de calcul de couleur ou de contraste, appelée par le moteur ; la page montre ses résultats, pas son appel.",
      noms: ["aDixDecimales", "atteintLeSeuil", "contraste", "contrasteTronque", "decoder", "ecrireContraste", "encreLisible", "hexaDeFigma", "luminanceLineaire", "luminanceRelative", "niveauxWcag", "rapportDeLuminances", "rgb8VersLineaire", "versOctet", "versRgb8"],
    },
    {
      motif: "Fonction de lecture du thème ou de ses variables, appelée par les outils ; la page montre la table qu'elle lit.",
      noms: ["ciblesAdmises", "collectionUcmReconnue", "cranDeLaVariable", "cransRequis", "estNeutre", "etatDuFond", "garantieJugeable", "glypheDuSigne", "libellesDesVariables", "modeDuThemeReconnu", "rangDuCranLeger", "sensDeLaPalette", "sensDuTheme", "texteDesBoutonsDuSens", "variableDuThemeReconnue", "variablePresente", "variablesAEtats", "variablesDuCran", "variablesDuDossier"],
    },
    {
      motif: "Fonction de la grammaire des noms ou du kit de règles, appelée par Architect ; la page montre ses constats par les codes.",
      noms: ["assembler", "calqueDuTag", "categorieDuSegment", "cheminConforme", "cleDeRegleDuTerme", "commencerLexique", "decouperSegment", "detecterLesConventions", "detecterLesQuestions", "detecterParEtapes", "ecritureDuVariant", "estLAxeDEtats", "estUnAnneau", "estUnNomDAnneau", "estUnNomDeSeparateur", "estUneIcone", "estUneInstanceDIcone", "estUneInstanceVierge", "formeDuChemin", "formeReconnue", "formesReconnues", "indexerVocabulaire", "leNomDuLayerDitLeRole", "libelleDuTerme", "lireLArchitectureDuFichier", "motDIconeDansLeNom", "motsAvecCasse", "natureDuChamp", "naturesDesNoms", "naturesDesNomsParEtapes", "nomCompacte", "normaliserLeLexique", "normaliserLesNoms", "normaliserParEtapes", "porteLeMarqueur", "porteeDeLaGrammaire", "porteesTouchees", "reconnaitreLeChemin", "roleQueLeLayerDesigne", "segmentDeToken", "sorteDeLImbrique", "termePourCategorie", "termeReconnu", "termeRetenu", "texteDeLArchitectureDuFichier", "validerLeKitDeRegles"],
    },
  ],
  "export ./emplois": [
    {
      motif: "Table du thème, des crans ou d'un seuil de contraste que la page rend par d'autres noms (collections, thème, garanties).",
      noms: ["CIBLES_ABSOLUES_DU_NEUTRE", "ETAT_DU_FOND", "SUPPORT_DES_VARIABLES", "TABLE_DES_DOSSIERS"],
    },
    {
      motif: "Aide de calcul de couleur ou de contraste, appelée par le moteur ; la page montre ses résultats, pas son appel.",
      noms: ["aDixDecimales", "atteintLeSeuil", "contraste", "contrasteTronque", "decoder", "ecrireContraste", "encreLisible", "hexaDeFigma", "luminanceLineaire", "luminanceRelative", "rapportDeLuminances", "rgb8VersLineaire", "versOctet", "versRgb8"],
    },
    {
      motif: "Fonction de lecture du thème ou de ses variables, appelée par les outils ; la page montre la table qu'elle lit.",
      noms: ["cranDeLaVariable", "cransRequis", "etatDuFond", "garantieJugeable", "rangDuCranLeger", "sensDeLaPalette", "sensDuTheme", "texteDesBoutonsDuSens", "variablePresente", "variablesAEtats", "variablesDuCran", "variablesDuDossier"],
    },
  ],
  "export ./controles": [
    {
      motif: "Fonction d'un contrôle d'Architect ; la page montre ses constats par leurs codes de constat.",
      noms: ["controlerCouches", "controlerCouchesParEtapes", "controlerLAccessibilite", "controlerLAccessibiliteParEtapes", "controlerLIntegriteUcm", "corrigerLaQuestionDeLien", "controlerLaStructure", "controlerLaStructureParEtapes", "controlerLaTypographie", "controlerLaTypographieParEtapes", "controlerLeCatalogue", "controlerLeTheme", "controlerLeThemeParEtapes", "controlerLesAliasesManquants", "controlerLesModes", "controlerMapping", "controlerMappingParEtapes", "controlerNommage", "controlerNommageParEtapes", "controlerOublis", "controlerOublisParEtapes"],
    },
    {
      motif: "Aide de lecture du modèle de composant ou des variables, appelée par les contrôles.",
      noms: ["axeDePropriete", "axesDesProprietes", "axesDuReleve", "axesDuReleveParEtapes", "candidatsDeModele", "cheminComplet", "cheminDansLaCollection", "cheminDeLaVariable", "clesDesTokensDeTailleAttendus", "collectionDuCatalogue", "collectionsDeReference", "constatsDeModele", "estDuComposant", "estUnInterrupteur", "grouperLesCouches", "layersVisiblesDuVariant", "lectureManquee", "nomDAxeEnAnglais", "nomDansFigma", "peintureVisible", "preparerLesTokens", "proposerLaPropagation", "proposerLesCorrections", "proposerLesCorrectionsParEtapes", "segmentDAxe", "tokensDuComposant", "tokensDuComposantParEtapes", "variableDuCatalogue", "variableParCheminComplet"],
    },
    {
      motif: "Conversion d'un `tokens.json` en catalogue, appelée par `ucm check` avant les contrôles que la page montre par leurs codes.",
      noms: ["catalogueDepuisTokens"],
    },
    {
      motif: "Borne ou seuil interne d'un contrôle d'Architect, sans intérêt pour le lecteur de la page.",
      noms: ["BORNE_DE_COMBINAISONS", "SEUILS_D_ACCESSIBILITE"],
    },
  ],
};
