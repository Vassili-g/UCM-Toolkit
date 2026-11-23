/**
 * Un exemple d'appel par nom de la prise `@ucm-kit/core/modules`, sur les
 * contrats et les tokens de `fixtures/`. `apiPublique.test.mjs` compare chaque
 * résultat à `prise-attendus.json`. Un résultat attendu qui change est une
 * rupture de la prise : le journal `CHANGELOG.md` doit alors le dire.
 *
 * Un exemple ne rend que du JSON, et aucun chemin de la machine.
 *
 * Les exemples de `preparerControle` passent par un repository temporaire que
 * l'exemple crée et retire : le contrat de `contrat140()`, un `tokens.json`
 * fabriqué et un lecteur du code fabriqué, qui rend le relevé qu'on lui donne.
 * Ceux qui sondent une liste de `controle-du-code-listes.mjs` (valeurs neutres,
 * propriétés par famille, unités, fonctions, noms de couleur, mots de forme,
 * attributs) rendent un verdict par entrée : tout réglage d'une liste change
 * donc un résultat attendu, et le journal doit alors le dire.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as prise from "@ucm-kit/core/modules";

import {
  ATTRIBUTS_SANS_VALEUR_VISUELLE,
  FONCTIONS_DE_COULEUR,
  FONCTIONS_MATHEMATIQUES,
  MOTS_CLES_DE_FORME,
  NOMS_DE_COULEUR,
  PROPRIETES_PAR_FAMILLE,
  UNITES_DE_LONGUEUR,
  VALEURS_NEUTRES,
} from "../src/lecteurs/controle-du-code-listes.mjs";
import { contrat140 } from "./contrats-fabriques.mjs";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const lire = (...chemin) => JSON.parse(readFileSync(join(fixtures, ...chemin), "utf8"));
const enSlash = (chemin) => chemin.split("\\").join("/");

// ─── Un repository temporaire et un lecteur du code fabriqué ──────────────

const COMPLETE = { complete: true, erreurs: 0 };
const FICHIER = "src/components/Button/Button.tsx";
const FICHIER_VARIANTS = "src/components/Button/Button.variants.ts";
const TOKENS = { components: { button: { sizes: { medium: { gap: { $value: "8px", $type: "dimension" } } } } } };
const DEROGATIONS = {
  derogations: [{
    composant: "Button",
    ecart: { genre: "valeur-en-dur", fichier: FICHIER, valeur: "12px" },
    export: contrat140().meta.exportedAt,
    motif: "Valeur du design en attente.",
    par: "Camille",
  }],
};

/** Crée le repository, appelle `rappel(racine)`, puis le retire. `avec` ajoute des fichiers. */
function avecRepository(rappel, avec = {}) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-prise-"));
  const fichiers = {
    "ucm.config.json": { components: "src/components", tokens: "tokens.json" },
    "src/components/Button/Button.contract.json": contrat140(),
    "tokens.json": TOKENS,
    [FICHIER]: "",
    [FICHIER_VARIANTS]: "",
    ...avec,
  };
  try {
    for (const [relatif, contenu] of Object.entries(fichiers)) {
      mkdirSync(dirname(join(racine, relatif)), { recursive: true });
      writeFileSync(join(racine, relatif), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
    }
    return rappel(racine);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

/** Un lecteur qui rend `releve(texte, nom)` et range `Button.variants.ts` parmi les fichiers du composant. */
const lecteurFabrique = (releve) => ({
  extensions: [".ts", ".tsx"],
  releverUsages: (texte, nom) => releve(texte, basename(nom)),
  fichiersDuComposant: (implementation) => ({ fichiers: [implementation, join(dirname(implementation), "Button.variants.ts")], lecture: COMPLETE }),
});

const RELEVE_VIDE = { chaines: [], declarations: [], variables: [], directives: [], lecture: COMPLETE };

/** Les décalages d'un extrait dans le texte. */
const reperer = (texte, extrait) => ({ debut: texte.indexOf(extrait), fin: texte.indexOf(extrait) + extrait.length });

/** Juge `fichier` d'un repository temporaire ; le contrôle rendu n'a plus la racine de la machine. */
function controler(fichier, texte, releve, avec) {
  return avecRepository((racine) => {
    const { racine: _racine, ...controle } = prise.preparerControle(join(racine, fichier), { texte, lecteur: lecteurFabrique(releve) });
    return controle;
  }, avec);
}

/** Un verdict par sonde : `passe`, ou les constats que son texte reçoit. */
function sonder(sondes) {
  const releve = { ...RELEVE_VIDE, chaines: [], declarations: [] };
  sondes.forEach((sonde, rang) => {
    const repere = { debut: rang, fin: rang + 1 };
    if (sonde.chaine !== undefined) releve.chaines.push({ texte: sonde.chaine, ...repere, attribut: sonde.attribut ?? null });
    else releve.declarations.push({ propriete: sonde.propriete, valeur: sonde.valeur, ...repere, contexte: "style" });
  });
  const { constats } = controler(FICHIER, "", () => releve);
  const resume = (constat) => {
    const { parties, familles } = constat.faits;
    return [constat.code, parties?.join(" "), familles ? `[${familles.join(" ")}]` : undefined].filter(Boolean).join(" ");
  };
  return Object.fromEntries(sondes.map((sonde, rang) => {
    const rendus = constats.filter((constat) => constat.debut === rang).map(resume);
    return [sonde.cle, rendus.length === 0 ? "passe" : rendus.join(" ; ")];
  }));
}

const enDeclaration = (propriete, valeur, cle = `${propriete} : ${valeur}`) => ({ cle: `déclaration ${cle}`, propriete, valeur });
const enChaine = (chaine, cle = chaine, attribut) => ({ cle: `chaîne ${cle}`, chaine, attribut });

/** Une valeur de chaque classe que le juge distingue. */
const CLASSES_DE_VALEUR = [
  ["couleur", "#123456"],
  ["longueur", "13px"],
  ["nombre", "5"],
  ["pourcentage", "50%"],
  ["fonction", "inconnue(13px)"],
  ["identifiant", "inset"],
  ["nom de couleur", "red"],
];

const TEXTE_ECHANGE_1 = 'export const A = () => <div style={{ padding: "var(--components-button-sizes-medium-gapp)" }} />;';
const TEXTE_ECHANGE_2 = 'const SIZES = { medium: { padding: "12px" } };';
const TEXTE_ECHANGE_3 = "export const A = () => <div style={{ gap: entry.gap }} />;";

/** Nom de la fonction promise, puis l'appel et ce qu'il rend. */
export const EXEMPLES = {
  "lireConfiguration : un repository sans ucm.config.json rend la configuration par défaut": {
    nom: "lireConfiguration",
    appeler: () => prise.lireConfiguration(join(fixtures, "tokens", "origine")),
  },
  "trouverContrats : les contrats de la version 13.0": {
    nom: "trouverContrats",
    appeler: () => prise.trouverContrats(join(fixtures, "contrats", "13.0")).map((chemin) => enSlash(relative(fixtures, chemin))).sort(),
  },
  "verdictDeVersion : 13.0 se lit": { nom: "verdictDeVersion", appeler: () => prise.verdictDeVersion("13.0") },
  "verdictDeVersion : 12.0 est ancien": { nom: "verdictDeVersion", appeler: () => prise.verdictDeVersion("12.0") },
  "verdictDeVersion : 15.0 est récent": { nom: "verdictDeVersion", appeler: () => prise.verdictDeVersion("15.0") },
  "vueExacteDuVariant : la vue du premier variant de TileLink": {
    nom: "vueExacteDuVariant",
    appeler: () => {
      const contrat = lire("contrats", "13.0", "TileLink.contract.json");
      return prise.vueExacteDuVariant(contrat, contrat.variants[0]);
    },
  },
  "indexerTokensDtcg : les feuilles du fichier de tokens d'origine": {
    nom: "indexerTokensDtcg",
    appeler: () => {
      const index = prise.indexerTokensDtcg(lire("tokens", "origine", "tokens.json"));
      return {
        feuilles: index.size,
        premieres: [...index.keys()].slice(0, 3),
        rouge: index.get("primitives.color.red"),
        demi: index.get("primitives.dimensions.0,5"),
      };
    },
  },
  "isTokenReference : une référence complète": { nom: "isTokenReference", appeler: () => prise.isTokenReference("{components.button.gap}") },
  "isTokenReference : un nom sans point n'en est pas une": { nom: "isTokenReference", appeler: () => prise.isTokenReference("{à définir}") },
  "isTokenReference : sans accolades": { nom: "isTokenReference", appeler: () => prise.isTokenReference("components.button.gap") },
  "tokenCssVariable : un chemin de composant": { nom: "tokenCssVariable", appeler: () => prise.tokenCssVariable("components.button.sizes.medium.gap") },
  "tokenCssVariable : une virgule décimale": { nom: "tokenCssVariable", appeler: () => prise.tokenCssVariable("layouts.sizing.0,5") },
  "preparerControle : un nom de variable que tokens.json ne porte pas (échange 1 du cadrage)": {
    nom: "preparerControle",
    appeler: () => controler(FICHIER, TEXTE_ECHANGE_1, () => ({
      ...RELEVE_VIDE,
      declarations: [{ propriete: "padding", valeur: "var(--components-button-sizes-medium-gapp)", ...reperer(TEXTE_ECHANGE_1, '"var(--components-button-sizes-medium-gapp)"'), contexte: "style" }],
    })),
  },
  "preparerControle : une valeur en dur dans un fichier que le composant importe (échange 2)": {
    nom: "preparerControle",
    appeler: () => controler(FICHIER_VARIANTS, TEXTE_ECHANGE_2, () => ({
      ...RELEVE_VIDE,
      declarations: [{ propriete: "padding", valeur: "12px", ...reperer(TEXTE_ECHANGE_2, '"12px"'), contexte: "objet" }],
    })),
  },
  "preparerControle : une valeur calculée par le code n'est pas jugée (échange 3)": {
    nom: "preparerControle",
    appeler: () => controler(FICHIER, TEXTE_ECHANGE_3, () => ({
      ...RELEVE_VIDE,
      declarations: [{ propriete: "gap", valeur: null, ...reperer(TEXTE_ECHANGE_3, "gap: entry.gap"), contexte: "style" }],
    })),
  },
  "preparerControle : une dérogation de l'export courant couvre le constat": {
    nom: "preparerControle",
    appeler: () => controler(FICHIER, "", () => ({
      ...RELEVE_VIDE,
      declarations: [{ propriete: "padding", valeur: "12px", debut: 0, fin: 1, contexte: "style" }],
    }), { ".ucm/derogations.json": DEROGATIONS }),
  },
  "preparerControle : un commentaire qui désactive une règle UCM est un constat": {
    nom: "preparerControle",
    appeler: () => controler(FICHIER, "", () => ({
      ...RELEVE_VIDE,
      directives: [{ texte: "// eslint-disable-next-line ucm/valeur-en-dur", debut: 0, fin: 10 }],
    })),
  },
  "preparerControle : sans ucm.config.json, une limite et aucun constat": {
    nom: "preparerControle",
    appeler: () => {
      const dossier = mkdtempSync(join(tmpdir(), "ucm-prise-"));
      try {
        const { racine, ...controle } = prise.preparerControle(join(dossier, "Button.tsx"), { texte: "", lecteur: lecteurFabrique(() => RELEVE_VIDE) });
        return { ...controle, racineTrouvee: racine !== null };
      } finally {
        rmSync(dossier, { recursive: true, force: true });
      }
    },
  },
  "preparerControle : sans lecteur du code, le fichier n'est pas lu": {
    nom: "preparerControle",
    appeler: () => avecRepository((racine) => {
      const { racine: _racine, ...controle } = prise.preparerControle(join(racine, FICHIER), { texte: "" });
      return controle;
    }),
  },
  "preparerControle : chaque valeur de VALEURS_NEUTRES, en déclaration et dans une chaîne": {
    nom: "preparerControle",
    appeler: () => sonder(VALEURS_NEUTRES.flatMap(({ valeur }) => [enDeclaration("padding", valeur), enChaine(`12px ${valeur}`)])),
  },
  "preparerControle : chaque propriété de PROPRIETES_PAR_FAMILLE reçoit une couleur": {
    nom: "preparerControle",
    appeler: () => sonder(PROPRIETES_PAR_FAMILLE.map(({ propriete }) => enDeclaration(propriete, "#123456"))),
  },
  "preparerControle : chaque unité de UNITES_DE_LONGUEUR": {
    nom: "preparerControle",
    appeler: () => sonder(UNITES_DE_LONGUEUR.map((unite) => enDeclaration("width", `13${unite}`))),
  },
  "preparerControle : chaque fonction de FONCTIONS_DE_COULEUR": {
    nom: "preparerControle",
    appeler: () => sonder(FONCTIONS_DE_COULEUR.map((nom) => enDeclaration("color", `${nom}(red, blue)`))),
  },
  "preparerControle : chaque fonction de FONCTIONS_MATHEMATIQUES": {
    nom: "preparerControle",
    appeler: () => sonder(FONCTIONS_MATHEMATIQUES.map((nom) => enDeclaration("width", `${nom}(10px, 5)`))),
  },
  "preparerControle : une valeur de chaque classe, en déclaration et dans une chaîne": {
    nom: "preparerControle",
    appeler: () => sonder(CLASSES_DE_VALEUR.flatMap(([classe, valeur]) => [enDeclaration("width", valeur, classe), enChaine(valeur, classe)])),
  },
  "preparerControle : chaque nom de NOMS_DE_COULEUR dans une propriété de couleur": {
    nom: "preparerControle",
    appeler: () => sonder(NOMS_DE_COULEUR.map((nom) => enDeclaration("color", nom))),
  },
  "preparerControle : chaque mot de MOTS_CLES_DE_FORME près d'une longueur dans une chaîne": {
    nom: "preparerControle",
    appeler: () => sonder(MOTS_CLES_DE_FORME.map((mot) => enChaine(`12px ${mot}`))),
  },
  "preparerControle : chaque attribut de ATTRIBUTS_SANS_VALEUR_VISUELLE ne juge pas sa chaîne": {
    nom: "preparerControle",
    appeler: () => sonder(ATTRIBUTS_SANS_VALEUR_VISUELLE.map((attribut) => {
      const ecrit = attribut.endsWith("-") ? `${attribut}label` : attribut;
      return enChaine("#123456", ecrit, ecrit);
    })),
  },
};

const DU_MODULE = (...noms) => `import type { ${noms.join(", ")} } from "@ucm-kit/core/modules";`;
const USAGES_VIDES = "{ chaines: [], declarations: [], variables: [], directives: [], lecture: { complete: true, erreurs: 0 } }";

/**
 * Un nom de type n'existe pas à l'exécution : son exemple est un extrait
 * TypeScript que `apiPublique.test.mjs` compile contre la prise.
 */
export const EXEMPLES_DE_TYPES = {
  Contract: 'import type { Contract } from "@ucm-kit/core/modules";\nexport const nom: string = ({} as Contract).name;\nexport const version: string = ({} as Contract).meta.contractVersion;',
  ChaineDuCode: `${DU_MODULE("ChaineDuCode")}\nexport const chaine: ChaineDuCode = { texte: "#fff", debut: 0, fin: 5, attribut: null };`,
  DeclarationDuCode: `${DU_MODULE("DeclarationDuCode")}\nexport const declaration: DeclarationDuCode = { propriete: "padding", valeur: "12px", debut: 0, fin: 4, contexte: "style", nombre: true, valeurEnStyle: "12px" };`,
  DirectiveDuCode: `${DU_MODULE("DirectiveDuCode")}\nexport const directive: DirectiveDuCode = { texte: "// eslint-disable-next-line", debut: 0, fin: 10 };`,
  LectureDuCode: `${DU_MODULE("LectureDuCode")}\nexport const lecture: LectureDuCode = { complete: false, erreurs: 1, extension: ".jsx" };`,
  UsagesDuCode: `${DU_MODULE("UsagesDuCode")}\nexport const usages: UsagesDuCode = ${USAGES_VIDES};`,
  FichiersDuComposant: `${DU_MODULE("FichiersDuComposant")}\nexport const fichiers: FichiersDuComposant = { fichiers: ["Button.tsx"], lecture: { complete: true, erreurs: 0 } };`,
  LecteurDuCode: [
    DU_MODULE("LecteurDuCode", "UsagesDuCode", "ControleDuFichier"),
    "import { preparerControle } from \"@ucm-kit/core/modules\";",
    `const vide: UsagesDuCode = ${USAGES_VIDES};`,
    "export const lecteur: LecteurDuCode = {",
    "  extensions: [\".ts\"],",
    "  releverUsages: () => vide,",
    "  fichiersDuComposant: (implementation) => ({ fichiers: [implementation], lecture: vide.lecture }),",
    "};",
    "export const controle: ControleDuFichier = preparerControle(\"Button.tsx\", { texte: \"\", lecteur });",
  ].join("\n"),
  RegleDuControle: `${DU_MODULE("RegleDuControle")}\nexport const regles: RegleDuControle[] = ["token-inconnu", "valeur-en-dur"];\n// @ts-expect-error une règle que le contrôle n'a pas\nexport const inconnue: RegleDuControle = "autre-regle";`,
  CodeDeConstat: `${DU_MODULE("CodeDeConstat")}\nexport const code: CodeDeConstat = "repli-en-dur";\n// @ts-expect-error un code que le contrôle n'a pas\nexport const inconnu: CodeDeConstat = "autre-code";`,
  CodeDeLimite: `${DU_MODULE("CodeDeLimite")}\nexport const code: CodeDeLimite = "sans-adaptateur";\n// @ts-expect-error un code que le contrôle n'a pas\nexport const inconnu: CodeDeLimite = "autre-code";`,
  Constat: [
    DU_MODULE("Constat"),
    "export function sujet(constat: Constat): string | undefined {",
    "  switch (constat.code) {",
    "    case \"token-inconnu\":",
    "      return \"variable\" in constat.faits ? constat.faits.variable : constat.faits.reference;",
    "    case \"repli-en-dur\":",
    "      return constat.faits.repli;",
    "    case \"nom-css-ambigu\":",
    "      return constat.faits.chemins[0];",
    "    case \"valeur-en-dur\":",
    "      return constat.faits.parties[0];",
    "    case \"non-analyse\":",
    "      return constat.faits.forme;",
    "    case \"desactivation-interdite\":",
    "      return constat.faits.directive;",
    "  }",
    "}",
    "export function sansRepli(constat: Constat): string | undefined {",
    "  if (constat.code !== \"token-inconnu\") return undefined;",
    "  // @ts-expect-error un token inconnu n'a pas de repli",
    "  return constat.faits.repli;",
    "}",
    "export const deroge = (constat: Constat): string | undefined => constat.deroge?.motif ?? constat.commande;",
  ].join("\n"),
  Limite: [
    DU_MODULE("Limite"),
    "export function sujet(limite: Limite): string | number | undefined {",
    "  switch (limite.code) {",
    "    case \"contrat-ancien\":",
    "    case \"contrat-recent\":",
    "      return limite.faits.version;",
    "    case \"lecture-incomplete\":",
    "      return limite.faits.erreurs;",
    "    case \"sans-adaptateur\":",
    "      return limite.faits.extension;",
    "    default:",
    "      return limite.message;",
    "  }",
    "}",
  ].join("\n"),
  ControleDuFichier: [
    DU_MODULE("ControleDuFichier"),
    "export const controle: ControleDuFichier = { racine: null, fichier: null, composants: [], limites: [], constats: [] };",
    "export const rien: boolean = controle.composants.length === 0;",
  ].join("\n"),
};
