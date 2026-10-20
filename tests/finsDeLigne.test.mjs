/**
 * Aucun fichier texte n'entre dans l'index en CRLF.
 *
 * `.gitattributes` pose `* text=auto eol=lf` : Git convertit à l'ajout ce
 * qu'un agent ou un éditeur a écrit en CRLF. Le test lit l'index, et non
 * l'arbre de travail : un fichier CRLF sur le disque que Git normalise à
 * l'ajout n'est pas une faute. Un fichier marqué `-text` garde ses octets et
 * sort du contrôle.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("aucun fichier texte de l'index n'est en CRLF", () => {
  const sortie = execFileSync("git", ["ls-files", "--eol", "-z"], { cwd: racine, encoding: "utf8" });
  const fautifs = sortie
    .split("\0")
    .filter((ligne) => ligne.startsWith("i/crlf") || ligne.startsWith("i/mixed"))
    .filter((ligne) => !/attr\/-text/.test(ligne))
    .map((ligne) => ligne.split("\t").pop());

  assert.deepEqual(
    fautifs,
    [],
    `Ces fichiers sont en CRLF dans l'index :\n${fautifs.join("\n")}\n`
      + "Les renormaliser par `git add --renormalize -- <fichier>`.",
  );
});
