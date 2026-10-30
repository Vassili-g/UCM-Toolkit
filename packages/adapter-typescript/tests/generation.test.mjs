import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { genererTypes, rendreGeneration, typesDuContrat } from "../src/index.mjs";

function contrat() {
  return {
    name: "Button",
    props: {
      color: { type: "enum", values: ["secondary", "primary"] },
      size: { type: "enum", values: ["sm", "lg"] },
      disabled: { type: "boolean" },
    },
    structure: { variantAxes: ["color", "size"] },
    variants: [
      { values: { color: "secondary", size: "sm" } },
      { values: { color: "primary", size: "lg" } },
    ],
  };
}

test("les types gardent les unions et la matrice clairsemée exacte", () => {
  const resultat = typesDuContrat(contrat());

  assert.equal(resultat.nombreUnions, 2);
  assert.match(resultat.contenu, /export type ButtonColor = "secondary" \| "primary"/);
  assert.match(resultat.contenu, /\{ "color": "secondary"; "size": "sm" \}/);
  assert.doesNotMatch(resultat.contenu, /"secondary"; "size": "lg"/);
});

test("un repository neuf, sans dossier de contrats, ne génère aucun type et ne lève pas", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-adapter-typescript-"));
  try {
    const resultat = genererTypes(racine);
    assert.deepEqual(resultat.generes, []);
    assert.deepEqual(resultat.omis, []);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("la génération suit les chemins du repository et accepte une sortie configurable", () => {
  const racine = mkdtempSync(join(tmpdir(), "ucm-adapter-typescript-"));
  try {
    mkdirSync(join(racine, "design", "Button"), { recursive: true });
    writeFileSync(
      join(racine, "ucm.config.json"),
      JSON.stringify({ components: "design" }),
      "utf8",
    );
    writeFileSync(
      join(racine, "design", "Button", "Button.contract.json"),
      JSON.stringify(contrat()),
      "utf8",
    );

    const resultat = genererTypes(racine, { dossierSortie: "generated" });
    const genere = readFileSync(join(racine, "generated", "Button.ts"), "utf8");

    assert.equal(resultat.generes.length, 1);
    assert.match(genere, /NE PAS ÉDITER À LA MAIN/);
    assert.match(rendreGeneration(resultat), /2 unions générées/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("le nom d'un type de prop suit codeIdentifier : accents retirés, bosses de casse coupées", () => {
  const resultat = typesDuContrat({
    name: "Button",
    props: {
      libellé: { type: "enum", values: ["court", "long"] },
      iconLeft: { type: "enum", values: ["none", "icon"] },
      "tone-fort": { type: "enum", values: ["a", "b"] },
    },
  });

  assert.match(resultat.contenu, /export type ButtonLibelle = "court" \| "long"/);
  assert.match(resultat.contenu, /export type ButtonIconLeft = /);
  assert.match(resultat.contenu, /export type ButtonToneFort = /);
});

test("une prop dont le nom commence par un chiffre reçoit le préfixe de codeIdentifier", () => {
  const resultat = typesDuContrat({ name: "Button", props: { "2xl": { type: "enum", values: ["a", "b"] } } });

  assert.match(resultat.contenu, /export type Button2xl = "a" \| "b"/);
});
