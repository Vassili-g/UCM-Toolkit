/**
 * Les listes, les codes et les messages du contrôle du code : la seule copie.
 *
 * `controle-du-code.mjs` juge avec ces listes, les tests les relient au format
 * (rôles de rendu, champs publiés) et l'inventaire les affiche. Le module est
 * pur : aucun `node:`, aucun import hors du kit. Chaque entrée tient sur une
 * ligne avec sa raison, et un réglage d'une liste monte le chiffre du milieu
 * du kit.
 *
 * Les noms sortent par une liste `export { … }` en fin de fichier :
 * `surfaceLecteurs.test.mjs` exige sinon qu'`index.mjs` republie chaque
 * `export const`, et le plan P6 n'ouvre cette porte qu'au lot 3.1.
 */

// ─── Familles et propriétés ───────────────────────────────────────────────

/** Les familles de propriétés CSS que le contrat tokenise. */
const FAMILLES = [
  { famille: "couleur", raison: "Les rôles de rendu (fond, texte, icône, contour, anneau) sont des tokens de couleur." },
  { famille: "dimension", raison: "Tailles, espacements, rayons, épaisseurs et décalages sont des tokens de dimension." },
  { famille: "typographie", raison: "Les styles de texte publient la police, la taille, la graisse, l'interligne et leurs variantes." },
  { famille: "effet", raison: "Le format 14.0 tokenise l'opacité, les ombres et les flous." },
];

/** Les propriétés CSS qui appartiennent à une ou deux familles ; les autres ne reçoivent aucune valeur en dur. */
const PROPRIETES_PAR_FAMILLE = [
  { propriete: "color", familles: ["couleur"], raison: "Couleur du texte, rôle `foreground`." },
  { propriete: "background", familles: ["couleur"], raison: "Fond, rôle `background`." },
  { propriete: "background-color", familles: ["couleur"], raison: "Fond, rôle `background`." },
  { propriete: "border-color", familles: ["couleur"], raison: "Couleur du contour, rôle `border`." },
  { propriete: "outline-color", familles: ["couleur"], raison: "Couleur de l'anneau de focus, rôle `ring`." },
  { propriete: "fill", familles: ["couleur"], raison: "Couleur d'une icône, rôle `icon`." },
  { propriete: "stroke", familles: ["couleur"], raison: "Couleur d'un trait d'icône, rôle `icon`." },
  { propriete: "text-decoration-color", familles: ["couleur"], raison: "Couleur du soulignement." },
  { propriete: "width", familles: ["dimension"], raison: "Largeur d'un élément." },
  { propriete: "height", familles: ["dimension"], raison: "Hauteur d'un élément." },
  { propriete: "min-width", familles: ["dimension"], raison: "Borne basse de largeur." },
  { propriete: "max-width", familles: ["dimension"], raison: "Borne haute de largeur." },
  { propriete: "min-height", familles: ["dimension"], raison: "Borne basse de hauteur." },
  { propriete: "max-height", familles: ["dimension"], raison: "Borne haute de hauteur." },
  { propriete: "padding", familles: ["dimension"], raison: "Marge intérieure." },
  { propriete: "padding-top", familles: ["dimension"], raison: "Marge intérieure, côté haut." },
  { propriete: "padding-right", familles: ["dimension"], raison: "Marge intérieure, côté droit." },
  { propriete: "padding-bottom", familles: ["dimension"], raison: "Marge intérieure, côté bas." },
  { propriete: "padding-left", familles: ["dimension"], raison: "Marge intérieure, côté gauche." },
  { propriete: "padding-inline", familles: ["dimension"], raison: "Marge intérieure, axe horizontal." },
  { propriete: "padding-block", familles: ["dimension"], raison: "Marge intérieure, axe vertical." },
  { propriete: "padding-inline-start", familles: ["dimension"], raison: "Marge intérieure, début de l'axe horizontal." },
  { propriete: "padding-inline-end", familles: ["dimension"], raison: "Marge intérieure, fin de l'axe horizontal." },
  { propriete: "padding-block-start", familles: ["dimension"], raison: "Marge intérieure, début de l'axe vertical." },
  { propriete: "padding-block-end", familles: ["dimension"], raison: "Marge intérieure, fin de l'axe vertical." },
  { propriete: "gap", familles: ["dimension"], raison: "Espace entre enfants." },
  { propriete: "row-gap", familles: ["dimension"], raison: "Espace entre lignes." },
  { propriete: "column-gap", familles: ["dimension"], raison: "Espace entre colonnes." },
  { propriete: "border-radius", familles: ["dimension"], raison: "Rayon des quatre coins." },
  { propriete: "border-top-left-radius", familles: ["dimension"], raison: "Rayon du coin haut gauche." },
  { propriete: "border-top-right-radius", familles: ["dimension"], raison: "Rayon du coin haut droit." },
  { propriete: "border-bottom-right-radius", familles: ["dimension"], raison: "Rayon du coin bas droit." },
  { propriete: "border-bottom-left-radius", familles: ["dimension"], raison: "Rayon du coin bas gauche." },
  { propriete: "border-width", familles: ["dimension"], raison: "Épaisseur du contour." },
  { propriete: "outline-width", familles: ["dimension"], raison: "Épaisseur de l'anneau de focus, rôle `ring`." },
  { propriete: "outline-offset", familles: ["dimension"], raison: "Décalage de l'anneau de focus." },
  { propriete: "top", familles: ["dimension"], raison: "Décalage haut d'un élément positionné." },
  { propriete: "right", familles: ["dimension"], raison: "Décalage droit d'un élément positionné." },
  { propriete: "bottom", familles: ["dimension"], raison: "Décalage bas d'un élément positionné." },
  { propriete: "left", familles: ["dimension"], raison: "Décalage gauche d'un élément positionné." },
  { propriete: "inset", familles: ["dimension"], raison: "Décalage des quatre côtés, champ `inset` du contrat." },
  { propriete: "inset-inline", familles: ["dimension"], raison: "Décalage de l'axe horizontal." },
  { propriete: "inset-block", familles: ["dimension"], raison: "Décalage de l'axe vertical." },
  { propriete: "grid-template-columns", familles: ["dimension"], raison: "Pistes de colonnes, champ `columnSizes`." },
  { propriete: "grid-template-rows", familles: ["dimension"], raison: "Pistes de lignes, champ `rowSizes`." },
  { propriete: "border", familles: ["couleur", "dimension"], raison: "Raccourci d'épaisseur et de couleur du contour." },
  { propriete: "outline", familles: ["couleur", "dimension"], raison: "Raccourci d'épaisseur et de couleur de l'anneau." },
  { propriete: "box-shadow", familles: ["couleur", "dimension"], raison: "Ombre ou contour du rôle `border` ; couleur, décalage et flou." },
  { propriete: "text-shadow", familles: ["couleur", "dimension"], raison: "Ombre du texte, écrite comme `box-shadow`." },
  { propriete: "font-family", familles: ["typographie"], raison: "Police, champ `fontFamily` d'un style de texte." },
  { propriete: "font-size", familles: ["typographie"], raison: "Taille de police, champ `fontSize`." },
  { propriete: "font-weight", familles: ["typographie"], raison: "Graisse, champ `fontWeight`." },
  { propriete: "line-height", familles: ["typographie"], raison: "Interligne, champ `lineHeight`." },
  { propriete: "letter-spacing", familles: ["typographie"], raison: "Interlettrage, champ `letterSpacing`." },
  { propriete: "text-transform", familles: ["typographie"], raison: "Casse, champ `literals.textTransform`." },
  { propriete: "font-variant-caps", familles: ["typographie"], raison: "Petites capitales, champ `literals.fontVariantCaps`." },
  { propriete: "text-decoration", familles: ["typographie"], raison: "Soulignement ou barré, champ `literals.textDecorationLine`." },
  { propriete: "text-decoration-line", familles: ["typographie"], raison: "Soulignement ou barré, champ `literals.textDecorationLine`." },
  { propriete: "font-style", familles: ["typographie"], raison: "Italique, champ `literals.fontStyle`." },
  { propriete: "text-wrap-style", familles: ["typographie"], raison: "Équilibrage des lignes, champ `literals.textWrapStyle`." },
  { propriete: "text-box", familles: ["typographie"], raison: "Rognage de la boîte de texte, champ `literals.textBox`." },
  { propriete: "text-align", familles: ["typographie"], raison: "Alignement du texte, champ `textAlign` d'un usage." },
  { propriete: "text-indent", familles: ["typographie"], raison: "Retrait de première ligne, champ `paragraphIndent`." },
  { propriete: "line-clamp", familles: ["typographie"], raison: "Nombre de lignes, champ `lineClamp` d'un usage." },
  { propriete: "-webkit-line-clamp", familles: ["typographie"], raison: "Nombre de lignes, écriture préfixée de `line-clamp`." },
  { propriete: "opacity", familles: ["effet"], raison: "Opacité, tokenisée par le format 14.0." },
  { propriete: "filter", familles: ["effet"], raison: "Flou de calque, tokenisé par le format 14.0." },
  { propriete: "backdrop-filter", familles: ["effet"], raison: "Flou d'arrière-plan, tokenisé par le format 14.0." },
];

/** Une valeur qui passe dans toute propriété d'une famille. */
const VALEURS_NEUTRES = [
  { valeur: "0", raison: "Zéro n'a pas d'unité et aucun token ne le remplace." },
  { valeur: "none", raison: "Aucune bordure, ombre ni filtre." },
  { valeur: "fit-content", raison: "Dimension par défaut d'un slot, que FORMAT.md lit comme l'absence de dimensionnement." },
  { valeur: "currentcolor", raison: "Reprend la couleur du texte." },
  { valeur: "transparent", raison: "Aucune couleur." },
];

// ─── Listes à raison unique ───────────────────────────────────────────────

const RAISON_UNITES_DE_LONGUEUR = "Une longueur écrite en dur est une valeur visuelle ; `fr` est la fraction de piste de grille.";
/** CSS Values and Units 4, §6 (longueurs relatives, de fenêtre, de conteneur et absolues), plus `fr`. */
const UNITES_DE_LONGUEUR = [
  "cap", "ch", "em", "ex", "ic", "lh", "rcap", "rch", "rem", "rex", "ric", "rlh",
  "vh", "vw", "vmax", "vmin", "vb", "vi",
  "svh", "svw", "svmax", "svmin", "svb", "svi",
  "lvh", "lvw", "lvmax", "lvmin", "lvb", "lvi",
  "dvh", "dvw", "dvmax", "dvmin", "dvb", "dvi",
  "cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax",
  "cm", "mm", "q", "in", "pt", "pc", "px",
  "fr",
];

const RAISON_FONCTIONS_DE_COULEUR = "Une fonction de couleur écrit une couleur en dur, quels que soient ses arguments.";
const FONCTIONS_DE_COULEUR = [
  "rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix", "light-dark",
];

const RAISON_FONCTIONS_MATHEMATIQUES = "Une fonction mathématique se juge par ses arguments, et un nombre sans unité y passe parce qu'il multiplie ou divise.";
const FONCTIONS_MATHEMATIQUES = ["calc", "min", "max", "clamp"];

const RAISON_NOMS_DE_COULEUR = "Un nom de couleur écrit une couleur en dur dans une déclaration.";
/** CSS Color 4, §6.1 (https://www.w3.org/TR/css-color-4/#named-colors), sans `transparent` ni `currentcolor`, qui sont des valeurs neutres. */
const NOMS_DE_COULEUR = [
  "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond", "blue",
  "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk",
  "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray", "darkgreen", "darkgrey", "darkkhaki",
  "darkmagenta", "darkolivegreen", "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen", "darkslateblue",
  "darkslategray", "darkslategrey", "darkturquoise", "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey",
  "dodgerblue", "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod",
  "gray", "green", "greenyellow", "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
  "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow",
  "lightgray", "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
  "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon",
  "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
  "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin",
  "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod", "palegreen",
  "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue", "purple",
  "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen", "seashell",
  "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey", "snow", "springgreen", "steelblue", "tan",
  "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow", "yellowgreen",
];

const RAISON_MOTS_CLES_DE_FORME = "Un mot de forme accompagne une longueur dans une chaîne sans dire autre chose qu'un style de trait.";
const MOTS_CLES_DE_FORME = [
  "solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "hidden", "auto", "none", "normal",
];

const RAISON_ATTRIBUTS_SANS_VALEUR_VISUELLE = "La chaîne de cet attribut nomme une ancre, une clé ou une étiquette, jamais une valeur visuelle.";
/** Un nom fini par `-` est un préfixe. */
const ATTRIBUTS_SANS_VALEUR_VISUELLE = ["href", "id", "key", "name", "htmlFor", "aria-", "data-"];

// ─── Valeurs que le contrat publie en clair ───────────────────────────────

/**
 * `champ` est la fin du chemin d'une valeur dans le contrat, sans les clés
 * d'identifiants ni les index (`sizing.width` pour `viewStructures.<vue>.sizing.width`).
 * Un champ qui désigne un objet couvre ses valeurs (`inset` couvre `inset.top`).
 * `aussi` donne la valeur qu'une valeur publiée autorise en plus.
 */
const CHAMPS_A_VALEUR_PUBLIEE = [
  { champ: "sizing.width", famille: "dimension", aussi: { stretch: "100%" }, raison: "Le contrat écrit `fit-content` ou `stretch` ; `stretch` s'écrit aussi `100%`." },
  { champ: "sizing.height", famille: "dimension", aussi: { stretch: "100%" }, raison: "Le contrat écrit `fit-content` ou `stretch` ; `stretch` s'écrit aussi `100%`." },
  { champ: "structuralSize.width", famille: "dimension", raison: "Largeur en pixels d'un élément de structure, que le code recopie." },
  { champ: "structuralSize.height", famille: "dimension", raison: "Hauteur en pixels d'un élément de structure, que le code recopie." },
  { champ: "columnSizes", famille: "dimension", raison: "Pistes de colonnes (`1fr`, `fit-content(100%)`, `120px`, `auto`), que le code recopie." },
  { champ: "rowSizes", famille: "dimension", raison: "Pistes de lignes (`1fr`, `fit-content(100%)`, `120px`, `auto`), que le code recopie." },
  { champ: "inset", famille: "dimension", raison: "Décalages en pixels d'un enfant positionné, que le code recopie." },
  { champ: "literals.textTransform", famille: "typographie", raison: "Casse du texte, écrite en clair." },
  { champ: "literals.fontVariantCaps", famille: "typographie", raison: "Petites capitales, écrites en clair." },
  { champ: "literals.textDecorationLine", famille: "typographie", raison: "Soulignement ou barré, écrit en clair." },
  { champ: "literals.fontStyle", famille: "typographie", raison: "Italique, écrit en clair." },
  { champ: "literals.textWrapStyle", famille: "typographie", raison: "Équilibrage des lignes, écrit en clair." },
  { champ: "literals.textBox", famille: "typographie", raison: "Rognage de la boîte de texte, écrit en clair." },
  { champ: "textAlign", famille: "typographie", raison: "Alignement du texte d'un usage, écrit en clair." },
  { champ: "lineClamp", famille: "typographie", raison: "Nombre de lignes d'un usage, écrit en clair." },
];

/** Les champs du contrat qui admettent une valeur en clair et qu'aucune famille ne tokenise. */
const CHAMPS_HORS_FAMILLE = [
  { champ: "rotation", raison: "Une rotation n'appartient à aucune famille de tokens." },
  { champ: "columnStart", raison: "Une place de grille n'est pas une valeur visuelle." },
  { champ: "rowStart", raison: "Une place de grille n'est pas une valeur visuelle." },
  { champ: "columnSpan", raison: "Une place de grille n'est pas une valeur visuelle." },
  { champ: "rowSpan", raison: "Une place de grille n'est pas une valeur visuelle." },
  { champ: "justifySelf", raison: "Un alignement de grille n'est pas une valeur visuelle." },
  { champ: "alignSelf", raison: "Un alignement d'enfant n'est pas une valeur visuelle." },
  { champ: "justifyContent", raison: "Un alignement de conteneur n'est pas une valeur visuelle." },
  { champ: "alignItems", raison: "Un alignement de conteneur n'est pas une valeur visuelle." },
  { champ: "alignContent", raison: "Un alignement de contenu n'est pas une valeur visuelle." },
  { champ: "textOverflow", raison: "Le débordement du texte n'appartient à aucune famille de tokens." },
  { champ: "flexGrow", raison: "Un facteur d'extension n'appartient à aucune famille de tokens." },
  { champ: "position", raison: "Le mode de positionnement n'est pas une valeur visuelle." },
  { champ: "layout", raison: "La direction de mise en page n'est pas une valeur visuelle." },
  { champ: "columns", raison: "Un nombre de colonnes n'est pas une valeur visuelle." },
  { champ: "rows", raison: "Un nombre de lignes n'est pas une valeur visuelle." },
  { champ: "constraints.horizontal", raison: "Une contrainte Figma n'est pas une valeur visuelle." },
  { champ: "constraints.vertical", raison: "Une contrainte Figma n'est pas une valeur visuelle." },
  { champ: "align", raison: "Le côté du trait n'est pas une valeur visuelle." },
  { champ: "type", raison: "Le type d'une prop, d'un effet ou d'un jeton de préférence décrit la forme du contrat." },
  { champ: "kind", raison: "La nature d'un rôle décrit la forme du contrat." },
  { champ: "policy", raison: "La politique d'une icône décrit la forme du contrat." },
  { champ: "target", raison: "La cible d'une liaison décrit la forme du contrat." },
  { champ: "severity", raison: "La sévérité d'un diagnostic décrit la forme du contrat." },
  { champ: "portable", raison: "La couverture portable décrit la forme du contrat." },
  { champ: "settings.minChildren", raison: "Un nombre d'enfants n'est pas une valeur visuelle." },
  { champ: "settings.maxChildren", raison: "Un nombre d'enfants n'est pas une valeur visuelle." },
];

// ─── Codes, règles et limites ─────────────────────────────────────────────

/** Les règles que le plugin du développeur affiche, une par valeur de `regle`. */
const REGLES_DU_CONTROLE = ["token-inconnu", "valeur-en-dur"];

/** Chaque code d'un constat, la règle qui l'affiche et son niveau. */
const CODES_DU_CONTROLE_DU_CODE = [
  { code: "token-inconnu", regles: ["token-inconnu"], niveau: "ecart", raison: "Une référence ou une variable ne nomme aucun token de tokens.json." },
  { code: "repli-en-dur", regles: ["token-inconnu"], niveau: "ecart", raison: "Un repli écrit en dur masque la variable que la feuille des tokens déclare." },
  { code: "nom-css-ambigu", regles: ["token-inconnu"], niveau: "limite", raison: "Deux tokens portent le même nom CSS : le contrôle ne choisit pas." },
  { code: "valeur-en-dur", regles: ["valeur-en-dur"], niveau: "ecart", raison: "Le code écrit une valeur visuelle que le contrat ne publie pas." },
  { code: "non-analyse", regles: ["token-inconnu", "valeur-en-dur"], niveau: "non-analyse", raison: "Le code calcule la valeur ou le nom : le contrôle ne le suit pas." },
  { code: "desactivation-interdite", regles: ["token-inconnu", "valeur-en-dur"], niveau: "ecart", raison: "Un commentaire désactive une règle UCM, que le contrôle juge sans le lire." },
];

/** Ce que le contrôle ne peut pas juger d'un fichier ou d'un composant. */
const LIMITES_DU_CONTROLE = [
  { code: "configuration-absente", raison: "Sans ucm.config.json, le contrôle ne sait pas où sont les contrats." },
  { code: "configuration-invalide", raison: "Une configuration invalide ne dit pas où sont les contrats." },
  { code: "contrats-introuvables", raison: "Sans le dossier des contrats, aucun composant n'est connu." },
  { code: "fichier-sans-chemin", raison: "Un texte sans fichier ne se rattache à aucun composant." },
  { code: "tokens-illisibles", raison: "Sans tokens.json, les références ne se jugent pas." },
  { code: "tokens-format-inconnu", raison: "Une version de tokens.json que ce kit ne lit pas ne se juge pas." },
  { code: "contrat-illisible", raison: "Un contrat illisible ne publie aucune valeur." },
  { code: "contrat-ancien", raison: "Un contrat plus ancien que la fenêtre de lecture se réexporte." },
  { code: "contrat-recent", raison: "Un contrat plus récent que ce kit demande de monter @ucm-kit/core." },
  { code: "contrats-multiples", raison: "Deux contrats pour le même fichier : le contrôle ne choisit pas." },
  { code: "fichier-partage", raison: "Un fichier importé par deux composants répond au contrat de chacun." },
  { code: "lecture-incomplete", raison: "Le fichier a une erreur de syntaxe : le reste se juge." },
  { code: "derogations-illisibles", raison: "Un fichier de dérogations invalide n'en applique aucune." },
  { code: "sans-adaptateur", raison: "Le lecteur du code ne lit pas cette extension." },
];

// ─── Messages ─────────────────────────────────────────────────────────────

const liste = (valeurs) => valeurs.join(", ");

/** Le message d'un constat, d'après son code et ses faits. */
function messageDuConstat(code, faits, composant) {
  switch (code) {
    case "token-inconnu":
      return faits.reference !== undefined
        ? `\`${faits.reference}\` ne nomme aucun token de tokens.json.`
        : `\`${faits.variable}\` ne nomme aucun token de tokens.json, et aucun fichier du composant ne la déclare.`;
    case "repli-en-dur":
      return `\`var(${faits.variable}, ${faits.repli})\` porte un repli écrit en dur. Retirez le repli, la feuille des tokens déclare la variable.`;
    case "nom-css-ambigu":
      return `\`${faits.variable}\` nomme plusieurs tokens de tokens.json, \`${liste(faits.chemins)}\`. Le contrôle ne choisit pas. Signalez-le au designer.`;
    case "valeur-en-dur":
      return faits.propriete === undefined || faits.propriete === null
        ? `\`${liste(faits.parties)}\` est une valeur écrite en dur, que le contrat de \`${composant}\` ne publie pas. Écrivez la référence de token que le contrat donne.`
        : `\`${faits.propriete}\` reçoit \`${liste(faits.parties)}\`, que le contrat de \`${composant}\` ne publie pas. Écrivez la référence de token que le contrat donne.`;
    case "non-analyse":
      if (faits.forme === "decomposition") return "Une décomposition `...` dans un objet de style n’est pas jugée.";
      if (faits.forme === "gabarit") return "Ce nom de variable est construit par le code. Le contrôle ne le juge pas.";
      return `La valeur de \`${faits.propriete}\` est calculée par le code. Le contrôle ne la juge pas.`;
    case "desactivation-interdite":
      return "Ce commentaire désactive une règle UCM. `ucm check` juge le code sans en tenir compte. Retirez-le, et dérogez si la valeur doit rester.";
    default:
      return "";
  }
}

/** La phrase que reçoit un écart dérogeable que rien ne couvre. */
function suffixeDeDerogation(commande) {
  return `Pour la garder, lancez \`${commande}\` avec votre raison à la place de \`…\`.`;
}

/** Le message d'une limite, d'après son code et ses faits. */
function messageDeLaLimite(code, faits) {
  switch (code) {
    case "configuration-absente":
      return "Aucun ucm.config.json au-dessus de ce fichier. Le contrôle ne sait pas où sont les contrats.";
    case "configuration-invalide":
      return `ucm.config.json est invalide : ${faits.erreur}`;
    case "contrats-introuvables":
      return `Le dossier des contrats \`${faits.dossier}\` est introuvable.`;
    case "fichier-sans-chemin":
      return "Ce texte n’a pas de fichier sur le disque. Le contrôle ne le rattache à aucun composant.";
    case "tokens-illisibles":
      return `\`${faits.chemin}\` est absent ou illisible. Les références ne sont pas jugées.`;
    case "tokens-format-inconnu":
      return `\`${faits.chemin}\` est d’une version que ce kit ne lit pas. Les références ne sont pas jugées.`;
    case "contrat-illisible":
      return `Le contrat de \`${faits.composant}\` est illisible. Les valeurs ne sont pas jugées.`;
    case "contrat-ancien":
      return `Le contrat de \`${faits.composant}\` est en ${faits.version}, plus ancien que ce que ce kit lit. Le designer le réexporte. Les valeurs ne sont pas jugées.`;
    case "contrat-recent":
      return `Le contrat de \`${faits.composant}\` est en ${faits.version}, plus récent que ce kit. Montez @ucm-kit/core. Les valeurs ne sont pas jugées.`;
    case "contrats-multiples":
      return `Plusieurs contrats désignent ce fichier, \`${liste(faits.composants)}\`. Les valeurs ne sont pas jugées.`;
    case "fichier-partage":
      return `Ce fichier sert \`${liste(faits.composants)}\`. Il répond au contrat de chacun.`;
    case "lecture-incomplete":
      return `Ce fichier porte ${faits.erreurs} ${faits.erreurs > 1 ? "erreurs" : "erreur"} de syntaxe. La partie illisible n’est pas jugée.`;
    case "derogations-illisibles":
      return ".ucm/derogations.json contient des erreurs. Aucune dérogation n’est appliquée.";
    case "sans-adaptateur":
      return `Le lecteur du code ne lit pas les fichiers \`${faits.extension}\`. Le code de \`${faits.composant}\` n’est pas jugé.`;
    default:
      return "";
  }
}

/** La règle qui affiche un constat : le code, ses faits (`forme`, `regle`) et la table des codes la donnent. */
function regleDuConstat(code, faits = {}) {
  if (code === "non-analyse") return faits.forme === "gabarit" ? "token-inconnu" : "valeur-en-dur";
  if (code === "desactivation-interdite" && faits.regle) return faits.regle;
  return CODES_DU_CONTROLE_DU_CODE.find((entree) => entree.code === code)?.regles[0] ?? null;
}

export {
  FAMILLES,
  PROPRIETES_PAR_FAMILLE,
  VALEURS_NEUTRES,
  RAISON_UNITES_DE_LONGUEUR,
  UNITES_DE_LONGUEUR,
  RAISON_FONCTIONS_DE_COULEUR,
  FONCTIONS_DE_COULEUR,
  RAISON_FONCTIONS_MATHEMATIQUES,
  FONCTIONS_MATHEMATIQUES,
  RAISON_NOMS_DE_COULEUR,
  NOMS_DE_COULEUR,
  RAISON_MOTS_CLES_DE_FORME,
  MOTS_CLES_DE_FORME,
  RAISON_ATTRIBUTS_SANS_VALEUR_VISUELLE,
  ATTRIBUTS_SANS_VALEUR_VISUELLE,
  CHAMPS_A_VALEUR_PUBLIEE,
  CHAMPS_HORS_FAMILLE,
  REGLES_DU_CONTROLE,
  CODES_DU_CONTROLE_DU_CODE,
  LIMITES_DU_CONTROLE,
  messageDuConstat,
  suffixeDeDerogation,
  messageDeLaLimite,
  regleDuConstat,
};
