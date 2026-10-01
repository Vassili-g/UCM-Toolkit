/**
 * Le diagnostic des emplois (décisions D14, D16 et D17 de l'architecture des
 * tokens) : ce que la table des emplois dit des couleurs d'un contrat.
 *
 * Chaque couleur d'un variant se lit par le premier alias de son token dans
 * `tokens.json`. Une couleur qui vise la collection `usage` porte un emploi,
 * et parfois un rang ; les autres sont hors de la table. Le diagnostic rend
 * quatre constats : un emploi posé sur ce qu'il ne peint pas, une couleur et
 * son fond qui ne forment pas une paire de la table au même rang, une couleur
 * hors de la table, et un variant dont l'état ne vise pas le rang que la table
 * lui donne. Le fond d'une couleur suit la règle de FORMAT.md, section 2.
 *
 * Il ne s'applique qu'à un fichier de tokens qui porte la collection `usage`,
 * et ne bloque jamais la fusion. La table, les paires, les rangs et le
 * contraste viennent de `@ucm-kit/core/emplois`, comme dans UCM Palettes.
 */
import {
  CIBLE_DE_L_ETAT,
  EMPLOIS,
  PAIRES,
  RANGS,
  SUPPORT_DES_USAGES,
  USAGES_DU_NEUTRE,
  contraste,
} from "@ucm-kit/core/emplois";

import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
import { axesDeTokens, conesDesAxes, valeurDansLeContexte } from "./modes-tokens.mjs";
import { cheminDeReference } from "./tokens-dtcg.mjs";
import { vueExacteDuVariant } from "./variant-views.mjs";

/** La collection que la table des emplois écrit en variables (D13). */
const COLLECTION_USAGE = "usage";

/** Le niveau d'élévation qui est le fond de la page (D15). */
const FOND_DE_PAGE = "usage.elevation.page";

/** Au-delà de ce nombre de contextes, la mesure se limite au défaut et à un mode par axe. */
const CONTEXTES_AU_PLUS = 32;

const ROLES_DE_PEINTURE = new Set(["background", "foreground", "icon"]);
const ROLES_DE_CONTOUR = new Set(["border", "ring"]);

/** Les emplois qu'une paire juge comme premier membre, posés sur un fond. */
const EMPLOIS_JUGES = new Set(PAIRES.flatMap((paire) => ("emploi" in paire.premier ? [paire.premier.emploi] : [])));

const estObjet = (valeur) => Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);

/** Vrai quand le fichier de tokens porte la collection `usage` : le diagnostic s'applique. */
export function porteLaTableDesEmplois(document) {
  return estObjet(document) && estObjet(document[COLLECTION_USAGE]);
}

/**
 * Ce qu'un chemin de `usage` désigne : la palette, l'emploi et le rang. Un
 * niveau d'élévation est un fond de page. `null` pour un chemin que la table
 * ne connaît pas.
 */
function lireLUsage(chemin) {
  const segments = chemin.split(".");
  if (segments[0] !== COLLECTION_USAGE) return null;
  const reste = segments.slice(1);
  if (reste[0] === "elevation") return { nature: "page", chemin, emploi: "elevation" };
  const rang = reste.findIndex((segment) => EMPLOIS.includes(segment) || segment in USAGES_DU_NEUTRE);
  if (rang <= 0) return null;
  const suivant = reste[rang + 1];
  return {
    nature: "usage",
    chemin,
    palette: reste.slice(0, rang).join("."),
    emploi: reste[rang],
    rang: RANGS.includes(suivant) ? suivant : null,
  };
}

/**
 * Le premier alias d'une référence de contrat, lu dans le contexte par défaut
 * : un usage, ou une couleur hors de la table. `null` quand le token manque.
 */
function premierAlias(document, reference) {
  const chemin = cheminDeReference(reference);
  if (chemin === null) return null;
  const valeur = valeurDansLeContexte(document, chemin, {});
  if (valeur === undefined) return null;
  const alias = cheminDeReference(valeur);
  if (alias === null) return { nature: "hors-table", chemin, vise: null };
  return lireLUsage(alias) ?? { nature: "hors-table", chemin, vise: alias };
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
 * axes dont elles dépendent, la marque et le thème le plus souvent (D1). Au
 * delà de `CONTEXTES_AU_PLUS`, le défaut puis un mode de plus par axe.
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

/** Le nom d'un contexte de mesure : ses modes, dans l'ordre des axes ; « défaut » sans mode. */
const nomDuContexte = (contexte) => Object.values(contexte).join(" · ") || "défaut";

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

/** L'état de composant qu'une valeur de l'axe d'état nomme (D17) ; `null` quand la table ne la situe pas. */
function etatDeComposant(valeur) {
  const nom = String(valeur).toLowerCase().replace(/[^a-z]/g, "");
  const ETATS = {
    default: "repos", rest: "repos", enabled: "repos",
    hover: "survol", hovered: "survol",
    press: "appui", pressed: "appui",
    selected: "selectionne",
    selectedhover: "selectionne-survole", selectedhovered: "selectionne-survole",
    selectedpress: "selectionne-appuye", selectedpressed: "selectionne-appuye",
    focus: "focus", focused: "focus", focusvisible: "focus",
    disable: "desactive", disabled: "desactive",
  };
  return ETATS[nom] ?? null;
}

/** Un membre de paire correspond-il à ce que la couleur ou son fond vise ? */
function membreCorrespond(membre, lu) {
  if ("fond" in membre) return lu.nature === "page";
  return lu.nature === "usage" && membre.emploi === lu.emploi && membre.decalage === (lu.rang ? RANGS.indexOf(lu.rang) : 0);
}

/** Les coordonnées d'un variant, telles que le rapport les cite : « color=primary, state=hover ». */
const nomDuVariant = (variant) => Object.entries(variant?.values ?? {}).map(([axe, valeur]) => `${axe}=${valeur}`).join(", ") || "variant unique";

/**
 * Les constats d'un contrat contre la table des emplois. Un constat porte sa
 * `nature`, le variant, la clé et sa référence, ce qu'elle vise, et, pour une
 * paire ou une couleur hors de la table posée sur un fond, ses contrastes par
 * contexte. Rend `[]` quand le document ne porte pas la collection `usage`.
 */
export function constatsDesEmplois(contrat, document) {
  if (!porteLaTableDesEmplois(document) || !Array.isArray(contrat?.variants)) return [];
  const constats = [];
  const axeDEtat = contrat.stateModel?.axis;
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
    const base = (couleur) => ({ variant: nomDuVariant(variant), cle: couleur.cle, role: couleur.role, reference: couleur.reference });
    const etat = axeDEtat ? etatDeComposant(variant.values?.[axeDEtat]) : null;
    const cible = etat ? CIBLE_DE_L_ETAT[etat] : null;

    for (const couleur of couleurs) {
      const { lu, role } = couleur;
      // Un niveau d'élévation est un usage de fond : il se juge sur son support, sans rang.
      if (lu.nature === "usage" || lu.nature === "page") {
        const support = SUPPORT_DES_USAGES[lu.emploi];
        if (support && !support.peint.includes(role)) {
          constats.push({ nature: "support", ...base(couleur), usage: lu.chemin, peint: support.peint });
        }
      }
      if (lu.nature === "usage" && cible) {
        if ("rang" in cible && lu.rang !== null && lu.rang !== cible.rang) {
          constats.push({ nature: "etat", ...base(couleur), usage: lu.chemin, etat: variant.values[axeDEtat], rangAttendu: cible.rang, rang: lu.rang });
        }
        if ("neutre" in cible && !cible.neutre.includes(lu.emploi)) {
          constats.push({ nature: "etat", ...base(couleur), usage: lu.chemin, etat: variant.values[axeDEtat], usagesAttendus: cible.neutre });
        }
      }
      if (role === "background") {
        if (lu.nature === "hors-table") constats.push({ nature: "hors-table", ...base(couleur), vise: lu.vise, contrastes: [] });
        continue;
      }

      const fond = fondDe(couleur.chemins, role, fonds);
      if (fond.nature === "indetermine") continue;
      const fondLu = fond.nature === "page" ? { nature: "page" } : fonds.find((candidat) => candidat.cle === fond.cle).lu;
      const cheminDuFond = fond.nature === "page" ? FOND_DE_PAGE : cheminDeReference(fonds.find((candidat) => candidat.cle === fond.cle).reference);
      const contrastes = () => (cheminDuFond && valeurDansLeContexte(document, cheminDuFond, {}) !== undefined
        ? mesurer(document, cheminDeReference(couleur.reference), cheminDuFond)
        : []);
      const surFond = fond.nature === "page" ? "page" : fond.cle;
      if (lu.nature === "hors-table") {
        constats.push({ nature: "hors-table", ...base(couleur), vise: lu.vise, fond: surFond, contrastes: contrastes() });
        continue;
      }
      if (lu.nature !== "usage" || !EMPLOIS_JUGES.has(lu.emploi) || !SUPPORT_DES_USAGES[lu.emploi]?.peint.includes(role)) continue;
      if (fondLu.nature === "hors-table") continue;
      const memePalette = fondLu.nature === "page" || fondLu.palette === lu.palette;
      const enPaire = memePalette && PAIRES.some((paire) => membreCorrespond(paire.premier, lu) && membreCorrespond(paire.second, fondLu));
      if (!enPaire) {
        constats.push({ nature: "paire", ...base(couleur), usage: lu.chemin, fond: surFond, usageDuFond: fondLu.nature === "page" ? FOND_DE_PAGE : fondLu.chemin, contrastes: contrastes() });
      }
    }
  }
  return constats;
}

/** Un contraste à deux décimales tronquées, comme UCM Palettes l'affiche : « 4,49:1 ». */
const contrasteEcrit = (valeur) => `${(Math.floor(valeur * 100) / 100).toFixed(2).replace(".", ",")}:1`;

/** Les contrastes d'un constat, par contexte : « 3,21:1 (acme · light) » ; une couleur non jugée le dit. */
function mesuresEcrites(contrastes) {
  if (contrastes.length === 0) return "";
  const mesures = contrastes.map(({ contexte, valeur }) => (valeur === null ? `non jugé (${contexte}), couleur hors sRGB ou translucide` : `${contrasteEcrit(valeur)} (${contexte})`));
  return ` Contraste mesuré : ${mesures.join(", ")}.`;
}

/** La phrase d'un constat, pour le designer. */
function phraseDuConstat(fichier, constat) {
  const ou = `**\`${fichier}\`**, ${constat.variant}, clé \`${constat.cle}\``;
  switch (constat.nature) {
    case "support":
      return `${ou} : \`${constat.usage}\` peint un ${constat.peint.join(" ou un ")}, posé ici en ${constat.role}.`;
    case "paire":
      return `${ou} : \`${constat.usage}\` sur \`${constat.usageDuFond}\` (${constat.fond === "page" ? "fond de la page" : `clé \`${constat.fond}\``}) ne forme pas une paire de la table au même rang.${mesuresEcrites(constat.contrastes)}`;
    case "hors-table":
      return `${ou} : ${constat.vise ? `vise \`${constat.vise}\`` : "porte une couleur sans alias"} hors de la table des emplois.${mesuresEcrites(constat.contrastes)}`;
    case "etat":
      return constat.usagesAttendus
        ? `${ou} : l'état \`${constat.etat}\` demande les usages du neutre ${constat.usagesAttendus.map((usage) => `\`${usage}\``).join(" ou ")}, et la couleur vise \`${constat.usage}\`.`
        : `${ou} : l'état \`${constat.etat}\` demande le rang \`${constat.rangAttendu}\`, et \`${constat.usage}\` vise le rang \`${constat.rang}\`.`;
    default:
      return `${ou}.`;
  }
}

/**
 * La section du rapport : les constats des contrats, par nature. Avertit sans
 * bloquer la fusion, sur le modèle des références absentes.
 */
export function sectionEmplois(bilans) {
  const concernes = bilans.filter((bilan) => (bilan.emplois ?? []).length > 0);
  if (concernes.length === 0) return [];
  const total = concernes.reduce((somme, bilan) => somme + bilan.emplois.length, 0);
  const ordre = ["support", "paire", "etat", "hors-table"];
  const details = concernes.flatMap((bilan) => [...bilan.emplois]
    .sort((a, b) => ordre.indexOf(a.nature) - ordre.indexOf(b.nature))
    .map((constat) => phraseDuConstat(bilan.fichier, constat)));
  return rendreDiagnostic({
    severity: "warning",
    title: "Des couleurs s'écartent de la table des emplois",
    count: total,
    itemSingular: "écart",
    summary: "La table des emplois dit ce que chaque usage peint, sur quel fond, et à quel rang pour chaque état. Les couleurs ci-dessous s'en écartent.",
    detailsTitle: "Couleurs à revoir",
    details,
    action: "Dans Figma, reliez ces couleurs aux usages que la table prévoit, puis réexportez les composants concernés. Une couleur hors de la table reste possible : gardez-la si son contraste vous convient.",
    status: "Cet avertissement ne bloque pas la fusion.",
  });
}

/** Le rappel du terminal : le nombre d'écarts à la table, sans bloquer. */
export function resumeTerminalEmplois(bilans) {
  const total = bilans.reduce((somme, bilan) => somme + (bilan.emplois ?? []).length, 0);
  return total === 0
    ? null
    : `⚠ ${libelleNombre(total, "écart")} à la table des emplois dans les contrats. `
      + "Reliez ces couleurs aux usages dans Figma, puis réexportez. Ce point ne bloque pas la fusion.";
}
