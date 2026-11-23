/**
 * Calcule l'archivage d'un sujet livré, sans rien supprimer ni déplacer.
 *
 * `node scripts/archiver-sujet.mjs <Pn> [--json]` range chaque fichier suivi du
 * dossier de la piste selon ses citations dans le reste du dépôt (`garder`,
 * `relire`, `supprimer`) et liste les liens des fichiers gardés vers un fichier
 * proposé à la suppression. `--figer <commit> <fichier>…` remplace, dans les
 * documents vivants, les liens relatifs vers ces fichiers par un lien vers ce
 * commit : c'est la seule écriture du script.
 *
 * Le jugement d'un fait unique et la suppression restent à l'agent et au
 * mainteneur. Le comptage des cases de `compterLesCases` est provisoire : le
 * lot 3.1 de P25 le remplace par `lireLePlan`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";

const racineDuDepot = join(dirname(fileURLToPath(import.meta.url)), "..");

const FICHIER_PISTES = "docs/notes/Recherches/Evolutions globales/pistes.json";
const PREFIXES_CODE = ["packages/", "scripts/", "tests/", "docs/inventaire/", ".github/"];
const DONNEES = [
  "pistes.json",
  "decisions.json",
  ".agents/domiciles.json",
  "docs/inventaire/sources.json",
];
const EXTENSIONS_OUTIL = [".mjs", ".ts", ".cjs", ".js"];
const BINAIRES = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip|svg|tgz)$/i;
const REPOSITORY = "https://github.com/Vassili-g/UCM-Toolkit";

/** Fichiers suivis par Git, chemins depuis la racine, séparateur `/`. */
export function fichiersSuivis(racine) {
  const sortie = execFileSync("git", ["ls-files", "-z"], {
    cwd: racine,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return sortie.split("\0").filter(Boolean);
}

/**
 * Les cases de premier niveau d'un plan, hors blocs de code. Provisoire :
 * le lot 3.1 de P25 le remplace par `lireLePlan`.
 */
export function compterLesCases(texte) {
  let cochees = 0;
  let total = 0;
  let dansUnBloc = false;
  for (const ligne of texte.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(ligne)) {
      dansUnBloc = !dansUnBloc;
      continue;
    }
    if (dansUnBloc) continue;
    const m = /^[-*+] \[([ xX])\]/.exec(ligne);
    if (!m) continue;
    total += 1;
    if (m[1] !== " ") cochees += 1;
  }
  return { total, cochees };
}

/** Les écritures d'un chemin dans un lien : brute, espaces seuls encodés, encodée pour une URL. */
function formesDuChemin(chemin) {
  const encode = chemin.split("/").map(encodeURIComponent).join("/");
  const espaces = chemin.replaceAll(" ", "%20");
  return [...new Set([chemin, espaces, encode])];
}

function lire(racine, chemin) {
  if (BINAIRES.test(chemin) || !existsSync(join(racine, chemin))) return "";
  try {
    return readFileSync(join(racine, chemin), "utf8");
  } catch {
    return "";
  }
}

const CARACTERE_DE_CHEMIN = /[A-Za-z0-9_.%-]/;

/** Vrai si `forme` apparaît dans `texte` sans prolonger un autre nom, ni suivre un lien figé. */
function contientLaForme(texte, forme) {
  let i = texte.indexOf(forme);
  while (i !== -1) {
    const precede = i > 0 && CARACTERE_DE_CHEMIN.test(texte[i - 1]);
    const debut = texte.slice(Math.max(0, i - 200), i).split(/[\s("'<>]/).pop();
    const figee = /\/blob\/[0-9a-f]{7,40}\/(?:[^/]*\/)*$/.test(debut);
    const suite = texte[i + forme.length];
    const prolonge = suite !== undefined && /[A-Za-z0-9_%-]/.test(suite);
    if (!precede && !figee && !prolonge) return true;
    i = texte.indexOf(forme, i + 1);
  }
  return false;
}

/** Vrai si `texte`, écrit dans `citeur`, cite `cible` par un chemin racine ou relatif. */
export function cite(texte, citeur, cible) {
  const relatif = posix.relative(posix.dirname(citeur), cible);
  const formes = new Set([...formesDuChemin(cible), ...formesDuChemin(relatif)]);
  const noms = formesDuChemin(posix.basename(cible));
  if (!noms.some((n) => texte.includes(n))) return false;
  for (const f of formes) if (contientLaForme(texte, f)) return true;
  return false;
}

/** La nature d'un fichier qui cite : `code`, `donnée` ou `document`. */
export function natureDuCiteur(chemin) {
  if (DONNEES.some((d) => chemin === d || chemin.endsWith(`/${d}`))) return "donnée";
  if (chemin === "package.json" || PREFIXES_CODE.some((p) => chemin.startsWith(p))) return "code";
  return "document";
}

function estOutil(chemin, citeParUnePage) {
  if (EXTENSIONS_OUTIL.some((e) => chemin.endsWith(e))) return true;
  if (chemin.split("/").includes("fixtures")) return true;
  return chemin.endsWith(".html") && citeParUnePage;
}

/** Le texte que `pistes.json` offre en citation : sans la fiche de la piste elle-même. */
function pistesSansLaPiste(texte, id) {
  const donnees = JSON.parse(texte);
  return JSON.stringify({ ...donnees, pistes: donnees.pistes.filter((p) => p.id !== id) });
}

/**
 * Le calcul d'archivage d'une piste. Lève une erreur si la piste est inconnue
 * ou si son plan n'est pas livré.
 */
export function calculerArchivage(racine, id) {
  const piste = JSON.parse(lire(racine, FICHIER_PISTES)).pistes.find((p) => p.id === id);
  if (!piste) throw new Error(`Piste inconnue : ${id}.`);
  if (!piste.plan) throw new Error(`La piste ${id} n'a pas de plan : rien à archiver.`);
  const { total, cochees } = compterLesCases(lire(racine, piste.plan));
  if (total === 0 || cochees < total) {
    throw new Error(
      `Le plan de ${id} n'est pas livré (${cochees} case(s) cochée(s) sur ${total}) : ${piste.plan}.`,
    );
  }

  const dossiers = [...new Set([piste.recherche, piste.plan].filter(Boolean).map((c) => posix.dirname(c)))];
  const suivis = fichiersSuivis(racine);
  const toutes = JSON.parse(lire(racine, FICHIER_PISTES)).pistes;
  const livre = (p) => {
    if (!p.plan) return false;
    const n = compterLesCases(lire(racine, p.plan));
    return n.total > 0 && n.cochees === n.total;
  };
  const dansLeDossier = (c) => dossiers.some((d) => c.startsWith(`${d}/`));
  const fichiers = suivis.filter(dansLeDossier);
  const vivantes = toutes.filter(
    (p) => p.id !== id && !livre(p) && [p.recherche, p.plan].some((c) => c && dansLeDossier(c)),
  );
  const dossierPartage = vivantes.map((p) => p.id);
  const documentsVivants = new Map();
  for (const p of vivantes) {
    for (const c of [p.recherche, p.plan]) {
      if (c && dansLeDossier(c)) documentsVivants.set(c, p.id);
    }
  }
  const citeurs = suivis.filter(
    (c) => !dansLeDossier(c) && !c.startsWith("docs/notes/Archives/") && c !== "INVENTAIRE-UCM.html",
  );
  const textes = new Map();
  for (const c of citeurs) {
    const t = lire(racine, c);
    textes.set(c, c === FICHIER_PISTES ? pistesSansLaPiste(t, id) : t);
  }

  const lignes = fichiers.map((chemin) => {
    const citations = [];
    for (const [citeur, texte] of textes) {
      if (texte && cite(texte, citeur, chemin)) {
        citations.push({ depuis: citeur, nature: natureDuCiteur(citeur) });
      }
    }
    const outil = estOutil(chemin, citations.length > 0);
    const natures = new Set(citations.map((c) => c.nature));
    let proposition = "supprimer";
    let raison = "aucune citation";
    const citePar = [...documentsVivants].find(
      ([doc]) => doc !== chemin && cite(lire(racine, doc), doc, chemin),
    );
    if (documentsVivants.has(chemin)) {
      proposition = "garder";
      raison = `document de ${documentsVivants.get(chemin)}, piste vivante`;
    } else if (citePar) {
      proposition = "garder";
      raison = `cité par un document de ${citePar[1]}, piste vivante`;
    } else if (natures.has("code") || natures.has("donnée")) {
      proposition = "garder";
      raison = "cité par du code ou une donnée";
    } else if (outil && citations.length > 0) {
      proposition = "garder";
      raison = "outil cité";
    } else if (outil) {
      proposition = "relire";
      raison = "outil non cité";
    } else if (citations.length > 0) {
      proposition = "relire";
      raison = "cité seulement par un document";
    }
    return { chemin, outil, citations, proposition, raison };
  });

  const aSupprimer = lignes.filter((l) => l.proposition === "supprimer").map((l) => l.chemin);
  const liensVersSupprimes = [];
  for (const l of lignes.filter((x) => x.proposition !== "supprimer")) {
    const texte = lire(racine, l.chemin);
    for (const cible of aSupprimer) {
      if (cite(texte, l.chemin, cible)) liensVersSupprimes.push({ depuis: l.chemin, vers: cible });
    }
  }
  return { piste: id, dossiers, dossierPartage, fichiers: lignes, liensVersSupprimes };
}

/** La table Markdown du calcul. */
export function tableMarkdown(calcul) {
  const sortie = [
    `Piste ${calcul.piste}, dossier(s) : ${calcul.dossiers.map((d) => `\`${d}\``).join(", ")}`,
    "",
    ...(calcul.dossierPartage.length > 0
      ? [
          `Dossier partagé avec ${calcul.dossierPartage.join(", ")}, non livrée : le dossier ne se déplace pas.`,
          "",
        ]
      : []),
    "| Fichier | Outil | Code | Donnée | Document | Proposition | Raison |",
    "|---|---|---|---|---|---|---|",
  ];
  const nb = (l, n) => l.citations.filter((c) => c.nature === n).length;
  for (const l of calcul.fichiers) {
    sortie.push(
      `| \`${l.chemin}\` | ${l.outil ? "oui" : "non"} | ${nb(l, "code")} | ${nb(l, "donnée")} | ${nb(l, "document")} | ${l.proposition} | ${l.raison} |`,
    );
  }
  if (calcul.liensVersSupprimes.length > 0) {
    sortie.push("", "Liens d'un fichier gardé vers un fichier à supprimer :", "");
    for (const l of calcul.liensVersSupprimes) sortie.push(`- \`${l.depuis}\` vers \`${l.vers}\``);
  }
  return sortie.join("\n");
}

const LIEN_EN_LIGNE = /(\]\()([^)\s<>]+)(\))/g;
const LIEN_DE_REFERENCE = /^(\[[^\]]+\]:\s*)(\S+)/gm;

function lienFige(commit, chemin, ancre) {
  const encode = chemin.split("/").map(encodeURIComponent).join("/");
  return `${REPOSITORY}/blob/${commit}/${encode}${ancre}`;
}

/**
 * Remplace dans les documents vivants chaque lien relatif vers l'un de
 * `fichiers` par un lien vers `commit`, ancre gardée. Rend les documents
 * modifiés.
 */
export function figer(racine, commit, fichiers) {
  const cibles = new Set(fichiers.map((f) => f.replaceAll("\\", "/")));
  const documents = fichiersSuivis(racine).filter(
    (c) => c.endsWith(".md") && !c.startsWith("docs/notes/Archives/") && !cibles.has(c),
  );
  const modifies = [];
  for (const doc of documents) {
    const texte = lire(racine, doc);
    const remplacer = (cible, rendre) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(cible) || cible.startsWith("#")) return null;
      const [chemin, ...reste] = cible.split("#");
      let decode;
      try {
        decode = decodeURIComponent(chemin);
      } catch {
        return null;
      }
      const resolu = posix.normalize(posix.join(posix.dirname(doc), decode));
      if (!cibles.has(resolu)) return null;
      return rendre(lienFige(commit, resolu, reste.length ? `#${reste.join("#")}` : ""));
    };
    const neuf = texte
      .replace(LIEN_EN_LIGNE, (tout, a, cible, z) => remplacer(cible, (l) => a + l + z) ?? tout)
      .replace(LIEN_DE_REFERENCE, (tout, a, cible) => remplacer(cible, (l) => a + l) ?? tout);
    if (neuf !== texte) {
      writeFileSync(join(racine, doc), neuf);
      modifies.push(doc);
    }
  }
  return modifies;
}

function main(argv) {
  const args = argv.slice(2);
  if (args[0] === "--figer") {
    const [, commit, ...fichiers] = args;
    if (!commit || fichiers.length === 0) {
      console.error("Usage : node scripts/archiver-sujet.mjs --figer <commit> <fichier>…");
      return 1;
    }
    const modifies = figer(racineDuDepot, commit, fichiers);
    console.log(modifies.length ? modifies.join("\n") : "Aucun document modifié.");
    return 0;
  }
  const id = args.find((a) => !a.startsWith("--"));
  if (!id) {
    console.error("Usage : node scripts/archiver-sujet.mjs <Pn> [--json]");
    return 1;
  }
  try {
    const calcul = calculerArchivage(racineDuDepot, id);
    console.log(args.includes("--json") ? JSON.stringify(calcul, null, 2) : tableMarkdown(calcul));
    return 0;
  } catch (erreur) {
    console.error(erreur.message);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv);
}
