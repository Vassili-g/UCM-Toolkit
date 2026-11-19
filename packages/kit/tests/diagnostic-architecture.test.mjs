/**
 * Le diagnostic d'architecture : les constats d'un `tokens.json` groupés par
 * genre, la borne de la section, le fichier qui ne suit pas l'architecture UCM,
 * et la garantie que rien de ce diagnostic ne bloque la fusion.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { controlerRepository } from "../src/lecteurs/controle-repository.mjs";
import {
  constatsDeLArchitecture,
  resumeTerminalArchitecture,
  sectionArchitecture,
} from "../src/lecteurs/diagnostic-architecture.mjs";
import { bilanEstBloquant } from "../src/lecteurs/verdict-bilan.mjs";
import { tokensAnonymises } from "./fixtures/tokensDeLiens.ts";

const couleur = (r) => ({ colorSpace: "srgb", components: [r, 0.2, 0.3], alpha: 1 });
const px = (value) => ({ $type: "dimension", $value: { value, unit: "px" } });

/**
 * Un fichier UCM à cinq défauts de cinq genres : cinq variables absentes du
 * thème, un alias vers une variable absente, une couleur écrite en dur dans deux
 * modes, une couche non admise, deux crans de `sizing` à 4 px.
 */
const TOKENS_UCM = {
  $extensions: { "com.ucm.formatVersion": 2, "com.ucm.axes": { theme: { modes: ["light", "dark"], default: "light" } } },
  layouts: { sizing: { 1: px(4), 2: px(4), 3: px(8) } },
  primitives: { red: { 500: { $type: "color", $value: couleur(0.9) } } },
  theme: {
    page: {
      bg: {
        $type: "color",
        $value: "{primitives.red.500}",
        $extensions: { "com.ucm.modes": { light: "{primitives.red.500}", dark: "{primitives.absente.500}" } },
      },
      fg: { $type: "color", $value: couleur(0.1) },
    },
  },
};

const genres = (architecture) => Object.fromEntries(architecture.groupes.map(({ genre, nombre }) => [genre, nombre]));

test("un fichier UCM donne ses constats groupés par genre, dans l'ordre du rapport", () => {
  const architecture = constatsDeLArchitecture(structuredClone(TOKENS_UCM));

  assert.equal(architecture.etat, "jugee");
  assert.equal(architecture.collections, 3);
  assert.deepEqual(genres(architecture), {
    "variable-absente": 5,
    couche: 1,
    "valeur-directe": 2,
    "alias-supprime": 1,
    "doublon-d-echelle": 1,
  });
  assert.equal(architecture.total, 10);
  assert.deepEqual(architecture.groupes.map(({ genre }) => genre), ["variable-absente", "couche", "valeur-directe", "alias-supprime", "doublon-d-echelle"]);
});

test("un genre montre trois exemples au plus et compte le reste", () => {
  const architecture = constatsDeLArchitecture(structuredClone(TOKENS_UCM));
  const absentes = architecture.groupes.find(({ genre }) => genre === "variable-absente");

  assert.equal(absentes.exemples.length, 3);
  assert.match(sectionArchitecture(architecture).join("\n"), /Variable du thème absente \(5\) : .*; 2 autres$/m);
});

test("la section est une information : titre, phrase qui dit ce qui est jugé, genres, geste, fusion non bloquée", () => {
  const lignes = sectionArchitecture(constatsDeLArchitecture(structuredClone(TOKENS_UCM)));
  const texte = lignes.join("\n");

  assert.equal(lignes[0], "### ℹ️ L'architecture de `tokens.json` s'écarte de celle d'UCM (10 écarts)");
  assert.match(texte, /sont comparés à l'architecture UCM, avec les contrôles d'UCM Architect/);
  assert.match(texte, /^- Crans d'une échelle qui valent la même chose \(1\) : `sizing`, mode `base`, 2 crans à 4$/m);
  assert.match(texte, /^- Couleur écrite en dur là où une variable est attendue \(2\) : `page\/fg`, mode `light` ; `page\/fg`, mode `dark`$/m);
  assert.match(texte, /Un designer relit ces écarts dans UCM Architect/);
  assert.match(texte, /Cette information ne bloque pas la fusion\.$/m);
  assert.doesNotMatch(texte, /❌|⚠️|✅/);
});

test("la section reste sous 5 000 caractères pour 3 000 écarts aux noms de 300 caractères", () => {
  const theme = { page: {} };
  for (let i = 0; i < 3_000; i += 1) {
    theme.page[`${i}-${"n".repeat(300)}`] = { $type: "color", $value: "{primitives.absente.500}" };
  }
  const architecture = constatsDeLArchitecture({ ...structuredClone(TOKENS_UCM), theme });
  const section = sectionArchitecture(architecture).join("\n");

  assert.ok(architecture.total >= 3_000);
  assert.ok(section.length < 5_000, `${section.length} caractères`);
  const alias = architecture.groupes.find(({ genre }) => genre === "alias-supprime");
  assert.equal(alias.exemples.length, 3);
  assert.ok(alias.exemples.every((exemple) => exemple.length <= 120));
});

test("sans aucun écart, ni section ni rappel", () => {
  const architecture = { etat: "jugee", collections: 4, groupes: [], total: 0 };

  assert.deepEqual(sectionArchitecture(architecture), []);
  assert.equal(resumeTerminalArchitecture(architecture), null);
  assert.deepEqual(sectionArchitecture(null), []);
});

test("un fichier UCM sans collection `theme` reconnue le dit en une information", () => {
  const architecture = constatsDeLArchitecture({ primitives: TOKENS_UCM.primitives });

  assert.deepEqual(genres(architecture), { "theme-non-reconnu": 1 });
  assert.match(sectionArchitecture(architecture).join("\n"), /^- Aucune collection `theme` reconnue \(1\)$/m);
});

test("un fichier dont aucune collection n'est reconnue donne une seule ligne, sans constat", () => {
  const architecture = constatsDeLArchitecture({ couleurs: { texte: { principal: { $type: "color", $value: "#111111" } } }, espaces: {} });

  assert.deepEqual(architecture, { etat: "non-ucm", collections: 2 });
  assert.deepEqual(sectionArchitecture(architecture), [
    "### ℹ️ `tokens.json` ne suit pas l'architecture UCM : aucune collection reconnue (2 collections lues), elle n'est pas jugée.",
    "",
  ]);
  assert.match(resumeTerminalArchitecture(architecture), /^ℹ tokens\.json ne suit pas l'architecture UCM/);
});

test("un fichier que la projection ne sait pas lire n'est pas jugé et ne lève pas", () => {
  const illisible = { get theme() { throw new Error("illisible"); } };

  assert.deepEqual(constatsDeLArchitecture(illisible), { etat: "non-jugee" });
  assert.deepEqual(constatsDeLArchitecture(null), { etat: "non-jugee" });
  assert.match(sectionArchitecture({ etat: "non-jugee" }).join("\n"), /n'a pas pu être jugée/);
});

test("un fichier complet dans brands et utility ne reçoit aucun écart sur ces collections", () => {
  const architecture = constatsDeLArchitecture(tokensAnonymises());

  assert.deepEqual(genres(architecture), { "theme-non-reconnu": 1 });
});

test("les branches absentes de brands et de utility se comptent par genre, en information et sans palette choisie", () => {
  const tokens = tokensAnonymises();
  delete tokens.brands.secondary;
  delete tokens.utility.warning;
  const architecture = constatsDeLArchitecture(tokens);

  assert.deepEqual(genres(architecture), { "theme-non-reconnu": 1, "palette-a-choisir": 3 });
  const texte = sectionArchitecture(architecture).join("\n");
  assert.match(texte, /^- Famille de brands ou de utility sans palette \(3\) : `brands\/secondary`, mode `marque-1` ; `brands\/secondary`, mode `marque-2` ; `utility\/warning`, mode `base`$/m);
  assert.match(texte, /Cette information ne bloque pas la fusion\.$/m);

  // Le contrat jouet cite un token que ces fichiers n'ont pas : un contrôle sans
  // base le refuserait, une demande de tokens seuls non.
  const { bloquant, rapport } = verdict({ tokens, ...DEMANDE_DE_TOKENS });
  assert.equal(bloquant, false);
  assert.match(rapport, /Famille de brands ou de utility sans palette \(3\)/);
});

// ─── Le verdict de `controlerRepository` ────────────────────────────────────

const CONFIGURATION = { components: "src", tokens: "src/tokens/tokens.json", implementation: "{dir}/{id}.tsx" };

function contrat() {
  return {
    name: "Widget",
    meta: {
      contractVersion: "14.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      figma: { fileName: "f", nodeId: "1:1" },
      coverage: { portable: "complete" },
    },
    viewStructures: {
      st1: {
        layout: "flex-row",
        sizing: { width: "fit-content", height: "fit-content" },
        children: [{ slot: "label", tokens: { color: "{primitives.red.500}" } }],
      },
    },
    variantViews: { v1: { structure: "st1" } },
    variants: [{ nodeId: "1:2", figmaName: "Default", values: {}, tokens: {}, view: "v1" }],
    structure: { view: "st1" },
    rendering: { roles: {} },
  };
}

/** Une demande qui ne modifie que `tokens.json`, le genre « tokens seuls ». */
const DEMANDE_DE_TOKENS = { cheminsModifies: CONFIGURATION.tokens, tokensModifies: true };

function verdict({ avecContrat = true, tokens = TOKENS_UCM, ...portee } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-architecture-"));
  try {
    mkdirSync(join(racine, "src", "tokens"), { recursive: true });
    writeFileSync(join(racine, CONFIGURATION.tokens), JSON.stringify(tokens));
    if (avecContrat) {
      mkdirSync(join(racine, "src", "components", "Widget"), { recursive: true });
      writeFileSync(join(racine, "src", "components", "Widget", "Widget.contract.json"), JSON.stringify(contrat()));
      writeFileSync(join(racine, "src", "components", "Widget", "Widget.tsx"), "export function Widget() { return null; }\n");
    }
    return controlerRepository(racine, { configuration: CONFIGURATION, ...portee });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test("les constats d'architecture n'entrent jamais dans le verdict bloquant", () => {
  const { bloquant, fautifs, bilans, rapport, terminal } = verdict();

  assert.equal(bloquant, false);
  assert.deepEqual(fautifs, []);
  assert.equal(bilans.some(bilanEstBloquant), false);
  assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
  assert.match(rapport, /^### ℹ️ L'architecture de `tokens.json` s'écarte de celle d'UCM \(10 écarts\)$/m);
  assert.ok(terminal.some(({ texte }) => /10 écarts d'architecture dans tokens\.json/.test(texte) && /ne bloque pas la fusion/.test(texte)));
});

test("une demande de tokens seuls, sans contrat, reste verte et porte la section", () => {
  const { bloquant, rapport, terminal } = verdict({ avecContrat: false });

  assert.equal(bloquant, false);
  assert.match(rapport, /^## ✅ Ce repository n'a pas encore reçu d'export$/m);
  assert.match(rapport, /\(10 écarts\)/);
  assert.ok(terminal.some(({ texte }) => /10 écarts d'architecture/.test(texte)));
});

test("la section vient après le verdict, sous le marqueur du rapport", () => {
  const { rapport } = verdict();

  assert.ok(rapport.startsWith("<!-- ucm-rapport -->\n"));
  assert.ok(rapport.indexOf("Aucun blocage détecté") < rapport.indexOf("L'architecture de `tokens.json`"));
});

test("une demande qui ne touche pas les tokens ne reçoit pas la section", () => {
  const sansTokens = verdict({ cheminsModifies: "src/components/Widget/Widget.tsx", tokensModifies: false });
  const avecTokens = verdict({ cheminsModifies: "src/tokens/tokens.json", tokensModifies: true });

  assert.doesNotMatch(sansTokens.rapport, /architecture/);
  assert.equal(sansTokens.terminal.some(({ texte }) => /architecture/.test(texte)), false);
  assert.match(avecTokens.rapport, /L'architecture de `tokens.json`/);
  assert.equal(sansTokens.bloquant, false);
  assert.equal(avecTokens.bloquant, false);
});

test("un fichier non UCM donne une seule ligne d'information et le verdict reste vert", () => {
  const { bloquant, rapport } = verdict({ tokens: { couleurs: {}, espaces: {} }, ...DEMANDE_DE_TOKENS });
  const lignes = rapport.split("\n").filter((ligne) => /architecture/.test(ligne));

  assert.equal(bloquant, false);
  assert.deepEqual(lignes, ["### ℹ️ `tokens.json` ne suit pas l'architecture UCM : aucune collection reconnue (2 collections lues), elle n'est pas jugée."]);
});

test("un fichier de tokens absent n'est pas jugé", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-architecture-"));
  try {
    const { rapport } = controlerRepository(racine, { configuration: CONFIGURATION });
    assert.doesNotMatch(rapport, /architecture/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
