/**
 * Le juge du code d'un composant : il compare le relevé d'un fichier (rendu par
 * le lecteur du code de l'adaptateur) au contrat, à `tokens.json` et aux
 * dérogations, et rend des constats complets.
 *
 * `preparerControle` ouvre le disque et ne lève jamais. `preparerControleDepuis`
 * reçoit les données déjà lues, comme `ucm check` les a. Le kit n'importe pas
 * l'adaptateur et ne lit aucun nœud TypeScript : le relevé est une donnée.
 * Les listes, les codes et les messages vivent dans
 * `controle-du-code-listes.mjs`.
 *
 * Les noms sortent par une liste `export { … }` en fin de fichier :
 * `surfaceLecteurs.test.mjs` exige sinon qu'`index.mjs` republie chaque
 * `export function`, et le plan P6 n'ouvre cette porte qu'au lot 3.1.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { NOM_CONFIGURATION, etatDuFormatDeTokens, isTokenReference, refPath, versionDeContrat } from "@ucm-kit/core/format";

import {
  ATTRIBUTS_SANS_VALEUR_VISUELLE,
  CHAMPS_A_VALEUR_PUBLIEE,
  CODES_DU_CONTROLE_DU_CODE,
  FONCTIONS_DE_COULEUR,
  FONCTIONS_MATHEMATIQUES,
  MOTS_CLES_DE_FORME,
  NOMS_DE_COULEUR,
  PROPRIETES_PAR_FAMILLE,
  REGLES_DU_CONTROLE,
  UNITES_DE_LONGUEUR,
  VALEURS_NEUTRES,
  messageDeLaLimite,
  messageDuConstat,
  regleDuConstat,
  suffixeDeDerogation,
} from "./controle-du-code-listes.mjs";
import { CHEMIN_DES_DEROGATIONS, appliquerDerogations, commandeDeDerogation, coordonneesDuGenre, lireDerogations } from "./derogations.mjs";
import { cheminImplementation, identifiantDuContrat } from "./implementation.mjs";
import { lireConfiguration } from "./configuration.mjs";
import { trouverContrats } from "./trouver-contrats.mjs";
import { indexerTokensDtcg, nomsCssDesTokens } from "./tokens-dtcg.mjs";
import { verdictDeVersion } from "./version-contrat.mjs";

// ─── Lecture d'une valeur CSS ─────────────────────────────────────────────

const ensemble = (valeurs) => new Set(valeurs.map((valeur) => valeur.toLowerCase()));
const UNITES = ensemble(UNITES_DE_LONGUEUR);
const COULEURS = ensemble(NOMS_DE_COULEUR);
const FONCTIONS_COULEUR = ensemble(FONCTIONS_DE_COULEUR);
const FONCTIONS_MATH = ensemble(FONCTIONS_MATHEMATIQUES);
const MOTS_DE_FORME = ensemble(MOTS_CLES_DE_FORME);
const NEUTRES = ensemble(VALEURS_NEUTRES.map((entree) => entree.valeur));

const RE_HEXADECIMAL = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RE_GRANDEUR = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i;
const RE_IDENTIFIANT = /^-?[a-z_][\w-]*$/i;
const RE_FONCTION = /^(-?[a-z_][\w-]*)\(/i;

const retirerBom = (texte) => (texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte);

/** L'indice de la parenthèse qui ferme celle de `ouvrante`, ou -1. */
function fermante(texte, ouvrante) {
  let profondeur = 0;
  for (let i = ouvrante; i < texte.length; i++) {
    if (texte[i] === "(") profondeur++;
    else if (texte[i] === ")" && --profondeur === 0) return i;
  }
  return -1;
}

/**
 * Coupe une valeur sur les espaces et les virgules hors des parenthèses. Dans
 * une fonction mathématique, `*` et `/` coupent aussi, et `+` ou `-` seuls
 * disparaissent.
 */
function decouper(texte, { operateurs = false } = {}) {
  const parties = [];
  let courant = "";
  let profondeur = 0;
  let guillemet = null;
  const finir = () => {
    if (courant !== "") parties.push(courant);
    courant = "";
  };
  for (const signe of texte) {
    if (guillemet) {
      courant += signe;
      if (signe === guillemet) guillemet = null;
      continue;
    }
    if (signe === '"' || signe === "'") {
      guillemet = signe;
      courant += signe;
      continue;
    }
    if (signe === "(") profondeur++;
    else if (signe === ")") profondeur = Math.max(0, profondeur - 1);
    const coupe = profondeur === 0 && (/\s/.test(signe) || signe === "," || (operateurs && (signe === "*" || signe === "/")));
    if (coupe) finir();
    else courant += signe;
  }
  finir();
  return operateurs ? parties.filter((partie) => partie !== "+" && partie !== "-") : parties;
}

/**
 * Le genre d'une partie : `reference`, `couleur`, `couleur-fonction`, `var`,
 * `math`, `fonction`, `neutre`, `longueur`, `pourcentage`, `nombre`,
 * `nom-couleur`, `mot-cle`, `identifiant` ou `autre`. `canon` est la forme qui
 * se compare (`15.0px` égale `15px`, `0px` égale `0`).
 */
function classer(partie) {
  const bas = partie.toLowerCase().replace(/\s+/g, " ");
  if (isTokenReference(partie)) return { genre: "reference", canon: bas };
  if (RE_HEXADECIMAL.test(partie)) return { genre: "couleur", canon: bas };

  const debutDeFonction = RE_FONCTION.exec(partie);
  if (debutDeFonction && fermante(partie, debutDeFonction[0].length - 1) === partie.length - 1) {
    const nom = debutDeFonction[1].toLowerCase();
    const args = partie.slice(debutDeFonction[0].length, -1);
    let genre = "fonction";
    if (nom === "var") genre = "var";
    else if (FONCTIONS_COULEUR.has(nom)) genre = "couleur-fonction";
    else if (FONCTIONS_MATH.has(nom)) genre = "math";
    return { genre, canon: bas, args };
  }

  const grandeur = RE_GRANDEUR.exec(partie);
  if (grandeur) {
    const nombre = Number(grandeur[1]);
    const unite = grandeur[2].toLowerCase();
    let genre = "autre";
    if (unite === "") genre = "nombre";
    else if (unite === "%") genre = "pourcentage";
    else if (UNITES.has(unite)) genre = "longueur";
    if (genre === "autre") return { genre, canon: bas };
    const canon = genre === "longueur" && nombre === 0 ? "0" : `${nombre}${unite}`;
    return { genre: NEUTRES.has(canon) ? "neutre" : genre, canon };
  }

  if (RE_IDENTIFIANT.test(partie)) {
    if (NEUTRES.has(bas)) return { genre: "neutre", canon: bas };
    if (COULEURS.has(bas)) return { genre: "nom-couleur", canon: bas };
    if (MOTS_DE_FORME.has(bas)) return { genre: "mot-cle", canon: bas };
    return { genre: "identifiant", canon: bas };
  }
  return { genre: "autre", canon: bas };
}

// ─── Valeurs que le contrat publie ────────────────────────────────────────

const SEGMENTS_PUBLIES = CHAMPS_A_VALEUR_PUBLIEE.map((entree) => ({ ...entree, segments: entree.champ.split(".") }));
const CLES_IGNOREES = new Set(["samples", "intent", "meta"]);

const seTermine = (chemin, segments) => segments.length <= chemin.length
  && segments.every((segment, i) => chemin[chemin.length - segments.length + i] === segment);

/**
 * Les valeurs que le contrat écrit en clair, par famille : une `Map` de la
 * famille vers l'ensemble des formes canoniques, et `toutes`. Un champ qui
 * désigne un objet couvre ses valeurs.
 */
function valeursPubliees(contrat) {
  const parFamille = new Map();
  const toutes = new Set();
  const ajouter = (famille, valeur) => {
    const canon = classer(String(valeur).trim()).canon;
    toutes.add(canon);
    if (!parFamille.has(famille)) parFamille.set(famille, new Set());
    parFamille.get(famille).add(canon);
  };
  const visiter = (valeur, chemin) => {
    if (Array.isArray(valeur)) {
      for (const element of valeur) visiter(element, chemin);
    } else if (valeur !== null && typeof valeur === "object") {
      for (const [cle, enfant] of Object.entries(valeur)) {
        if (chemin.length === 0 && CLES_IGNOREES.has(cle)) continue;
        visiter(enfant, [...chemin, cle]);
      }
    } else if (typeof valeur === "string" || typeof valeur === "number") {
      for (const entree of SEGMENTS_PUBLIES) {
        if (!seTermine(chemin, entree.segments) && !seTermine(chemin.slice(0, -1), entree.segments)) continue;
        ajouter(entree.famille, valeur);
        const aussi = entree.aussi?.[valeur];
        if (aussi !== undefined) ajouter(entree.famille, aussi);
      }
    }
  };
  if (contrat !== null && typeof contrat === "object") visiter(contrat, []);
  return { parFamille, toutes };
}

const FAMILLES_PAR_PROPRIETE = new Map(PROPRIETES_PAR_FAMILLE.map((entree) => [entree.propriete, entree.familles]));
const famillesDe = (propriete) => FAMILLES_PAR_PROPRIETE.get(propriete.toLowerCase()) ?? [];

// ─── Le contexte du juge ──────────────────────────────────────────────────

const etatDesTokens = (tokens) => (typeof tokens?.etat === "string" ? tokens.etat : tokens?.etat?.etat ?? "origine");

/**
 * Ce que le juge sait d'un composant : les tokens (`null` si illisibles),
 * le contrat (`null` quand ses valeurs ne se jugent pas) et les variables
 * `--nom` que ses fichiers déclarent.
 */
function creerContexteDuJuge({ tokens = null, contrat = null, variables = [] } = {}) {
  const lisible = tokens !== null && tokens.index instanceof Map && !["future", "invalide"].includes(etatDesTokens(tokens));
  return {
    citations: lisible,
    index: lisible ? tokens.index : new Map(),
    noms: lisible ? (tokens.noms ?? nomsCssDesTokens(tokens.index)) : new Map(),
    variables: new Set(variables),
    publiees: contrat === null ? null : valeursPubliees(contrat),
  };
}

function publieesPourFamilles(contexte, familles) {
  if (familles === null) return contexte.publiees.toutes;
  const union = new Set();
  for (const famille of familles) for (const valeur of contexte.publiees.parFamille.get(famille) ?? []) union.add(valeur);
  return union;
}

// ─── Les jugements ────────────────────────────────────────────────────────

const NIVEAU_DES_CODES = new Map(CODES_DU_CONTROLE_DU_CODE.map((entree) => [entree.code, entree.niveau]));

const verdictBrut = (code, faits, debut, fin) => ({ code, niveau: NIVEAU_DES_CODES.get(code), regle: regleDuConstat(code, faits), faits, debut, fin });

/** Les `var(…)` d'un texte, à toute profondeur : leur contenu et s'ils sont fermés. */
function trouverVar(texte) {
  const trouves = [];
  for (const debut of texte.matchAll(/(?<![\w-])var\(/gi)) {
    const ouvrante = debut.index + debut[0].length - 1;
    const fin = fermante(texte, ouvrante);
    trouves.push(fin === -1 ? { ferme: false, interieur: texte.slice(ouvrante + 1) } : { ferme: true, interieur: texte.slice(ouvrante + 1, fin) });
  }
  return trouves;
}

/** Les références et les variables d'un texte qui ne désignent aucun token. */
function citationsDe(texte, contexte, { parPartie, debut, fin }) {
  const sorties = [];
  const vus = new Set();
  const ajouter = (cle, code, faits) => {
    if (vus.has(cle)) return;
    vus.add(cle);
    sorties.push(verdictBrut(code, faits, debut, fin));
  };

  for (const candidate of parPartie ? decouper(texte) : [texte.trim()]) {
    if (contexte.citations && isTokenReference(candidate) && !contexte.index.has(refPath(candidate))) {
      ajouter(`reference:${candidate}`, "token-inconnu", { reference: candidate });
    }
  }

  for (const { ferme, interieur } of trouverVar(texte)) {
    if (!ferme) {
      const debutDuNom = interieur.trim();
      if (debutDuNom === "" || debutDuNom.startsWith("--")) ajouter("gabarit", "non-analyse", { forme: "gabarit" });
      continue;
    }
    const coupure = interieur.indexOf(",");
    const variable = (coupure === -1 ? interieur : interieur.slice(0, coupure)).trim();
    const repli = coupure === -1 ? "" : interieur.slice(coupure + 1).trim();
    if (!variable.startsWith("--")) continue;
    if (repli !== "" && !/var\(/i.test(repli)) ajouter(`repli:${variable}`, "repli-en-dur", { variable, repli });
    if (!contexte.citations) continue;
    const chemins = contexte.noms.get(variable);
    if (chemins && chemins.length > 1) ajouter(`ambigu:${variable}`, "nom-css-ambigu", { variable, chemins: [...chemins].sort() });
    else if (!chemins && !contexte.variables.has(variable)) ajouter(`variable:${variable}`, "token-inconnu", { variable });
  }
  return sorties;
}

/** Les parties d'une déclaration que le contrat ne publie pas (D17). */
function rejeteesDUneDeclaration(texte, publiees) {
  const rejetees = [];
  const juger = (valeur, mathematique) => {
    for (const brut of decouper(valeur, { operateurs: mathematique })) {
      const partie = classer(brut);
      switch (partie.genre) {
        case "couleur":
        case "couleur-fonction":
        case "nom-couleur":
          rejetees.push(brut);
          break;
        case "longueur":
        case "pourcentage":
          if (!publiees.has(partie.canon)) rejetees.push(brut);
          break;
        case "nombre":
          if (!mathematique && !publiees.has(partie.canon)) rejetees.push(brut);
          break;
        case "math":
          juger(partie.args, true);
          break;
        case "fonction":
          if (!publiees.has(partie.canon)) juger(partie.args, false);
          break;
        default:
      }
    }
  };
  juger(texte, false);
  return rejetees;
}

const ACCEPTEES_DANS_UNE_CHAINE = new Set(["couleur", "couleur-fonction", "longueur", "nombre", "pourcentage", "fonction", "math", "var", "neutre", "mot-cle"]);

/** Les couleurs d'une partie, hors `var(…)`, à toute profondeur. */
function couleursDe(brut, partie) {
  if (partie.genre === "couleur" || partie.genre === "couleur-fonction") return [brut];
  if (partie.genre !== "fonction" && partie.genre !== "math") return [];
  return decouper(partie.args, { operateurs: partie.genre === "math" }).flatMap((interne) => couleursDe(interne, classer(interne)));
}

/** Les parties d'une chaîne que le contrat ne publie pas : couleurs toujours, longueurs quand le reste est de la forme. */
function rejeteesDUneChaine(texte, publiees) {
  const brutes = decouper(texte);
  const parties = brutes.map(classer);
  const longueursJugees = parties.every((partie) => ACCEPTEES_DANS_UNE_CHAINE.has(partie.genre));
  const rejetees = [];
  parties.forEach((partie, i) => {
    rejetees.push(...couleursDe(brutes[i], partie));
    if (longueursJugees && partie.genre === "longueur" && !publiees.has(partie.canon)) rejetees.push(brutes[i]);
  });
  return rejetees;
}

const attributIgnore = (attribut) => typeof attribut === "string"
  && ATTRIBUTS_SANS_VALEUR_VISUELLE.some((nom) => (nom.endsWith("-") ? attribut.startsWith(nom) : attribut === nom));

/**
 * Juge une chaîne du relevé. Rend des constats bruts `{ code, niveau, regle,
 * faits, debut, fin }`, sans composant ni message.
 */
function jugerChaine(chaine, contexte) {
  if (attributIgnore(chaine.attribut)) return [];
  const { texte, debut, fin } = chaine;
  const sorties = citationsDe(texte, contexte, { parPartie: false, debut, fin });
  if (contexte.publiees) {
    const parties = rejeteesDUneChaine(texte, contexte.publiees.toutes);
    if (parties.length > 0) sorties.push(verdictBrut("valeur-en-dur", { valeur: texte.trim(), parties }, debut, fin));
  }
  return sorties;
}

/** Juge une déclaration du relevé : citations partout, valeurs en dur selon la famille de la propriété. */
function jugerDeclaration(declaration, contexte) {
  const { propriete, valeur, debut, fin } = declaration;
  const nature = declaration.contexte;
  if (propriete === null || propriete === undefined) {
    return contexte.publiees ? [verdictBrut("non-analyse", { forme: "decomposition" }, debut, fin)] : [];
  }
  const familles = famillesDe(propriete);
  if (valeur === null || valeur === undefined) {
    return contexte.publiees && familles.length > 0 ? [verdictBrut("non-analyse", { propriete, forme: "expression" }, debut, fin)] : [];
  }

  const horsFamille = familles.length === 0;
  // Dans un objet qui n'est pas un style, l'adaptateur garde un nombre tel qu'écrit et rend aussi la
  // valeur que React écrirait (`valeurEnStyle`) : une propriété de famille se juge sur elle.
  const enStyle = nature === "objet" && !horsFamille && typeof declaration.valeurEnStyle === "string";
  const texte = enStyle ? declaration.valeurEnStyle : String(valeur);
  const sorties = citationsDe(texte, contexte, { parPartie: !(nature === "objet" && horsFamille), debut, fin });
  if (!contexte.publiees) return sorties;

  const parties = [];
  if (!horsFamille) parties.push(...rejeteesDUneDeclaration(texte, publieesPourFamilles(contexte, familles)));
  // Hors famille, un nombre n'est pas une longueur ; une chaîne se juge par la règle des chaînes entière.
  else if (nature === "objet" && declaration.nombre !== true) parties.push(...rejeteesDUneChaine(texte, contexte.publiees.toutes));
  const uniques = [...new Set(parties)];
  if (uniques.length > 0) sorties.push(verdictBrut("valeur-en-dur", { propriete, valeur: texte.trim(), parties: uniques, familles }, debut, fin));
  return sorties;
}

const RE_REGLE_UCM = new RegExp(`(?:^|[\\s,])(?:[\\w@.-]+/)*ucm/(${REGLES_DU_CONTROLE.join("|")})(?![\\w-])`, "g");

/** Un constat par règle UCM qu'un commentaire `eslint-disable` nomme. */
function jugerDirective(directive) {
  const nommees = new Set();
  for (const trouve of directive.texte.split(/\s--\s/)[0].matchAll(RE_REGLE_UCM)) nommees.add(trouve[1]);
  return [...nommees].map((regle) => verdictBrut("desactivation-interdite", { regle, directive: directive.texte }, directive.debut, directive.fin));
}

// ─── Les fichiers et les composants ───────────────────────────────────────

const enSlash = (chemin) => chemin.split(sep).join("/");
const memeChemin = (gauche, droite) => relative(gauche, droite) === "";
const lireEnUtf8 = (chemin) => readFileSync(chemin, "utf8");

const limite = (code, composant, faits = {}) => ({ code, composant, message: messageDeLaLimite(code, faits), faits });

function coordonneesDuConstat(code, faits, fichier) {
  if (code === "valeur-en-dur") return { fichier, valeur: faits.valeur };
  if (code === "token-inconnu") return { fichier, reference: faits.reference ?? faits.variable };
  return { fichier, reference: faits.variable };
}

function relever(chemin, { texte, lecteur, lire, cache }) {
  const memoire = texte === undefined || texte === null;
  if (memoire && cache.has(chemin)) return cache.get(chemin);
  let releve = null;
  try {
    releve = lecteur.releverUsages(retirerBom(texte ?? lire(chemin)), chemin);
  } catch {
    releve = null;
  }
  if (memoire) cache.set(chemin, releve);
  return releve;
}

function fichiersDuComposant(implementation, { lecteur, extensions, cache }) {
  if (!extensions.includes(extname(implementation).toLowerCase())) return [implementation];
  const cle = `fichiers:${implementation}`;
  if (cache.has(cle)) return cache.get(cle);
  let fichiers = [implementation];
  try {
    const rendu = lecteur.fichiersDuComposant(implementation)?.fichiers;
    if (Array.isArray(rendu)) fichiers = rendu.map((chemin) => resolve(chemin));
  } catch {
    fichiers = [implementation];
  }
  cache.set(cle, fichiers);
  return fichiers;
}

/**
 * Juge un fichier avec les données déjà lues.
 *
 * - `documents` : `[{ chemin, contrat }]`, `contrat` valant `null` s'il est illisible ;
 * - `tokens` : `{ etat, index, noms }` (`etat` rendu par `etatDuFormatDeTokens`), ou `null` si le fichier est absent ou illisible ;
 * - `derogations` : le résultat de `lireDerogations` ;
 * - `lecteur` : le lecteur du code de l'adaptateur ;
 * - `texte` : le texte à juger à la place du disque ;
 * - `cache` : une `Map` partagée d'un appel à l'autre d'un même contrôle ; elle garde le relevé de chaque fichier lu sur le disque et la liste des fichiers de chaque implémentation.
 *
 * Ne lève jamais : une panne devient une limite.
 */
function preparerControleDepuis(fichier, options = {}) {
  const {
    racine,
    configuration,
    documents = [],
    tokens = null,
    derogations = { derogations: [], erreurs: [] },
    lecteur,
    texte,
    lire = lireEnUtf8,
    cache = new Map(),
  } = options;
  const limites = [];
  let relatif = null;
  try {
    const absolu = resolve(racine, fichier);
    const chemin = relative(racine, absolu);
    if (chemin === "" || chemin.startsWith("..") || isAbsolute(chemin)) return { racine, fichier: null, composants: [], limites, constats: [] };
    relatif = enSlash(chemin);

    const extensions = (lecteur?.extensions ?? []).map((extension) => extension.toLowerCase());
    const membres = [];
    for (const document of documents) {
      const implementation = resolve(racine, cheminImplementation(document.chemin, configuration.implementation));
      const fichiers = fichiersDuComposant(implementation, { lecteur, extensions, cache });
      if (!fichiers.some((candidat) => memeChemin(candidat, absolu))) continue;
      membres.push({ ...document, id: identifiantDuContrat(document.chemin), implementation, fichiers });
    }
    if (membres.length === 0) return { racine, fichier: relatif, composants: [], limites, constats: [] };
    membres.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const composants = [...new Set(membres.map((membre) => membre.id))];

    if (tokens === null) limites.push(limite("tokens-illisibles", null, { chemin: configuration.tokens }));
    else if (["future", "invalide"].includes(etatDesTokens(tokens))) limites.push(limite("tokens-format-inconnu", null, { chemin: configuration.tokens }));
    if (derogations.erreurs?.length > 0) limites.push(limite("derogations-illisibles", null, { erreurs: derogations.erreurs }));

    const lisible = extensions.includes(extname(absolu).toLowerCase());
    if (!lisible) {
      for (const membre of membres) limites.push(limite("sans-adaptateur", membre.id, { composant: membre.id, extension: extname(absolu) }));
      return { racine, fichier: relatif, composants, limites, constats: [] };
    }

    const releve = relever(absolu, { texte, lecteur, lire, cache });
    if (releve === null) {
      limites.push(limite("lecture-incomplete", null, { erreurs: 1 }));
      return { racine, fichier: relatif, composants, limites, constats: [] };
    }
    if (releve.lecture && releve.lecture.complete === false) {
      if (releve.lecture.extension) {
        for (const membre of membres) limites.push(limite("sans-adaptateur", membre.id, { composant: membre.id, extension: releve.lecture.extension }));
        return { racine, fichier: relatif, composants, limites, constats: [] };
      }
      limites.push(limite("lecture-incomplete", null, { erreurs: releve.lecture.erreurs }));
    }

    const partagent = membres.filter((membre) => memeChemin(membre.implementation, absolu));
    const multiples = partagent.length > 1;
    if (multiples) limites.push(limite("contrats-multiples", null, { composants: [...new Set(partagent.map((membre) => membre.id))] }));
    if (composants.length > 1 && !(multiples && partagent.length === membres.length)) limites.push(limite("fichier-partage", null, { composants }));

    const constats = [];
    const actives = derogations.erreurs?.length > 0 ? [] : derogations.derogations ?? [];
    for (const membre of membres) {
      let contrat = membre.contrat ?? null;
      if (contrat === null) {
        limites.push(limite("contrat-illisible", membre.id, { composant: membre.id }));
      } else {
        const version = versionDeContrat(contrat);
        let verdict = "ok";
        try {
          verdict = verdictDeVersion(version);
        } catch {
          verdict = "ancien";
        }
        if (verdict !== "ok") {
          limites.push(limite(verdict === "ancien" ? "contrat-ancien" : "contrat-recent", membre.id, { composant: membre.id, version: version ?? "inconnue" }));
          contrat = null;
        }
      }
      if (multiples && partagent.includes(membre)) contrat = null;

      const variables = new Set(releve.variables ?? []);
      for (const autre of membre.fichiers) {
        if (memeChemin(autre, absolu)) continue;
        for (const variable of relever(autre, { lecteur, lire, cache })?.variables ?? []) variables.add(variable);
      }
      const contexte = creerContexteDuJuge({ tokens, contrat, variables });

      const bruts = [
        ...(releve.chaines ?? []).flatMap((chaine) => jugerChaine(chaine, contexte)),
        ...(releve.declarations ?? []).flatMap((declaration) => jugerDeclaration(declaration, contexte)),
        ...(releve.directives ?? []).flatMap(jugerDirective),
      ];
      const propres = bruts.map((brut) => {
        const constat = {
          regle: brut.regle,
          code: brut.code,
          niveau: brut.niveau,
          composant: membre.id,
          debut: brut.debut,
          fin: brut.fin,
          message: messageDuConstat(brut.code, brut.faits, membre.id),
          faits: brut.faits,
        };
        if (coordonneesDuGenre(brut.code) !== null) constat.coordonnees = coordonneesDuConstat(brut.code, brut.faits, relatif);
        return constat;
      });

      const ecarts = propres.filter((constat) => constat.coordonnees).map((constat) => ({ genre: constat.code, coordonnees: constat.coordonnees, derogeable: true, constat }));
      const { couverts, restants } = appliquerDerogations(actives, membre.id, membre.contrat?.meta?.exportedAt ?? null, ecarts);
      for (const { ecart, derogation } of couverts) ecart.constat.deroge = { motif: derogation.motif, par: derogation.par };
      for (const { constat } of restants) {
        constat.commande = commandeDeDerogation(membre.id, constat.code, constat.coordonnees);
        constat.message = `${constat.message} ${suffixeDeDerogation(constat.commande)}`;
      }
      constats.push(...propres);
    }

    const ordre = (a, b) => a.debut - b.debut || a.fin - b.fin || (a.composant < b.composant ? -1 : a.composant > b.composant ? 1 : 0);
    constats.sort(ordre);
    return { racine, fichier: relatif, composants, limites, constats };
  } catch {
    return { racine, fichier: relatif, composants: [], limites: [...limites, limite("lecture-incomplete", null, { erreurs: 1 })], constats: [] };
  }
}

/** Le premier dossier, en remontant depuis `dossier`, qui porte `ucm.config.json`. */
function trouverLaRacine(dossier) {
  for (let courant = dossier; ; courant = dirname(courant)) {
    if (existsSync(join(courant, NOM_CONFIGURATION))) return courant;
    if (dirname(courant) === courant) return null;
  }
}

function lireLesTokens(racine, configuration) {
  let brut;
  try {
    brut = JSON.parse(retirerBom(readFileSync(join(racine, configuration.tokens), "utf8")));
  } catch {
    return null;
  }
  const etat = etatDuFormatDeTokens(brut);
  if (etat.etat === "future" || etat.etat === "invalide") return { etat, index: new Map(), noms: new Map() };
  const index = indexerTokensDtcg(brut);
  return { etat, index, noms: nomsCssDesTokens(index) };
}

function lireLesDerogations(racine) {
  let texte = null;
  try {
    texte = readFileSync(join(racine, CHEMIN_DES_DEROGATIONS), "utf8");
  } catch (erreur) {
    if (erreur?.code !== "ENOENT") return { derogations: [], erreurs: [`${CHEMIN_DES_DEROGATIONS} est illisible : ${erreur?.code ?? "lecture impossible"}.`] };
  }
  return lireDerogations(texte);
}

/**
 * Juge un fichier : remonte jusqu'au premier `ucm.config.json` quand `racine`
 * manque, lit la configuration, les contrats, `tokens.json` et les dérogations,
 * puis appelle `preparerControleDepuis`. Ne garde rien d'un appel à l'autre.
 * Ne lève jamais : une panne de lecture devient une limite.
 *
 * Rend `{ racine, fichier, composants, limites, constats }` ; `fichier` est
 * relatif à la racine, avec `/`.
 */
function preparerControle(fichier, { texte, lecteur, racine } = {}) {
  const vide = (limites, racineTrouvee = null, absolu = null) => ({
    racine: racineTrouvee,
    fichier: racineTrouvee !== null && absolu !== null ? enSlash(relative(racineTrouvee, absolu)) : null,
    composants: [],
    limites,
    constats: [],
  });
  try {
    if (typeof fichier !== "string" || fichier.trim() === "" || /^<.*>$/.test(fichier.trim())) return vide([limite("fichier-sans-chemin", null)]);
    const absolu = resolve(racine ?? "", fichier);
    const dossier = racine ? resolve(racine) : trouverLaRacine(dirname(absolu));
    if (dossier === null) return vide([limite("configuration-absente", null)]);

    const lue = lireConfiguration(dossier);
    if (lue.erreur) return vide([limite("configuration-invalide", null, { erreur: lue.erreur })], dossier, absolu);
    const { configuration } = lue;

    let contrats;
    try {
      contrats = trouverContrats(join(dossier, configuration.components));
    } catch {
      return vide([limite("contrats-introuvables", null, { dossier: configuration.components })], dossier, absolu);
    }
    const documents = contrats.map((chemin) => {
      try {
        return { chemin, contrat: JSON.parse(retirerBom(readFileSync(chemin, "utf8"))) };
      } catch {
        return { chemin, contrat: null };
      }
    });

    return preparerControleDepuis(absolu, {
      racine: dossier,
      configuration,
      documents,
      tokens: lireLesTokens(dossier, configuration),
      derogations: lireLesDerogations(dossier),
      lecteur,
      texte,
    });
  } catch {
    return vide([limite("lecture-incomplete", null, { erreurs: 1 })]);
  }
}

export {
  preparerControle,
  preparerControleDepuis,
  jugerChaine,
  jugerDeclaration,
  creerContexteDuJuge,
};
