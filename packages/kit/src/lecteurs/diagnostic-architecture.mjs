/**
 * Le diagnostic d'architecture d'`ucm check` : les deux contrôles du mode Tokens
 * d'UCM Architect, `controlerLIntegriteUcm` et `controlerLeCatalogue`, passés sur
 * `tokens.json` par la projection `catalogueDepuisTokens`.
 *
 * Il suit l'architecture UCM sans option : seul l'Exporter est agnostique. Il ne
 * rend jamais que de l'information, et aucun de ses constats n'entre dans
 * `bilanEstBloquant` : une demande de tokens seuls reste verte. Un fichier dont
 * aucune collection n'est reconnue ne suit pas l'architecture UCM, et ne reçoit
 * qu'une ligne qui le dit.
 *
 * Les écarts de `brands` et de `utility` (variable sans lien vers `primitives`, famille sans palette, cran de charte, palette à compléter)
 * entrent dans le même rapport : le contrôle ne crée aucune couleur, donc le rapport ne décide d'aucune palette.
 *
 * Le rapport groupe les constats par genre, avec leur nombre et au plus
 * `EXEMPLES_PAR_GENRE` exemples de `LONGUEUR_D_UN_EXEMPLE` caractères : la
 * section tient sous la limite d'un commentaire quel que soit le nombre d'écarts.
 *
 * Limite : les jetons de type composé (typographie, ombre, courbe) ne sont pas
 * des variables Figma, la projection les saute et aucun contrôle ne les juge.
 */
import { catalogueDepuisTokens, controlerLIntegriteUcm, controlerLeCatalogue } from "@ucm-kit/core/controles";
import { TYPES_D_ALERTE } from "@ucm-kit/core/referentiel";

import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";

const GLYPHES = Object.fromEntries(TYPES_D_ALERTE.map(({ id, texte }) => [id, texte]));

/** Au-delà, un genre n'en montre pas davantage : le nombre dit le reste. */
const EXEMPLES_PAR_GENRE = 3;

/** Un exemple plus long est coupé : un nom de variable peut mesurer plusieurs centaines de caractères. */
const LONGUEUR_D_UN_EXEMPLE = 120;

/** Un nom Figma dans un exemple : sans accent grave, qui fermerait le code, et sans retour à la ligne. */
const nomEcrit = (valeur) => `\`${String(valeur).replaceAll("`", "'").replace(/\s+/g, " ")}\``;

const mode = (faits) => (faits.mode === undefined ? "" : `, mode ${nomEcrit(faits.mode)}`);

/** Le nom que le fait désigne, quelle que soit la forme du constat. */
const sujet = (faits) => faits.variable ?? faits.collection ?? faits.rampe ?? faits.echelle ?? faits.groupe;

const exempleParDefaut = (faits) => (sujet(faits) === undefined ? "" : `${nomEcrit(sujet(faits))}${mode(faits)}`);

/**
 * Chaque genre de constat que les deux contrôles rendent, dans l'ordre du
 * rapport : de l'écart qui empêche de juger le thème à ceux des échelles.
 * `exemple` écrit un constat de ce genre ; il rend « » sans exemple à citer.
 */
const GENRES = [
  { genre: "theme-non-reconnu", libelle: "Aucune collection `theme` reconnue", exemple: () => "" },
  { genre: "theme-en-double", libelle: "Collection `theme` en double", exemple: (f) => nomEcrit(f.collection) },
  { genre: "mode-du-theme", libelle: "Mode light ou dark absent du thème", exemple: (f) => nomEcrit(f.collection) },
  { genre: "variable-absente", libelle: "Variable du thème absente", exemple: (f) => nomEcrit(f.groupe ? `${f.groupe}/${f.variable}` : f.variable) },
  { genre: "variable-inconnue", libelle: "Variable du thème au nom inconnu" },
  { genre: "role-en-double", libelle: "Rôle du thème tenu par plusieurs variables", exemple: (f) => nomEcrit(f.groupe ? `${f.groupe}/${f.variable}` : f.variable) },
  { genre: "cran", libelle: "Variable du thème qui vise un autre cran que celui de son rôle" },
  { genre: "cran-absent", libelle: "Cran absent de sa palette", exemple: (f) => `cran ${nomEcrit(f.cran)} de ${nomEcrit(f.rampe)}` },
  { genre: "sens-partage", libelle: "Palette dont les variables suivent deux sens de lecture" },
  { genre: "rampe-autre-palette", libelle: "Variable du thème qui vise la palette d'une autre" },
  { genre: "branche-de-mode", libelle: "Variable du thème liée à la branche de l'autre mode" },
  { genre: "lien-manquant", libelle: "Variable de brands ou de utility sans lien vers primitives" },
  { genre: "lien-a-corriger", libelle: "Variable de brands ou de utility liée à un autre cran que celui attendu" },
  { genre: "palette-a-choisir", libelle: "Famille de brands ou de utility sans palette", exemple: (f) => `${nomEcrit(`${f.collection}/${f.groupe}`)}${mode(f)}` },
  { genre: "charte-a-choisir", libelle: "Couleur de charte sans cran choisi", exemple: (f) => `${nomEcrit(`${f.collection}/${f.variable}`)}${mode(f)}` },
  { genre: "rampe-a-completer", libelle: "Palette de primitives à compléter dans Palettes", exemple: (f) => (f.palette === undefined ? `${nomEcrit(`${f.collection}/${f.groupe}`)}${mode(f)}, aucune palette` : `${nomEcrit(f.palette)}, ${nomEcrit(f.manque)}`) },
  { genre: "couche", libelle: "Variable liée à une collection que sa couche n'admet pas" },
  { genre: "valeur-directe", libelle: "Couleur écrite en dur là où une variable est attendue" },
  { genre: "scopes", libelle: "Scopes différents de ceux que la variable doit porter" },
  { genre: "type", libelle: "Variable du thème qui n'est pas une couleur" },
  { genre: "mal-rangee", libelle: "Variable de palette rangée dans la mauvaise collection" },
  { genre: "alias-supprime", libelle: "Alias vers une variable absente" },
  { genre: "library-inactive", libelle: "Alias vers une library inactive" },
  { genre: "cible-inaccessible", libelle: "Alias vers une collection inaccessible", exemple: (f) => `${nomEcrit(f.collection)} (${libelleNombre(f.alias, "alias")})` },
  { genre: "sans-valeur-en-mode", libelle: "Variable sans valeur dans un mode" },
  { genre: "valeur-vide", libelle: "Valeur vide là où les palettes sœurs en ont une" },
  { genre: "couleur-sans-alias", libelle: "Couleur de composant écrite en dur" },
  { genre: "doublon-d-echelle", libelle: "Crans d'une échelle qui valent la même chose", exemple: (f) => `${nomEcrit(f.echelle)}${mode(f)}, ${libelleNombre(f.doublons, "cran")} à ${f.valeur}` },
  { genre: "autre", libelle: "Autre écart d'architecture" },
];

/** Le genre d'un constat : celui que le contrôle écrit, sinon celui que ses faits désignent. */
function genreDe({ code, faits }) {
  if (faits.genre !== undefined) return String(faits.genre);
  if (code === "C60") return "branche-de-mode";
  if (faits.echelle !== undefined) return "doublon-d-echelle";
  if (faits.soeurs !== undefined) return "valeur-vide";
  if (faits.scopes !== undefined) return "scopes";
  return "autre";
}

const coupe = (texte) => (texte.length <= LONGUEUR_D_UN_EXEMPLE ? texte : `${texte.slice(0, LONGUEUR_D_UN_EXEMPLE - 1)}…`);

/**
 * L'architecture d'un `tokens.json`. Ne lève jamais : un fichier que la
 * projection ou un contrôle ne sait pas lire rend `{ etat: "non-jugee" }`, car un
 * diagnostic d'information ne doit pas faire échouer la vérification.
 *
 * - `non-ucm` : aucune collection n'a le nom d'une collection UCM.
 * - `jugee` : `groupes` liste, par genre, le nombre de constats et leurs exemples ;
 *   `total` vaut zéro quand l'architecture est conforme.
 */
export function constatsDeLArchitecture(tokens) {
  try {
    const { catalogue } = catalogueDepuisTokens(tokens, "ucm");
    const collections = catalogue.collections.length;
    if (catalogue.collections.every((collection) => collection.role === null)) return { etat: "non-ucm", collections };

    const parGenre = new Map();
    for (const constat of [...controlerLIntegriteUcm(catalogue), ...controlerLeCatalogue(catalogue)]) {
      const genre = genreDe(constat);
      const groupe = parGenre.get(genre) ?? { genre, nombre: 0, exemples: [] };
      groupe.nombre += 1;
      const entree = GENRES.find((candidat) => candidat.genre === genre);
      const exemple = coupe((entree?.exemple ?? exempleParDefaut)(constat.faits));
      if (exemple !== "" && groupe.exemples.length < EXEMPLES_PAR_GENRE && !groupe.exemples.includes(exemple)) groupe.exemples.push(exemple);
      parGenre.set(genre, groupe);
    }
    const groupes = GENRES.flatMap(({ genre }) => (parGenre.has(genre) ? [parGenre.get(genre)] : []));
    return {
      etat: "jugee",
      collections,
      groupes,
      total: groupes.reduce((somme, groupe) => somme + groupe.nombre, 0),
    };
  } catch {
    return { etat: "non-jugee" };
  }
}

/** La ligne d'un genre : son libellé, son nombre, puis ses exemples. */
function ligneDuGenre({ genre, nombre, exemples }) {
  const { libelle } = GENRES.find((candidat) => candidat.genre === genre);
  const reste = nombre - exemples.length;
  const suite = exemples.length === 0
    ? ""
    : ` : ${exemples.join(" ; ")}${reste > 0 ? ` ; ${reste === 1 ? "1 autre" : `${reste} autres`}` : ""}`;
  return `${libelle} (${nombre})${suite}`;
}

/**
 * La section du rapport : l'architecture de `tokens.json`, une information qui
 * ne bloque jamais la fusion. Une architecture conforme n'écrit rien.
 */
export function sectionArchitecture(architecture) {
  if (!architecture) return [];
  if (architecture.etat === "non-ucm") {
    return rendreDiagnostic({
      severity: "info",
      title: `\`tokens.json\` ne suit pas l'architecture UCM : aucune collection reconnue (${libelleNombre(architecture.collections, "collection")} lue${architecture.collections > 1 ? "s" : ""}), elle n'est pas jugée.`,
    });
  }
  if (architecture.etat === "non-jugee") {
    return rendreDiagnostic({ severity: "info", title: "L'architecture de `tokens.json` n'a pas pu être jugée." });
  }
  if (architecture.total === 0) return [];
  return rendreDiagnostic({
    severity: "info",
    title: "L'architecture de `tokens.json` s'écarte de celle d'UCM",
    count: architecture.total,
    itemSingular: "écart",
    summary: "Les collections, le thème, les modes, les scopes et les échelles de `tokens.json` sont comparés à l'architecture UCM, avec les contrôles d'UCM Architect. Chaque ligne donne le nombre d'écarts d'un genre et quelques exemples.",
    detailsTitle: "Écarts par genre",
    details: architecture.groupes.map(ligneDuGenre),
    action: "Un designer relit ces écarts dans UCM Architect, corrige dans Figma ceux qu'il confirme, puis réexporte les tokens.",
    status: "Cette information ne bloque pas la fusion.",
  });
}

/** Le rappel du terminal : le nombre d'écarts, sans bloquer. */
export function resumeTerminalArchitecture(architecture) {
  if (!architecture) return null;
  if (architecture.etat === "non-ucm") {
    return `${GLYPHES.info.brut} tokens.json ne suit pas l'architecture UCM : aucune collection reconnue, elle n'est pas jugée.`;
  }
  if (architecture.etat === "non-jugee") return `${GLYPHES.info.brut} L'architecture de tokens.json n'a pas pu être jugée.`;
  return architecture.total === 0
    ? null
    : `${GLYPHES.info.brut} ${libelleNombre(architecture.total, "écart")} d'architecture dans tokens.json. `
      + "Relisez-les dans UCM Architect. Ce point ne bloque pas la fusion.";
}
