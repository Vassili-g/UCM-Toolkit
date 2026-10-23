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

export const TEXTES_IGNORES = {
  aFaireDuComposant: {
    intertitres: { tokens: 'Tokens', variants: 'Variants', contraste: 'Contraste et accessibilité', typographie: 'Typographie et icônes', visibilite: 'Visibilité' },
    ignores: 'Ignorés',
    rienAFaire: 'Rien à faire dans Figma.',
    ignorer: 'Ignorer',
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
    // C20 : un token vise une couche que les liaisons d'un composant n'admettent pas.
    mauvaiseCouche: (token: string, couche: string): string => `\`${token}\` vise la collection \`${couche}\`, que ce composant ne lie pas.`,
    mauvaiseCoucheStatut: 'Se règle dans le fichier des tokens, onglet À faire dans Figma',
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
    manqueDeContraste: (usage: string, variants: string, mode: string | null): string => `${SUJETS_DE_CONTRASTE[usage] ?? 'Le texte'} ${de(variants)} manque de contraste ${mode === null ? 'sur la page' : `en ${mode}`}.`,
    manqueDeContrasteStatut: 'Réglez la palette dans UCM Palettes',
    manqueDeContrasteDuStrokeStatut: 'Réglez le token de border dans le fichier des tokens',
    contrasteNonMesure: (champ: string, variants: string, cause: string): string => `Le ${champ === 'strokes' ? 'stroke' : 'fill'} ${de(variants)} ${CAUSES_DE_LIMITE[cause] ?? 'n’a pas pu être lu'}. Le contraste n’a pas été mesuré.`,
    // C64, C66 : le texte et les icônes.
    sansTextStyle: (layer: string, variants: string): string => `Le ${layer} ${de(variants)} n’a pas le text style des autres variants.`,
    styleAttendu: (style: string): string => `${style} attendu`,
    sansTextStyleStatut: 'Appliquez le text style dans Figma',
    iconeSansLibrary: (variants: string): string => `L’icône ${de(variants)} n’est pas une instance de la library d’icônes.`,
    iconeSansLibraryStatut: 'Remplacez-la par une icône de la library',
  },
};
