/**
 * L'empreinte des entrées que `tsc` compile pour `packages/kit/dist`.
 *
 * Un plugin se construit avec esbuild, qui résout `@ucm-kit/core/*` par les
 * `exports` du kit, donc vers `dist/`. Modifier `packages/kit/src` puis
 * construire un plugin seul embarquait l'ancien `dist`, sans la moindre erreur.
 * Le build du kit écrit l'empreinte de ses entrées dans `dist/.empreinte` ; le
 * build d'un plugin la recalcule et refuse si elle a changé.
 *
 * Les entrées sont les fichiers des dossiers que liste `include` dans
 * `tsconfig.build.json`, ce fichier et ceux qu'il étend. La liste n'est pas
 * recopiée ici : un dossier ajouté à `include` entre seul dans l'empreinte.
 * `src/lecteurs` n'y est pas, puisque `tsc` ne le compile pas.
 *
 * L'empreinte porte sur les octets, sans normaliser les fins de ligne : un
 * changement de fin de ligne change l'empreinte et demande un rebuild du kit,
 * ce qui est sans danger. Les chemins sont relatifs à la racine, en `/`, triés.
 *
 * Toutes les fonctions prennent la racine du dépôt, pour que les tests
 * travaillent sur une copie temporaire.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_BUILD = "packages/kit/tsconfig.build.json";
const FICHIER_EMPREINTE = "packages/kit/dist/.empreinte";

/** Retire les commentaires `//` et `/* *\/` d'un JSON, sans toucher aux chaînes. */
function sansCommentaires(texte) {
  let sortie = "";
  let i = 0;
  while (i < texte.length) {
    const c = texte[i];
    if (c === '"') {
      let j = i + 1;
      while (j < texte.length && texte[j] !== '"') j += texte[j] === "\\" ? 2 : 1;
      sortie += texte.slice(i, j + 1);
      i = j + 1;
    } else if (c === "/" && texte[i + 1] === "/") {
      while (i < texte.length && texte[i] !== "\n") i++;
    } else if (c === "/" && texte[i + 1] === "*") {
      const fin = texte.indexOf("*/", i + 2);
      i = fin === -1 ? texte.length : fin + 2;
    } else {
      sortie += c;
      i++;
    }
  }
  return sortie;
}

function lireConfig(chemin) {
  return JSON.parse(sansCommentaires(readFileSync(chemin, "utf8")));
}

/** Le dossier ou le fichier que désigne un motif d'`include`, avant son premier joker. */
function racineDuMotif(motif) {
  const morceaux = motif.split("/");
  const fixes = [];
  for (const morceau of morceaux) {
    if (/[*?[{]/.test(morceau)) break;
    fixes.push(morceau);
  }
  return fixes.join("/");
}

function fichiersDe(chemin) {
  if (!existsSync(chemin)) return [];
  if (statSync(chemin).isFile()) return [chemin];
  const trouves = [];
  for (const entree of readdirSync(chemin, { withFileTypes: true })) {
    const complet = join(chemin, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDe(complet));
    else trouves.push(complet);
  }
  return trouves;
}

/** Les chemins absolus des entrées de la compilation du kit, sans doublon. */
export function entreesDuKit(racine) {
  const entrees = new Set();
  let config = resolve(racine, CONFIG_BUILD);
  const vus = new Set();
  while (config && !vus.has(config)) {
    vus.add(config);
    if (!existsSync(config)) {
      throw new Error(`Configuration introuvable : ${relative(racine, config)}`);
    }
    entrees.add(config);
    const parent = lireConfig(config).extends;
    config = typeof parent === "string" ? resolve(dirname(config), parent) : null;
  }
  const { include = [] } = lireConfig(resolve(racine, CONFIG_BUILD));
  const dossierKit = dirname(resolve(racine, CONFIG_BUILD));
  for (const motif of include) {
    for (const fichier of fichiersDe(resolve(dossierKit, racineDuMotif(motif)))) {
      entrees.add(fichier);
    }
  }
  return [...entrees];
}

/** L'empreinte SHA-256 des entrées du kit, en hexadécimal. */
export function calculerEmpreinte(racine) {
  const hash = createHash("sha256");
  const chemins = entreesDuKit(racine)
    .map((complet) => ({ complet, relatif: relative(racine, complet).split(sep).join("/") }))
    .sort((a, b) => (a.relatif < b.relatif ? -1 : a.relatif > b.relatif ? 1 : 0));
  for (const { complet, relatif } of chemins) {
    const contenu = readFileSync(complet);
    hash.update(`${relatif}\0${contenu.length}\0`);
    hash.update(contenu);
  }
  return hash.digest("hex");
}

/** Écrit l'empreinte courante dans `packages/kit/dist/.empreinte`. */
export function ecrireEmpreinte(racine) {
  const empreinte = calculerEmpreinte(racine);
  writeFileSync(join(racine, FICHIER_EMPREINTE), `${empreinte}\n`);
  return empreinte;
}

/**
 * Compare les sources du kit à `dist/.empreinte`.
 * Rend `{ ok: true }`, ou `{ ok: false, raison }` quand le fichier manque ou diffère.
 */
export function verifierKit(racine) {
  const fichier = join(racine, FICHIER_EMPREINTE);
  if (!existsSync(fichier)) {
    return { ok: false, raison: "packages/kit/dist/.empreinte est absent." };
  }
  const enregistree = readFileSync(fichier, "utf8").trim();
  if (enregistree !== calculerEmpreinte(racine)) {
    return { ok: false, raison: "les sources de packages/kit ont changé depuis son dernier build." };
  }
  return { ok: true };
}

// `node empreinte-du-kit.mjs ecrire` : appelé par le script `build` du kit, après `tsc`.
if (process.argv[2] === "ecrire") {
  const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
  ecrireEmpreinte(racine);
}
