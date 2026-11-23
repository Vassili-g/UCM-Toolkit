/**
 * Lit, valide et applique `.ucm/derogations.json` : une dérogation couvre un
 * écart de parité exact, désigné par son genre et ses coordonnées tels que
 * `ecartsIdentifiesDeParite` les rend, pour un composant et un export donnés.
 *
 * Le module est pur : il reçoit le texte du fichier (`null` s'il est absent),
 * jamais un chemin. L'ouverture du fichier appartient à `lireDerogationsDuDepot`,
 * de `configuration.mjs`, que les deux contrôles appellent.
 * Aucune entrée n'expire par une date : elle ne s'applique plus dès que son
 * `export` diffère du `meta.exportedAt` courant du contrat.
 */
import { jsonSansBom } from "@ucm-kit/core/format";

export const CHEMIN_DES_DEROGATIONS = ".ucm/derogations.json";

/** Les genres dérogeables et leurs coordonnées exactes ; un autre genre est refusé. */
const COORDONNEES_PAR_GENRE = {
  "prop-absente": ["prop"],
  "type-incorrect": ["prop"],
  "valeur-non-implementee": ["prop", "valeur"],
  "booleen-sans-effet": ["prop"],
  "enum-sans-effet": ["prop"],
  "composition-non-rendue": ["composant"],
  "valeur-en-dur": ["fichier", "valeur"],
  "token-inconnu": ["fichier", "reference"],
  "repli-en-dur": ["fichier", "reference"],
};

const RAISON_PARITE = "il empêche toute autre comparaison";

/**
 * Les genres qu'aucune entrée ne couvre, avec leur raison. Les trois premiers
 * rendent toute autre comparaison fausse : les couvrir masquerait le composant
 * entier.
 */
const GENRES_NON_DEROGEABLES = new Map([
  ["interface-absente", RAISON_PARITE],
  ["fonction-introuvable", RAISON_PARITE],
  ["composition-comptage", RAISON_PARITE],
  ["nom-css-ambigu", "deux tokens portent ce nom, le designer corrige les tokens"],
  ["non-analyse", "le contrôle ne juge pas cette valeur, il n'y a rien à couvrir"],
  ["desactivation-interdite", "un commentaire ne désactive pas une règle UCM"],
]);

const CHAMPS_DE_L_ENTREE = ["composant", "ecart", "export", "motif", "par"];

const estObjet = (valeur) => valeur !== null && typeof valeur === "object" && !Array.isArray(valeur);
const estTexteNonVide = (valeur) => typeof valeur === "string" && valeur.trim() !== "";

/** Les raisons pour lesquelles une entrée est refusée, chacune préfixée de son chemin. */
function erreursDeLEntree(entree, chemin) {
  if (!estObjet(entree)) return [`${chemin} doit être un objet.`];
  const erreurs = [];
  for (const cle of Object.keys(entree)) {
    if (!CHAMPS_DE_L_ENTREE.includes(cle)) erreurs.push(`${chemin}.${cle} : champ inconnu.`);
  }
  for (const champ of CHAMPS_DE_L_ENTREE) {
    if (!(champ in entree)) erreurs.push(`${chemin}.${champ} : champ manquant.`);
    else if (champ !== "ecart" && !estTexteNonVide(entree[champ])) erreurs.push(`${chemin}.${champ} : champ vide ou qui n'est pas un texte.`);
  }
  if (!("ecart" in entree)) return erreurs;

  const ecart = entree.ecart;
  if (!estObjet(ecart)) return [...erreurs, `${chemin}.ecart doit être un objet.`];
  if (!estTexteNonVide(ecart.genre)) return [...erreurs, `${chemin}.ecart.genre : champ manquant ou vide.`];
  if (GENRES_NON_DEROGEABLES.has(ecart.genre)) {
    return [...erreurs, `${chemin}.ecart.genre : \`${ecart.genre}\` ne se déroge pas, ${GENRES_NON_DEROGEABLES.get(ecart.genre)}.`];
  }
  const attendues = Object.hasOwn(COORDONNEES_PAR_GENRE, ecart.genre) ? COORDONNEES_PAR_GENRE[ecart.genre] : undefined;
  if (!attendues) return [...erreurs, `${chemin}.ecart.genre : genre inconnu \`${ecart.genre}\`.`];
  for (const cle of Object.keys(ecart)) {
    if (cle !== "genre" && !attendues.includes(cle)) erreurs.push(`${chemin}.ecart.${cle} : coordonnée inconnue pour \`${ecart.genre}\`.`);
  }
  for (const cle of attendues) {
    if (!(cle in ecart)) erreurs.push(`${chemin}.ecart.${cle} : coordonnée manquante.`);
    else if (!estTexteNonVide(ecart[cle])) erreurs.push(`${chemin}.ecart.${cle} : coordonnée vide ou qui n'est pas un texte.`);
  }
  return erreurs;
}

/**
 * Lit le texte de `.ucm/derogations.json`.
 *
 * `texte` vaut `null` quand le fichier est absent : aucune dérogation, aucune
 * erreur. Ne lève jamais ; `erreurs` liste chaque refus avec le chemin de
 * l'entrée fautive. Une entrée refusée n'est jamais appliquée, et l'appelant
 * décide si ces erreurs refusent la demande.
 */
export function lireDerogations(texte) {
  if (texte === null || texte === undefined) return { derogations: [], erreurs: [] };
  let brut;
  try {
    brut = jsonSansBom(String(texte));
  } catch {
    return { derogations: [], erreurs: [`${CHEMIN_DES_DEROGATIONS} est illisible : ce n'est pas du JSON valide.`] };
  }
  if (!estObjet(brut)) return { derogations: [], erreurs: [`${CHEMIN_DES_DEROGATIONS} doit être un objet qui porte \`derogations\`.`] };
  const erreurs = Object.keys(brut).filter((cle) => cle !== "derogations").map((cle) => `${cle} : champ inconnu.`);
  if (!Array.isArray(brut.derogations)) return { derogations: [], erreurs: [...erreurs, "derogations : liste manquante."] };

  const derogations = [];
  brut.derogations.forEach((entree, index) => {
    const raisons = erreursDeLEntree(entree, `derogations[${index}]`);
    if (raisons.length > 0) erreurs.push(...raisons);
    else derogations.push(entree);
  });
  return { derogations, erreurs };
}

/** Cette entrée désigne-t-elle exactement cet écart identifié, pour ce composant ? */
function couvre(derogation, composant, ecart) {
  if (derogation.composant !== composant || derogation.ecart.genre !== ecart.genre) return false;
  const attendues = COORDONNEES_PAR_GENRE[ecart.genre] ?? [];
  return attendues.every((cle) => derogation.ecart[cle] === ecart.coordonnees[cle]);
}

/**
 * Répartit les écarts identifiés d'un composant selon les dérogations valides.
 *
 * - `couverts` : `{ ecart, derogation }` pour un écart dérogeable, une entrée
 *   du même export, et des coordonnées identiques ;
 * - `restants` : les écarts que rien ne couvre, dont les non dérogeables ;
 * - `tombees` : les entrées du composant dont l'`export` n'est plus celui du
 *   contrat, à dire au designer ;
 * - `sansObjet` : les entrées à jour qui ne correspondent plus à aucun écart.
 */
export function appliquerDerogations(derogations, composant, exportedAt, ecarts) {
  const duComposant = derogations.filter((derogation) => derogation.composant === composant);
  const tombees = duComposant.filter((derogation) => derogation.export !== exportedAt);
  const actives = duComposant.filter((derogation) => derogation.export === exportedAt);

  const couverts = [];
  const restants = [];
  for (const ecart of ecarts) {
    const derogation = ecart.derogeable ? actives.find((candidate) => couvre(candidate, composant, ecart)) : undefined;
    if (derogation) couverts.push({ ecart, derogation });
    else restants.push(ecart);
  }
  const sansObjet = actives.filter((derogation) => !couverts.some((couvert) => couvert.derogation === derogation));
  return { couverts, restants, tombees, sansObjet };
}

/**
 * Les coordonnées d'un genre dérogeable, dans l'ordre où la commande les écrit ;
 * `null` pour un genre inconnu ou non dérogeable.
 */
export function coordonneesDuGenre(genre) {
  return Object.hasOwn(COORDONNEES_PAR_GENRE, genre) ? [...COORDONNEES_PAR_GENRE[genre]] : null;
}

/** Un argument de shell : nu s'il ne porte que des signes sûrs, sinon entre apostrophes (Bash et PowerShell les gardent littérales). */
function argumentDeShell(valeur) {
  if (/^[A-Za-z0-9._/@:+-]+$/.test(valeur)) return valeur;
  if (!valeur.includes("'")) return `'${valeur}'`;
  return `"${valeur.replace(/["\\]/g, "\\$&")}"`;
}

/**
 * La commande qui écrit une dérogation, motif à remplir par l'appelant.
 * Les coordonnées suivent l'ordre de `COORDONNEES_PAR_GENRE`.
 */
export function commandeDeDerogation(composant, genre, coordonnees) {
  const attendues = coordonneesDuGenre(genre) ?? [];
  const arguments_ = [composant, genre, ...attendues.map((cle) => coordonnees[cle] ?? "")].map(argumentDeShell);
  return `npx @ucm-kit/cli deroger ${arguments_.join(" ")} --motif "…"`;
}

const memeEcart = (gauche, droite) => {
  if (gauche.composant !== droite.composant || gauche.ecart.genre !== droite.ecart.genre) return false;
  return (coordonneesDuGenre(gauche.ecart.genre) ?? []).every((cle) => gauche.ecart[cle] === droite.ecart[cle]);
};

/**
 * Ajoute une entrée au texte de `.ucm/derogations.json` (`null` pour un fichier
 * absent) et rend le texte à écrire.
 *
 * Refuse une entrée identique (même écart, même export). Remplace l'entrée du
 * même écart dont l'export est ancien, et le dit par `remplacee`. Valide le
 * résultat entier par `lireDerogations` ; en cas d'erreur, `texte` vaut `null`
 * et rien ne s'écrit.
 */
export function ajouterDerogation(texte, entree) {
  const lu = lireDerogations(texte);
  if (lu.erreurs.length > 0) return { texte: null, erreurs: lu.erreurs, remplacee: false };

  const memes = lu.derogations.filter((existante) => memeEcart(existante, entree));
  if (memes.some((existante) => existante.export === entree.export)) {
    return { texte: null, erreurs: ["Cette dérogation existe déjà pour cet export."], remplacee: false };
  }

  const remplacee = memes.length > 0;
  const liste = [];
  let place = false;
  for (const existante of lu.derogations) {
    if (!memes.includes(existante)) liste.push(existante);
    else if (!place) {
      liste.push(entree);
      place = true;
    }
  }
  if (!place) liste.push(entree);

  const resultat = `${JSON.stringify({ derogations: liste }, null, 2)}
`;
  const relu = lireDerogations(resultat);
  if (relu.erreurs.length > 0) return { texte: null, erreurs: relu.erreurs, remplacee: false };
  return { texte: resultat, erreurs: [], remplacee };
}
