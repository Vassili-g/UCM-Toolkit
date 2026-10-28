/** Les textes des constats à faire dans Figma du panneau des constats : la phrase de chaque constat, et les constats ignorés. */

/** Les causes d'une limite de lecture du contraste, dite au présent après le sujet : « Le fill est un dégradé. » */
const CAUSES_DE_LIMITE: Readonly<Record<string, string>> = {
  degrade: 'est un dégradé',
  image: 'est une image',
  'peinture-superposee': 'superpose plusieurs peintures',
  'mode-illisible': 'prend une couleur que le plugin ne sait pas lire',
  'couleur-absente': 'n’a pas de couleur',
  'fond-indetermine': 'est posé sur un fond que le plugin ne détermine pas',
};

const SUJETS_DE_CONTRASTE: Readonly<Record<string, string>> = {
  texte: 'Le texte',
  'grand-texte': 'Le texte',
  icone: 'L’icône',
  stroke: 'Le stroke',
  anneau: 'L’anneau de focus',
};

/** Les champs de Figma dans une phrase, par leur nom dans l'API : les mots du panneau Design, en anglais. */
const PROPRIETES_DE_FIGMA: Readonly<Record<string, string>> = {
  fills: 'fill', strokes: 'stroke', paddingLeft: 'padding left', paddingRight: 'padding right', paddingTop: 'padding top',
  paddingBottom: 'padding bottom', itemSpacing: 'gap', counterAxisSpacing: 'gap', cornerRadius: 'radius', topLeftRadius: 'top left radius',
  topRightRadius: 'top right radius', bottomLeftRadius: 'bottom left radius', bottomRightRadius: 'bottom right radius', strokeWeight: 'stroke weight', width: 'width',
  height: 'height', minWidth: 'min width', maxWidth: 'max width', minHeight: 'min height', maxHeight: 'max height',
  fontSize: 'font size', fontWeight: 'font weight', fontFamily: 'font family', lineHeight: 'line height', letterSpacing: 'letter spacing',
};

/** Le nom d'un layer dans une phrase : le layer `label` s'appelle « libellé » dans la maquette. */
const NOMS_DE_LAYER_EN_PHRASE: Readonly<Record<string, string>> = { label: 'libellé' };

export const TEXTES_IGNORES = {
  aFaireDuComposant: {
    ignores: 'Ignorés',
    ignorer: 'Ignorer',
    ignorerCeLayer: 'Ignorer ce layer',
    nePlusIgnorer: 'Ne plus ignorer',
    ignoreDansCeFichier: 'Ignoré dans ce fichier. ',
    ignorerCeConstat: (phrase: string): string => `Ignorer : ${phrase}`,
    nePlusIgnorerCeConstat: (phrase: string): string => `Ne plus ignorer : ${phrase}`,
    sansPhrase: (code: string): string => `Constat ${code}.`,
    layer: (nom: string, enTete: boolean): string => `${enTete ? 'Layer' : 'layer'} ${nom}`,
    sectionVariants: 'Section Variants',
    sectionTokens: 'Tokens du composant',
    // C20 : le layer est lié hors de `components`, ou le token de `components` qu'il porte vise une collection interdite.
    mauvaiseCouche: (token: string, couche: string): string => `Ce layer est lié à \`${token}\`, de la collection \`${couche}\`.`,
    mauvaiseCoucheStatut: (admises: string): string => `Liez-le à un token de components, ou de ${admises}`,
    mauvaiseCible: (token: string, cible: string, couche: string): string => `\`${token}\` vise \`${cible}\`, de la collection \`${couche}\`.`,
    mauvaiseCibleStatut: (admises: string): string => `Dans la fenêtre Variables, faites-le viser un token de ${admises}`,
    // C31, C32, C33 : un variant ou un token manque.
    variantAbsent: (paires: string): string => `${paires} n’existe pas.`,
    variantAbsentStatut: 'Créez le variant, ou ignorez ce constat',
    tokenSansVariant: (token: string): string => `Les tokens prévoient \`${token}\`. Le variant n’existe pas.`,
    tokenSansVariantStatut: 'Créez le variant, ou supprimez les tokens',
    tokenInutilise: (token: string): string => `Le token \`${token}\` n’est lié à aucun layer.`,
    tokenInutiliseStatut: 'Liez-le, ou supprimez-le',
    variantSansToken: (variant: string, famille: string): string => `${variant} n’a aucun token de ${famille}.`,
    variantSansTokenStatut: 'Créez le token, ou ignorez ce constat',
    // C49, C50 : le contraste.
    manqueDeContraste: (usage: string, modes: string | null): string => {
      const suite = modes !== null ? ` en ${modes}` : usage === 'anneau' ? '' : ' sur la page';
      return `${SUJETS_DE_CONTRASTE[usage] ?? 'Le texte'} manque de contraste${suite}.`;
    },
    manqueDeContrasteStatut: 'Réglez la palette dans UCM Palettes',
    manqueDeContrasteDuStrokeStatut: 'Réglez le token de border dans le fichier des tokens',
    manqueDeContrasteDeLAnneauStatut: (layer: string): string => `Réglez le token ${layer} dans UCM Palettes`,
    mesure: 'Mesure',
    autresModes: 'Autres modes',
    sousLeSeuil: (n: number): string => `${n} sous le seuil`,
    modeEtRapport: (mode: string, rapport: string): string => `${mode} : ${rapport}`,
    echantillon: 'Aa',
    auLieuDe: (rapport: string, seuil: string): string => `${rapport} au lieu de ${seuil}`,
    seuilEtModes: (seuil: string, modes: string): string => (modes === '' ? `seuil ${seuil}` : `seuil ${seuil}, ${modes}`),
    sansAnneau: (pluriel: boolean): string => (pluriel ? 'Les variants n’ont pas d’anneau visible.' : 'Le variant n’a pas d’anneau visible.'),
    sansAnneauStatut: 'Ajoutez l’anneau dans Figma',
    // C49 (borne), C51, C52, C53 : l'accessibilité, hors rapport.
    combinaisonsNonMesurees: (mesurees: number, nonMesurees: string): string => `Le contraste n’a été mesuré que sur ${mesurees} combinaisons de modes. ${nonMesurees} autres n’ont pas été mesurées.`,
    recommandation: 'Recommandation',
    texteTropPetit: (layer: string, taille: number, seuil: number): string => `Le ${NOMS_DE_LAYER_EN_PHRASE[layer] ?? layer} a un font size de ${taille} px. UCM recommande au moins ${seuil} px.`,
    anneauTropFin: (poids: number, espace: number, trait: number): string => `L’anneau a un stroke weight de ${poids} px. UCM recommande ${espace} px d’écart et ${trait} px de trait.`,
    zoneTropPetite: (largeur: number, hauteur: number, seuil: number): string => `La zone cliquable mesure ${largeur} × ${hauteur} px. Elle doit mesurer au moins ${seuil} × ${seuil} px.`,
    zoneTropPetiteStatut: 'Agrandissez la zone dans Figma',
    cibleTactile: (taille: number, enHauteur: boolean, seuil: number, pluriel: boolean): string => `${pluriel ? 'Les variants mesurent' : 'Le variant mesure'} ${taille} px de ${enHauteur ? 'haut' : 'large'}. UCM recommande ${seuil} px pour le tactile.`,
    variantsExclus: (nombre: number): string => (nombre === 1
      ? 'Ce variant n’est pas mesuré. WCAG ne lui demande pas de contraste.'
      : 'Ces variants ne sont pas mesurés. WCAG ne leur demande pas de contraste.'),
    noteDeMesure: 'Ces mesures portent sur le dessin du composant dans Figma.',
    noteDeMesureAvecLimite: 'Ces mesures portent sur le dessin du composant dans Figma. Elles ne prouvent pas la conformité de l’interface livrée.',
    contrasteNonMesure: (champ: string, cause: string): string => `Le ${champ === 'strokes' ? 'stroke' : 'fill'} ${CAUSES_DE_LIMITE[cause] ?? 'n’a pas pu être lu'}. Le contraste n’a pas été mesuré.`,
    proprieteDeFigma: (champ: string): string => PROPRIETES_DE_FIGMA[champ] ?? champ,
    // C7 à C10 : les noms des tokens du composant, dans le fichier des tokens.
    valeurSansToken: (paire: string): string => `Aucun token du composant ne prévoit ${paire}.`,
    valeurSansTokenStatut: 'Créez les tokens, ou ignorez ce constat',
    formeToleree: (token: string, segment: string, attendu: string, nombre: number): string => (nombre > 1
      ? `${nombre} tokens écrivent \`${segment}\`, comme \`${token}\`. UCM écrit \`${attendu}\`.`
      : `\`${token}\` écrit \`${segment}\`. UCM écrit \`${attendu}\`.`),
    formeTolereeStatut: (nombre: number): string => (nombre > 1 ? 'Renommez-les dans le fichier des tokens' : 'Renommez-le dans le fichier des tokens'),
    ecritureDuVariant: (token: string, segment: string, valeur: string, nombre: number): string => (nombre > 1
      ? `${nombre} tokens écrivent \`${segment}\`, comme \`${token}\`. Le variant écrit \`${valeur}\`.`
      : `\`${token}\` écrit \`${segment}\`. Le variant écrit \`${valeur}\`.`),
    ecritureDuVariantStatut: 'Écrivez la valeur de la même façon dans le token et dans le variant',
    // C15, C16, C22 : une liaison qui ne suit pas la valeur du variant.
    autreValeur: (champ: string, token: string, paireDuToken: string, paireDuVariant: string): string =>
      `Le ${champ} est lié à \`${token}\`, prévu pour ${paireDuToken}. Ce variant est ${paireDuVariant}.`,
    autreValeurStatut: 'Créez le token de ce variant, puis liez-le',
    // C17, C24 : un rôle qui ne convient pas au layer.
    autreRole: (champ: string, token: string, role: string, attendu: string): string =>
      `Le ${champ} est lié à \`${token}\`, un token ${role}. Un ${champ} de ce layer attend un token ${attendu}.`,
    autreRoleStatut: (attendu: string): string => `Créez le token ${attendu}, puis liez-le`,
    sansModele: (modele: string): string => `Le variant modèle ${modele} lie ce layer à un token que ce variant n’a pas.`,
    sansModeleStatut: 'Créez le token, puis liez-le',
    // C18, C19, C21 : une liaison permise, mais douteuse.
    scopeAbsent: (token: string, scope: string): string => `\`${token}\` n’a pas le scope ${scope}.`,
    scopeAbsentStatut: 'Ajoutez le scope dans la fenêtre Variables',
    autreComposant: (token: string): string => `Ce layer est lié à \`${token}\`, un token d’un autre composant.`,
    autreComposantStatut: (composant: string): string => `Liez-le à un token de ${composant}`,
    horsDeLaMajorite: (token: string, autres: number, exemple: string): string =>
      `Ce layer est lié à \`${token}\`. Dans ${autres} autres variants, il est lié à un token comme \`${exemple}\`.`,
    horsDeLaMajoriteStatut: 'Vérifiez la liaison, ou ignorez ce constat',
    // C25, C29 : une valeur sans variable, sans candidat unique.
    peintureSansToken: (champ: string, layer: string): string => `Le ${champ} du layer ${layer} n’est lié à aucun token.`,
    peintureSansTokenStatut: 'Liez-le à un token du composant',
    tailleSansVariable: (propriete: string, layer: string, valeur: number): string => `Le ${propriete} du layer ${layer} vaut ${valeur} px, sans variable.`,
    tailleSansVariableStatut: 'Créez un token du composant qui vaut cette valeur, puis liez-le',
    tailleSansVariableIllisible: (propriete: string, layer: string, valeur: number): string => `Le ${propriete} du layer ${layer} vaut ${valeur} px, sans variable. Les tokens du composant n’ont pas pu être lus.`,
    tailleSansVariableIllisibleStatut: 'Vérifiez la library de tokens dans la Configuration',
    // C80 : une couleur ou une taille liée à une variable qui n'est pas un token du composant.
    liaisonHorsDuComposant: (propriete: string, layer: string, token: string, couche: string): string =>
      `Le ${propriete} du layer ${layer} est lié à \`${token}\`, un token de ${couche}.`,
    liaisonHorsDuComposantStatut: 'Liez-le à un token du composant',
    // C43, C45 : l'instance de règles.
    sansRegles: 'Le composant n’a pas d’instance de règles.',
    sansReglesStatut: 'Créez l’instance de règles',
    proprieteSansRegle: (propriete: string): string => `La property \`${propriete}\` n’a pas de règle dans l’instance de règles.`,
    proprieteSansRegleStatut: 'Ajoutez sa règle @prop ou @boolean',
    regleSansPropriete: (regle: string): string => `La règle de \`${regle}\` vise une property que le composant n’a pas.`,
    regleSansProprieteStatut: 'Reprenez le nom de la property dans la règle',
    // C59, C60, C63 : le thème et la structure des variables.
    texteSansSurface: (layer: string, token: string): string => `Le layer ${layer} est lié à \`${token}\`, mais aucune surface n’est posée dessous.`,
    texteSansSurfaceStatut: 'Posez-le sur une surface, ou liez-le à un foreground de page',
    aliasDUnAutreMode: (token: string, mode: string, cible: string): string => `En ${mode}, \`${token}\` vise \`${cible}\`, un token d’un autre mode.`,
    aliasDUnAutreModeStatut: 'Choisissez une autre cible dans la fenêtre Variables',
    aliasSupprime: (token: string): string => `\`${token}\` vise une variable supprimée.`,
    libraryInactive: (token: string): string => `La cible de \`${token}\` est dans une library non activée.`,
    sansValeurEnMode: (token: string, mode: string): string => `\`${token}\` n’a pas de valeur en ${mode}.`,
    couleurSansAlias: (token: string): string => `\`${token}\` est une couleur du thème sans alias.`,
    // C65, C67 : la typographie et les règles d'icônes.
    typoHorsCollection: (layer: string, propriete: string, collection: string): string => `Le ${propriete} du layer ${layer} vise la collection ${collection}.`,
    typoHorsCollectionStatut: 'Liez-le à une variable de typography',
    typoSansLiaison: (layer: string, propriete: string): string => `Le ${propriete} du layer ${layer} n’a pas de variable, contrairement aux autres variants.`,
    typoSansLiaisonStatut: 'Liez-le à une variable de typography',
    iconeSansProperty: (propriete: string): string => `L’icône est pilotée par \`${propriete}\`, que le composant ne déclare pas.`,
    iconeSansPropertyStatut: 'Ajoutez la property Instance swap au composant',
    // C64, C66 : le texte et les icônes.
    sansTextStyle: (layer: string): string => `Le ${layer} n’a pas le text style des autres variants.`,
    styleAttendu: (style: string): string => `${style} attendu`,
    sansTextStyleStatut: 'Appliquez le text style dans Figma',
    iconeSansLibrary: 'L’icône n’est pas une instance de la library d’icônes.',
    iconeSansLibraryStatut: 'Remplacez-la par une icône de la library',
    iconeSansTaille: 'La taille de l’icône n’a pas de variable.',
    iconeTailleHorsIcon: (token: string): string => `La taille de l’icône est liée à \`${token}\`, hors des tailles d’icône.`,
    iconeTailleStatut: 'Liez-la à une taille de layout/icon',
    iconeSansCouleur: 'La couleur de l’icône n’a pas de token.',
    iconeCouleurHorsPremierPlan: (token: string): string => `La couleur de l’icône est liée à \`${token}\`, qui n’est pas un foreground.`,
    iconeCouleurStatut: 'Liez-la à un token icon ou foreground',
  },
};
