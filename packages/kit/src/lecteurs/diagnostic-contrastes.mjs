/**
 * Le diagnostic des contrastes d'`ucm check` : la mesure de chaque couleur d'un
 * contrat contre son fond, sans table d'usages ni nom de collection imposé.
 *
 * Chaque couleur d'un variant se lit par le premier alias de son token dans
 * `tokens.json`, puis se résout dans chaque combinaison des modes dont elle
 * dépend, la marque et le thème le plus souvent. Son fond suit la règle de
 * FORMAT.md, section 2. Un texte ou une icône sous 4,5:1, un contour ou un
 * anneau sous 3:1, donne un constat. Une couleur hors sRGB ou translucide ne se
 * juge pas : elle ne donne aucun constat. Le contraste vient de
 * `@ucm-kit/core/emplois`, comme dans UCM Palettes.
 *
 * Limite : le contrat ne dit pas si un texte est en grand corps, où le seuil
 * descend à 3:1. Un texte en grand corps peut donc être signalé à tort ; un
 * faux signal reste une information. Le diagnostic ne bloque jamais la fusion.
 */
import { aDixDecimales, atteintLeSeuil, contraste } from "@ucm-kit/core/emplois";

import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
import { axesDeTokens, conesDesAxes, valeurDansLeContexte } from "./modes-tokens.mjs";
import { cheminDeReference } from "./tokens-dtcg.mjs";
import { vueExacteDuVariant } from "./variant-views.mjs";

/** Au-delà de ce nombre de contextes, la mesure se limite au défaut et à un mode par axe. */
const CONTEXTES_AU_PLUS = 32;

/** Le contraste que chaque rôle de couleur doit atteindre contre son fond. */
const SEUILS = { foreground: 4.5, icon: 4.5, border: 3, ring: 3 };

const ROLES_DE_PEINTURE = new Set(["background", "foreground", "icon"]);
const ROLES_DE_CONTOUR = new Set(["border", "ring"]);

/** Le nom qu'un axe prend dans un message. */
const NOMS_DES_AXES = { brand: "marque", theme: "thème" };

const estObjet = (valeur) => Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);

/**
 * Le premier alias d'une référence de contrat, lu dans le contexte par défaut :
 * ce que la couleur vise dans `tokens.json`. `null` quand le token manque.
 */
function premierAlias(document, reference) {
  const chemin = cheminDeReference(reference);
  if (chemin === null || !estObjet(document)) return null;
  const valeur = valeurDansLeContexte(document, chemin, {});
  if (valeur === undefined) return null;
  return { chemin, vise: cheminDeReference(valeur) };
}

/** Une couleur DTCG à 8 bits, comme UCM Palettes la juge ; `null` hors de sRGB ou translucide. */
function enHuitBits(valeur) {
  if (typeof valeur === "string" && /^#[0-9a-f]{6}$/i.test(valeur)) {
    return [1, 3, 5].map((debut) => Number.parseInt(valeur.slice(debut, debut + 2), 16));
  }
  if (!estObjet(valeur) || valeur.colorSpace !== "srgb" || (valeur.alpha ?? 1) !== 1) return null;
  const { components } = valeur;
  if (!Array.isArray(components) || components.length !== 3 || !components.every(Number.isFinite)) return null;
  return components.map((canal) => Math.round(Math.min(1, Math.max(0, canal)) * 255));
}

/** La couleur qu'un chemin prend dans un contexte, alias suivis ; `null` si elle ne se juge pas. */
function couleurDansLeContexte(document, chemin, contexte) {
  const vus = new Set();
  let courant = chemin;
  while (!vus.has(courant)) {
    vus.add(courant);
    const valeur = valeurDansLeContexte(document, courant, contexte);
    const alias = cheminDeReference(valeur);
    if (alias === null) return enHuitBits(valeur);
    courant = alias;
  }
  return null;
}

/** Ce que le document lit une fois : ses axes et les axes dont dépend chaque feuille. */
const lectures = new WeakMap();
function lectureDe(document) {
  if (!lectures.has(document)) {
    const { axes } = axesDeTokens(document);
    lectures.set(document, { axes, cones: conesDesAxes(document, axes) });
  }
  return lectures.get(document);
}

/**
 * Les contextes où mesurer deux couleurs : chaque combinaison des modes des
 * axes dont elles dépendent, la marque et le thème le plus souvent. Au delà de
 * `CONTEXTES_AU_PLUS`, le défaut puis un mode de plus par axe.
 */
function contextesDeMesure(document, chemins) {
  const { axes, cones } = lectureDe(document);
  const touches = new Set(chemins.flatMap((chemin) => [...(cones.get(chemin) ?? [])]));
  const concernes = axes.filter((axe) => touches.has(axe.nom));
  const nombre = concernes.reduce((produit, axe) => produit * axe.modes.length, 1);
  if (nombre > CONTEXTES_AU_PLUS) {
    return [{}, ...concernes.flatMap((axe) => axe.modes.filter((mode) => mode !== axe.defaut).slice(0, 1).map((mode) => ({ [axe.nom]: mode })))];
  }
  return concernes.reduce((contextes, axe) => contextes.flatMap((contexte) => axe.modes.map((mode) => ({ ...contexte, [axe.nom]: mode }))), [{}]);
}

/** Le contexte tel que le rapport le cite : « marque acme, thème dark » ; « contexte par défaut » sans mode. */
const nomDuContexte = (contexte) => Object.entries(contexte)
  .sort(([axe]) => (axe === "brand" ? -1 : 0))
  .map(([axe, mode]) => `${NOMS_DES_AXES[axe] ?? axe} ${mode}`)
  .join(", ") || "contexte par défaut";

/** Le contraste d'une couleur sur son fond dans chaque contexte ; `valeur` vaut `null` pour une couleur non jugée. */
function mesurer(document, couleur, fond) {
  return contextesDeMesure(document, [couleur, fond]).map((contexte) => {
    const a = couleurDansLeContexte(document, couleur, contexte);
    const b = couleurDansLeContexte(document, fond, contexte);
    return { contexte: nomDuContexte(contexte), valeur: a && b ? contraste(a, b) : null };
  });
}

/** Le rôle d'une clé de couleur : celui de `rendering.keyRoles`, sinon la clé elle-même. */
function roleDeLaCle(contrat, cote, cle) {
  return contrat?.rendering?.keyRoles?.[cote]?.[cle] ?? cle;
}

/**
 * Le fond sur lequel une couleur est posée (FORMAT.md, section 2) : la clé
 * `background` dont un chemin est le plus long préfixe de celui de la
 * couleur, strictement plus court pour un `ring`. `page` sans préfixe,
 * `indetermine` quand deux fonds partagent le chemin retenu.
 */
function fondDe(chemins, role, fonds) {
  let retenu = null;
  for (const chemin of chemins) {
    for (const fond of fonds) {
      for (const candidat of fond.chemins) {
        const prefixe = candidat.length <= chemin.length && candidat.every((segment, rang) => segment === chemin[rang]);
        if (!prefixe || (role === "ring" && candidat.length === chemin.length)) continue;
        if (!retenu || candidat.length > retenu.longueur) retenu = { longueur: candidat.length, cles: new Set([fond.cle]) };
        else if (candidat.length === retenu.longueur) retenu.cles.add(fond.cle);
      }
    }
  }
  if (!retenu) return { nature: "page" };
  if (retenu.cles.size > 1) return { nature: "indetermine" };
  return { nature: "cle", cle: [...retenu.cles][0] };
}

/** Les coordonnées d'un variant, telles que le rapport les cite : « color=primary, state=hover ». */
const nomDuVariant = (variant) => Object.entries(variant?.values ?? {}).map(([axe, valeur]) => `${axe}=${valeur}`).join(", ") || "variant unique";

/**
 * Les constats d'un contrat : chaque couleur sous le seuil de son rôle contre
 * son fond, dans au moins un contexte. Un constat porte le variant, la clé, son
 * rôle et sa référence, ce qu'elle vise, la clé du fond, le seuil, et les
 * contextes où elle passe sous le seuil avec leur contraste. Une couleur sans
 * fond `background` dans le variant, ou dont un contexte ne se juge pas, ne
 * donne aucun constat pour ce contexte.
 */
export function constatsDesContrastes(contrat, document) {
  if (!estObjet(document) || !Array.isArray(contrat?.variants)) return [];
  const constats = [];
  for (const variant of contrat.variants) {
    const placements = vueExacteDuVariant(contrat, variant)?.paintPlacements ?? {};
    const couleurs = [
      ...Object.entries(variant.tokens ?? {}).map(([cle, reference]) => ({ cle, cote: "fills", reference })),
      ...Object.entries(variant.strokes ?? {}).map(([cle, trait]) => ({ cle, cote: "strokes", reference: trait?.color })),
    ].flatMap((couleur) => {
      const role = roleDeLaCle(contrat, couleur.cote, couleur.cle);
      const roles = couleur.cote === "fills" ? ROLES_DE_PEINTURE : ROLES_DE_CONTOUR;
      const lu = typeof couleur.reference === "string" ? premierAlias(document, couleur.reference) : null;
      if (!roles.has(role) || !lu) return [];
      const chemins = Array.isArray(placements[couleur.cote]?.[couleur.cle]) ? placements[couleur.cote][couleur.cle] : [];
      return [{ ...couleur, role, lu, chemins }];
    });
    const fonds = couleurs.filter((couleur) => couleur.role === "background");

    for (const couleur of couleurs) {
      const seuil = SEUILS[couleur.role];
      if (seuil === undefined) continue;
      const fond = fondDe(couleur.chemins, couleur.role, fonds);
      if (fond.nature !== "cle") continue;
      const fondDeLaCouleur = fonds.find((candidat) => candidat.cle === fond.cle);
      const mesures = mesurer(document, couleur.lu.chemin, fondDeLaCouleur.lu.chemin);
      const sousLeSeuil = mesures.filter(({ valeur }) => valeur !== null && !atteintLeSeuil(valeur, seuil));
      if (sousLeSeuil.length === 0) continue;
      constats.push({
        nature: "contraste",
        variant: nomDuVariant(variant),
        cle: couleur.cle,
        role: couleur.role,
        reference: couleur.reference,
        vise: couleur.lu.vise,
        fond: fond.cle,
        seuil,
        mesures: sousLeSeuil,
      });
    }
  }
  return constats;
}

/** Un contraste à deux décimales tronquées, comme UCM Palettes l'affiche : « 4,49:1 ». */
const contrasteEcrit = (valeur) => `${aDixDecimales(valeur).replace(/^(\d+)\.(\d{2}).*$/, "$1,$2")}:1`;

/** Le seuil écrit sans décimale inutile : « 4,5:1 », « 3:1 ». */
const seuilEcrit = (seuil) => `${String(seuil).replace(".", ",")}:1`;

/** La phrase d'un constat, pour le designer. */
function phraseDuConstat(fichier, constat) {
  const mesures = constat.mesures.map(({ contexte, valeur }) => `${contrasteEcrit(valeur)} (${contexte})`).join(", ");
  const vise = constat.vise ? `, qui vise \`${constat.vise}\`` : "";
  return `**\`${fichier}\`**, ${constat.variant}, clé \`${constat.cle}\`${vise} : ${mesures} sur le fond \`${constat.fond}\`, sous ${seuilEcrit(constat.seuil)}.`;
}

/**
 * La section du rapport : les couleurs sous leur seuil de contraste, une
 * information qui ne bloque jamais la fusion.
 */
export function sectionContrastes(bilans) {
  const concernes = bilans.filter((bilan) => (bilan.contrastes ?? []).length > 0);
  if (concernes.length === 0) return [];
  const total = concernes.reduce((somme, bilan) => somme + bilan.contrastes.length, 0);
  const details = concernes.flatMap((bilan) => bilan.contrastes.map((constat) => phraseDuConstat(bilan.fichier, constat)));
  return rendreDiagnostic({
    severity: "info",
    title: "Des couleurs passent sous le contraste attendu",
    count: total,
    itemSingular: "couleur",
    summary: "Chaque couleur est mesurée contre le fond de son composant, dans chaque marque et chaque thème où elle change. Le seuil est de 4,5:1 pour un texte ou une icône, et de 3:1 pour un contour ou un anneau. Un texte en grand corps tient à partir de 3:1, et le contrat ne dit pas la taille d'un texte : si c'est le cas ici, ne changez rien.",
    detailsTitle: "Couleurs à vérifier",
    details,
    action: "Dans Figma, vérifiez ces couleurs. Si l'une est trop pâle pour son fond, choisissez-en une plus contrastée, puis réexportez le composant concerné.",
    status: "Cette information ne bloque pas la fusion.",
  });
}

/** Le rappel du terminal : le nombre de couleurs sous leur seuil, sans bloquer. */
export function resumeTerminalContrastes(bilans) {
  const total = bilans.reduce((somme, bilan) => somme + (bilan.contrastes ?? []).length, 0);
  return total === 0
    ? null
    : `ℹ ${libelleNombre(total, "couleur")} sous le contraste attendu dans les contrats. `
      + "Vérifiez-les dans Figma. Ce point ne bloque pas la fusion.";
}
