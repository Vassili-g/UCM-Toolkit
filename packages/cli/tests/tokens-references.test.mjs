/**
 * `ucm tokens references` sur des repositories temporaires : G4 et G6 à G12 du
 * plan P6 (lot 1.3). Les cas d'aides G1 à G3 sont dans `guide.test.mjs`.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { executer } from "../src/ucm.mjs";

const TOKENS = {
  $extensions: { "com.ucm.formatVersion": 2 },
  café: { fond: { $type: "color", $value: "#ffffff" } },
  a: { b: { $type: "number", $value: 1 } },
};

/** Monte un repository, lance `ucm tokens references` et rend sa sortie et les fichiers relus. */
function lancer(fichiers, arguments_, { tokens = TOKENS } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-references-"));
  try {
    const contenus = { "ucm.config.json": "{}", "tokens.json": JSON.stringify(tokens), ...fichiers };
    for (const [chemin, contenu] of Object.entries(contenus)) {
      mkdirSync(dirname(join(racine, chemin)), { recursive: true });
      writeFileSync(join(racine, chemin), contenu);
    }
    const log = [];
    const erreurs = [];
    const code = executer(["tokens", "references", ...arguments_], { racine, ecrire: (t) => log.push(t), alerter: (t) => erreurs.push(t) });
    const relus = Object.fromEntries(Object.keys(fichiers).map((chemin) => [chemin, readFileSync(join(racine, chemin), "utf8")]));
    return { code, log: log.join("\n"), erreur: erreurs.join("\n"), relus };
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test("G4 : une chaîne qui est une référence devient var(--nom), guillemets gardés", () => {
  const { code, relus } = lancer({ "a.ts": "const s = { c: \"{café.fond}\", d: '{a.b}' };\n" }, ["a.ts"]);
  assert.equal(code, 0);
  assert.equal(relus["a.ts"], "const s = { c: \"var(--cafe-fond)\", d: 'var(--a-b)' };\n");
});

test("G6 : une référence absente et une référence dans un gabarit restent, nommées avec fichier et ligne", () => {
  const source = "const x = \"{inconnu.token}\";\nconst y = `calc({a.b} * 2)`;\nconst z = \"marge {a.b} ici\";\n";
  const { code, erreur, relus } = lancer({ "a.ts": source }, ["a.ts"]);
  assert.equal(code, 1);
  assert.equal(relus["a.ts"], source);
  assert.match(erreur, /a\.ts:1 : \{inconnu\.token\} reste en place, absente de tokens\.json/);
  assert.match(erreur, /a\.ts:2 : \{a\.b\} reste en place, dans un gabarit/);
  assert.match(erreur, /a\.ts:3 : \{a\.b\} reste en place, dans une chaîne plus longue/);
});

test("G7 : deux chemins au même nom CSS arrêtent la commande avant toute écriture", () => {
  const tokens = { $extensions: { "com.ucm.formatVersion": 2 }, a: { b: { $type: "number", $value: 1 }, B: { $type: "number", $value: 2 } } };
  const source = "const x = \"{a.b}\";\n";
  const { code, erreur, relus } = lancer({ "a.ts": source }, ["a.ts"], { tokens });
  assert.equal(code, 2);
  assert.match(erreur, /--a-b/);
  assert.equal(relus["a.ts"], source);
});

test("G8 : un second passage ne change rien, et --verifier sort en 0 puis en 1 sur un reste", () => {
  const premier = lancer({ "a.ts": "const x = \"{a.b}\";\n" }, ["a.ts"]);
  const apres = premier.relus["a.ts"];
  const second = lancer({ "a.ts": apres }, ["a.ts"]);
  assert.equal(second.relus["a.ts"], apres);
  assert.match(second.log, /Aucune référence à remplacer/);
  assert.equal(lancer({ "a.ts": apres }, ["--verifier", "a.ts"]).code, 0);

  const reste = lancer({ "a.ts": "const x = \"{a.b}\";\n" }, ["--verifier", "a.ts"]);
  assert.equal(reste.code, 1);
  assert.equal(reste.relus["a.ts"], "const x = \"{a.b}\";\n");
  assert.match(reste.erreur, /a\.ts:1 : \{a\.b\} reste à remplacer/);
});

test("G9 : une section resolution-token des conventions refuse l'écriture, et --verifier sort en 0", () => {
  const fichiers = { "a.ts": "const x = \"{a.b}\";\n", ".ucm/conventions.md": "## resolution-token\nFonction maison.\n" };
  const ecriture = lancer(fichiers, ["a.ts"]);
  assert.equal(ecriture.code, 2);
  assert.match(ecriture.erreur, /## resolution-token/);
  assert.equal(ecriture.relus["a.ts"], fichiers["a.ts"]);
  const verifier = lancer(fichiers, ["--verifier", "a.ts"]);
  assert.equal(verifier.code, 0);
  assert.match(verifier.log, /garde sa propre écriture/);
});

test("G10 : un fichier CRLF avec BOM garde ses fins de ligne et son BOM", () => {
  const { code, relus } = lancer({ "a.ts": "﻿const x = \"{a.b}\";\r\nconst y = 1;\r\n" }, ["a.ts"]);
  assert.equal(code, 0);
  assert.equal(relus["a.ts"], "﻿const x = \"var(--a-b)\";\r\nconst y = 1;\r\n");
});

test("G11 : une référence passée en argument d'un appel reste, nommée avec fichier et ligne", () => {
  const source = "\nconst x = token(\"{a.b}\");\n";
  const { code, erreur, relus } = lancer({ "a.ts": source }, ["a.ts"]);
  assert.equal(code, 1);
  assert.equal(relus["a.ts"], source);
  assert.match(erreur, /a\.ts:2 : \{a\.b\} reste en place, passée en argument d'un appel/);
});

test("une apostrophe de texte ne masque pas les références qui suivent", () => {
  const { code, relus } = lancer({ "a.tsx": "<p>l'état</p>\nconst x = \"{a.b}\";\n" }, ["a.tsx"]);
  assert.equal(code, 0);
  assert.match(relus["a.tsx"], /"var\(--a-b\)"/);
});

test("G12 : ucm --help liste la commande, et ucm tokens sans sous-commande nomme css et references", () => {
  const lignes = [];
  executer(["--help"], { ecrire: (t) => lignes.push(t) });
  assert.match(lignes.join("\n"), /ucm tokens references\s+remplace/);
  assert.match(lignes.join("\n"), /ucm tokens references \[--verifier\] <fichiers…>/);
  const alertes = [];
  assert.equal(executer(["tokens"], { racine: tmpdir(), ecrire: () => {}, alerter: (t) => alertes.push(t) }), 2);
  assert.match(alertes.join("\n"), /css ou references/);
});

test("sans fichier, ou avec un fichier introuvable, la commande sort en 2", () => {
  assert.equal(lancer({}, []).code, 2);
  assert.equal(lancer({}, ["absent.ts"]).code, 2);
});
