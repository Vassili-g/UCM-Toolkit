/**
 * Le diagnostic des contrastes : un texte sous 4,5:1 dans un seul contexte de
 * marque et de thème, un anneau sous 3:1, un contrat conforme, un fichier de
 * tokens sans collection `usage` ni `theme`, les couleurs non jugées, la
 * sévérité `info`, et le rapport d'un repository jouet.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { contraste } from "@ucm-kit/core/emplois";
import { CONTRACT_VERSION, identifiantsDeRoles, natureDuRole, tableDesRolesDeRendu } from "@ucm-kit/core/format";

import { controlerRepository } from "../src/lecteurs/controle-repository.mjs";
import * as diagnostic from "../src/lecteurs/diagnostic-contrastes.mjs";
import * as navigateur from "../src/lecteurs/navigateur.mjs";

const { constatsDesContrastes, resumeTerminalContrastes, sectionContrastes } = diagnostic;

/** Une couleur DTCG sRGB depuis un hexa. */
const srgb = (hexa, alpha = 1) => ({
  colorSpace: "srgb",
  components: [1, 3, 5].map((debut) => Number.parseInt(hexa.slice(debut, debut + 2), 16) / 255),
  alpha,
});

/** Une feuille à modes : une valeur par mode de l'axe. */
const feuille = (axe, modes) => ({
  $type: "color",
  $value: Object.values(modes)[0],
  $extensions: { "com.ucm.axis": axe, "com.ucm.modes": modes },
});
const alias = (chemin) => ({ $type: "color", $value: `{${chemin}}` });

/**
 * Un fichier de tokens sans collection `usage` ni `theme`, avec une marque et un
 * thème. Le vert de la marque `zen` passe sous 4,5:1 sur le fond sombre, et
 * nulle part ailleurs.
 */
const TOKENS = {
  $extensions: {
    "com.ucm.axes": {
      theme: { modes: ["light", "dark"], default: "light" },
      brand: { modes: ["acme", "zen"], default: "acme" },
    },
  },
  base: {
    fond: feuille("theme", { light: srgb("#FFFFFF"), dark: srgb("#121212") }),
    bleu: feuille("theme", { light: srgb("#1D4ED8"), dark: srgb("#93C5FD") }),
    vert: feuille("theme", { light: srgb("#15803D"), dark: srgb("#1F3D2A") }),
    pale: feuille("theme", { light: srgb("#BFDBFE"), dark: srgb("#1E3A8A") }),
    anneau: feuille("theme", { light: srgb("#1E40AF"), dark: srgb("#BFDBFE") }),
  },
  marque: {
    texte: feuille("brand", { acme: "{base.bleu}", zen: "{base.vert}" }),
  },
  composants: {
    bouton: {
      fond: alias("base.fond"),
      texte: alias("marque.texte"),
      "texte-bleu": alias("base.bleu"),
      "texte-pale": alias("base.pale"),
      anneau: alias("base.anneau"),
      "anneau-pale": alias("base.pale"),
    },
  },
};

/** Un bouton : un fond à la racine, un libellé dans le slot `label`, un anneau sur le slot `cadre`. */
function bouton(variants) {
  return {
    meta: { contractVersion: CONTRACT_VERSION },
    rendering: { roles: {}, keyRoles: {} },
    stateModel: { axis: "state", states: {}, precedence: [] },
    variantViews: { vue: { structure: "arbre", paintPlacements: "peintures" } },
    viewStructures: { arbre: { children: [] } },
    viewPaintPlacements: { peintures: { fills: { background: [[]], foreground: [["label"]] }, strokes: { ring: [["cadre"]] } } },
    variants: variants.map(({ etat = "default", texte, anneau }) => ({
      values: { state: etat },
      view: "vue",
      tokens: { background: "{composants.bouton.fond}", foreground: `{composants.bouton.${texte}}` },
      ...(anneau ? { strokes: { ring: { color: `{composants.bouton.${anneau}}`, width: null, align: "outside" } } } : {}),
    })),
  };
}

test("les exports sont ceux des contrastes, et l'ancienne table des emplois a disparu", () => {
  for (const nom of ["constatsDesContrastes", "sectionContrastes", "resumeTerminalContrastes"]) {
    assert.equal(typeof diagnostic[nom], "function", nom);
    assert.equal(typeof navigateur[nom], "function", nom);
  }
  assert.equal("porteLaTableDesEmplois" in diagnostic, false);
  assert.equal("constatsDesEmplois" in navigateur, false);
});

test("un texte sous 4,5:1 dans un seul contexte : le constat nomme la marque et le thème", () => {
  const [constat, ...autres] = constatsDesContrastes(bouton([{ texte: "texte" }]), TOKENS);
  assert.deepEqual(autres, []);
  assert.equal(constat.nature, "contraste");
  assert.equal(constat.cle, "foreground");
  assert.equal(constat.fond, "background");
  assert.equal(constat.seuil, 4.5);
  assert.equal(constat.vise, "marque.texte");
  assert.deepEqual(constat.mesures.map(({ contexte }) => contexte), ["marque zen, thème dark"]);
  assert.ok(constat.mesures[0].valeur > 1 && constat.mesures[0].valeur < 4.5);

  const markdown = sectionContrastes([{ fichier: "Button.contract.json", contrastes: [constat] }]).join("\n");
  assert.match(markdown, /\*\*`Button\.contract\.json`\*\*, state=default, clé `foreground`/);
  assert.match(markdown, /\(marque zen, thème dark\) sur le fond `background`, sous 4,5:1\./);
});

test("un anneau sous 3:1 contre le fond de son composant", () => {
  const [constat, ...autres] = constatsDesContrastes(bouton([{ texte: "texte-bleu", anneau: "anneau-pale" }]), TOKENS);
  assert.deepEqual(autres, []);
  assert.equal(constat.role, "ring");
  assert.equal(constat.seuil, 3);
  assert.deepEqual(constat.mesures.map(({ contexte }) => contexte), ["thème light", "thème dark"]);
  assert.match(sectionContrastes([{ fichier: "B.contract.json", contrastes: [constat] }]).join("\n"), /sous 3:1\./);
});

test("S5 : le résumé du rapport interpole les seuils du référentiel, et la phrase d'un constat écrit son seuil en entier", () => {
  const constat = { fichier: "B.contract.json", contrastes: [{ nature: "contraste", variant: "state=default", cle: "foreground", role: "foreground", fond: "background", seuil: 4.25, mesures: [{ contexte: "thème dark", valeur: 4.1 }] }] };
  const markdown = sectionContrastes([constat]).join("\n");
  assert.match(markdown, /Le seuil est de 4,5:1 pour un texte ou une icône, et de 3:1 pour un contour ou un anneau\. Un texte en grand corps tient à partir de 3:1,/);
  assert.match(markdown, /sous 4,25:1\./);
});

test("un contrat conforme n'a aucun constat", () => {
  const contrat = bouton([
    { texte: "texte-bleu", anneau: "anneau" },
    { etat: "hover", texte: "texte-bleu" },
  ]);
  assert.deepEqual(constatsDesContrastes(contrat, TOKENS), []);
});

test("le diagnostic s'applique à un tokens.json sans collection `usage` ni `theme`", () => {
  assert.deepEqual(Object.keys(TOKENS).filter((nom) => nom === "usage" || nom === "theme"), []);
  assert.equal(constatsDesContrastes(bouton([{ texte: "texte-pale" }]), TOKENS).length, 1);
  assert.deepEqual(constatsDesContrastes(bouton([{ texte: "texte-pale" }]), null), []);
});

test("une couleur Display P3 ne se juge pas et se dit non vérifiée, sans effacer les autres contextes", () => {
  const p3 = structuredClone(TOKENS);
  p3.base.pale.$extensions["com.ucm.modes"].dark = { colorSpace: "display-p3", components: [0.2, 0.3, 0.9], alpha: 1 };
  const [constat, ...autres] = constatsDesContrastes(bouton([{ texte: "texte-pale" }]), p3);
  assert.deepEqual(constat.mesures.map(({ contexte }) => contexte), ["thème light"]);
  assert.deepEqual(autres, [{ nature: "non-verifiee", chemin: "composants.bouton.texte-pale", cause: "display-p3" }]);
  const ligne = sectionContrastes([{ fichier: "B.contract.json", contrastes: autres }]).join("\n");
  assert.match(ligne, /^### ℹ️ Des couleurs n'ont pas été vérifiées \(1 couleur\)$/m);
  assert.match(ligne, /^- Couleur non vérifiée : `composants\.bouton\.texte-pale`, couleur Display P3, hors du périmètre d'UCM\.$/m);
  assert.equal(resumeTerminalContrastes([{ contrastes: autres }]), null);
});

test("une couleur translucide se compose sur son fond avant d'être mesurée", () => {
  const translucide = structuredClone(TOKENS);
  translucide.base.pale.$extensions["com.ucm.modes"] = { light: srgb("#BFDBFE", 0.5), dark: srgb("#1E3A8A", 0.5) };
  const constats = constatsDesContrastes(bouton([{ texte: "texte-pale" }]), translucide);
  assert.deepEqual(constats.map(({ nature }) => nature), ["contraste"]);
  const [clair, sombre] = [["#BFDBFE", "#FFFFFF"], ["#1E3A8A", "#121212"]].map(([haut, bas]) => {
    const octets = (hexa) => [1, 3, 5].map((debut) => Number.parseInt(hexa.slice(debut, debut + 2), 16));
    return contraste(octets(haut).map((octet, rang) => Math.round((octet * 0.5 + octets(bas)[rang] * 0.5))), octets(bas));
  });
  const attendues = new Map(constats[0].mesures.map(({ contexte, valeur }) => [contexte, valeur]));
  assert.ok(Math.abs(attendues.get("thème light") - clair) < 0.05, `${attendues.get("thème light")} contre ${clair}`);
  assert.ok(Math.abs(attendues.get("thème dark") - sombre) < 0.05, `${attendues.get("thème dark")} contre ${sombre}`);
});

/** Un contrat où une clé `k`, d'un rôle donné, vit d'un côté du contrat sur un fond `background` ; la couleur `texte-pale` passe sous tous les seuils. */
function contratAvecUnRole(cote, role, roles) {
  const reference = "{composants.bouton.texte-pale}";
  return {
    meta: { contractVersion: CONTRACT_VERSION },
    rendering: { roles, keyRoles: { [cote]: { k: role } } },
    variantViews: { vue: { structure: "arbre", paintPlacements: "peintures" } },
    viewStructures: { arbre: { children: [] } },
    viewPaintPlacements: { peintures: { fills: { background: [[]], ...(cote === "fills" ? { k: [["cadre"]] } : {}) }, strokes: cote === "strokes" ? { k: [["cadre"]] } : {} } },
    variants: [{
      values: { state: "default" },
      view: "vue",
      tokens: { background: "{composants.bouton.fond}", ...(cote === "fills" ? { k: reference } : {}) },
      ...(cote === "strokes" ? { strokes: { k: { color: reference, width: null, align: "outside" } } } : {}),
    }],
  };
}

test("les rôles jugés viennent de la table du kit : peinture du côté des tokens, contour du côté des strokes", () => {
  for (const identifiant of identifiantsDeRoles()) {
    for (const cote of ["fills", "strokes"]) {
      const natureDuCote = cote === "fills" ? "peinture" : "contour";
      // Le fond n'a pas de seuil : il sert de fond aux autres, il n'est pas jugé.
      const attendu = identifiant !== "background" && natureDuRole(identifiant) === natureDuCote;
      const contrat = contratAvecUnRole(cote, identifiant, {});
      assert.equal(constatsDesContrastes(contrat, TOKENS).length, attendu ? 1 : 0, `${identifiant} côté ${cote}`);
    }
  }
});

test("un contrat ancien se lit avec la table qu'il porte, pas avec celle du kit", () => {
  const tableDuKit = tableDesRolesDeRendu();
  const sansAnneau = { background: tableDuKit.background, foreground: tableDuKit.foreground, border: tableDuKit.border };
  // `ring` est un contour dans la table du kit ; ce contrat ne le connaît pas, donc il n'est pas jugé.
  assert.equal(constatsDesContrastes(contratAvecUnRole("strokes", "ring", sansAnneau), TOKENS).length, 0);
  assert.equal(constatsDesContrastes(contratAvecUnRole("strokes", "ring", tableDuKit), TOKENS).length, 1);
  // `icon` est une peinture dans la table du kit ; ce contrat en fait un contour.
  const iconEnContour = { ...tableDuKit, icon: { kind: "stroke", cssProperties: ["box-shadow"] } };
  assert.equal(constatsDesContrastes(contratAvecUnRole("fills", "icon", iconEnContour), TOKENS).length, 0);
  assert.equal(constatsDesContrastes(contratAvecUnRole("strokes", "icon", iconEnContour), TOKENS).length, 1);
});

test("la section est une information qui ne bloque pas, et le terminal le répète", () => {
  const bilans = [{ fichier: "Button.contract.json", contrastes: constatsDesContrastes(bouton([{ texte: "texte-pale", anneau: "anneau-pale" }]), TOKENS) }];
  const section = sectionContrastes(bilans);
  assert.match(section[0], /^### ℹ️ Des couleurs passent sous le contraste attendu \(2 couleurs\)$/);
  assert.doesNotMatch(section.join("\n"), /⚠️|❌/);
  assert.match(section.join("\n"), /grand corps/);
  assert.match(section.join("\n"), /Cette information ne bloque pas la fusion\./);
  assert.match(resumeTerminalContrastes(bilans), /^ℹ 2 couleurs sous le contraste attendu dans les contrats\..*ne bloque pas la fusion\.$/);
  assert.deepEqual(sectionContrastes([{ fichier: "Vide.contract.json", contrastes: [] }]), []);
  assert.equal(resumeTerminalContrastes([]), null);
});

test("le rapport d'un repository jouet range les couleurs sous leur seuil en information, sans bloquer", () => {
  const configuration = { components: "src", tokens: "src/tokens/tokens.json", implementation: "{dir}/{id}.tsx" };
  const racine = mkdtempSync(join(tmpdir(), "ucm-contrastes-"));
  try {
    const dossier = join(racine, "src", "components", "Widget");
    mkdirSync(dossier, { recursive: true });
    mkdirSync(join(racine, "src", "tokens"), { recursive: true });
    writeFileSync(join(racine, configuration.tokens), JSON.stringify(TOKENS));
    const contrat = {
      name: "Widget",
      meta: { contractVersion: CONTRACT_VERSION, exportedAt: "2026-01-01T00:00:00.000Z", figma: { fileName: "f", nodeId: "1:1" }, coverage: { portable: "complete" } },
      viewStructures: { st1: { layout: "flex-row", sizing: { width: "fit-content", height: "fit-content" }, children: [{ slot: "label" }] } },
      variantViews: { v1: { structure: "st1", paintPlacements: "p1" } },
      viewPaintPlacements: { p1: { fills: { background: [[]], foreground: [["label"]] } } },
      variants: [{
        nodeId: "1:2",
        figmaName: "Default",
        values: {},
        tokens: { background: "{composants.bouton.fond}", foreground: "{composants.bouton.texte-pale}" },
        view: "v1",
      }],
      structure: { view: "st1" },
      rendering: { roles: {} },
    };
    writeFileSync(join(dossier, "Widget.contract.json"), JSON.stringify(contrat));
    writeFileSync(join(dossier, "Widget.tsx"), "export interface WidgetProps { children?: unknown }\nexport function Widget(_props: WidgetProps) { return null; }\n");

    const { bloquant, rapport, terminal } = controlerRepository(racine, { configuration });
    assert.equal(bloquant, false);
    assert.match(rapport, /^## ✅ Aucun blocage détecté$/m);
    assert.match(rapport, /### ℹ️ Des couleurs passent sous le contraste attendu \(1 couleur\)/);
    assert.match(rapport, /clé `foreground`, qui vise `base\.pale`/);
    assert.match(rapport, /Cette information ne bloque pas la fusion\./);
    assert.ok(terminal.some(({ flux, texte }) => flux === "log" && /1 couleur sous le contraste attendu/.test(texte)));
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("une couleur hexadécimale ou sans alpha n'est pas mesurée : valeurDuToken la refuse, comme la projection et tokens css", () => {
  const fond = { $type: "color", $value: { colorSpace: "srgb", components: [1, 1, 1], alpha: 1 } };
  const ecrits = {
    hexadecimal: { $type: "color", $value: "#fefefe" },
    "sans-alpha": { $type: "color", $value: { colorSpace: "srgb", components: [0.99, 0.99, 0.99] } },
  };
  for (const [forme, couleur] of Object.entries(ecrits)) {
    const document = { composants: { bouton: { fond, texte: couleur } } };
    assert.deepEqual(constatsDesContrastes(bouton([{ texte: "texte" }]), document), [], forme);
  }
});
