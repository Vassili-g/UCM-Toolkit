/** Les textes de l'onglet À faire dans Figma du panneau des constats : ses cinq intertitres, la phrase de chaque constat, et les constats ignorés. */
import { de } from './analyse';

/** Les causes d'une limite de lecture du contraste, dite au présent après le sujet : « Le fill de … est un dégradé. » */
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

/** Le nom d'un layer dans une phrase : le layer `label` s'appelle « libellé » dans la maquette. */
const NOMS_DE_LAYER_EN_PHRASE: Readonly<Record<string, string>> = { label: 'libellé' };

export const TEXTES_IGNORES = {
  aFaireDuComposant: {
    intertitres: { tokens: 'Tokens', variants: 'Variants', contraste: 'Contraste et accessibilité', typographie: 'Typographie et icônes', visibilite: 'Visibilité' },
    ignores: 'Ignorés',
    rienAFaire: 'Rien à faire dans Figma.',
    ignorer: 'Ignorer',
    ignorerCeLayer: 'Ignorer ce layer',
    nePlusIgnorer: 'Ne plus ignorer',
    ignoreDansCeFichier: 'Ignoré dans ce fichier. ',
    ignorerCeConstat: (phrase: string): string => `Ignorer : ${phrase}`,
    nePlusIgnorerCeConstat: (phrase: string): string => `Ne plus ignorer : ${phrase}`,
    sansPhrase: (code: string): string => `Constat ${code}.`,
    tousLesVariants: 'Tous les variants',
    nVariants: (n: number): string => `${n} variants`,
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
    manqueDeContraste: (usage: string, variants: string, modes: string | null): string => {
      const suite = modes !== null ? ` en ${modes}` : usage === 'anneau' ? '' : ' sur la page';
      return `${SUJETS_DE_CONTRASTE[usage] ?? 'Le texte'} ${de(variants)} manque de contraste${suite}.`;
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
    tousLesVariantsAvec: (paires: string): string => `Tous les variants ${paires}`,
    seuilEtModes: (seuil: string, modes: string): string => (modes === '' ? `seuil ${seuil}` : `seuil ${seuil}, ${modes}`),
    sansAnneau: (variants: string, pluriel: boolean): string => `${variants} ${pluriel ? 'n’ont' : 'n’a'} pas d’anneau visible.`,
    sansAnneauStatut: 'Ajoutez l’anneau dans Figma',
    // C49 (borne), C51, C52, C53 : l'accessibilité, hors rapport.
    combinaisonsNonMesurees: (mesurees: number, nonMesurees: number): string => `Le contraste n’a été mesuré que sur ${mesurees} combinaisons de modes. ${nonMesurees} autres n’ont pas été mesurées.`,
    recommandation: 'Recommandation',
    texteTropPetit: (layer: string, variants: string, taille: number, seuil: number): string => `Le ${NOMS_DE_LAYER_EN_PHRASE[layer] ?? layer} ${de(variants)} a un font size de ${taille} px. UCM recommande au moins ${seuil} px.`,
    anneauTropFin: (poids: number, espace: number, trait: number): string => `L’anneau a un stroke weight de ${poids} px. UCM recommande ${espace} px d’écart et ${trait} px de trait.`,
    zoneTropPetite: (variants: string, largeur: number, hauteur: number, seuil: number): string => `La zone cliquable ${de(variants)} mesure ${largeur} × ${hauteur} px. Elle doit mesurer au moins ${seuil} × ${seuil} px.`,
    zoneTropPetiteStatut: 'Agrandissez la zone dans Figma',
    cibleTactile: (variants: string, taille: number, enHauteur: boolean, seuil: number): string => `${variants} mesure ${taille} px de ${enHauteur ? 'haut' : 'large'}. UCM recommande ${seuil} px pour le tactile.`,
    variantsExclus: (variants: string, nombre: number, enPaires: boolean): string => {
      if (nombre === 1) return `${variants} n’est pas mesuré. WCAG ne lui demande pas de contraste.`;
      return `${enPaires ? `Les ${nombre} variants ${variants}` : variants} ne sont pas mesurés. WCAG ne leur demande pas de contraste.`;
    },
    variantsDesactives: 'Tous les variants désactivés',
    noteDeMesure: 'Ces mesures portent sur le dessin du composant dans Figma.',
    noteDeMesureAvecLimite: 'Ces mesures portent sur le dessin du composant dans Figma. Elles ne prouvent pas la conformité de l’interface livrée.',
    contrasteNonMesure: (champ: string, variants: string, cause: string): string => `Le ${champ === 'strokes' ? 'stroke' : 'fill'} ${de(variants)} ${CAUSES_DE_LIMITE[cause] ?? 'n’a pas pu être lu'}. Le contraste n’a pas été mesuré.`,
    // C64, C66 : le texte et les icônes.
    sansTextStyle: (layer: string, variants: string): string => `Le ${layer} ${de(variants)} n’a pas le text style des autres variants.`,
    styleAttendu: (style: string): string => `${style} attendu`,
    sansTextStyleStatut: 'Appliquez le text style dans Figma',
    iconeSansLibrary: (variants: string): string => `L’icône ${de(variants)} n’est pas une instance de la library d’icônes.`,
    iconeSansLibraryStatut: 'Remplacez-la par une icône de la library',
  },
};
