/**
 * Chaque module compilé du kit se charge seul, dans un processus neuf.
 *
 * Un cycle d'imports passe inaperçu tant que tout le monde entre par
 * `index.ts` : l'ordre de chargement y est toujours le même. Il lève
 * `ReferenceError` quand un module du cycle est le premier chargé et qu'un
 * autre lit une de ses constantes au chargement. Le lot 1 du plan de fiabilité
 * en a créé un (`architecture`, `termes`, `ecriture-des-mots`), que seul un
 * import direct d'`architecture.ts` montrait.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossiers = ["src/format", "src/emplois", "src/referentiel"];
const modules = dossiers.flatMap((dossier) => readdirSync(join(racine, dossier))
  .filter((nom) => nom.endsWith(".ts") && !nom.endsWith(".d.ts"))
  .map((nom) => `${dossier}/${nom}`));

test("chaque module compilé du kit se charge seul", () => {
  assert.ok(modules.length > 0);
  const echecs = modules.flatMap((module) => {
    const url = pathToFileURL(join(racine, module)).href;
    const sortie = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `await import(${JSON.stringify(url)});`], {
      cwd: racine,
      encoding: "utf8",
    });
    return sortie.status === 0 ? [] : [`${module} : ${(sortie.stderr.match(/\w*Error: .*/) ?? [sortie.stderr.trim()])[0]}`];
  });
  assert.deepEqual(echecs, []);
});
