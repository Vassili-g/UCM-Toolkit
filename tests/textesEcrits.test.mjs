/**
 * Aucun catalogue de textes des plugins ne porte le marqueur `TODO(texte)`.
 *
 * Un agent qui a besoin d'un texte d'écran absent de sa note de conception
 * pose ce marqueur au lieu d'écrire le texte lui-même (`CONTRIBUTING.md`,
 * « Travailler avec des agents »). L'orchestrateur écrit le texte et le fait
 * valider. Ce test garde le commit fermé tant qu'un marqueur reste.
 *
 * Catalogues lus : les fichiers suivis de `packages/*\/src/` rangés sous
 * `i18n/` ou nommés `textes.ts`.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MARQUEUR = "TODO(texte)";

function catalogues() {
  return execFileSync("git", ["ls-files", "packages/*/src/*"], { cwd: racine, encoding: "utf8" })
    .split("\n")
    .filter((chemin) => /\/i18n\/|(^|\/)textes\.ts$/.test(chemin));
}

test("les catalogues de textes sont trouvés", () => {
  assert.ok(catalogues().length >= 4, `seuls ${catalogues().length} catalogues trouvés`);
});

test(`aucun catalogue ne porte le marqueur ${MARQUEUR}`, () => {
  const restes = [];
  for (const chemin of catalogues()) {
    readFileSync(join(racine, chemin), "utf8").split(/\r?\n/).forEach((ligne, rang) => {
      if (ligne.includes(MARQUEUR)) restes.push(`${chemin}:${rang + 1}`);
    });
  }
  assert.deepEqual(
    restes,
    [],
    `Ces textes d'écran restent à écrire et à faire valider :\n${restes.join("\n")}`,
  );
});
