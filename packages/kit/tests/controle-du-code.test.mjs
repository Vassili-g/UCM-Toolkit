/**
 * Le juge du code (lot 1.1 de P6) : un relevé fabriqué à la main, un contrat des
 * fixtures, des tokens fabriqués, et les constats que le cadrage §7 attend.
 *
 * Le kit n'importe jamais l'adaptateur : chaque cas reçoit un lecteur fabriqué
 * qui rend les relevés écrits dans le test. Les contrats viennent de
 * `fixtures/contrats/` et de `contrat140()`.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { EXTENSION_VERSION_TOKENS, etatDuFormatDeTokens } from "@ucm-kit/core/format";

import { CODES_DU_CONTROLE_DU_CODE } from "../src/lecteurs/controle-du-code-listes.mjs";
import { creerContexteDuJuge, jugerChaine, jugerDeclaration, preparerControle, preparerControleDepuis } from "../src/lecteurs/controle-du-code.mjs";
import { indexerTokensDtcg, nomsCssDesTokens } from "../src/lecteurs/tokens-dtcg.mjs";
import { contrat140 } from "./contrats-fabriques.mjs";

const kit = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = (version, nom) => JSON.parse(readFileSync(join(kit, "fixtures", "contrats", version, `${nom}.contract.json`), "utf8"));
const copie = (valeur) => JSON.parse(JSON.stringify(valeur));

const BUTTON = fixture("13.0", "Button");
const ALERT = fixture("13.0", "Alert");
const STRESS = fixture("13.0", "StressTest");

const RACINE = join(tmpdir(), "ucm-juge-sans-disque");
const CONFIGURATION = { components: "src/components", tokens: "tokens.json", implementation: "{dir}/{id}.tsx" };
const COMPLETE = { complete: true, erreurs: 0 };
const VIDE = { chaines: [], declarations: [], variables: [], directives: [], lecture: COMPLETE };
const FICHIER_BUTTON = "src/components/Button/Button.tsx";

const feuille = (valeur = "8px") => ({ $value: valeur, $type: "dimension" });
const ARBRE = {
  components: { button: { sizes: { medium: { gap: feuille() } } } },
  w: feuille("1px"),
  c: { $value: "#000000", $type: "color" },
};
const lesTokens = (arbre = ARBRE) => {
  const index = indexerTokensDtcg(arbre);
  return { etat: etatDuFormatDeTokens(arbre), index, noms: nomsCssDesTokens(index) };
};

const chaine = (texte, extra = {}) => ({ texte, debut: 10, fin: 10 + texte.length, attribut: null, ...extra });
const declaration = (propriete, valeur, extra = {}) => ({ propriete, valeur, debut: 20, fin: 40, contexte: "style", ...extra });

/** Un lecteur fabriqué : les relevés par nom de fichier, la liste des fichiers par nom d'implémentation. */
function lecteurFabrique({ releves = {}, fichiers = {}, appels = [] } = {}) {
  return {
    extensions: [".ts", ".tsx"],
    releverUsages(texte, nom) {
      appels.push({ texte, nom: basename(nom) });
      return releves[basename(nom)] ?? VIDE;
    },
    fichiersDuComposant(implementation) {
      const liste = fichiers[basename(implementation)];
      return { fichiers: liste ? liste.map((relatif) => join(RACINE, relatif)) : [implementation], lecture: COMPLETE };
    },
  };
}

/** Juge un fichier avec des données en mémoire. */
function juger({
  composant = "Button",
  contrat = BUTTON,
  tokens = lesTokens(),
  releve = {},
  fichier = `src/components/${composant}/${composant}.tsx`,
  derogations = { derogations: [], erreurs: [] },
  documents,
  configuration = CONFIGURATION,
  releves = {},
  fichiers,
  texte,
  cache,
  appels,
} = {}) {
  const lecteur = lecteurFabrique({ releves: { [`${composant}.tsx`]: { ...VIDE, ...releve }, [basename(fichier)]: { ...VIDE, ...releve }, ...releves }, fichiers, appels });
  return preparerControleDepuis(fichier, {
    racine: RACINE,
    configuration,
    documents: documents ?? [{ chemin: join(RACINE, "src", "components", composant, `${composant}.contract.json`), contrat }],
    tokens,
    derogations,
    lecteur,
    texte,
    lire: () => "",
    cache,
  });
}

const codes = (resultat) => resultat.constats.map((constat) => constat.code);
const limites = (resultat) => resultat.limites.map((limite) => limite.code);

// ─── Les citations de tokens ──────────────────────────────────────────────

test("C1 : une référence présente dans tokens.json ne donne aucun constat", () => {
  const r = juger({ releve: { chaines: [chaine("{components.button.sizes.medium.gap}")] } });
  assert.deepEqual(r.constats, []);
  assert.deepEqual(r.composants, ["Button"]);
  assert.equal(r.fichier, FICHIER_BUTTON);
});

test("C2 : une référence absente donne token-inconnu, avec son fait et ses coordonnées", () => {
  const texte = "{components.button.sizes.medium.absent}";
  const [constat, ...autres] = juger({ releve: { chaines: [chaine(texte)] } }).constats;
  assert.equal(autres.length, 0);
  assert.equal(constat.code, "token-inconnu");
  assert.equal(constat.regle, "token-inconnu");
  assert.equal(constat.niveau, "ecart");
  assert.equal(constat.composant, "Button");
  assert.deepEqual(constat.faits, { reference: texte });
  assert.deepEqual(constat.coordonnees, { fichier: FICHIER_BUTTON, reference: texte });
  assert.deepEqual([constat.debut, constat.fin], [10, 10 + texte.length]);
});

test("C4 : var() d'un token existant ne donne aucun constat", () => {
  assert.deepEqual(juger({ releve: { chaines: [chaine("var(--components-button-sizes-medium-gap)")] } }).constats, []);
});

test("C5 : var() d'un nom qui n'est ni un token ni une variable du composant donne token-inconnu", () => {
  const [constat] = juger({ releve: { chaines: [chaine("var(--absente)")] } }).constats;
  assert.equal(constat.code, "token-inconnu");
  assert.deepEqual(constat.faits, { variable: "--absente" });
  assert.deepEqual(constat.coordonnees, { fichier: FICHIER_BUTTON, reference: "--absente" });
});

test("C6 : un nom CSS que deux tokens portent donne nom-css-ambigu, niveau limite, chemins triés", () => {
  const ambigus = lesTokens({ layout: { size: { "50%": feuille(), 50: feuille() } } });
  const [constat, ...autres] = juger({ tokens: ambigus, releve: { chaines: [chaine("var(--layout-size-50)")] } }).constats;
  assert.equal(autres.length, 0);
  assert.equal(constat.code, "nom-css-ambigu");
  assert.equal(constat.niveau, "limite");
  assert.equal(constat.regle, "token-inconnu");
  assert.deepEqual(constat.faits, { variable: "--layout-size-50", chemins: ["layout.size.50", "layout.size.50%"] });
  assert.equal(constat.coordonnees, undefined);
  assert.equal(constat.commande, undefined);
});

test("C7 : une variable qu'un autre fichier du composant déclare ne donne aucun constat", () => {
  const fichiers = { "Button.tsx": [FICHIER_BUTTON, "src/components/Button/Button.variants.ts"] };
  const releves = { "Button.tsx": { ...VIDE, variables: ["--x"] } };
  const chaines = [chaine("var(--x)")];
  const r = juger({ fichier: "src/components/Button/Button.variants.ts", fichiers, releves, releve: { chaines } });
  assert.deepEqual(r.composants, ["Button"]);
  assert.deepEqual(r.constats, []);
  const sans = juger({ fichier: "src/components/Button/Button.variants.ts", fichiers, releve: { chaines } });
  assert.deepEqual(codes(sans), ["token-inconnu"]);
});

test("C8 : un repli écrit en dur donne repli-en-dur, même si le token existe", () => {
  const [constat, ...autres] = juger({ releve: { chaines: [chaine("var(--components-button-sizes-medium-gap, 8px)")] } }).constats;
  assert.equal(autres.length, 0);
  assert.equal(constat.code, "repli-en-dur");
  assert.equal(constat.regle, "token-inconnu");
  assert.deepEqual(constat.faits, { variable: "--components-button-sizes-medium-gap", repli: "8px" });
  assert.deepEqual(juger({ releve: { chaines: [chaine("var(--components-button-sizes-medium-gap, var(--w))")] } }).constats, []);
});

test("C9 : le morceau fixe d'un gabarit qui ouvre var(-- donne non-analyse, forme gabarit", () => {
  for (const texte of ["var(--", ")", "var(--components-button-"]) {
    const constats = juger({ releve: { chaines: [chaine(texte)] } }).constats;
    if (texte === ")") assert.deepEqual(constats, []);
    else {
      assert.deepEqual(codes({ constats }), ["non-analyse"]);
      assert.deepEqual(constats[0].faits, { forme: "gabarit" });
      assert.equal(constats[0].regle, "token-inconnu");
      assert.equal(constats[0].niveau, "non-analyse");
    }
  }
});

// ─── Les valeurs en dur, dans une chaîne ──────────────────────────────────

test("C10, C11 : une couleur hexadécimale ou une fonction de couleur dans une chaîne est une valeur en dur", () => {
  for (const texte of ["#ff0000", "rgb(255 0 0)", "oklch(0.5 0.1 20)"]) {
    const [constat] = juger({ releve: { chaines: [chaine(texte)] } }).constats;
    assert.equal(constat.code, "valeur-en-dur", texte);
    assert.deepEqual(constat.faits, { valeur: texte, parties: [texte] }, texte);
    assert.deepEqual(constat.coordonnees, { fichier: FICHIER_BUTTON, valeur: texte });
  }
});

test("C12 : une longueur que le contrat publie passe ; sur contrat140() aussi, une fois publiée", () => {
  const chaines = [chaine("15px")];
  assert.deepEqual(juger({ composant: "StressTest", contrat: STRESS, releve: { chaines } }).constats, []);
  const courant = contrat140();
  courant.viewStructures.st1.children[0].structuralSize = { height: "15px" };
  assert.deepEqual(juger({ contrat: courant, releve: { chaines } }).constats, []);
});

test("C13 : une longueur qu'aucun champ ne publie est une valeur en dur", () => {
  assert.deepEqual(codes(juger({ composant: "StressTest", contrat: STRESS, releve: { chaines: [chaine("12px")] } })), ["valeur-en-dur"]);
});

test("C14 : une valeur écrite comme le contrat la publie passe, fit-content(100%) compris", () => {
  const chaines = [chaine("15px fit-content(100%)")];
  assert.deepEqual(juger({ composant: "StressTest", contrat: STRESS, releve: { chaines } }).constats, []);
  const courant = contrat140();
  courant.viewStructures.st1.children[0].structuralSize = { height: "15px" };
  courant.viewStructures.st1.children[0].rowSizes = ["fit-content(100%)"];
  assert.deepEqual(juger({ contrat: courant, releve: { chaines } }).constats, []);
});

test("C15 : une phrase, un nom de couleur, un pourcentage et une clé de table ne sont pas jugés", () => {
  const chaines = ["Bouton de 12px", "red", "50%", "primary|contained|default"].map((texte) => chaine(texte));
  assert.deepEqual(juger({ releve: { chaines } }).constats, []);
});

test("C25, C26, C27 : une couleur est toujours refusée, une longueur quand le reste est de la forme", () => {
  const parties = (texte) => juger({ releve: { chaines: [chaine(texte)] } }).constats.flatMap((constat) => constat.faits.parties);
  assert.deepEqual(parties("1px solid #cccccc").sort(), ["#cccccc", "1px"]);
  assert.deepEqual(parties("inset 0 0 0 1px #000").sort(), ["#000", "1px"]);
  assert.deepEqual(parties("12px solid"), ["12px"]);
  assert.deepEqual(parties("trait de 12px"), []);
});

test("C32 : une longueur dans une unité de CSS Values 4 est jugée, quelle que soit son écriture", () => {
  for (const texte of ["12pt", "10vw", "1.5ch", "+4px", "1e1px"]) {
    assert.deepEqual(codes(juger({ releve: { chaines: [chaine(texte)] } })), ["valeur-en-dur"], texte);
  }
});

test("C34 : la chaîne d'un attribut sans valeur visuelle n'est pas jugée", () => {
  const chaines = [chaine("#add", { attribut: "href" }), chaine("#feed", { attribut: "id" }), chaine("#fff", { attribut: "aria-label" }), chaine("#fff", { attribut: "data-color" })];
  assert.deepEqual(juger({ releve: { chaines } }).constats, []);
  assert.deepEqual(codes(juger({ releve: { chaines: [chaine("#fff", { attribut: "fill" })] } })), ["valeur-en-dur"]);
});

// ─── Les déclarations ─────────────────────────────────────────────────────

test("C16 : les valeurs neutres passent dans une déclaration", () => {
  const declarations = [["padding", "0"], ["padding", "0px"], ["border", "none"], ["width", "fit-content"], ["fill", "currentColor"], ["background", "transparent"]].map(([p, v]) => declaration(p, v));
  assert.deepEqual(juger({ releve: { declarations } }).constats, []);
});

test("C17 : une longueur publiée pour une dimension reste une valeur en dur dans une propriété d'une autre famille", () => {
  const courant = contrat140();
  courant.viewStructures.st1.children[0].structuralSize = { height: "15px" };
  for (const [composant, contrat] of [["StressTest", STRESS], ["Button", courant]]) {
    assert.deepEqual(codes(juger({ composant, contrat, releve: { declarations: [declaration("font-size", "15px")] } })), ["valeur-en-dur"], composant);
    assert.deepEqual(juger({ composant, contrat, releve: { declarations: [declaration("height", "15px")] } }).constats, [], composant);
  }
  const [constat] = juger({ releve: { declarations: [declaration("font-size", "15px")] } }).constats;
  assert.deepEqual(constat.faits, { propriete: "font-size", valeur: "15px", parties: ["15px"], familles: ["typographie"] });
});

test("C18 : un nom de couleur dans une propriété de couleur est une valeur en dur", () => {
  const [constat] = juger({ releve: { declarations: [declaration("color", "red")] } }).constats;
  assert.equal(constat.code, "valeur-en-dur");
  assert.deepEqual(constat.faits.parties, ["red"]);
});

test("C19 : une couleur égale à celle d'un token reste une valeur en dur, sans token proposé", () => {
  const [constat] = juger({ releve: { declarations: [declaration("background-color", "#000000")] } }).constats;
  assert.equal(constat.code, "valeur-en-dur");
  assert.equal(constat.faits.token, undefined);
  assert.doesNotMatch(constat.message, /var\(|\{/);
});

test("C20 : padding: 12px et opacity: 0.5 sont des valeurs en dur (famille effet comprise)", () => {
  const declarations = [declaration("padding", "12px"), declaration("opacity", "0.5")];
  const constats = juger({ releve: { declarations } }).constats;
  assert.deepEqual(constats.map((constat) => constat.faits.familles), [["dimension"], ["effet"]]);
});

test("C21 : une valeur calculée par le code est non-analyse, forme expression, règle valeur-en-dur", () => {
  const [constat] = juger({ releve: { declarations: [declaration("gap", null)] } }).constats;
  assert.equal(constat.code, "non-analyse");
  assert.equal(constat.niveau, "non-analyse");
  assert.equal(constat.regle, "valeur-en-dur");
  assert.deepEqual(constat.faits, { propriete: "gap", forme: "expression" });
  assert.equal(constat.commande, undefined);
  assert.deepEqual(juger({ releve: { declarations: [declaration("display", null)] } }).constats, []);
});

test("C28, C29, C30 : var() et identifiants CSS passent dans une déclaration", () => {
  const declarations = [
    declaration("box-shadow", "inset 0 0 0 var(--w) var(--c)"),
    declaration("outline", "var(--w) solid transparent"),
    declaration("text-align", "left"),
    declaration("font-style", "normal"),
    declaration("width", "auto"),
    declaration("color", "inherit"),
  ];
  assert.deepEqual(juger({ releve: { declarations } }).constats, []);
  assert.deepEqual(codes(juger({ releve: { declarations: [declaration("box-shadow", "0 0 0 1px var(--c)")] } })), ["valeur-en-dur"]);
});

test("C31 : une fonction mathématique se juge par ses arguments, et var() s'y cherche", () => {
  const pour = (propriete, valeur) => juger({ releve: { declarations: [declaration(propriete, valeur)] } }).constats;
  assert.deepEqual(pour("padding", "calc(12px)").map((constat) => constat.faits.parties), [["12px"]]);
  assert.deepEqual(pour("padding", "max(12px, 0px)").map((constat) => constat.faits.parties), [["12px"]]);
  assert.deepEqual(pour("outline-offset", "calc(var(--w) * -1)"), []);
  assert.deepEqual(codes({ constats: pour("opacity", "calc(var(--absente) / 100)") }), ["token-inconnu"]);
});

test("une référence dans une déclaration se juge comme une chaîne", () => {
  assert.deepEqual(juger({ releve: { declarations: [declaration("padding", "{components.button.sizes.medium.gap}")] } }).constats, []);
  const constats = juger({ releve: { declarations: [declaration("padding", "{components.button.sizes.medium.gap} {x.absent}")] } }).constats;
  assert.deepEqual(constats.map((constat) => constat.faits), [{ reference: "{x.absent}" }]);
});

test("C44 : dans un objet, une clé qui est une propriété CSS se juge comme une déclaration", () => {
  const declarations = [
    declaration("color", "red", { contexte: "objet" }),
    declaration("size", "red", { contexte: "objet" }),
    declaration("height", "32px", { contexte: "objet" }),
    declaration("count", "3", { contexte: "objet" }),
  ];
  const constats = juger({ releve: { declarations } }).constats;
  assert.deepEqual(constats.map((constat) => constat.faits.propriete), ["color", "height"]);
});

test("dans un objet, un nombre vaut la longueur que React écrirait pour une dimension, et reste nombre ailleurs", () => {
  const objet = (propriete, valeur, extra = {}) => declaration(propriete, valeur, { contexte: "objet", ...extra });
  const pour = (...declarations) => juger({ releve: { declarations } }).constats;
  const hauteur = pour(objet("height", "32", { nombre: true, valeurEnStyle: "32px" }));
  assert.deepEqual(hauteur.map((constat) => constat.faits.parties), [["32px"]]);
  assert.deepEqual(pour(objet("height", "0", { nombre: true, valeurEnStyle: "0" })), []);
  assert.deepEqual(pour(objet("count", "3", { nombre: true })), []);
  assert.deepEqual(pour(objet("count", "3")), []);
  assert.deepEqual(codes({ constats: pour(objet("label", "12px")) }), ["valeur-en-dur"]);
  assert.deepEqual(pour(objet("label", "12px", { nombre: true })), []);

  const interligne = pour(objet("line-height", "1.5", { nombre: true, valeurEnStyle: "1.5" }));
  const taille = pour(objet("font-size", "15", { nombre: true, valeurEnStyle: "15px" }));
  assert.deepEqual(taille.map((constat) => [constat.code, constat.faits.parties]), [["valeur-en-dur", ["15px"]]]);
  assert.deepEqual(interligne.map((constat) => [constat.code, constat.faits.parties, constat.faits.familles]), [["valeur-en-dur", ["1.5"], ["typographie"]]]);
  const publie = contrat140();
  publie.viewTypographies.ty1[0].lineClamp = 2;
  assert.deepEqual(juger({ contrat: publie, releve: { declarations: [objet("line-clamp", "2", { nombre: true, valeurEnStyle: "2" })] } }).constats, []);
  const interlignePublie = contrat140();
  interlignePublie.viewTypographies.ty1[0].lineClamp = 1.5;
  assert.deepEqual(juger({ contrat: interlignePublie, releve: { declarations: [objet("line-height", "1.5", { nombre: true, valeurEnStyle: "1.5" })] } }).constats, []);
});

test("dans un objet, une clé hors famille juge ses références et ses couleurs comme une chaîne", () => {
  const objet = (propriete, valeur) => declaration(propriete, valeur, { contexte: "objet" });
  assert.deepEqual(juger({ releve: { declarations: [objet("label", "{components.button.sizes.medium.gap}")] } }).constats, []);
  assert.deepEqual(codes(juger({ releve: { declarations: [objet("label", "var(--absente)")] } })), ["token-inconnu"]);
  assert.deepEqual(codes(juger({ releve: { declarations: [objet("label", "1px solid #ccc")] } })), ["valeur-en-dur"]);
  assert.deepEqual(juger({ releve: { declarations: [objet("label", "Bouton de 12px")] } }).constats, []);
});

test("une déclaration d'objet cherche aussi les références et les valeurs de la règle des chaînes", () => {
  const absente = declaration("a", "{x.absent}", { contexte: "objet" });
  assert.deepEqual(codes(juger({ releve: { declarations: [absente] } })), ["token-inconnu"]);
  assert.deepEqual(juger({ releve: { declarations: [declaration("a", "{components.button.sizes.medium.gap}", { contexte: "objet" })] } }).constats, []);
  const [dur] = juger({ releve: { declarations: [declaration("size", "#ff0000", { contexte: "objet" })] } }).constats;
  assert.equal(dur.code, "valeur-en-dur");
  assert.deepEqual(dur.faits.parties, ["#ff0000"]);
  assert.deepEqual(codes(juger({ releve: { declarations: [declaration("padding", "#ff0000", { contexte: "objet" })] } })), ["valeur-en-dur"]);
  assert.deepEqual(juger({ releve: { declarations: [declaration("count", "3", { contexte: "objet" }), declaration("--x", "#fff")] } }).constats, []);
});

test("C33 : une valeur neutre s'écrit comme on veut", () => {
  assert.deepEqual(juger({ releve: { declarations: [declaration("fill", "CURRENTCOLOR"), declaration("border", "NONE")] } }).constats, []);
});

test("C47 : une décomposition dans un objet de style est non-analyse, forme decomposition", () => {
  const [constat] = juger({ releve: { declarations: [declaration(null, null)] } }).constats;
  assert.equal(constat.code, "non-analyse");
  assert.equal(constat.regle, "valeur-en-dur");
  assert.deepEqual(constat.faits, { forme: "decomposition" });
});

test("un contrat sans valeurs jugées garde ses citations mais ne juge aucune valeur", () => {
  const contexte = creerContexteDuJuge({ tokens: lesTokens(), contrat: null });
  assert.deepEqual(jugerChaine(chaine("#ff0000"), contexte), []);
  assert.deepEqual(jugerDeclaration(declaration("gap", null), contexte), []);
  assert.deepEqual(jugerChaine(chaine("{x.absent}"), contexte).map((verdict) => verdict.code), ["token-inconnu"]);
});

// ─── Le périmètre, les contrats et les limites ────────────────────────────

test("C22 : un fichier qu'aucun composant n'inclut n'a ni composant, ni constat, ni limite", () => {
  const r = juger({ fichier: "src/autre/Util.ts", releve: { chaines: [chaine("#ff0000")] } });
  assert.deepEqual({ composants: r.composants, constats: r.constats, limites: r.limites }, { composants: [], constats: [], limites: [] });
});

test("C23 : un contrat ancien ou récent ne juge pas les valeurs, mais ses citations le sont", () => {
  const releve = { chaines: [chaine("#ff0000"), chaine("{x.absent}")] };
  const ancien = juger({ contrat: fixture("12.0", "Button"), releve });
  assert.deepEqual(limites(ancien), ["contrat-ancien"]);
  assert.deepEqual(ancien.limites[0].faits, { composant: "Button", version: "12.0" });
  assert.equal(ancien.limites[0].composant, "Button");
  assert.deepEqual(codes(ancien), ["token-inconnu"]);

  const recent = copie(BUTTON);
  recent.meta.contractVersion = "15.0";
  const futur = juger({ contrat: recent, releve });
  assert.deepEqual(limites(futur), ["contrat-recent"]);
  assert.deepEqual(codes(futur), ["token-inconnu"]);
  assert.match(futur.limites[0].message, /plus récent que ce kit\. Montez @ucm-kit\/core\./);
});

test("un contrat illisible est une limite, ses citations restent jugées", () => {
  const r = juger({ contrat: null, releve: { chaines: [chaine("#ff0000"), chaine("{x.absent}")] } });
  assert.deepEqual(limites(r), ["contrat-illisible"]);
  assert.deepEqual(codes(r), ["token-inconnu"]);
});

test("C24 : des tokens absents ou d'une version inconnue ne jugent aucune référence", () => {
  const releve = { chaines: [chaine("{x.absent}"), chaine("var(--absente)"), chaine("#fff")] };
  const absents = juger({ tokens: null, releve });
  assert.deepEqual(limites(absents), ["tokens-illisibles"]);
  assert.deepEqual(codes(absents), ["valeur-en-dur"]);
  assert.equal(absents.limites[0].message, "`tokens.json` est absent ou illisible. Les références ne sont pas jugées.");

  const futur = { etat: { etat: "future", version: 99 }, index: new Map(), noms: new Map() };
  const inconnus = juger({ tokens: futur, releve });
  assert.deepEqual(limites(inconnus), ["tokens-format-inconnu"]);
  assert.deepEqual(codes(inconnus), ["valeur-en-dur"]);
});

test("C23, C24 : un répli en dur se voit même sans tokens lisibles", () => {
  assert.deepEqual(codes(juger({ tokens: null, releve: { chaines: [chaine("var(--a, 8px)")] } })), ["repli-en-dur"]);
});

test("C36 : sous Windows, la casse de la lettre de lecteur ne change pas le rattachement", { skip: process.platform !== "win32" }, () => {
  const racine = "a:\\r";
  const lecteur = lecteurFabrique();
  const r = preparerControleDepuis("A:\\r\\src\\components\\Button\\Button.tsx", {
    racine,
    configuration: CONFIGURATION,
    documents: [{ chemin: "a:\\r\\src\\components\\Button\\Button.contract.json", contrat: BUTTON }],
    tokens: lesTokens(),
    lecteur,
    lire: () => "",
  });
  assert.deepEqual(r.composants, ["Button"]);
  assert.equal(r.fichier, "src/components/Button/Button.tsx");
});

test("C37 : les fichiers qu'importe l'implémentation, et eux seuls, se rattachent au composant", () => {
  const fichiers = { "Button.tsx": [FICHIER_BUTTON, "src/components/Button/Button.variants.ts", "src/components/Button/tables.ts"] };
  const releve = { chaines: [chaine("#ff0000")] };
  for (const fichier of ["src/components/Button/tables.ts", "src/components/Button/Button.variants.ts"]) {
    const r = juger({ fichier, fichiers, releve });
    assert.deepEqual(r.composants, ["Button"], fichier);
    assert.deepEqual(codes(r), ["valeur-en-dur"], fichier);
  }
  const histoire = juger({ fichier: "src/components/Button/Button.stories.tsx", fichiers, releve });
  assert.deepEqual({ composants: histoire.composants, constats: histoire.constats, limites: histoire.limites }, { composants: [], constats: [], limites: [] });
});

test("C38 : un fichier que deux composants importent est partagé, et répond au contrat de chacun", () => {
  const documents = [
    { chemin: join(RACINE, "src/components/Button/Button.contract.json"), contrat: BUTTON },
    { chemin: join(RACINE, "src/components/Alert/Alert.contract.json"), contrat: ALERT },
  ];
  const fichiers = { "Button.tsx": ["src/components/Button/Button.tsx", "src/utils.ts"], "Alert.tsx": ["src/components/Alert/Alert.tsx", "src/utils.ts"] };
  const r = juger({ fichier: "src/utils.ts", documents, fichiers, releve: { chaines: [chaine("#ff0000")] } });
  assert.deepEqual(r.composants, ["Alert", "Button"]);
  const partage = r.limites.find((limite) => limite.code === "fichier-partage");
  assert.deepEqual(partage.faits, { composants: ["Alert", "Button"] });
  assert.equal(partage.message, "Ce fichier sert `Alert, Button`. Il répond au contrat de chacun.");
  assert.deepEqual(r.constats.map((constat) => constat.composant), ["Alert", "Button"]);
  assert.match(r.constats[0].message, /contrat de `Alert`/);
});

test("deux contrats qui désignent le même fichier ne jugent aucune valeur", () => {
  const documents = [
    { chemin: join(RACINE, "src/a/Button.contract.json"), contrat: BUTTON },
    { chemin: join(RACINE, "src/b/Button.contract.json"), contrat: BUTTON },
  ];
  const r = juger({ fichier: "src/components/Button.tsx", documents, configuration: { ...CONFIGURATION, implementation: "src/components/{id}.tsx" }, releve: { chaines: [chaine("#ff0000"), chaine("{x.absent}")] } });
  assert.deepEqual(limites(r), ["contrats-multiples"]);
  assert.deepEqual(r.limites[0].faits, { composants: ["Button"] });
  assert.deepEqual([...new Set(codes(r))], ["token-inconnu"]);
});

test("une implémentation .jsx, que le lecteur ne lit pas, donne sans-adaptateur et aucun constat", () => {
  const r = juger({
    fichier: "src/components/Button/Button.jsx",
    configuration: { ...CONFIGURATION, implementation: "{dir}/{id}.jsx" },
    releve: { chaines: [chaine("#ff0000")] },
  });
  assert.deepEqual(r.composants, ["Button"]);
  assert.deepEqual(limites(r), ["sans-adaptateur"]);
  assert.equal(r.limites[0].composant, "Button");
  assert.deepEqual(r.limites[0].faits, { composant: "Button", extension: ".jsx" });
  assert.deepEqual(r.constats, []);
});

test("C43 : une lecture incomplète est une limite, et les constats de la partie lue restent", () => {
  const r = juger({ releve: { chaines: [chaine("#ff0000")], lecture: { complete: false, erreurs: 2 } } });
  assert.deepEqual(limites(r), ["lecture-incomplete"]);
  assert.equal(r.limites[0].message, "Ce fichier porte 2 erreurs de syntaxe. La partie illisible n’est pas jugée.");
  assert.deepEqual(codes(r), ["valeur-en-dur"]);
});

test("C45 : un BOM de tête se retire avant le relevé et ne change rien aux constats", () => {
  const appels = [];
  const releve = { chaines: [chaine("#ff0000")] };
  const avec = juger({ releve, texte: "\uFEFFconst a = 1;", appels });
  const sans = juger({ releve, texte: "const a = 1;", appels });
  assert.deepEqual(appels.map((appel) => appel.texte), ["const a = 1;", "const a = 1;"]);
  assert.deepEqual(avec, sans);
});

// ─── Les dérogations et les commentaires ──────────────────────────────────

const derogationDeValeur = (surcharge = {}) => ({
  composant: "Button",
  ecart: { genre: "valeur-en-dur", fichier: FICHIER_BUTTON, valeur: "12px" },
  export: BUTTON.meta.exportedAt,
  motif: "Valeur du design en attente.",
  par: "Camille",
  ...surcharge,
});

test("C39 : une dérogation de l'export courant couvre le constat ; celle d'un export ancien le laisse avec sa commande", () => {
  const releve = { declarations: [declaration("padding", "12px")] };
  const couvert = juger({ releve, derogations: { derogations: [derogationDeValeur()], erreurs: [] } }).constats[0];
  assert.deepEqual(couvert.deroge, { motif: "Valeur du design en attente.", par: "Camille" });
  assert.equal(couvert.commande, undefined);
  assert.doesNotMatch(couvert.message, /Pour la garder/);

  const tombee = juger({ releve, derogations: { derogations: [derogationDeValeur({ export: "2020-01-01T00:00:00.000Z" })], erreurs: [] } }).constats[0];
  assert.equal(tombee.deroge, undefined);
  assert.match(tombee.commande, /^npx @ucm-kit\/cli deroger Button valeur-en-dur src\/components\/Button\/Button\.tsx 12px --motif "…"$/);

  const autreValeur = juger({ releve: { declarations: [declaration("padding", "13px")] }, derogations: { derogations: [derogationDeValeur()], erreurs: [] } }).constats[0];
  assert.equal(autreValeur.deroge, undefined);
});

test("C40 : le message d'un écart non couvert se termine par la commande, coordonnées entre apostrophes", () => {
  const [dur] = juger({ releve: { chaines: [chaine("#fff")] } }).constats;
  assert.equal(dur.commande, `npx @ucm-kit/cli deroger Button valeur-en-dur ${FICHIER_BUTTON} '#fff' --motif "…"`);
  assert.ok(dur.message.endsWith(`Pour la garder, lancez \`${dur.commande}\` avec votre raison à la place de \`…\`.`));
  assert.ok(dur.message.startsWith("`#fff` est une valeur écrite en dur, que le contrat de `Button` ne publie pas."));

  const [inconnu] = juger({ releve: { chaines: [chaine("{a.b}")] } }).constats;
  assert.equal(inconnu.commande, `npx @ucm-kit/cli deroger Button token-inconnu ${FICHIER_BUTTON} '{a.b}' --motif "…"`);
  assert.ok(inconnu.message.startsWith("`{a.b}` ne nomme aucun token de tokens.json. Pour la garder"));

  const [repli] = juger({ releve: { chaines: [chaine("var(--w, 1px)")] } }).constats;
  assert.equal(repli.commande, `npx @ucm-kit/cli deroger Button repli-en-dur ${FICHIER_BUTTON} --w --motif "…"`);
});

test("C41 : un commentaire eslint-disable qui nomme une règle UCM est un constat, un autre non", () => {
  const directive = (texte) => ({ texte, debut: 0, fin: texte.length });
  const nomme = juger({ releve: { directives: [directive("// eslint-disable-next-line ucm/valeur-en-dur")] } }).constats;
  assert.deepEqual(nomme.map((constat) => [constat.code, constat.regle, constat.niveau]), [["desactivation-interdite", "valeur-en-dur", "ecart"]]);
  assert.equal(nomme[0].commande, undefined);
  assert.equal(nomme[0].coordonnees, undefined);
  assert.deepEqual([nomme[0].debut, nomme[0].fin], [0, "// eslint-disable-next-line ucm/valeur-en-dur".length]);
  assert.deepEqual(juger({ releve: { directives: [directive("// eslint-disable-next-line react-hooks/exhaustive-deps")] } }).constats, []);
  const deux = juger({ releve: { directives: [directive("/* eslint-disable ucm/token-inconnu, ucm/valeur-en-dur -- raison */")] } }).constats;
  assert.deepEqual(deux.map((constat) => constat.regle).sort(), ["token-inconnu", "valeur-en-dur"]);
});

test("C42 : un fichier de dérogations invalide est une limite, et aucune dérogation ne s'applique", () => {
  const r = juger({ releve: { declarations: [declaration("padding", "12px")] }, derogations: { derogations: [derogationDeValeur()], erreurs: ["derogations[1].par : champ manquant."] } });
  assert.deepEqual(limites(r), ["derogations-illisibles"]);
  assert.equal(r.constats[0].deroge, undefined);
  assert.ok(r.constats[0].commande);
});

test("C46 : chaque constat porte la règle de sa table, ou celle de son contexte", () => {
  const directive = { texte: "// eslint-disable-next-line ucm/token-inconnu", debut: 0, fin: 10 };
  const r = juger({
    tokens: lesTokens({ layout: { size: { "50%": feuille(), 50: feuille() } }, w: feuille() }),
    releve: {
      chaines: [chaine("{a.absent}"), chaine("var(--w, 1px)"), chaine("var(--layout-size-50)"), chaine("#fff"), chaine("var(--")],
      declarations: [declaration("gap", null)],
      directives: [directive],
    },
  });
  assert.deepEqual([...new Set(codes(r))].sort(), CODES_DU_CONTROLE_DU_CODE.map((entree) => entree.code).sort());
  for (const constat of r.constats) {
    const attendue = constat.code === "non-analyse" ? (constat.faits.forme === "gabarit" ? "token-inconnu" : "valeur-en-dur")
      : constat.code === "desactivation-interdite" ? "token-inconnu"
        : CODES_DU_CONTROLE_DU_CODE.find((entree) => entree.code === constat.code).regles[0];
    assert.equal(constat.regle, attendue, constat.code);
    assert.ok(CODES_DU_CONTROLE_DU_CODE.find((entree) => entree.code === constat.code).regles.includes(constat.regle));
  }
});

test("les constats sont rendus dans l'ordre du texte", () => {
  const r = juger({ releve: { chaines: [chaine("#aaa", { debut: 50, fin: 54 }), chaine("#bbb", { debut: 5, fin: 9 })], declarations: [declaration("padding", "3px", { debut: 20, fin: 30 })] } });
  assert.deepEqual(r.constats.map((constat) => constat.debut), [5, 20, 50]);
});

// ─── Propriétés ───────────────────────────────────────────────────────────

test("deux préparations ne partagent aucun résultat, et aucune n'altère ses entrées", () => {
  const entrees = {
    contrat: copie(BUTTON),
    tokens: lesTokens(),
    releve: { chaines: [chaine("#ff0000"), chaine("{x.absent}")], declarations: [declaration("padding", "12px")] },
    derogations: { derogations: [derogationDeValeur()], erreurs: [] },
  };
  const avant = JSON.stringify({ ...entrees, tokens: [...entrees.tokens.index.keys()] });
  const premier = juger(entrees);
  const second = juger(entrees);
  assert.deepEqual(premier, second);
  assert.notEqual(premier.constats, second.constats);
  assert.notEqual(premier.constats[0], second.constats[0]);
  premier.constats[0].message = "modifié";
  assert.notEqual(second.constats[0].message, "modifié");
  assert.equal(JSON.stringify({ ...entrees, tokens: [...entrees.tokens.index.keys()] }), avant);
});

test("l'ordre des groupes de tokens.json ne change aucun constat", () => {
  const groupes = { a: { x: feuille() }, b: { y: feuille() }, w: feuille(), c: feuille() };
  const inverse = Object.fromEntries(Object.entries(groupes).reverse());
  const releve = { chaines: [chaine("var(--a-x)"), chaine("var(--b-y)"), chaine("var(--inconnue)"), chaine("{a.z}")] };
  const gauche = juger({ tokens: lesTokens(groupes), releve });
  assert.deepEqual(gauche, juger({ tokens: lesTokens(inverse), releve }));
  assert.deepEqual(codes(gauche), ["token-inconnu", "token-inconnu"]);
});

test("une propriété de typographie écrite en identifiant passe, que le contrat la publie ou non", () => {
  const releve = { declarations: [declaration("text-transform", "uppercase")] };
  assert.deepEqual(juger({ composant: "StressTest", contrat: STRESS, releve }).constats, []);
  assert.deepEqual(juger({ releve }).constats, []);
});

test("un nombre dans une propriété de typographie se compare à ce que le contrat publie", () => {
  const releve = { declarations: [declaration("line-clamp", "2"), declaration("-webkit-line-clamp", "2")] };
  assert.deepEqual(juger({ contrat: contrat140(), releve }).constats, []);
  assert.deepEqual(codes(juger({ releve })), ["valeur-en-dur", "valeur-en-dur"]);
});

test("`stretch` publié autorise width: 100%", () => {
  const stretch = contrat140();
  stretch.viewStructures.st1.sizing = { width: "stretch", height: "fit-content" };
  const releve = { declarations: [declaration("width", "100%")] };
  assert.deepEqual(juger({ contrat: stretch, releve }).constats, []);
  assert.deepEqual(codes(juger({ contrat: contrat140(), releve })), ["valeur-en-dur"]);
});

test("le cache d'un contrôle garde le relevé d'un fichier lu sur le disque", () => {
  const appels = [];
  const cache = new Map();
  const fichiers = { "Button.tsx": [FICHIER_BUTTON, "src/components/Button/Button.variants.ts"] };
  const options = { fichier: FICHIER_BUTTON, fichiers, cache, appels };
  juger(options);
  const premiers = appels.filter((appel) => appel.nom === "Button.variants.ts").length;
  juger(options);
  assert.equal(premiers, 1);
  assert.equal(appels.filter((appel) => appel.nom === "Button.variants.ts").length, 1);
  assert.ok(cache.size > 0);
});

// ─── Le disque : preparerControle ─────────────────────────────────────────

const dossiers = [];
function projet({ configuration = { components: "src/components", tokens: "tokens.json" }, tokens = ARBRE, derogations = null, contrat = BUTTON } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-juge-"));
  dossiers.push(racine);
  const ecrire = (relatif, contenu) => {
    mkdirSync(dirname(join(racine, relatif)), { recursive: true });
    writeFileSync(join(racine, relatif), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
  };
  if (configuration !== null) ecrire("ucm.config.json", configuration);
  if (contrat !== null) ecrire("src/components/Button/Button.contract.json", contrat);
  if (tokens !== null) ecrire("tokens.json", tokens);
  if (derogations !== null) ecrire(".ucm/derogations.json", derogations);
  return { racine, ecrire, fichier: join(racine, "src", "components", "Button", "Button.tsx") };
}
after(() => {
  for (const dossier of dossiers) rmSync(dossier, { recursive: true, force: true });
});

const lecteurDisque = (releve = {}) => lecteurFabrique({ releves: { "Button.tsx": { ...VIDE, ...releve } } });

test("C3 : un token retiré de tokens.json entre deux préparations se voit, aucun cache ne survit", () => {
  const { racine, ecrire, fichier } = projet();
  const lecteur = lecteurDisque({ chaines: [chaine("{components.button.sizes.medium.gap}")] });
  assert.deepEqual(preparerControle(fichier, { texte: "const a = 1;", lecteur }).constats, []);
  ecrire("tokens.json", { w: feuille() });
  const apres = preparerControle(fichier, { texte: "const a = 1;", lecteur });
  assert.deepEqual(codes(apres), ["token-inconnu"]);
  assert.equal(apres.racine, racine);
  assert.equal(apres.fichier, "src/components/Button/Button.tsx");
});

test("preparerControle lit le fichier sur le disque quand aucun texte n'est donné", () => {
  const { fichier, ecrire } = projet();
  ecrire("src/components/Button/Button.tsx", "const disque = 1;");
  const appels = [];
  const lecteur = lecteurFabrique({ releves: { "Button.tsx": { ...VIDE, chaines: [chaine("#fff")] } }, appels });
  const r = preparerControle(fichier, { lecteur });
  assert.deepEqual(codes(r), ["valeur-en-dur"]);
  assert.equal(appels[0].texte, "const disque = 1;");
});

test("C35 : la racine se trouve en remontant ; les pannes de lecture sont des limites, jamais des exceptions", () => {
  const { racine, fichier } = projet();
  const lecteur = lecteurDisque();
  const rattache = preparerControle(fichier, { lecteur, texte: "" });
  assert.equal(rattache.racine, racine);
  assert.deepEqual(rattache.composants, ["Button"]);

  const sans = projet({ configuration: null });
  const absente = preparerControle(sans.fichier, { lecteur, texte: "" });
  assert.deepEqual([absente.racine, absente.fichier, absente.composants, limites(absente)], [null, null, [], ["configuration-absente"]]);
  assert.equal(absente.limites[0].message, "Aucun ucm.config.json au-dessus de ce fichier. Le contrôle ne sait pas où sont les contrats.");

  const invalide = projet({ configuration: { components: "../dehors" } });
  const refusee = preparerControle(invalide.fichier, { lecteur, texte: "" });
  assert.deepEqual(limites(refusee), ["configuration-invalide"]);
  assert.match(refusee.limites[0].message, /^ucm\.config\.json est invalide : /);
  assert.deepEqual(refusee.constats, []);

  const sansDossier = projet({ configuration: { components: "nulle-part" } });
  const introuvable = preparerControle(sansDossier.fichier, { lecteur, texte: "" });
  assert.deepEqual(limites(introuvable), ["contrats-introuvables"]);
  assert.equal(introuvable.limites[0].message, "Le dossier des contrats `nulle-part` est introuvable.");

  for (const nom of ["<input>", "<text>", "", undefined, null]) {
    const r = preparerControle(nom, { lecteur, texte: "" });
    assert.deepEqual([r.racine, r.fichier, r.composants, limites(r)], [null, null, [], ["fichier-sans-chemin"]], String(nom));
  }
});

test("preparerControle accepte une racine donnée, sans remonter", () => {
  const { racine, fichier } = projet();
  const r = preparerControle(fichier, { lecteur: lecteurDisque({ chaines: [chaine("#fff")] }), racine, texte: "" });
  assert.deepEqual(codes(r), ["valeur-en-dur"]);
  assert.equal(r.racine, racine);
});

test("C24 : tokens.json absent, illisible ou d'une version inconnue donne une limite et aucun token-inconnu", () => {
  const releve = { chaines: [chaine("{x.absent}"), chaine("var(--absente)")] };
  const attendues = [
    [{ tokens: null }, "tokens-illisibles"],
    [{ tokens: "{ pas du json" }, "tokens-illisibles"],
    [{ tokens: { $extensions: { [EXTENSION_VERSION_TOKENS]: 999 } } }, "tokens-format-inconnu"],
  ];
  for (const [options, limite] of attendues) {
    const { fichier } = projet(options);
    const r = preparerControle(fichier, { lecteur: lecteurDisque(releve), texte: "" });
    assert.deepEqual(limites(r), [limite], limite);
    assert.deepEqual(r.constats, [], limite);
  }
});

test("preparerControle applique .ucm/derogations.json, et un fichier invalide en est une limite", () => {
  const releve = { declarations: [declaration("padding", "12px")] };
  const dedie = projet({ derogations: { derogations: [derogationDeValeur()] } });
  const couvert = preparerControle(dedie.fichier, { lecteur: lecteurDisque(releve), texte: "" });
  assert.deepEqual(couvert.constats[0].deroge, { motif: "Valeur du design en attente.", par: "Camille" });

  const casse = projet({ derogations: "{ pas du json" });
  const refuse = preparerControle(casse.fichier, { lecteur: lecteurDisque(releve), texte: "" });
  assert.deepEqual(limites(refuse), ["derogations-illisibles"]);
  assert.equal(refuse.constats[0].deroge, undefined);
});

test("preparerControle ne lève jamais, même quand le lecteur lève", () => {
  const { fichier } = projet();
  const lecteur = { extensions: [".tsx"], releverUsages: () => { throw new Error("boum"); }, fichiersDuComposant: () => { throw new Error("boum"); } };
  const r = preparerControle(fichier, { lecteur, texte: "" });
  assert.deepEqual(r.composants, ["Button"]);
  assert.deepEqual(limites(r), ["lecture-incomplete"]);
  assert.deepEqual(preparerControle(fichier, { texte: "" }).constats, []);
});
