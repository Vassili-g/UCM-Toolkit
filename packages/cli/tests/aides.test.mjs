/**
 * Les lois du catalogue d'aides. Chaque caractéristique a une aide, chaque aide
 * nomme une caractéristique, chaque aide a son sens et sa preuve, et chaque
 * couple (définition, propriété) du schéma publié relève d'une aide ou dit
 * pourquoi il n'en a pas.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { CARACTERISTIQUES, CHAMPS, SANS_AIDE, lireLeSchema } from "@ucm-kit/core/lecteurs";

const DOSSIER = new URL("../aides/", import.meta.url);

/** Les aides qui répondent à un ancrage du repository : elles n'ont pas d'écriture par défaut. */
const ANCRAGES = [
  "attributs-natifs",
  "chargement-feuilles",
  "comptage-dependances",
  "controles",
  "focus-clavier",
  "icone-composant",
  "identifiants",
  "portee-mode",
];

/** Une aide lue : son en-tête à deux clés plates, et les titres de ses sections. */
function lireAide(fichier) {
  const texte = readFileSync(new URL(fichier, DOSSIER), "utf8").replace(/\r\n/g, "\n");
  const decoupe = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(texte);
  assert.ok(decoupe, `${fichier} n'a pas d'en-tête`);
  const entete = decoupe[1].split("\n").map((ligne) => {
    const separateur = ligne.indexOf(":");
    return [ligne.slice(0, separateur).trim(), ligne.slice(separateur + 1).trim()];
  });
  return {
    fichier,
    nom: fichier.replace(/\.md$/, ""),
    entete,
    corps: decoupe[2],
    sections: [...decoupe[2].matchAll(/^## (.+)$/gm)].map((titre) => titre[1].trim()),
  };
}

const AIDES = readdirSync(DOSSIER).filter((fichier) => fichier.endsWith(".md")).sort().map(lireAide);
const IDENTIFIANTS = CARACTERISTIQUES.map(({ id }) => id);
const quandDe = (aide) => Object.fromEntries(aide.entete).quand;

test("chaque aide a un en-tête de deux clés, aide et quand, et son nom est celui du fichier", () => {
  assert.ok(AIDES.length > 0, "aucune aide trouvée");
  for (const aide of AIDES) {
    assert.deepEqual(aide.entete.map(([cle]) => cle), ["aide", "quand"], aide.fichier);
    assert.equal(Object.fromEntries(aide.entete).aide, aide.nom, aide.fichier);
  }
});

test("chaque caractéristique est le quand d'au moins une aide", () => {
  const couvertes = new Set(AIDES.map(quandDe));
  assert.deepEqual(IDENTIFIANTS.filter((id) => !couvertes.has(id)), []);
});

test("chaque quand nomme une caractéristique", () => {
  assert.deepEqual(AIDES.filter((aide) => !IDENTIFIANTS.includes(quandDe(aide))).map(({ fichier }) => fichier), []);
});

test("une aide porte Sens, Écriture par défaut et Preuve dans cet ordre ; un ancrage n'a pas d'écriture", () => {
  assert.deepEqual(ANCRAGES.filter((nom) => !AIDES.some((aide) => aide.nom === nom)), [], "ancrage sans fichier");
  for (const aide of AIDES) {
    const attendues = ANCRAGES.includes(aide.nom) ? (aide.sections.includes("Question") ? ["Sens", "Question", "Preuve"] : ["Sens", "Preuve"]) : ["Sens", "Écriture par défaut", "Preuve"];
    assert.deepEqual(aide.sections, attendues, aide.fichier);
  }
});

/** Le nom d'une définition : le schéma encode `SidedRefs<…>` dans son `$ref` (`%3C`, `%22`). */
const nomDeDefinition = (ref) => decodeURIComponent(ref.split("/").pop());

/**
 * Les couples (définition, propriété) du schéma, `*` notant une clé de
 * dictionnaire, et l'énumération que chaque couple porte. Le parcours suit les
 * `$ref` et marque les définitions visitées : deux sont récursives.
 */
function couplesDuSchema(schema) {
  const definitions = schema.definitions ?? {};
  const couples = new Map();
  const visitees = new Set();
  const enumeration = (valeur) => {
    const cible = valeur?.$ref ? definitions[nomDeDefinition(valeur.$ref)] : valeur;
    if (cible?.enum) return cible.enum;
    return cible?.const !== undefined ? [cible.const] : null;
  };
  const parcourir = (noeud, definition) => {
    if (!noeud || typeof noeud !== "object") return;
    if (noeud.$ref) {
      const cible = nomDeDefinition(noeud.$ref);
      if (visitees.has(cible)) return;
      visitees.add(cible);
      parcourir(definitions[cible], cible);
      return;
    }
    for (const [cle, valeur] of Object.entries(noeud.properties ?? {})) {
      couples.set(`${definition}.${cle}`, enumeration(valeur));
      parcourir(valeur, definition);
    }
    if (noeud.additionalProperties && typeof noeud.additionalProperties === "object") {
      couples.set(`${definition}.*`, null);
      parcourir(noeud.additionalProperties, definition);
    }
    for (const cle of ["items", "anyOf", "oneOf", "allOf"]) {
      for (const branche of [noeud[cle]].flat()) parcourir(branche, definition);
    }
  };
  parcourir(schema, "Contract");
  return { couples, visitees };
}

const SCHEMA = lireLeSchema();
const { couples: COUPLES, visitees: DEFINITIONS_VISITEES } = couplesDuSchema(SCHEMA);

test("le parcours du schéma visite chaque définition et décode les `$ref` de SidedRefs", () => {
  const definitions = Object.keys(SCHEMA.definitions);
  assert.deepEqual(definitions.filter((nom) => !DEFINITIONS_VISITEES.has(nom)), [], "définitions jamais visitées");
  const cotes = [...COUPLES.keys()].filter((couple) => couple.startsWith("SidedRefs<"));
  assert.equal(cotes.length, 12, "les 12 couples des SidedRefs");
  assert.deepEqual(cotes.filter((couple) => !Object.hasOwn(CHAMPS, couple)), []);
});

test("chaque couple du schéma publié relève d'une aide ou dit pourquoi il n'en a pas", () => {
  assert.ok(COUPLES.size > 200, `seuls ${COUPLES.size} couples relevés dans le schéma`);
  const orphelins = [...COUPLES.keys()].filter((couple) => !Object.hasOwn(CHAMPS, couple) && !Object.hasOwn(SANS_AIDE, couple));
  assert.deepEqual(orphelins, [], "ces champs n'ont ni aide ni raison dans SANS_AIDE");
});

test("la table des champs ne nomme aucun couple que le schéma ignore, ni un couple deux fois", () => {
  assert.deepEqual([...Object.keys(CHAMPS), ...Object.keys(SANS_AIDE)].filter((couple) => !COUPLES.has(couple)), []);
  assert.deepEqual(Object.keys(CHAMPS).filter((couple) => Object.hasOwn(SANS_AIDE, couple)), []);
});

test("la table des champs ne relève que des caractéristiques connues", () => {
  const cites = Object.values(CHAMPS).flatMap((valeur) => (
    typeof valeur === "string" ? [valeur] : Array.isArray(valeur) ? valeur : Object.values(valeur.parValeur)
  ));
  assert.deepEqual(cites.filter((id) => !IDENTIFIANTS.includes(id)), []);
});

test("un champ qui relève selon sa valeur couvre chaque valeur de son énumération", () => {
  for (const [couple, valeur] of Object.entries(CHAMPS)) {
    if (typeof valeur !== "object" || Array.isArray(valeur)) continue;
    const valeurs = COUPLES.get(couple);
    assert.ok(valeurs, `${couple} n'est pas une énumération du schéma`);
    assert.deepEqual([...valeurs].sort(), Object.keys(valeur.parValeur).sort(), couple);
  }
});

/**
 * Les couples que les aides traitent en prose, sans citer la propriété entre
 * accents graves : l'aide et la phrase que le test retrouve dans son texte.
 */
const EN_PROSE = {
  "SidedRefs<(\"top\"|\"right\"|\"bottom\"|\"left\")>.top": "côté par côté",
  "SidedRefs<(\"top\"|\"right\"|\"bottom\"|\"left\")>.right": "côté par côté",
  "SidedRefs<(\"top\"|\"right\"|\"bottom\"|\"left\")>.bottom": "côté par côté",
  "SidedRefs<(\"top\"|\"right\"|\"bottom\"|\"left\")>.left": "côté par côté",
  "ComposedDependency.component": "l'instance d'un autre composant",
  "Contract.viewComposes": "nomme des entrées de catalogue",
  "Contract.viewEffects": "nomme des entrées de catalogue",
  "Contract.viewIcons": "nomme des entrées de catalogue",
  "Contract.viewPaintPlacements": "nomme des entrées de catalogue",
  "Contract.viewStructures": "nomme des entrées de catalogue",
  "Contract.viewTypographies": "nomme des entrées de catalogue",
  "ContractDiagnostic.message": "chaque message se lit sans filtrer sur",
  "ContractVariant.values": "énumère les combinaisons qui existent",
  "EnumProp.values": "Les unions des props enum viennent des types générés",
  "GridStructuralSize.height": "porte en pixels la mesure d'une",
  "GridStructuralSize.width": "porte en pixels la mesure d'une",
  "RenderingRole.fallback": "se rend par une ombre décalée par côté",
  "RenderingRole.kind": "La nature et les propriétés viennent de",
  "SampleOverride.visible": "le texte ou la visibilité du",
  "VariantIconPlacement.slotPath": "dit quelles icônes existent dans la vue et où",
  "VariantPropertyBinding.definition": "ouvrir la définition dans",
  "SidedRefs<(\"left\"|\"right\")>.left": "côté par côté",
  "SidedRefs<(\"left\"|\"right\")>.right": "côté par côté",
  "SidedRefs<(\"top\"|\"bottom\")>.top": "côté par côté",
  "SidedRefs<(\"top\"|\"bottom\")>.bottom": "côté par côté",
  "SidedRefs<(\"topLeft\"|\"topRight\"|\"bottomRight\"|\"bottomLeft\")>.topLeft": "côté par côté",
  "SidedRefs<(\"topLeft\"|\"topRight\"|\"bottomRight\"|\"bottomLeft\")>.topRight": "côté par côté",
  "SidedRefs<(\"topLeft\"|\"topRight\"|\"bottomRight\"|\"bottomLeft\")>.bottomRight": "côté par côté",
  "SidedRefs<(\"topLeft\"|\"topRight\"|\"bottomRight\"|\"bottomLeft\")>.bottomLeft": "côté par côté",
};

/** La forme CSS d'une clé camelCase du contrat : `minWidth` donne `min-width`. */
const formeCss = (cle) => cle.replace(/[A-Z]/g, (lettre) => `-${lettre.toLowerCase()}`);

/** Les mots que les aides d'une caractéristique citent entre accents graves, mis à plat. */
function motsCites(caracteristiques) {
  const mots = new Set();
  for (const aide of AIDES.filter((candidate) => caracteristiques.includes(quandDe(candidate)))) {
    for (const [, extrait] of aide.corps.matchAll(/`([^`]+)`/g)) {
      mots.add(extrait);
      for (const mot of extrait.split(/[^A-Za-z0-9_:-]+/)) if (mot) mots.add(mot.replace(/^:+|:+$/g, ""));
    }
  }
  return mots;
}

const caracteristiquesDuCouple = (valeur) => (
  typeof valeur === "string" ? [valeur] : Array.isArray(valeur) ? valeur : [...new Set(Object.values(valeur.parValeur))]
);

test("chaque couple de CHAMPS est nommé par une aide de sa caractéristique, ou traité en prose", () => {
  const manquants = [];
  for (const [couple, valeur] of Object.entries(CHAMPS)) {
    const propriete = couple.slice(couple.lastIndexOf(".") + 1);
    if (propriete === "*") continue;
    const caracteristiques = caracteristiquesDuCouple(valeur);
    const cites = motsCites(caracteristiques);
    const enumeration = COUPLES.get(couple);
    const nomme = cites.has(propriete) || cites.has(formeCss(propriete))
      || (enumeration && enumeration.every((valeurDuSchema) => cites.has(String(valeurDuSchema))));
    if (nomme) continue;
    const prose = EN_PROSE[couple];
    const textes = AIDES.filter((aide) => caracteristiques.includes(quandDe(aide))).map((aide) => aide.corps.replace(/\s+/g, " "));
    if (!prose || !textes.some((texte) => texte.includes(prose))) manquants.push(couple);
  }
  assert.deepEqual(manquants, [], "ces couples ne sont ni cités entre accents graves ni retrouvés en prose par EN_PROSE");
});

test("EN_PROSE ne garde que des couples de CHAMPS que l'aide ne cite pas par leur nom", () => {
  assert.deepEqual(Object.keys(EN_PROSE).filter((couple) => !Object.hasOwn(CHAMPS, couple)), []);
});

test("les 15 couples sans effet de rendu sont dans SANS_AIDE, avec leur raison", () => {
  const sansEffet = [
    "ContractMeta.contractVersion", "ContractDiagnostic.code", "ContractDiagnostic.variantName",
    "ContractDiagnostic.property", "ContractDiagnostic.contractPath", "EnumProp.descriptions",
    "BooleanProp.description", "SlotProp.description", "StateDescriptor.description", "Contract.intent",
    "Intent.usage", "Intent.do", "Intent.dont", "Intent.pairs", "PropertyBindingDefinition.nodeSuffix",
  ];
  for (const couple of sansEffet) {
    assert.ok(Object.hasOwn(SANS_AIDE, couple), `${couple} manque dans SANS_AIDE`);
    assert.ok(SANS_AIDE[couple].length > 10, `${couple} sans raison`);
    assert.equal(Object.hasOwn(CHAMPS, couple), false, `${couple} reste dans CHAMPS`);
  }
});

test("une aide sans écriture par défaut porte une section Question non vide", () => {
  const sansEcriture = AIDES.filter((aide) => !aide.sections.includes("Écriture par défaut"));
  assert.deepEqual(sansEcriture.map(({ nom }) => nom).sort(), [...ANCRAGES].sort());
  for (const aide of sansEcriture) {
    const question = /^## Question\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(aide.corps);
    assert.ok(question && question[1].trim().length > 0, `${aide.fichier} : section Question vide ou absente`);
  }
});

test("typographie.md cite chaque clé de TypographyTokens", () => {
  const corps = AIDES.find((aide) => aide.nom === "typographie").corps;
  const cles = [...COUPLES.keys()].filter((couple) => couple.startsWith("TypographyTokens.")).map((couple) => couple.split(".")[1]);
  assert.ok(cles.length >= 7, "TypographyTokens a au moins 7 clés");
  assert.deepEqual(cles.filter((cle) => !corps.includes(`\`${cle}\``) && !corps.includes(formeCss(cle))), []);
});

test("contour-ring.md cite les cibles du ring", () => {
  const corps = AIDES.find((aide) => aide.nom === "contour-ring").corps;
  assert.match(corps, /variants\[\]\.strokes/);
  assert.match(corps, /paintPlacements\.strokes/);
});

test("grille.md cite alignSelf et rowGap : une grille seule ne reçoit pas l'aide de disposition", () => {
  const corps = AIDES.find((aide) => aide.nom === "grille").corps;
  assert.ok(corps.includes("`alignSelf`"), "alignSelf absent de grille.md");
  assert.ok(corps.includes("`rowGap`"), "rowGap absent de grille.md");
});
