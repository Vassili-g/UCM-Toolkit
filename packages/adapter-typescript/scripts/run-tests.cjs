/**
 * Lance les fichiers `*.test.ts` et `*.test.mjs` placés directement sous
 * `tests/`, sans descendre dans les sous-dossiers.
 */
const { readdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const racine = resolve(__dirname, "..");
const fichiers = readdirSync(resolve(racine, "tests"), { withFileTypes: true })
  .filter((entree) => entree.isFile() && (entree.name.endsWith(".test.ts") || entree.name.endsWith(".test.mjs")))
  .map((entree) => `tests/${entree.name}`)
  .sort();

if (fichiers.length === 0) {
  console.error("Aucun fichier de test trouvé dans tests/ (@ucm-kit/adapter-typescript).");
  process.exit(1);
}

const resultat = spawnSync("npx", ["tsx", "--test", ...fichiers], {
  cwd: racine,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(resultat.status ?? 1);
