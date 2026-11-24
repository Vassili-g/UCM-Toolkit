/**
 * `ucm tokens references` : remplace dans le code chaque chaîne `"{chemin}"` par
 * `"var(--nom)"`, avec le nom que `nomsCssDesTokens` donne à ce chemin.
 *
 * Seule une chaîne dont tout le contenu est une référence se remplace. Une
 * référence absente de `tokens.json`, prise dans une chaîne plus longue ou un
 * gabarit, ou passée en argument d'un appel reste en place et se nomme : le
 * code que la commande ne sait pas réécrire sans deviner revient au développeur.
 * Codes : 0 rien à signaler, 1 un cas laissé ou, avec `--verifier`, une
 * référence restante, 2 invocation ou configuration fautive.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { isTokenReference, referencesDansUnTexte } from "@ucm-kit/core/format";
import { cheminDeReference, indexerTokensDtcg, libelleNombre, lireConfiguration, lireJsonDuDepot, nomsCssDesTokens } from "@ucm-kit/core/lecteurs";

import { catalogueDesAides } from "./aides.mjs";
import { conventionsLesPlusProches, lireConventions } from "./conventions.mjs";

export const USAGE_REFERENCES = "ucm tokens references [--verifier] <fichiers…>";

const SECTION_DU_REPOSITORY = "resolution-token";

const remplacees = (nombre) => `${libelleNombre(nombre, "référence")} ${nombre === 1 ? "remplacée" : "remplacées"}`;

/** Lit les arguments de la commande, sans lever. */
export function lireArgumentsReferences(arguments_) {
  const options = { verifier: false, fichiers: [] };
  for (const argument of arguments_) {
    if (argument === "--verifier") options.verifier = true;
    else if (argument.startsWith("--")) return { erreur: `Argument inconnu : ${argument}` };
    else options.fichiers.push(argument);
  }
  if (options.fichiers.length === 0) return { erreur: "ucm tokens references attend au moins un fichier." };
  return { options };
}

/**
 * Les chaînes littérales d'un texte de code, commentaires exclus. Un guillemet
 * non fermé sur sa ligne n'ouvre rien : une apostrophe de texte ne masque pas la suite du fichier.
 */
function litteraux(texte) {
  const trouves = [];
  let i = 0;
  while (i < texte.length) {
    const c = texte[i];
    if (c === "/" && texte[i + 1] === "/") {
      const fin = texte.indexOf("\n", i);
      i = fin === -1 ? texte.length : fin;
    } else if (c === "/" && texte[i + 1] === "*") {
      const fin = texte.indexOf("*/", i + 2);
      i = fin === -1 ? texte.length : fin + 2;
    } else if (c === "\"" || c === "'") {
      let j = i + 1;
      while (j < texte.length && texte[j] !== c && texte[j] !== "\n") j += texte[j] === "\\" ? 2 : 1;
      if (texte[j] === c) {
        trouves.push({ debut: i, fin: j, guillemet: c });
        i = j + 1;
      } else {
        i += 1;
      }
    } else if (c === "`") {
      let j = i + 1;
      let profondeur = 0;
      while (j < texte.length && !(texte[j] === "`" && profondeur === 0)) {
        if (texte[j] === "\\") {
          j += 2;
          continue;
        }
        if (texte[j] === "{" && texte[j - 1] === "$") profondeur += 1;
        else if (texte[j] === "}" && profondeur > 0) profondeur -= 1;
        j += 1;
      }
      trouves.push({ debut: i, fin: Math.min(j, texte.length), guillemet: "`" });
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return trouves;
}

const ligneDe = (texte, position) => texte.slice(0, position).split("\n").length;

/** Le nom CSS de chaque chemin, lu dans la table que le kit donne. */
function nomsParChemin(parNom) {
  const parChemin = new Map();
  for (const [nom, chemins] of parNom) for (const chemin of chemins) parChemin.set(chemin, nom);
  return parChemin;
}

/** Le texte réécrit d'un fichier, ses références remplacées et ses cas laissés, chacun avec sa ligne. */
function traiter(texte, index, noms) {
  let sortie = "";
  let curseur = 0;
  const remplacees = [];
  const laissees = [];
  for (const { debut, fin, guillemet } of litteraux(texte)) {
    const contenu = texte.slice(debut + 1, fin);
    const ligne = ligneDe(texte, debut);
    if (guillemet === "`") {
      for (const [reference] of contenu.matchAll(referencesDansUnTexte())) {
        laissees.push({ ligne, reference, raison: "dans un gabarit" });
      }
    } else if (isTokenReference(contenu)) {
      const chemin = cheminDeReference(contenu);
      if (texte.slice(0, debut).trimEnd().endsWith("(")) {
        laissees.push({ ligne, reference: contenu, raison: "passée en argument d'un appel" });
      } else if (!index.has(chemin)) {
        laissees.push({ ligne, reference: contenu, raison: "absente de tokens.json" });
      } else {
        sortie += `${texte.slice(curseur, debut)}${guillemet}var(${noms.get(chemin)})${guillemet}`;
        curseur = fin + 1;
        remplacees.push({ ligne, reference: contenu });
      }
    } else {
      for (const [reference] of contenu.matchAll(referencesDansUnTexte())) {
        laissees.push({ ligne, reference, raison: "dans une chaîne plus longue" });
      }
    }
  }
  return { texte: sortie + texte.slice(curseur), remplacees, laissees };
}

/** Le fichier de conventions qui répond `## resolution-token` pour l'un des fichiers, ou `null`. */
function conventionsQuiRepondent(racine, fichiers) {
  const aides = catalogueDesAides();
  for (const fichier of fichiers) {
    const chemin = conventionsLesPlusProches(resolve(fichier, ".."), racine);
    if (chemin === null) continue;
    if (lireConventions(readFileSync(chemin, "utf8"), aides).sections.has(SECTION_DU_REPOSITORY)) return chemin;
  }
  return null;
}

/** La commande `ucm tokens references`, et son code de sortie. */
export function tokensReferences(arguments_, {
  racine = process.cwd(),
  ecrire = console.log,
  alerter = console.error,
  ecrireFichier = writeFileSync,
} = {}) {
  const { options, erreur } = lireArgumentsReferences(arguments_);
  if (erreur) {
    alerter(`${erreur}\n\n${USAGE_REFERENCES}`);
    return 2;
  }
  const { configuration, erreur: erreurConfiguration } = lireConfiguration(racine);
  if (erreurConfiguration) {
    alerter(erreurConfiguration);
    return 2;
  }

  const fichiers = options.fichiers.map((fichier) => resolve(racine, fichier));
  const rangAbsent = fichiers.findIndex((fichier) => !existsSync(fichier));
  if (rangAbsent !== -1) {
    alerter(`${options.fichiers[rangAbsent]} est introuvable.`);
    return 2;
  }

  const conventions = conventionsQuiRepondent(racine, fichiers);
  if (conventions !== null) {
    const message = `${relative(racine, conventions)} porte une section « ## ${SECTION_DU_REPOSITORY} » : ce repository garde sa propre écriture.`;
    if (options.verifier) {
      ecrire(`${message} Rien à vérifier.`);
      return 0;
    }
    alerter(`${message} Rien n'est écrit.`);
    return 2;
  }

  const source = resolve(racine, configuration.tokens);
  if (!existsSync(source)) {
    alerter(`${configuration.tokens} est introuvable : exportez les tokens depuis Figma, ou corrigez le chemin tokens de ucm.config.json.`);
    return 2;
  }
  let index;
  try {
    index = indexerTokensDtcg(lireJsonDuDepot(source));
  } catch {
    alerter(`${configuration.tokens} est illisible : ce n'est pas du JSON valide.`);
    return 2;
  }
  const parNom = nomsCssDesTokens(index);
  const collisions = [...parNom].filter(([, chemins]) => chemins.length > 1);
  if (collisions.length > 0) {
    alerter([
      "Deux chemins de tokens donnent le même nom CSS, et une référence deviendrait ambiguë. Rien n'est écrit :",
      ...collisions.map(([nom, chemins]) => `  ${nom} : ${chemins.map((chemin) => `« ${chemin} »`).join(", ")}`),
    ].join("\n"));
    return 2;
  }
  const noms = nomsParChemin(parNom);

  let aSignaler = 0;
  let remplaceesAuTotal = 0;
  for (const [rang, fichier] of fichiers.entries()) {
    const nom = options.fichiers[rang];
    const original = readFileSync(fichier, "utf8");
    const resultat = traiter(original, index, noms);
    for (const { ligne, reference, raison } of resultat.laissees) alerter(`${nom}:${ligne} : ${reference} reste en place, ${raison}.`);
    aSignaler += resultat.laissees.length;
    if (options.verifier) {
      for (const { ligne, reference } of resultat.remplacees) alerter(`${nom}:${ligne} : ${reference} reste à remplacer.`);
      aSignaler += resultat.remplacees.length;
    } else if (resultat.texte !== original) {
      ecrireFichier(fichier, resultat.texte, "utf8");
      remplaceesAuTotal += resultat.remplacees.length;
      ecrire(`${nom} : ${remplacees(resultat.remplacees.length)}.`);
    }
  }

  if (aSignaler > 0) return 1;
  ecrire(remplaceesAuTotal === 0 ? "Aucune référence à remplacer." : `${remplacees(remplaceesAuTotal)}.`);
  return 0;
}
