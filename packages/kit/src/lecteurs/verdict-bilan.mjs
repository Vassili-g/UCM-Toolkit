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
 *   bloque une demande de code, jamais une demande du designer.
 *
 * Les rangs sont une entrée : 0 pour un fichier que la demande modifie ou
 * qu'on n'a pas enregistré, puis croissant vers le passé, `null` si
 * l'historique ne le dit pas. `bilanEstBloquant` garde la validité d'un contrat
 * seule ; le verdict du terminal ne change pas tant que
 * `controle-repository.mjs` n'appelle pas `verdictDeLaDemande`.
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

/** Pourquoi le code n'est pas lu, selon l'adaptateur que la CLI attendait. */
const LECTURE_SI_ATTENDU = { present: "fichier-non-lu", absent: "adaptateur-absent", casse: "adaptateur-casse" };

/** `a` est strictement plus récent que `b` : un rang plus petit, tous deux connus. */
const plusRecent = (a, b) => typeof a === "number" && typeof b === "number" && a < b;

/**
 * Pourquoi le code d'un composant n'a pas été comparé, ou `null` s'il l'a été.
 * Seule l'absence d'adaptateur pour la technologie est un trou de preuve qui
 * avertit ; les trois autres lectures ratées sont un constat que le
 * développeur peut réparer.
 */
function lectureDuCode(parite, adaptateurAttendu) {
  if (!parite?.implementationNonLue) return null;
  return LECTURE_SI_ATTENDU[adaptateurAttendu] ?? "sans-adaptateur";
}

/**
 * Juge un composant sous une demande.
 *
 * `jugeLeCode` : la demande répond du code (demande de code, contrôle sans
 * base). `jugeLeContrat(rang)` : elle répond de ce contrat.
 */
function verdictDuComposant(composant, { jugeLeCode, jugeLeContrat, rangTokens, adaptateurAttendu, derogations }) {
  const { id, bilan, exportedAt, rangContrat = null, rangCode = null } = composant;
  const rendu = {
    id,
    ecarts: [],
    avertissements: [],
    derogations: { couvertes: [], tombees: [], sansObjet: [] },
    lecture: null,
  };

  if (bilanEstBloquant(bilan)) {
    return { ...rendu, etat: "contrat-invalide", constats: ["contrat-invalide"], bloquant: jugeLeContrat(rangContrat) };
  }

  const manquants = (bilan.manquants?.length ?? 0) > 0;
  const enRetardSurLesTokens = manquants && plusRecent(rangTokens, rangContrat);
  const tokensAbsents = manquants && !enRetardSurLesTokens;

  const parite = bilan.parite;
  const identifies = parite ? ecartsIdentifiesDeParite(parite) : [];
  const { couverts, restants, tombees, sansObjet } = appliquerDerogations(
    derogations.derogations,
    id,
    exportedAt,
    identifies.filter(({ niveau }) => niveau === "ecart"),
  );
  // Le contrat plus récent que le code : l'écart est celui du designer, pas du développeur.
  const enRetardSurSonContrat = restants.length > 0 && plusRecent(rangContrat, rangCode);
  const ecart = restants.length > 0 && !enRetardSurSonContrat;
  const lecture = lectureDuCode(parite, adaptateurAttendu);

  const presents = {
    "tokens-absents": tokensAbsents,
    ecart,
    "code-non-verifie": lecture !== null,
    "en-retard-sur-son-contrat": enRetardSurSonContrat,
    "en-retard-sur-les-tokens": enRetardSurLesTokens,
    "deroge-a-valider": restants.length === 0 && couverts.length > 0,
    "pas-encore-d-implementation": Boolean(parite?.implementationAbsente),
  };
  const constats = ETATS_DE_COMPOSANT.filter((etat) => presents[etat]);

  return {
    ...rendu,
    etat: constats[0] ?? "conforme",
    constats: constats.length > 0 ? constats : ["conforme"],
    bloquant: (tokensAbsents && jugeLeContrat(rangContrat))
      || (jugeLeCode && (ecart || (lecture !== null && lecture !== "sans-adaptateur"))),
    lecture,
    ecarts: restants,
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
 * tokensIllisibles, erreurDInvocation }`. Chaque composant porte `id`, `etat`,
 * `constats`, `bloquant`, `lecture`, `ecarts` (restants, hors dérogation),
 * `avertissements` et `derogations` (`couvertes`, `tombees`, `sansObjet`).
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

  return {
    demande,
    bloquant: Boolean(tokensIllisibles)
      || (jugeLeCode && erreursDeDerogations.length > 0)
      || jugees.some(({ bloquant }) => bloquant),
    composants: jugees,
    erreursDeDerogations,
    tokensIllisibles: Boolean(tokensIllisibles),
    erreurDInvocation: null,
  };
}
