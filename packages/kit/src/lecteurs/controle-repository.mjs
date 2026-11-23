/**
 * Orchestre une seule fois les lecteurs et le rapport destiné au designer.
 * Les adaptateurs mesurent les écarts propres à leur stack ; le noyau décide
 * des verdicts et de leur rédaction. La publication du rapport reste au CLI.
 */
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { readFileSync } from "node:fs";

import {
  CONFIGURATION_PAR_DEFAUT,
  EXTENSION_VERSION_TOKENS,
  TOKENS_FORMAT_VERSION,
  etatDuFormatDeTokens,
  sansBom,
  versionDeContrat,
} from "@ucm-kit/core/format";

import { avertissementsCorrigeables, resumeTerminalAvertissements, sectionAvertissementsExport } from "./avertissements-export.mjs";
import { constatsDeLArchitecture, resumeTerminalArchitecture, sectionArchitecture } from "./diagnostic-architecture.mjs";
import { suffixeDeDerogation } from "./controle-du-code-listes.mjs";
import { preparerControleDepuis } from "./controle-du-code.mjs";
import { CHEMIN_DES_DEROGATIONS, commandeDeDerogation } from "./derogations.mjs";
import { lireDerogationsDuDepot, lireJsonDuDepot } from "./configuration.mjs";
import { aUnEcartDeParite } from "./diagnostic-parite.mjs";
import { diagnosticEchecsDeTests, resumeTerminalEchecsDeTests } from "./diagnostic-tests.mjs";
import { libelleNombre, rendreDiagnostic } from "./diagnostic-markdown.mjs";
import { constatsDesContrastes, resumeTerminalContrastes, sectionContrastes } from "./diagnostic-contrastes.mjs";
import { resumeTerminalTokensManquants, sectionTokensManquants } from "./diagnostic-tokens.mjs";
import { cheminImplementation, identifiantDuContrat, implementationPresente } from "./implementation.mjs";
import { collecterReferences, sansEchantillon } from "./references-token.mjs";
import { genreDeLaDemande, perimetreDeLaDemande } from "./perimetre-rapport.mjs";
import { indexerTokensDtcg, nomsCssDesTokens, referencesAbsentes } from "./tokens-dtcg.mjs";
import { erreursTypesTypographiques } from "./typography-token-types.mjs";
import { trouverContrats } from "./trouver-contrats.mjs";
import { champsInvalidesDuContrat } from "./validation-contrat.mjs";
import { validerGrapheDesContrats } from "./validation-graphe-contrats.mjs";
import { TEXTES_DES_ETATS, bilanEstBloquant, enteteDuVerdict, verdictDeLaDemande } from "./verdict-bilan.mjs";
import { VERSION_CONTRAT_MAXIMALE, VERSION_CONTRAT_MINIMALE, verdictDeVersion } from "./version-contrat.mjs";
import { TYPES_D_ALERTE } from "@ucm-kit/core/referentiel";

const GLYPHES = Object.fromEntries(TYPES_D_ALERTE.map(({ id, texte }) => [id, texte]));

const VERSIONS_CONTRAT_SUPPORTEES = VERSION_CONTRAT_MINIMALE === VERSION_CONTRAT_MAXIMALE
  ? VERSION_CONTRAT_MINIMALE
  : `${VERSION_CONTRAT_MINIMALE} à ${VERSION_CONTRAT_MAXIMALE}`;

/** Un relevé de parité vierge : la forme que tout adaptateur doit rendre. */
function pariteVide() {
  return {
    implementationAbsente: false,
    implementationNonLue: null,
    interfaceAbsente: null,
    fonctionAbsente: null,
    manquantes: [],
    typesIncorrects: [],
    valeursNonImplementees: [],
    booleensNonUtilises: [],
    enumsSansEffet: [],
    compositionsIncorrectes: [],
  };
}

/**
 * L'adaptateur de celui qui n'en a pas, et il n'est pas un bouchon.
 *
 * Un repo sans adaptateur n'est pas un repo sans réponse : le noyau sait dire
 * où une implémentation devrait être et si elle y est, et c'est
 * exactement ce que cet objet répond. Ce qu'il ne fait jamais, c'est conclure
 * « conforme » de ce qu'il n'a pas lu : un fichier présent devient
 * `implementationNonLue`, la seule phrase vraie quand personne n'a de
 * vérificateur pour ce langage.
 *
 * C'est la règle de tri n° 3 rendue exécutable : le noyau est utile seul, et
 * l'adaptateur n'ajoute que ce que lui seul peut mesurer.
 */
export const ADAPTATEUR_VIDE = Object.freeze({
  lireApiPublique: () => new Map(),
  nomInterfaceAttendue: () => null,
  ecartsDeParite: (_contrat, _releve, _nomInterface, options = {}) =>
    (options.presente
      ? { ...pariteVide(), implementationNonLue: options.chemin ?? null }
      : { ...pariteVide(), implementationAbsente: true }),
});

/**
 * Analyse un contrat sans jamais lever : un fichier illisible est un
 * diagnostic à afficher, pas un plantage du garde-fou (une stack trace Node
 * n'aide personne, et surtout pas la personne qui a produit l'export).
 */
function analyser(chemin, contexte, erreursGraphe = []) {
  const { racine, motif, apiPublique, adaptateur, tokensExistants, tokensDtcg } = contexte;
  const fichier = basename(chemin);
  const relatif = chemin.replace(racine, ".");
  const vide = {
    fichier, relatif, illisible: false, champsAbsents: [], version: null,
    avertissements: [],
    manquants: [], typesTypographiques: [], total: 0, contrastes: [],
    graphe: erreursGraphe,
    parite: pariteVide(),
    // **Un relevé vide n'est pas un relevé vierge**, et les confondre était un
    // défaut réel, trouvé en passant un repo neuf au contrôle. Chaque sortie
    // anticipée (fichier illisible, champs absents, version hors fenêtre)
    // rend `parite` sans l'avoir mesurée, et le terminal y lisait
    // « code conforme » : la phrase exacte qu'une classe entière
    // de code pour ne plus jamais prononcer sans avoir lu.
    pariteMesuree: false,
  };

  let contrat;
  try {
    // Un BOM en tête de fichier ferait échouer JSON.parse : on le retire.
    contrat = lireJsonDuDepot(chemin);
  } catch {
    return { ...vide, illisible: true };
  }

  // La version se lit par la règle du format, pas par un accès écrit ici : le
  // champ qui la porte est le même que celui que le producteur annonce dans le
  // corps de sa pull request, et deux idées de « où vit la version »
  // divergeraient sans que rien ne le dise.
  const version = versionDeContrat(contrat);
  // On garde le sens de l'écart, pas seulement son existence : c'est lui qui
  // dit à qui appartient le geste correctif.
  const verdict = verdictDeVersion(version);
  const versionIncompatible = verdict === "ok" ? null : { valeur: version, verdict };

  // **La version se juge avant les champs.** Dans l'autre ordre,
  // `champsInvalidesDuContrat` refuserait un contrat hors fenêtre pour ses
  // champs, et `enteteDuVerdict` écrirait « contrats invalides » : un titre qui
  // accuse le designer pour un contrat parfaitement formé dont seule la version
  // n'est pas lue. Le message doit dire qui corrige.
  //
  // La condition n'est pas « la version est mauvaise » mais « la version est
  // lisible et mauvaise ». Un fichier vidé de sa substance (`{}`, JSON
  // parfaitement valide) n'a pas une version trop ancienne : il n'en a pas, et
  // c'est un contrat cassé, pas un contrat périmé. `versionDeContrat` rend
  // `null` dans ce cas exact, champ absent, vide ou d'un autre type.
  //
  // Ce qu'on accepte de perdre : le diagnostic détaillé d'un contrat hors
  // fenêtre, que ce validateur n'a de toute façon pas le droit de dresser pour
  // une grammaire qu'il ne lit pas.
  if (versionIncompatible && version !== null) {
    return { ...vide, version: versionIncompatible };
  }

  // Le garde-fou vérifie ensuite qu'il a bien de quoi travailler. Sans ce
  // contrôle, un fichier vidé de sa substance (`{}`, JSON parfaitement valide)
  // passerait au vert : zéro référence citée, donc zéro référence manquante.
  let champsAbsents;
  try {
    champsAbsents = champsInvalidesDuContrat(contrat);
  } catch {
    champsAbsents = ["structure"];
  }
  if (champsAbsents.length > 0) return { ...vide, champsAbsents };

  const implementation = cheminImplementation(chemin, motif);
  // La présence se demande au disque, pas au relevé : c'est elle qui distingue
  // « pas encore écrit » de « écrit, mais illisible par cet adaptateur ».
  const parite = adaptateur.ecartsDeParite(
    contrat,
    apiPublique.get(implementation),
    adaptateur.nomInterfaceAttendue(implementation),
    { presente: implementationPresente(chemin, { motif }), chemin: basename(implementation) },
  );

  // Le contrat ne publie aucun index de ses tokens depuis la 11.0, et
  // `champsInvalidesDuContrat` refuse celui qui en porterait un. Le relevé du
  // contrat est donc la seule source de ce qui est cité.
  const citees = collecterReferences(sansEchantillon(contrat));

  return {
    ...vide,
    pariteMesuree: true,
    version: versionIncompatible,
    // Ce que l'export a signalé. Le contrat le porte déjà ; il ne manquait
    // qu'un lecteur du côté de la CI.
    avertissements: avertissementsCorrigeables(contrat),
    parite,
    manquants: referencesAbsentes(citees, tokensExistants),
    typesTypographiques: erreursTypesTypographiques(contrat, tokensDtcg),
    // Les couleurs sous leur seuil de contraste contre leur fond, dans tout `tokens.json`.
    contrastes: constatsDesContrastes(contrat, tokensDtcg),
    total: citees.size,
  };
}

/** Contrats valides qui attendent encore leur première implémentation. */
function implementationsEnAttente(bilans) {
  return bilans.filter(
    (bilan) =>
      bilan.parite.implementationAbsente
      && !bilan.illisible
      && bilan.champsAbsents.length === 0
      && !bilan.version
      && bilan.graphe.length === 0
      && bilan.typesTypographiques.length === 0,
  );
}

/** Au-delà, `gh pr comment` refuse le corps et la pull request reste sans commentaire. */
const LIMITE_COMMENTAIRE_GITHUB = 65_536;

/**
 * Le marqueur qui identifie, parmi les commentaires d'une demande de fusion,
 * celui que le rapport possède et doit remplacer.
 *
 * Il est écrit ici, et non par les deux publicateurs, pour deux raisons. Il
 * entre ainsi dans la borne ci-dessus : préfixé après coup, il poussait le
 * corps publié au-delà de la limite que cette borne existe pour tenir, et la
 * demande se retrouvait sans commentaire, le défaut exact contre lequel elle a
 * été écrite. Et le littéral cesse d'exister en trois endroits.
 */
export const MARQUEUR_RAPPORT = "<!-- ucm-rapport -->";

/**
 * Le second marqueur : ce rapport ne demande aucun geste.
 *
 * Un publicateur qui le lit remplace le commentaire du rapport s'il en existe
 * un, et n'en crée jamais. Une demande étrangère à UCM reste donc vierge, et
 * une demande qui portait un refus depuis corrigé ne garde pas un verdict
 * périmé sous les yeux.
 */
export const MARQUEUR_SANS_OBJET = "<!-- ucm-sans-objet -->";

const SUITE_OMISE = [
  "",
  "---",
  "",
  "**La suite de ce rapport ne tient pas dans un commentaire GitHub.** Le verdict en tête reste celui de la vérification complète. Un développeur lit la liste entière dans le journal de la CI, à l'étape qui lance `ucm check`.",
].join("\n");

/**
 * Coupe le rapport à la dernière ligne entière qui tient dans un commentaire.
 * Le verdict ouvre le rapport, donc la coupe n'emporte que des détails, que le
 * terminal a déjà écrits en entier.
 */
function bornerAuCommentaire(rapport, reserve) {
  const limite = LIMITE_COMMENTAIRE_GITHUB - reserve;
  if (rapport.length <= limite) return rapport;
  const place = limite - SUITE_OMISE.length;
  const coupe = rapport.lastIndexOf("\n", place);
  return `${rapport.slice(0, coupe > 0 ? coupe : place)}${SUITE_OMISE}`;
}

/**
 * Coiffe le rapport de ses marqueurs et le borne, une fois pour toutes.
 *
 * Tout rapport passe par ici, y compris ceux des sorties anticipées : un
 * rapport sans marqueur ne serait jamais retrouvé, donc jamais remplacé, et
 * chaque push empilerait un commentaire de plus.
 *
 * La réserve compte les marqueurs et le saut de ligne que `ucm check` ajoute
 * en écrivant le fichier : ce que les forges publient est ce fichier, pas la
 * chaîne rendue ici.
 */
function finaliserRapport(rapport, { sansObjet = false } = {}) {
  const marqueurs = sansObjet
    ? `${MARQUEUR_RAPPORT}\n${MARQUEUR_SANS_OBJET}`
    : MARQUEUR_RAPPORT;
  return `${marqueurs}\n${bornerAuCommentaire(rapport, marqueurs.length + 2)}`;
}

/**
 * Le rapport d'une demande de fusion qui ne touche rien d'UCM.
 *
 * Il ne demande aucun geste, et la règle du projet veut qu'un message sans
 * geste ne s'écrive pas. Celui-ci existe pour un seul lecteur : celui dont le
 * commentaire portait un verdict que cette demande ne concerne plus. Il dit
 * donc ce qui a été constaté et l'état de la fusion, et rien d'autre.
 */
const RAPPORT_SANS_OBJET = [
  `## ${GLYPHES.tenu.forge} Cette demande de fusion ne touche aucun fichier suivi par UCM`,
  "",
  "Le contrôle a tourné et ne demande aucun geste. La fusion n'est pas bloquée.",
].join("\n");

/** Ajoute au rapport l'état informatif des contrats encore sans implémentation. */
function ajouterImplementationsEnAttente(lignes, bilans) {
  const attentes = implementationsEnAttente(bilans);
  if (attentes.length === 0) return;

  lignes.push("", ...rendreDiagnostic({
    severity: "info",
    title: attentes.length === 1
      ? "Un composant n'a pas encore d'implémentation"
      : "Des composants n'ont pas encore d'implémentation",
    count: attentes.length,
    itemSingular: "composant",
    summary: "Ces contrats sont valides et peuvent être fusionnés avant leur implémentation :",
    items: attentes.map((bilan) => `\`${bilan.fichier}\``),
    status: "La conformité sera vérifiée dès que l'implémentation du composant sera ajoutée.",
  }));
}

/** Au-delà, le rapport renvoie à `ucm check` : un commentaire de demande ne porte pas toute la liste. */
const LIGNES_D_ECARTS_PAR_COMPOSANT = 10;

/** Un écart du code se lit par son fichier et sa ligne ; son message porte déjà la commande de dérogation. */
const ligneDEcartDuCode = (id, { fichier, ligne, texte }) => `${id} : \`${fichier}\` ligne ${ligne} : ${texte}`;

/** Un écart de parité dérogeable gagne la commande qui le déroge. */
const ligneDEcartDeParite = (id, ecart) => (ecart.derogeable
  ? `${id} : ${ecart.texte} ${suffixeDeDerogation(commandeDeDerogation(id, ecart.genre, ecart.coordonnees))}`
  : `${id} : ${ecart.texte}`);

/** Les écarts qui font l'état « code en écart » : ceux du verdict, sauf ceux que `tokens.json` met en retard. */
const ecartsEnEcart = ({ jugement }) => jugement.ecarts.filter((ecart) => !jugement.ecartsEnRetardSurLesTokens.includes(ecart));

/**
 * Les écarts d'un composant, désignés par leur composant : « Button : La
 * propriété… » pour la parité, « Button : `fichier` ligne 12 : … » pour le code.
 * Dix lignes au plus, puis le nombre des autres.
 */
function lignesDEcarts(entree, ecarts = ecartsEnEcart(entree)) {
  const lignes = ecarts.map((ecart) => (ecart.fichier === undefined
    ? ligneDEcartDeParite(entree.id, ecart)
    : ligneDEcartDuCode(entree.id, ecart)));
  if (lignes.length <= LIGNES_D_ECARTS_PAR_COMPOSANT) return lignes;
  return [
    ...lignes.slice(0, LIGNES_D_ECARTS_PAR_COMPOSANT),
    `et ${lignes.length - LIGNES_D_ECARTS_PAR_COMPOSANT} autres : lancez \`npx ucm check\` en local.`,
  ];
}

/** Ce qui refuse la demande à cause du code d'un composant : un écart, ou un code non lu. */
const bloqueParLeCode = ({ jugement }) => jugement.bloquantPar.parite || jugement.bloquantPar.code;

/** L'information qui dit combien de valeurs le juge n'a pas suivies. */
const libelleDesValeursNonJugees = (nombre) => (nombre === 1
  ? "1 valeur calculée par le code, non jugée."
  : `${nombre} valeurs calculées par le code, non jugées.`);

/** Ce que le rapport écrit d'une dérogation : son composant, l'écart, le motif et l'auteur. */
const ligneDeDerogation = (id, designation, { motif, par }) => `${id} : ${designation} Motif : ${motif} (${par})`;

/** Désigne un écart que la dérogation vise, quand l'écart lui-même n'est plus mesuré. */
function designationDeLEcart({ genre, ...coordonnees }) {
  const [prop, valeur] = [coordonnees.prop, coordonnees.valeur].map((nom) => (nom === undefined ? "" : `\`${nom}\``));
  switch (genre) {
    case "prop-absente": return `la propriété ${prop} n'existe pas dans le code.`;
    case "type-incorrect": return `le type de la propriété ${prop} ne suit pas le contrat.`;
    case "valeur-non-implementee": return `la variante ${valeur} de ${prop} n'est pas implémentée.`;
    case "booleen-sans-effet":
    case "enum-sans-effet": return `la propriété ${prop} n'a aucun effet dans le code.`;
    case "composition-non-rendue": return `le composant \`${coordonnees.composant}\` n'est pas rendu.`;
    case "valeur-en-dur": return `la valeur \`${coordonnees.valeur}\` est écrite en dur dans \`${coordonnees.fichier}\`.`;
    case "token-inconnu": return `\`${coordonnees.reference}\` ne nomme aucun token dans \`${coordonnees.fichier}\`.`;
    case "repli-en-dur": return `\`${coordonnees.reference}\` porte un repli écrit en dur dans \`${coordonnees.fichier}\`.`;
    default: return `écart \`${genre}\`.`;
  }
}

/** « 12 jours » entre deux dates, ou `null` quand `depuis` manque ou n'est pas une date. */
function ageEnJours(depuis, maintenant) {
  const debut = depuis === undefined || depuis === null ? Number.NaN : Date.parse(depuis);
  if (Number.isNaN(debut)) return null;
  return Math.max(0, Math.floor((maintenant.getTime() - debut) / 86_400_000));
}

const libelleDuRetard = (entree, maintenant) => {
  const jours = ageEnJours(entree.depuis, maintenant);
  if (jours === null) return entree.id;
  return jours === 0 ? `${entree.id}, depuis aujourd'hui` : `${entree.id}, depuis ${libelleNombre(jours, "jour")}`;
};

/** Les entrées dont un constat est présent, dans l'ordre des contrats. */
const avecConstat = (entrees, constat) => entrees.filter((entree) => entree.jugement.constats.includes(constat));

/**
 * Les composants dont les tokens sont absents, répartis selon le verdict : ceux
 * que la demande refuse, et ceux qui sont « en retard sur les tokens » (les
 * tokens ont changé après le contrat) ou que la demande ne juge pas.
 */
function repartitionDesTokens(entrees) {
  const bloquants = [];
  const retards = [];
  for (const entree of entrees) {
    // Un retard sur les tokens que seul le code porte n'est pas une citation du contrat.
    if (entree.bilan.manquants.length === 0) continue;
    const { constats, bloquantPar } = entree.jugement;
    if (constats.includes("tokens-absents") && bloquantPar.tokens) bloquants.push(entree);
    else if (constats.includes("tokens-absents") || constats.includes("en-retard-sur-les-tokens")) retards.push(entree);
  }
  const manquants = ({ id, bilan }) => ({ id, manquants: bilan.manquants });
  return { bloquants: bloquants.map(manquants), retards: retards.map(manquants) };
}

/** Les sections des références de token : celle qui bloque d'abord, puis le retard. */
function sectionsDesTokens(entrees, { tokensModifies, sourceTokens }) {
  const { bloquants, retards } = repartitionDesTokens(entrees);
  return [
    ...sectionTokensManquants(bloquants, { bloquant: true, tokensModifies, sourceTokens }),
    ...sectionTokensManquants(retards, { bloquant: false, tokensModifies, sourceTokens }),
  ];
}

/** Ce que dit le rapport d'un adaptateur absent, cassé ou ancien, d'un fichier qu'il ne lit pas, ou d'un fichier lu en partie. */
const RESUME_DE_LECTURE = {
  "adaptateur-absent": "L'adaptateur TypeScript n'est pas installé.",
  "adaptateur-casse": "L'adaptateur TypeScript n'a pas pu se charger.",
  "adaptateur-ancien": "L'adaptateur TypeScript installé ne sait pas lire le code des composants.",
  "lecture-incomplete": "Un fichier de ces composants porte une erreur de syntaxe : l'adaptateur TypeScript ne l'a pas lu en entier.",
};

/** Les lectures que le rapport dit, dans son ordre : les trois premières viennent de la parité, les deux autres du lecteur du code. */
const LECTURES_RATEES = ["adaptateur-absent", "adaptateur-casse", "fichier-non-lu", "adaptateur-ancien", "lecture-incomplete"];

/** L'action donnée sous un écart : corriger le code, ou lancer la commande de dérogation. */
const ACTION_D_UN_ECART = "Un développeur doit mettre le code à jour, ou lancer la commande donnée sous l'écart.";

/**
 * Les sections qui parlent du code : l'écart qui bloque, le retard sur le
 * contrat ou sur `tokens.json`, les dérogations, l'adaptateur. Chacune suit
 * l'ordre de la charte : titre, éléments, écarts, action, état de la fusion.
 *
 * Un écart qui bloque (`bloquantPar`) se lit pour tout composant, y compris un
 * composant que la demande ne touche pas (du code partagé crée l'écart
 * ailleurs). Un écart que la demande ne juge pas se lit pour les composants
 * qu'elle touche, et pour tous les composants dans une demande de tokens seuls.
 */
function sectionsDuCode(entrees, { verdict, bilansDuRapport, maintenant }) {
  const lignes = [];
  const dansLePerimetre = (entree) => verdict.demande === "tokens-seuls" || bilansDuRapport.includes(entree.bilan);

  const ecarts = avecConstat(entrees, "ecart").filter((entree) => bloqueParLeCode(entree) || dansLePerimetre(entree));
  if (ecarts.length > 0) {
    const bloque = ecarts.some(bloqueParLeCode);
    lignes.push(...rendreDiagnostic({
      severity: bloque ? "error" : "warning",
      title: "Le code ne suit pas son contrat",
      count: ecarts.length,
      itemSingular: "composant",
      summary: bloque ? "Cette demande modifie le code de ces composants, et il s'écarte de leur contrat." : undefined,
      detailsTitle: "Écarts détectés",
      details: ecarts.flatMap((entree) => lignesDEcarts(entree)),
      action: ACTION_D_UN_ECART,
      status: bloque ? "La fusion reste bloquée." : "Ce point ne bloque pas votre demande.",
    }));
  }

  const retardsSurLesTokens = avecConstat(entrees, "en-retard-sur-les-tokens")
    .filter((entree) => entree.jugement.ecartsEnRetardSurLesTokens.length > 0);
  if (retardsSurLesTokens.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "warning",
      title: "Le code cite des tokens que tokens.json n'a plus",
      count: retardsSurLesTokens.length,
      itemSingular: "composant",
      detailsTitle: "Écarts détectés",
      details: retardsSurLesTokens.flatMap((entree) => lignesDEcarts(entree, entree.jugement.ecartsEnRetardSurLesTokens)),
      action: "Un développeur doit mettre le code à jour la prochaine fois qu'il modifie ce composant.",
      status: "Ce retard ne bloque pas la fusion.",
    }));
  }

  const retards = avecConstat(entrees, "en-retard-sur-son-contrat");
  if (retards.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "warning",
      title: "Le code est en retard sur son contrat",
      count: retards.length,
      itemSingular: "composant",
      summary: "Le contrat a changé après le code.",
      items: retards.map((entree) => libelleDuRetard(entree, maintenant)),
      action: "Un développeur doit mettre le code à jour la prochaine fois qu'il modifie ce composant.",
      status: "Ce retard ne bloque pas la fusion.",
    }));
  }

  const couvertes = entrees.flatMap((entree) => entree.jugement.derogations.couvertes.map((couverte) => ({ id: entree.id, ...couverte })));
  if (couvertes.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "warning",
      title: `Des écarts du code sont acceptés par une dérogation (${couvertes.length})`,
      items: couvertes.map(({ id, ecart, derogation }) => ligneDeDerogation(id, ecart.fichier === undefined ? ecart.texte : `\`${ecart.fichier}\` ligne ${ecart.ligne} : ${ecart.texte}`, derogation)),
      action: `Le designer relit chaque motif. Pour refuser, il demande à un développeur de retirer la ligne de \`${CHEMIN_DES_DEROGATIONS}\`. Pour accepter, il change Figma pour que le contrat dise ce que fait le code.`,
      status: "Ces dérogations ne bloquent pas la fusion.",
    }));
  }

  // Une dérogation ne tombe que par le contrat que cette demande remplace : un
  // export plus ancien que la demande n'a rien d'une nouvelle.
  const tombees = entrees
    .filter((entree) => entree.rangContrat === 0)
    .flatMap((entree) => entree.jugement.derogations.tombees.map((derogation) => ({ id: entree.id, derogation })));
  if (tombees.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "warning",
      title: `Des dérogations ne s'appliquent plus (${tombees.length})`,
      summary: "Cet export remplace la version du contrat que ces dérogations visaient.",
      items: tombees.map(({ id, derogation }) => ligneDeDerogation(id, designationDeLEcart(derogation.ecart), derogation)),
      action: "Un développeur doit mettre le code à jour, ou poser une nouvelle dérogation.",
      status: "Ce changement ne bloque pas la fusion.",
    }));
  }

  if (verdict.bloquantParLesDerogations) {
    lignes.push(...rendreDiagnostic({
      severity: "error",
      title: `Le fichier des dérogations contient des erreurs (${verdict.erreursDeDerogations.length})`,
      detailsTitle: "Écarts détectés",
      details: verdict.erreursDeDerogations,
      action: `Un développeur doit corriger \`${CHEMIN_DES_DEROGATIONS}\`.`,
      status: "La fusion reste bloquée.",
    }));
  }

  for (const lecture of LECTURES_RATEES) {
    const concernes = entrees.filter((entree) => entree.jugement.lecture === lecture);
    if (concernes.length === 0) continue;
    const bloque = concernes.some(bloqueParLeCode);
    const fichiers = concernes.map(({ bilan }) => bilan.parite.implementationNonLue);
    const parComposant = lecture === "adaptateur-ancien" || lecture === "lecture-incomplete";
    lignes.push(...rendreDiagnostic({
      severity: bloque ? "error" : "warning",
      title: "Le code TypeScript n'est pas vérifié",
      summary: lecture === "fichier-non-lu"
        ? fichiers.map((fichier) => `L'adaptateur TypeScript ne lit pas \`${fichier}\`.`)
        : RESUME_DE_LECTURE[lecture],
      items: lecture === "fichier-non-lu"
        ? []
        : (parComposant ? concernes.map(({ id }) => `\`${id}\``) : fichiers.map((fichier) => `\`${fichier}\``)),
      action: lecture === "lecture-incomplete"
        ? "Un développeur doit corriger l'erreur de syntaxe du fichier."
        : "Un développeur doit installer `@ucm-kit/adapter-typescript` en version exacte et enregistrer `package-lock.json`.",
      status: bloque ? "La fusion reste bloquée." : "Ce point ne bloque pas votre demande.",
    }));
  }

  const sansAdaptateur = entrees.filter((entree) => entree.jugement.lecture === "sans-adaptateur");
  if (sansAdaptateur.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "info",
      title: "Le code de ces composants n'est pas vérifié",
      count: sansAdaptateur.length,
      itemSingular: "composant",
      summary: "Aucun adaptateur UCM ne lit cette technologie.",
      items: sansAdaptateur.map(({ id }) => `\`${id}\``),
      action: "Un développeur compare le code au contrat à chaque modification.",
      status: "Ce point ne bloque pas la fusion.",
    }));
  }

  const nonJugees = entrees.filter((entree) => entree.jugement.nonAnalyses > 0 && dansLePerimetre(entree));
  if (nonJugees.length > 0) {
    lignes.push(...rendreDiagnostic({
      severity: "info",
      title: "Des valeurs calculées par le code ne sont pas jugées",
      count: nonJugees.length,
      itemSingular: "composant",
      items: nonJugees.map(({ id, jugement }) => `\`${id}\` : ${libelleDesValeursNonJugees(jugement.nonAnalyses)}`),
      status: "Ce point ne bloque pas la fusion.",
    }));
  }
  return lignes;
}

/** Rapport markdown destiné au designer : ce qui bloque, et quoi faire. */
function rapportMarkdown(bilans, fautifs, bilansDuRapport, contexte) {
  const { echecsDeTests, tokensModifies, sourceTokens, concerne, architecture, verdict, entrees, bloquant, maintenant } = contexte;

  // Une demande qui ne touche rien d'UCM n'a aucun geste à recevoir. Le
  // périmètre a déjà vidé toutes les sections informatives ; ce qui resterait
  // est un en-tête qui annonce un contrôle dont il ne rapporte rien. La borne
  // du refus est plus forte : un rapport qui bloque s'écrit toujours en entier.
  if (!bloquant && !concerne) {
    return finaliserRapport(RAPPORT_SANS_OBJET, { sansObjet: true });
  }
  // Une PR de tokens peut rendre obsolète n'importe quel contrat : dans ce
  // cas, tous les contrastes nouvellement visibles sont utiles. Dans une autre
  // PR, on limite cette information aux contrats effectivement modifiés.
  const bilansDesContrastes = tokensModifies ? bilans : bilansDuRapport;
  const optionsDesTokens = { tokensModifies, sourceTokens };
  const optionsDuCode = { verdict, bilansDuRapport, maintenant };

  // Un rapport vert alors que la pull request est refusée est pire que pas de
  // rapport du tout : le designer chercherait la panne ailleurs. Le verdict
  // couvre donc aussi ce que ce module n'a pas exécuté lui-même.
  if (!bloquant) {
    const tokens = bilans.reduce((somme, bilan) => somme + bilan.total, 0);
    const lignes = [
      `## ${GLYPHES.tenu.forge} Aucun blocage détecté`,
      "",
      `${libelleNombre(bilans.length, "contrat")} et ${libelleNombre(tokens, "référence")} de token contrôlés. Les contrôles bloquants sont passés.`,
    ];
    lignes.push(...sectionsDesTokens(entrees, optionsDesTokens));
    lignes.push(...sectionContrastes(bilansDesContrastes));
    // Le verdict est exact, mais il ne porte que sur ce qui a été exporté. Une
    // propriété que l'export n'a pas pu décrire n'est citée par personne et ne
    // produit donc aucun écart : sans ce rappel, elle passerait sous un `✅`.
    lignes.push(...sectionAvertissementsExport(bilansDuRapport));
    lignes.push(...diagnosticEchecsDeTests(echecsDeTests, bilansDuRapport.flatMap((bilan) => bilan.avertissements)));
    lignes.push(...sectionsDuCode(entrees, optionsDuCode));
    ajouterImplementationsEnAttente(lignes, bilansDuRapport);
    // En dernier : la coupe du rapport emporte d'abord l'information.
    lignes.push(...sectionArchitecture(architecture));
    return finaliserRapport(lignes.join("\n"));
  }

  // Le titre sépare les erreurs internes du contrat des échecs du repository,
  // et il ne dit que ce qui est littéralement vrai : un contrat invalide est un
  // contrat illisible, incomplet, incompatible ou incohérent, jamais un code
  // en retard, jamais un test rouge ailleurs. `bilanEstBloquant` tient cette
  // définition ; `fautifs` en retient les contrats que la demande juge, et
  // `enteteDuVerdict` en tire le titre. Un écart de code, un token absent ou un
  // adaptateur manquant refusent la demande sans rendre un contrat invalide :
  // leurs sections disent chacune leur état, et le titre nomme le repository.
  const avertissements = bilansDuRapport.flatMap((bilan) => bilan.avertissements);
  const lignes = enteteDuVerdict(fautifs, avertissements.length > 0);

  // La cause la plus probable se lit en premier, et une seule fois : les
  // diagnostics qui suivent y renvoient au lieu de recopier les mêmes
  // citations à chaque section.
  lignes.push(...sectionAvertissementsExport(bilansDuRapport, { bloquant: true }));
  lignes.push(...sectionsDesTokens(entrees, optionsDesTokens));
  lignes.push(...sectionContrastes(bilansDesContrastes));

  for (const bilan of fautifs) {
    if (bilan.illisible) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Le contrat n'est pas un fichier JSON valide : \`${bilan.fichier}\``,
        summary: "Le repository ne peut pas lire ce fichier.",
        action: "Réexportez le composant depuis Figma. Ne corrigez pas le fichier JSON à la main.",
        status: "La fusion reste bloquée.",
      }));
      continue;
    }
    if (bilan.champsAbsents.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Le contrat est incomplet : \`${bilan.fichier}\``,
        summary: "Le fichier ne contient pas toutes les informations nécessaires.",
        detailsTitle: "Champs absents ou invalides",
        details: bilan.champsAbsents.map((champ) => `\`${champ}\``),
        action: "Réexportez le composant depuis Figma. Ne corrigez pas le fichier JSON à la main.",
        status: "La fusion reste bloquée.",
      }));
      continue;
    }
    if (bilan.version) {
      const recente = bilan.version.verdict === "recent";
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `La version du contrat n'est pas prise en charge : \`${bilan.fichier}\``,
        summary: `Le contrat utilise le schéma ${bilan.version.valeur}. Le repository prend en charge les schémas ${VERSIONS_CONTRAT_SUPPORTEES}.`,
        action: recente
          ? "Un développeur doit auditer le nouveau schéma et adapter ce repository. Réexporter ne corrigera pas ce problème."
          : "Réexportez le composant avec la version actuelle du plugin.",
        status: "La fusion reste bloquée.",
      }));
    }
    const estErreurDEchantillon = (erreur) => /^(Le sample|Le slotPath|Le remplacement)/.test(erreur);
    const erreursDEchantillon = bilan.graphe.filter(estErreurDEchantillon);
    const erreursDeComposition = bilan.graphe.filter((erreur) => !estErreurDEchantillon(erreur));
    if (erreursDeComposition.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `La composition du contrat est incohérente : \`${bilan.fichier}\``,
        detailsTitle: "Écarts détectés",
        details: erreursDeComposition,
        action: "Un développeur doit vérifier les contrats co-localisés, les slots composés et les cycles.",
        status: "La fusion reste bloquée.",
      }));
    }
    if (erreursDEchantillon.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Un échantillon du contrat est inatteignable : \`${bilan.fichier}\``,
        detailsTitle: "Écarts détectés",
        details: erreursDEchantillon,
        action: "Réexportez les contrats concernés depuis Figma.",
        status: "La fusion reste bloquée.",
      }));
    }
    if (bilan.typesTypographiques.length > 0) {
      lignes.push(...rendreDiagnostic({
        severity: "error",
        title: `Des tokens typographiques ont un type incompatible : \`${bilan.fichier}\``,
        count: bilan.typesTypographiques.length,
        itemSingular: "token",
        detailsTitle: "Écarts détectés",
        details: bilan.typesTypographiques.map(({ chemin, reference, attendu, recu, feuille, mode, extension }) => (
          mode === undefined
            ? `\`${chemin}\` utilise \`${reference}\` de type \`${recu}\`. Type attendu : \`${attendu}\`.`
            : `\`${chemin}\` utilise \`${reference}\`, dont la feuille \`${feuille}\` cite un token de type \`${recu}\` dans le mode \`${mode}\``
              + `${extension === undefined ? "" : ` de l'extension \`${extension}\``}. Type attendu : \`${attendu}\`.`
        )),
        action: bilan.typesTypographiques.some(({ mode }) => mode !== undefined)
          ? "Un designer doit lier dans Figma une variable du même type pour chaque mode cité, puis réexporter les tokens."
          : "Un développeur doit corriger l'exporteur, puis un designer doit réexporter les tokens depuis Figma.",
        status: "La fusion reste bloquée.",
      }));
    }
  }

  // Les deux diagnostics reçoivent ce que l'export a signalé, mot pour mot :
  // ni l'un ni l'autre ne conclut à sa place, mais aucun ne peut plus disculper
  // Figma sans l'avoir consulté.
  lignes.push(...diagnosticEchecsDeTests(echecsDeTests, avertissements));

  lignes.push(...sectionsDuCode(entrees, optionsDuCode));
  ajouterImplementationsEnAttente(lignes, bilansDuRapport);
  lignes.push(...sectionArchitecture(architecture));
  return finaliserRapport(lignes.join("\n"));
}

/**
 * Un type que l'adaptateur n'a pas su résoudre est une limite, pas un écart :
 * elle se dit à la suite de l'état du code, sans rien compter ni refuser. Un
 * bilan écrit sans ce champ reste lu.
 */
function limitesDeLecture(parite) {
  const props = (parite.typesNonAnalyses ?? []).map(({ prop }) => prop);
  return props.length === 0
    ? ""
    : `, sauf ${listeDeProps(props)} : type non résolu par l'adaptateur`;
}

/** Énumère en français : « `a`, `b` et `c` ». */
function listeDeProps(props) {
  const citees = props.map((prop) => `\`${prop}\``);
  return citees.length < 2
    ? citees.join("")
    : `${citees.slice(0, -1).join(", ")} et ${citees[citees.length - 1]}`;
}

/**
 * Ce que la ligne du terminal dit du code d'un composant dont l'adaptateur a lu
 * le fichier : la phrase de l'état du code, dans l'ordre de `ETATS_DE_COMPOSANT`.
 * Un retard sur les tokens que seule la citation du contrat porte n'est pas un
 * état du code.
 */
function etatDuCodeDansLeTerminal(jugement) {
  const retardDuCode = jugement.ecartsEnRetardSurLesTokens.length > 0;
  const etat = ["ecart", "code-non-verifie", "en-retard-sur-son-contrat", "en-retard-sur-les-tokens", "deroge-a-valider"]
    .find((candidat) => jugement.constats.includes(candidat) && (candidat !== "en-retard-sur-les-tokens" || retardDuCode));
  return TEXTES_DES_ETATS[etat ?? "conforme"].phrase;
}

/** Les lignes du terminal pour les écarts du code d'un composant, dix au plus. */
function lignesDuCodeDansLeTerminal(entree, ligneDEcart) {
  const { jugement } = entree;
  const ecarts = jugement.ecarts.filter((ecart) => ecart.fichier !== undefined);
  return lignesDEcarts(entree, ecarts).map(ligneDEcart);
}

/** Le fil du terminal, contrat par contrat, dans l'ordre où il s'écrit. */
function terminalDesBilans(bilans, entrees) {
  const fil = [];
  for (const [rang, bilan] of bilans.entries()) {
    const { jugement, rangContrat } = entrees[rang];
    // Le terminal marque en ✗ ce que la demande refuse, et en ⚠ ce qu'elle
    // laisse passer : le même constat ne porte pas deux symboles selon la
    // demande qui le juge.
    const ecartBloque = bloqueParLeCode(entrees[rang]) && jugement.constats.includes("ecart");
    const ligneDEcart = (texte) => (ecartBloque
      ? { flux: "error", texte: `${GLYPHES.bloquant.brut} ${texte}` }
      : { flux: "warn", texte: `${GLYPHES.corriger.brut} ${texte}` });
    if (bilan.illisible) {
      fil.push({ flux: "error", texte: `${GLYPHES.bloquant.brut} ${bilan.fichier} : JSON illisible (${bilan.relatif})` });
      continue;
    }
    if (bilan.champsAbsents.length > 0) {
      fil.push({ flux: "error", texte: `${GLYPHES.bloquant.brut} ${bilan.fichier} : contrat inexploitable, champs absents → ${bilan.champsAbsents.join(', ')} (${bilan.relatif})` });
      continue;
    }
    if (bilan.version) {
      fil.push({
        flux: "error",
        texte: bilan.version.verdict === "recent"
          ? `${GLYPHES.bloquant.brut} ${bilan.fichier} : contrat en ${bilan.version.valeur}. Ce repository lit les schémas ${VERSIONS_CONTRAT_SUPPORTEES}. Un développeur doit adapter les lecteurs ; réexporter n'y changera rien.`
          : `${GLYPHES.bloquant.brut} ${bilan.fichier} : contrat en ${bilan.version.valeur}. Ce repository lit les schémas ${VERSIONS_CONTRAT_SUPPORTEES}. Réexportez le composant depuis Figma.`,
      });
    }
    const tokensBloquent = jugement.bloquantPar.tokens && jugement.constats.includes("tokens-absents");
    for (const token of bilan.manquants) {
      fil.push(tokensBloquent
        ? { flux: "error", texte: `${GLYPHES.bloquant.brut} ${bilan.fichier} : référence absente de la source de tokens → ${token}` }
        : { flux: "warn", texte: `${GLYPHES.corriger.brut} ${bilan.fichier} : référence absente de la source de tokens → ${token}` });
    }
    for (const { chemin, reference, attendu, recu, feuille, mode, extension } of bilan.typesTypographiques) {
      const ou = extension === undefined ? `le mode ${mode}` : `le mode ${mode} de l'extension ${extension}`;
      const constat = mode === undefined
        ? `${reference} est ${recu}, attendu ${attendu}`
        : `${reference} traverse ${feuille}, qui cite un ${recu} dans ${ou}, attendu ${attendu}`;
      fil.push({ flux: "error", texte: `${GLYPHES.bloquant.brut} ${bilan.fichier} : type typographique incompatible → ${chemin}, ${constat}` });
    }
    for (const erreur of bilan.graphe) {
      fil.push({ flux: "error", texte: `${GLYPHES.bloquant.brut} ${bilan.fichier} : graphe de composition incohérent → ${erreur}` });
    }
    if (bilan.parite.interfaceAbsente) {
      fil.push(ligneDEcart(`${bilan.fichier} : interface ${bilan.parite.interfaceAbsente} introuvable dans le composant`));
    }
    if (bilan.parite.fonctionAbsente) {
      fil.push(ligneDEcart(`${bilan.fichier} : fonction du composant ${bilan.parite.fonctionAbsente} introuvable → nommez-la comme le fichier, ou exportez-la par défaut`));
    }
    for (const prop of bilan.parite.manquantes) {
      fil.push(ligneDEcart(`${bilan.fichier} : prop du contrat absente du composant → ${prop}`));
    }
    for (const { prop, attendu, recu } of bilan.parite.typesIncorrects) {
      fil.push(ligneDEcart(`${bilan.fichier} : type de prop incompatible → ${prop} doit être ${attendu}, reçu ${recu}`));
    }
    for (const { prop, valeurs } of bilan.parite.valeursNonImplementees ?? []) {
      fil.push(ligneDEcart(`${bilan.fichier} : valeurs du contrat absentes de l'union du code → ${prop} : ${valeurs.join(", ")}`));
    }
    for (const { prop } of bilan.parite.enumsSansEffet ?? []) {
      fil.push(ligneDEcart(`${bilan.fichier} : prop enum déclarée mais non utilisée par le composant → ${prop}`));
    }
    for (const prop of bilan.parite.booleensNonUtilises) {
      fil.push(ligneDEcart(`${bilan.fichier} : prop BOOLEAN déclarée mais non utilisée par le composant → ${prop}`));
    }
    for (const { component, attendu, rendu } of bilan.parite.compositionsIncorrectes) {
      fil.push(ligneDEcart(`${bilan.fichier} : cardinalité de composition incorrecte → ${component}, attendu ${attendu}, rendu ${rendu}`));
    }

    fil.push(...lignesDuCodeDansLeTerminal(entrees[rang], ligneDEcart));

    const ecartDeParite = aUnEcartDeParite(bilan) || jugement.ecarts.some((ecart) => ecart.fichier !== undefined);
    // La validité porte sur le contrat. Un code en retard n'invalide pas le
    // fichier qu'il devrait suivre : il se lit dans `etatDuCode`, juste après.
    const contratValide = bilan.typesTypographiques.length === 0
      && bilan.graphe.length === 0
      && !bilan.version;
    const aAvertir = bilan.manquants.length > 0 || ecartDeParite;
    const marque = !contratValide || jugement.bloquant
      ? GLYPHES.bloquant.brut
      : (aAvertir ? GLYPHES.corriger.brut : GLYPHES.tenu.brut);
    const etatDuCode = !bilan.pariteMesuree
      // L'analyse s'est arrêtée avant la parité : le contrat est illisible, ou
      // sa version n'est pas lue. Rien n'a été comparé, et le dire est la seule
      // phrase vraie : « conforme » accuserait le contraire de ce qui s'est
      // passé, sur la ligne même qui annonce le refus.
      ? "code non examiné"
      : bilan.parite.implementationAbsente
        ? "implémentation en attente (autorisé)"
        // Ne jamais dire « conforme » de ce qu'on n'a pas lu : c'est la moitié
        // de ce défaut. Le fichier est là, l'adaptateur n'en a
        // rien tiré.
        : bilan.parite.implementationNonLue
          ? `implémentation présente, non lue par l'adaptateur (${bilan.parite.implementationNonLue})`
          : `${etatDuCodeDansLeTerminal(jugement)}${limitesDeLecture(bilan.parite)}`;
    fil.push({
      flux: "log",
      texte: `${marque} ${bilan.fichier} : ${libelleNombre(bilan.total, "référence")} contrôlée${bilan.total === 1 ? "" : "s"}, ${etatDuCode} (${bilan.relatif})`,
    });
  }
  return fil;
}

/** Les gestes correctifs du terminal : seuls ceux qui s'appliquent. */
function terminalDesFautifs(fautifs) {
  if (fautifs.length === 0) return [];
  const fil = [{ flux: "error", texte: `\n${GLYPHES.bloquant.brut} ${libelleNombre(fautifs.length, "contrat")} en défaut.` }];
  if (fautifs.some((bilan) => bilan.illisible || bilan.champsAbsents.length > 0)) {
    fil.push({ flux: "error", texte: '  JSON illisible ou incomplet : ré-exportez le composant depuis Figma.' });
  }
  if (fautifs.some((bilan) => bilan.typesTypographiques.length > 0)) {
    fil.push({ flux: "error", texte: "  Types typographiques incompatibles : corrigez l’exporteur, puis réexportez les tokens depuis Figma ; ne retouchez pas les contrats ni le code." });
  }
  if (fautifs.some((bilan) => bilan.graphe.length > 0)) {
    fil.push({ flux: "error", texte: "  Graphe de composition incohérent : ajoutez les contrats cibles, alignez les slots et supprimez les cycles." });
  }
  return fil;
}

/**
 * Le rappel du terminal pour ce que le verdict de la demande a constaté sur le
 * code : le même fait que les sections du rapport, avec le même état de la
 * fusion. Un point qui bloque ne dit jamais qu'il ne bloque pas.
 */
function terminalDuVerdict(entrees, { verdict, bilansDuRapport }) {
  const fil = [];
  const nombre = (liste) => libelleNombre(liste.length, "composant");
  const dansLePerimetre = (entree) => verdict.demande === "tokens-seuls" || bilansDuRapport.includes(entree.bilan);

  const ecarts = avecConstat(entrees, "ecart").filter((entree) => bloqueParLeCode(entree) || dansLePerimetre(entree));
  if (ecarts.length > 0) {
    fil.push(ecarts.some(bloqueParLeCode)
      ? { flux: "error", texte: `
${GLYPHES.bloquant.brut} ${nombre(ecarts)} : le code ne suit pas son contrat.
  ${ACTION_D_UN_ECART} La fusion reste bloquée.` }
      : { flux: "warn", texte: `
${GLYPHES.corriger.brut} ${nombre(ecarts)} : le code ne suit pas son contrat. Un développeur doit le mettre à jour. Ce point ne bloque pas votre demande.` });
    // Le fil de chaque contrat a dit les écarts ; la commande de dérogation d'un écart de parité se lit ici, sous l'action.
    for (const entree of ecarts) {
      const sansFichier = ecartsEnEcart(entree).filter((ecart) => ecart.fichier === undefined && ecart.derogeable);
      for (const ecart of sansFichier.slice(0, LIGNES_D_ECARTS_PAR_COMPOSANT)) {
        fil.push({ flux: "log", texte: `  ${entree.id} : ${commandeDeDerogation(entree.id, ecart.genre, ecart.coordonnees)}` });
      }
    }
  }
  const retardsSurLesTokens = avecConstat(entrees, "en-retard-sur-les-tokens")
    .filter((entree) => entree.jugement.ecartsEnRetardSurLesTokens.length > 0);
  if (retardsSurLesTokens.length > 0) {
    fil.push({ flux: "warn", texte: `
${GLYPHES.corriger.brut} ${nombre(retardsSurLesTokens)} : le code cite des tokens que tokens.json n'a plus. Un développeur met le code à jour à la prochaine modification. Ce retard ne bloque pas la fusion.` });
  }
  const retards = avecConstat(entrees, "en-retard-sur-son-contrat");
  if (retards.length > 0) {
    fil.push({ flux: "warn", texte: `
${GLYPHES.corriger.brut} ${nombre(retards)} en retard sur ${retards.length === 1 ? "son" : "leur"} contrat. Un développeur met le code à jour à la prochaine modification. Ce retard ne bloque pas la fusion.` });
  }
  const acceptes = entrees.reduce((somme, entree) => somme + entree.jugement.derogations.couvertes.length, 0);
  if (acceptes > 0) {
    fil.push({ flux: "warn", texte: `
${GLYPHES.corriger.brut} ${libelleNombre(acceptes, "écart")} du code ${acceptes === 1 ? "est accepté" : "sont acceptés"} par une dérogation. Le designer relit chaque motif. Ces dérogations ne bloquent pas la fusion.` });
  }
  const tombees = entrees.filter((entree) => entree.rangContrat === 0)
    .reduce((somme, entree) => somme + entree.jugement.derogations.tombees.length, 0);
  if (tombees > 0) {
    fil.push({ flux: "warn", texte: `
${GLYPHES.corriger.brut} ${libelleNombre(tombees, "dérogation")} ne s'applique${tombees === 1 ? "" : "nt"} plus : cet export remplace le contrat visé. Ce changement ne bloque pas la fusion.` });
  }
  if (verdict.bloquantParLesDerogations) {
    for (const erreur of verdict.erreursDeDerogations) {
      fil.push({ flux: "error", texte: `${GLYPHES.bloquant.brut} ${erreur}` });
    }
  }
  for (const lecture of LECTURES_RATEES) {
    const concernes = entrees.filter((entree) => entree.jugement.lecture === lecture);
    if (concernes.length === 0) continue;
    const bloque = concernes.some(bloqueParLeCode);
    const constat = lecture === "fichier-non-lu"
      ? `l'adaptateur TypeScript ne lit pas ${concernes.map(({ bilan }) => bilan.parite.implementationNonLue).join(", ")}`
      : RESUME_DE_LECTURE[lecture].replace(/\.$/, "").replace(/^L'a/, "l'a").replace(/^Un fichier/, "un fichier");
    const geste = lecture === "lecture-incomplete"
      ? "Un développeur doit corriger l'erreur de syntaxe du fichier."
      : "Un développeur doit installer @ucm-kit/adapter-typescript en version exacte.";
    fil.push(bloque
      ? { flux: "error", texte: `
${GLYPHES.bloquant.brut} Le code TypeScript n'est pas vérifié : ${constat}. ${geste} La fusion reste bloquée.` }
      : { flux: "warn", texte: `
${GLYPHES.corriger.brut} Le code TypeScript n'est pas vérifié : ${constat}. Ce point ne bloque pas votre demande.` });
  }
  const sansAdaptateur = entrees.filter((entree) => entree.jugement.lecture === "sans-adaptateur");
  if (sansAdaptateur.length > 0) {
    fil.push({ flux: "log", texte: `
${GLYPHES.info.brut} Le code de ${nombre(sansAdaptateur)} n'est pas vérifié : aucun adaptateur UCM ne lit cette technologie. Ce point ne bloque pas la fusion.` });
  }
  for (const entree of entrees) {
    if (entree.jugement.nonAnalyses > 0 && dansLePerimetre(entree)) {
      fil.push({ flux: "log", texte: `${GLYPHES.info.brut} ${entree.id} : ${libelleDesValeursNonJugees(entree.jugement.nonAnalyses)}` });
    }
  }
  return fil;
}

/**
 * Renonce à contrôler, en le disant.
 *
 * Les préalables du garde-fou (fichier de tokens lisible, dossier de contrats
 * atteignable) peuvent manquer : il n'a alors rien à contrôler, mais la pull
 * request est refusée quand même. Sortir en silence laisserait le designer
 * devant un ✗ sans cause ; ce rapport minimal nomme le préalable manquant et le
 * geste attendu.
 */
function abandon(titre, explication, terminal, echecsDeTests) {
  return {
    bilans: [],
    fautifs: [],
    bloquant: true,
    rapport: finaliserRapport([
      `## ${GLYPHES.bloquant.forge} ${titre}`,
      "",
      explication,
      "",
      ...diagnosticEchecsDeTests(echecsDeTests),
    ].join("\n")),
    terminal,
  };
}

/** Ce qui rend la marque illisible, dit à l'endroit du fichier où il se lit. */
function constatDeMarqueInvalide(tokens) {
  if (tokens === null || typeof tokens !== "object" || Array.isArray(tokens)) {
    return "Le fichier n'est pas un objet JSON.";
  }
  const extensions = tokens.$extensions;
  if (extensions === null || typeof extensions !== "object" || Array.isArray(extensions)) {
    return "À la racine du fichier, `$extensions` n'est pas un objet.";
  }
  return `À la racine du fichier, \`$extensions["${EXTENSION_VERSION_TOKENS}"]\` vaut \`${JSON.stringify(extensions[EXTENSION_VERSION_TOKENS])}\`, qui n'est pas une version du format de tokens.`;
}

/**
 * Refuse un fichier de tokens dont la version du format n'est pas lue, avant
 * d'en lire un seul token.
 *
 * Les deux refus n'appellent pas le même geste. Une version future demande une
 * mise à jour des paquets du repository, qu'un réexport ne remplace pas. Une
 * marque invalide ne sort pas du plugin, et un réexport la remplace.
 */
function refusDuFormatDeTokens(format, tokens, { sourceTokens, cheminTokens, echecsDeTests }) {
  if (format.etat === "future") {
    return abandon(
      `\`${sourceTokens}\` utilise une version du format de tokens que ce repository ne lit pas`,
      `Le fichier porte la version ${format.version} du format de tokens. Les paquets UCM de ce repository lisent la version ${TOKENS_FORMAT_VERSION}, et aucune référence n'a été vérifiée. Un développeur doit mettre à jour les paquets UCM du repository : réexporter les tokens ne corrigera pas ce problème. La fusion reste bloquée.`,
      [{
        flux: "error",
        texte: `${GLYPHES.bloquant.brut} ${cheminTokens} : version ${format.version} du format de tokens, ce repository lit la version ${TOKENS_FORMAT_VERSION}. Un développeur doit mettre à jour les paquets UCM ; réexporter n'y changera rien.`,
      }],
      echecsDeTests,
    );
  }
  const constat = constatDeMarqueInvalide(tokens);
  return abandon(
    `\`${sourceTokens}\` porte une version du format de tokens illisible`,
    `${constat} Le plugin n'écrit jamais cette forme. Relancez **Exporter les tokens** depuis Figma plutôt que de corriger le fichier. La fusion reste bloquée.`,
    [{
      flux: "error",
      texte: `${GLYPHES.bloquant.brut} ${cheminTokens} : version du format de tokens illisible. ${constat} Relancez l’export de tokens depuis Figma.`,
    }],
    echecsDeTests,
  );
}

/**
 * Rend le verdict d'un repository sans aucun contrat : rien à contrôler, donc
 * aucun refus de fusion.
 *
 * Le projet traite déjà une implémentation absente comme un état d'avancement.
 * Un export absent reçoit ici le même traitement. Sans ce verdict, la CI
 * installée par `ucm init` refuse la fusion dès le premier push, avant que le
 * moindre export ait pu avoir lieu.
 *
 * Le rapport demande un geste, exporter, ce qui est la condition à laquelle un
 * message destiné au designer s'écrit.
 *
 * Le dossier cherché est nommé dans le rapport. Un `ucm.config.json` qui vise un
 * dossier inexistant produit le même relevé qu'un repository neuf, et aucune
 * mesure ne les sépare ; nommer l'endroit cherché laisse un développeur repérer
 * un chemin fautif sans que ce module ait à le supposer.
 *
 * Ce message s'adresse au designer qui vient d'installer UCM, et il lui demande
 * un export. Une demande de fusion qui ne touche rien d'UCM n'a pas ce
 * destinataire : elle reçoit le rapport sans objet. Sans cette borne, le seul
 * repository qui n'a rien exporté republiait sa procédure d'accueil sur chaque
 * demande, jusqu'à son premier composant.
 */
function demarrage({ dossierDeclare, dossierAbsent, sourceTokens, tokensAbsents, echecsDeTests, concerne, architecture }) {
  if (!concerne && !echecsDeTests.echoue) {
    return {
      bilans: [],
      fautifs: [],
      bloquant: false,
      rapport: finaliserRapport(RAPPORT_SANS_OBJET, { sansObjet: true }),
      terminal: [{
        flux: "log",
        texte: `${GLYPHES.tenu.brut} Aucun contrat dans ${dossierDeclare}, et cette demande de fusion n'en dépose aucun. Rien à contrôler.`,
      }],
    };
  }

  const lignes = echecsDeTests.echoue
    ? (echecsDeTests.bloquant === false ? [`## ${GLYPHES.tenu.forge} Aucun blocage détecté`, ""] : enteteDuVerdict([], false))
    : [
      `## ${GLYPHES.tenu.forge} Ce repository n'a pas encore reçu d'export`,
      "",
      `Aucun contrat n'a été trouvé dans \`${dossierDeclare}\`, il n'y a donc rien à contrôler. Un repository où UCM vient d'être installé se trouve dans cet état jusqu'à son premier export.`,
      "",
    ];

  const etat = [];
  if (tokensAbsents) etat.push(`\`${sourceTokens}\` n'a pas encore été exporté.`);
  if (dossierAbsent) {
    etat.push(`Le dossier \`${dossierDeclare}\`, déclaré par \`ucm.config.json\`, n'existe pas encore. Si des contrats devaient déjà s'y trouver, un développeur doit corriger ce chemin.`);
  }
  if (etat.length > 0) lignes.push(...etat, "");

  lignes.push(
    "#### Action",
    "",
    "Un designer ouvre le plugin dans Figma, lance **Exporter les tokens**, puis exporte un premier composant. Ce rapport contrôlera alors chaque contrat déposé.",
    "",
  );
  lignes.push(...diagnosticEchecsDeTests(echecsDeTests));
  lignes.push(...sectionArchitecture(architecture));

  const terminal = [{
    flux: "log",
    texte: `${GLYPHES.tenu.brut} Aucun contrat dans ${dossierDeclare} : ce repository n'a pas encore reçu d'export. Rien à contrôler.`,
  }];
  const resumeArchitecture = resumeTerminalArchitecture(architecture);
  if (resumeArchitecture) terminal.push({ flux: "log", texte: `\n${resumeArchitecture}` });

  return {
    bilans: [],
    fautifs: [],
    bloquant: echecsDeTests.echoue && echecsDeTests.bloquant !== false,
    rapport: finaliserRapport(lignes.join("\n")),
    terminal,
  };
}

/** Uniformise les chemins Git (`/`) et Node sous Windows (`\`), comme `perimetre-rapport.mjs`. */
const normaliserChemin = (chemin) => chemin.trim().replaceAll("\\", "/").replace(/^\.\/+/, "");

/** Les fichiers que la demande modifie ; vide sans liste (contrôle sans base). */
function fichiersModifies(cheminsModifies) {
  return new Set(
    (cheminsModifies ?? "").split(/\r?\n/).map(normaliserChemin).filter(Boolean),
  );
}

const enSlash = (chemin) => chemin.split(sep).join("/");

/** Le code d'un composant dont rien n'a été lu ; `lecture` dit pourquoi, `null` si rien ne manque. */
const codeVide = (lecture = null) => ({ fichiers: [], ecarts: [], nonAnalyses: 0, limites: [], lecture });

/** La ligne (à partir de 1) du caractère `decalage` dans `texte`. */
function ligneDuDecalage(texte, decalage) {
  let ligne = 1;
  for (let index = texte.indexOf("\n"); index !== -1 && index < decalage; index = texte.indexOf("\n", index + 1)) ligne += 1;
  return ligne;
}

/**
 * Le code d'un composant : ses fichiers, jugés par `preparerControleDepuis` avec
 * les données que `controlerRepository` a déjà lues.
 *
 * Rend `{ fichiers, ecarts, nonAnalyses, limites, lecture }`. `fichiers` est
 * relatif à la racine, avec `/`. `ecarts` garde les constats de niveau `ecart`
 * sous la forme de `ecartsIdentifiesDeParite` (`genre`, `coordonnees`,
 * `derogeable`, `niveau`, `texte`) avec `regle`, `fichier` et `ligne` ; ceux
 * qu'une dérogation couvre y restent, le verdict les répartit. `nonAnalyses`
 * compte les usages que le juge ne suit pas. `limites` garde les limites du
 * juge, et les constats `nom-css-ambigu`. `lecture` vaut `lecture-incomplete`
 * quand un fichier a une erreur de syntaxe, sinon `null`.
 */
function relireLeCodeDuComposant(id, implementation, { racine, configuration, documents, tokens, derogations, lecteur, cache, textes }) {
  const extensions = (lecteur.extensions ?? []).map((extension) => extension.toLowerCase());
  if (!extensions.includes(extname(implementation).toLowerCase())) return codeVide();

  let fichiers = [implementation];
  try {
    const rendu = lecteur.fichiersDuComposant(implementation)?.fichiers;
    if (Array.isArray(rendu) && rendu.length > 0) fichiers = rendu.map((chemin) => resolve(chemin));
  } catch {
    fichiers = [implementation];
  }

  const code = { ...codeVide(), fichiers: fichiers.map((fichier) => enSlash(relative(racine, fichier))) };
  const vues = new Set();
  for (const fichier of fichiers) {
    const rendu = preparerControleDepuis(fichier, { racine, configuration, documents, tokens, derogations, lecteur, cache });
    for (const limite of rendu.limites) {
      const cle = JSON.stringify([limite.code, limite.composant, limite.message]);
      if (limite.composant !== null && limite.composant !== id) continue;
      if (vues.has(cle)) continue;
      vues.add(cle);
      code.limites.push(limite);
      if (limite.code === "lecture-incomplete") code.lecture = "lecture-incomplete";
    }
    for (const constat of rendu.constats) {
      if (constat.composant !== id) continue;
      if (constat.niveau === "non-analyse") {
        code.nonAnalyses += 1;
      } else if (constat.niveau === "limite") {
        code.limites.push({ code: constat.code, composant: id, message: constat.message, faits: constat.faits, fichier: rendu.fichier });
      } else if (constat.niveau === "ecart") {
        if (!textes.has(fichier)) {
          let texte = "";
          try { texte = sansBom(readFileSync(fichier, "utf8")); } catch { /* le décalage retombe sur la ligne 1 */ }
          textes.set(fichier, texte);
        }
        code.ecarts.push({
          genre: constat.code,
          coordonnees: constat.coordonnees ?? {},
          derogeable: constat.coordonnees !== undefined,
          niveau: "ecart",
          texte: constat.message,
          regle: constat.regle,
          fichier: rendu.fichier,
          ligne: ligneDuDecalage(textes.get(fichier), constat.debut),
        });
      }
    }
  }
  return code;
}

/** Une valeur mesurée par l'appelant, `null` compris, ou le défaut quand il n'en donne pas. */
const valeurOu = (valeur, parDefaut) => (valeur === undefined ? parDefaut : valeur);

/**
 * Contrôle un repository et rend son verdict, sans rien écrire nulle part.
 *
 * `adaptateur` est la seule porte par laquelle une connaissance de stack entre
 * ici. Son défaut, `ADAPTATEUR_VIDE`, n'est pas un mode dégradé : c'est le
 * noyau seul, qui répond « où » et « est-elle là » sans jamais prétendre avoir
 * lu du code.
 *
 * Quand l'adaptateur porte `lecteurDuCode`, chaque bilan reçoit `code` : les
 * fichiers du composant, jugés par `preparerControleDepuis`, avec les contrats,
 * les tokens et les dérogations déjà lus (voir `relireLeCodeDuComposant`). Un
 * adaptateur attendu et présent sans `lecteurDuCode` laisse `code.lecture` à
 * `adaptateur-ancien`.
 *
 * Le verdict (`bloquant`) vient de `verdictDeLaDemande` (`verdict-bilan.mjs`) :
 * le dernier modifié répond. Trois options lui fournissent ce que la mesure de
 * Git donne à la CLI, et chacune a un défaut sûr quand l'appelant ne mesure rien :
 *
 * - `rangs` : `{ tokens, composants: { <id>: { contrat, code, depuis } } }`.
 *   Un rang vaut 0 pour un fichier que la demande modifie, puis croît vers le
 *   passé ; `depuis` est la date ISO du changement de contrat, pour l'âge d'un
 *   retard. Sans valeur, le rang vaut 0 pour un fichier que `cheminsModifies` ou
 *   `tokensModifies` désigne, et 1 pour tout autre : deux fichiers non touchés
 *   ont le même rang, donc aucun n'est en retard sur l'autre. `null` dit que
 *   l'historique ne sait pas, et ne produit aucun retard ;
 * - `adaptateurAttendu` : `"present"`, `"absent"`, `"casse"` ou
 *   `"sans-adaptateur"` (défaut : aucun adaptateur officiel ne lit cette
 *   technologie, un fichier non lu avertit sans bloquer) ;
 * - `historique` : `"complet"` (défaut), `"superficiel"` (le contrôle refuse
 *   de juger et rend `erreurDInvocation`) ou `"aucun"` (rangs ignorés).
 *
 * `maintenant` fixe la date de l'âge d'un retard (défaut : l'heure courante).
 * `.ucm/derogations.json` se lit à la racine, et un fichier absent n'est
 * aucune dérogation.
 */
export function controlerRepository(racine, {
  configuration = CONFIGURATION_PAR_DEFAUT,
  adaptateur = ADAPTATEUR_VIDE,
  echecsDeTests = { echoue: false, echecs: [] },
  cheminsModifies,
  tokensModifies = false,
  rangs = {},
  adaptateurAttendu = "sans-adaptateur",
  historique = "complet",
  maintenant = new Date(),
} = {}) {
  const sourceTokens = configuration.tokens;
  const motif = configuration.implementation;

  const demande = genreDeLaDemande(cheminsModifies, { cheminTokens: sourceTokens, tokensModifies });
  // Une copie sans historique complet n'est pas jugée : le contrôle le dit
  // avant de lire un seul contrat.
  const { erreurDInvocation } = verdictDeLaDemande({ demande, historique });
  if (erreurDInvocation) {
    return {
      ...abandon(
        "Le contrôle ne peut pas juger cette demande",
        erreurDInvocation.geste,
        [{ flux: "error", texte: `${GLYPHES.bloquant.brut} ${erreurDInvocation.geste}` }],
        echecsDeTests,
      ),
      erreurDInvocation,
    };
  }

  echecsDeTests = { ...echecsDeTests, bloquant: demande !== "tokens-seuls" };

  // Les contrats se cherchent avant que les tokens soient jugés, parce que leur
  // nombre décide de ce qu'un fichier de tokens absent signifie. Un contrat cite
  // des références qu'il faut résoudre ; sans contrat, aucune référence n'existe
  // et l'absence du fichier ne prive aucun contrôle de sa matière. L'ordre
  // inverse refusait la fusion avant d'avoir compté.
  //
  // Un dossier absent compte pour zéro contrat. Il manque tant que le premier
  // export n'a pas eu lieu, ce qui est le cas de tout repository neuf.
  const dossierContrats = join(racine, configuration.components);
  let contrats;
  let dossierAbsent = false;
  try {
    contrats = trouverContrats(dossierContrats);
  } catch (erreur) {
    // Seule l'absence vaut état d'avancement. Un ENOTDIR ou un EACCES signalent
    // une panne, et les avaler ici rendrait un verdict vert pour une panne.
    if (erreur?.code !== "ENOENT") throw erreur;
    contrats = [];
    dossierAbsent = true;
  }

  // Lire les tokens EUX-MÊMES, et non la sortie CSS qu'ils produisent. Le nom
  // d'un token est son chemin, écrit à l'identique dans le contrat et dans le
  // fichier DTCG : les comparer ne demande aucune traduction. Passer par une
  // feuille CSS en imposait une (`.` → `-`), et cette traduction divergeait.
  // Ce contrôle est le seul qui protège le design ; il ne dépend plus d'aucune
  // chaîne d'outillage entre les tokens et lui.
  const cheminTokens = join(racine, sourceTokens);
  let tokensDtcg;
  let tokensAbsents = false;
  try {
    tokensDtcg = lireJsonDuDepot(cheminTokens);
  } catch (erreur) {
    // Absent et illisible ne se corrigent pas du même geste : le premier accuse
    // la génération, le second le fichier. Les confondre enverrait le designer
    // réparer un JSON qui n'existe pas.
    //
    // Seule l'absence dépend du compte des contrats. Un fichier tronqué appelle
    // le même geste à tout moment, cesser de l'éditer à la main, y compris dans
    // un repository qui n'a encore rien exporté.
    const absent = erreur?.code === "ENOENT";
    if (!absent || contrats.length > 0) {
      return abandon(
        absent ? `\`${sourceTokens}\` est introuvable` : `\`${sourceTokens}\` est illisible`,
        absent
          ? `Le fichier de tokens est absent du repository : aucune référence n'a pu être vérifiée. Si les tokens n'ont jamais été exportés, lancez **Exporter les tokens** depuis Figma et faites fusionner la demande de fusion qu'il ouvre, puis relancez le contrôle de cette demande de fusion : aucun nouvel export du composant n'est nécessaire. Si les tokens ont déjà été fusionnés, signalez-le à un développeur.`
          : "Le fichier de tokens n'est pas du JSON valide : il a sans doute été tronqué ou modifié à la main. Relancez **Exporter les tokens** depuis Figma plutôt que de le corriger.",
        [{
          flux: "error",
          texte: absent
            ? `${GLYPHES.bloquant.brut} ${cheminTokens} introuvable. Fusionnez l'export des tokens, puis relancez ce contrôle.`
            : `${GLYPHES.bloquant.brut} ${cheminTokens} est illisible. Relancez l’export de tokens depuis Figma.`,
        }],
        echecsDeTests,
      );
    }
    tokensAbsents = true;
    tokensDtcg = {};
  }

  // La version du format se juge avant tout token, et avant de compter les
  // contrats : un fichier d'une version inconnue ne reçoit pas le bilan vert
  // d'un repository qui démarre. Un fichier absent n'a pas de marque, donc
  // passe pour la forme d'origine.
  const format = etatDuFormatDeTokens(tokensDtcg);
  if (format.etat === "future" || format.etat === "invalide") {
    return refusDuFormatDeTokens(format, tokensDtcg, { sourceTokens, cheminTokens, echecsDeTests });
  }

  // L'architecture est celle du fichier de tokens, pas d'un contrat : elle se dit
  // dans le rapport d'une demande qui touche les tokens, ou d'un contrôle sans
  // périmètre (`cheminsModifies` absent). Un fichier absent n'a rien à juger.
  const architecture = tokensAbsents || !(tokensModifies || cheminsModifies === undefined)
    ? null
    : constatsDeLArchitecture(tokensDtcg);

  if (contrats.length === 0) {
    return demarrage({
      architecture,
      dossierDeclare: configuration.components,
      dossierAbsent,
      sourceTokens,
      tokensAbsents,
      echecsDeTests,
      // Sans contrat sur le disque, aucun bilan ne peut entrer dans le
      // périmètre : seuls comptent ici les chemins que la demande touche.
      concerne: perimetreDeLaDemande([], cheminsModifies, { motif, tokensModifies }).concerne,
    });
  }

  const documents = contrats.flatMap((chemin) => {
    try {
      return [{ chemin, contrat: lireJsonDuDepot(chemin) }];
    } catch {
      return [];
    }
  });
  const erreursGraphe = validerGrapheDesContrats(documents);

  // L'API publique de tous les composants est relevée d'un coup, avant
  // l'analyse : l'adaptateur peut ainsi ne construire qu'un seul programme.
  // La lambda n'est pas décorative : `map` passe l'index en second argument, et
  // `cheminImplementation` accepte un motif à cette place. Le raccourci
  // `map(cheminImplementation)` ferait donc résoudre un motif valant `0`.
  const implementations = contrats.map((chemin) => cheminImplementation(chemin, motif));
  let apiPublique;
  try { apiPublique = adaptateur.lireApiPublique(implementations, racine); } catch {
    if (adaptateurAttendu !== "sans-adaptateur") adaptateurAttendu = "casse";
    adaptateur = ADAPTATEUR_VIDE;
    apiPublique = new Map();
  }

  const contexte = {
    racine, motif, apiPublique, adaptateur,
    tokensExistants: indexerTokensDtcg(tokensDtcg),
    tokensDtcg,
  };
  const bilans = contrats.map((chemin) =>
    analyser(chemin, contexte, erreursGraphe.get(chemin) ?? []),
  );

  // Le code se juge avec ce qui est déjà lu : contrats, tokens, dérogations. Les
  // dérogations passent sans leurs erreurs, que le verdict dit à part : le juge
  // et le verdict couvrent alors les mêmes écarts.
  const derogations = lireDerogationsDuDepot(racine);
  const lecteur = adaptateur.lecteurDuCode;
  const documentsDuCode = contrats.map((chemin) => ({ chemin, contrat: documents.find((document) => document.chemin === chemin)?.contrat ?? null }));
  const entreeDuJuge = {
    racine: resolve(racine),
    configuration,
    documents: documentsDuCode,
    tokens: { etat: etatDuFormatDeTokens(tokensDtcg), index: contexte.tokensExistants, noms: nomsCssDesTokens(contexte.tokensExistants) },
    derogations: { derogations: derogations.derogations, erreurs: [] },
    lecteur,
    cache: new Map(),
    textes: new Map(),
  };
  for (const [rang, bilan] of bilans.entries()) {
    const jugeable = bilan.pariteMesuree && !bilan.parite.implementationAbsente;
    if (!jugeable) {
      bilan.code = codeVide();
    } else if (!lecteur) {
      // Un adaptateur chargé sans `lecteurDuCode` est une version ancienne : le code n'est pas lu.
      bilan.code = codeVide(adaptateurAttendu === "present" ? "adaptateur-ancien" : null);
    } else {
      bilan.code = relireLeCodeDuComposant(identifiantDuContrat(contrats[rang]), resolve(racine, cheminImplementation(contrats[rang], motif)), entreeDuJuge);
    }
  }
  // La validation reste globale. Seuls les états informatifs sont limités à ce
  // que la demande touche, pour qu'un export ne parle pas d'un autre composant.
  const { bilans: bilansDuRapport, concerne: concerneUcm } = perimetreDeLaDemande(bilans, cheminsModifies, {
    motif, tokensModifies, cheminTokens: sourceTokens,
  });

  // `documents` ne garde que les contrats lisibles : on y retrouve l'export par
  // le chemin, jamais par l'index.
  const exports = new Map(documents.map(({ chemin, contrat }) => [chemin, contrat?.meta?.exportedAt ?? null]));
  const modifies = fichiersModifies(cheminsModifies);
  const rangDeLaDemande = (chemin) => (modifies.has(normaliserChemin(chemin)) ? 0 : 1);
  const composants = contrats.map((chemin, rang) => {
    const id = identifiantDuContrat(chemin);
    const mesure = rangs.composants?.[id] ?? {};
    const relatif = bilans[rang].relatif;
    return {
      id,
      bilan: bilans[rang],
      exportedAt: exports.get(chemin) ?? null,
      rangContrat: valeurOu(mesure.contrat, rangDeLaDemande(relatif)),
      rangCode: valeurOu(mesure.code, Math.min(
        rangDeLaDemande(cheminImplementation(relatif, motif)),
        ...bilans[rang].code.fichiers.map(rangDeLaDemande),
      )),
      depuis: mesure.depuis,
    };
  });
  const rangTokens = valeurOu(rangs.tokens, tokensModifies ? 0 : rangDeLaDemande(sourceTokens));

  const verdict = verdictDeLaDemande({
    demande,
    composants,
    rangTokens,
    // Un fichier de tokens illisible ou d'une version non lue a déjà refusé le
    // contrôle plus haut : aucun contrat n'a été analysé contre lui.
    tokensIllisibles: false,
    derogations,
    adaptateurAttendu,
    historique,
  });
  const entrees = verdict.composants.map((jugement, rang) => ({
    id: jugement.id,
    jugement,
    bilan: bilans[rang],
    rangContrat: composants[rang].rangContrat,
    depuis: composants[rang].depuis,
  }));
  // Un contrat invalide ne refuse que s'il est de ceux dont la demande répond.
  const fautifs = bilans.filter((bilan, rang) => bilanEstBloquant(bilan) && entrees[rang].jugement.bloquant);
  const bloquant = verdict.bloquant || (echecsDeTests.echoue && echecsDeTests.bloquant);
  // Le fichier des dérogations est un fichier de code : le modifier compte
  // comme toucher UCM, sans quoi un refus pour ses erreurs n'aurait pas de demande.
  const concerne = concerneUcm || modifies.has(CHEMIN_DES_DEROGATIONS);

  const rapport = rapportMarkdown(bilans, fautifs, bilansDuRapport, {
    echecsDeTests, tokensModifies, sourceTokens, concerne, architecture,
    verdict, entrees, bloquant, maintenant,
  });

  const terminal = [...terminalDesBilans(bilans, entrees), ...terminalDesFautifs(fautifs)];

  // Le code se rappelle à part, sous le verdict de la demande : un écart refuse
  // une demande de code et laisse passer celle du designer.
  terminal.push(...terminalDuVerdict(entrees, { verdict, bilansDuRapport }));

  // Les tests ont déjà affiché leur propre sortie ; ce rappel sert à ce que le
  // dernier mot du terminal dise la même chose que le rapport publié.
  for (const ligne of resumeTerminalEchecsDeTests(echecsDeTests)) {
    terminal.push({ flux: "error", texte: ligne });
  }

  // Le terminal dit la même chose que le rapport : un point non décrit ne refuse
  // pas la pull request, mais il ne doit pas non plus disparaître du fil.
  const resumeAvertissements = resumeTerminalAvertissements(bilansDuRapport);
  if (resumeAvertissements) terminal.push({ flux: "error", texte: `\n${resumeAvertissements}` });
  const { bloquants: tokensQuiBloquent, retards: tokensEnRetard } = repartitionDesTokens(entrees);
  const resumeTokensBloquants = resumeTerminalTokensManquants(tokensQuiBloquent, sourceTokens, { bloquant: true });
  if (resumeTokensBloquants) terminal.push({ flux: "error", texte: `\n${resumeTokensBloquants}` });
  const resumeTokensEnRetard = resumeTerminalTokensManquants(tokensEnRetard, sourceTokens);
  if (resumeTokensEnRetard) terminal.push({ flux: "warn", texte: `\n${resumeTokensEnRetard}` });
  // Comme dans le rapport : une demande de tokens rappelle les contrastes de tous les contrats, une autre ceux qu'elle touche.
  const resumeContrastes = resumeTerminalContrastes(tokensModifies ? bilans : bilansDuRapport);
  if (resumeContrastes) terminal.push({ flux: "log", texte: `\n${resumeContrastes}` });
  const resumeArchitecture = resumeTerminalArchitecture(architecture);
  if (resumeArchitecture) terminal.push({ flux: "log", texte: `\n${resumeArchitecture}` });

  // Le rapport porte le verdict complet : le verdict couvre donc ce que ce
  // module a relayé comme ce qu'il a constaté, sans quoi la chaîne pourrait
  // finir au vert avec un rapport rouge.
  if (!bloquant) {
    terminal.push({
      flux: "log",
      texte: `\n${GLYPHES.tenu.brut} ${bilans.every((bilan) => !bilanEstBloquant(bilan)) ? "Contrats valides." : "Aucun blocage pour cette demande."}`
        + " Les retards et les points à valider éventuels ont été signalés sans bloquer.",
    });
  }

  return { bilans, fautifs, rapport, terminal, bloquant, verdict, erreurDInvocation: null };
}
