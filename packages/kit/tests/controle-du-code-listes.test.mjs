/**
 * Les listes du contrôle du code tiennent leur forme (L1), suivent le format
 * (L2, L3) et nomment chaque code (L4), et chaque message dit ce que le plan
 * lui fait dire.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { tableDesRolesDeRendu } from "@ucm-kit/core/format";

import * as listes from "../src/lecteurs/controle-du-code-listes.mjs";
import { coordonneesDuGenre } from "../src/lecteurs/derogations.mjs";

const {
  FAMILLES,
  PROPRIETES_PAR_FAMILLE,
  VALEURS_NEUTRES,
  CHAMPS_A_VALEUR_PUBLIEE,
  CHAMPS_HORS_FAMILLE,
  CODES_DU_CONTROLE_DU_CODE,
  LIMITES_DU_CONTROLE,
} = listes;

const racineDuKit = join(dirname(fileURLToPath(import.meta.url)), "..");

const noms = (entrees, cle) => entrees.map((entree) => entree[cle]);
const surUneLigne = (texte) => typeof texte === "string" && texte.trim() !== "" && !texte.includes("\n");

/** Les listes de `{ cle, raison }` : une entrée, une raison, aucun doublon. */
const LISTES_A_ENTREES = [
  ["FAMILLES", FAMILLES, "famille"],
  ["PROPRIETES_PAR_FAMILLE", PROPRIETES_PAR_FAMILLE, "propriete"],
  ["VALEURS_NEUTRES", VALEURS_NEUTRES, "valeur"],
  ["CHAMPS_A_VALEUR_PUBLIEE", CHAMPS_A_VALEUR_PUBLIEE, "champ"],
  ["CHAMPS_HORS_FAMILLE", CHAMPS_HORS_FAMILLE, "champ"],
  ["CODES_DU_CONTROLE_DU_CODE", CODES_DU_CONTROLE_DU_CODE, "code"],
  ["LIMITES_DU_CONTROLE", LIMITES_DU_CONTROLE, "code"],
];

/** Les listes à raison unique : un tableau et sa constante `RAISON_…`. */
const LISTES_A_RAISON_UNIQUE = [
  "UNITES_DE_LONGUEUR",
  "FONCTIONS_DE_COULEUR",
  "FONCTIONS_MATHEMATIQUES",
  "NOMS_DE_COULEUR",
  "MOTS_CLES_DE_FORME",
  "ATTRIBUTS_SANS_VALEUR_VISUELLE",
];

test("L1 : chaque entrée a une raison sur une ligne et aucune n'est en double", () => {
  for (const [nom, entrees, cle] of LISTES_A_ENTREES) {
    assert.ok(entrees.length > 0, nom);
    for (const entree of entrees) {
      assert.ok(surUneLigne(entree.raison), `${nom} : ${entree[cle]} n'a pas de raison`);
      assert.equal(entree[cle], entree[cle].trim(), `${nom} : ${entree[cle]} a une espace de bord`);
    }
    const cles = noms(entrees, cle);
    assert.deepEqual(cles.filter((valeur, i) => cles.indexOf(valeur) !== i), [], `${nom} : doublon`);
  }
});

test("L1 : une liste à raison unique a sa raison, des valeurs en minuscules et aucun doublon", () => {
  for (const nom of LISTES_A_RAISON_UNIQUE) {
    const valeurs = listes[nom];
    assert.ok(Array.isArray(valeurs) && valeurs.length > 0, nom);
    assert.ok(surUneLigne(listes[`RAISON_${nom}`]), `RAISON_${nom} manque`);
    assert.deepEqual(valeurs.filter((valeur, i) => valeurs.indexOf(valeur) !== i), [], `${nom} : doublon`);
    for (const valeur of valeurs) {
      assert.equal(valeur, valeur.trim(), `${nom} : « ${valeur} » a une espace de bord`);
      // Un attribut JSX s'écrit en camelCase (`htmlFor`) : seul lui garde ses majuscules.
      if (nom !== "ATTRIBUTS_SANS_VALEUR_VISUELLE") assert.equal(valeur, valeur.toLowerCase(), `${nom} : « ${valeur} » n'est pas en minuscules`);
    }
  }
  for (const { valeur } of VALEURS_NEUTRES) assert.equal(valeur, valeur.toLowerCase());
});

test("L1 : une propriété nomme au moins une famille déclarée, une fois chacune", () => {
  const familles = new Set(noms(FAMILLES, "famille"));
  for (const { propriete, familles: siennes } of PROPRIETES_PAR_FAMILLE) {
    assert.ok(siennes.length > 0, propriete);
    assert.equal(propriete, propriete.toLowerCase());
    for (const famille of siennes) assert.ok(familles.has(famille), `${propriete} : famille inconnue ${famille}`);
    assert.equal(new Set(siennes).size, siennes.length, propriete);
  }
  for (const { champ, famille } of CHAMPS_A_VALEUR_PUBLIEE) assert.ok(familles.has(famille), `${champ} : famille inconnue ${famille}`);
});

test("L1 : une valeur, une famille ou une propriété hors de ces règles est refusée par la vérification même", () => {
  const verifier = (entrees, cle) => entrees.filter((entree) => !surUneLigne(entree.raison) || entree[cle] !== entree[cle].trim() || entree[cle] !== entree[cle].toLowerCase());
  assert.equal(verifier([{ valeur: "A", raison: "x" }, { valeur: "a ", raison: "x" }, { valeur: "a", raison: "" }], "valeur").length, 3);
});

test("L2 : chaque propriété CSS d'un rôle de rendu est classée, et la couleur reste celle d'un rôle de peinture", () => {
  const familles = new Map(PROPRIETES_PAR_FAMILLE.map((entree) => [entree.propriete, entree.familles]));
  for (const [identifiant, role] of Object.entries(tableDesRolesDeRendu())) {
    assert.ok(role.cssProperties.length > 0, identifiant);
    for (const propriete of role.cssProperties) assert.ok(familles.has(propriete), `${identifiant} : ${propriete} n'est dans aucune famille`);
    // `outline-width` est la géométrie du rôle `ring` : sa famille est la dimension, la couleur est `outline-color`.
    assert.ok(role.cssProperties.some((propriete) => familles.get(propriete).includes("couleur")), `${identifiant} : aucune propriété de couleur`);
    if (role.kind === "paint") {
      for (const propriete of role.cssProperties) assert.ok(familles.get(propriete).includes("couleur"), `${identifiant} : ${propriete}`);
    }
  }
});

// ─── L3 : les champs du format qui admettent une valeur en clair ──────────

/** Le champ du contrat que désigne la propriété d'un type, quand le type n'est pas celui de la racine du champ. */
const PARENTS = { GridStructuralSize: "structuralSize", ContainerSizing: "sizing", TextStyleLiterals: "literals", LayoutConstraints: "constraints" };

/** Les propriétés de `types.ts` dont le type admet un littéral de chaîne, un gabarit de chaîne ou un nombre. */
function champsDuFormatEnClair() {
  const source = ts.createSourceFile("types.ts", readFileSync(join(racineDuKit, "src", "format", "types.ts"), "utf8"), ts.ScriptTarget.Latest, true);
  const alias = new Map(source.statements.filter(ts.isTypeAliasDeclaration).map((declaration) => [declaration.name.text, declaration.type]));
  const admet = (noeud, vus = new Set()) => {
    if (!noeud) return false;
    if (ts.isLiteralTypeNode(noeud)) return ts.isStringLiteral(noeud.literal) || ts.isNumericLiteral(noeud.literal) || ts.isPrefixUnaryExpression(noeud.literal);
    if (ts.isTemplateLiteralTypeNode(noeud) || noeud.kind === ts.SyntaxKind.NumberKeyword) return true;
    if (ts.isParenthesizedTypeNode(noeud)) return admet(noeud.type, vus);
    if (ts.isUnionTypeNode(noeud) || ts.isIntersectionTypeNode(noeud)) return noeud.types.some((type) => admet(type, vus));
    if (ts.isArrayTypeNode(noeud)) return admet(noeud.elementType, vus);
    if (ts.isTupleTypeNode(noeud)) return noeud.elements.some((type) => admet(type, vus));
    if (!ts.isTypeReferenceNode(noeud)) return false;
    const nom = noeud.typeName.getText();
    if (alias.has(nom)) return !vus.has(nom) && admet(alias.get(nom), new Set([...vus, nom]));
    const arguments_ = noeud.typeArguments ?? [];
    if (nom === "Record") return admet(arguments_[1], vus);
    return ["Partial", "Required", "Readonly", "Array", "ReadonlyArray"].includes(nom) && arguments_.some((type) => admet(type, vus));
  };
  const trouves = new Set();
  const descendre = (noeud, type, chemin) => {
    if (!noeud) return;
    if (ts.isTypeLiteralNode(noeud)) {
      for (const membre of noeud.members.filter(ts.isPropertySignature)) {
        const propre = [...chemin, membre.name.getText()];
        if (admet(membre.type)) trouves.add(`${type}.${propre.join(".")}`);
        descendre(membre.type, type, propre);
      }
    } else if (ts.isTypeReferenceNode(noeud)) {
      for (const argument of noeud.typeArguments ?? []) descendre(argument, type, chemin);
    } else if (ts.isUnionTypeNode(noeud) || ts.isIntersectionTypeNode(noeud)) {
      for (const membre of noeud.types) descendre(membre, type, chemin);
    } else if (ts.isParenthesizedTypeNode(noeud)) descendre(noeud.type, type, chemin);
    else if (ts.isArrayTypeNode(noeud)) descendre(noeud.elementType, type, chemin);
  };
  for (const declaration of source.statements) {
    if (ts.isTypeAliasDeclaration(declaration)) descendre(declaration.type, declaration.name.text, []);
    else if (ts.isInterfaceDeclaration(declaration)) {
      for (const membre of declaration.members.filter(ts.isPropertySignature)) {
        if (admet(membre.type)) trouves.add(`${declaration.name.text}.${membre.name.getText()}`);
        descendre(membre.type, declaration.name.text, [membre.name.getText()]);
      }
    }
  }
  return [...trouves].map((nom) => {
    const [type, ...reste] = nom.split(".");
    return PARENTS[type] ? `${PARENTS[type]}.${reste.join(".")}` : reste.join(".");
  });
}

test("L3 : chaque champ du format qui admet une valeur en clair est publié ou hors famille, et chaque entrée désigne un champ réel", () => {
  const attendus = new Set(champsDuFormatEnClair());
  assert.ok(attendus.size > 30, "la lecture de types.ts n'a presque rien trouvé");
  const rangés = new Set([...noms(CHAMPS_A_VALEUR_PUBLIEE, "champ"), ...noms(CHAMPS_HORS_FAMILLE, "champ")]);
  assert.deepEqual([...attendus].filter((champ) => !rangés.has(champ)).sort(), [], "champs du format absents des deux listes");
  assert.deepEqual([...rangés].filter((champ) => !attendus.has(champ)).sort(), [], "entrées qui ne désignent aucun champ du format");
  const publies = new Set(noms(CHAMPS_A_VALEUR_PUBLIEE, "champ"));
  assert.deepEqual(noms(CHAMPS_HORS_FAMILLE, "champ").filter((champ) => publies.has(champ)), [], "un champ ne peut être dans les deux listes");
});

test("L3 : le cadrage nomme les valeurs publiées, `stretch` publie aussi `100%`", () => {
  const champs = noms(CHAMPS_A_VALEUR_PUBLIEE, "champ");
  for (const champ of ["sizing.width", "sizing.height", "structuralSize.width", "structuralSize.height", "columnSizes", "rowSizes", "inset", "textAlign", "lineClamp"]) assert.ok(champs.includes(champ), champ);
  assert.equal(CHAMPS_A_VALEUR_PUBLIEE.find((entree) => entree.champ === "sizing.width").aussi.stretch, "100%");
});

test("L4 : chaque code et chaque limite a une raison, les règles sont connues et seuls trois codes se dérogent", () => {
  for (const { code, regles, niveau } of CODES_DU_CONTROLE_DU_CODE) {
    assert.ok(regles.length > 0 && regles.every((regle) => ["token-inconnu", "valeur-en-dur"].includes(regle)), code);
    assert.ok(["ecart", "non-analyse", "limite"].includes(niveau), code);
  }
  assert.deepEqual(noms(CODES_DU_CONTROLE_DU_CODE, "code"), ["token-inconnu", "repli-en-dur", "nom-css-ambigu", "valeur-en-dur", "non-analyse", "desactivation-interdite"]);
  assert.deepEqual(noms(LIMITES_DU_CONTROLE, "code"), [
    "configuration-absente", "configuration-invalide", "contrats-introuvables", "fichier-sans-chemin", "tokens-illisibles",
    "tokens-format-inconnu", "contrat-illisible", "contrat-ancien", "contrat-recent", "contrats-multiples", "fichier-partage",
    "lecture-incomplete", "derogations-illisibles", "sans-adaptateur",
  ]);
  const derogeables = [...noms(CODES_DU_CONTROLE_DU_CODE, "code"), ...noms(LIMITES_DU_CONTROLE, "code")].filter((code) => coordonneesDuGenre(code) !== null);
  assert.deepEqual(derogeables.sort(), ["repli-en-dur", "token-inconnu", "valeur-en-dur"]);
});

test("les messages disent ce que le plan leur fait dire", () => {
  const { messageDuConstat, messageDeLaLimite, suffixeDeDerogation, regleDuConstat } = listes;
  assert.equal(messageDuConstat("token-inconnu", { reference: "{a.b}" }, "Button"), "`{a.b}` ne nomme aucun token de tokens.json.");
  assert.equal(messageDuConstat("token-inconnu", { variable: "--x" }, "Button"), "`--x` ne nomme aucun token de tokens.json, et aucun fichier du composant ne la déclare.");
  assert.equal(messageDuConstat("repli-en-dur", { variable: "--x", repli: "8px" }, "Button"), "`var(--x, 8px)` porte un repli écrit en dur. Retirez le repli, la feuille des tokens déclare la variable.");
  assert.equal(messageDuConstat("nom-css-ambigu", { variable: "--n", chemins: ["a.b", "a.c"] }, "Button"), "`--n` nomme plusieurs tokens de tokens.json, `a.b, a.c`. Le contrôle ne choisit pas. Signalez-le au designer.");
  assert.equal(messageDuConstat("valeur-en-dur", { propriete: "padding", parties: ["12px"] }, "Button"), "`padding` reçoit `12px`, que le contrat de `Button` ne publie pas. Écrivez la référence de token que le contrat donne.");
  assert.equal(messageDuConstat("valeur-en-dur", { parties: ["#fff"] }, "Button"), "`#fff` est une valeur écrite en dur, que le contrat de `Button` ne publie pas. Écrivez la référence de token que le contrat donne.");
  assert.equal(messageDuConstat("non-analyse", { propriete: "gap", forme: "expression" }, "Button"), "La valeur de `gap` est calculée par le code. Le contrôle ne la juge pas.");
  assert.equal(messageDuConstat("non-analyse", { forme: "decomposition" }, "Button"), "Une décomposition `...` dans un objet de style n’est pas jugée.");
  assert.equal(messageDuConstat("non-analyse", { forme: "gabarit" }, "Button"), "Ce nom de variable est construit par le code. Le contrôle ne le juge pas.");
  assert.equal(messageDuConstat("desactivation-interdite", {}, "Button"), "Ce commentaire désactive une règle UCM. `ucm check` juge le code sans en tenir compte. Retirez-le, et dérogez si la valeur doit rester.");
  assert.equal(suffixeDeDerogation("npx ucm deroger X"), "Pour la garder, lancez `npx ucm deroger X` avec votre raison à la place de `…`.");

  assert.equal(messageDeLaLimite("configuration-invalide", { erreur: "boum" }), "ucm.config.json est invalide : boum");
  assert.equal(messageDeLaLimite("contrats-introuvables", { dossier: "src" }), "Le dossier des contrats `src` est introuvable.");
  assert.equal(messageDeLaLimite("tokens-illisibles", { chemin: "tokens.json" }), "`tokens.json` est absent ou illisible. Les références ne sont pas jugées.");
  assert.equal(messageDeLaLimite("tokens-format-inconnu", { chemin: "tokens.json" }), "`tokens.json` est d’une version que ce kit ne lit pas. Les références ne sont pas jugées.");
  assert.equal(messageDeLaLimite("contrat-illisible", { composant: "Button" }), "Le contrat de `Button` est illisible. Les valeurs ne sont pas jugées.");
  assert.equal(messageDeLaLimite("contrat-ancien", { composant: "Button", version: "12.0" }), "Le contrat de `Button` est en 12.0, plus ancien que ce que ce kit lit. Le designer le réexporte. Les valeurs ne sont pas jugées.");
  assert.equal(messageDeLaLimite("contrat-recent", { composant: "Button", version: "15.0" }), "Le contrat de `Button` est en 15.0, plus récent que ce kit. Montez @ucm-kit/core. Les valeurs ne sont pas jugées.");
  assert.equal(messageDeLaLimite("contrats-multiples", { composants: ["A", "B"] }), "Plusieurs contrats désignent ce fichier, `A, B`. Les valeurs ne sont pas jugées.");
  assert.equal(messageDeLaLimite("fichier-partage", { composants: ["A", "B"] }), "Ce fichier sert `A, B`. Il répond au contrat de chacun.");
  assert.equal(messageDeLaLimite("lecture-incomplete", { erreurs: 3 }), "Ce fichier porte 3 erreurs de syntaxe. La partie illisible n’est pas jugée.");
  assert.equal(messageDeLaLimite("derogations-illisibles", {}), ".ucm/derogations.json contient des erreurs. Aucune dérogation n’est appliquée.");
  assert.equal(messageDeLaLimite("sans-adaptateur", { extension: ".jsx", composant: "Button" }), "Le lecteur du code ne lit pas les fichiers `.jsx`. Le code de `Button` n’est pas jugé.");

  assert.equal(regleDuConstat("non-analyse", { forme: "gabarit" }), "token-inconnu");
  assert.equal(regleDuConstat("non-analyse", { forme: "expression" }), "valeur-en-dur");
  assert.equal(regleDuConstat("repli-en-dur"), "token-inconnu");
  assert.equal(regleDuConstat("desactivation-interdite", { regle: "valeur-en-dur" }), "valeur-en-dur");
});
