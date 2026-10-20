/**
 * Les fichiers `.d.mts` des lecteurs disent-ils ce que les portes exportent ?
 *
 * Les déclarations sont écrites à la main, et un lecteur renommé laissait
 * l'ancien nom déclaré : un client TypeScript compilait, puis recevait
 * `undefined` à l'exécution. Le test compare, pour chaque porte, les noms
 * exportés à l'exécution et les noms de valeur que sa déclaration promet.
 * Les types (`type`, `interface`) n'existent pas à l'exécution : ils ne
 * comptent pas. Les signatures ne sont pas jugées ici, seulement les noms.
 *
 * Les déclarations sont lues par l'API de `typescript`, déjà dépendance du
 * dépôt : une expression régulière confondrait un `export type` avec un
 * `export function`, et ne verrait pas un `export { ... } from` réparti sur
 * plusieurs lignes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as navigateur from "@ucm-kit/core/lecteurs/navigateur";
import * as porte from "@ucm-kit/core/lecteurs";

const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lecteurs");

const lire = (fichier) => ts.createSourceFile(fichier, readFileSync(join(dossier, fichier), "utf8"), ts.ScriptTarget.Latest, true);

/** Les blocs `declare module` d'une déclaration. */
const modulesDe = (source) => source.statements.filter(ts.isModuleDeclaration);

const estExporte = (noeud) => noeud.modifiers?.some((modificateur) => modificateur.kind === ts.SyntaxKind.ExportKeyword) ?? false;

/** Les noms de type déclarés dans la déclaration, pour écarter leur republication. */
function typesDeclares(source) {
  return new Set(modulesDe(source).flatMap((bloc) => bloc.body.statements.filter((noeud) => ts.isInterfaceDeclaration(noeud) || ts.isTypeAliasDeclaration(noeud)).map((noeud) => noeud.name.text)));
}

/** Les noms de valeur qu'une déclaration exporte, avec ceux qu'elle republie. */
function valeursDeclarees(source, types) {
  const noms = new Set();
  for (const bloc of modulesDe(source)) {
    for (const noeud of bloc.body.statements) {
      if (ts.isFunctionDeclaration(noeud) && estExporte(noeud)) noms.add(noeud.name.text);
      else if (ts.isVariableStatement(noeud) && estExporte(noeud)) {
        for (const declaration of noeud.declarationList.declarations) noms.add(declaration.name.text);
      } else if (ts.isExportDeclaration(noeud) && !noeud.isTypeOnly && noeud.exportClause && ts.isNamedExports(noeud.exportClause)) {
        for (const element of noeud.exportClause.elements) if (!element.isTypeOnly && !types.has(element.name.text)) noms.add(element.name.text);
      }
    }
  }
  return noms;
}

function comparer(declaration, exportsDExecution, types) {
  const declares = valeursDeclarees(lire(declaration), types);
  const reels = new Set(Object.keys(exportsDExecution));
  return {
    declaresSansExport: [...declares].filter((nom) => !reels.has(nom)).sort(),
    exportesSansDeclaration: [...reels].filter((nom) => !declares.has(nom)).sort(),
  };
}

const typesDesLecteurs = typesDeclares(lire("index.d.mts"));

test("index.d.mts déclare exactement les exports d'exécution de @ucm-kit/core/lecteurs", () => {
  assert.deepEqual(comparer("index.d.mts", porte, typesDesLecteurs), { declaresSansExport: [], exportesSansDeclaration: [] });
});

test("navigateur.d.mts déclare exactement les exports d'exécution de @ucm-kit/core/lecteurs/navigateur", () => {
  assert.deepEqual(comparer("navigateur.d.mts", navigateur, typesDesLecteurs), { declaresSansExport: [], exportesSansDeclaration: [] });
});

test("la comparaison voit un nom de valeur décalé et ignore les types", () => {
  const types = new Set(["UnType"]);
  const source = ts.createSourceFile("x.d.mts", 'declare module "m" { export type UnType = 1; export interface Autre {} export function ancien(): void; export const present: number; export { UnType, repu } from "m2"; }', ts.ScriptTarget.Latest, true);
  assert.deepEqual([...valeursDeclarees(source, types)].sort(), ["ancien", "present", "repu"]);
});
