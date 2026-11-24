/**
 * Le diagnostic des contrastes d'`ucm check` : la mesure de chaque couleur d'un
 * contrat contre son fond, sans table d'usages ni nom de collection imposé.
 *
 * Chaque couleur d'un variant se lit par le premier alias de son token dans
 * `tokens.json`, puis se résout dans chaque combinaison des modes dont elle
 * dépend, la marque et le thème le plus souvent. Son fond suit la règle de
 * FORMAT.md, section 2. Un texte ou une icône sous 4,5:1, un contour ou un
 * anneau sous 3:1, donne un constat. Une couleur translucide se compose sur son
 * fond, comme le fait C49. Une couleur Display P3, une composante hors de
 * [0, 1] ou une chaîne de plus de `PROFONDEUR_D_ALIAS` alias ne se juge pas :
 * elle donne une ligne « Couleur non vérifiée ». Le contraste vient de
 * `@ucm-kit/core/emplois`, comme dans UCM Palettes.
 *
 * Limite : le contrat ne dit pas si un texte est en grand corps, où le seuil
 * descend à 3:1. Un texte en grand corps peut donc être signalé à tort ; un
 * faux signal reste une information. Le diagnostic ne bloque jamais la fusion.
 */
import { atteintLeSeuil, composer, contraste, couleurDansLeGamut, ecrireContraste, ecrireSeuil, OPAQUE, PROFONDEUR_D_ALIAS, versRgb8 } from "@ucm-kit/core/emplois";
import { natureDuRoleDuContrat } from "@ucm-kit/core/format";
import { SEUILS_PAR_ROLE, SEUILS_PAR_USAGE, SEUIL_GRAND_TEXTE_AA } from "@ucm-kit/core/referentiel";

import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
import { axesDeTokens, conesDesAxes, valeurDansLeContexte } from "./modes-tokens.mjs";
import { cheminDeReference } from "./tokens-dtcg.mjs";
import { vueExacteDuVariant } from "./variant-views.mjs";
import { TYPES_D_ALERTE } from "@ucm-kit/core/referentiel";

const GLYPHES = Object.fromEntries(TYPES_D_ALERTE.map(({ id, texte }) => [id, texte]));

/** Au-delà de ce nombre de contextes, la mesure se limite au défaut et à un mode par axe. */
const CONTEXTES_AU_PLUS = 32;

/** Le contraste que chaque rôle de couleur doit atteindre contre son fond. */
const SEUILS = SEUILS_PAR_ROLE;

/**
 * La nature des rôles qu'un côté du contrat peut porter : les clés de `tokens`
 * sont des peintures, celles de `strokes` des contours. La nature de chaque rôle
 * se lit dans la table du contrat (`natureDuRoleDuContrat`).
 */
const NATURE_DU_COTE = { fills: "peinture", strokes: "contour" };

/** Pourquoi une couleur n'est pas vérifiée, telle que la ligne du rapport l'écrit. */
const CAUSES_D_ECART = {
  "display-p3": "couleur Display P3, hors du périmètre d'UCM",
  "hors-limites": "valeur hors des limites d'une couleur",
  "alias-trop-longs": `plus de ${PROFONDEUR_D_ALIAS} alias à suivre`,
};

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

/**
 * Une couleur DTCG en composantes de 0 à 1, comme C49 la juge : `{ couleur }`,
 * `{ ecart }` quand elle est écartée avec sa cause, `null` quand le document
 * ne porte pas une couleur lisible.
 */
function lireLaCouleur(valeur) {
  if (typeof valeur === "string" && /^#[0-9a-f]{6}$/i.test(valeur)) {
    const [r, g, b] = [1, 3, 5].map((debut) => Number.parseInt(valeur.slice(debut, debut + 2), 16) / 255);
    return { couleur: { r, g, b, a: 1 } };
  }
  if (!estObjet(valeur)) return null;
  if (valeur.colorSpace === "display-p3") return { ecart: "display-p3" };
  if (valeur.colorSpace !== "srgb") return null;
  const { components } = valeur;
  const alpha = valeur.alpha ?? 1;
  if (!Array.isArray(components) || components.length !== 3 || !components.every(Number.isFinite) || !Number.isFinite(alpha)) return null;
  const [r, g, b] = components;
  const couleur = { r, g, b, a: alpha };
  return couleurDansLeGamut(couleur) ? { couleur } : { ecart: "hors-limites" };
}

/** La couleur qu'un chemin prend dans un contexte, alias suivis jusqu'à `PROFONDEUR_D_ALIAS` renvois, comme C49. */
function couleurDansLeContexte(document, chemin, contexte) {
  let courant = chemin;
  for (let renvois = 0; renvois <= PROFONDEUR_D_ALIAS; renvois++) {
    const valeur = valeurDansLeContexte(document, courant, contexte);
    const alias = cheminDeReference(valeur);
    if (alias === null) return lireLaCouleur(valeur);
    courant = alias;
  }
  return { ecart: "alias-trop-longs" };
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

/**
 * Le contraste d'une couleur sur son fond dans chaque contexte. `valeur` vaut `null` pour une couleur non jugée, et `ecarts` dit
 * lesquelles des deux couleurs sont écartées, avec leur cause. Une couleur translucide se compose sur son fond ; un fond
 * translucide n'a rien dessous à composer et ne se juge pas.
 */
function mesurer(document, couleur, fond) {
  return contextesDeMesure(document, [couleur, fond]).map((contexte) => {
    const lues = [couleur, fond].map((chemin) => ({ chemin, lue: couleurDansLeContexte(document, chemin, contexte) }));
    const ecarts = lues.filter(({ lue }) => lue?.ecart).map(({ chemin, lue }) => ({ chemin, cause: lue.ecart }));
    const [premierPlan, base] = lues.map(({ lue }) => lue?.couleur);
    const composee = premierPlan && base && base.a >= OPAQUE ? composer([premierPlan], base) : null;
    return { contexte: nomDuContexte(contexte), valeur: composee ? contraste(versRgb8(composee), versRgb8(base)) : null, ecarts };
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
 * donne aucun constat pour ce contexte. Une couleur écartée donne en plus un
 * constat de nature `non-verifiee`, une fois par chemin et par cause.
 */
export function constatsDesContrastes(contrat, document) {
  if (!estObjet(document) || !Array.isArray(contrat?.variants)) return [];
  const constats = [];
  const nonVerifiees = new Map();
  for (const variant of contrat.variants) {
    const placements = vueExacteDuVariant(contrat, variant)?.paintPlacements ?? {};
    const couleurs = [
      ...Object.entries(variant.tokens ?? {}).map(([cle, reference]) => ({ cle, cote: "fills", reference })),
      ...Object.entries(variant.strokes ?? {}).map(([cle, trait]) => ({ cle, cote: "strokes", reference: trait?.color })),
    ].flatMap((couleur) => {
      const role = roleDeLaCle(contrat, couleur.cote, couleur.cle);
      const lu = typeof couleur.reference === "string" ? premierAlias(document, couleur.reference) : null;
      if (natureDuRoleDuContrat(contrat.rendering, role) !== NATURE_DU_COTE[couleur.cote] || !lu) return [];
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
      for (const { chemin, cause } of mesures.flatMap(({ ecarts }) => ecarts)) nonVerifiees.set(JSON.stringify([chemin, cause]), { nature: "non-verifiee", chemin, cause });
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
  return [...constats, ...nonVerifiees.values()];
}

/** Un contraste à deux décimales tronquées, comme UCM Palettes l'affiche : « 4,49:1 ». */
const contrasteEcrit = (valeur) => `${ecrireContraste(valeur)}:1`;

/** La phrase d'un constat, pour le designer. */
function phraseDuConstat(fichier, constat) {
  const mesures = constat.mesures.map(({ contexte, valeur }) => `${contrasteEcrit(valeur)} (${contexte})`).join(", ");
  const vise = constat.vise ? `, qui vise \`${constat.vise}\`` : "";
  return `**\`${fichier}\`**, ${constat.variant}, clé \`${constat.cle}\`${vise} : ${mesures} sur le fond \`${constat.fond}\`, sous ${ecrireSeuil(constat.seuil)}.`;
}

/** Les constats de contraste d'un bilan, sans les lignes « non vérifiée ». */
const constatsSousLeSeuil = (bilan) => (bilan.contrastes ?? []).filter((constat) => constat.nature === "contraste");

/** La ligne d'une couleur écartée, telle que le rapport l'écrit. */
const ligneNonVerifiee = ({ chemin, cause }) => `Couleur non vérifiée : \`${chemin}\`, ${CAUSES_D_ECART[cause]}.`;

/** Les couleurs écartées de tous les bilans, une ligne par chemin et par cause : un token partagé par plusieurs contrats se dit une fois. */
function lignesNonVerifiees(bilans) {
  const lignes = bilans.flatMap((bilan) => (bilan.contrastes ?? []).filter((constat) => constat.nature === "non-verifiee").map(ligneNonVerifiee));
  return [...new Set(lignes)];
}

/**
 * La section du rapport : les couleurs sous leur seuil de contraste, puis les
 * couleurs qu'on n'a pas pu mesurer, deux informations qui ne bloquent jamais
 * la fusion.
 */
export function sectionContrastes(bilans) {
  return [...sectionSousLeSeuil(bilans), ...sectionNonVerifiees(bilans)];
}

function sectionNonVerifiees(bilans) {
  const details = lignesNonVerifiees(bilans);
  if (details.length === 0) return [];
  return rendreDiagnostic({
    severity: "info",
    title: "Des couleurs n'ont pas été vérifiées",
    count: details.length,
    itemSingular: "couleur",
    summary: "Le contraste de ces couleurs n'a pas été mesuré.",
    detailsTitle: "Couleurs non vérifiées",
    details,
    action: "Dans Figma, vérifiez le contraste de ces couleurs.",
    status: "Cette information ne bloque pas la fusion.",
  });
}

function sectionSousLeSeuil(bilans) {
  const concernes = bilans.filter((bilan) => constatsSousLeSeuil(bilan).length > 0);
  if (concernes.length === 0) return [];
  const total = concernes.reduce((somme, bilan) => somme + constatsSousLeSeuil(bilan).length, 0);
  const details = concernes.flatMap((bilan) => constatsSousLeSeuil(bilan).map((constat) => phraseDuConstat(bilan.fichier, constat)));
  return rendreDiagnostic({
    severity: "info",
    title: "Des couleurs passent sous le contraste attendu",
    count: total,
    itemSingular: "couleur",
    summary: `Chaque couleur est mesurée contre le fond de son composant, dans chaque marque et chaque thème où elle change. Le seuil est de ${ecrireSeuil(SEUILS_PAR_USAGE.texte)} pour un texte ou une icône, et de ${ecrireSeuil(SEUILS_PAR_USAGE.nonTexte)} pour un contour ou un anneau. Un texte en grand corps tient à partir de ${ecrireSeuil(SEUIL_GRAND_TEXTE_AA)}, et le contrat ne dit pas la taille d'un texte : si c'est le cas ici, ne changez rien.`,
    detailsTitle: "Couleurs à vérifier",
    details,
    action: "Dans Figma, vérifiez ces couleurs. Si l'une est trop pâle pour son fond, choisissez-en une plus contrastée, puis réexportez le composant concerné.",
    status: "Cette information ne bloque pas la fusion.",
  });
}

/** Le rappel du terminal : le nombre de couleurs sous leur seuil, sans bloquer. */
export function resumeTerminalContrastes(bilans) {
  const total = bilans.reduce((somme, bilan) => somme + constatsSousLeSeuil(bilan).length, 0);
  return total === 0
    ? null
    : `${GLYPHES.info.brut} ${libelleNombre(total, "couleur")} sous le contraste attendu dans les contrats. `
      + "Vérifiez-les dans Figma. Ce point ne bloque pas la fusion.";
}
