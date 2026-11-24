/**
 * Lecteur du code : relève les chaînes, les déclarations de style et les
 * directives d'un fichier TypeScript, et les fichiers d'un composant.
 *
 * Il lit la syntaxe seule (`ts.createSourceFile`, ni programme ni vérificateur
 * de types) et ne juge rien : reconnaître une valeur visuelle revient au kit.
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";

import ts from "typescript";

/** Extensions lues, égales à celles qu'`ucm check` attend de cet adaptateur. */
export const EXTENSIONS_LUES = Object.freeze([".ts", ".tsx"]);

/**
 * Propriétés de style qui reçoivent un nombre sans `px`, recopiées de
 * `unitlessNumbers` dans `react-dom` 19.1.10
 * (`cjs/react-dom-client.development.js`), sans les variantes préfixées que
 * React 19 énumère. La boucle qui suit ajoute les quatre préfixes fournisseur
 * à chaque nom. Seule copie du dépôt ; `usages.test.mjs` (W3) la compare au
 * `react-dom` installé.
 */
export const PROPRIETES_SANS_UNITE_DE_REACT = [
  "animationIterationCount", "aspectRatio", "borderImageOutset", "borderImageSlice",
  "borderImageWidth", "boxFlex", "boxFlexGroup", "boxOrdinalGroup", "columnCount",
  "columns", "flex", "flexGrow", "flexPositive", "flexShrink", "flexNegative",
  "flexOrder", "gridArea", "gridRow", "gridRowEnd", "gridRowSpan", "gridRowStart",
  "gridColumn", "gridColumnEnd", "gridColumnSpan", "gridColumnStart", "fontWeight",
  "lineClamp", "lineHeight", "opacity", "order", "orphans", "scale", "tabSize", "widows",
  "zIndex", "zoom", "fillOpacity", "floodOpacity", "stopOpacity", "strokeDasharray",
  "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth",
];
const PREFIXES_FOURNISSEUR = ["Webkit", "ms", "Moz", "O"];
const SANS_UNITE = new Set(PROPRIETES_SANS_UNITE_DE_REACT.flatMap((nom) => [
  nom,
  ...PREFIXES_FOURNISSEUR.map((prefixe) => prefixe + nom[0].toUpperCase() + nom.slice(1)),
]));

/** Nom CSS d'une clé de style, comme `hyphenateStyleName` de React. */
function nomCss(cle) {
  if (cle.startsWith("--")) return cle;
  return cle.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^ms-/, "-ms-");
}

/**
 * Texte d'un nombre littéral. Dans un objet de style, `0` reste `0` et les autres reçoivent `px`
 * sauf sans unité. Ailleurs le nombre garde sa forme écrite : rien n'y dit que c'est une longueur.
 */
function texteDuNombre(nombre, cle, contexte) {
  if (contexte === "objet" || nombre === 0) return String(nombre);
  if (cle.startsWith("--") || SANS_UNITE.has(cle)) return String(nombre);
  return `${nombre}px`;
}

/** Marque d'un objet reconnu par l'attribut JSX `style`, qui n'a pas de nœud de type. */
const ATTRIBUT_STYLE = Symbol("attribut-style");

function lireNom(nom) {
  if (ts.isIdentifier(nom)) return nom.text;
  if (ts.isQualifiedName(nom)) return nom.right.text;
  return null;
}

function ecartParentheses(noeud) {
  let courant = noeud;
  while (
    ts.isParenthesizedExpression(courant)
    || ts.isAsExpression(courant)
    || ts.isSatisfiesExpression(courant)
  ) courant = courant.expression;
  return courant;
}

const estConst = (type) => ts.isTypeReferenceNode(type) && lireNom(type.typeName) === "const";
const ENVELOPPES_DE_TYPE = new Set(["Partial", "Readonly", "Required", "NonNullable"]);

/** Vrai si le type nomme `CSSProperties`, seul ou sous un enrobage usuel. */
function nommeCSSProperties(type) {
  if (type === ATTRIBUT_STYLE) return true;
  if (!type) return false;
  if (ts.isParenthesizedTypeNode(type)) return nommeCSSProperties(type.type);
  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    return type.types.some(nommeCSSProperties);
  }
  if (!ts.isTypeReferenceNode(type)) return false;
  const nom = lireNom(type.typeName);
  if (nom === "CSSProperties") return true;
  return ENVELOPPES_DE_TYPE.has(nom) && type.typeArguments?.length === 1
    && nommeCSSProperties(type.typeArguments[0]);
}

/** Type de la valeur d'une clé dans un type d'objet (`Record`, littéral de type, enrobages). */
function typeDeLaCle(type, cle) {
  if (!type || type === ATTRIBUT_STYLE) return null;
  if (ts.isParenthesizedTypeNode(type)) return typeDeLaCle(type.type, cle);
  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    for (const partie of type.types) {
      const trouve = typeDeLaCle(partie, cle);
      if (trouve) return trouve;
    }
    return null;
  }
  if (ts.isTypeLiteralNode(type)) {
    for (const membre of type.members) {
      if (ts.isPropertySignature(membre) && membre.type && membre.name
        && (ts.isIdentifier(membre.name) || ts.isStringLiteral(membre.name))
        && membre.name.text === cle) return membre.type;
      if (ts.isIndexSignatureDeclaration(membre)) return membre.type;
    }
    return null;
  }
  if (!ts.isTypeReferenceNode(type)) return null;
  const nom = lireNom(type.typeName);
  const arguments_ = type.typeArguments ?? [];
  if (nom === "Record" && arguments_.length === 2) return arguments_[1];
  if (ENVELOPPES_DE_TYPE.has(nom) && arguments_.length === 1) return typeDeLaCle(arguments_[0], cle);
  return null;
}

/** Type d'un élément d'un tableau typé. */
function typeDeLElement(type) {
  if (!type || type === ATTRIBUT_STYLE) return null;
  if (ts.isParenthesizedTypeNode(type)) return typeDeLElement(type.type);
  if (ts.isArrayTypeNode(type)) return type.elementType;
  if (!ts.isTypeReferenceNode(type)) return null;
  const nom = lireNom(type.typeName);
  const arguments_ = type.typeArguments ?? [];
  if ((nom === "Array" || nom === "ReadonlyArray") && arguments_.length === 1) return arguments_[0];
  if (ENVELOPPES_DE_TYPE.has(nom) && arguments_.length === 1) return typeDeLElement(arguments_[0]);
  return null;
}

function cleDeLaPropriete(nom) {
  if (ts.isIdentifier(nom) || ts.isStringLiteral(nom)) return nom.text;
  if (ts.isNoSubstitutionTemplateLiteral(nom)) return nom.text;
  return null;
}

/**
 * Type que le texte impose à une expression, quand il l'écrit : annotation de
 * variable, `satisfies`, `as`, type de retour, type d'une clé d'un objet typé.
 */
function typeAttendu(expression) {
  let haut = expression;
  while (haut.parent && (
    ts.isParenthesizedExpression(haut.parent)
    || (ts.isAsExpression(haut.parent) && estConst(haut.parent.type))
  )) haut = haut.parent;
  const parent = haut.parent;
  if (!parent) return null;

  if ((ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent)) && parent.expression === haut) {
    return parent.type;
  }
  if ((ts.isVariableDeclaration(parent) || ts.isPropertyDeclaration(parent)) && parent.initializer === haut) {
    return parent.type ?? null;
  }
  if (ts.isArrowFunction(parent) && parent.body === haut) return parent.type ?? null;
  if (ts.isReturnStatement(parent)) {
    let fonction = parent.parent;
    while (fonction && !ts.isFunctionLike(fonction)) fonction = fonction.parent;
    return fonction?.type ?? null;
  }
  if (ts.isJsxExpression(parent)) {
    return ts.isJsxAttribute(parent.parent) && parent.parent.name.getText() === "style"
      ? ATTRIBUT_STYLE
      : null;
  }
  if (ts.isConditionalExpression(parent) && parent.condition !== haut) return typeAttendu(parent);
  if (ts.isBinaryExpression(parent) && [
    ts.SyntaxKind.AmpersandAmpersandToken,
    ts.SyntaxKind.BarBarToken,
    ts.SyntaxKind.QuestionQuestionToken,
  ].includes(parent.operatorToken.kind)) {
    return typeAttendu(parent);
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === haut) {
    const cle = cleDeLaPropriete(parent.name);
    const objet = parent.parent;
    return cle === null || !ts.isObjectLiteralExpression(objet)
      ? null
      : typeDeLaCle(typeAttendu(objet), cle);
  }
  if (ts.isArrayLiteralExpression(parent)) return typeDeLElement(typeAttendu(parent));
  return null;
}

/** Valeur littérale d'un initialiseur : `{ valeur, noeud }` ou `null`. */
function valeurLitterale(initialiseur, cle, contexte) {
  const noeud = ecartParentheses(initialiseur);
  if (ts.isStringLiteral(noeud) || ts.isNoSubstitutionTemplateLiteral(noeud)) {
    return { valeur: noeud.text, noeud };
  }
  if (ts.isNumericLiteral(noeud)) return { valeur: texteDuNombre(Number(noeud.text), cle, contexte), noeud, nombre: true, enStyle: texteDuNombre(Number(noeud.text), cle, "style") };
  if (
    ts.isPrefixUnaryExpression(noeud)
    && (noeud.operator === ts.SyntaxKind.MinusToken || noeud.operator === ts.SyntaxKind.PlusToken)
    && ts.isNumericLiteral(noeud.operand)
  ) {
    const nombre = Number(noeud.operand.text);
    return {
      valeur: texteDuNombre(noeud.operator === ts.SyntaxKind.MinusToken ? -nombre : nombre, cle, contexte),
      noeud,
      nombre: true,
      enStyle: texteDuNombre(noeud.operator === ts.SyntaxKind.MinusToken ? -nombre : nombre, cle, "style"),
    };
  }
  return null;
}

/** Nom de l'attribut JSX qui porte le nœud, sans traverser une fonction ni un élément. */
function attributQuiPorte(noeud) {
  for (let courant = noeud.parent; courant; courant = courant.parent) {
    if (ts.isJsxAttribute(courant)) {
      return ts.isIdentifier(courant.name) ? courant.name.text : `${courant.name.namespace.text}:${courant.name.name.text}`;
    }
    if (ts.isFunctionLike(courant) || ts.isJsxElement(courant) || ts.isJsxFragment(courant)
      || ts.isJsxSelfClosingElement(courant)) return null;
  }
  return null;
}

const MEMBRES_A_NOM = [
  ts.isPropertyAssignment, ts.isPropertySignature, ts.isPropertyDeclaration, ts.isMethodDeclaration,
  ts.isMethodSignature, ts.isGetAccessorDeclaration, ts.isSetAccessorDeclaration, ts.isEnumMember,
  ts.isModuleDeclaration,
];

/** Une chaîne qui sert de clé, de spécificateur ou de type n'est pas une valeur écrite. */
function estHorsValeur(noeud) {
  const parent = noeud.parent;
  if (!parent) return false;
  if (ts.isLiteralTypeNode(parent) || ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)
    || ts.isExternalModuleReference(parent) || ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)
    || ts.isImportAttribute(parent)) return true;
  if (ts.isBindingElement(parent) && parent.propertyName === noeud) return true;
  if (MEMBRES_A_NOM.some((est) => est(parent) && parent.name === noeud)) return true;
  if (ts.isComputedPropertyName(parent)) return true;
  if (ts.isCallExpression(parent) && parent.arguments[0] === noeud
    && (parent.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(parent.expression) && parent.expression.text === "require"))) return true;
  return false;
}

/** Commentaires du fichier, jamais ceux qu'un texte JSX ou un littéral ressemblerait à en porter. */
function lireCommentaires(source, texte) {
  const candidats = new Map();
  const textesJsx = [];
  const noter = (plages) => { for (const plage of plages ?? []) candidats.set(plage.pos, plage); };
  const parcourir = (noeud) => {
    if (noeud.kind >= ts.SyntaxKind.FirstJSDocNode && noeud.kind <= ts.SyntaxKind.LastJSDocNode) return;
    const enfants = noeud.getChildren(source);
    if (enfants.length === 0) {
      if (noeud.kind === ts.SyntaxKind.JsxText) {
        textesJsx.push([noeud.pos, noeud.end]);
        return;
      }
      noter(ts.getLeadingCommentRanges(texte, noeud.pos));
      noter(ts.getTrailingCommentRanges(texte, noeud.end));
      return;
    }
    for (const enfant of enfants) parcourir(enfant);
  };
  parcourir(source);
  return [...candidats.values()]
    .filter((plage) => !textesJsx.some(([debut, fin]) => plage.pos >= debut && plage.pos < fin))
    .sort((gauche, droite) => gauche.pos - droite.pos);
}

const RELEVE_VIDE = () => ({
  chaines: [],
  declarations: [],
  variables: [],
  directives: [],
});

/**
 * Relève les usages d'un texte TypeScript. Les décalages valent dans `texte`
 * tel qu'il est reçu. Une chaîne d'un littéral entre guillemets garde ses
 * guillemets dans `debut` et `fin` ; un morceau de gabarit n'a que son texte.
 */
export function releverUsages(texte, nomDuFichier) {
  const extension = extname(nomDuFichier).toLowerCase();
  if (!EXTENSIONS_LUES.includes(extension)) {
    return { ...RELEVE_VIDE(), lecture: { complete: false, erreurs: 0, extension } };
  }
  const source = ts.createSourceFile(
    nomDuFichier,
    texte,
    ts.ScriptTarget.Latest,
    true,
    extension === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const erreurs = source.parseDiagnostics?.length ?? 0;
  const releve = RELEVE_VIDE();
  const variables = new Set();
  const consommes = new Set();

  const ajouterChaine = (noeud, texteDeLaChaine, debut, fin) => {
    releve.chaines.push({ texte: texteDeLaChaine, debut, fin, attribut: attributQuiPorte(noeud) });
  };

  const releverObjet = (objet) => {
    const typeDeLObjet = typeAttendu(objet);
    const contexte = nommeCSSProperties(typeDeLObjet) ? "style" : "objet";
    for (const propriete of objet.properties) {
      if (ts.isSpreadAssignment(propriete)) {
        if (contexte === "style") {
          releve.declarations.push({
            propriete: null,
            valeur: null,
            debut: propriete.getStart(source),
            fin: propriete.getEnd(),
            contexte,
          });
        }
        continue;
      }
      if (!ts.isPropertyAssignment(propriete) && !ts.isShorthandPropertyAssignment(propriete)) continue;
      const cle = ts.isShorthandPropertyAssignment(propriete)
        ? propriete.name.text
        : cleDeLaPropriete(propriete.name);
      const debut = propriete.getStart(source);
      const fin = propriete.getEnd();
      const litterale = ts.isPropertyAssignment(propriete) && cle !== null
        ? valeurLitterale(propriete.initializer, cle, contexte)
        : null;
      if (contexte === "objet" && !litterale) continue;
      if (cle?.startsWith("--") && contexte === "style") variables.add(cle);
      if (litterale) {
        consommes.add(litterale.noeud);
        releve.declarations.push({
          propriete: nomCss(cle),
          valeur: litterale.valeur,
          debut: litterale.noeud.getStart(source),
          fin: litterale.noeud.getEnd(),
          contexte,
          ...(litterale.nombre ? { nombre: true } : {}),
          ...(litterale.nombre && contexte === "objet" ? { valeurEnStyle: litterale.enStyle } : {}),
        });
      } else {
        releve.declarations.push({
          propriete: cle === null ? null : nomCss(cle),
          valeur: null,
          debut,
          fin,
          contexte,
        });
      }
    }
  };

  const visiter = (noeud) => {
    if (ts.isObjectLiteralExpression(noeud)) {
      releverObjet(noeud);
    } else if (ts.isStringLiteral(noeud)) {
      if (!consommes.has(noeud) && !estHorsValeur(noeud)) {
        ajouterChaine(noeud, noeud.text, noeud.getStart(source), noeud.getEnd());
      }
    } else if (ts.isNoSubstitutionTemplateLiteral(noeud)) {
      if (!consommes.has(noeud) && !estHorsValeur(noeud) && noeud.text !== "") {
        ajouterChaine(noeud, noeud.text, noeud.getStart(source) + 1, noeud.getEnd() - 1);
      }
    } else if (ts.isTemplateExpression(noeud)) {
      const morceaux = [noeud.head, ...noeud.templateSpans.map((travee) => travee.literal)];
      for (const morceau of morceaux) {
        if (morceau.text === "") continue;
        const fermeture = morceau === morceaux[morceaux.length - 1] ? 1 : 2;
        ajouterChaine(noeud, morceau.text, morceau.getStart(source) + 1, morceau.getEnd() - fermeture);
      }
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(source);

  releve.variables = [...variables];
  releve.directives = lireCommentaires(source, texte)
    .map((plage) => ({ texte: texte.slice(plage.pos, plage.end), debut: plage.pos, fin: plage.end }))
    .filter((directive) => directive.texte.includes("eslint-disable"));
  return { ...releve, lecture: { complete: erreurs === 0, erreurs } };
}

function estFichier(chemin) {
  try {
    return statSync(chemin).isFile();
  } catch {
    return false;
  }
}

/** Fichier que vise un import relatif : `.ts`, `.tsx`, puis `index.ts` et `index.tsx`. */
function resoudreImport(dossier, specificateur) {
  const base = resolve(dossier, specificateur);
  const candidats = [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    base,
    base.replace(/\.js$/i, ".ts"),
    base.replace(/\.js$/i, ".tsx"),
  ];
  return candidats.find((candidat) => (
    EXTENSIONS_LUES.includes(extname(candidat).toLowerCase()) && estFichier(candidat)
  )) ?? null;
}

const estRelatif = (specificateur) => (
  specificateur === "." || specificateur === ".." || specificateur.startsWith("./") || specificateur.startsWith("../")
);

function cleDeChemin(chemin) {
  return process.platform === "win32" ? chemin.toLowerCase() : chemin;
}

/**
 * Fichiers d'un composant : son implémentation, puis ceux qu'elle importe par
 * un chemin relatif, transitivement, dans son dossier et ses sous-dossiers.
 */
export function fichiersDuComposant(implementation) {
  const racine = resolve(implementation);
  if (!estFichier(racine)) {
    return { fichiers: [], lecture: { complete: false, erreurs: 0 } };
  }
  const extension = extname(racine).toLowerCase();
  if (!EXTENSIONS_LUES.includes(extension)) {
    return { fichiers: [racine], lecture: { complete: false, erreurs: 0, extension } };
  }

  const dossier = dirname(racine);
  const dansLeDossier = (chemin) => {
    const chemRelatif = relative(dossier, chemin);
    return chemRelatif !== "" && !chemRelatif.startsWith("..") && !isAbsolute(chemRelatif);
  };
  const vus = new Set([cleDeChemin(racine)]);
  const file = [racine];
  let illisibles = 0;

  for (let rang = 0; rang < file.length; rang += 1) {
    let texte;
    try {
      texte = readFileSync(file[rang], "utf8");
    } catch {
      illisibles += 1;
      continue;
    }
    for (const { fileName } of ts.preProcessFile(texte, true, true).importedFiles) {
      if (!estRelatif(fileName)) continue;
      const cible = resoudreImport(dirname(file[rang]), fileName);
      if (!cible || !dansLeDossier(cible) || vus.has(cleDeChemin(cible))) continue;
      vus.add(cleDeChemin(cible));
      file.push(cible);
    }
  }

  return {
    fichiers: [racine, ...file.slice(1).sort()],
    lecture: { complete: illisibles === 0, erreurs: illisibles },
  };
}

/** Surface que `@ucm-kit/adapter-typescript/usages` publiera. */
export const lecteurDuCode = Object.freeze({
  releverUsages,
  fichiersDuComposant,
  extensions: EXTENSIONS_LUES,
});
