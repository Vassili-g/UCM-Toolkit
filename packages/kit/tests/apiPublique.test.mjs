/**
 * La prise `@ucm-kit/core/modules` tient-elle sa promesse ?
 *
 * Cinq choses se prouvent ici, dont aucune ne dépend de la mémoire de
 * quelqu'un. La prise republie des fonctions que le toolkit appelle déjà, sous
 * leur nom, et aucun nom du référentiel. Chaque nom a un exemple d'appel sur
 * `fixtures/`, dont le résultat est écrit dans `prise-attendus.json`. Une
 * déclaration TypeScript dit la même chose que les portes d'origine. Le journal
 * `CHANGELOG.md` dit tout changement de la prise depuis la version précédente,
 * lue dans Git comme le fait `tests/versionSuitLeContenu.test.mjs`. Le numéro
 * du kit monte du chiffre du milieu quand la prise casse ou que le format
 * change.
 *
 * Les règles de décision sont dans `invariants/versionnage.md`. La limite est
 * celle de toute promesse par l'exemple : un changement de comportement
 * qu'aucun exemple ne couvre passe, et les exemples s'enrichissent à chaque
 * écart trouvé.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import * as format from "@ucm-kit/core/format";
import * as lecteurs from "@ucm-kit/core/lecteurs";
import * as prise from "@ucm-kit/core/modules";
import * as referentiel from "@ucm-kit/core/referentiel";
import { EXEMPLES, EXEMPLES_DE_TYPES } from "./prise-exemples.mjs";

const dossierDesTests = dirname(fileURLToPath(import.meta.url));
const racineDuKit = join(dossierDesTests, "..");
const racineDuDepot = join(racineDuKit, "..", "..");

const CHEMINS = {
  manifeste: "packages/kit/package.json",
  mjs: "packages/kit/src/modules/index.mjs",
  dmts: "packages/kit/src/modules/index.d.mts",
  attendus: "packages/kit/tests/prise-attendus.json",
  journal: "packages/kit/CHANGELOG.md",
  versionDuContrat: "packages/kit/src/format/version.ts",
  versionDesTokens: "packages/kit/src/format/tokens.ts",
};

/** Les portes d'où la prise republie, et rien d'autre. */
const PORTES_DE_LA_PRISE = ["@ucm-kit/core/lecteurs", "@ucm-kit/core/format"];

const GENRES = ["ajout", "déprécié", "rupture"];

const lireSource = (chemin) => readFileSync(join(racineDuDepot, chemin), "utf8");
const enSlash = (chemin) => chemin.split("\\").join("/");

// ─── La déclaration de la prise ───────────────────────────────────────────

/**
 * Les noms que `index.d.mts` exporte, chacun avec sa déclaration réduite à ce
 * qu'un module compile : commentaires retirés, espaces unifiés. `valeur` dit si
 * le nom existe à l'exécution ; `deprecie` porte le texte de `@deprecated`, ou
 * `null`.
 */
function declarationsDe(source) {
  const fichier = ts.createSourceFile("index.d.mts", source, ts.ScriptTarget.Latest, true);
  const imprimeur = ts.createPrinter({ removeComments: true });
  const texteDe = (noeud) => imprimeur.printNode(ts.EmitHint.Unspecified, noeud, fichier).replace(/\s+/g, " ").trim();
  const exporte = (noeud) => noeud.modifiers?.some((modificateur) => modificateur.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  const declarations = new Map();
  const ajouter = (nom, valeur, noeud, texte) => {
    const etiquette = ts.getJSDocDeprecatedTag(noeud);
    declarations.set(nom, { valeur, texte, deprecie: etiquette ? (ts.getTextOfJSDocComment(etiquette.comment) ?? "").trim() : null });
  };
  for (const noeud of fichier.statements) {
    if (ts.isFunctionDeclaration(noeud) && exporte(noeud)) ajouter(noeud.name.text, true, noeud, texteDe(noeud));
    else if (ts.isVariableStatement(noeud) && exporte(noeud)) {
      for (const declaration of noeud.declarationList.declarations) ajouter(declaration.name.text, true, noeud, texteDe(noeud));
    } else if ((ts.isInterfaceDeclaration(noeud) || ts.isTypeAliasDeclaration(noeud)) && exporte(noeud)) {
      ajouter(noeud.name.text, false, noeud, texteDe(noeud));
    } else if (ts.isExportDeclaration(noeud) && noeud.exportClause && ts.isNamedExports(noeud.exportClause)) {
      const origine = noeud.moduleSpecifier?.text ?? "";
      for (const element of noeud.exportClause.elements) {
        ajouter(element.name.text, !(noeud.isTypeOnly || element.isTypeOnly), noeud, `${origine} ${texteDe(element)}`);
      }
    }
  }
  return declarations;
}

/** Les portes qu'un module de source importe ou republie. */
const portesDe = (source) => ts.preProcessFile(source, true, true).importedFiles.map(({ fileName }) => fileName);

/** Le nom republié, avec la porte d'où `index.mjs` le tire. */
function republications(source) {
  const lues = new Map();
  for (const trouve of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
    for (const nom of trouve[1].split(",").map((brut) => brut.trim()).filter(Boolean)) lues.set(nom, trouve[2]);
  }
  return lues;
}

// ─── Le journal ───────────────────────────────────────────────────────────

/**
 * Les entrées du journal : un titre `## 0.17.0` par version, puis un titre
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
        anomalies.push(`le titre « ${titreDeVersion[1]} » n'est pas un numéro de version (« ## 0.17.0 »)`);
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

// ─── Les numéros ──────────────────────────────────────────────────────────

const analyser = (version) => String(version).split(".").map(Number);
function comparer(a, b) {
  const [x, y] = [analyser(a), analyser(b)];
  for (let rang = 0; rang < 3; rang += 1) if (x[rang] !== y[rang]) return x[rang] - y[rang];
  return 0;
}

// ─── La règle, sans Git ───────────────────────────────────────────────────

const decritLeNumero = (version) => `${analyser(version)[0]}.${analyser(version)[1]}`;

/**
 * Les fautes d'un changement de la prise, d'après deux états : la version
 * précédente (`ref`) et la copie courante. Un état porte `version`, `declarations`
 * (voir `declarationsDe`), `attendus` (id vers `{ nom, resultat }`) et `formats`
 * (`{ contrat, tokens }`, ou `null`).
 *
 * Table de la décision, version 0.x : ajout et dépréciation montent le dernier
 * chiffre, retrait, signature changée, résultat changé, nouvelle majeure du
 * contrat ou nouveau format de tokens montent le chiffre du milieu. Chaque
 * changement a son entrée, dans une version postérieure à `ref.version`.
 */
function fautesDeLaPrise({ ref, courant, entrees }) {
  const fautes = [];
  const monte = courant.version !== ref.version;
  const dansLeChangement = entrees.filter((entree) => comparer(entree.version, ref.version) > 0 && (!monte || comparer(entree.version, courant.version) <= 0));
  const entreesDe = (genre, nom) => dansLeChangement.filter((entree) => entree.genre === genre && entree.noms.has(nom));
  const milieuDeLaRef = analyser(ref.version)[1];
  const lesRuptures = [];
  let changement = false;

  const exigerEntree = (genre, nom, pourquoi) => {
    const trouvees = entreesDe(genre, nom);
    if (trouvees.length === 0) fautes.push(`${pourquoi} : le journal (packages/kit/CHANGELOG.md) n'a aucune entrée « ${genre} » qui nomme \`${nom}\`, dans une version postérieure à ${ref.version}.`);
    return trouvees;
  };

  for (const [nom, declaration] of courant.declarations) {
    const avant = ref.declarations.get(nom);
    if (declaration.deprecie === "") fautes.push(`\`${nom}\` porte @deprecated sans le nom qui le remplace : écrire le remplaçant après l'étiquette.`);
    if (avant === undefined) changement = true;
    if (avant === undefined) exigerEntree("ajout", nom, `\`${nom}\` est un nom nouveau de la prise`);
    else {
      if (avant.texte !== declaration.texte || (declaration.deprecie !== null && avant.deprecie === null)) changement = true;
      if (avant.texte !== declaration.texte) lesRuptures.push(...exigerEntree("rupture", nom, `la signature de \`${nom}\` a changé`));
      if (declaration.deprecie !== null && avant.deprecie === null) exigerEntree("déprécié", nom, `\`${nom}\` est annoncé comme déprécié`);
    }
  }
  for (const [nom, avant] of ref.declarations) {
    if (courant.declarations.has(nom)) continue;
    changement = true;
    if (avant.deprecie === null) fautes.push(`\`${nom}\` est retiré sans avoir été annoncé : le marquer @deprecated avec son remplaçant, le publier, puis le retirer à la version suivante.`);
    lesRuptures.push(...exigerEntree("rupture", nom, `\`${nom}\` est retiré de la prise`));
  }
  for (const [id, avant] of Object.entries(ref.attendus)) {
    if (!courant.declarations.has(avant.nom)) continue;
    if (JSON.stringify(courant.attendus[id]?.resultat) !== JSON.stringify(avant.resultat)) {
      lesRuptures.push(...exigerEntree("rupture", avant.nom, `le résultat attendu de l'exemple « ${id} » a changé ou a disparu`));
    }
  }

  const formatChange = ref.formats !== null && courant.formats !== null
    && (ref.formats.contrat !== courant.formats.contrat || ref.formats.tokens !== courant.formats.tokens);
  let entreesDuFormat = [];
  if (formatChange) {
    entreesDuFormat = dansLeChangement.filter((entree) => entree.texte.includes("CHANGELOG-FORMAT.md"));
    if (entreesDuFormat.length === 0) fautes.push("la majeure du contrat ou la version du format de tokens a changé : le journal n'a aucune entrée qui renvoie à CHANGELOG-FORMAT.md, dans une version postérieure à " + ref.version + ".");
  }

  for (const entree of [...lesRuptures, ...entreesDuFormat]) {
    if (analyser(entree.version)[1] <= milieuDeLaRef) {
      fautes.push(`l'entrée ${entree.version} « ${entree.genre} » casse la prise ou le format, et ${entree.version} garde le chiffre du milieu de ${ref.version} : monter à ${analyser(ref.version)[0]}.${milieuDeLaRef + 1}.0.`);
    }
  }
  const casse = lesRuptures.length > 0 || formatChange;
  if (monte && casse && analyser(courant.version)[1] <= milieuDeLaRef) {
    fautes.push(`la prise ou le format casse, et le kit passe de ${ref.version} à ${courant.version} : le chiffre du milieu doit monter (${decritLeNumero(ref.version)} vers ${analyser(ref.version)[0]}.${milieuDeLaRef + 1}).`);
  }

  if (monte && (changement || casse) && !entrees.some((entree) => entree.version === courant.version)) {
    fautes.push(`le kit passe de ${ref.version} à ${courant.version} et la prise change : le journal n'a aucune entrée pour ${courant.version}.`);
  }
  return [...new Set(fautes)];
}

// ─── La version précédente, lue dans Git ──────────────────────────────────

const MESSAGE_SANS_HISTORIQUE = "L'historique Git ne remonte pas assez loin pour lire la version précédente de la prise (clone superficiel ?). "
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
 * travail, ou une prise modifiée sans nouveau numéro, se compare à `HEAD`. Une
 * version déjà commitée se compare au parent du commit qui a posé son numéro :
 * c'est lui qui rend à la prise tout ce que cette version a changé.
 */
function referenceDeLaPrise(racine, versionCourante) {
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

/** Un état de la prise : sur le disque si `ref` est `null`, sinon dans Git. */
function etatDeLaPrise(racine, ref) {
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
  const contrat = /CONTRACT_VERSION\s*=\s*'(\d+)/.exec(lire(CHEMINS.versionDuContrat) ?? "")?.[1];
  const tokens = /TOKENS_FORMAT_VERSION\s*=\s*(\d+)/.exec(lire(CHEMINS.versionDesTokens) ?? "")?.[1];
  const declarations = lire(CHEMINS.dmts);
  const attendus = lire(CHEMINS.attendus);
  return {
    version: manifeste === null ? "0.0.0" : JSON.parse(manifeste).version,
    declarations: declarations === null ? new Map() : declarationsDe(declarations),
    attendus: attendus === null ? {} : JSON.parse(attendus),
    formats: contrat === undefined || tokens === undefined ? null : { contrat: Number(contrat), tokens: Number(tokens) },
  };
}

/** Toutes les fautes de la prise d'un dépôt : sa version précédente dans Git, son journal sur le disque. */
function fautesDuDepot(racine) {
  const courant = etatDeLaPrise(racine, null);
  const ref = etatDeLaPrise(racine, referenceDeLaPrise(racine, courant.version));
  let texte = "";
  try {
    texte = readFileSync(join(racine, CHEMINS.journal), "utf8");
  } catch {
    // Un journal absent se dit par ses fautes : aucune entrée n'existe.
  }
  const { entrees, anomalies } = lireLeJournal(texte);
  return [...anomalies, ...fautesDeLaPrise({ ref, courant, entrees })];
}

// ─── Ce que la prise publie ───────────────────────────────────────────────

const declarationsCourantes = declarationsDe(lireSource(CHEMINS.dmts));
const republiees = republications(lireSource(CHEMINS.mjs));

test("la prise publie à l'exécution exactement les noms de valeur que sa déclaration annonce", () => {
  const declares = [...declarationsCourantes].filter(([, declaration]) => declaration.valeur).map(([nom]) => nom).sort();
  assert.deepEqual(Object.keys(prise).sort(), declares);
  assert.ok(declares.length >= 7, "la prise a perdu ses fonctions");
});

test("chaque fonction de la prise est celle de sa porte d'origine, sous son nom", () => {
  const portes = { "@ucm-kit/core/lecteurs": lecteurs, "@ucm-kit/core/format": format };
  assert.deepEqual([...republiees.keys()].sort(), Object.keys(prise).sort(), "index.mjs republie autre chose que ce que la prise exporte");
  for (const [nom, porte] of republiees) {
    assert.ok(porte in portes, `${nom} vient de ${porte}, qui n'est pas une porte d'origine admise`);
    assert.equal(prise[nom], portes[porte][nom], `${nom} n'est pas la fonction de ${porte}`);
  }
});

test("la prise ne tire que de lecteurs et de format, dans sa source comme dans sa déclaration", () => {
  for (const chemin of [CHEMINS.mjs, CHEMINS.dmts]) {
    const hors = portesDe(lireSource(chemin)).filter((porte) => !PORTES_DE_LA_PRISE.includes(porte));
    assert.deepEqual(hors, [], `${chemin} importe une porte que la prise n'admet pas`);
  }
});

test("aucun nom du référentiel n'entre dans la prise", () => {
  const communs = [...declarationsCourantes.keys()].filter((nom) => nom in referentiel);
  assert.deepEqual(communs, [], "un module qui réclame un nom du référentiel révèle un trou du contrat : le corriger dans le format");
  assert.equal(portesDe(lireSource(CHEMINS.mjs)).includes("@ucm-kit/core/referentiel"), false);
});

// ─── Les exemples ─────────────────────────────────────────────────────────

const attendus = JSON.parse(lireSource(CHEMINS.attendus));

test("chaque nom de la prise a un exemple d'appel, et chaque exemple vise un nom de la prise", () => {
  const exemples = new Set([...Object.values(EXEMPLES).map(({ nom }) => nom), ...Object.keys(EXEMPLES_DE_TYPES)]);
  const sansExemple = [...declarationsCourantes.keys()].filter((nom) => !exemples.has(nom));
  assert.deepEqual(sansExemple, [], "ajouter un exemple dans tests/prise-exemples.mjs et son résultat dans prise-attendus.json");
  const orphelins = [...exemples].filter((nom) => !declarationsCourantes.has(nom));
  assert.deepEqual(orphelins, [], "un exemple vise un nom qui n'est plus dans la prise");
  assert.deepEqual(Object.keys(attendus).sort(), Object.keys(EXEMPLES).sort(), "prise-attendus.json n'a pas les mêmes exemples que prise-exemples.mjs");
});

for (const [id, exemple] of Object.entries(EXEMPLES)) {
  test(`exemple de la prise, ${id}`, () => {
    assert.equal(attendus[id]?.nom, exemple.nom);
    assert.deepEqual(JSON.parse(JSON.stringify(exemple.appeler() ?? null)), attendus[id]?.resultat ?? null);
  });
}

// ─── Les types ────────────────────────────────────────────────────────────

/** Compile des extraits TypeScript contre le kit tel qu'un module le voit, et rend les erreurs. */
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
  const virtuels = new Map(extraits.map((texte, rang) => [enSlash(join(dossierDesTests, `__prise-types-${rang}.ts`)), texte]));
  const hote = ts.createCompilerHost(options);
  const { fileExists, readFile, getSourceFile } = hote;
  hote.fileExists = (nom) => virtuels.has(enSlash(nom)) || fileExists.call(hote, nom);
  hote.readFile = (nom) => virtuels.get(enSlash(nom)) ?? readFile.call(hote, nom);
  hote.getSourceFile = (nom, ...reste) => (virtuels.has(enSlash(nom))
    ? ts.createSourceFile(nom, virtuels.get(enSlash(nom)), ts.ScriptTarget.ES2022, true)
    : getSourceFile.call(hote, nom, ...reste));
  const programme = ts.createProgram([...virtuels.keys()], options, hote);
  const concernes = programme.getSourceFiles().filter((fichier) => virtuels.has(enSlash(fichier.fileName)) || enSlash(fichier.fileName).endsWith("/src/modules/index.d.mts"));
  return concernes.flatMap((fichier) => [...programme.getSyntacticDiagnostics(fichier), ...programme.getSemanticDiagnostics(fichier)])
    .map((erreur) => `${erreur.file ? enSlash(erreur.file.fileName).split("/").at(-1) : ""} : ${ts.flattenDiagnosticMessageText(erreur.messageText, "\n")}`);
}

test("la déclaration de la prise se compile et dit la même chose que les portes d'origine", () => {
  // Une fonction de la prise s'affecte à celle de sa porte, et l'inverse, sauf
  // celle dont le retour est plus précis : celle-là ne va que dans un sens.
  const PRECISES = ["vueExacteDuVariant"];
  const lignes = [
    'import * as prise from "@ucm-kit/core/modules";',
    'import * as lecteurs from "@ucm-kit/core/lecteurs";',
    'import * as format from "@ucm-kit/core/format";',
  ];
  for (const [nom, porte] of republiees) {
    const alias = porte.endsWith("/lecteurs") ? "lecteurs" : "format";
    lignes.push(`export const vers_${nom}: typeof ${alias}.${nom} = prise.${nom};`);
    if (!PRECISES.includes(nom)) lignes.push(`export const depuis_${nom}: typeof prise.${nom} = ${alias}.${nom};`);
  }
  assert.deepEqual(erreursDeCompilation([lignes.join("\n")]), []);
});

test("vueExacteDuVariant rend un type précis, pas `unknown`", () => {
  const extrait = [
    'import { vueExacteDuVariant } from "@ucm-kit/core/modules";',
    'import type { EffectStyleUse, TextStyleUse } from "@ucm-kit/core/format";',
    "const vue = vueExacteDuVariant({}, {});",
    "export const effets: EffectStyleUse[] | undefined = vue?.effects;",
    "export const typographie: TextStyleUse[] | undefined = vue?.typography;",
    "// @ts-expect-error une partie qui n'existe pas dans la vue",
    "export const inconnue = vue?.nImporteQuoi;",
  ].join("\n");
  assert.deepEqual(erreursDeCompilation([extrait]), []);
});

for (const [nom, extrait] of Object.entries(EXEMPLES_DE_TYPES)) {
  test(`exemple de la prise, le type ${nom} se compile`, () => {
    assert.deepEqual(erreursDeCompilation([extrait]), []);
  });
}

test("la compilation voit une erreur de type quand elle existe", () => {
  assert.notDeepEqual(erreursDeCompilation(['import { verdictDeVersion } from "@ucm-kit/core/modules";\nexport const faux: number = verdictDeVersion("13.0");']), []);
});

// ─── Les numéros ──────────────────────────────────────────────────────────

test("le kit reste en 0.x : en 1.0, la table des numéros se décale d'un cran", () => {
  const { version } = JSON.parse(lireSource(CHEMINS.manifeste));
  assert.equal(analyser(version)[0], 0, "le mainteneur décide du passage en 1.0 : "
    + "décaler alors les règles de packages/kit/invariants/versionnage.md et de fautesDeLaPrise d'un cran");
});

test("le chemin du schéma que `ucm init` écrit dans les réglages d'éditeur est promis avec la prise", () => {
  const manifeste = JSON.parse(lireSource(CHEMINS.manifeste));
  assert.equal(manifeste.exports["./schema"], "./schema/ucm-contract.schema.json");
  assert.ok(manifeste.files.includes("schema"));
  assert.ok(manifeste.exports["./modules"], "la prise n'est plus une porte du kit");
  assert.ok(manifeste.files.includes("src/modules"), "la prise n'est pas publiée");
  assert.match(lireSource("packages/cli/src/init.mjs"), /node_modules\/@ucm-kit\/core\/schema\/ucm-contract\.schema\.json/);
});

// ─── Le journal ───────────────────────────────────────────────────────────

test("le journal du kit se lit, et il porte l'entrée « ajout » de la première version de la prise", () => {
  const { entrees, anomalies } = lireLeJournal(lireSource(CHEMINS.journal));
  assert.deepEqual(anomalies, []);
  assert.ok(entrees.some((entree) => entree.version === "0.17.0" && entree.genre === "ajout"), "packages/kit/CHANGELOG.md n'a pas l'entrée « ajout » de la 0.17.0");
});

test("la prise et le journal tiennent depuis la version précédente du kit", () => {
  let fautes;
  try {
    fautes = fautesDuDepot(racineDuDepot);
  } catch (erreur) {
    assert.fail(erreur.message);
  }
  assert.deepEqual(fautes, [], "toute modification de la prise demande une entrée du journal ; la règle est dans packages/kit/invariants/versionnage.md");
});

// ─── La règle sur des états fabriqués ─────────────────────────────────────

const dec = (texte, deprecie = null, valeur = true) => ({ valeur, texte, deprecie });
const etat = (version, declarations = {}, attendusDeLEtat = {}, formats = { contrat: 14, tokens: 2 }) => ({
  version,
  declarations: new Map(Object.entries(declarations)),
  attendus: attendusDeLEtat,
  formats,
});
const entree = (version, genre, noms, texte = "") => ({ version, genre, noms: new Set(noms), texte, decidePar: "le mainteneur" });
const fautes = (ref, courant, entrees) => fautesDeLaPrise({ ref, courant, entrees });

test("règle : une prise inchangée ne demande aucune entrée", () => {
  const prise1 = { a: dec("function a(): 1") };
  assert.deepEqual(fautes(etat("0.17.0", prise1), etat("0.17.1", prise1), []), []);
});

test("règle : un nom ajouté demande une entrée « ajout » qui le nomme", () => {
  const ref = etat("0.17.0", { a: dec("function a(): 1") });
  const courant = etat("0.17.1", { a: dec("function a(): 1"), b: dec("function b(): 2") });
  assert.match(fautes(ref, courant, [])[0], /`b` est un nom nouveau/);
  assert.equal(fautes(ref, courant, [entree("0.17.1", "ajout", ["b"])]).length, 0);
  assert.match(fautes(ref, courant, [entree("0.17.1", "rupture", ["b"])])[0], /`b` est un nom nouveau/);
  assert.match(fautes(ref, courant, [entree("0.17.0", "ajout", ["b"])])[0], /`b` est un nom nouveau/, "une entrée de la version précédente ne compte pas");
});

test("règle : retirer un nom exige un préavis, une entrée « rupture » et le chiffre du milieu", () => {
  const sansPreavis = etat("0.17.0", { a: dec("function a(): 1"), b: dec("function b(): 2") });
  const apres = etat("0.18.0", { a: dec("function a(): 1") });
  const retrait = fautes(sansPreavis, apres, [entree("0.18.0", "rupture", ["b"])]);
  assert.match(retrait.join("\n"), /`b` est retiré sans avoir été annoncé/);

  const annonce = etat("0.17.1", { a: dec("function a(): 1"), b: dec("function b(): 2", "Remplacé par `a`.") });
  assert.deepEqual(fautes(annonce, apres, [entree("0.18.0", "rupture", ["b"])]), []);
  assert.match(fautes(annonce, apres, [])[0], /`b` est retiré de la prise/);
  const memeMilieu = etat("0.17.2", { a: dec("function a(): 1") });
  assert.match(fautes(annonce, memeMilieu, [entree("0.17.2", "rupture", ["b"])]).join("\n"), /chiffre du milieu/);
});

test("règle : une signature changée est une rupture", () => {
  const ref = etat("0.17.0", { a: dec("function a(): 1") });
  const courant = etat("0.18.0", { a: dec("function a(): 2") });
  assert.match(fautes(ref, courant, [])[0], /la signature de `a` a changé/);
  assert.deepEqual(fautes(ref, courant, [entree("0.18.0", "rupture", ["a"])]), []);
});

test("règle : un résultat attendu modifié ou retiré est une rupture", () => {
  const declarations = { a: dec("function a(): 1") };
  const ref = etat("0.17.0", declarations, { "a : cas": { nom: "a", resultat: 1 } });
  const modifie = etat("0.18.0", declarations, { "a : cas": { nom: "a", resultat: 2 } });
  assert.match(fautes(ref, modifie, [entree("0.18.0", "ajout", ["a"])])[0], /le résultat attendu de l'exemple « a : cas » a changé/);
  assert.deepEqual(fautes(ref, modifie, [entree("0.18.0", "rupture", ["a"])]), []);
  assert.match(fautes(ref, etat("0.18.0", declarations, {}), [entree("0.18.0", "ajout", ["a"])])[0], /a changé ou a disparu/);
  assert.deepEqual(fautes(ref, etat("0.18.0", declarations, { "a : cas": { nom: "a", resultat: 1 }, "a : autre": { nom: "a", resultat: 3 } }), []), [], "un exemple de plus n'est pas une rupture");
});

test("règle : une dépréciation demande son entrée et le nom qui remplace", () => {
  const ref = etat("0.17.0", { a: dec("function a(): 1"), b: dec("function b(): 1") });
  const courant = etat("0.17.1", { a: dec("function a(): 1", "Remplacé par `b`."), b: dec("function b(): 1") });
  assert.match(fautes(ref, courant, [])[0], /`a` est annoncé comme déprécié/);
  assert.deepEqual(fautes(ref, courant, [entree("0.17.1", "déprécié", ["a"])]), []);
  const sansRemplacant = etat("0.17.1", { a: dec("function a(): 1", ""), b: dec("function b(): 1") });
  assert.match(fautes(ref, sansRemplacant, [entree("0.17.1", "déprécié", ["a"])])[0], /sans le nom qui le remplace/);
});

test("règle : une nouvelle majeure du contrat ou un nouveau format de tokens monte le chiffre du milieu et renvoie à CHANGELOG-FORMAT.md", () => {
  const declarations = { a: dec("function a(): 1") };
  const ref = etat("0.17.0", declarations);
  const courant = etat("0.17.1", declarations, {}, { contrat: 15, tokens: 2 });
  const sansRenvoi = fautes(ref, courant, [entree("0.17.1", "ajout", ["a"], "Le contrat passe en 15.")]).join("\n");
  assert.match(sansRenvoi, /CHANGELOG-FORMAT\.md/);
  assert.match(sansRenvoi, /chiffre du milieu/);
  const bon = etat("0.18.0", declarations, {}, { contrat: 15, tokens: 2 });
  assert.deepEqual(fautes(ref, bon, [entree("0.18.0", "rupture", [], "Voir CHANGELOG-FORMAT.md.")]), []);
  const jetons = etat("0.18.0", declarations, {}, { contrat: 14, tokens: 3 });
  assert.match(fautes(ref, jetons, [])[0], /CHANGELOG-FORMAT\.md/);
});

test("règle : une version qui change la prise a une entrée à son propre numéro", () => {
  const ref = etat("0.17.0", { a: dec("function a(): 1") });
  const courant = etat("0.17.2", { a: dec("function a(): 1"), b: dec("function b(): 1") });
  assert.match(fautes(ref, courant, [entree("0.17.1", "ajout", ["b"])]).join("\n"), /aucune entrée pour 0\.17\.2/);
  assert.deepEqual(fautes(ref, courant, [entree("0.17.2", "ajout", ["b"])]), []);
});

test("journal : chaque entrée a un genre connu et dit qui a décidé", () => {
  const bon = "# J\n\n## 0.17.0\n\n### ajout\n\nLa prise `a`.\n\nDécidé par le mainteneur.\n";
  assert.deepEqual(lireLeJournal(bon).anomalies, []);
  assert.deepEqual([...lireLeJournal(bon).entrees[0].noms], ["a"]);
  assert.match(lireLeJournal(bon.replace("Décidé par le mainteneur.", "")).anomalies.join("\n"), /« Décidé par/);
  assert.match(lireLeJournal(bon.replace("### ajout", "### nouveauté")).anomalies.join("\n"), /genre « nouveauté »/);
  assert.match(lireLeJournal(bon.replace("## 0.17.0", "## Version 17")).anomalies.join("\n"), /n'est pas un numéro de version/);
});

// ─── La lecture de Git, sur un dépôt fabriqué ─────────────────────────────

const DECLARATION_A = 'export function a(x: string): string;\n';
const DECLARATION_AB = `${DECLARATION_A}export function b(): number;\n`;
const JOURNAL = (entrees) => `# Journal\n\n${entrees}`;
const ENTREE_AJOUT = (version, noms) => `## ${version}\n\n### ajout\n\nNoms ${noms.map((nom) => `\`${nom}\``).join(", ")}.\n\nDécidé par le mainteneur.\n\n`;

function depotFabrique(rappel) {
  const racine = mkdtempSync(join(tmpdir(), "ucm-prise-"));
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
    ecrire({ [CHEMINS.manifeste]: { version: "0.16.0" } });
    commiter("avant la prise");
    ecrire({ [CHEMINS.manifeste]: { version: "0.17.0" }, [CHEMINS.dmts]: DECLARATION_A, [CHEMINS.journal]: JOURNAL(ENTREE_AJOUT("0.17.0", ["a"])) });
    commiter("la prise");
    assert.deepEqual(fautesDuDepot(racine), []);

    ecrire({ [CHEMINS.journal]: JOURNAL("") });
    commiter("journal vidé");
    assert.match(fautesDuDepot(racine).join("\n"), /`a` est un nom nouveau/, "un numéro commité garde son entrée : le journal ne peut pas se vider après coup");
  });
});

test("Git : un nom retiré de la copie de travail sans entrée échoue ; une montée sans entrée aussi", () => {
  depotFabrique(({ racine, ecrire, commiter }) => {
    ecrire({ [CHEMINS.manifeste]: { version: "0.16.0" } });
    commiter("avant");
    ecrire({ [CHEMINS.manifeste]: { version: "0.17.0" }, [CHEMINS.dmts]: DECLARATION_AB, [CHEMINS.journal]: JOURNAL(ENTREE_AJOUT("0.17.0", ["a", "b"])) });
    commiter("la prise");
    assert.deepEqual(fautesDuDepot(racine), []);

    ecrire({ [CHEMINS.dmts]: DECLARATION_A });
    const retrait = fautesDuDepot(racine).join("\n");
    assert.match(retrait, /`b` est retiré sans avoir été annoncé/);
    assert.match(retrait, /`b` est retiré de la prise/);

    ecrire({ [CHEMINS.dmts]: DECLARATION_AB, [CHEMINS.manifeste]: { version: "0.17.1" }, [CHEMINS.attendus]: { cas: { nom: "a", resultat: 1 } } });
    assert.deepEqual(fautesDuDepot(racine), [], "un exemple ajouté sans nom nouveau ne change rien");
    commiter("exemple");
    ecrire({ [CHEMINS.manifeste]: { version: "0.17.2" }, [CHEMINS.attendus]: { cas: { nom: "a", resultat: 2 } } });
    assert.match(fautesDuDepot(racine).join("\n"), /le résultat attendu de l'exemple « cas » a changé/);
  });
});

test("Git : un clone sans historique donne un message clair, pas une erreur obscure", () => {
  depotFabrique(({ racine, ecrire, commiter }) => {
    ecrire({ [CHEMINS.manifeste]: { version: "0.17.0" }, [CHEMINS.dmts]: DECLARATION_A });
    commiter("seul commit");
    assert.throws(() => fautesDuDepot(racine), /L'historique Git ne remonte pas assez loin/);
  });
});
