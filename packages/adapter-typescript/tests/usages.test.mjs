import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { adaptateurTypeScript } from "../src/index.mjs";
import {
  EXTENSIONS_LUES,
  fichiersDuComposant,
  lecteurDuCode,
  releverUsages,
} from "../src/usages.mjs";

const relever = (texte, nom = "a.tsx") => releverUsages(texte, nom);
const decoupe = (texte, repere) => texte.slice(repere.debut, repere.fin);
const textes = (releve) => releve.chaines.map((chaine) => chaine.texte);
const valeurs = (releve) => releve.declarations.map(({ propriete, valeur, contexte }) => (
  { propriete, valeur, contexte }
));

test("E1 une chaîne garde ses guillemets dans debut et fin", () => {
  const texte = 'const T = ["{x.y}"];';
  const releve = relever(texte);

  assert.equal(releve.chaines.length, 1);
  assert.equal(releve.chaines[0].texte, "{x.y}");
  assert.equal(decoupe(texte, releve.chaines[0]), '"{x.y}"');
  assert.equal(releve.chaines[0].attribut, null);
});

test("E1 la valeur d'un objet d'une table est une déclaration, pas une chaîne", () => {
  const releve = relever('const T = { a: "{x.y}" };');

  assert.deepEqual(releve.chaines, []);
  assert.deepEqual(valeurs(releve), [{ propriete: "a", valeur: "{x.y}", contexte: "objet" }]);
});

test("E2 un gabarit donne ses morceaux fixes, hors délimiteurs", () => {
  const texte = "const v = `var(--${c})`;";
  const releve = relever(texte);

  assert.deepEqual(textes(releve), ["var(--", ")"]);
  assert.deepEqual(releve.chaines.map((chaine) => decoupe(texte, chaine)), ["var(--", ")"]);
});

test("E3 une propriété de style est une déclaration, sans chaîne en double", () => {
  const texte = '<div style={{ backgroundColor: "#fff" }} />';
  const releve = relever(texte);

  assert.deepEqual(valeurs(releve), [{ propriete: "background-color", valeur: "#fff", contexte: "style" }]);
  assert.equal(decoupe(texte, releve.declarations[0]), '"#fff"');
  assert.deepEqual(releve.chaines, []);
});

test("E4 un nombre reçoit px, sauf les propriétés sans unité de React", () => {
  const releve = relever("<div style={{ padding: 12, opacity: 0.5, lineHeight: 1.5 }} />");

  assert.deepEqual(releve.declarations.map((declaration) => declaration.valeur), ["12px", "0.5", "1.5"]);
  assert.deepEqual(releve.declarations.map((declaration) => declaration.nombre), [true, true, true]);
});

test("E5 un préfixe fournisseur devient un nom CSS à tiret initial", () => {
  const releve = relever("<div style={{ WebkitLineClamp: 2, msFlexGrow: 1, MozTabSize: 4, msFoo: 3 }} />");

  assert.deepEqual(valeurs(releve).map(({ propriete, valeur }) => [propriete, valeur]), [
    ["-webkit-line-clamp", "2"],
    ["-ms-flex-grow", "1"],
    ["-moz-tab-size", "4"],
    ["-ms-foo", "3px"],
  ]);
});

test("E6 une expression donne une déclaration sans valeur, et ses chaînes restent des chaînes", () => {
  const releve = relever('<div style={{ gap: entry.gap, color: ok ? "a" : "b" }} />');

  assert.deepEqual(valeurs(releve), [
    { propriete: "gap", valeur: null, contexte: "style" },
    { propriete: "color", valeur: null, contexte: "style" },
  ]);
  assert.deepEqual(textes(releve), ["a", "b"]);
});

test("E7 un objet annoté CSSProperties est un style, et les valeurs d'un Record aussi", () => {
  const simple = relever('const S: CSSProperties = { width: "10px" };');
  assert.deepEqual(valeurs(simple), [{ propriete: "width", valeur: "10px", contexte: "style" }]);

  const table = relever(
    'const S: Record<string, React.CSSProperties> = { grand: { width: "10px" }, petit: { height: 4 } };',
  );
  assert.deepEqual(valeurs(table), [
    { propriete: "width", valeur: "10px", contexte: "style" },
    { propriete: "height", valeur: "4px", contexte: "style" },
  ]);
});

test("E8 les clés --nom d'un objet de style sont des variables", () => {
  const releve = relever('<div style={{ "--x": "8px", "--y": 3 }} />');

  assert.deepEqual(releve.variables, ["--x", "--y"]);
  assert.deepEqual(valeurs(releve).map((declaration) => declaration.valeur), ["8px", "3"]);
});

test("E9 un commentaire et un texte JSX ne donnent rien", () => {
  const releve = relever('// "{x.y}"\nconst a = <p>12px</p>;\n/* "#fff" */');

  assert.deepEqual(releve.chaines, []);
  assert.deepEqual(releve.declarations, []);
});

test("E10 une erreur de syntaxe rend la lecture incomplète, avec son nombre d'erreurs", () => {
  const releve = relever('const a = { b: "x" ;\nconst c = ;');

  assert.equal(releve.lecture.complete, false);
  assert.ok(releve.lecture.erreurs > 0);
  assert.equal(relever("const a = 1;").lecture.complete, true);
  assert.equal(relever("const a = 1;").lecture.erreurs, 0);
});

test("E11 zéro reste zéro", () => {
  const releve = relever("<div style={{ padding: 0, margin: -0, top: -4 }} />");

  assert.deepEqual(releve.declarations.map((declaration) => declaration.valeur), ["0", "0", "-4px"]);
});

test("E12 un littéral de type n'est pas une chaîne", () => {
  const releve = relever('type Taille = "12px"; type Gabarit = `a-${string}`; let v: "8px" = "8px";');

  assert.deepEqual(textes(releve), ["8px"]);
});

test("E13 une clé d'objet n'est pas une chaîne", () => {
  const releve = relever('const M = { "12px": 1 };');

  assert.deepEqual(releve.chaines, []);
  assert.deepEqual(valeurs(releve), [{ propriete: "12px", valeur: "1", contexte: "objet" }]);
});

test("E14 un spécificateur d'import ou d'export n'est pas une chaîne", () => {
  const releve = relever([
    'import x from "./12px";',
    'import "./13px";',
    'export * from "./14px";',
    'export { y } from "./15px";',
    'const z = require("./16px");',
    'const w = import("./17px");',
    'import type { T } from "./18px";',
  ].join("\n"));

  assert.deepEqual(releve.chaines, []);
});

test("E15 une chaîne d'attribut JSX porte son attribut", () => {
  const releve = relever('const a = <a href="#add" className={ok ? "x" : "y"} onClick={() => go("#z")} />;');

  assert.deepEqual(
    releve.chaines.map(({ texte, attribut }) => ({ texte, attribut })),
    [
      { texte: "#add", attribut: "href" },
      { texte: "x", attribut: "className" },
      { texte: "y", attribut: "className" },
      { texte: "#z", attribut: null },
    ],
  );
});

test("E16 satisfies, as et un type de retour CSSProperties donnent des déclarations de style", () => {
  const texte = [
    'const A = { width: "1px" } satisfies CSSProperties;',
    'const B = { width: "2px" } as CSSProperties;',
    'const C = (): CSSProperties => ({ width: "3px" });',
    'function D(): CSSProperties { return { width: "4px" }; }',
    'const E = { width: "5px" } as const satisfies CSSProperties;',
  ].join("\n");
  const releve = relever(texte);

  assert.deepEqual(valeurs(releve), ["1px", "2px", "3px", "4px", "5px"].map((valeur) => (
    { propriete: "width", valeur, contexte: "style" }
  )));
});

test("E17 une décomposition donne une déclaration sans propriété ni valeur", () => {
  const releve = relever("<div style={{ ...base, gap: 4 }} />");

  assert.deepEqual(valeurs(releve), [
    { propriete: null, valeur: null, contexte: "style" },
    { propriete: "gap", valeur: "4px", contexte: "style" },
  ]);
});

test("E18 un autre objet donne des déclarations pour ses valeurs littérales seulement", () => {
  const releve = relever('const V = { color: "red", height: 32, count: 3, gap: x, nom: `a${b}` };');

  assert.deepEqual(valeurs(releve), [
    { propriete: "color", valeur: "red", contexte: "objet" },
    { propriete: "height", valeur: "32", contexte: "objet" },
    { propriete: "count", valeur: "3", contexte: "objet" },
  ]);
  assert.deepEqual(releve.declarations.map((declaration) => declaration.nombre), [undefined, true, true]);
  assert.deepEqual(releve.declarations.map((declaration) => declaration.valeurEnStyle), [undefined, "32px", "3px"]);
  assert.deepEqual(textes(releve), ["a"]);
});

test("E18b valeurEnStyle donne la valeur que React écrirait, dans les propriétés sans unité comme ailleurs", () => {
  const releve = relever("const V = { fontSize: 15, lineHeight: 1.5, opacity: 0, gap: -4 };");

  assert.deepEqual(releve.declarations.map((declaration) => [declaration.valeur, declaration.valeurEnStyle]), [["15", "15px"], ["1.5", "1.5"], ["0", "0"], ["-4", "-4px"]]);
  assert.equal(relever("<p style={{ fontSize: 15 }} />").declarations[0].valeurEnStyle, undefined);
});

test("E19 chaque commentaire eslint-disable est une directive avec ses décalages", () => {
  const texte = [
    "// eslint-disable-next-line ucm/valeur-en-dur",
    'const a = "#fff"; /* eslint-disable ucm/token-inconnu */',
    "// eslint-enable ucm/token-inconnu",
    "const b = <p>{/* eslint-disable-line ucm/valeur-en-dur */}</p>;",
    "const c = <p>// eslint-disable-line</p>;",
  ].join("\n");
  const releve = relever(texte);

  assert.deepEqual(releve.directives.map((directive) => directive.texte), [
    "// eslint-disable-next-line ucm/valeur-en-dur",
    "/* eslint-disable ucm/token-inconnu */",
    "/* eslint-disable-line ucm/valeur-en-dur */",
  ]);
  for (const directive of releve.directives) assert.equal(decoupe(texte, directive), directive.texte);
});

function fabriquer(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-usages-"));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    const absolu = join(racine, chemin);
    mkdirSync(join(absolu, ".."), { recursive: true });
    writeFileSync(absolu, contenu, "utf8");
  }
  return racine;
}

test("E20 les fichiers d'un composant suivent les imports relatifs dans son dossier, sans boucle", () => {
  const racine = fabriquer({
    "partage.ts": "export const p = 1;",
    "Button/Button.tsx": 'import { v } from "./Button.variants";\nimport { p } from "../partage";\nimport "react";',
    "Button/Button.variants.ts": 'import { t } from "./tables";\nimport { B } from "./Button";\nexport const v = 1;',
    "Button/tables/index.ts": 'import { s } from "./sous/profond";\nexport const t = 1;',
    "Button/tables/sous/profond.ts": "export const s = 1;",
    "Button/Button.stories.tsx": 'import { Button } from "./Button";',
  });
  try {
    const implementation = join(racine, "Button", "Button.tsx");
    const { fichiers, lecture } = fichiersDuComposant(implementation);

    assert.deepEqual(fichiers, [
      implementation,
      join(racine, "Button", "Button.variants.ts"),
      join(racine, "Button", "tables", "index.ts"),
      join(racine, "Button", "tables", "sous", "profond.ts"),
    ]);
    assert.deepEqual(lecture, { complete: true, erreurs: 0 });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("E20 un import dont le fichier manque est ignoré", () => {
  const racine = fabriquer({ "A/A.tsx": 'import "./absent";\nimport "./style.css";' });
  try {
    const implementation = join(racine, "A", "A.tsx");

    assert.deepEqual(fichiersDuComposant(implementation).fichiers, [implementation]);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("E21 une extension non lue ou une implémentation absente rendent une lecture incomplète", () => {
  const releve = relever('const a = "#fff";', "a.jsx");
  assert.deepEqual(releve.lecture, { complete: false, erreurs: 0, extension: ".jsx" });
  assert.deepEqual(
    [releve.chaines, releve.declarations, releve.variables, releve.directives],
    [[], [], [], []],
  );

  const racine = fabriquer({});
  try {
    const absente = fichiersDuComposant(join(racine, "Absent.tsx"));
    assert.deepEqual(absente.fichiers, []);
    assert.equal(absente.lecture.complete, false);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test("le lecteur est gelé, ses extensions sont .ts et .tsx, et l'adaptateur le porte", () => {
  assert.deepEqual([...EXTENSIONS_LUES], [".ts", ".tsx"]);
  assert.equal(Object.isFrozen(lecteurDuCode), true);
  assert.deepEqual(Object.keys(lecteurDuCode).sort(), ["extensions", "fichiersDuComposant", "releverUsages"]);
  assert.equal(adaptateurTypeScript.lecteurDuCode, lecteurDuCode);
  assert.deepEqual([...lecteurDuCode.extensions], [...EXTENSIONS_LUES]);
});

test("un fichier .ts lit un transtypage à chevrons", () => {
  const releve = relever('const a = <string>"x";', "a.ts");

  assert.equal(releve.lecture.complete, true);
  assert.deepEqual(textes(releve), ["x"]);
});
