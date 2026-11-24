/**
 * Tous les plugins UCM sont sombres (`CONTRIBUTING.md`, « Interface du plugin »).
 * H1 : chaque `code.ts` de plugin demande `themeColors: false`.
 * H2 : la feuille du socle déclare des valeurs sombres sous `:root`, sans bloc clair.
 * H3 : aucune feuille `.css` des plugins (leur dossier `src`) ne cite `.figma-dark` ni `prefers-color-scheme`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paquets = path.join(racine, "packages");

test("H1 : chaque plugin appelle figma.showUI avec themeColors: false", () => {
  const codes = fs
    .readdirSync(paquets)
    .filter((nom) => nom.startsWith("plugin-"))
    .map((nom) => path.join(paquets, nom, "src", "code.ts"))
    .filter((fichier) => fs.existsSync(fichier));
  assert.ok(codes.length >= 3, "les trois plugins ont un code.ts");
  for (const fichier of codes) {
    const source = fs.readFileSync(fichier, "utf8");
    const appel = source.match(/figma\.showUI\(([\s\S]*?)\);/);
    assert.ok(appel, `${fichier} appelle figma.showUI`);
    assert.match(appel[1], /themeColors:\s*false/, fichier);
  }
});

test("H2 : socle.css est sombre sous :root, sans .figma-dark ni bloc clair", () => {
  const feuille = fs.readFileSync(path.join(paquets, "plugin-socle", "src", "ui", "socle.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(feuille, /\.figma-dark/);
  assert.doesNotMatch(feuille, /prefers-color-scheme/);
  assert.match(feuille, /:root\s*{[^}]*color-scheme:\s*dark;/);
  assert.match(feuille, /--fond:\s*var\(--figma-color-bg,\s*#2c2c2c\)/);
  assert.doesNotMatch(feuille, /color-scheme:\s*light/);
});

function feuillesDesPlugins(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return feuillesDesPlugins(chemin);
    return entree.name.endsWith(".css") ? [chemin] : [];
  });
}

test("H3 : aucune feuille des plugins ne cite .figma-dark ni prefers-color-scheme", () => {
  const plugins = fs.readdirSync(paquets).filter((nom) => nom.startsWith("plugin-") && fs.existsSync(path.join(paquets, nom, "src")));
  const feuilles = plugins.flatMap((nom) => feuillesDesPlugins(path.join(paquets, nom, "src")));
  assert.ok(feuilles.length >= 3, "aucune feuille trouvée");
  for (const feuille of feuilles) {
    const css = fs.readFileSync(feuille, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css, /\.figma-dark/, path.relative(racine, feuille));
    assert.doesNotMatch(css, /prefers-color-scheme/, path.relative(racine, feuille));
  }
});
