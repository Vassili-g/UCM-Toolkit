/**
 * Le diagnostic des emplois : un contrat par constat, support, paire, état et
 * hors de la table, puis un contrat conforme sans constat. Le fond d'une
 * couleur suit la règle de FORMAT.md, section 2.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
  constatsDesEmplois,
  porteLaTableDesEmplois,
  resumeTerminalEmplois,
  sectionEmplois,
} from "../src/lecteurs/diagnostic-emplois.mjs";

/** Une couleur DTCG sRGB depuis un hexa. */
const srgb = (hexa) => ({
  colorSpace: "srgb",
  components: [1, 3, 5].map((debut) => Number.parseInt(hexa.slice(debut, debut + 2), 16) / 255),
  alpha: 1,
});

/** Une feuille de `theme`, une valeur par thème. */
const theme = (light, dark) => ({
  $type: "color",
  $value: srgb(light),
  $extensions: { "com.ucm.axis": "theme", "com.ucm.modes": { light: srgb(light), dark: srgb(dark) } },
});
const alias = (chemin) => ({ $type: "color", $value: `{${chemin}}` });

/** Un fichier de tokens qui porte la collection `usage` (D13), sur un axe de thème. */
const TOKENS = {
  $extensions: { "com.ucm.axes": { theme: { modes: ["light", "dark"], default: "light" } } },
  theme: {
    primary: {
      100: theme("#DBEAFE", "#1E3A8A"),
      300: theme("#93C5FD", "#1D4ED8"),
      600: theme("#2563EB", "#60A5FA"),
      700: theme("#1D4ED8", "#93C5FD"),
      800: theme("#1E40AF", "#BFDBFE"),
    },
    neutral: { 50: theme("#F7F7F7", "#121212") },
    elevation: { page: theme("#F7F7F7", "#121212") },
  },
  usage: {
    primary: {
      solid: { default: alias("theme.primary.700"), hover: alias("theme.primary.800") },
      text: { default: alias("theme.primary.700") },
      "on-solid": alias("theme.neutral.50"),
      focus: alias("theme.primary.600"),
    },
    elevation: { page: alias("theme.elevation.page") },
  },
  components: {
    button: {
      solid: alias("usage.primary.solid.default"),
      "solid-hover": alias("usage.primary.solid.hover"),
      "on-solid": alias("usage.primary.on-solid"),
      text: alias("usage.primary.text.default"),
      focus: alias("usage.primary.focus"),
      "hors-table": alias("theme.primary.300"),
    },
  },
};

/** Un bouton : un fond à la racine, un libellé dans le slot `label`, un anneau à la racine. */
function bouton(variants) {
  return {
    meta: { contractVersion: "14.0" },
    rendering: { roles: {}, keyRoles: {} },
    stateModel: { axis: "state", states: {}, precedence: [] },
    variantViews: { vue: { structure: "arbre", paintPlacements: "peintures" } },
    viewStructures: { arbre: { children: [] } },
    viewPaintPlacements: { peintures: { fills: { background: [[]], foreground: [["label"]] }, strokes: { ring: [[]] } } },
    variants: variants.map(({ etat, fond, texte, anneau }) => ({
      values: { state: etat },
      view: "vue",
      tokens: { background: `{components.button.${fond}}`, foreground: `{components.button.${texte}}` },
      ...(anneau ? { strokes: { ring: { color: `{components.button.${anneau}}`, width: null, align: "outside" } } } : {}),
    })),
  };
}

test("un fichier de tokens sans collection `usage` ne reçoit aucun constat", () => {
  const { usage: _usage, ...sansUsage } = TOKENS;
  assert.equal(porteLaTableDesEmplois(sansUsage), false);
  assert.deepEqual(constatsDesEmplois(bouton([{ etat: "default", fond: "solid", texte: "text" }]), sansUsage), []);
});

test("un contrat conforme à la table n'a aucun constat : on-solid sur solid à chaque rang, l'anneau focus sur la page", () => {
  const contrat = bouton([
    { etat: "default", fond: "solid", texte: "on-solid" },
    { etat: "hover", fond: "solid-hover", texte: "on-solid" },
    { etat: "focus", fond: "solid", texte: "on-solid", anneau: "focus" },
  ]);
  assert.deepEqual(constatsDesEmplois(contrat, TOKENS), []);
});

test("support : un emploi de fond posé en texte", () => {
  const constats = constatsDesEmplois(bouton([{ etat: "default", fond: "solid", texte: "solid" }]), TOKENS);
  assert.deepEqual(constats.map(({ nature, cle, usage, role }) => ({ nature, cle, usage, role })), [
    { nature: "support", cle: "foreground", usage: "usage.primary.solid.default", role: "foreground" },
  ]);
});

test("paire : text sur solid n'est pas une paire de la table ; le contraste se mesure dans chaque thème", () => {
  const [constat, ...autres] = constatsDesEmplois(bouton([{ etat: "default", fond: "solid", texte: "text" }]), TOKENS);
  assert.deepEqual(autres, []);
  assert.equal(constat.nature, "paire");
  assert.equal(constat.usage, "usage.primary.text.default");
  assert.equal(constat.usageDuFond, "usage.primary.solid.default");
  assert.equal(constat.fond, "background");
  // Le texte et son fond visent la même nuance : 1:1 dans les deux thèmes.
  assert.deepEqual(constat.contrastes, [{ contexte: "light", valeur: 1 }, { contexte: "dark", valeur: 1 }]);
});

test("état : un variant hover qui garde le fond du rang default", () => {
  const constats = constatsDesEmplois(bouton([{ etat: "hover", fond: "solid", texte: "on-solid" }]), TOKENS);
  assert.deepEqual(constats.map(({ nature, usage, rangAttendu, rang }) => ({ nature, usage, rangAttendu, rang })), [
    { nature: "etat", usage: "usage.primary.solid.default", rangAttendu: "hover", rang: "default" },
  ]);
});

test("hors de la table : un texte qui vise `theme` directement, avec son contraste sur son fond", () => {
  const [constat, ...autres] = constatsDesEmplois(bouton([{ etat: "default", fond: "solid", texte: "hors-table" }]), TOKENS);
  assert.deepEqual(autres, []);
  assert.equal(constat.nature, "hors-table");
  assert.equal(constat.vise, "theme.primary.300");
  assert.deepEqual(constat.contrastes.map(({ contexte }) => contexte), ["light", "dark"]);
  assert.ok(constat.contrastes.every(({ valeur }) => valeur > 1 && valeur < 4.5));
});

test("une couleur hors de sRGB se relève comme non jugée", () => {
  const p3 = structuredClone(TOKENS);
  p3.theme.primary[300].$extensions["com.ucm.modes"].dark = { colorSpace: "display-p3", components: [0.2, 0.3, 0.9], alpha: 1 };
  const [constat] = constatsDesEmplois(bouton([{ etat: "default", fond: "solid", texte: "hors-table" }]), p3);
  assert.equal(constat.contrastes[1].valeur, null);
  const markdown = sectionEmplois([{ fichier: "Button.contract.json", emplois: [constat] }]).join("\n");
  assert.match(markdown, /non jugé \(dark\), couleur hors sRGB ou translucide/);
});

test("la section et le terminal avertissent sans bloquer, et nomment chaque couleur", () => {
  const contrat = bouton([
    { etat: "default", fond: "solid", texte: "solid" },
    { etat: "hover", fond: "solid", texte: "text" },
  ]);
  const bilans = [{ fichier: "Button.contract.json", emplois: constatsDesEmplois(contrat, TOKENS) }];
  const markdown = sectionEmplois(bilans).join("\n");
  assert.match(markdown, /Des couleurs s'écartent de la table des emplois/);
  assert.match(markdown, /`usage\.primary\.solid\.default` peint un background, posé ici en foreground/);
  assert.match(markdown, /l'état `hover` demande le rang `hover`, et `usage\.primary\.solid\.default` vise le rang `default`/);
  assert.match(markdown, /ne forme pas une paire de la table au même rang\. Contraste mesuré : 1,00:1 \(light\), 1,00:1 \(dark\)\./);
  assert.match(markdown, /ne bloque pas la fusion/);
  assert.match(resumeTerminalEmplois(bilans), /^⚠ 4 écarts à la table des emplois dans les contrats\./);
  assert.deepEqual(sectionEmplois([{ fichier: "Vide.contract.json", emplois: [] }]), []);
  assert.equal(resumeTerminalEmplois([]), null);
});
