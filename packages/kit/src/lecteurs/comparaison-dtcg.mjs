/**
 * Une valeur Figma face à la valeur qu'un token publié porte.
 *
 * L'exporteur écrit chaque type de variable sous une forme DTCG précise ;
 * `@ucm-kit/core/format` (`valeurs-figma.ts`) tient les règles de cette
 * écriture. Ce module les suit pour dire si un fichier de tokens porte encore
 * ce que Figma porte. Il ne reçoit aucun objet de Figma : l'appelant ramène
 * d'abord la valeur à une `ValeurFigmaPortable`, en secondes pour une durée et
 * en quatre points pour une courbe.
 *
 * Trois états : `egal`, `different`, et `non-comparable` avec sa cause. Une
 * entrée qu'aucune règle ne couvre est non comparable, jamais égale : un
 * appelant qui affiche « même valeur » doit avoir comparé.
 *
 * Les alias ne passent pas ici. Le chemin publié de leur cible dépend de
 * l'index de l'appelant.
 */

const ESPACES = ["srgb", "display-p3"];

/** Un octet de couleur, ou l'arrondi d'un hexadécimal. */
const TOLERANCE_DE_COULEUR = 0.5 / 255 + 1e-9;

/** L'écart admis sur les quatre points d'une courbe. */
const TOLERANCE_DE_COURBE = 1e-9;

/** L'écart relatif admis sur une durée, une fois ramenée en secondes. */
const TOLERANCE_DE_DUREE = 1e-9;

const EGAL = Object.freeze({ etat: "egal" });
const DIFFERENT = Object.freeze({ etat: "different" });

const nonComparable = (cause) => Object.freeze({ etat: "non-comparable", cause });

const selon = (egal) => (egal ? EGAL : DIFFERENT);

const estObjet = (valeur) => typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
const estNombreFini = (valeur) => typeof valeur === "number" && Number.isFinite(valeur);

/** Une couleur publiée ramenée à `{ espace, composantes, alpha }`, ou la cause du refus. */
function couleurPubliee(publiee) {
  if (typeof publiee === "string") {
    const hexa = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(publiee);
    if (!hexa) return { cause: "forme-inconnue" };
    const octet = (rang) => parseInt(hexa[1].slice(rang * 2, rang * 2 + 2), 16) / 255;
    return { espace: "srgb", composantes: [octet(0), octet(1), octet(2)], alpha: hexa[2] ? parseInt(hexa[2], 16) / 255 : 1 };
  }
  if (!estObjet(publiee) || typeof publiee.colorSpace !== "string") return { cause: "forme-inconnue" };
  if (!ESPACES.includes(publiee.colorSpace)) return { cause: "espace-inconnu" };
  const { components } = publiee;
  if (!Array.isArray(components) || components.length !== 3 || !components.every(estNombreFini)) return { cause: "forme-inconnue" };
  const alpha = publiee.alpha === undefined ? 1 : publiee.alpha;
  if (!estNombreFini(alpha)) return { cause: "forme-inconnue" };
  return { espace: publiee.colorSpace, composantes: components, alpha };
}

function comparerCouleur(source, publiee) {
  const cible = couleurPubliee(publiee);
  if ("cause" in cible) return nonComparable(cible.cause);
  // Les mêmes canaux dans un autre espace ne sont pas la même couleur : l'export a été fait sous un autre profil.
  if (cible.espace !== source.espace) return DIFFERENT;
  const proche = (a, b) => Math.abs(a - b) <= TOLERANCE_DE_COULEUR;
  return selon(source.composantes.every((canal, rang) => proche(canal, cible.composantes[rang])) && proche(source.alpha, cible.alpha));
}

function comparerDimension(source, publiee) {
  if (estNombreFini(publiee)) return selon(source.nombre === publiee);
  if (typeof publiee === "string") {
    const pixels = /^(-?\d+(?:\.\d+)?)px$/.exec(publiee);
    return pixels ? selon(source.nombre === Number(pixels[1])) : nonComparable("forme-inconnue");
  }
  if (!estObjet(publiee) || !estNombreFini(publiee.value) || typeof publiee.unit !== "string") return nonComparable("forme-inconnue");
  if (publiee.unit === "px") return selon(source.nombre === publiee.value);
  return nonComparable(publiee.unit === "rem" || publiee.unit === "em" ? "unite-relative" : "unite-inconnue");
}

function comparerNombre(source, publiee) {
  return estNombreFini(publiee) ? selon(source.nombre === publiee) : nonComparable("forme-inconnue");
}

function comparerDuree(source, publiee) {
  if (!estObjet(publiee) || !estNombreFini(publiee.value) || typeof publiee.unit !== "string") return nonComparable("forme-inconnue");
  if (publiee.unit !== "s" && publiee.unit !== "ms") return nonComparable("unite-inconnue");
  const secondes = publiee.unit === "ms" ? publiee.value / 1000 : publiee.value;
  return selon(Math.abs(source.secondes - secondes) <= TOLERANCE_DE_DUREE * Math.max(1, Math.abs(source.secondes), Math.abs(secondes)));
}

function comparerCourbe(source, publiee) {
  if (source.points === null) return nonComparable("courbe-sans-points");
  if (!Array.isArray(publiee) || publiee.length !== 4 || !publiee.every(estNombreFini)) return nonComparable("forme-inconnue");
  return selon(source.points.every((point, rang) => Math.abs(point - publiee[rang]) <= TOLERANCE_DE_COURBE));
}

function comparerGraisse(source, publiee) {
  if (source.nature === "nombre" && estNombreFini(publiee)) return selon(source.nombre === publiee);
  if (source.nature === "texte" && typeof publiee === "string") return selon(source.texte === publiee);
  // Un poids face à un nom de graisse : l'export n'établit pas la table qui les rapproche.
  return nonComparable("forme-inconnue");
}

function comparerTexte(source, publiee) {
  return typeof publiee === "string" ? selon(source.texte === publiee) : nonComparable("forme-inconnue");
}

function comparerBooleen(source, publiee) {
  return typeof publiee === "boolean" ? selon(source.booleen === publiee) : nonComparable("forme-inconnue");
}

/** Pour chaque `$type` connu, les natures de source qu'il admet et sa règle. */
const REGLES = {
  color: { natures: ["couleur"], comparer: comparerCouleur },
  dimension: { natures: ["nombre"], comparer: comparerDimension },
  number: { natures: ["nombre"], comparer: comparerNombre },
  duration: { natures: ["duree"], comparer: comparerDuree },
  cubicBezier: { natures: ["courbe"], comparer: comparerCourbe },
  fontWeight: { natures: ["nombre", "texte"], comparer: comparerGraisse },
  string: { natures: ["texte"], comparer: comparerTexte },
  fontFamily: { natures: ["texte"], comparer: comparerTexte },
  boolean: { natures: ["booleen"], comparer: comparerBooleen },
};

/**
 * Compare une valeur Figma à la valeur qu'un token publié porte, selon son
 * `$type`.
 *
 * Un `$type` absent ou inconnu, ou une valeur publiée qui n'a pas la forme que
 * son `$type` annonce, rend `forme-inconnue`. Une source dont la nature ne va
 * pas avec le `$type` rend `type-incompatible` : l'écart de type se relève à
 * part, et la comparaison n'en conclut rien de plus.
 *
 * `source` est une `ValeurFigmaPortable`, `type` le `$type` du token publié et
 * `publiee` sa valeur dans un mode. Les types sont dans `index.d.mts`.
 */
export function comparerAuTokenPublie(source, type, publiee) {
  const regle = typeof type === "string" && Object.hasOwn(REGLES, type) ? REGLES[type] : undefined;
  if (!regle) return nonComparable("forme-inconnue");
  if (!regle.natures.includes(source?.nature)) return nonComparable("type-incompatible");
  return regle.comparer(source, publiee);
}
