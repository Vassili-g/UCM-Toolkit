/**
 * La table de décision du verdict de `ucm check`, une ligne par test.
 *
 * Chaque test porte l'identifiant V-01 à V-20 de la table de
 * `docs/notes/Recherches/Linter Dev/DECISION-VERDICT-UCM-CHECK.md` (partie 1).
 * Un agent qui change une ligne du verdict fait échouer le test qui porte son
 * identifiant. Les tests appellent `verdictDeLaDemande` seule, sans disque ni
 * Git : les rangs, les dérogations et l'adaptateur attendu sont des entrées.
 *
 * Échelle des rangs : 0 pour un fichier que la demande modifie (ou non
 * enregistré), puis croissant vers le passé. Le contrat est « en retard »
 * quand son rang est strictement plus petit que celui du code.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { lireDerogations } from "../src/lecteurs/derogations.mjs";
import { verdictDeLaDemande } from "../src/lecteurs/verdict-bilan.mjs";

const EXPORT = "2026-11-01T10:00:00.000Z";

function pariteVide(surcharge = {}) {
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
    ...surcharge,
  };
}

/** Un bilan de contrat valide, sans écart ; `surcharge` en change des champs. */
function bilan({ parite, ...surcharge } = {}) {
  return {
    illisible: false,
    champsAbsents: [],
    version: null,
    graphe: [],
    manquants: [],
    typesTypographiques: [],
    parite: pariteVide(parite),
    ...surcharge,
  };
}

const VARIANTE_DANGER = { parite: { valeursNonImplementees: [{ prop: "variant", valeurs: ["danger"] }] } };

function composant(id, { rangContrat, rangCode, exportedAt = EXPORT, ...surcharge } = {}) {
  return { id, bilan: bilan(surcharge), exportedAt, rangContrat, rangCode };
}

const derogation = (surcharge = {}) => ({
  composant: "Button",
  ecart: { genre: "valeur-non-implementee", prop: "variant", valeur: "danger" },
  export: EXPORT,
  motif: "La variante danger attend la validation du texte d'erreur par le produit.",
  par: "Camille",
  ...surcharge,
});

const avec = (...entrees) => ({ derogations: entrees, erreurs: [] });

/** L'état du composant `Button` dans un verdict. */
const etatDeButton = (verdict) => verdict.composants.find(({ id }) => id === "Button");

test("V-01 : des valeurs de tokens changées seules passent", () => {
  const verdict = verdictDeLaDemande({
    demande: "tokens-seuls",
    composants: [composant("Button", { rangContrat: 3, rangCode: 5 })],
    rangTokens: 0,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "conforme");
});

test("V-02 : retirer un token qu'un contrat cite passe, le contrat est en retard sur les tokens", () => {
  const verdict = verdictDeLaDemande({
    demande: "tokens-seuls",
    composants: [composant("Button", { rangContrat: 3, rangCode: 5, manquants: ["{color.ancien}"] })],
    rangTokens: 0,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "en-retard-sur-les-tokens");
  assert.equal(etatDeButton(verdict).bloquant, false);
});

test("V-03 : des tokens illisibles ou d'une version non lue bloquent, quelle que soit la demande", () => {
  for (const demande of ["tokens-seuls", "contrats-et-tokens"]) {
    const verdict = verdictDeLaDemande({
      demande,
      composants: [composant("Button", { rangContrat: 3, rangCode: 5 })],
      rangTokens: 0,
      tokensIllisibles: true,
    });

    assert.equal(verdict.bloquant, true, demande);
    assert.equal(verdict.tokensIllisibles, true);
  }
});

test("V-04 : une demande de tokens seuls passe malgré un écart du code déjà présent", () => {
  // Le code est plus récent que le contrat : l'écart n'est pas un retard.
  const entree = {
    composants: [composant("Button", { rangContrat: 3, rangCode: 1, ...VARIANTE_DANGER })],
    rangTokens: 0,
  };
  const verdict = verdictDeLaDemande({ demande: "tokens-seuls", ...entree });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "ecart", "l'écart reste dit, adressé à un développeur");
  assert.equal(etatDeButton(verdict).bloquant, false);
  assert.equal(
    verdictDeLaDemande({ demande: "code", ...entree }).bloquant,
    true,
    "le même état bloque une demande de code",
  );
});

test("V-05 : un contrat qui ajoute une variante absente du code passe, le composant est en retard sur son contrat", () => {
  const demande = verdictDeLaDemande({
    demande: "contrats-et-tokens",
    composants: [composant("Button", { rangContrat: 0, rangCode: 5, ...VARIANTE_DANGER })],
    rangTokens: 4,
  });
  assert.equal(demande.bloquant, false);
  assert.equal(etatDeButton(demande).etat, "en-retard-sur-son-contrat");

  // Après la fusion, l'envoi sur main n'a pas de base : le rang suffit à le laisser vert.
  const envoi = verdictDeLaDemande({
    demande: "sans-base",
    composants: [composant("Button", { rangContrat: 1, rangCode: 5, ...VARIANTE_DANGER })],
    rangTokens: 4,
  });
  assert.equal(envoi.bloquant, false);
  assert.equal(etatDeButton(envoi).etat, "en-retard-sur-son-contrat");
});

test("V-06 : un contrat sans code passe, pas encore d'implémentation", () => {
  const verdict = verdictDeLaDemande({
    demande: "contrats-et-tokens",
    composants: [composant("Button", { rangContrat: 0, rangCode: null, parite: { implementationAbsente: true } })],
    rangTokens: 4,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "pas-encore-d-implementation");
});

test("V-07 : un contrat qui cite un token absent de tokens.json bloque", () => {
  const verdict = verdictDeLaDemande({
    demande: "contrats-et-tokens",
    composants: [composant("Button", { rangContrat: 0, rangCode: 5, manquants: ["{color.inconnu}"] })],
    rangTokens: 4,
  });

  assert.equal(verdict.bloquant, true);
  assert.equal(etatDeButton(verdict).etat, "tokens-absents");
});

test("V-08 : un contrat illisible, incomplet ou d'une version non lue bloque", () => {
  for (const defaut of [
    { illisible: true },
    { champsAbsents: ["props"] },
    { version: { valeur: "99.0", verdict: "recent" } },
  ]) {
    const verdict = verdictDeLaDemande({
      demande: "contrats-et-tokens",
      composants: [composant("Button", { rangContrat: 0, rangCode: 5, ...defaut })],
      rangTokens: 4,
    });

    assert.equal(verdict.bloquant, true, JSON.stringify(defaut));
    assert.equal(etatDeButton(verdict).etat, "contrat-invalide");
  }

  const autreContrat = verdictDeLaDemande({
    demande: "contrats-et-tokens",
    composants: [composant("Button", { rangContrat: 3, rangCode: 5, illisible: true })],
    rangTokens: 4,
  });
  assert.equal(autreContrat.bloquant, false, "la demande ne répond que des contrats qu'elle modifie");
});

test("V-09 : le contrat d'un composant dérogé passe, la dérogation tombe avec son motif et son auteur", () => {
  const verdict = verdictDeLaDemande({
    demande: "contrats-et-tokens",
    composants: [composant("Button", {
      rangContrat: 0,
      rangCode: 4,
      exportedAt: "2026-11-19T09:00:00.000Z",
      ...VARIANTE_DANGER,
    })],
    rangTokens: 4,
    derogations: avec(derogation()),
  });
  const { derogations, etat } = etatDeButton(verdict);

  assert.equal(verdict.bloquant, false);
  assert.equal(etat, "en-retard-sur-son-contrat", "sans la dérogation, l'écart est un retard");
  assert.equal(derogations.couvertes.length, 0);
  assert.deepEqual(derogations.tombees.map(({ motif, par }) => ({ motif, par })), [
    { motif: derogation().motif, par: "Camille" },
  ]);
});

test("V-10 : modifier le code en laissant un écart bloque, même si la demande change aussi le contrat", () => {
  for (const rangContrat of [0, 3]) {
    const verdict = verdictDeLaDemande({
      demande: "code",
      composants: [composant("Button", { rangContrat, rangCode: 0, ...VARIANTE_DANGER })],
      rangTokens: 4,
    });

    assert.equal(verdict.bloquant, true, `contrat au rang ${rangContrat}`);
    assert.equal(etatDeButton(verdict).etat, "ecart");
    assert.equal(etatDeButton(verdict).ecarts[0].genre, "valeur-non-implementee");
  }
});

test("V-11 : modifier le code d'un composant en retard sans rattraper le contrat bloque", () => {
  // Le contrat date de deux commits, le code de cette demande : le code est le plus récent.
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 2, rangCode: 0, ...VARIANTE_DANGER })],
    rangTokens: 4,
  });

  assert.equal(verdict.bloquant, true);
  assert.equal(etatDeButton(verdict).etat, "ecart");
});

test("V-12 : du code partagé qui crée un écart sur un composant dont le fichier n'a pas changé bloque", () => {
  // Button.tsx garde son rang d'avant la demande ; il reste plus récent que son contrat.
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [
      composant("Button", { rangContrat: 7, rangCode: 4, ...VARIANTE_DANGER }),
      composant("Alert", { rangContrat: 6, rangCode: 0 }),
    ],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, true);
  assert.equal(etatDeButton(verdict).etat, "ecart");
  assert.equal(etatDeButton(verdict).bloquant, true);
});

test("V-13 : du code sans lien avec un composant en retard passe, le retard est listé", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [
      composant("Button", { rangContrat: 1, rangCode: 4, ...VARIANTE_DANGER }),
      composant("Alert", { rangContrat: 6, rangCode: 0 }),
    ],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "en-retard-sur-son-contrat");
  assert.equal(verdict.composants.find(({ id }) => id === "Alert").etat, "conforme");
});

test("V-14 : du code dont l'écart a une dérogation valide passe, à valider par le designer", () => {
  const entree = {
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, ...VARIANTE_DANGER })],
    rangTokens: 9,
  };
  const verdict = verdictDeLaDemande({ ...entree, derogations: avec(derogation()) });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "deroge-a-valider");
  assert.equal(etatDeButton(verdict).derogations.couvertes[0].derogation.par, "Camille");

  const autreValeur = verdictDeLaDemande({
    ...entree,
    derogations: avec(derogation({ ecart: { genre: "valeur-non-implementee", prop: "variant", valeur: "autre" } })),
  });
  assert.equal(autreValeur.bloquant, true, "une dérogation ne couvre aucune autre valeur");
});

test("V-15 : une dérogation sans motif, mal formée ou non dérogeable bloque", () => {
  const entree = {
    composants: [composant("Button", { rangContrat: 3, rangCode: 5 })],
    rangTokens: 9,
  };
  for (const entreeFautive of [
    derogation({ motif: "" }),
    derogation({ par: " " }),
    derogation({ ecart: { genre: "interface-absente" } }),
    { composant: "Button" },
  ]) {
    const derogations = lireDerogations(JSON.stringify({ derogations: [entreeFautive] }));
    assert.ok(derogations.erreurs.length > 0);

    const verdict = verdictDeLaDemande({ demande: "code", ...entree, derogations });
    assert.equal(verdict.bloquant, true, JSON.stringify(entreeFautive));
    assert.deepEqual(verdict.erreursDeDerogations, derogations.erreurs);

    assert.equal(
      verdictDeLaDemande({ demande: "contrats-et-tokens", ...entree, derogations }).bloquant,
      false,
      "une demande du designer ne répond pas du fichier des dérogations",
    );
  }
});

test("V-16 : du code TypeScript sans adaptateur chargé, ou que l'adaptateur ne lit pas, bloque une demande de code", () => {
  const nonLu = { rangContrat: 3, rangCode: 0, parite: { implementationNonLue: "Button.tsx" } };
  for (const [adaptateurAttendu, lecture] of [
    ["absent", "adaptateur-absent"],
    ["casse", "adaptateur-casse"],
    ["present", "fichier-non-lu"],
  ]) {
    const verdict = verdictDeLaDemande({
      demande: "code",
      composants: [composant("Button", nonLu)],
      rangTokens: 9,
      adaptateurAttendu,
    });

    assert.equal(verdict.bloquant, true, adaptateurAttendu);
    assert.equal(etatDeButton(verdict).etat, "code-non-verifie");
    assert.equal(etatDeButton(verdict).lecture, lecture);

    assert.equal(
      verdictDeLaDemande({
        demande: "contrats-et-tokens",
        composants: [composant("Button", { ...nonLu, rangContrat: 0, rangCode: 3 })],
        rangTokens: 9,
        adaptateurAttendu,
      }).bloquant,
      false,
      `${adaptateurAttendu} : une demande du designer passe malgré la panne`,
    );
  }
});

test("V-17 : le code d'une technologie qu'aucun adaptateur ne lit passe, code présent non vérifié", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, parite: { implementationNonLue: "index.vue" } })],
    rangTokens: 9,
    adaptateurAttendu: "sans-adaptateur",
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "code-non-verifie");
  assert.equal(etatDeButton(verdict).lecture, "sans-adaptateur");
});

test("V-18 : un envoi direct sur main juge l'état de main", () => {
  const sansBase = (composants, surcharge = {}) => verdictDeLaDemande({
    demande: "sans-base",
    composants,
    rangTokens: 5,
    ...surcharge,
  });

  assert.equal(
    sansBase([composant("Button", { rangContrat: 4, rangCode: 2, ...VARIANTE_DANGER })]).bloquant,
    true,
    "un écart ni en retard ni dérogé bloque",
  );
  assert.equal(
    sansBase([composant("Button", { rangContrat: 4, rangCode: 2, ...VARIANTE_DANGER })], {
      derogations: avec(derogation()),
    }).bloquant,
    false,
    "dérogé",
  );
  assert.equal(
    sansBase([composant("Button", { rangContrat: 1, rangCode: 2, ...VARIANTE_DANGER })]).bloquant,
    false,
    "en retard",
  );
  assert.equal(
    sansBase([composant("Button", { rangContrat: 4, rangCode: 2, illisible: true })]).bloquant,
    true,
    "un contrat invalide bloque",
  );
  assert.equal(
    sansBase([composant("Button", { rangContrat: 2, rangCode: 4, manquants: ["{color.inconnu}"] })]).bloquant,
    true,
    "un contrat plus récent que les tokens et qui cite un token absent bloque",
  );
  assert.equal(
    sansBase([composant("Button", { rangContrat: 8, rangCode: 9, manquants: ["{color.inconnu}"] })]).bloquant,
    false,
    "un contrat plus ancien que les tokens est en retard sur eux",
  );
});

test("V-19 : une copie sans historique complet n'est pas jugée, erreur d'invocation", () => {
  const verdict = verdictDeLaDemande({
    demande: "sans-base",
    composants: [composant("Button", { rangContrat: 1, rangCode: 2 })],
    historique: "superficiel",
  });

  assert.equal(verdict.erreurDInvocation.code, 2);
  assert.match(verdict.erreurDInvocation.geste, /historique complet/);
  assert.deepEqual(verdict.composants, []);
  assert.equal(verdict.bloquant, true);
});

test("V-20 : en local, les fichiers non enregistrés comptent comme les plus récents", () => {
  // Code modifié, non enregistré (rang 0) : il est plus récent que le contrat.
  const codeModifie = verdictDeLaDemande({
    demande: "sans-base",
    composants: [composant("Button", { rangContrat: 4, rangCode: 0, ...VARIANTE_DANGER })],
    rangTokens: 9,
  });
  assert.equal(codeModifie.bloquant, true);

  // Contrat modifié, non enregistré : le code est en retard.
  const contratModifie = verdictDeLaDemande({
    demande: "sans-base",
    composants: [composant("Button", { rangContrat: 0, rangCode: 6, ...VARIANTE_DANGER })],
    rangTokens: 9,
  });
  assert.equal(contratModifie.bloquant, false);
  assert.equal(etatDeButton(contratModifie).etat, "en-retard-sur-son-contrat");
});

test("sans dépôt Git, aucun composant n'est en retard", () => {
  const verdict = verdictDeLaDemande({
    demande: "sans-base",
    composants: [composant("Button", { rangContrat: 0, rangCode: 6, ...VARIANTE_DANGER })],
    historique: "aucun",
  });

  assert.equal(etatDeButton(verdict).etat, "ecart");
  assert.equal(verdict.bloquant, true);
});

/**
 * Les constats du code, V-21 à V-32 de
 * `docs/notes/Recherches/Linter Dev/PLAN-IMPLEMENTATION-P6-KIT.md`. Le bilan porte
 * `code`, que `controlerRepository` remplit d'après le juge du code ; le verdict
 * le traite comme la parité.
 */
const FICHIER = "src/components/Button/Button.variants.ts";

/** Un écart du code, de la forme que `bilan.code.ecarts` donne. */
function ecartDuCode(genre = "valeur-en-dur", coordonnees = { fichier: FICHIER, valeur: "#ff0000" }) {
  return {
    genre,
    coordonnees,
    derogeable: genre !== "desactivation-interdite",
    niveau: "ecart",
    texte: `Constat ${genre}.`,
    regle: genre === "token-inconnu" ? "token-inconnu" : "valeur-en-dur",
    fichier: FICHIER,
    ligne: 12,
  };
}

/** Le code d'un composant : ses écarts, et ce que `surcharge` change. */
const codeAvec = (ecarts = [], surcharge = {}) => ({
  fichiers: [FICHIER],
  ecarts,
  nonAnalyses: 0,
  limites: [],
  lecture: null,
  ...surcharge,
});

const derogationDuCode = (surcharge = {}) => derogation({
  ecart: { genre: "valeur-en-dur", fichier: FICHIER, valeur: "#ff0000" },
  motif: "Le rouge du prototype attend le token du designer.",
  ...surcharge,
});

test("V-21 : une valeur en dur dans un fichier modifié du composant bloque, le contrat étant plus ancien", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([ecartDuCode()]) })],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, true);
  assert.equal(etatDeButton(verdict).etat, "ecart");
  assert.deepEqual(etatDeButton(verdict).bloquantPar, { contrat: false, tokens: false, parite: false, code: true });
  assert.equal(etatDeButton(verdict).ecarts[0].genre, "valeur-en-dur");
});

test("V-22 : un contrat réexporté après le code met le composant en retard sur son contrat", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 1, rangCode: 4, code: codeAvec([ecartDuCode()]) })],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "en-retard-sur-son-contrat");
  assert.equal(etatDeButton(verdict).bloquantPar.code, false);
});

test("V-23 : un tokens.json plus récent que le code met le composant en retard sur les tokens", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", {
      rangContrat: 6,
      rangCode: 4,
      code: codeAvec([ecartDuCode("token-inconnu", { fichier: FICHIER, reference: "{couleurs.ancien}" })]),
    })],
    rangTokens: 2,
  });
  const jugement = etatDeButton(verdict);

  assert.equal(verdict.bloquant, false);
  assert.equal(jugement.etat, "en-retard-sur-les-tokens");
  assert.equal(jugement.ecartsEnRetardSurLesTokens.length, 1, "le rapport lit ces écarts pour la section du retard du code");
  assert.equal(jugement.constats.includes("ecart"), false);
});

test("V-23 : des tokens plus anciens que le code n'excusent aucun constat", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", {
      rangContrat: 6,
      rangCode: 4,
      code: codeAvec([ecartDuCode("token-inconnu", { fichier: FICHIER, reference: "{couleurs.ancien}" })]),
    })],
    rangTokens: 5,
  });

  assert.equal(etatDeButton(verdict).etat, "ecart");
  assert.equal(verdict.bloquant, true);
});

test("V-24 : une demande de contrats et de tokens passe malgré des constats du code", () => {
  for (const rangContrat of [0, 3]) {
    const verdict = verdictDeLaDemande({
      demande: "contrats-et-tokens",
      composants: [composant("Button", { rangContrat, rangCode: 1, code: codeAvec([ecartDuCode()]) })],
      rangTokens: 0,
    });

    assert.equal(verdict.bloquant, false, `contrat au rang ${rangContrat}`);
  }
});

test("V-25 : une demande de tokens seuls passe, et les constats du code restent visibles", () => {
  const verdict = verdictDeLaDemande({
    demande: "tokens-seuls",
    composants: [composant("Button", { rangContrat: 3, rangCode: 1, code: codeAvec([ecartDuCode()]) })],
    rangTokens: 0,
  });

  assert.equal(verdict.bloquant, false);
  // Les tokens de la demande sont plus récents que le code : le constat est un retard, dit au développeur.
  assert.equal(etatDeButton(verdict).etat, "en-retard-sur-les-tokens");
  assert.equal(etatDeButton(verdict).ecarts.length, 1);
  assert.equal(
    verdictDeLaDemande({
      demande: "tokens-seuls",
      composants: [composant("Button", { rangContrat: 3, rangCode: 1, code: codeAvec([ecartDuCode()]) })],
      rangTokens: 2,
    }).composants[0].etat,
    "ecart",
    "des tokens plus anciens que le code laissent le constat entier, sans bloquer",
  );
});

test("V-26 : un constat du code dérogé pour l'export courant passe, à valider par le designer", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([ecartDuCode()]) })],
    rangTokens: 9,
    derogations: avec(derogationDuCode()),
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "deroge-a-valider");
  assert.equal(etatDeButton(verdict).derogations.couvertes[0].ecart.fichier, FICHIER);
});

test("V-27 : une dérogation du code à l'export ancien ne couvre plus rien, le constat bloque", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([ecartDuCode()]) })],
    rangTokens: 9,
    derogations: avec(derogationDuCode({ export: "2025-06-01T00:00:00.000Z" })),
  });
  const { derogations, etat } = etatDeButton(verdict);

  assert.equal(verdict.bloquant, true);
  assert.equal(etat, "ecart");
  assert.equal(derogations.tombees.length, 1);
  assert.equal(derogations.couvertes.length, 0);
});

test("V-28 : un adaptateur sans lecteur du code laisse le code non vérifié, et ne bloque que le code", () => {
  const ancien = { rangContrat: 3, rangCode: 0, code: codeAvec([], { fichiers: [], lecture: "adaptateur-ancien" }) };
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", ancien)],
    rangTokens: 9,
    adaptateurAttendu: "present",
  });

  assert.equal(verdict.bloquant, true);
  assert.equal(etatDeButton(verdict).etat, "code-non-verifie");
  assert.equal(etatDeButton(verdict).lecture, "adaptateur-ancien");
  assert.equal(etatDeButton(verdict).bloquantPar.code, true);

  assert.equal(
    verdictDeLaDemande({
      demande: "contrats-et-tokens",
      composants: [composant("Button", { ...ancien, rangContrat: 0, rangCode: 3 })],
      rangTokens: 9,
      adaptateurAttendu: "present",
    }).bloquant,
    false,
    "une demande du designer passe malgré l'adaptateur ancien",
  );
});

test("V-29 : un fichier du composant à erreur de syntaxe laisse le code non vérifié et bloque une demande de code", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([], { lecture: "lecture-incomplete" }) })],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, true);
  assert.equal(etatDeButton(verdict).etat, "code-non-verifie");
  assert.equal(etatDeButton(verdict).lecture, "lecture-incomplete");
});

test("V-30 : des usages non analysés seuls laissent le composant conforme, et le verdict en donne le nombre", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([], { nonAnalyses: 4 }) })],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).etat, "conforme");
  assert.equal(etatDeButton(verdict).nonAnalyses, 4);
});

test("V-31 : un commentaire qui désactive une règle UCM bloque, et aucune dérogation ne le couvre", () => {
  const entree = {
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([ecartDuCode("desactivation-interdite", {})]) })],
    rangTokens: 9,
  };

  assert.equal(verdictDeLaDemande(entree).bloquant, true);
  assert.equal(etatDeButton(verdictDeLaDemande(entree)).etat, "ecart");

  // Le fichier des dérogations refuse l'entrée : le verdict ne la couvre pas.
  const lues = lireDerogations(JSON.stringify({ derogations: [derogation({ ecart: { genre: "desactivation-interdite" } })] }));
  assert.ok(lues.erreurs.length > 0);
  assert.equal(verdictDeLaDemande({ ...entree, derogations: lues }).bloquant, true);
});

test("V-32 : une dérogation de parité et une du code sans objet se comptent une fois chacune", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([]) })],
    rangTokens: 9,
    derogations: avec(derogation(), derogationDuCode()),
  });
  const { derogations } = etatDeButton(verdict);

  assert.equal(derogations.sansObjet.length, 2);
  assert.deepEqual(derogations.sansObjet.map(({ ecart }) => ecart.genre).sort(), ["valeur-en-dur", "valeur-non-implementee"]);
  assert.equal(verdict.bloquant, false);
});

test("un écart de parité et un écart du code se dérogent par la même liste, sans se confondre", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([ecartDuCode()]), ...VARIANTE_DANGER })],
    rangTokens: 9,
    derogations: avec(derogation()),
  });
  const { bloquantPar, derogations, ecarts } = etatDeButton(verdict);

  assert.equal(derogations.couvertes.length, 1, "la variante est couverte");
  assert.equal(ecarts.length, 1, "la valeur en dur reste");
  assert.deepEqual([bloquantPar.parite, bloquantPar.code], [false, true]);
});

test("bloquantPar nomme la cause de chaque blocage, et bloquant en est la disjonction", () => {
  const cas = {
    contrat: composant("Button", { rangContrat: 0, rangCode: 5, illisible: true }),
    tokens: composant("Button", { rangContrat: 0, rangCode: 5, manquants: ["{color.inconnu}"] }),
    parite: composant("Button", { rangContrat: 3, rangCode: 0, ...VARIANTE_DANGER }),
    code: composant("Button", { rangContrat: 3, rangCode: 0, code: codeAvec([ecartDuCode()]) }),
  };
  for (const [cause, entree] of Object.entries(cas)) {
    const verdict = verdictDeLaDemande({ demande: "code", composants: [entree], rangTokens: 9 });
    const { bloquant, bloquantPar } = etatDeButton(verdict);

    assert.equal(bloquantPar[cause], true, cause);
    assert.equal(Object.values(bloquantPar).filter(Boolean).length, 1, `${cause} seule`);
    assert.equal(bloquant, true);
  }
});

test("un avertissement de comptage ne bloque jamais", () => {
  const verdict = verdictDeLaDemande({
    demande: "code",
    composants: [composant("Button", {
      rangContrat: 3,
      rangCode: 0,
      parite: { compositionsIncorrectes: [{ component: "Icon", attendu: 3, rendu: 1 }] },
    })],
    rangTokens: 9,
  });

  assert.equal(verdict.bloquant, false);
  assert.equal(etatDeButton(verdict).avertissements[0].genre, "composition-comptage");
});
