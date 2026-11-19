import assert from "node:assert/strict";
import test from "node:test";
import {
  resumeTerminalTokensManquants,
  sectionTokensManquants,
} from "../src/lecteurs/diagnostic-tokens.mjs";

const sourceTokens = "src/tokens/tokens.json";

const CONTRAT_AVEC_REFERENCE_ABSENTE = [{
  id: "StressTest",
  manquants: ["{components.stresstest.info.scalewrap.colors.scale-1}"],
}];

test("des tokens retirés laissent le contrat en retard : la section le dit et ne bloque pas", () => {
  const markdown = sectionTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, {
    tokensModifies: true,
    sourceTokens,
  }).join("\n");
  const terminal = resumeTerminalTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, sourceTokens);

  assert.match(markdown, /### ⚠️ Des contrats citent des tokens retirés \(1 contrat\)/);
  assert.match(markdown, /Cette demande retire des tokens que ces contrats citent encore\./);
  assert.match(markdown, /- StressTest : `components\.stresstest\.info\.scalewrap\.colors\.scale-1`/);
  assert.match(markdown, /Le designer doit réexporter ces composants depuis Figma\./);
  assert.match(markdown, /Ce retard ne bloque pas la fusion\./);
  assert.match(terminal, /Ce retard ne bloque pas la fusion\./);
});

test("hors demande de tokens, la section ne prétend pas que la demande retire les tokens", () => {
  const markdown = sectionTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, {
    tokensModifies: false,
    sourceTokens,
  }).join("\n");

  assert.match(markdown, /Ces contrats citent encore des tokens que `src\/tokens\/tokens\.json` ne contient plus\./);
  assert.doesNotMatch(markdown, /Cette demande retire/);
});

test("V-07 : un token absent qui bloque donne le geste du designer et ne dit pas qu'il ne bloque pas", () => {
  const markdown = sectionTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, {
    bloquant: true,
    sourceTokens,
  }).join("\n");
  const terminal = resumeTerminalTokensManquants(CONTRAT_AVEC_REFERENCE_ABSENTE, sourceTokens, { bloquant: true });

  assert.match(markdown, /### ❌ Des contrats citent des tokens absents \(1 contrat\)/);
  assert.match(markdown, /`src\/tokens\/tokens\.json` est la source de vérité/);
  assert.match(markdown, /- StressTest : `components\.stresstest\.info\.scalewrap\.colors\.scale-1`/);
  assert.match(markdown, /Le designer doit fusionner d'abord la demande des tokens, puis relancer ce contrôle\./);
  assert.match(markdown, /La fusion reste bloquée\./);
  assert.match(terminal, /Fusionnez d'abord la demande des tokens, puis relancez ce contrôle\./);
  assert.doesNotMatch(`${markdown}\n${terminal}`, /ne bloque pas|n'empêche pas/);
});

test("une entrée sans identifiant se nomme par son fichier", () => {
  const markdown = sectionTokensManquants([{ fichier: "Alert.contract.json", manquants: ["{a.b}"] }], { sourceTokens }).join("\n");

  assert.match(markdown, /- Alert\.contract\.json : `a\.b`/);
});

test("aucune référence absente ne produit de section", () => {
  assert.deepEqual(sectionTokensManquants([], { tokensModifies: true, sourceTokens }), []);
  assert.deepEqual(sectionTokensManquants([], { bloquant: true, sourceTokens }), []);
  assert.equal(resumeTerminalTokensManquants([], sourceTokens), null);
});
