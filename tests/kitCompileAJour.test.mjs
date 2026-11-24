/**
 * Un plugin ne s'embarque pas sur un kit compilé périmé, et les commandes qui
 * construisent un plugin après le kit refusent un nom inconnu.
 *
 * Les empreintes se calculent sur une copie temporaire des entrées du kit : le
 * test ne touche ni `packages/kit/src` ni `packages/kit/dist`.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { calculerEmpreinte, ecrireEmpreinte, entreesDuKit, verifierKit } from "../scripts/empreinte-du-kit.mjs";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Une racine temporaire qui ne contient que les entrées compilées du kit. */
function copieDuKit() {
  const copie = mkdtempSync(join(tmpdir(), "ucm-empreinte-"));
  for (const entree of entreesDuKit(racine)) {
    const relatif = entree.slice(racine.length + 1);
    mkdirSync(dirname(join(copie, relatif)), { recursive: true });
    cpSync(entree, join(copie, relatif));
  }
  mkdirSync(join(copie, "packages/kit/dist"), { recursive: true });
  return copie;
}

test("l'empreinte est stable et couvre un dossier ajouté à include", () => {
  const copie = copieDuKit();
  try {
    assert.equal(calculerEmpreinte(copie), calculerEmpreinte(copie));
    const avant = calculerEmpreinte(copie);
    const config = join(copie, "packages/kit/tsconfig.build.json");
    writeFileSync(
      config,
      `{ // commentaire\n "extends": "../../tsconfig.base.json",\n "include": ["src/format/**/*", "src/ajout/**/*"] }\n`,
    );
    mkdirSync(join(copie, "packages/kit/src/ajout"), { recursive: true });
    writeFileSync(join(copie, "packages/kit/src/ajout/a.ts"), "export const a = 1;\n");
    assert.notEqual(calculerEmpreinte(copie), avant);
    assert.ok(entreesDuKit(copie).some((c) => c.endsWith("a.ts")));
  } finally {
    rmSync(copie, { recursive: true, force: true });
  }
});

test("src/lecteurs n'entre pas dans l'empreinte", () => {
  assert.ok(!entreesDuKit(racine).some((c) => c.includes("lecteurs")));
});

test("une empreinte égale laisse passer, une source modifiée refuse", () => {
  const copie = copieDuKit();
  try {
    ecrireEmpreinte(copie);
    assert.deepEqual(verifierKit(copie), { ok: true });
    const source = entreesDuKit(copie).find((c) => c.endsWith(".ts"));
    writeFileSync(source, "// modifié\n", { flag: "a" });
    const verdict = verifierKit(copie);
    assert.equal(verdict.ok, false);
    assert.match(verdict.raison, /ont changé/);
  } finally {
    rmSync(copie, { recursive: true, force: true });
  }
});

test("un dist/.empreinte absent refuse", () => {
  const copie = copieDuKit();
  try {
    const verdict = verifierKit(copie);
    assert.equal(verdict.ok, false);
    assert.match(verdict.raison, /absent/);
  } finally {
    rmSync(copie, { recursive: true, force: true });
  }
});

test("le dist du dépôt est à jour (le test racine construit le kit d'abord)", () => {
  assert.deepEqual(verifierKit(racine), { ok: true });
});

test("un nom de paquet inconnu sort en erreur avec la liste des noms admis", () => {
  const script = join(racine, "scripts/construire-plugin.mjs");
  const plugin = spawnSync(process.execPath, [script, "build", "inconnu"], { encoding: "utf8" });
  assert.notEqual(plugin.status, 0);
  assert.match(plugin.stderr, /Paquet inconnu : « inconnu »/);
  assert.match(plugin.stderr, /palettes, architect, exporter\./);
  assert.doesNotMatch(plugin.stderr, /socle/);

  const paquet = spawnSync(process.execPath, [script, "test", "inconnu"], { encoding: "utf8" });
  assert.notEqual(paquet.status, 0);
  assert.match(paquet.stderr, /socle, couleur, cli, adapter/);
});

test("verifier-kit donne la commande de reconstruction", () => {
  const copie = copieDuKit();
  try {
    // Le script lit la racine de son propre dépôt : on le copie dans la racine temporaire.
    mkdirSync(join(copie, "scripts"), { recursive: true });
    for (const nom of ["construire-plugin.mjs", "empreinte-du-kit.mjs"]) {
      cpSync(join(racine, "scripts", nom), join(copie, "scripts", nom));
    }
    const sortie = spawnSync(process.execPath, [join(copie, "scripts/construire-plugin.mjs"), "verifier-kit", "palettes"], {
      encoding: "utf8",
    });
    assert.notEqual(sortie.status, 0);
    assert.match(sortie.stderr, /npm run build:plugin -- palettes/);
  } finally {
    rmSync(copie, { recursive: true, force: true });
  }
});
