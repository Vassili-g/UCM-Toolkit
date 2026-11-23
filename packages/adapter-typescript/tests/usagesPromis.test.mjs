/**
 * La porte `@ucm-kit/adapter-typescript/usages` tient-elle sa promesse ?
 *
 * Le modèle est `packages/kit/tests/apiPublique.test.mjs`, pour une porte qui
 * ne publie qu'un nom, `lecteurDuCode`. Quatre choses se prouvent ici. La
 * déclaration `src/usages.d.mts` annonce les noms que la porte sert, et les
 * membres de `lecteurDuCode`. Chaque exemple d'appel rend le résultat écrit dans
 * `ATTENDUS`. La déclaration se compile avec `LecteurDuCode` du kit, donc
 * `preparerControle` reçoit `lecteurDuCode` sans conversion. Le journal
 * `CHANGELOG.md` dit tout changement de la porte depuis la version précédente,
 * lue dans Git. Le numéro de l'adaptateur monte du chiffre du milieu quand la
 * porte casse.
 *
 * Les règles sont celles de la prise du kit (`packages/kit/invariants/versionnage.md`),
 * en 0.x : un ajout ou une dépréciation monte le dernier chiffre, un retrait,
 * une signature changée ou un résultat changé monte le chiffre du milieu. Un
 * changement de la déclaration compte comme une signature changée. La limite est
 * celle de toute promesse par l'exemple : un comportement qu'aucun exemple ne
 * couvre peut changer sans que rien ne rougisse.
 *
 * Seuls les noms de la déclaration sont promis. Au runtime, `src/usages.mjs`
 * sert aussi `releverUsages`, `fichiersDuComposant` et `EXTENSIONS_LUES` : un
 * module ne s'en sert pas, ils ne sont ni déclarés ni gardés ici.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as porte from "@ucm-kit/adapter-typescript/usages";

const dossierDesTests = dirname(fileURLToPath(import.meta.url));
const racineDuDepot = join(dossierDesTests, "..", "..", "..");

const CHEMINS = {
  manifeste: "packages/adapter-typescript/package.json",
  dmts: "packages/adapter-typescript/src/usages.d.mts",
  journal: "packages/adapter-typescript/CHANGELOG.md",
  ceTest: "packages/adapter-typescript/tests/usagesPromis.test.mjs",
};

const GENRES = ["ajout", "déprécié", "rupture"];
const lireSource = (chemin) => readFileSync(join(racineDuDepot, chemin), "utf8");
const enSlash = (chemin) => chemin.split("\\").join("/");

// ─── Les exemples d'appel ─────────────────────────────────────────────────

const fixtures = join(dossierDesTests, "fixtures");
const releve = (texte, nom = "Composant.tsx") => porte.lecteurDuCode.releverUsages(texte, nom);
const fichiersRelatifs = (resultat) => ({ ...resultat, fichiers: resultat.fichiers.map((chemin) => enSlash(relative(dossierDesTests, chemin))) });

// <exemples>
const EXEMPLES = {
  "releverUsages : un objet style JSX, nombres compris": () => releve('const A = () => <div style={{ padding: 12, backgroundColor: "#fff", opacity: 0.5, "--gap": "4px" }} />;'),
  "releverUsages : une table hors style garde le nombre tel qu'écrit": () => releve('const SIZES = { medium: { padding: "12px", fontSize: 15, height: 32 } };'),
  "releverUsages : une chaîne, un attribut et un gabarit": () => releve('const A = () => <a href="#haut" title={`var(--${nom})`}>{"{components.button.gap}"}</a>;'),
  "releverUsages : une valeur calculée et une décomposition": () => releve("const A = () => <div style={{ ...base, gap: entry.gap }} />;"),
  "releverUsages : un commentaire qui désactive une règle": () => releve("// eslint-disable-next-line ucm/valeur-en-dur\nconst a = 1;"),
  "releverUsages : une erreur de syntaxe est comptée": () => releve("const a = { ;"),
  "releverUsages : une extension que le lecteur ne lit pas": () => releve("const a = 1;", "Composant.jsx"),
  "fichiersDuComposant : l'implémentation, puis ses imports relatifs": () => fichiersRelatifs(porte.lecteurDuCode.fichiersDuComposant(join(fixtures, "ComposedFixture.tsx"))),
  "fichiersDuComposant : un fichier absent": () => fichiersRelatifs(porte.lecteurDuCode.fichiersDuComposant(join(fixtures, "Absent.tsx"))),
  "extensions : celles que le lecteur lit": () => [...porte.lecteurDuCode.extensions],
};
// </exemples>

// <attendus>
const ATTENDUS = {
  "releverUsages : un objet style JSX, nombres compris": {
    "chaines": [],
    "declarations": [
      {
        "propriete": "padding",
        "valeur": "12px",
        "debut": 39,
        "fin": 41,
        "contexte": "style",
        "nombre": true
      },
      {
        "propriete": "background-color",
        "valeur": "#fff",
        "debut": 60,
        "fin": 66,
        "contexte": "style"
      },
      {
        "propriete": "opacity",
        "valeur": "0.5",
        "debut": 77,
        "fin": 80,
        "contexte": "style",
        "nombre": true
      },
      {
        "propriete": "--gap",
        "valeur": "4px",
        "debut": 91,
        "fin": 96,
        "contexte": "style"
      }
    ],
    "variables": [
      "--gap"
    ],
    "directives": [],
    "lecture": {
      "complete": true,
      "erreurs": 0
    }
  },
  "releverUsages : une table hors style garde le nombre tel qu'écrit": {
    "chaines": [],
    "declarations": [
      {
        "propriete": "padding",
        "valeur": "12px",
        "debut": 35,
        "fin": 41,
        "contexte": "objet"
      },
      {
        "propriete": "font-size",
        "valeur": "15",
        "debut": 53,
        "fin": 55,
        "contexte": "objet",
        "nombre": true,
        "valeurEnStyle": "15px"
      },
      {
        "propriete": "height",
        "valeur": "32",
        "debut": 65,
        "fin": 67,
        "contexte": "objet",
        "nombre": true,
        "valeurEnStyle": "32px"
      }
    ],
    "variables": [],
    "directives": [],
    "lecture": {
      "complete": true,
      "erreurs": 0
    }
  },
  "releverUsages : une chaîne, un attribut et un gabarit": {
    "chaines": [
      {
        "texte": "#haut",
        "debut": 24,
        "fin": 31,
        "attribut": "href"
      },
      {
        "texte": "var(--",
        "debut": 40,
        "fin": 46,
        "attribut": "title"
      },
      {
        "texte": ")",
        "debut": 52,
        "fin": 53,
        "attribut": "title"
      },
      {
        "texte": "{components.button.gap}",
        "debut": 57,
        "fin": 82,
        "attribut": null
      }
    ],
    "declarations": [],
    "variables": [],
    "directives": [],
    "lecture": {
      "complete": true,
      "erreurs": 0
    }
  },
  "releverUsages : une valeur calculée et une décomposition": {
    "chaines": [],
    "declarations": [
      {
        "propriete": null,
        "valeur": null,
        "debut": 30,
        "fin": 37,
        "contexte": "style"
      },
      {
        "propriete": "gap",
        "valeur": null,
        "debut": 39,
        "fin": 53,
        "contexte": "style"
      }
    ],
    "variables": [],
    "directives": [],
    "lecture": {
      "complete": true,
      "erreurs": 0
    }
  },
  "releverUsages : un commentaire qui désactive une règle": {
    "chaines": [],
    "declarations": [],
    "variables": [],
    "directives": [
      {
        "texte": "// eslint-disable-next-line ucm/valeur-en-dur",
        "debut": 0,
        "fin": 45
      }
    ],
    "lecture": {
      "complete": true,
      "erreurs": 0
    }
  },
  "releverUsages : une erreur de syntaxe est comptée": {
    "chaines": [],
    "declarations": [],
    "variables": [],
    "directives": [],
    "lecture": {
      "complete": false,
      "erreurs": 1
    }
  },
  "releverUsages : une extension que le lecteur ne lit pas": {
    "chaines": [],
    "declarations": [],
    "variables": [],
    "directives": [],
    "lecture": {
      "complete": false,
      "erreurs": 0,
      "extension": ".jsx"
    }
  },
  "fichiersDuComposant : l'implémentation, puis ses imports relatifs": {
    "fichiers": [
      "fixtures/ComposedFixture.tsx",
      "fixtures/ParityFixture.tsx"
    ],
    "lecture": {
      "complete": true,
      "erreurs": 0
    }
  },
  "fichiersDuComposant : un fichier absent": {
    "fichiers": [],
    "lecture": {
      "complete": false,
      "erreurs": 0
    }
  },
  "extensions : celles que le lecteur lit": [
    ".ts",
    ".tsx"
  ]
};
// </attendus>

/** Les résultats attendus d'un fichier de test, lus dans son texte. */
function attendusDe(texte) {
  const trouve = /\/\/ <attendus>\r?\nconst ATTENDUS = ([\s\S]*?);\r?\n\/\/ <\/attendus>/.exec(texte ?? "");
  return trouve === null ? {} : JSON.parse(trouve[1]);
}

// ─── La déclaration de la porte ───────────────────────────────────────────

/**
 * Les noms que `usages.d.mts` exporte, chacun avec sa déclaration réduite à ce
 * qu'un module compile (commentaires retirés, espaces unifiés), suivie de celle
 * des types qu'elle emploie sans les exporter. `membres` liste ceux de
 * `LecteurDuCode`.
 */
function declarationsDe(source) {
  const fichier = ts.createSourceFile("usages.d.mts", source, ts.ScriptTarget.Latest, true);
  const imprimeur = ts.createPrinter({ removeComments: true });
  const texteDe = (noeud) => imprimeur.printNode(ts.EmitHint.Unspecified, noeud, fichier).replace(/\s+/g, " ").trim();
  const exporte = (noeud) => noeud.modifiers?.some((modificateur) => modificateur.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const noms = [];
  const internes = [];
  let membres = null;
  for (const noeud of fichier.statements) {
    if (ts.isInterfaceDeclaration(noeud) && noeud.name.text === "LecteurDuCode") {
      membres = noeud.members.map((membre) => membre.name.text).sort();
    }
    if (ts.isVariableStatement(noeud) && exporte(noeud)) {
      for (const declaration of noeud.declarationList.declarations) noms.push({ nom: declaration.name.text, valeur: true, texte: texteDe(noeud) });
    } else if (ts.isFunctionDeclaration(noeud) && exporte(noeud)) {
      noms.push({ nom: noeud.name.text, valeur: true, texte: texteDe(noeud) });
    } else if ((ts.isInterfaceDeclaration(noeud) || ts.isTypeAliasDeclaration(noeud)) && exporte(noeud)) {
      noms.push({ nom: noeud.name.text, valeur: false, texte: texteDe(noeud) });
    } else if (ts.isInterfaceDeclaration(noeud) || ts.isTypeAliasDeclaration(noeud)) {
      internes.push(texteDe(noeud));
    }
  }
  const declarations = new Map(noms.map(({ nom, valeur, texte }) => [nom, { valeur, texte: [texte, ...internes].join(" ") }]));
  return { declarations, membres };
}

/** Les portes qu'un module de source importe ou republie. */
const portesDe = (source) => ts.preProcessFile(source, true, true).importedFiles.map(({ fileName }) => fileName);

// ─── Le journal ───────────────────────────────────────────────────────────

/**
 * Les entrées du journal : un titre `## 0.2.14` par version, puis un titre
 * `### <genre>` par entrée. Une entrée nomme ses noms entre accents graves et
 * dit qui a décidé sur une ligne « Décidé par ... ».
 */
function lireLeJournal(texte) {
  const entrees = [];
  const anomalies = [];
  let version = null;
  let courante = null;
  for (const ligne of texte.split(/\r?\n/)) {
    const titreDeVersion = /^## (.*\S)\s*$/.exec(ligne);
    const titreDEntree = /^### (.*\S)\s*$/.exec(ligne);
    if (titreDeVersion) {
      courante = null;
      if (/^\d+\.\d+\.\d+$/.test(titreDeVersion[1])) version = titreDeVersion[1];
      else {
        version = null;
        anomalies.push(`le titre « ${titreDeVersion[1]} » n'est pas un numéro de version (« ## 0.2.14 »)`);
      }
    } else if (titreDEntree) {
      if (version === null) anomalies.push(`l'entrée « ${titreDEntree[1]} » n'est sous aucun numéro de version`);
      courante = { version, genre: titreDEntree[1], texte: "" };
      entrees.push(courante);
    } else if (courante) courante.texte += `${ligne}\n`;
  }
  for (const entree of entrees) {
    entree.noms = new Set([...entree.texte.matchAll(/`([^`\n]+)`/g)].map((trouve) => trouve[1]));
    entree.decidePar = /^Décidé par (\S.*)$/m.exec(entree.texte)?.[1] ?? null;
    if (!GENRES.includes(entree.genre)) anomalies.push(`${entree.version} : le genre « ${entree.genre} » n'est pas l'un de ${GENRES.join(", ")}`);
    if (entree.decidePar === null) anomalies.push(`${entree.version} ${entree.genre} : la ligne « Décidé par ... » manque`);
  }
  return { entrees: entrees.filter((entree) => entree.version !== null), anomalies };
}

// ─── La règle, sans Git ───────────────────────────────────────────────────

const analyser = (version) => String(version).split(".").map(Number);
function comparer(a, b) {
  const [x, y] = [analyser(a), analyser(b)];
  for (let rang = 0; rang < 3; rang += 1) if (x[rang] !== y[rang]) return x[rang] - y[rang];
  return 0;
}

/**
 * Les fautes d'un changement de la porte, d'après deux états : la version
 * précédente (`ref`) et la copie courante. Un état porte `version`,
 * `declarations` (voir `declarationsDe`), `membres` (ceux de `LecteurDuCode`, ou
 * `null`) et `attendus` (id vers `{ resultat }`).
 */
function fautesDeLaPorte({ ref, courant, entrees }) {
  const fautes = [];
  const monte = courant.version !== ref.version;
  const dansLeChangement = entrees.filter((entree) => comparer(entree.version, ref.version) > 0 && (!monte || comparer(entree.version, courant.version) <= 0));
  const entreesDe = (genre, nom) => dansLeChangement.filter((entree) => entree.genre === genre && entree.noms.has(nom));
  const milieuDeLaRef = analyser(ref.version)[1];
  const lesRuptures = [];
  let changement = false;

  const exigerEntree = (genre, nom, pourquoi) => {
    const trouvees = entreesDe(genre, nom);
    if (trouvees.length === 0) fautes.push(`${pourquoi} : le journal (packages/adapter-typescript/CHANGELOG.md) n'a aucune entrée « ${genre} » qui nomme \`${nom}\`, dans une version postérieure à ${ref.version}.`);
    return trouvees;
  };

  for (const [nom, declaration] of courant.declarations) {
    const avant = ref.declarations.get(nom);
    if (avant === undefined) {
      changement = true;
      exigerEntree("ajout", nom, `\`${nom}\` est un nom nouveau de la porte`);
    } else if (avant.texte !== declaration.texte) {
      changement = true;
      lesRuptures.push(...exigerEntree("rupture", nom, `la déclaration de \`${nom}\` a changé`));
    }
  }
  for (const nom of ref.declarations.keys()) {
    if (courant.declarations.has(nom)) continue;
    changement = true;
    lesRuptures.push(...exigerEntree("rupture", nom, `\`${nom}\` est retiré de la porte`));
  }
  if (ref.membres !== null && courant.membres !== null && ref.declarations.has("lecteurDuCode")) {
    const ajoutes = courant.membres.filter((membre) => !ref.membres.includes(membre));
    const retires = ref.membres.filter((membre) => !courant.membres.includes(membre));
    if (ajoutes.length > 0) {
      changement = true;
      exigerEntree("ajout", "lecteurDuCode", `\`lecteurDuCode\` gagne ${ajoutes.join(", ")}`);
    }
    if (retires.length > 0) {
      changement = true;
      lesRuptures.push(...exigerEntree("rupture", "lecteurDuCode", `\`lecteurDuCode\` perd ${retires.join(", ")}`));
    }
  }
  for (const [id, avant] of Object.entries(ref.attendus)) {
    if (JSON.stringify(courant.attendus[id]?.resultat) !== JSON.stringify(avant.resultat)) {
      lesRuptures.push(...exigerEntree("rupture", "lecteurDuCode", `le résultat attendu de l'exemple « ${id} » a changé ou a disparu`));
    }
  }

  for (const entree of lesRuptures) {
    if (analyser(entree.version)[1] <= milieuDeLaRef) {
      fautes.push(`l'entrée ${entree.version} « ${entree.genre} » casse la porte, et ${entree.version} garde le chiffre du milieu de ${ref.version} : monter à ${analyser(ref.version)[0]}.${milieuDeLaRef + 1}.0.`);
    }
  }
  if (monte && lesRuptures.length > 0 && analyser(courant.version)[1] <= milieuDeLaRef) {
    fautes.push(`la porte casse, et l'adaptateur passe de ${ref.version} à ${courant.version} : le chiffre du milieu doit monter.`);
  }
  if (monte && (changement || lesRuptures.length > 0) && !entrees.some((entree) => entree.version === courant.version)) {
    fautes.push(`l'adaptateur passe de ${ref.version} à ${courant.version} et la porte change : le journal n'a aucune entrée pour ${courant.version}.`);
  }
  return [...new Set(fautes)];
}

// ─── La version précédente, lue dans Git ──────────────────────────────────

const MESSAGE_SANS_HISTORIQUE = "L'historique Git ne remonte pas assez loin pour lire la version précédente de la porte (clone superficiel ?). "
  + "Lancer `git fetch --unshallow`, ou `fetch-depth: 0` dans la CI.";

/** Même réglage que `versionSuitLeContenu` : le mode des fichiers ne compte pas. */
function git(racine, ...arguments_) {
  return execFileSync("git", ["-c", "core.fileMode=false", ...arguments_], { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function versionAuCommit(racine, commit) {
  try {
    return JSON.parse(git(racine, "show", `${commit}:${CHEMINS.manifeste}`)).version;
  } catch {
    return null;
  }
}

/**
 * Le commit de la version précédente. Une version posée dans la copie de
 * travail, ou une porte modifiée sans nouveau numéro, se compare à `HEAD`. Une
 * version déjà commitée se compare au parent du commit qui a posé son numéro.
 */
function referenceDeLaPorte(racine, versionCourante) {
  let commits;
  try {
    commits = git(racine, "log", "--format=%H", "--", CHEMINS.manifeste).split("\n").filter(Boolean);
  } catch {
    throw new Error(MESSAGE_SANS_HISTORIQUE);
  }
  if (commits.length === 0) throw new Error(`${CHEMINS.manifeste} n'est dans aucun commit : l'historique ne peut rien dire.`);
  const anterieur = commits.findIndex((commit) => versionAuCommit(racine, commit) !== versionCourante);
  const commitDuNumero = anterieur === 0 ? null : anterieur === -1 ? commits.at(-1) : commits[anterieur - 1];
  const propre = git(racine, "status", "--porcelain", "--", ...Object.values(CHEMINS)).trim() === "";
  const reference = commitDuNumero === null || !propre ? "HEAD" : `${commitDuNumero}^`;
  try {
    git(racine, "rev-parse", "--verify", "--quiet", `${reference}^{commit}`);
  } catch {
    throw new Error(MESSAGE_SANS_HISTORIQUE);
  }
  return reference;
}

/** Un état de la porte : sur le disque si `ref` est `null`, sinon dans Git. */
function etatDeLaPorte(racine, ref) {
  const lire = (chemin) => {
    if (ref === null) {
      try {
        return readFileSync(join(racine, chemin), "utf8");
      } catch {
        return null;
      }
    }
    try {
      return git(racine, "show", `${ref}:${chemin}`);
    } catch {
      return null;
    }
  };
  const manifeste = lire(CHEMINS.manifeste);
  const declaration = lire(CHEMINS.dmts);
  const { declarations, membres } = declaration === null ? { declarations: new Map(), membres: null } : declarationsDe(declaration);
  return {
    version: manifeste === null ? "0.0.0" : JSON.parse(manifeste).version,
    declarations,
    membres,
    attendus: attendusDe(lire(CHEMINS.ceTest)),
  };
}

/** Toutes les fautes de la porte d'un dépôt : sa version précédente dans Git, son journal sur le disque. */
function fautesDuDepot(racine) {
  const courant = etatDeLaPorte(racine, null);
  courant.attendus = Object.fromEntries(Object.entries(ATTENDUS).map(([id, resultat]) => [id, { resultat }]));
  const ref = etatDeLaPorte(racine, referenceDeLaPorte(racine, courant.version));
  ref.attendus = Object.fromEntries(Object.entries(ref.attendus).map(([id, resultat]) => [id, { resultat }]));
  let texte = "";
  try {
    texte = readFileSync(join(racine, CHEMINS.journal), "utf8");
  } catch {
    // Un journal absent se dit par ses fautes : aucune entrée n'existe.
  }
  const { entrees, anomalies } = lireLeJournal(texte);
  return [...anomalies, ...fautesDeLaPorte({ ref, courant, entrees })];
}

// ─── Ce que la porte publie ───────────────────────────────────────────────

const { declarations: declarationsCourantes, membres: membresDeclares } = declarationsDe(lireSource(CHEMINS.dmts));

test("la porte promet un seul nom, lecteurDuCode, et la déclaration n'importe rien", () => {
  assert.deepEqual([...declarationsCourantes.keys()], ["lecteurDuCode"]);
  assert.equal(declarationsCourantes.get("lecteurDuCode").valeur, true);
  assert.deepEqual(portesDe(lireSource(CHEMINS.dmts)), [], "la porte lit la syntaxe et ne juge rien : elle n'importe pas le kit");
  assert.ok("lecteurDuCode" in porte, "lecteurDuCode est déclaré mais la porte ne le sert pas");
});

test("lecteurDuCode a exactement les membres que sa déclaration annonce", () => {
  assert.deepEqual(Object.keys(porte.lecteurDuCode).sort(), membresDeclares);
  assert.deepEqual(membresDeclares, ["extensions", "fichiersDuComposant", "releverUsages"]);
});

test("le manifeste sert la porte avec ses types, et le paquet publie src", () => {
  const manifeste = JSON.parse(lireSource(CHEMINS.manifeste));
  assert.deepEqual(manifeste.exports["./usages"], { types: "./src/usages.d.mts", default: "./src/usages.mjs" });
  assert.ok(manifeste.files.includes("src"));
});

// ─── Les exemples ─────────────────────────────────────────────────────────

test("chaque exemple d'appel a son résultat attendu, et inversement", () => {
  assert.deepEqual(Object.keys(ATTENDUS).sort(), Object.keys(EXEMPLES).sort(), "ATTENDUS n'a pas les mêmes exemples que EXEMPLES");
});

for (const [id, appeler] of Object.entries(EXEMPLES)) {
  test(`exemple de la porte, ${id}`, () => {
    assert.deepEqual(JSON.parse(JSON.stringify(appeler() ?? null)), ATTENDUS[id] ?? null);
  });
}

// ─── Les types ────────────────────────────────────────────────────────────

/** Compile des extraits TypeScript contre la porte et le kit tels qu'un module les voit, et rend les erreurs. */
function erreursDeCompilation(extraits) {
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noEmit: true,
    types: [],
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
  };
  const virtuels = new Map(extraits.map((texte, rang) => [enSlash(join(dossierDesTests, `__usages-types-${rang}.ts`)), texte]));
  const hote = ts.createCompilerHost(options);
  const { fileExists, readFile, getSourceFile } = hote;
  hote.fileExists = (nom) => virtuels.has(enSlash(nom)) || fileExists.call(hote, nom);
  hote.readFile = (nom) => virtuels.get(enSlash(nom)) ?? readFile.call(hote, nom);
  hote.getSourceFile = (nom, ...reste) => (virtuels.has(enSlash(nom))
    ? ts.createSourceFile(nom, virtuels.get(enSlash(nom)), ts.ScriptTarget.ES2022, true)
    : getSourceFile.call(hote, nom, ...reste));
  const programme = ts.createProgram([...virtuels.keys()], options, hote);
  const concernes = programme.getSourceFiles().filter((fichier) => virtuels.has(enSlash(fichier.fileName)) || enSlash(fichier.fileName).endsWith("/src/usages.d.mts"));
  return concernes.flatMap((fichier) => [...programme.getSyntacticDiagnostics(fichier), ...programme.getSemanticDiagnostics(fichier)])
    .map((erreur) => `${erreur.file ? enSlash(erreur.file.fileName).split("/").at(-1) : ""} : ${ts.flattenDiagnosticMessageText(erreur.messageText, "\n")}`);
}

test("la déclaration se compile, et lecteurDuCode va dans preparerControle sans conversion", () => {
  const extrait = [
    'import { lecteurDuCode } from "@ucm-kit/adapter-typescript/usages";',
    'import { preparerControle } from "@ucm-kit/core/modules";',
    'import type { LecteurDuCode } from "@ucm-kit/core/modules";',
    'export const controle = preparerControle("src/components/Button/Button.tsx", { texte: "", lecteur: lecteurDuCode });',
    "export const versLeKit: LecteurDuCode = lecteurDuCode;",
    "export const depuisLeKit: typeof lecteurDuCode = {} as LecteurDuCode;",
    "// @ts-expect-error la porte ne déclare pas d'autre nom",
    "export const autre = lecteurDuCode.nImporteQuoi;",
  ].join("\n");
  assert.deepEqual(erreursDeCompilation([extrait]), []);
});

test("la compilation voit une erreur de type quand elle existe", () => {
  const extrait = 'import { lecteurDuCode } from "@ucm-kit/adapter-typescript/usages";\nexport const faux: number = lecteurDuCode.extensions;';
  assert.notDeepEqual(erreursDeCompilation([extrait]), []);
});

// ─── Le journal ───────────────────────────────────────────────────────────

test("le journal de l'adaptateur se lit", () => {
  const { entrees, anomalies } = lireLeJournal(lireSource(CHEMINS.journal));
  assert.deepEqual(anomalies, []);
  assert.ok(entrees.some((entree) => entree.genre === "ajout" && entree.noms.has("lecteurDuCode")), "packages/adapter-typescript/CHANGELOG.md n'a pas l'entrée « ajout » de lecteurDuCode");
});

test("la porte et le journal tiennent depuis la version précédente de l'adaptateur", () => {
  let fautes;
  try {
    fautes = fautesDuDepot(racineDuDepot);
  } catch (erreur) {
    assert.fail(erreur.message);
  }
  assert.deepEqual(fautes, [], "toute modification de la porte demande une entrée du journal ; la règle est dans packages/kit/invariants/versionnage.md");
});

// ─── La règle sur des états fabriqués ─────────────────────────────────────

const dec = (texte) => ({ valeur: true, texte });
const etat = (version, declarations = {}, membres = null, attendusDeLEtat = {}) => ({
  version,
  declarations: new Map(Object.entries(declarations)),
  membres,
  attendus: attendusDeLEtat,
});
const entree = (version, genre, noms) => ({ version, genre, noms: new Set(noms), texte: "", decidePar: "le mainteneur" });
const fautes = (ref, courant, entrees) => fautesDeLaPorte({ ref, courant, entrees });
const MEMBRES = ["extensions", "fichiersDuComposant", "releverUsages"];

test("règle : une porte inchangée ne demande aucune entrée", () => {
  const avant = etat("0.2.13", { lecteurDuCode: dec("a") }, MEMBRES);
  assert.deepEqual(fautes(avant, etat("0.2.14", { lecteurDuCode: dec("a") }, MEMBRES), []), []);
});

test("règle : un nom nouveau demande une entrée « ajout » qui le nomme, dans une version postérieure", () => {
  const ref = etat("0.2.13");
  const courant = etat("0.2.14", { lecteurDuCode: dec("a") }, MEMBRES);
  assert.match(fautes(ref, courant, [])[0], /`lecteurDuCode` est un nom nouveau/);
  assert.deepEqual(fautes(ref, courant, [entree("0.2.14", "ajout", ["lecteurDuCode"])]), []);
  assert.match(fautes(ref, courant, [entree("0.2.14", "rupture", ["lecteurDuCode"])])[0], /nom nouveau/);
  assert.match(fautes(ref, courant, [entree("0.2.13", "ajout", ["lecteurDuCode"])])[0], /nom nouveau/);
});

test("règle : une déclaration changée ou un nom retiré est une rupture qui monte le chiffre du milieu", () => {
  const ref = etat("0.2.14", { lecteurDuCode: dec("a") }, MEMBRES);
  const change = etat("0.3.0", { lecteurDuCode: dec("b") }, MEMBRES);
  assert.match(fautes(ref, change, [])[0], /la déclaration de `lecteurDuCode` a changé/);
  assert.deepEqual(fautes(ref, change, [entree("0.3.0", "rupture", ["lecteurDuCode"])]), []);
  assert.match(fautes(ref, etat("0.2.15", { lecteurDuCode: dec("b") }, MEMBRES), [entree("0.2.15", "rupture", ["lecteurDuCode"])]).join("\n"), /chiffre du milieu/);
  assert.match(fautes(ref, etat("0.3.0", {}, null), [])[0], /`lecteurDuCode` est retiré de la porte/);
});

test("règle : un membre de lecteurDuCode ajouté demande un « ajout », retiré une « rupture »", () => {
  const ref = etat("0.2.14", { lecteurDuCode: dec("a") }, MEMBRES);
  assert.match(fautes(ref, etat("0.2.15", { lecteurDuCode: dec("a") }, [...MEMBRES, "lire"]), [])[0], /gagne lire/);
  assert.deepEqual(fautes(ref, etat("0.2.15", { lecteurDuCode: dec("a") }, [...MEMBRES, "lire"]), [entree("0.2.15", "ajout", ["lecteurDuCode"])]), []);
  assert.match(fautes(ref, etat("0.3.0", { lecteurDuCode: dec("a") }, MEMBRES.slice(1)), [])[0], /perd extensions/);
});

test("règle : un résultat attendu modifié ou retiré est une rupture, un exemple de plus n'en est pas une", () => {
  const declarations = { lecteurDuCode: dec("a") };
  const ref = etat("0.2.14", declarations, MEMBRES, { cas: { resultat: 1 } });
  assert.match(fautes(ref, etat("0.3.0", declarations, MEMBRES, { cas: { resultat: 2 } }), [entree("0.3.0", "ajout", ["lecteurDuCode"])])[0], /le résultat attendu de l'exemple « cas » a changé/);
  assert.deepEqual(fautes(ref, etat("0.3.0", declarations, MEMBRES, { cas: { resultat: 2 } }), [entree("0.3.0", "rupture", ["lecteurDuCode"])]), []);
  assert.match(fautes(ref, etat("0.3.0", declarations, MEMBRES, {}), [entree("0.3.0", "ajout", ["lecteurDuCode"])])[0], /a changé ou a disparu/);
  assert.deepEqual(fautes(ref, etat("0.2.15", declarations, MEMBRES, { cas: { resultat: 1 }, autre: { resultat: 3 } }), []), []);
});

test("règle : une version qui change la porte a une entrée à son propre numéro", () => {
  const ref = etat("0.2.13");
  const courant = etat("0.2.15", { lecteurDuCode: dec("a") }, MEMBRES);
  assert.match(fautes(ref, courant, [entree("0.2.14", "ajout", ["lecteurDuCode"])]).join("\n"), /aucune entrée pour 0\.2\.15/);
  assert.deepEqual(fautes(ref, courant, [entree("0.2.15", "ajout", ["lecteurDuCode"])]), []);
});

test("journal : chaque entrée a un genre connu et dit qui a décidé", () => {
  const bon = "# J\n\n## 0.2.14\n\n### ajout\n\nLe lecteur `a`.\n\nDécidé par le mainteneur.\n";
  assert.deepEqual(lireLeJournal(bon).anomalies, []);
  assert.deepEqual([...lireLeJournal(bon).entrees[0].noms], ["a"]);
  assert.match(lireLeJournal(bon.replace("Décidé par le mainteneur.", "")).anomalies.join("\n"), /« Décidé par/);
  assert.match(lireLeJournal(bon.replace("### ajout", "### nouveauté")).anomalies.join("\n"), /genre « nouveauté »/);
  assert.match(lireLeJournal(bon.replace("## 0.2.14", "## Version 14")).anomalies.join("\n"), /n'est pas un numéro de version/);
});

// ─── La lecture de Git, sur un dépôt fabriqué ─────────────────────────────

const DECLARATION_A = "export const lecteurDuCode: { extensions: string[] };\n";
const JOURNAL = (entrees) => `# Journal\n\n${entrees}`;
const ENTREE_AJOUT = (version) => `## ${version}\n\n### ajout\n\nLe lecteur \`lecteurDuCode\`.\n\nDécidé par le mainteneur.\n\n`;

function depotFabrique(rappel) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-usages-"));
  const ecrire = (fichiers) => {
    for (const [chemin, contenu] of Object.entries(fichiers)) {
      mkdirSync(dirname(join(racine, chemin)), { recursive: true });
      writeFileSync(join(racine, chemin), typeof contenu === "string" ? contenu : JSON.stringify(contenu));
    }
  };
  const commiter = (message) => {
    git(racine, "add", "-A");
    git(racine, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", message);
  };
  git(racine, "init", "-q");
  try {
    rappel({ racine, ecrire, commiter });
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test("Git : la version précédente se lit au parent du commit qui a posé le numéro", () => {
  depotFabrique(({ racine, ecrire, commiter }) => {
    ecrire({ [CHEMINS.manifeste]: { version: "0.2.13" } });
    commiter("avant la porte");
    ecrire({ [CHEMINS.manifeste]: { version: "0.2.14" }, [CHEMINS.dmts]: DECLARATION_A, [CHEMINS.journal]: JOURNAL(ENTREE_AJOUT("0.2.14")) });
    assert.equal(referenceDeLaPorte(racine, "0.2.14"), "HEAD", "une version posée dans la copie de travail se compare à HEAD");
    commiter("la porte");
    assert.equal(referenceDeLaPorte(racine, "0.2.14").endsWith("^"), true, "une version commitée se compare au parent de son commit");
    const ref = etatDeLaPorte(racine, referenceDeLaPorte(racine, "0.2.14"));
    assert.deepEqual([ref.version, ref.declarations.size], ["0.2.13", 0]);
    const courant = etatDeLaPorte(racine, null);
    assert.deepEqual([courant.version, [...courant.declarations.keys()]], ["0.2.14", ["lecteurDuCode"]]);
    assert.deepEqual(fautesDeLaPorte({ ref, courant, entrees: lireLeJournal(JOURNAL(ENTREE_AJOUT("0.2.14"))).entrees }), []);
    assert.match(fautesDeLaPorte({ ref, courant, entrees: [] })[0], /`lecteurDuCode` est un nom nouveau/, "un numéro commité garde son entrée : le journal ne peut pas se vider après coup");
  });
});
