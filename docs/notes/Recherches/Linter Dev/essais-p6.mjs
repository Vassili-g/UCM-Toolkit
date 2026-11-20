/**
 * Rejoue les essais de cadrage de P6 sur ESLint et Stylelint.
 * UCM_P6_DEPENDANCES désigne le dossier temporaire où leurs versions sont
 * installées. Les essais écrivent leurs cas dans un nouveau dossier temporaire.
 * La règle ESLint témoin mesure le cache, sans implémenter les règles UCM.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

if (!process.env.UCM_P6_DEPENDANCES) {
  throw new Error("Définissez UCM_P6_DEPENDANCES selon RECHERCHE-CADRAGE-P6.md.");
}
const dependances = path.resolve(process.env.UCM_P6_DEPENDANCES);
const charger = createRequire(path.join(dependances, "package.json"));
const { ESLint, Linter } = charger("eslint");
const parser = charger("@typescript-eslint/parser");
const stylelint = charger("stylelint");
const analyserValeur = charger("postcss-value-parser");
const dossier = fs.mkdtempSync(path.join(tmpdir(), "ucm-p6-essais-"));
const fichierSource = path.join(dossier, "component.js");
const fichierTokens = path.join(dossier, "tokens.json");
fs.writeFileSync(fichierSource, 'export const gap = "var(--ucm-gap)";\n');

let appels = 0;
const regleTemoin = {
  meta: { type: "problem", schema: [], messages: { absent: "Token absent" } },
  create(context) {
    appels++;
    const connus = JSON.parse(fs.readFileSync(fichierTokens, "utf8"));
    return {
      Program(node) {
        if (!connus.includes("--ucm-gap")) context.report({ node, messageId: "absent" });
      },
    };
  },
};

/** Une instance neuve garde le même fichier de cache entre deux exécutions. */
async function controler(strategie, cache, revision) {
  const eslint = new ESLint({
    cwd: dossier,
    overrideConfigFile: true,
    cache,
    cacheLocation: path.join(dossier, ".cache-" + strategie),
    cacheStrategy: strategie,
    overrideConfig: [{
      files: ["**/*.js"],
      settings: { revision },
      plugins: { recherche: {
        meta: { name: "p6-recherche", version: "1" },
        rules: { token: regleTemoin },
      } },
      rules: { "recherche/token": "error" },
    }],
  });
  return (await eslint.lintFiles([fichierSource]))[0].errorCount;
}

const resultatsCache = [];
for (const strategie of ["metadata", "content"]) {
  fs.writeFileSync(fichierTokens, JSON.stringify(["--ucm-gap"]));
  const premier = await controler(strategie, true, "a");
  const avant = appels;
  fs.writeFileSync(fichierTokens, "[]");
  const perime = await controler(strategie, true, "a");
  const regleNonAppelee = appels === avant;
  const sansCache = await controler(strategie, false, "a");
  const revisionChangee = await controler(strategie, true, "b");
  assert.deepEqual([premier, perime, sansCache, revisionChangee, regleNonAppelee], [0, 0, 1, 1, true]);
  resultatsCache.push({ strategie, premier, perime, sansCache, revisionChangee, regleNonAppelee });
}

const valeurs = [];
const extraction = {
  meta: { schema: [], messages: { fait: "Valeur extraite" } },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.name !== "style") return;
        const expression = node.value?.expression;
        if (expression?.type !== "ObjectExpression") return;
        for (const propriete of expression.properties) {
          if (propriete.type !== "Property") continue;
          valeurs.push({
            propriete: propriete.key.name ?? propriete.key.value,
            type: propriete.value.type,
            valeur: propriete.value.value ?? null,
            plage: propriete.value.range,
          });
          context.report({ node: propriete.value, messageId: "fait" });
        }
      },
    };
  },
};
fs.writeFileSync(path.join(dossier, "Demo.tsx"), "export const Demo = () => <button style={{ padding: 8 }} />;");
const tampon = "export const Demo = () => <button style={{ padding: 12, width: runtimeWidth, color: 'var(--missing)' }} />;";
const messages = new Linter().verify(tampon, [{
  files: ["**/*.tsx"],
  languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { recherche: { rules: { extraction } } },
  rules: { "recherche/extraction": "error" },
}], { filename: "Demo.tsx" });
assert.equal(messages.length, 3);
assert.deepEqual(valeurs.map((valeur) => valeur.type), ["Literal", "Identifier", "Literal"]);
assert.equal(valeurs[0].valeur, 12);

const casCss = [
  ["literal", "a{color:red}"],
  ["repli", "a{color:var(--absent,red)}"],
  ["locale", "a{--x:8px;padding:var(--x)}"],
  ["inconnue-et-brut", "a{padding:var(--absent) 8px}"],
  ["connue-et-brut", "a{--x:8px;padding:var(--x) 8px}"],
];
const resultatsCss = [];
for (const [id, code] of casCss) {
  const inconnues = await stylelint.lint({ code, config: { rules: { "no-unknown-custom-properties": true } } });
  const brutes = await stylelint.lint({ code, config: { rules: { "value-type-custom-property-required-list": ["color", "length"] } } });
  resultatsCss.push({ id, inconnues: inconnues.results[0].warnings.length, brutes: brutes.results[0].warnings.length });
}
assert.deepEqual(resultatsCss.map((resultat) => [resultat.inconnues, resultat.brutes]), [[0, 1], [0, 0], [0, 0], [1, 0], [0, 1]]);

const variables = [];
analyserValeur("var(--absent, var(--fallback, 8px)) 12px").walk((node) => {
  if (node.type === "function" && node.value === "var") {
    variables.push(node.nodes.find((enfant) => enfant.type === "word")?.value);
  }
});
assert.deepEqual(variables, ["--absent", "--fallback"]);

const versions = Object.fromEntries(
  ["eslint", "@typescript-eslint/parser", "stylelint", "postcss", "postcss-value-parser"].map((nom) => [
    nom, JSON.parse(fs.readFileSync(path.join(dependances, "node_modules", nom, "package.json"), "utf8")).version,
  ]),
);
console.log(JSON.stringify({
  node: process.version,
  versions,
  cache: resultatsCache,
  tampon: { paddingSurDisque: 8, valeurs, positions: messages.map(({ line, column }) => ({ line, column })) },
  css: resultatsCss,
  variablesImbriquees: variables,
}, null, 2));
