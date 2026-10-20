/**
 * Calcule les documents à lire avant de modifier un fichier, et ceux à relire
 * après, à partir du manifeste `.agents/domiciles.json`.
 *
 *   node scripts/agents-contexte.mjs lire <chemin…>
 *   node scripts/agents-contexte.mjs domicile <chemin>
 *   node scripts/agents-contexte.mjs diff [--base <ref>]
 *   node scripts/agents-contexte.mjs ecrire-index [<paquet> [--ecrire]]
 *
 * Un chemin a un seul domicile : parmi les motifs du manifeste qui lui
 * correspondent, le plus long en caractères l'emporte, et à longueur égale le
 * dernier dans l'ordre du fichier. Un chemin exact bat donc un motif `**` de
 * son dossier, quel que soit l'ordre des domaines. Tant que le fichier d'un domicile n'existe pas, le groupe d'invariants
 * correspondant reste dans `AGENTS.md`, et la sortie donne ses lignes.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Convertit un motif glob (`*` dans un segment, `**` sur plusieurs) en expression régulière. */
export function motifVersRegex(motif) {
  let source = "";
  for (let i = 0; i < motif.length; i++) {
    const c = motif[i];
    if (c === "*" && motif[i + 1] === "*") {
      if (motif[i + 2] === "/") {
        source += "(?:.*/)?";
        i += 2;
      } else {
        source += ".*";
        i += 1;
      }
    } else if (c === "*") source += "[^/]*";
    else if (c === "?") source += "[^/]";
    else source += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

export function correspond(motif, chemin) {
  return motifVersRegex(motif).test(chemin);
}

/** Rend un chemin relatif à la racine, séparé par `/`, sans `./` initial. */
export function normaliser(chemin, racine = RACINE) {
  let c = chemin.replace(/\\/g, "/");
  const racineNormalisee = racine.replace(/\\/g, "/").replace(/\/$/, "");
  if (isAbsolute(chemin) || /^[a-zA-Z]:\//.test(c)) {
    if (c.toLowerCase().startsWith(`${racineNormalisee.toLowerCase()}/`)) {
      c = relative(racine, chemin).replace(/\\/g, "/");
    }
  }
  return c.replace(/^\.\//, "");
}

export function chargerManifeste(racine = RACINE) {
  return JSON.parse(readFileSync(join(racine, ".agents", "domiciles.json"), "utf8"));
}

/** Le domaine du motif le plus long qui correspond à `chemin` (le dernier à égalité), ou `null`. */
export function domaineDe(manifeste, chemin) {
  let trouve = null;
  let longueur = -1;
  for (const domaine of manifeste.domaines) {
    for (const motif of domaine.chemins) {
      if (motif.length >= longueur && correspond(motif, chemin)) {
        trouve = domaine;
        longueur = motif.length;
      }
    }
  }
  return trouve;
}

/** `packages/<paquet>` si le chemin est dans un paquet. */
export function paquetDe(chemin) {
  const m = /^(packages\/[^/]+)\//.exec(chemin);
  return m ? m[1] : null;
}

/** Lignes (numérotées depuis 1) du groupe `### <titre>` de `AGENTS.md`, ou `null`. */
export function lignesDuGroupe(texteAgents, titre) {
  const lignes = texteAgents.split(/\r?\n/);
  const debut = lignes.indexOf(`### ${titre}`);
  if (debut === -1) return null;
  let fin = lignes.length;
  for (let i = debut + 1; i < lignes.length; i++) {
    if (/^#{2,3} /.test(lignes[i])) {
      fin = i;
      break;
    }
  }
  return { debut: debut + 1, fin };
}

/**
 * Le document à lire pour un domaine : son fichier, ou à défaut les lignes de
 * son groupe dans `AGENTS.md`.
 * @param {{ existe: (chemin: string) => boolean, agents: string }} contexte
 */
export function documentDuDomaine(domaine, contexte) {
  if (contexte.existe(domaine.fichier)) return domaine.fichier;
  const groupe = lignesDuGroupe(contexte.agents, domaine.titre);
  if (groupe) return `AGENTS.md:${groupe.debut}-${groupe.fin}  ${domaine.titre}`;
  return domaine.fichier;
}

/** Documents à lire avant de modifier `chemins`. Liste triée, sans doublon. */
export function lire(manifeste, chemins, contexte) {
  const sortie = new Set(["AGENTS.md"]);
  const sansDomicile = [];
  for (const chemin of chemins) {
    const paquet = paquetDe(chemin);
    const carte = manifeste.cartes[paquet ?? "."];
    if (paquet && contexte.existe(`${paquet}/AGENTS.md`)) sortie.add(`${paquet}/AGENTS.md`);
    if (carte && contexte.existe(carte)) sortie.add(carte);
    const domaine = domaineDe(manifeste, chemin);
    if (!domaine) {
      sansDomicile.push(chemin);
      continue;
    }
    sortie.add(documentDuDomaine(domaine, contexte));
    for (const spec of domaine.specs) sortie.add(spec);
  }
  return { documents: [...sortie].sort(), sansDomicile };
}

/**
 * Lit la sortie de `git diff --name-status` : une entrée par chemin touché.
 * Un renommage ou une copie donne l'ancien chemin (`supprime`) et le nouveau.
 */
export function lireStatuts(sortieGit) {
  const modifies = [];
  const supprimes = [];
  for (const ligne of sortieGit.split(/\r?\n/)) {
    if (!ligne.trim()) continue;
    const [statut, premier, second] = ligne.split("\t");
    if (statut.startsWith("D")) supprimes.push(premier);
    else if (statut.startsWith("R")) {
      supprimes.push(premier);
      modifies.push(second);
    } else modifies.push(second ?? premier);
  }
  return { modifies, supprimes };
}

/**
 * Les quatre listes de `diff`. `citeurs(chemin)` rend les fichiers Markdown
 * qui contiennent le chemin littéral.
 */
export function diff(manifeste, { modifies, supprimes }, contexte, citeurs) {
  const domiciles = new Set();
  const lies = new Set();
  const verifications = new Set();
  for (const chemin of [...modifies, ...supprimes]) {
    const domaine = domaineDe(manifeste, chemin);
    if (!domaine) continue;
    domiciles.add(documentDuDomaine(domaine, contexte));
    for (const l of domaine.lies) lies.add(l);
    for (const v of domaine.verifications) verifications.add(v);
  }
  const citant = new Set();
  for (const chemin of supprimes) for (const doc of citeurs(chemin)) citant.add(doc);
  const trie = (ensemble) => [...ensemble].sort();
  return {
    "Domiciles à relire": trie(domiciles),
    "Documents liés": trie(lies),
    "Vérifications": trie(verifications),
    "Documents qui citent un chemin supprimé ou renommé": trie(citant),
  };
}

/** Table Markdown « Domaine | Fichier | Chemins », générée depuis le manifeste. */
export function ecrireIndex(manifeste) {
  const lignes = ["| Domaine | Fichier | Chemins |", "|---|---|---|"];
  for (const d of manifeste.domaines) {
    const chemins = d.chemins.length ? d.chemins.map((c) => `\`${c}\``).join(", ") : "aucun";
    lignes.push(`| ${d.titre} | \`${d.fichier}\` | ${chemins} |`);
  }
  return `${lignes.join("\n")}\n`;
}

const MARQUE_DEBUT = "<!-- domaines:debut -->";
const MARQUE_FIN = "<!-- domaines:fin -->";

/**
 * Table « Invariants | Chemins » des domaines d'un paquet (`<paquet>` sans le
 * préfixe `packages/`), dans l'ordre du manifeste. Un domaine y figure si un
 * de ses motifs porte sur le paquet ou si son fichier y est.
 */
export function indexDuPaquet(manifeste, paquet) {
  const prefixe = `packages/${paquet}/`;
  const lignes = ["| Invariants | Chemins |", "|---|---|"];
  for (const d of manifeste.domaines) {
    const motifs = d.chemins.filter((c) => c.startsWith(prefixe)).map((c) => c.slice(prefixe.length));
    if (motifs.length === 0 && !d.fichier.startsWith(prefixe)) continue;
    const lien = d.fichier.startsWith(prefixe)
      ? `./${d.fichier.slice(prefixe.length)}`
      : `../${d.fichier.slice("packages/".length)}`;
    const cellule = motifs.length
      ? motifs.map((m) => (m === "src/**" ? "tout le paquet (défaut)" : `\`${m}\``)).join(", ")
      : "aucun";
    lignes.push(`| [${d.titre}](${lien}) | ${cellule} |`);
  }
  return `${lignes.join("\n")}\n`;
}

/** Texte entre les marqueurs `domaines:debut` et `domaines:fin`, ou `null` si l'un manque. */
export function blocDomaines(texte) {
  const debut = texte.indexOf(MARQUE_DEBUT);
  const fin = texte.indexOf(MARQUE_FIN);
  if (debut === -1 || fin === -1 || fin < debut) return null;
  return texte.slice(debut + MARQUE_DEBUT.length + 1, fin);
}

/** Remplace le texte entre les marqueurs par `table`. Lève si un marqueur manque. */
export function remplacerBlocDomaines(texte, table) {
  if (blocDomaines(texte) === null) {
    throw new Error(`Marqueurs ${MARQUE_DEBUT} et ${MARQUE_FIN} introuvables.`);
  }
  const debut = texte.indexOf(MARQUE_DEBUT) + MARQUE_DEBUT.length;
  const fin = texte.indexOf(MARQUE_FIN);
  return `${texte.slice(0, debut)}\n${table}${texte.slice(fin)}`;
}

function git(args, racine) {
  const r = spawnSync("git", ["-c", "core.quotepath=false", ...args], { cwd: racine, encoding: "utf8", maxBuffer: 1 << 28 });
  return { code: r.status ?? 1, sortie: r.stdout ?? "", erreur: r.stderr ?? "" };
}

function contexteDisque(racine) {
  return {
    existe: (chemin) => existsSync(join(racine, chemin)),
    agents: readFileSync(join(racine, "AGENTS.md"), "utf8"),
  };
}

function citeursGit(racine) {
  return (chemin) => {
    const r = git(["grep", "-l", "-F", "-e", chemin, "--", "*.md"], racine);
    return r.sortie.split(/\r?\n/).filter(Boolean);
  };
}

function afficherListes(listes) {
  const blocs = Object.entries(listes).map(
    ([titre, liste]) => `${titre}\n${liste.length ? liste.map((l) => `  ${l}`).join("\n") : "  (aucun)"}`,
  );
  console.log(blocs.join("\n\n"));
}

/** Lance une sous-commande. Rend le code de sortie. */
export function executer(argv, racine = RACINE) {
  const [commande, ...reste] = argv;
  const manifeste = chargerManifeste(racine);
  if (commande === "lire") {
    if (reste.length === 0) {
      console.error("Usage : agents-contexte lire <chemin…>");
      return 1;
    }
    const chemins = reste.map((c) => normaliser(c, racine));
    const { documents, sansDomicile } = lire(manifeste, chemins, contexteDisque(racine));
    for (const c of sansDomicile) console.error(`Aucun domicile pour ${c} : ajouter un motif à .agents/domiciles.json.`);
    console.log(documents.join("\n"));
    return 0;
  }
  if (commande === "domicile") {
    if (reste.length !== 1) {
      console.error("Usage : agents-contexte domicile <chemin>");
      return 1;
    }
    const chemin = normaliser(reste[0], racine);
    const domaine = domaineDe(manifeste, chemin);
    if (!domaine) {
      console.error(`Aucun domicile pour ${chemin} : aucun motif de .agents/domiciles.json ne lui correspond.`);
      return 1;
    }
    console.log(documentDuDomaine(domaine, contexteDisque(racine)));
    return 0;
  }
  if (commande === "diff") {
    const i = reste.indexOf("--base");
    const base = i === -1 ? "HEAD" : reste[i + 1];
    if (!base) {
      console.error("Usage : agents-contexte diff [--base <ref>]");
      return 1;
    }
    const suivi = git(["diff", "--name-status", base], racine);
    if (suivi.code !== 0) {
      console.error(`git diff a échoué : ${suivi.erreur.trim()}`);
      return 1;
    }
    const statuts = lireStatuts(suivi.sortie);
    const nouveaux = git(["ls-files", "--others", "--exclude-standard"], racine).sortie;
    for (const chemin of nouveaux.split(/\r?\n/).filter(Boolean)) statuts.modifies.push(chemin);
    afficherListes(diff(manifeste, statuts, contexteDisque(racine), citeursGit(racine)));
    return 0;
  }
  if (commande === "ecrire-index") {
    const [paquet, ...options] = reste;
    if (!paquet) {
      process.stdout.write(ecrireIndex(manifeste));
      return 0;
    }
    const table = indexDuPaquet(manifeste, paquet);
    if (!options.includes("--ecrire")) {
      process.stdout.write(table);
      return 0;
    }
    const fichier = join(racine, "packages", paquet, "AGENTS.md");
    if (!existsSync(fichier)) {
      console.error(`packages/${paquet}/AGENTS.md est absent.`);
      return 1;
    }
    try {
      writeFileSync(fichier, remplacerBlocDomaines(readFileSync(fichier, "utf8"), table));
    } catch (e) {
      console.error(`packages/${paquet}/AGENTS.md : ${e.message}`);
      return 1;
    }
    return 0;
  }
  console.error("Commandes : lire <chemin…>, domicile <chemin>, diff [--base <ref>], ecrire-index [<paquet> [--ecrire]].");
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = executer(process.argv.slice(2));
}
