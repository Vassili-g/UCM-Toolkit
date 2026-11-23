/**
 * Ce qui refuse une fusion, et le titre de ce refus.
 *
 * `verdictDeLaDemande` est l'autorité unique du verdict de `ucm check` : une
 * fonction pure qui rend l'état de chaque composant et `bloquant` pour le
 * repository. Elle applique la règle du dernier modifié, décidée dans
 * `docs/notes/Recherches/Linter Dev/DECISION-VERDICT-UCM-CHECK.md` (table V-01
 * à V-20, portée par `tests/verdict-demande.test.mjs`) :
 *
 * - une demande du designer (contrats et tokens seuls) n'est jamais refusée
 *   pour du code, et une demande de tokens seuls ne l'est que si `tokens.json`
 *   est illisible ;
 * - un écart de parité bloque une demande de code ou un contrôle sans base,
 *   sauf si le contrat est plus récent que le code (le composant est alors en
 *   retard) ou si une dérogation valide le couvre ;
 * - un contrat qui cite un token absent bloque seulement s'il n'est pas plus
 *   ancien que les tokens (sinon il est en retard sur les tokens) ;
 * - un code que personne ne lit alors qu'un adaptateur officiel est attendu
 *   bloque une demande de code, jamais une demande du designer ;
 * - les constats du code (`bilan.code.ecarts`, rendus par `controle-repository.mjs`
 *   d'après le juge du code) suivent la règle de la parité : ils bloquent une
 *   demande de code, sauf s'ils sont dérogés, en retard sur le contrat, ou en
 *   retard sur `tokens.json` quand il est plus récent que le code.
 *
 * Les rangs sont une entrée : 0 pour un fichier que la demande modifie ou
 * qu'on n'a pas enregistré, puis croissant vers le passé, `null` si
 * l'historique ne le dit pas. `bilanEstBloquant` garde la validité d'un contrat
 * seule. `TEXTES_DES_ETATS` porte la phrase du terminal et la raison de
 * l'inventaire pour chaque état.
 */
import { appliquerDerogations } from "./derogations.mjs";
import { ecartsIdentifiesDeParite } from "./diagnostic-parite.mjs";
import { TYPES_D_ALERTE } from "@ucm-kit/core/referentiel";

const GLYPHES = Object.fromEntries(TYPES_D_ALERTE.map(({ id, texte }) => [id, texte]));

function seuleLaVersionBloque(bilan) {
  return Boolean(bilan?.version)
    && !bilan.illisible
    && (bilan.champsAbsents?.length ?? 0) === 0
    && (bilan.graphe?.length ?? 0) === 0
    && (bilan.typesTypographiques?.length ?? 0) === 0;
}

/**
 * Forme l'en-tête d'un refus dû uniquement à la version. Un contrat récent
 * demande une mise à jour du repo ; un ancien demande un réexport. Si les deux
 * sens coexistent, aucun résumé unique n'est écrit et le détail fait foi.
 */
function phraseDuSensDeLEcart(bilans, pluriel) {
  const sujet = pluriel
    ? "Ces contrats sont bien formés. "
    : "Ce contrat est bien formé. ";
  const sens = new Set(bilans.map((bilan) => bilan.version?.verdict ?? "ancien"));

  if (sens.size > 1) {
    return sujet
      + "Ils ne viennent pas tous de la même version : le détail ci-dessous nomme "
      + "le geste attendu pour chacun.";
  }
  return sens.has("recent")
    ? sujet + "C'est le repository qui doit rattraper le format ; réexporter n'y changerait rien."
    : sujet
      + (pluriel
        ? "Ils viennent d'une version que ce repository ne lit plus : réexportez-les depuis Figma."
        : "Il vient d'une version que ce repository ne lit plus : réexportez-le depuis Figma.");
}

/**
 * Écrit l'en-tête du rapport rouge, et rien d'autre que ce qui est vrai.
 *
 * « N contrats invalides » accuse un fichier produit par l'export, donc le
 * designer qui l'a produit : ce titre ne s'écrit que si un contrat l'est
 * réellement, au sens de `bilanEstBloquant`, et il annonce alors le compte
 * exact plutôt qu'un « des contrats » suivi d'un « (1 contrat) » qui le
 * dément. Dès qu'aucun contrat n'est en
 * cause, le rapport bascule sur un titre qui nomme le repository, même quand
 * une pull request est refusée par ailleurs. Un rapport peut ainsi refuser une
 * fusion sans jamais désigner le mauvais coupable.
 *
 * `fautifs` accepte les bilans eux-mêmes, ce qui distingue un contrat cassé
 * d'un contrat que seule sa version rend illisible ici. Un nombre reste
 * accepté : un test qui ne s'intéresse qu'au compte n'a pas à monter un bilan
 * complet.
 */
export function enteteDuVerdict(fautifs, avecAvertissements = false) {
  const bilans = Array.isArray(fautifs) ? fautifs : [];
  const contratsFautifs = Array.isArray(fautifs) ? fautifs.length : fautifs;
  const versionsSeules = bilans.filter(seuleLaVersionBloque).length;

  if (contratsFautifs > 0 && versionsSeules === contratsFautifs) {
    const pluriel = versionsSeules === 1 ? "" : "s";
    return [
      `## ${GLYPHES.bloquant.forge} ${versionsSeules} contrat${pluriel} dans une version que ce repository ne lit pas`,
      "",
      // Le titre se borne à dire que la version n'est pas lue, ce qui est vrai
      // dans les deux sens de l'écart. La phrase qui suit désigne un
      // responsable, et elle se calcule.
      phraseDuSensDeLEcart(bilans.filter(seuleLaVersionBloque), pluriel === "s"),
      "",
    ];
  }
  if (contratsFautifs > 0) {
    const pluriel = contratsFautifs === 1 ? "" : "s";
    return [
      `## ${GLYPHES.bloquant.forge} ${contratsFautifs} contrat${pluriel} invalide${pluriel}`,
      "",
      "Les contrôles ont détecté des contrats inexploitables, incompatibles ou incohérents.",
      "",
    ];
  }
  return [
    `## ${GLYPHES.bloquant.forge} Les contrôles du repository bloquent la fusion`,
    "",
    avecAvertissements
      ? "Les contrats sont valides. Les avertissements d'export sont présentés séparément et ne bloquent pas à eux seuls."
      : "Les contrats sont valides. Les sections suivantes indiquent les contrôles en échec.",
    "",
  ];
}

/** Centralise les états d'un bilan qui refusent la fusion. */
export function bilanEstBloquant(bilan) {
  return bilan.illisible
    || bilan.champsAbsents.length > 0
    || Boolean(bilan.version)
    || bilan.graphe.length > 0
    || bilan.typesTypographiques.length > 0;
}

/**
 * Les états d'un composant, du plus grave au plus léger. `etat` en est le
 * premier ; `constats` les liste tous. Un état n'est pas un verdict : un
 * écart ou un contrat invalide ne bloque que si la demande le juge, ce que dit
 * `bloquant`.
 */
export const ETATS_DE_COMPOSANT = Object.freeze([
  "contrat-invalide",
  "tokens-absents",
  "ecart",
  "code-non-verifie",
  "en-retard-sur-son-contrat",
  "en-retard-sur-les-tokens",
  "deroge-a-valider",
  "pas-encore-d-implementation",
  "conforme",
]);

/**
 * Ce que chaque état dit, une seule fois : `phrase` finit la ligne d'un composant
 * dans le terminal, `raison` explique l'état à qui lit l'inventaire.
 */
export const TEXTES_DES_ETATS = Object.freeze({
  "contrat-invalide": Object.freeze({
    phrase: "contrat invalide",
    raison: "Le contrat est illisible, incomplet ou hors de la fenêtre de lecture, donc aucun outil ne peut le lire.",
  }),
  "tokens-absents": Object.freeze({
    phrase: "token absent de tokens.json",
    raison: "Le contrat cite un token que tokens.json ne porte pas, donc le composant afficherait une valeur vide.",
  }),
  ecart: Object.freeze({
    phrase: "code en écart",
    raison: "Le code s'écarte du contrat ou de tokens.json et il est plus récent qu'eux. Le développeur le corrige.",
  }),
  "code-non-verifie": Object.freeze({
    phrase: "code non vérifié",
    raison: "L'adaptateur attendu manque, est ancien, ne se charge pas ou ne lit pas le fichier, ou le fichier existe sous une autre casse que le motif. Rien n'est prouvé.",
  }),
  "en-retard-sur-son-contrat": Object.freeze({
    phrase: "code en retard sur son contrat",
    raison: "Le contrat a changé après le code. Le développeur le rattrape à sa prochaine demande sur ce composant.",
  }),
  "en-retard-sur-les-tokens": Object.freeze({
    phrase: "en retard sur les tokens",
    raison: "tokens.json a changé après le contrat ou le code. Le designer réexporte le contrat, ou le développeur met le code à jour.",
  }),
  "deroge-a-valider": Object.freeze({
    phrase: "code en écart, accepté par une dérogation",
    raison: "Une dérogation motivée couvre l'écart jusqu'au prochain export du contrat. Le designer relit son motif.",
  }),
  "pas-encore-d-implementation": Object.freeze({
    phrase: "pas encore d'implémentation",
    raison: "Le contrat est arrivé avant le code, état autorisé.",
  }),
  conforme: Object.freeze({
    phrase: "code conforme",
    raison: "Aucun écart, aucun retard, aucune dérogation.",
  }),
});

/** Pourquoi le code n'est pas lu, selon l'adaptateur que la CLI attendait. */
const LECTURE_SI_ATTENDU = { present: "fichier-non-lu", absent: "adaptateur-absent", casse: "adaptateur-casse" };

/** `a` est strictement plus récent que `b` : un rang plus petit, tous deux connus. */
const plusRecent = (a, b) => typeof a === "number" && typeof b === "number" && a < b;

/**
 * Pourquoi le code d'un composant n'a pas été comparé, ou `null` s'il l'a été.
 * Seule l'absence d'adaptateur pour la technologie est un trou de preuve qui
 * avertit ; les autres lectures ratées, dont le fichier sous une autre casse,
 * sont un constat que le développeur peut réparer.
 */
function lectureDeLaParite(parite, adaptateurAttendu) {
  // Un fichier sous une autre casse n'est lu par aucun adaptateur, quel qu'il
  // soit : la raison ne dépend pas de celui que la CLI attendait.
  if (parite?.implementationAutreCasse) return "autre-casse";
  if (!parite?.implementationNonLue) return null;
  return LECTURE_SI_ATTENDU[adaptateurAttendu] ?? "sans-adaptateur";
}

const AUCUN_BLOCAGE = Object.freeze({ contrat: false, tokens: false, parite: false, code: false });

/**
 * Juge un composant sous une demande.
 *
 * `jugeLeCode` : la demande répond du code (demande de code, contrôle sans
 * base). `jugeLeContrat(rang)` : elle répond de ce contrat.
 *
 * Les écarts de parité et ceux du code passent ensemble par
 * `appliquerDerogations`, donc une dérogation tombée ou sans objet se compte
 * une fois. Un écart du code est « en retard » quand le contrat, ou à défaut
 * `tokens.json`, est plus récent que le code ; la parité ne connaît que le
 * contrat.
 */
function verdictDuComposant(composant, { jugeLeCode, jugeLeContrat, rangTokens, adaptateurAttendu, derogations }) {
  const { id, bilan, exportedAt, rangContrat = null, rangCode = null } = composant;
  const rendu = {
    id,
    ecarts: [],
    ecartsEnRetardSurLesTokens: [],
    avertissements: [],
    derogations: { couvertes: [], tombees: [], sansObjet: [] },
    lecture: null,
    nonAnalyses: 0,
    bloquantPar: AUCUN_BLOCAGE,
  };

  if (bilanEstBloquant(bilan)) {
    const contrat = jugeLeContrat(rangContrat);
    return {
      ...rendu,
      etat: "contrat-invalide",
      constats: ["contrat-invalide"],
      bloquant: contrat,
      bloquantPar: { ...AUCUN_BLOCAGE, contrat },
    };
  }

  const manquants = (bilan.manquants?.length ?? 0) > 0;
  const manquantsEnRetard = manquants && plusRecent(rangTokens, rangContrat);
  const tokensAbsents = manquants && !manquantsEnRetard;

  const parite = bilan.parite;
  const code = bilan.code ?? null;
  const ecartsDuCode = code?.ecarts ?? [];
  const identifies = parite ? ecartsIdentifiesDeParite(parite) : [];
  const { couverts, restants, tombees, sansObjet } = appliquerDerogations(
    derogations.derogations,
    id,
    exportedAt,
    [...identifies.filter(({ niveau }) => niveau === "ecart"), ...ecartsDuCode],
  );

  // Le contrat plus récent que le code : l'écart est celui du designer, pas du développeur.
  const contratPlusRecent = plusRecent(rangContrat, rangCode);
  const restantsDuCode = restants.filter((ecart) => ecartsDuCode.includes(ecart));
  const restantsDeParite = restants.filter((ecart) => !ecartsDuCode.includes(ecart));
  const enRetardSurSonContrat = restants.length > 0 && contratPlusRecent;
  // Les tokens plus récents que le code : le code cite ce que tokens.json n'a plus.
  const ecartsEnRetardSurLesTokens = !contratPlusRecent && plusRecent(rangTokens, rangCode) ? restantsDuCode : [];
  const enRetardSurLesTokens = manquantsEnRetard || ecartsEnRetardSurLesTokens.length > 0;
  const ecartDeParite = restantsDeParite.length > 0 && !contratPlusRecent;
  const ecartDuCode = restantsDuCode.length > ecartsEnRetardSurLesTokens.length && !contratPlusRecent;

  const lectureDeParite = lectureDeLaParite(parite, adaptateurAttendu);
  const lectureDuCodeLu = code?.lecture ?? null;
  const lecture = lectureDeParite ?? lectureDuCodeLu;

  const presents = {
    "tokens-absents": tokensAbsents,
    ecart: ecartDeParite || ecartDuCode,
    "code-non-verifie": lecture !== null,
    "en-retard-sur-son-contrat": enRetardSurSonContrat,
    "en-retard-sur-les-tokens": enRetardSurLesTokens,
    "deroge-a-valider": restants.length === 0 && couverts.length > 0,
    "pas-encore-d-implementation": Boolean(parite?.implementationAbsente),
  };
  const constats = ETATS_DE_COMPOSANT.filter((etat) => presents[etat]);
  const bloquantPar = {
    contrat: false,
    tokens: tokensAbsents && jugeLeContrat(rangContrat),
    parite: jugeLeCode && (ecartDeParite || (lectureDeParite !== null && lectureDeParite !== "sans-adaptateur")),
    code: jugeLeCode && (ecartDuCode || lectureDuCodeLu !== null),
  };

  return {
    ...rendu,
    etat: constats[0] ?? "conforme",
    constats: constats.length > 0 ? constats : ["conforme"],
    bloquant: Object.values(bloquantPar).some(Boolean),
    bloquantPar,
    lecture,
    nonAnalyses: code?.nonAnalyses ?? 0,
    ecarts: restants,
    ecartsEnRetardSurLesTokens,
    avertissements: identifies.filter(({ niveau }) => niveau === "avertissement"),
    derogations: { couvertes: couverts, tombees, sansObjet },
  };
}

/**
 * Le verdict d'une demande : l'état de chaque composant et `bloquant`.
 *
 * Entrée :
 * - `demande` : `"tokens-seuls"`, `"contrats-et-tokens"`, `"code"` ou
 *   `"sans-base"`, tel que `genreDeLaDemande` le classe ;
 * - `composants` : `{ id, bilan, exportedAt, rangContrat, rangCode }` par
 *   contrat. `bilan` est celui de `controlerRepository`, `exportedAt` le
 *   `meta.exportedAt` du contrat. Un rang vaut 0 pour un fichier que la demande
 *   modifie ou non enregistré, croît vers le passé, et vaut `null` sans
 *   historique : aucun retard n'est alors constaté ;
 * - `rangTokens` : le rang de `tokens.json`, même échelle ;
 * - `tokensIllisibles` : `tokens.json` est illisible ou d'une version non lue ;
 * - `derogations` : le rendu de `lireDerogations` ;
 * - `adaptateurAttendu` : `"present"`, `"absent"`, `"casse"` ou
 *   `"sans-adaptateur"` (aucun adaptateur officiel ne lit cette technologie) ;
 * - `historique` : `"complet"`, `"superficiel"` ou `"aucun"` (pas de dépôt Git).
 *
 * Sortie : `{ demande, bloquant, composants, erreursDeDerogations,
 * bloquantParLesDerogations, tokensIllisibles, erreurDInvocation }`. Chaque
 * composant porte `id`, `etat`, `constats`, `bloquant`, `bloquantPar`
 * (`contrat`, `tokens`, `parite`, `code` : la cause de chaque blocage, dont
 * `bloquant` est la disjonction), `lecture`, `ecarts` (restants, parité et code,
 * hors dérogation), `ecartsEnRetardSurLesTokens` (ceux du code que `tokens.json`,
 * plus récent que le code, met en retard), `nonAnalyses` (le nombre d'usages que
 * le code calcule et que le juge ne suit pas), `avertissements` et
 * `derogations` (`couvertes`, `tombees`, `sansObjet`).
 * Une copie superficielle n'est pas jugée : `erreurDInvocation` porte le code 2
 * et le geste, et `bloquant` vaut `true`.
 *
 * Un contrat invalide ou qui cite un token absent bloque toute demande, sauf
 * une demande du designer : de tokens seuls, jamais ; de contrats, seulement
 * pour un contrat qu'elle modifie (rang 0).
 */
export function verdictDeLaDemande({
  demande,
  composants = [],
  rangTokens = null,
  tokensIllisibles = false,
  derogations = { derogations: [], erreurs: [] },
  adaptateurAttendu = "sans-adaptateur",
  historique = "complet",
}) {
  if (historique === "superficiel") {
    return {
      demande,
      bloquant: true,
      composants: [],
      erreursDeDerogations: [],
      bloquantParLesDerogations: false,
      tokensIllisibles: false,
      erreurDInvocation: {
        code: 2,
        geste: "Récupérez l'historique complet du dépôt (`git fetch --unshallow`) : sans lui, le contrôle ne peut pas dire quel fichier est le plus récent.",
      },
    };
  }

  // L'exception du designer tient en cette ligne : seules ces deux demandes
  // répondent du code.
  const jugeLeCode = demande === "code" || demande === "sans-base";
  const jugeLeContrat = (rangContrat) => jugeLeCode
    || (demande === "contrats-et-tokens" && rangContrat === 0);
  const sansHistorique = historique === "aucun";
  const contexte = {
    jugeLeCode,
    jugeLeContrat,
    rangTokens: sansHistorique ? null : rangTokens,
    adaptateurAttendu,
    derogations,
  };

  const jugees = composants.map((composant) => verdictDuComposant(
    sansHistorique ? { ...composant, rangContrat: null, rangCode: null } : composant,
    contexte,
  ));
  const erreursDeDerogations = derogations.erreurs ?? [];
  const bloquantParLesDerogations = jugeLeCode && erreursDeDerogations.length > 0;

  return {
    demande,
    bloquant: Boolean(tokensIllisibles)
      || bloquantParLesDerogations
      || jugees.some(({ bloquant }) => bloquant),
    composants: jugees,
    erreursDeDerogations,
    bloquantParLesDerogations,
    tokensIllisibles: Boolean(tokensIllisibles),
    erreurDInvocation: null,
  };
}
